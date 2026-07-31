import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

/**
 * Fetches all system settings from the database, cached across requests.
 */
export const getSystemSettings = unstable_cache(
  async () => {
    return db.select().from(systemSettings);
  },
  ["system-settings"],
  {
    tags: [CACHE_TAGS.SETTINGS],
  }
);

/**
 * Fetches and maps system settings as key-value pairs.
 */
export async function getSystemSettingsMap(): Promise<Record<string, string>> {
  const settingsRows = await getSystemSettings();
  return settingsRows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}
