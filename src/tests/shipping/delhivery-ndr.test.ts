import { describe, it, expect } from "vitest";
import {
  REATTEMPT_ELIGIBLE_NSL_CODES,
  lookupDelhiveryCode,
} from "../../lib/shipping/providers/delhivery/delhivery-exception-codes";
import { classifyDelhiveryEvent } from "../../lib/shipping/exception-classifier";
import { canPerformDelhiveryAction } from "../../lib/shipping/providers/delhivery/action-eligibility";
import { normalizeDelhiveryEvent } from "../../lib/shipping/event-normalizer";

describe("Delhivery Delivery NDR Recognition & Action Eligibility", () => {
  it("should correctly classify EOD-11 as DELIVERY_NDR", () => {
    const rawScan = {
      ScanDetail: {
        StatusCode: "EOD-11",
        Scan: "Undelivered",
        Instructions: "Consignee Unavailable",
        ScanDateTime: "2026-09-08T10:00:00Z",
      },
    };

    const normalized = normalizeDelhiveryEvent("ship_001", "41093210924372", rawScan);
    expect(normalized.statusCode).toBe("EOD-11");
    expect(normalized.instructions).toBe("Consignee Unavailable");

    const classification = classifyDelhiveryEvent(normalized);
    expect(classification.type).toBe("DELIVERY_NDR");
    expect(classification.providerCode).toBe("EOD-11");
    expect(classification.reason).toBe("Consignee Unavailable");
    expect(classification.supportsReattempt).toBe(true);
  });

  it("should enforce rule: Pending alone is NOT NDR", () => {
    const rawScan = {
      ScanDetail: {
        StatusCode: "FMPUR-101",
        Scan: "Pending",
        Instructions: "Manifest Uploaded",
        ScanDateTime: "2026-09-08T09:00:00Z",
      },
    };

    const normalized = normalizeDelhiveryEvent("ship_002", "41093210924373", rawScan);
    const classification = classifyDelhiveryEvent(normalized);

    expect(classification.type).toBe("NORMAL");
    expect(classification.type).not.toBe("DELIVERY_NDR");
  });

  it("should validate RE-ATTEMPT action only for whitelisted 8 NSL codes", () => {
    const allowedCodes = [
      "EOD-74",
      "EOD-15",
      "EOD-104",
      "EOD-43",
      "EOD-86",
      "EOD-11",
      "EOD-69",
      "EOD-6",
    ];

    expect(REATTEMPT_ELIGIBLE_NSL_CODES).toEqual(allowedCodes);

    // Test allowed code EOD-11 -> ELIGIBLE
    const eligibleRes = canPerformDelhiveryAction({
      action: "REATTEMPT",
      shipment: { id: "ship_001", status: "ndr", provider: "delhivery" },
      exception: {
        id: "ex_001",
        exceptionType: "DELIVERY_NDR",
        providerCode: "EOD-11",
        status: "ACTION_REQUIRED",
        attemptCount: 1,
      },
    });

    expect(eligibleRes.eligible).toBe(true);

    // Test unlisted code EOD-12 -> INELIGIBLE
    const ineligibleRes = canPerformDelhiveryAction({
      action: "REATTEMPT",
      shipment: { id: "ship_001", status: "ndr", provider: "delhivery" },
      exception: {
        id: "ex_001",
        exceptionType: "DELIVERY_NDR",
        providerCode: "EOD-12",
        status: "ACTION_REQUIRED",
        attemptCount: 1,
      },
    });

    expect(ineligibleRes.eligible).toBe(false);
    expect(ineligibleRes.reason).toContain("Reattempt is not allowed for NSL code \"EOD-12\"");
  });

  it("should process Real AWB 41093210924372 fixture transitions", () => {
    // Response 1: Pending + EOD-11 -> DELIVERY_NDR
    const scan1 = {
      ScanDetail: {
        StatusCode: "EOD-11",
        Scan: "Pending",
        Instructions: "Consignee Unavailable",
        ScanDateTime: "2026-09-08T10:00:00Z",
        DispatchCount: 1,
      },
    };
    const norm1 = normalizeDelhiveryEvent("ship_real", "41093210924372", scan1);
    const class1 = classifyDelhiveryEvent(norm1);

    expect(class1.type).toBe("DELIVERY_NDR");
    expect(class1.providerCode).toBe("EOD-11");

    // Response 2: DispatchCount 2 + Out for Delivery -> Delivered (EOD-135)
    const scan2 = {
      ScanDetail: {
        StatusCode: "EOD-135",
        Scan: "Delivered",
        Instructions: "Delivered to Consignee",
        ScanDateTime: "2026-09-08T14:30:00Z",
        DispatchCount: 2,
      },
    };
    const norm2 = normalizeDelhiveryEvent("ship_real", "41093210924372", scan2);
    const class2 = classifyDelhiveryEvent(norm2);

    expect(class2.type).toBe("DELIVERED");
    expect(class2.providerCode).toBe("EOD-135");
  });
});
