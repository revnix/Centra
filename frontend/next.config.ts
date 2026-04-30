import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // reactCompiler: true, // Commented out to debug stability issues
  // @ts-ignore - experimental flag not fully typed in NextConfig yet
  allowedDevOrigins: ["http://localhost:3000", "http://172.27.80.1:3000", "http://172.20.96.1:3000", "localhost:3000", "172.20.96.1:3000", "172.20.96.1"],
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
    const backendUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!backendUrl) {
      // In production, we want to know if this is missing. 
      // Next.js will use this destination during build/runtime.
      console.warn("NEXT_PUBLIC_API_URL is not defined. API rewrites will not function correctly.");
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
