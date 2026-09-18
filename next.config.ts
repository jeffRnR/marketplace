import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  transpilePackages: ['mapbox-gl'],
};

export default nextConfig;
