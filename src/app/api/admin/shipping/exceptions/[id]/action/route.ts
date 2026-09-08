import { NextRequest, NextResponse } from "next/server";
import {
  executeCarrierAction,
  recordCustomerContact,
  resolveException,
} from "@/services/shipping/exception.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { actionType, payload, customerResponse, notes } = body;

    if (!actionType) {
      return NextResponse.json({ error: "actionType parameter is required" }, { status: 400 });
    }

    if (actionType === "CUSTOMER_CONTACTED") {
      if (!customerResponse) {
        return NextResponse.json({ error: "customerResponse string is required for CUSTOMER_CONTACTED action" }, { status: 400 });
      }
      const result = await recordCustomerContact(id, "admin", customerResponse, notes);
      return NextResponse.json({ success: true, data: result });
    }

    if (actionType === "RESOLVE") {
      const result = await resolveException(id, "admin", notes);
      return NextResponse.json({ success: true, data: result });
    }

    // Execute Carrier Action (REATTEMPT, DEFER_DLV, EDIT_DETAILS, PICKUP_RESCHEDULE, RTO_REQUESTED)
    const result = await executeCarrierAction(id, actionType, "admin", payload);

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error: any) {
    console.error("[API:Admin:ExceptionAction] Error executing action:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute exception action", details: String(error) },
      { status: 400 }
    );
  }
}
