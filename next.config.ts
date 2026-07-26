import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,

  // ---------- Images ----------
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      { protocol: "https", hostname: "**.mypinata.cloud" },
      { protocol: "https", hostname: "cloudflare-ipfs.com" },
      { protocol: "https", hostname: "cf-ipfs.com" },
      { protocol: "https", hostname: "nftstorage.link" },
      { protocol: "https", hostname: "w3s.link" },
      { protocol: "https", hostname: "dweb.link" },
      { protocol: "https", hostname: "ipfs.io" },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [96, 128, 256, 384, 512],
    // Long cache — IPFS CIDs are immutable
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    formats: ["image/avif", "image/webp"],
  },

  // ---------- Tree-shaking tweaks ----------
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "viem",
      "wagmi",
      "@wagmi/core",
      "@rainbow-me/rainbowkit",
      "framer-motion",
      "swiper",
    ],
  },

  // ---------- Long cache for static assets ----------
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
