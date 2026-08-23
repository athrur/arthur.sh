import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
