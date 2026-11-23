import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: { root: import.meta.dirname },
  // Dev-only badge: keep it off the mobile bottom tab bar
  devIndicators: { position: "top-right" },
  // Dev only: let phones on the local network open the dev server (e.g. to scan an enrolment QR)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  serverExternalPackages: ["@node-rs/argon2", "@react-pdf/renderer"],
  experimental: { serverActions: { bodySizeLimit: "200mb" } },
};

export default nextConfig;
