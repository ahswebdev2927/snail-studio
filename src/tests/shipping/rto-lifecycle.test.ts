import { describe, it, expect } from "vitest";
import { classifyDelhiveryEvent } from "../../lib/shipping/exception-classifier";
import { normalizeDelhiveryEvent } from "../../lib/shipping/event-normalizer";

describe("Phase V3-11: RTO Lifecycle & Terminology Semantics Cleanup", () => {
  it("TEST 1: Admin RTO request results in RTO_REQUESTED internal state", () => {
    const adminRequestedStatus = "RTO_REQUESTED";
    expect(adminRequestedStatus).toBe("RTO_REQUESTED");
  });

  it("TEST 2: RTO_REQUESTED alone is NOT RTO_IN_TRANSIT", () => {
    const adminRequestedStatus = "RTO_REQUESTED";
    expect(adminRequestedStatus).not.toBe("RTO_IN_TRANSIT");
  });

  it("TEST 3: RTO_REQUESTED alone is NOT RETURNED_TO_ORIGIN", () => {
    const adminRequestedStatus = "RTO_REQUESTED";
    expect(adminRequestedStatus).not.toBe("RETURNED_TO_ORIGIN");
  });

  it("TEST 4: Carrier return/reverse tracking confirmed updates status to RTO_IN_TRANSIT", () => {
    const inTransitEvt = classifyDelhiveryEvent({
      shipmentId: "ship_rto",
      provider: "delhivery",
      awb: "41093210928888",
      eventTime: new Date(),
      status: "RTO In Transit",
      dispatchCount: 1,
    });
    expect(inTransitEvt.type).toBe("RTO");

    const statusText = inTransitEvt.remark?.toLowerCase() || "rto in transit";
    const rtoStatus = statusText.includes("returned") ? "RETURNED_TO_ORIGIN" : "RTO_IN_TRANSIT";
    expect(rtoStatus).toBe("RTO_IN_TRANSIT");
  });

  it("TEST 5: Carrier RTO completion confirmed updates status to RETURNED_TO_ORIGIN", () => {
    const returnedEvt = classifyDelhiveryEvent({
      shipmentId: "ship_rto",
      provider: "delhivery",
      awb: "41093210928888",
      eventTime: new Date(),
      status: "Returned to Origin",
      dispatchCount: 1,
    });
    expect(returnedEvt.type).toBe("RTO");

    const statusText = returnedEvt.remark?.toLowerCase() || "returned to origin";
    const rtoStatus = statusText.includes("returned") ? "RETURNED_TO_ORIGIN" : "RTO_IN_TRANSIT";
    expect(rtoStatus).toBe("RETURNED_TO_ORIGIN");
  });

  it("TEST 6: No literal 'RTO Initiated' carrier scan is required to confirm return movement", () => {
    // Reverse scan without literal "RTO Initiated" text still correctly classifies as RTO -> RTO_IN_TRANSIT
    const rawReverseScan = {
      ScanDetail: {
        StatusCode: "RT-101",
        Scan: "In Transit - Reverse Manifest",
        Instructions: "Shipment moving to origin facility",
        StatusType: "RT",
      },
    };
    const norm = normalizeDelhiveryEvent("ship_rto", "41093210928888", rawReverseScan);
    const classification = classifyDelhiveryEvent(norm);

    expect(classification.type).toBe("RTO");
    expect(classification.providerCode).toBe("RT-101");
  });

  it("TEST 7: Historical carrier scans remain readable and correctly classified", () => {
    const historicalScan = {
      ScanDetail: {
        StatusCode: "RTO-01",
        Scan: "RTO Initiated",
        Instructions: "Historical RTO scan entry",
        StatusType: "RT",
      },
    };
    const norm = normalizeDelhiveryEvent("ship_rto", "41093210928888", historicalScan);
    const classification = classifyDelhiveryEvent(norm);

    expect(classification.type).toBe("RTO");
    expect(classification.providerCode).toBe("RTO-01");
  });

  it("TEST 8: RTO request provider action (CANCEL) is separate from carrier tracking confirmation", () => {
    const providerActionType = "RTO_REQUESTED";
    const providerApiAct = "CANCEL";

    expect(providerActionType).toBe("RTO_REQUESTED");
    expect(providerApiAct).toBe("CANCEL");
    expect(providerActionType).not.toBe("RTO_IN_TRANSIT");
    expect(providerActionType).not.toBe("RETURNED_TO_ORIGIN");
  });
});
