import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained production server at `.next/standalone/server.js`
  // so the Docker runtime image can ship without `node_modules`.
  output: "standalone",
};

export default nextConfig;
