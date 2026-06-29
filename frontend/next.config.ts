import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactCompiler: false,
  experimental: {
    // Tree-shake large icon/component libraries — only the icons actually used
    // are bundled. Without this, lucide-react pulls in 500+ icons on every page.
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
  // @ts-ignore
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://172.27.80.1:3000",
    "http://172.20.96.1:3000",
    "localhost:3000",
    "172.20.96.1:3000",
    "172.20.96.1",
    "revolute-jerica-uncombatant.ngrok-free.dev",
    "https://revolute-jerica-uncombatant.ngrok-free.dev"
  ],
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
    const backendUrl = process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || "http://127.0.0.1:2024";
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
