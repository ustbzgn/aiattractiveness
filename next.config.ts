import type { NextConfig } from 'next';
const nextConfig: NextConfig = { experimental: { workerThreads: true, cpus: 2 } };
export default nextConfig;
