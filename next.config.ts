import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    // Externalize chromadb for server-side only (fixes webpack bundling issue)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('chromadb');
    }

    // Ignore chromadb on client-side
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'chromadb': false,
      };
    }

    return config;
  },
};

export default nextConfig;
