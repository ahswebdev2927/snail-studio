import { redirect } from "next/navigation";

export default function LegacyAnnouncementsRedirect() {
  redirect("/admin/settings/storefront?tab=announcements");
}
