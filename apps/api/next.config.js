/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@reelrank/shared'],
  serverExternalPackages: ['ably'],
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN ?? 'https://reelrank.vercel.app' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,X-Real-IP' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
