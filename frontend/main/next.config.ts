import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/upload',
        destination: 'http://localhost:3001/upload',
      },
      {
        source: '/api/files',
        destination: 'http://localhost:3001/files',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3001/uploads/:path*',
      },
      {
        source: '/api/auth',
        destination: 'http://localhost:3001/auth',
      },
      {
        source: '/api/genAuthKey',
        destination: 'http://localhost:3001/genAuthKey',
      },
    ];
  },
};

export default nextConfig;
