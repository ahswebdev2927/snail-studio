import React from "react";
import CampaignForm from "@/components/admin/marketing/campaign-form";
import { db } from "@/db";
import { coupons, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  // Query all active coupons and catalog items to populate wizard selectors
  const activeCoupons = await db
    .select({
      id: coupons.id,
      code: coupons.code,
      discountType: coupons.discountType,
      discountValue: coupons.discountValue,
    })
    .from(coupons)
    .where(eq(coupons.isActive, true));

  const couponsData = activeCoupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.discountType === "percentage" ? `${c.discountValue}% OFF` : `₹${(c.discountValue / 100).toFixed(0)} OFF`,
  }));

  const activeProducts = await db
    .select({
      id: products.id,
      name: products.name,
    })
    .from(products)
    .where(eq(products.isActive, true));

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif text-foreground">New Campaign Wizard</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure and dispatch target marketing campaigns using Resend.</p>
      </div>
      <CampaignForm coupons={couponsData} products={activeProducts} />
    </div>
  );
}
