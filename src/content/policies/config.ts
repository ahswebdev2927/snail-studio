export interface PolicyConfig {
  storeName: string;
  registeredBusinessName: string;
  legalPhysicalAddress: string;
  supportEmail: string;
  supportPhone: string;
  effectiveDate: string;
  siteUrl: string;
}

export function buildPolicyConfig(settings: Record<string, string>): PolicyConfig {
  const storeName = settings.store_name?.trim() || "Snail Studio";
  const registeredBusinessName =
    settings.registered_business_name?.trim() ||
    settings.store_name?.trim() ||
    "Snail Studio";
  const legalPhysicalAddress =
    settings.legal_physical_address?.trim() ||
    settings.store_address?.trim() ||
    "Snail Studio, Luxury Craft Center, New Delhi, DL 110001, India";
  const supportEmail = settings.store_email?.trim() || "support@snailstudio.in";
  const supportPhone = settings.store_phone?.trim() || "+91 99999 99999";
  const siteUrl = "https://snailstudio.in";

  return {
    storeName,
    registeredBusinessName,
    legalPhysicalAddress,
    supportEmail,
    supportPhone,
    effectiveDate: "September 11, 2026",
    siteUrl,
  };
}
