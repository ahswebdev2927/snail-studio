import { describe, it, expect } from "vitest";
import { classifyDelhiveryEvent } from "../../lib/shipping/exception-classifier";
import { normalizeDelhiveryEvent } from "../../lib/shipping/event-normalizer";
import { canPerformDelhiveryAction } from "../../lib/shipping/providers/delhivery/action-eligibility";
import { PICKUP_EXCEPTION_NSL_CODES } from "../../lib/shipping/providers/delhivery/delhivery-exception-codes";

describe("Delhivery Pickup Exception & Reschedule Eligibility", () => {
  it("should classify EOD-777 and EOD-21 as PICKUP_EXCEPTION with setsCancelledStatus = true", () => {
    expect(PICKUP_EXCEPTION_NSL_CODES).toContain("EOD-777");
    expect(PICKUP_EXCEPTION_NSL_CODES).toContain("EOD-21");

    const scan777 = {
      ScanDetail: {
        StatusCode: "EOD-777",
        Scan: "Pickup Cancelled",
        Instructions: "Pickup Reschedule Required",
      },
    };
    const norm777 = normalizeDelhiveryEvent("ship_pickup", "41093210929999", scan777);
    const class777 = classifyDelhiveryEvent(norm777);

    expect(class777.type).toBe("PICKUP_EXCEPTION");
    expect(class777.providerCode).toBe("EOD-777");
    expect(class777.setsCancelledStatus).toBe(true);

    const scan21 = {
      ScanDetail: {
        StatusCode: "EOD-21",
        Scan: "Pickup Failed",
        Instructions: "Courier Attempt Failed",
      },
    };
    const norm21 = normalizeDelhiveryEvent("ship_pickup", "41093210929999", scan21);
    const class21 = classifyDelhiveryEvent(norm21);

    expect(class21.type).toBe("PICKUP_EXCEPTION");
    expect(class21.providerCode).toBe("EOD-21");
    expect(class21.setsCancelledStatus).toBe(true);
  });

  it("should validate PICKUP_RESCHEDULE eligibility conditions", () => {
    // 9 PM date fixture (21:30)
    const after9PM = new Date("2026-09-08T21:30:00");
    const before9PM = new Date("2026-09-08T18:00:00");

    // Positive case: Cancelled + EOD-777 + after 9 PM + attempt 1
    const positiveRes = canPerformDelhiveryAction({
      action: "PICKUP_RESCHEDULE",
      shipment: { id: "ship_p", status: "cancelled", provider: "delhivery", attemptNumber: 1 },
      exception: {
        id: "ex_p",
        exceptionType: "PICKUP_EXCEPTION",
        providerCode: "EOD-777",
        status: "ACTION_REQUIRED",
        attemptCount: 1,
      },
      now: after9PM,
    });

    expect(positiveRes.eligible).toBe(true);

    // Negative case 1: Before 9 PM -> Ineligible
    const negativeTimeRes = canPerformDelhiveryAction({
      action: "PICKUP_RESCHEDULE",
      shipment: { id: "ship_p", status: "cancelled", provider: "delhivery", attemptNumber: 1 },
      exception: {
        id: "ex_p",
        exceptionType: "PICKUP_EXCEPTION",
        providerCode: "EOD-777",
        status: "ACTION_REQUIRED",
        attemptCount: 1,
      },
      now: before9PM,
    });

    expect(negativeTimeRes.eligible).toBe(false);
    expect(negativeTimeRes.reason).toContain("after 9:00 PM");

    // Negative case 2: Attempt count 3 -> Ineligible
    const negativeAttemptRes = canPerformDelhiveryAction({
      action: "PICKUP_RESCHEDULE",
      shipment: { id: "ship_p", status: "cancelled", provider: "delhivery", attemptNumber: 3 },
      exception: {
        id: "ex_p",
        exceptionType: "PICKUP_EXCEPTION",
        providerCode: "EOD-777",
        status: "ACTION_REQUIRED",
        attemptCount: 3,
      },
      now: after9PM,
    });

    expect(negativeAttemptRes.eligible).toBe(false);
    expect(negativeAttemptRes.reason).toContain("attempt count 1 or 2");

    // Negative case 3: Unlisted code EOD-11 for pickup reschedule -> Ineligible
    const negativeCodeRes = canPerformDelhiveryAction({
      action: "PICKUP_RESCHEDULE",
      shipment: { id: "ship_p", status: "cancelled", provider: "delhivery", attemptNumber: 1 },
      exception: {
        id: "ex_p",
        exceptionType: "DELIVERY_NDR",
        providerCode: "EOD-11",
        status: "ACTION_REQUIRED",
        attemptCount: 1,
      },
      now: after9PM,
    });

    expect(negativeCodeRes.eligible).toBe(false);
    expect(negativeCodeRes.reason).toContain("only allowed for NSL codes: EOD-777, EOD-21");
  });
});
