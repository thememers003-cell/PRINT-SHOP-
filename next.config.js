/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  typescript: {
    // We already run strict TypeScript verification in vitest
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/uploads/:path*',
          destination: '/api/files/uploads/:path*',
        },
        {
          source: '/spooler-output/:path*',
          destination: '/api/files/spooler-output/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;

