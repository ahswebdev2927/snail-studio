import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
