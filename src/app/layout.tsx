import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Snail Studio | Premium Press-On Nails E-Commerce",
  description: "Experience salon-quality manicures from home with our custom-designed, luxury press-on nails. Handcrafted, reusable, and tailored to perfection.",
  openGraph: {
    title: "Snail Studio | Premium Press-On Nails",
    description: "Salon-quality luxury press-on nails designed for ease and elegance.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
