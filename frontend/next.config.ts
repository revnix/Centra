import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  // Backend (uvicorn) closes idle keep-alive sockets after ~5s; reusing a dead
  // pooled connection causes random ECONNRESET on proxied /api/v1 requests.
  httpAgentOptions: {
    keepAlive: false,
  },
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
    // Increase proxy timeout for large file uploads (onboarding documents, resumes).
    // Cloudinary uploads via the backend can take 15-30s — the default Next.js
    // dev proxy drops the socket before the backend finishes, causing ECONNRESET.
    proxyTimeout: 120_000, // 2 minutes
  },
  // @ts-ignore
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://172.27.80.1:3000",
    "http://172.20.96.1:3000",
    "localhost:3000",
    "172.20.96.1:3000",
    "172.20.96.1",
    "lvh.me",
    "lvh.me:3000",
    "http://lvh.me:3000",
    "revolute-jerica-uncombatant.ngrok-free.dev",
    "https://revolute-jerica-uncombatant.ngrok-free.dev",
    "issuing-coerce-consensus.ngrok-free.dev",
    "https://issuing-coerce-consensus.ngrok-free.app"
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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || "http://127.0.0.1:8123";
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
