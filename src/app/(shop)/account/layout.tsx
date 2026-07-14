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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Sidebar navigation column */}
        <aside className="col-span-1 md:col-span-4 lg:col-span-3">
          <AccountNav user={user} />
        </aside>

        {/* Content column */}
        <main className="col-span-1 md:col-span-8 lg:col-span-9 bg-card border border-border/40 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-sm">
          {children}
        </main>
      </div>
    </div>
  );
}
