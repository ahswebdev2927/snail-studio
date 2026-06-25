import React, { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AccountWishlistClient } from "./wishlist-client";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "My Wishlist | Snail Studio",
  description: "Browse and manage your wishlisted custom press-on nail sets within your customer account portal.",
};

export default async function AccountWishlistPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/login?callbackUrl=/account/wishlist");
  }

  const user = await getSessionUser(token);

  if (!user) {
    redirect("/login?callbackUrl=/account/wishlist");
  }

  return (
    <Suspense
      fallback={
        <div className="py-16 text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <span className="text-xs font-light text-muted-foreground">Loading your wishlist...</span>
        </div>
      }
    >
      <AccountWishlistClient />
    </Suspense>
  );
}
