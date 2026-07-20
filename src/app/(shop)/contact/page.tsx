import React from "react";
import type { Metadata } from "next";
import { ContactClient } from "./contact-client";
import { getBaseMetadata, getBreadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = getBaseMetadata({
  title: "Contact Us & Support | Snail Studio",
  description: "Get in touch with Snail Studio support. Contact us for order questions, custom press-on nail sizing help, custom designs, or wholesale queries.",
  path: "/contact",
  keywords: "contact support, email nail studio, whatsapp nail support, customer service, Snail Studio",
});

import { db } from "@/db";
import { systemSettings } from "@/db/schema";

export default async function ContactPage() {
  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Contact Support", url: "/contact" },
  ]);

  // Fetch store contact details from system settings in database
  const settings = await db.select().from(systemSettings);
  const settingsMap = settings.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);

  const storeEmail = settingsMap["store_email"] || "hello@snailstudio.in";
  const storePhone = settingsMap["store_phone"] || "+91 99999 99999";
  const storeAddress = settingsMap["store_address"] || "Snail Studio, Luxury Craft Center\nNew Delhi, DL 110001, India";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ContactClient 
        storeEmail={storeEmail} 
        storePhone={storePhone} 
        storeAddress={storeAddress} 
      />
    </>
  );
}
