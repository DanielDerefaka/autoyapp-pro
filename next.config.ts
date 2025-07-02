import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  typescript: {
    // Ignoring TypeScript errors during build
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true
  },

  images: {
    // Allow images from any domain
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],
    
    // Alternative: Use domains (deprecated but still works)
    // domains: ['*'], // This won't work, you need specific domains
    
    // Disable image optimization if you want to allow any format
    unoptimized: true,
    
    // Supported image formats
    formats: ['image/webp', 'image/avif'],
    
    // Image sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Allow SVG images
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },


  // Webpack configuration to handle LightningCSS native modules
  // Environment variables for build optimization
  env: {
    DISABLE_ESLINT_PLUGIN: 'true',
    SKIP_PREFLIGHT_CHECK: 'true',
  },
};

export default nextConfig;
