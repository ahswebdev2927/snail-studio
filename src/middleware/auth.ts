import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, SessionUser } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/permissions";
import { UserRole } from "@/db/enums";

export interface AuthResult {
  authorized: boolean;
  user?: SessionUser;
  response?: NextResponse;
}

/**
 * Authorizes a Route Handler request.
 * Extracts the access token from request cookies, validates it against signature and blacklists,
 * and verifies role-based permissions (RBAC) if specified.
 */
export async function authorize(
  req: NextRequest,
  requiredRole?: UserRole
): Promise<AuthResult> {
  const accessToken = req.cookies.get("accessToken")?.value;

  if (!accessToken) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized: Access token is missing" },
        { status: 401 }
      ),
    };
  }

  const user = await getSessionUser(accessToken);

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized: Invalid or expired session" },
        { status: 401 }
      ),
    };
  }

  if (requiredRole && !hasRole(user.role, requiredRole)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden: You do not have the required permissions" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user,
  };
}

/**
 * Authorizes a Next.js Server Action request.
 * Reads the access token cookie using next/headers cookies(), validates it,
 * and checks role permissions. Throws an error on failure.
 */
export async function authorizeAction(requiredRole?: UserRole): Promise<SessionUser> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    throw new Error("Unauthorized: Access token is missing");
  }

  const user = await getSessionUser(accessToken);

  if (!user) {
    throw new Error("Unauthorized: Invalid or expired session");
  }

  if (requiredRole && !hasRole(user.role, requiredRole)) {
    throw new Error("Forbidden: You do not have the required permissions");
  }

  return user;
}
