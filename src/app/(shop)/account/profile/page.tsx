import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ProfileClient } from "./profile-client";

export const metadata = {
  title: "Profile Settings | Snail Studio",
  description: "Update your name, email, WhatsApp contact number, and profile avatar at Snail Studio.",
};

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/login?callbackUrl=/account/profile");
  }

  const sessionUser = await getSessionUser(token);

  if (!sessionUser) {
    redirect("/login?callbackUrl=/account/profile");
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, sessionUser.id),
  });

  if (!dbUser || !dbUser.isActive) {
    redirect("/login?callbackUrl=/account/profile");
  }

  const user = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    phoneNumber: dbUser.phoneNumber,
    whatsappNumber: dbUser.whatsappNumber,
    image: dbUser.image,
    marketingConsent: dbUser.marketingConsent,
  };

  return <ProfileClient user={user} />;
}
