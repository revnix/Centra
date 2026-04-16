import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:2024";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["http://localhost:3000", "http://172.27.80.1:3000", "http://172.20.96.1:3000", "localhost:3000", "172.20.96.1:3000", "172.20.96.1"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
