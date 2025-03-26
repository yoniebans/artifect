/** @type {import('next').NextConfig} */
const nextConfig = {
    productionBrowserSourceMaps: true,
    env: {
        BACKEND_URL: process.env.BACKEND_URL,
      },
};

export default nextConfig;