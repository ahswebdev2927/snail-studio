import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { getSiteUrl, getOrganizationJsonLd, getWebsiteJsonLd } from "@/lib/seo";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { AlertDialogProvider } from "@/components/ui/alert-dialog-provider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Snail Studio | Premium Press-On Nails E-Commerce",
  description: "Experience salon-quality manicures from home with our custom-designed, luxury press-on nails. Handcrafted, reusable, and tailored to perfection.",
  keywords: "press-on nails, custom nails, luxury nails, reusable nails, salon quality, Snail Studio",
  openGraph: {
    title: "Snail Studio | Premium Press-On Nails",
    description: "Experience salon-quality manicures from home with our custom-designed, luxury press-on nails.",
    url: "/",
    siteName: "Snail Studio",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Snail Studio | Premium Press-On Nails",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Snail Studio | Premium Press-On Nails",
    description: "Experience salon-quality manicures from home with our custom-designed, luxury press-on nails.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = getOrganizationJsonLd();
  const websiteJsonLd = getWebsiteJsonLd();

  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  send_page_view: false
                });
              `}
            </Script>
          </>
        )}
        <AnalyticsTracker />
        {/* Sitewide JSON-LD structured data */}
        <script
          id="ld-json-org"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          id="ld-json-web"
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          id="theme-initializer"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem("theme") || localStorage.getItem("admin-theme");
                if (savedTheme === "dark") {
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              } catch (_) {}
            `,
          }}
        />
        <AlertDialogProvider>
          {children}
        </AlertDialogProvider>
      </body>
    </html>
  );
}
