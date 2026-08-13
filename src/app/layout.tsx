import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSiteUrl, getOrganizationJsonLd, getWebsiteJsonLd } from "@/lib/seo";
import { AlertDialogProvider } from "@/components/ui/alert-dialog-provider";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Snail Studio | Premium Press-On Nails E-Commerce",
  description: "Experience salon-quality manicures from home with our custom-designed, luxury press-on nails. Handcrafted, reusable, and tailored to perfection.",
  keywords: "press-on nails, custom nails, luxury nails, reusable nails, salon quality, Snail Studio",
  icons: {
    icon: [
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicons/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicons/favicon.ico",
    apple: [
      { url: "/favicons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/favicons/site.webmanifest",
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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen flex flex-col">

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
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
