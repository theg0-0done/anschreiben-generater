import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse uses 'fs' and tries to read test files at import time.
      // Marking it as external prevents Next.js from bundling it and avoids the crash.
      config.externals = [...(config.externals as string[]), "pdf-parse"];
    }
    return config;
  },
};

export default nextConfig;
