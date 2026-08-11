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
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteUrl = rawSiteUrl && !/^https?:\/\//i.test(rawSiteUrl) ? `https://${rawSiteUrl}` : rawSiteUrl;
if (siteUrl && !ALLOWED_ORIGINS.includes(siteUrl)) {
  ALLOWED_ORIGINS.push(siteUrl);
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;

    // Decode base64 payload safely in Node/Edge runtime
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );

    const exp = payload.exp;
    if (!exp) return true;

    // Check if expired or expiring within a 10 seconds buffer
    return Date.now() / 1000 >= exp - 10;
  } catch {
    return true;
  }
}

interface CookieOptions {
  path?: string;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none" | boolean;
  expires?: Date | number;
  domain?: string;
}

interface ParsedCookie {
  name: string;
  value: string;
  options: CookieOptions;
}

function parseSetCookie(cookieStr: string): ParsedCookie | null {
  const parts = cookieStr.split(";").map((p) => p.trim());
  if (parts.length === 0) return null;

  const [nameValue, ...optionsParts] = parts;
  const eqIdx = nameValue.indexOf("=");
  if (eqIdx === -1) return null;

  const name = nameValue.substring(0, eqIdx);
  const value = nameValue.substring(eqIdx + 1);

  const options: CookieOptions = { path: "/" };
  for (const opt of optionsParts) {
    const eq = opt.indexOf("=");
    let optName = opt;
    let optVal = "";
    if (eq !== -1) {
      optName = opt.substring(0, eq);
      optVal = opt.substring(eq + 1);
    }
    const lowerName = optName.toLowerCase();
    if (lowerName === "path") {
      options.path = optVal || "/";
    } else if (lowerName === "max-age") {
      options.maxAge = parseInt(optVal, 10);
    } else if (lowerName === "httponly") {
      options.httpOnly = true;
    } else if (lowerName === "secure") {
      options.secure = true;
    } else if (lowerName === "samesite") {
      const val = optVal.toLowerCase();
      if (val === "lax" || val === "strict" || val === "none") {
        options.sameSite = val;
      } else if (val === "true") {
        options.sameSite = true;
      } else if (val === "false") {
        options.sameSite = false;
      }
    }
  }

  return { name, value, options };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") || "";

  // 1. CORS Preflight (OPTIONS) handler
  if (pathname.startsWith("/api") && request.method === "OPTIONS") {
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

  // 2. Token Refresh Logic
  const refreshResponseCookies: ParsedCookie[] = [];
  let shouldClearCookies = false;
  let newAccessToken: string | null = null;
  let newRefreshToken: string | null = null;

  // Skip refresh token logic for static assets, auth refresh route itself, etc.
  const isStatic = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|map)$/) ||
                   pathname.startsWith("/_next") ||
                   pathname.startsWith("/images") ||
                   pathname.startsWith("/assets");
  const isRefreshRoute = pathname === "/api/auth/refresh";

  if (!isStatic && !isRefreshRoute) {
    const accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (refreshToken && (!accessToken || isTokenExpired(accessToken))) {
      try {
        const isVercel = !!process.env.VERCEL;
        const localPort = process.env.PORT || request.nextUrl.port || "3000";

        // Vercel serverless functions require public URLs; Hostinger/VPS environments require local loopbacks.
        // We use 127.0.0.1 instead of localhost to bypass Node 18+ IPv6 (::1) DNS preference.
        const refreshUrl = isVercel
          ? new URL("/api/auth/refresh", request.url)
          : new URL("/api/auth/refresh", `http://127.0.0.1:${localPort}`);

        const protocol = request.url.startsWith("https") ? "https" : "http";
        const dummyOrigin = isVercel
          ? `${protocol}://${host}`
          : `http://127.0.0.1:${localPort}`;

        const dummyHost = isVercel ? host : `127.0.0.1:${localPort}`;

        let refreshRes;
        try {
          refreshRes = await fetch(refreshUrl, {
            method: "POST",
            headers: {
              "Cookie": `refreshToken=${refreshToken}`,
              "Origin": dummyOrigin,
              "Host": dummyHost,
              "User-Agent": request.headers.get("user-agent") || "",
              "X-Forwarded-For": request.headers.get("x-forwarded-for") || "",
              "X-Real-IP": request.headers.get("x-real-ip") || "",
            },
          });
        } catch (localFetchErr) {
          // If local loopback fails (e.g. port mismatch or loopback blocking), fallback to public URL
          console.warn("Proxy local refresh failed, attempting public URL fallback:", (localFetchErr as Error).message);
          
          const publicRefreshUrl = new URL("/api/auth/refresh", request.url);
          const publicOrigin = request.nextUrl.origin;
          const publicHost = host;

          refreshRes = await fetch(publicRefreshUrl, {
            method: "POST",
            headers: {
              "Cookie": `refreshToken=${refreshToken}`,
              "Origin": publicOrigin,
              "Host": publicHost,
              "User-Agent": request.headers.get("user-agent") || "",
              "X-Forwarded-For": request.headers.get("x-forwarded-for") || "",
              "X-Real-IP": request.headers.get("x-real-ip") || "",
            },
          });
        }

        if (refreshRes.ok) {
          let setCookieHeaders: string[] = [];
          if (typeof refreshRes.headers.getSetCookie === "function") {
            setCookieHeaders = refreshRes.headers.getSetCookie();
          } else {
            const rawSetCookie = refreshRes.headers.get("set-cookie");
            if (rawSetCookie) {
              setCookieHeaders = rawSetCookie.split(/,(?=[^;]*=)/g);
            }
          }

          for (const header of setCookieHeaders) {
            const parsed = parseSetCookie(header);
            if (parsed) {
              refreshResponseCookies.push(parsed);
              if (parsed.name === "accessToken") newAccessToken = parsed.value;
              if (parsed.name === "refreshToken") newRefreshToken = parsed.value;
            }
          }
        } else if (refreshRes.status === 401) {
          shouldClearCookies = true;
        }
      } catch (err) {
        console.error("Proxy automatic token refresh failed:", err);
      }
    }
  }

  // 3. CSRF Verification for state-changing methods (POST, PUT, DELETE, PATCH)
  if (pathname.startsWith("/api")) {
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
  }

  // 4. Construct response and inject headers/cookies
  let response: NextResponse;

  if (newAccessToken && newRefreshToken) {
    const requestHeaders = new Headers(request.headers);
    const cookiesList = request.cookies.getAll();
    const cookiesMap = new Map<string, string>();
    for (const c of cookiesList) {
      cookiesMap.set(c.name, c.value);
    }
    cookiesMap.set("accessToken", newAccessToken);
    cookiesMap.set("refreshToken", newRefreshToken);

    const cookieString = Array.from(cookiesMap.entries())
      .map(([name, val]) => `${name}=${val}`)
      .join("; ");

    requestHeaders.set("cookie", cookieString);

    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    for (const c of refreshResponseCookies) {
      response.cookies.set(c.name, c.value, c.options);
    }
  } else {
    response = NextResponse.next();
    if (shouldClearCookies) {
      response.cookies.set("accessToken", "", { path: "/", maxAge: 0 });
      response.cookies.set("refreshToken", "", { path: "/", maxAge: 0 });
    }
  }

  // 5. Normal request response CORS header injection for API routes
  if (pathname.startsWith("/api")) {
    const isAllowed =
      (origin && ALLOWED_ORIGINS.includes(origin)) ||
      (origin && new URL(origin).host === host);

    if (isAllowed && origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images|assets|.*\\..*).*)",
  ],
};
