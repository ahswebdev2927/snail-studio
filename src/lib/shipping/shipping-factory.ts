import { ShippingProvider } from "./types";
import { externalShippingProvider } from "./providers/external.provider";

// Registry for functional shipping provider objects
const providersMap: Map<string, ShippingProvider> = new Map();

// Register initial functional providers
providersMap.set("external", externalShippingProvider);

export function registerShippingProvider(provider: ShippingProvider): void {
  providersMap.set(provider.providerId, provider);
}

export function getShippingProvider(providerId: "delhivery" | "external" = "delhivery"): ShippingProvider {
  const provider = providersMap.get(providerId);

  if (!provider) {
    if (providerId === "delhivery") {
      throw new Error("Delhivery functional provider is not yet registered. Complete Phase V3-2 Delhivery API integration or select 'external' provider.");
    }
    throw new Error(`Unsupported or unregistered shipping provider: '${providerId}'`);
  }

  return provider;
}
