import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the sandbox preview proxy origin so HMR/websockets work when the
  // dev server is viewed through an e2b.app preview URL.
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
