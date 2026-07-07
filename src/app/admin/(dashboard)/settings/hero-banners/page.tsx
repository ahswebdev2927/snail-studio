import { redirect } from "next/navigation";

export default function LegacyHeroBannersRedirect() {
  redirect("/admin/settings/storefront?tab=banners");
}
