import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { returnRequests, productVariants, shipmentAuditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authorize } from "@/middleware/auth";
import { nanoid } from "nanoid";
import { createReturnRequestSchema } from "@/lib/returns/types";
import { validateReturnEligibility } from "@/lib/returns/validation";
import {
  notifyReturnRequestReceived,
  notifyReplacementRequestReceived,
} from "@/lib/returns/notifications";

/**
 * POST /api/orders/[id]/return-request
 * Submit a return or replacement request for a specific item in a delivered order.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = createReturnRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const issues = parseResult.error.issues || (parseResult.error as any).errors;
      const errorMsg = issues?.[0]?.message || "Invalid request payload";
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const input = parseResult.data;

    // Server-side eligibility validation
    const eligibility = await validateReturnEligibility(
      orderId,
      input.orderItemId,
      auth.user.id,
      input.type,
      input.replacementVariantId
    );

    if (!eligibility.eligible) {
      return NextResponse.json({ success: false, error: eligibility.error }, { status: 400 });
    }

    // Determine replacement product ID if variant selected
    let replacementProductId: string | null = null;
    if (input.type === "REPLACEMENT" && input.replacementVariantId) {
      const variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, input.replacementVariantId),
      });
      if (variant) {
        replacementProductId = variant.productId;
      }
    }

    const requestId = `ret_${nanoid(12)}`;
    const newRequest = {
      id: requestId,
      orderId,
      orderItemId: input.orderItemId,
      customerId: auth.user.id,
      type: input.type,
      reason: input.reason,
      customerNotes: input.customerNotes || null,
      status: "PENDING_REVIEW" as const,
      replacementProductId,
      replacementVariantId: input.replacementVariantId || null,
      paymentResponsibility: "NONE" as const,
      paymentAmount: 0,
      paymentStatus: "NOT_REQUIRED" as const,
    };

    await db.insert(returnRequests).values(newRequest);

    // Audit Log Entry
    const auditAction = input.type === "REPLACEMENT" ? "REPLACEMENT_REQUEST_CREATED" : "RETURN_REQUEST_CREATED";
    await db.insert(shipmentAuditLogs).values({
      id: `log_${nanoid(12)}`,
      shipmentId: null,
      orderId,
      adminId: auth.user.id,
      adminName: auth.user.name || auth.user.phoneNumber || "Customer",
      action: auditAction,
      previousState: null,
      newState: JSON.stringify({
        requestId,
        type: input.type,
        reason: input.reason,
        status: newRequest.status,
      }),
      notes: `${input.type === "REPLACEMENT" ? "Replacement" : "Return"} request submitted by customer.`,
    });

    // Notification Trigger
    const notifPayload = {
      id: requestId,
      orderId,
      customerId: auth.user.id,
      reason: input.reason,
    };

    if (input.type === "REPLACEMENT") {
      await notifyReplacementRequestReceived(notifPayload);
    } else {
      await notifyReturnRequestReceived(notifPayload);
    }

    return NextResponse.json({
      success: true,
      message: `${input.type === "RETURN" ? "Return" : "Replacement"} request submitted successfully.`,
      returnRequest: newRequest,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating return request:", error);
    return NextResponse.json({ success: false, error: "Failed to submit request." }, { status: 500 });
  }
}

/**
 * GET /api/orders/[id]/return-request
 * List return and replacement requests associated with an order.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req);
    if (!auth.authorized || !auth.user) {
      return auth.response!;
    }

    const { id: orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    const requests = await db.query.returnRequests.findMany({
      where: auth.user.role === "admin"
        ? eq(returnRequests.orderId, orderId)
        : and(eq(returnRequests.orderId, orderId), eq(returnRequests.customerId, auth.user.id)),
      with: {
        orderItem: true,
        replacementVariant: {
          with: {
            product: true,
          },
        },
      },
      orderBy: (rr, { desc }) => [desc(rr.createdAt)],
    });

    return NextResponse.json({ success: true, returnRequests: requests });
  } catch (error: any) {
    console.error("Error fetching return requests:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch return requests." }, { status: 500 });
  }
}
