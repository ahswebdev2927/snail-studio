import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | Snail Studio",
  description: "Sign in to your account at Snail Studio to view your orders, addresses, and wishlist.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
