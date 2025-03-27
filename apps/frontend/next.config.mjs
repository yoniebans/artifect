/** @type {import('next').NextConfig} */
const nextConfig = {
    productionBrowserSourceMaps: true,
    staticPageGenerationTimeout: 120,
    env: {
        BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000',
      },
};

export default nextConfig;