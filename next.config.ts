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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://apis.google.com;",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
      "img-src 'self' data: blob: https://res.cloudinary.com https://www.naild.de https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com;",
      "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com;",
      "connect-src 'self' https://api.cloudinary.com https://*.cloudinary.com https://api.razorpay.com https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com https://*.firebaseapp.com;",
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://www.google.com/recaptcha/ https://recaptcha.google.com/ https://*.firebaseapp.com;",,
    ].join(" "),
  },
];

const allowedDevOrigins = [
  "127.0.0.1",
  "localhost",
  "192.168.1.22",
  "*.ngrok-free.dev",
  "*.ngrok-free.app",
  "*.ngrok.io",
];

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (siteUrl) {
  try {
    const hostname = new URL(siteUrl).hostname;
    if (hostname && !allowedDevOrigins.includes(hostname)) {
      allowedDevOrigins.push(hostname);
    }
  } catch {
    const hostname = siteUrl.replace(/^https?:\/\//, "").split("/")[0];
    if (hostname && !allowedDevOrigins.includes(hostname)) {
      allowedDevOrigins.push(hostname);
    }
  }
}

const nextConfig: NextConfig = {
  env: {
    APP_ENV: process.env.APP_ENV || "development",
  },
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
  allowedDevOrigins,
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
