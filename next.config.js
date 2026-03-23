/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow CoinGecko images if needed
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.coingecko.com' },
    ],
  },
};

module.exports = nextConfig;
