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
  async redirects() {
    return [
      { source: "/v2/dashboard", destination: "/v2/apply", permanent: true },
      { source: "/v2/dashboard/profile", destination: "/v2/profile/user", permanent: true },
      { source: "/v2/dashboard/uploads", destination: "/v2/profile/ausbildung", permanent: true },
      { source: "/v2/uploads", destination: "/v2/profile/ausbildung", permanent: true },
    ];
  },
};

export default nextConfig;
