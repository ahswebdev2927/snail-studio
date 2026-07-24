import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyCsrf } from "@/lib/security/csrf";

// Dev and production origins that are allowed to make cross-origin requests.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.22:3000",
];

// Dynamically load the site URL from env for CORS checks
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (siteUrl && !ALLOWED_ORIGINS.includes
  (siteUrl)) {
  ALLOWED_ORIGINS.push(siteUrl);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || "";

  // Only apply to API routes
  if (pathname.startsWith("/api")) {
    
    // 1. CORS Preflight (OPTIONS) handler
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      
      const isAllowed = 
        (origin && ALLOWED_ORIGINS.includes(origin)) || 
        (origin && new URL(origin).host === host);

      if (isAllowed && origin) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-csrf-token");
        response.headers.set("Access-Control-Allow-Credentials", "true");
      }
      return response;
    }

    // 2. CSRF Verification for state-changing methods (POST, PUT, DELETE, PATCH)
    // Exclude third-party webhooks (e.g. /api/webhooks) which use cryptographic signature verification
    const isWebhook = pathname.startsWith("/api/webhooks");
    const isMutative = ["POST", "PUT", "DELETE", "PATCH"].includes(request.method);

    if (isMutative && !isWebhook) {
      if (!verifyCsrf(request)) {
        return NextResponse.json(
          { error: "Forbidden: CSRF verification failed" },
          { status: 403 }
        );
      }
    }

    // 3. Normal request response CORS header injection
    const response = NextResponse.next();
    const isAllowed = 
      (origin && ALLOWED_ORIGINS.includes(origin)) || 
      (origin && new URL(origin).host === host);

    if (isAllowed && origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
