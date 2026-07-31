import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self';",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com;",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data: blob: https://res.cloudinary.com https://www.naild.de https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com;",
      "font-src 'self' data:;",
      "connect-src 'self' https://api.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com;",
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com;",
    ].join(" "),
  },
];

const nextConfig: NextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./src/lib/cloudinary/loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "www.naild.de",
      },
    ],
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.22', 'blandness-drown-shrank.ngrok-free.dev'],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withAnalyzer(nextConfig);
