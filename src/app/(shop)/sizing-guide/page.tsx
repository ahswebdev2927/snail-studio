import React from "react";
import { db } from "@/db";
import { sizeProfiles, systemSettings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { SizingGuideClient } from "@/components/storefront/sizing-guide-client";
import type { Metadata } from "next";
import { getBaseMetadata, getBreadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 3600; // Cache size guide page for 1 hour

export const metadata: Metadata = getBaseMetadata({
  title: "Press-On Nail Size Guide & Simulator | Snail Studio",
  description: "Find your perfect press-on nail fit. Use our interactive size and length visualizer, learn how to measure your nails at home, and view standard size charts.",
  path: "/sizing-guide",
  keywords: "nail size guide, press-on nail sizing, nail length chart, custom nails, how to measure nail bed, Snail Studio",
});

export default async function SizingGuidePage() {
  // Fetch active size profiles and length chart settings in parallel
  const [activeSizes, lengthChartRow] = await Promise.all([
    db.query.sizeProfiles.findMany({
      where: eq(sizeProfiles.isActive, true),
      orderBy: asc(sizeProfiles.thumb), // Sort by Thumb width (XS -> S -> M -> L)
    }),
    db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, "length_chart_settings"),
    }),
  ]);

  let lengthChartData = [];
  if (lengthChartRow && lengthChartRow.value) {
    try {
      lengthChartData = JSON.parse(lengthChartRow.value);
    } catch (e) {
      console.error("Failed to parse length chart settings JSON in page component:", e);
    }
  }

  // Fallback to default rows if database row doesn't exist
  if (lengthChartData.length === 0) {
    lengthChartData = [
      { id: "1", shape: "Stiletto", xs: "14mm - 19mm", s: "15mm - 23mm", m: "18mm - 24mm", l: "18mm - 25mm" },
      { id: "2", shape: "Square", xs: "12mm - 17mm", s: "13mm - 20mm", m: "14mm - 23mm", l: "19mm - 25mm" },
      { id: "3", shape: "Square Oval", xs: "12mm - 17mm", s: "13mm - 20mm", m: "14mm - 23mm", l: "19mm - 25mm" },
      { id: "4", shape: "Round", xs: "12mm - 17mm", s: "12mm - 21mm", m: "15mm - 24mm", l: "18mm - 27mm" },
      { id: "5", shape: "Oval", xs: "10mm - 20mm", s: "13mm - 23mm", m: "15mm - 24mm", l: "18mm - 27mm" },
      { id: "6", shape: "Coffin", xs: "12mm - 17mm", s: "14mm - 19mm", m: "16mm - 22mm", l: "20mm - 26mm" },
      { id: "7", shape: "Almond", xs: "14mm - 19mm", s: "15mm - 23mm", m: "18mm - 24mm", l: "18mm - 25mm" }
    ];
  }

  const breadcrumbJsonLd = getBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Size Guide", url: "/sizing-guide" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SizingGuideClient
        sizeProfiles={activeSizes}
        lengthChartData={lengthChartData}
      />
    </>
  );
}
