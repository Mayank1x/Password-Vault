/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ ignore lint errors during build
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ allow TypeScript errors in build
  },
};

export default nextConfig;
