import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* TypeScript and ESLint errors are not ignored to ensure production quality */
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
