import { db } from "@/db";
import { shipments, shipmentExceptions, ndrActions, shipmentAuditLogs } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getShippingProvider } from "@/lib/shipping";
import { canPerformDelhiveryAction } from "@/lib/shipping/providers/delhivery/action-eligibility";
import { nanoid } from "nanoid";

export interface ExceptionFilterOptions {
  status?: string;
  provider?: string;
  limit?: number;
  page?: number;
}

/**
 * Retrieves all Delivery NDR exceptions with populated shipment and order data.
 */
export async function getDeliveryNDRExceptions(options?: ExceptionFilterOptions) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  const exceptions = await db.query.shipmentExceptions.findMany({
    where: eq(shipmentExceptions.exceptionType, "DELIVERY_NDR"),
    limit,
    offset,
    orderBy: [desc(shipmentExceptions.createdAt)],
    with: {
      shipment: {
        with: {
          order: {
            with: {
              user: true,
              addresses: true,
            },
          },
        },
      },
      actions: {
        orderBy: [desc(ndrActions.createdAt)],
      },
    },
  });

  return exceptions;
}

/**
 * Retrieves all Pickup Exceptions (e.g. EOD-777, EOD-21) with populated shipment data.
 */
export async function getPickupExceptions(options?: ExceptionFilterOptions) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  const exceptions = await db.query.shipmentExceptions.findMany({
    where: eq(shipmentExceptions.exceptionType, "PICKUP_EXCEPTION"),
    limit,
    offset,
    orderBy: [desc(shipmentExceptions.createdAt)],
    with: {
      shipment: {
        with: {
          order: true,
        },
      },
      actions: {
        orderBy: [desc(ndrActions.createdAt)],
      },
    },
  });

  return exceptions;
}

/**
 * Retrieves all RTO exceptions.
 */
export async function getRTOExceptions(options?: ExceptionFilterOptions) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const offset = (page - 1) * limit;

  const exceptions = await db.query.shipmentExceptions.findMany({
    where: eq(shipmentExceptions.exceptionType, "RTO"),
    limit,
    offset,
    orderBy: [desc(shipmentExceptions.createdAt)],
    with: {
      shipment: {
        with: {
          order: true,
        },
      },
      actions: {
        orderBy: [desc(ndrActions.createdAt)],
      },
    },
  });

  return exceptions;
}

/**
 * Executes an operational carrier action on a shipment exception after verifying eligibility.
 */
export async function executeCarrierAction(
  exceptionId: string,
  actionType: 'REATTEMPT' | 'DEFER_DLV' | 'EDIT_DETAILS' | 'PICKUP_RESCHEDULE' | 'RTO_REQUESTED',
  adminId: string = "system_admin",
  payload?: any
) {
  const exception = await db.query.shipmentExceptions.findFirst({
    where: eq(shipmentExceptions.id, exceptionId),
    with: {
      shipment: true,
    },
  });

  if (!exception || !exception.shipment) {
    throw new Error("Shipment exception record not found.");
  }

  const waybill = exception.shipment.waybill || exception.shipment.trackingNumber;

  // 1. Verify Carrier Action Eligibility Rule Engine
  const eligibility = canPerformDelhiveryAction({
    action: actionType,
    shipment: exception.shipment,
    exception,
  });

  if (!eligibility.eligible) {
    throw new Error(`Carrier action ineligible: ${eligibility.reason}`);
  }

  // 2. Submit Action via Shipping Provider Abstraction
  const provider = getShippingProvider(exception.shipment.provider);
  if (!provider.submitCarrierAction) {
    throw new Error(`Provider ${exception.shipment.provider} does not support carrier actions.`);
  }

  const providerRes = await provider.submitCarrierAction(waybill, actionType, payload);

  const actionId = `ndra_${nanoid(10)}`;
  const now = new Date();

  // 3. Store action record with UPL reference
  await db.insert(ndrActions).values({
    id: actionId,
    shipmentExceptionId: exception.id,
    actionType,
    adminId,
    requestedAt: now,
    providerReference: providerRes.providerReference || null,
    requestPayload: JSON.stringify({ waybill, actionType, payload }),
    responsePayload: JSON.stringify(providerRes.rawResponse || providerRes),
    status: providerRes.success ? "REQUESTED" : "FAILED",
    notes: payload?.remarks || providerRes.message || null,
    createdAt: now,
  });

  // 4. Update Exception status to reflect requested action
  let updatedStatus = exception.status;
  if (actionType === "REATTEMPT") updatedStatus = "REATTEMPT_REQUESTED";
  if (actionType === "RTO_REQUESTED") updatedStatus = "RTO_REQUESTED";

  await db
    .update(shipmentExceptions)
    .set({
      status: updatedStatus,
      updatedAt: now,
    })
    .where(eq(shipmentExceptions.id, exception.id));

  // 5. Log audit entry
  await db.insert(shipmentAuditLogs).values({
    id: `sal_${nanoid(10)}`,
    shipmentId: exception.shipmentId,
    orderId: exception.shipment.orderId,
    adminId,
    adminName: "Admin User",
    action: `CARRIER_ACTION_${actionType}`,
    previousState: JSON.stringify({ status: exception.status }),
    newState: JSON.stringify({ status: updatedStatus, reference: providerRes.providerReference }),
    notes: `Submitted ${actionType} to ${exception.provider}. Reference: ${providerRes.providerReference || "N/A"}`,
    createdAt: now,
  });

  return {
    success: providerRes.success,
    actionId,
    providerReference: providerRes.providerReference,
    message: providerRes.message,
  };
}

/**
 * Records customer contact details for an NDR exception.
 */
export async function recordCustomerContact(
  exceptionId: string,
  adminId: string,
  customerResponse: string,
  notes?: string
) {
  const exception = await db.query.shipmentExceptions.findFirst({
    where: eq(shipmentExceptions.id, exceptionId),
    with: { shipment: true },
  });

  if (!exception) throw new Error("Exception not found");

  const actionId = `ndra_${nanoid(10)}`;
  const now = new Date();

  await db.insert(ndrActions).values({
    id: actionId,
    shipmentExceptionId: exception.id,
    actionType: "CUSTOMER_CONTACTED",
    adminId,
    requestedAt: now,
    status: "SUCCESS",
    notes: `Response: ${customerResponse}. Notes: ${notes || "N/A"}`,
    createdAt: now,
  });

  await db.insert(shipmentAuditLogs).values({
    id: `sal_${nanoid(10)}`,
    shipmentId: exception.shipmentId,
    orderId: exception.shipment.orderId,
    adminId,
    adminName: "Admin User",
    action: "NDR_CUSTOMER_CONTACTED",
    newState: JSON.stringify({ customerResponse, notes }),
    notes: `Recorded customer contact. Response: ${customerResponse}`,
    createdAt: now,
  });

  return { success: true, actionId };
}

/**
 * Resolves an exception manually in the Admin interface.
 */
export async function resolveException(exceptionId: string, adminId: string, notes?: string) {
  const exception = await db.query.shipmentExceptions.findFirst({
    where: eq(shipmentExceptions.id, exceptionId),
    with: { shipment: true },
  });

  if (!exception) throw new Error("Exception not found");

  const now = new Date();

  await db
    .update(shipmentExceptions)
    .set({
      status: "RESOLVED",
      resolvedAt: now,
      updatedAt: now,
    })
    .where(eq(shipmentExceptions.id, exceptionId));

  await db.insert(shipmentAuditLogs).values({
    id: `sal_${nanoid(10)}`,
    shipmentId: exception.shipmentId,
    orderId: exception.shipment.orderId,
    adminId,
    adminName: "Admin User",
    action: "EXCEPTION_MANUALLY_RESOLVED",
    previousState: JSON.stringify({ status: exception.status }),
    newState: JSON.stringify({ status: "RESOLVED" }),
    notes: `Exception manually marked as resolved by admin. Notes: ${notes || "N/A"}`,
    createdAt: now,
  });

  return { success: true };
}
