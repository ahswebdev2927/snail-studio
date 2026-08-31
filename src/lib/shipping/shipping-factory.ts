import { ShippingProvider } from "./types";
import { externalShippingProvider } from "./providers/external.provider";
import { delhiveryShippingProvider } from "./providers/delhivery";

// Registry for functional shipping provider objects
const providersMap: Map<string, ShippingProvider> = new Map();

// Register functional providers
providersMap.set("external", externalShippingProvider);
providersMap.set("delhivery", delhiveryShippingProvider);

export function registerShippingProvider(provider: ShippingProvider): void {
  providersMap.set(provider.providerId, provider);
}

export function getShippingProvider(providerId: "delhivery" | "external" = "delhivery"): ShippingProvider {
  const provider = providersMap.get(providerId);

  if (!provider) {
    throw new Error(`Unsupported or unregistered shipping provider: '${providerId}'`);
  }

  return provider;
}

