import React from "react";
import { Metadata } from "next";
import { getSystemSettingsMap } from "@/services/settings";
import { buildPolicyConfig } from "@/content/policies/config";
import { getPrivacyPolicyData } from "@/content/policies/privacy-policy";
import { PolicyPage } from "@/components/policies/policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Snail Studio",
  description:
    "Learn how Snail Studio collects, uses, protects, and manages customer information and data protection.",
};

export default async function PrivacyPolicyPage() {
  const settingsMap = await getSystemSettingsMap();
  const config = buildPolicyConfig(settingsMap);
  const data = getPrivacyPolicyData(config);

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
