import type { NextConfig } from "next";

// Allow the OpenPanel analytics SDK origin in the CSP script-src, but only when
// analytics is configured — so enabling it can't be silently blocked by the CSP.
// (The ingestion POST to NEXT_PUBLIC_OPENPANEL_API_URL is already covered by the
// permissive connect-src https: below.)
const analyticsScriptOrigin = (() => {
  const src =
    process.env.NEXT_PUBLIC_OPENPANEL_SDK_URL ||
    (process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID ? "https://openpanel.dev/op1.js" : "");
  if (!src) return "";
  try {
    return new URL(src).origin;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  // Output mode for containerized deployments (Railway, Docker, etc.)
  output: "standalone",

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'unsafe-eval'${analyticsScriptOrigin ? ` ${analyticsScriptOrigin}` : ""}`, // Next.js requires unsafe-inline/eval; analytics SDK host added when configured
              "style-src 'self' 'unsafe-inline'", // For styled-jsx and inline styles
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https: http:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "frame-src 'self' https://open.spotify.com https://js.paddle.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://rumble.com https://www.dailymotion.com",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },

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
      {
        // Production R2 custom domain (CLOUDFLARE_R2_PUBLIC_URL)
        protocol: "https",
        hostname: "r2.justsent.app",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
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
    // Tree-shake large icon libraries
    optimizePackageImports: [
      "@tabler/icons-react",
      "date-fns",
      "lodash",
    ],
  },
};

export default nextConfig;
