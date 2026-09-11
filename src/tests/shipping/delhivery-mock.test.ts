import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { delhiveryFetch, DelhiveryApiError } from "@/lib/shipping/providers/delhivery/client";
import { getDelhiveryConfig } from "@/lib/shipping/providers/delhivery/config";

describe("Delhivery Development Mock Provider & Failure Simulation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.APP_ENV = "development";
    process.env.NODE_ENV = "development";
    process.env.MOCK_DELHIVERY = "true";
    delete process.env.MOCK_DELHIVERY_ERROR;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should generate deterministic DEV-RETURN waybill in development mode", async () => {
    const config = getDelhiveryConfig();
    expect(config.isMockEnabled).toBe(true);

    const res = await delhiveryFetch({
      endpoint: "/api/cmu/create.json",
      method: "POST",
      body: 'format=json&data={"shipments":[{"order":"req12345678","payment_mode":"Pickup"}]}',
    });

    expect(res.success).toBe(true);
    expect(res.packages[0].status).toBe("Success");
    expect(res.packages[0].waybill).toBe("DEV-RETURN-12345678");
  });

  it("should generate deterministic DEV-REPL waybill for replacement exchange shipments", async () => {
    const res = await delhiveryFetch({
      endpoint: "/api/cmu/create.json",
      method: "POST",
      body: 'format=json&data={"shipments":[{"order":"req99887766","payment_mode":"REPL"}]}',
    });

    expect(res.success).toBe(true);
    expect(res.packages[0].status).toBe("Success");
    expect(res.packages[0].waybill).toBe("DEV-REPL-99887766");
  });

  it("should simulate HTTP 500 error when MOCK_DELHIVERY_ERROR=500", async () => {
    process.env.MOCK_DELHIVERY_ERROR = "500";

    await expect(
      delhiveryFetch({
        endpoint: "/api/cmu/create.json",
        method: "POST",
        body: "{}",
      })
    ).rejects.toThrow(DelhiveryApiError);

    try {
      await delhiveryFetch({
        endpoint: "/api/cmu/create.json",
        method: "POST",
        body: "{}",
      });
    } catch (err: any) {
      expect(err.statusCode).toBe(500);
      expect(err.message).toContain("Internal Server Error");
    }
  });

  it("should simulate request timeout when MOCK_DELHIVERY_ERROR=timeout", async () => {
    process.env.MOCK_DELHIVERY_ERROR = "timeout";

    await expect(
      delhiveryFetch({
        endpoint: "/api/cmu/create.json",
        method: "POST",
        body: "{}",
      })
    ).rejects.toThrow("timed out");
  });

  it("should strictly disable mock mode when APP_ENV=production", () => {
    process.env.APP_ENV = "production";
    process.env.DELHIVERY_API_TOKEN = "real_prod_token";

    const config = getDelhiveryConfig();
    expect(config.isMockEnabled).toBe(false);
    expect(config.apiToken).toBe("real_prod_token");
  });
});
