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

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Only in production
    if (!dev && !isServer) {
      // Split chunks more aggressively
      config.optimization.splitChunks = {
        chunks: "all",
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Vendor chunk for node_modules
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 10,
          },
          // Separate chunk for heavy UI libraries
          ui: {
            test: /[\\/]node_modules[\\/](@tabler|@radix-ui|framer-motion)[\\/]/,
            name: "ui-libs",
            chunks: "all",
            priority: 20,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
