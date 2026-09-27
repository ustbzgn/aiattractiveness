import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.1.9',
    '192.168.1.9:3002',
    'localhost:3002',
    '127.0.0.1:3002',
  ],
  experimental: { workerThreads: true, cpus: 2 },
};
export default nextConfig;
