import type { NextConfig } from "next";

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
  allowedDevOrigins: ['127.0.0.1', 'localhost', '192.168.1.22'],
};

export default nextConfig;
