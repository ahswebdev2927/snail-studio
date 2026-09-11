import React from "react";
import { Metadata } from "next";
import { getSystemSettingsMap } from "@/services/settings";
import { buildPolicyConfig } from "@/content/policies/config";
import { getReturnsRefundsPolicyData } from "@/content/policies/returns-refunds-policy";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "Returns, Refunds & Exchanges | Snail Studio",
  description:
    "Read Snail Studio return policy, exchange terms, 7-day return window, cancellation rules, and refund process.",
};

export default async function ReturnsRefundsPage() {
  const settingsMap = await getSystemSettingsMap();
  const config = buildPolicyConfig(settingsMap);
  const data = getReturnsRefundsPolicyData(config);

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
