import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* TypeScript and ESLint errors are not ignored to ensure production quality */
  async redirects() {
    return [
      {
        source: "/portal/dashboard",
        destination: "/portal/status",
        permanent: true,
      },
      {
        source: "/jobs",
        destination: "/login",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:2024/api/v1/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://127.0.0.1:2024/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
