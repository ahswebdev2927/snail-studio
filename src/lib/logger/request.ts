import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";
import { nanoid } from "nanoid";

export function logRouteHandler(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]) => {
    const reqId = nanoid(10);
    const start = Date.now();
    const { method, url } = req;
    const path = new URL(url).pathname;

    const reqLogger = logger.child({ reqId, method, path });

    reqLogger.info({ type: "request_incoming" }, `Incoming request: ${method} ${path}`);

    try {
      (req as any).log = reqLogger;

      const response = await handler(req, ...args);
      const duration = Date.now() - start;
      const status = response.status;

      reqLogger.info(
        { status, duration, type: "request_outgoing" },
        `Outgoing response: ${method} ${path} - ${status} (${duration}ms)`
      );

      if (duration > 1000) {
        reqLogger.warn(
          { status, duration, type: "performance_slow_request" },
          `Slow request detected: ${method} ${path} took ${duration}ms`
        );
      }

      return response;
    } catch (error: any) {
      const duration = Date.now() - start;
      reqLogger.error(
        {
          duration,
          error: error.message || String(error),
          stack: error.stack,
          type: "request_failed"
        },
        `Request failed: ${method} ${path} - ${error.message || String(error)}`
      );
      throw error;
    }
  };
}
