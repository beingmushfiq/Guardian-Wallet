/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.AGENT_URL || 'http://127.0.0.1:8787'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
