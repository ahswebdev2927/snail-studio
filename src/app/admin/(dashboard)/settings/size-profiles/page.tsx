import { redirect } from "next/navigation";

export default function LegacySizeProfilesRedirect() {
  redirect("/admin/settings/storefront?tab=sizing");
}
