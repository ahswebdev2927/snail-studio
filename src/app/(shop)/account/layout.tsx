import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AccountNav } from "./account-nav";

export const metadata = {
  title: "My Account | Snail Studio",
  description: "Manage your profile, orders, addresses, and wishlist at Snail Studio.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  // 1. Auth check
  if (!token) {
    redirect("/login?callbackUrl=/account");
  }

  const sessionUser = await getSessionUser(token);

  if (!sessionUser) {
    redirect("/login?callbackUrl=/account");
  }

  // 2. Fetch full DB record to obtain correct timestamps and extra fields
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, sessionUser.id),
  });

  if (!dbUser || !dbUser.isActive) {
    // Session is invalid or revoked
    redirect("/login?callbackUrl=/account");
  }

  // Create clean user model for child client/server consumption
  const user = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    phoneNumber: dbUser.phoneNumber,
    image: dbUser.image,
    createdAt: dbUser.createdAt,
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 font-sans">
      <div className="flex flex-col md:flex-row items-start gap-8 md:gap-10">
        {/* Sidebar navigation column */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0 md:border-r border-border/20 md:pr-8 space-y-6">
          <AccountNav user={user} />
        </aside>

        {/* Content column */}
        <main className="flex-1 min-w-0 w-full min-h-[600px] flex flex-col justify-start">
          {children}
        </main>
      </div>
    </div>
  );
}
