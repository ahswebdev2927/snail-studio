import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ trackingNumber: string }>;
}

export default async function DirectTrackingPage({ params }: PageProps) {
  const { trackingNumber } = await params;
  
  if (!trackingNumber) {
    redirect("/track");
  }
  
  redirect(`/track?trackingNumber=${encodeURIComponent(trackingNumber)}`);
}
