import { describe, it, expect, vi } from "vitest";
import { classifyDelhiveryEvent } from "../../lib/shipping/exception-classifier";

const mockDelhiveryFetch = vi.fn().mockResolvedValue({
  status: "SUCCESS",
  upl: "UPL_TEST_RTO_123",
  message: "Order cancellation request accepted",
});

vi.mock("../../lib/shipping/providers/delhivery/client", () => ({
  delhiveryFetch: (...args: any[]) => mockDelhiveryFetch(...args),
  DelhiveryApiError: class extends Error {},
}));

import { submitDelhiveryCarrierAction } from "../../lib/shipping/providers/delhivery/ndr-action";

describe("Phase V3-11: Admin RTO Action & Provider Payload Verification", () => {
  it("should map RTO_REQUESTED to act: 'CANCEL' in Delhivery API payload", async () => {
    const result = await submitDelhiveryCarrierAction("41093210924372", "RTO_REQUESTED", {
      remarks: "Customer refused delivery during 1st attempt",
      orderId: "ORD123456",
    });

    expect(result.success).toBe(true);
    expect(result.providerReference).toBe("UPL_TEST_RTO_123");

    // Verify exact Delhivery API bodyData sent to /api/p/edit
    expect(mockDelhiveryFetch).toHaveBeenCalledWith({
      endpoint: "/api/p/edit",
      method: "POST",
      body: {
        waybill: "41093210924372",
        act: "CANCEL",
        comments: "Customer refused delivery during 1st attempt",
        reason: "Customer refused delivery during 1st attempt",
        client_ref_id: "ORD123456",
      },
    });
  });

  it("should classify carrier tracking events correctly for RTO progression", () => {
    const initiatedEvt = classifyDelhiveryEvent({
      shipmentId: "ship_1",
      provider: "delhivery",
      awb: "41093210924372",
      eventTime: new Date(),
      status: "RTO Initiated",
      dispatchCount: 1,
    });
    expect(initiatedEvt.type).toBe("RTO");
    expect(initiatedEvt.reason).toMatch(/Return To Origin|Return to Origin/i);

    const inTransitEvt = classifyDelhiveryEvent({
      shipmentId: "ship_1",
      provider: "delhivery",
      awb: "41093210924372",
      eventTime: new Date(),
      status: "RTO In Transit",
      dispatchCount: 1,
    });
    expect(inTransitEvt.type).toBe("RTO");

    const returnedEvt = classifyDelhiveryEvent({
      shipmentId: "ship_1",
      provider: "delhivery",
      awb: "41093210924372",
      eventTime: new Date(),
      status: "Returned to Origin",
      dispatchCount: 1,
    });
    expect(returnedEvt.type).toBe("RTO");
  });
});
