import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Required for streaming in App Router API routes
  },
};

export default nextConfig;
