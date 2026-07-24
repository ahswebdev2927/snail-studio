import { NextRequest } from "next/server";

/**
 * Validates that the request origin matches the host origin.
 * Blocks requests from external domains attempting to perform state changes (CSRF).
 */
export function verifyCsrf(req: NextRequest): boolean {
  // Safe HTTP methods do not require CSRF checks
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return true;
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("host") || "";
  const forwardedHost = req.headers.get("x-forwarded-host");
  const targetHost = forwardedHost || host;

  // 1. Check Origin Header (usually present on POST/PUT/DELETE fetch requests)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Strip protocol and ports to compare domain/host directly
      return originUrl.host === targetHost;
    } catch {
      return false;
    }
  }

  // 2. Fallback to Referer Header (browsers send this for standard forms or navigations)
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === targetHost;
    } catch {
      return false;
    }
  }

  // If neither header is present, fail closed for security
  return false;
}
