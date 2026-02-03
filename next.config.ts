import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
    // Optimize image sizes for common breakpoints
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Use modern image formats
    formats: ["image/avif", "image/webp"],
    // Cache optimized images longer
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },

  // Build optimizations
  compress: true,
  productionBrowserSourceMaps: false,

  // Turbopack config (Next.js 16+ default bundler)
  turbopack: {},

  // Experimental optimizations
  experimental: {
    // Optimize CSS output
    optimizeCss: true,
    // Tree-shake large icon libraries
    optimizePackageImports: [
      "@tabler/icons-react",
      "date-fns",
      "lodash",
    ],
  },
};

export default nextConfig;
