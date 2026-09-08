import { describe, it, expect } from "vitest";
import { classifyDelhiveryEvent } from "../../lib/shipping/exception-classifier";
import { normalizeDelhiveryEvent } from "../../lib/shipping/event-normalizer";

describe("Failure & Unknown Exception Handling", () => {
  it("should classify unmapped provider codes as UNKNOWN_EXCEPTION without guessing", () => {
    const rawScan = {
      ScanDetail: {
        StatusCode: "EOD-999",
        Scan: "Custom Hub Event",
        Instructions: "Internal hub scan event",
      },
    };

    const normalized = normalizeDelhiveryEvent("ship_unk", "41093210927777", rawScan);
    const classification = classifyDelhiveryEvent(normalized);

    expect(classification.type).toBe("UNKNOWN_EXCEPTION");
    expect(classification.providerCode).toBe("EOD-999");
    expect(classification.reason).toContain("Unmapped Provider Code");
  });
});
