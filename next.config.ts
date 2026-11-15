import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite is a Node.js builtin — keep it out of the bundler's module graph.
  serverExternalPackages: ["node:sqlite"],
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 420, 640, 828, 1080, 1200, 1600, 1920, 2048],
    imageSizes: [64, 96, 128, 200, 256, 320, 420, 512],
  },
};

export default nextConfig;
