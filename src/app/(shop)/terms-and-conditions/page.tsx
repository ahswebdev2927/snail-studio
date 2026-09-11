import React from "react";
import { Metadata } from "next";
import { getSystemSettingsMap } from "@/services/settings";
import { buildPolicyConfig } from "@/content/policies/config";
import { getTermsAndConditionsData } from "@/content/policies/terms-and-conditions";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "Terms & Conditions | Snail Studio",
  description:
    "Terms and Conditions governing the use of Snail Studio website, orders, payments, and services.",
};

export default async function TermsAndConditionsPage() {
  const settingsMap = await getSystemSettingsMap();
  const config = buildPolicyConfig(settingsMap);
  const data = getTermsAndConditionsData(config);

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
