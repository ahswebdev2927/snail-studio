import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getUserSessions } from "@/features/account/actions";
import { SecurityClient } from "./security-client";

export const metadata = {
  title: "Security & Sessions | Snail Studio",
  description: "Monitor and manage your active account sessions and logged-in devices.",
};

export default async function SecurityPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/login?callbackUrl=/account/security");
  }

  const sessionUser = await getSessionUser(token);

  if (!sessionUser) {
    redirect("/login?callbackUrl=/account/security");
  }

  const res = await getUserSessions();

  if (!res.success || !res.sessions) {
    return (
      <div className="p-6 text-center space-y-4">
        <h2 className="font-serif text-xl font-semibold text-destructive">Error Loading Security Details</h2>
        <p className="text-sm text-muted-foreground font-light">
          {res.error || "We encountered an issue retrieving your active sessions."}
        </p>
      </div>
    );
  }

  return <SecurityClient initialSessions={res.sessions} />;
}
