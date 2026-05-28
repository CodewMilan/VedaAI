/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};
export default nextConfig;
