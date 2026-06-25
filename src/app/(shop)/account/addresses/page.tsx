import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getUserAddresses } from "@/features/account/actions";
import { AddressClient } from "./address-client";

export const metadata = {
  title: "Address Book | Snail Studio",
  description: "Manage your shipping and billing addresses for faster checkout at Snail Studio.",
};

export default async function AddressesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/login?callbackUrl=/account/addresses");
  }

  const user = await getSessionUser(token);

  if (!user) {
    redirect("/login?callbackUrl=/account/addresses");
  }

  const res = await getUserAddresses();

  if (!res.success || !res.addresses) {
    return (
      <div className="p-6 text-center space-y-4 font-sans">
        <h2 className="font-serif text-lg font-semibold text-destructive">Error Loading Address Book</h2>
        <p className="text-xs text-muted-foreground font-light">
          {res.error || "We encountered an issue retrieving your saved addresses."}
        </p>
      </div>
    );
  }

  // Typecast Address details to match the client component structure
  const formattedAddresses = res.addresses.map((addr) => ({
    id: addr.id,
    userId: addr.userId,
    type: addr.type as "shipping" | "billing",
    isDefault: addr.isDefault,
    name: addr.name,
    phone: addr.phone,
    addressLine1: addr.addressLine1,
    addressLine2: addr.addressLine2,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
  }));

  return <AddressClient initialAddresses={formattedAddresses} />;
}
