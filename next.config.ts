import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy notes
 * ----------------------------
 * - The theme tokens are rendered as an inline <style> block and several
 *   components set inline `style` attributes, so `style-src` must allow
 *   inline styles. Moving to a nonce means rendering the theme from a
 *   middleware-controlled hash; recorded as a future hardening step.
 * - Next injects inline bootstrap/hydration scripts, so `script-src` allows
 *   inline scripts in this deployment mode. A nonce-based policy requires
 *   middleware and is deliberately deferred rather than silently weakened.
 * - `frame-ancestors 'none'` is the real clickjacking defence (X-Frame-Options
 *   is kept for older browsers).
 * - `img-src` allows https so merchant-entered product images on a CDN work;
 *   images are proxied through `next/image`, which re-encodes them.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  // node:sqlite is a Node.js builtin — keep it out of the bundler's module graph.
  serverExternalPackages: ["node:sqlite"],
  // The schema and the demo snapshot are read at runtime; without this Next's
  // file tracing omits them from the serverless bundle and every page 500s.
  outputFileTracingIncludes: {
    "/**": ["./data/seed/store.db", "./lib/db/schema.sql"],
  },
  poweredByHeader: false,
  // The hosted preview proxy serves the dev server from a *.e2b.app origin.
  // Without this, dev asset requests from that origin are rejected and the
  // preview renders without styles or HMR.
  allowedDevOrigins: ["*.e2b.app", "*.e2b.dev"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 420, 640, 828, 1080, 1200, 1600, 1920, 2048],
    imageSizes: [64, 96, 128, 200, 256, 320, 420, 512],
    // Merchants may paste an https URL from their own CDN; anything else is
    // rejected before the optimiser ever fetches it.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Media files are user-supplied: never let a browser sniff them.
      {
        source: "/api/media/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "inline" },
        ],
      },
    ];
  },
};

export default nextConfig;
