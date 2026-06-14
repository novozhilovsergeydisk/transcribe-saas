/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/db"],
  experimental: {
    serverComponentsExternalPackages: ["pg", "bullmq", "ioredis"],
  },
};

export default nextConfig;
