import React from "react";

export const metadata = {
  title: "Admin Portal | Snail Studio",
  description: "Management portal for Snail Studio Press-On Nails store.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
