import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Permit phone previews through this machine’s own addresses, without a wildcard.
const localPreviewHosts = Object.values(networkInterfaces()).flatMap((addresses) =>
  (addresses ?? []).filter(({ family }) => family === "IPv4").map(({ address }) => address),
);

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
  allowedDevOrigins: localPreviewHosts,
};

export default nextConfig;
