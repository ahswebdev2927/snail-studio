import React from "react";
import { Metadata } from "next";
import { getSystemSettingsMap } from "@/services/settings";
import { buildPolicyConfig } from "@/content/policies/config";
import { getShippingPolicyData } from "@/content/policies/shipping-policy";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "Shipping Policy | Snail Studio",
  description:
    "Learn about Snail Studio shipping timelines, courier partners, tracking, and delivery terms.",
};

export default async function ShippingPolicyPage() {
  const settingsMap = await getSystemSettingsMap();
  const config = buildPolicyConfig(settingsMap);
  const data = getShippingPolicyData(config);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.title,
    description: data.description,
    publisher: {
      "@type": "Organization",
      name: config.registeredBusinessName,
      url: config.siteUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PolicyPage data={data} config={config} />
    </>
  );
}
