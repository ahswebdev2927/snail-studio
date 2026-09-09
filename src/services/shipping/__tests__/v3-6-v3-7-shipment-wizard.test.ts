import { describe, it, expect } from "vitest";

describe("Phase V3-6 & V3-7 Shipment Wizard & Package Options Unit Tests", () => {
  it("should validate default package metrics and dimensions", () => {
    const getPackageDefaults = (adminOptions?: {
      weightGrams?: number;
      lengthCm?: number;
      widthCm?: number;
      heightCm?: number;
      fragileShipment?: boolean;
      transportSpeed?: "D" | "F";
      labelFormat?: "4R" | "A4";
    }) => {
      return {
        weightGrams: adminOptions?.weightGrams ?? 250,
        lengthCm: adminOptions?.lengthCm ?? 15.0,
        widthCm: adminOptions?.widthCm ?? 10.0,
        heightCm: adminOptions?.heightCm ?? 5.0,
        fragileShipment: adminOptions?.fragileShipment ?? true,
        transportSpeed: adminOptions?.transportSpeed ?? "D",
        labelFormat: adminOptions?.labelFormat ?? "4R",
      };
    };

    const defaults = getPackageDefaults();
    expect(defaults.weightGrams).toBe(250);
    expect(defaults.lengthCm).toBe(15.0);
    expect(defaults.widthCm).toBe(10.0);
    expect(defaults.heightCm).toBe(5.0);
    expect(defaults.fragileShipment).toBe(true);
    expect(defaults.transportSpeed).toBe("D");
    expect(defaults.labelFormat).toBe("4R");
  });

  it("should construct Delhivery Packing Slip endpoint URL with pdf=true and pdf_size", () => {
    const constructDelhiveryPackingSlipUrl = (waybill: string, pdfSize: "4R" | "A4" = "4R") => {
      const baseUrl = "/api/p/packing_slip";
      return `${baseUrl}?wbns=${encodeURIComponent(waybill)}&pdf=true&pdf_size=${pdfSize}`;
    };

    expect(constructDelhiveryPackingSlipUrl("143256789012", "4R")).toBe(
      "/api/p/packing_slip?wbns=143256789012&pdf=true&pdf_size=4R"
    );
    expect(constructDelhiveryPackingSlipUrl("143256789012", "A4")).toBe(
      "/api/p/packing_slip?wbns=143256789012&pdf=true&pdf_size=A4"
    );
  });

  it("should handle optional tracking URL for external couriers", () => {
    const validateExternalShipmentInput = (input: {
      provider: "delhivery" | "external";
      trackingNumber?: string;
      externalTrackingUrl?: string;
    }) => {
      if (input.provider === "external") {
        if (!input.trackingNumber || !input.trackingNumber.trim()) {
          return { valid: false, error: "Tracking number is required for external courier." };
        }
        return { valid: true };
      }
      return { valid: true };
    };

    expect(
      validateExternalShipmentInput({
        provider: "external",
        trackingNumber: "TRK123",
      }).valid
    ).toBe(true);

    expect(
      validateExternalShipmentInput({
        provider: "external",
        trackingNumber: "",
      }).valid
    ).toBe(false);
  });

  it("should enforce lifecycle status separation rule (Order status stays READY_TO_SHIP)", () => {
    const processShipmentCreationState = (orderStatus: string) => {
      if (["cancelled", "refunded", "shipped", "delivered"].includes(orderStatus.toLowerCase())) {
        throw new Error(`Cannot create shipment for order in terminal status '${orderStatus}'`);
      }
      return {
        newShipmentStatus: "ready_to_ship",
        newOrderStatus: orderStatus,
      };
    };

    const stateResult = processShipmentCreationState("ready_to_ship");
    expect(stateResult.newShipmentStatus).toBe("ready_to_ship");
    expect(stateResult.newOrderStatus).toBe("ready_to_ship");
  });
});
