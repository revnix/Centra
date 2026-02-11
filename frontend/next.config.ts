import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler: true, // Commented out to debug stability issues
  allowedDevOrigins: ["http://localhost:3000", "http://172.27.80.1:3000", "http://172.20.96.1:3000", "localhost:3000", "172.20.96.1:3000", "172.20.96.1"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8123/api/v1/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://127.0.0.1:8123/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
