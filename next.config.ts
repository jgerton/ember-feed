import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Temporarily disabled due to Edge runtime compilation issues
  // experimental: {
  //   instrumentationHook: true,
  //   serverComponentsExternalPackages: ['re2', 'better-sqlite3'],
  // },

  // Turbopack config (Next.js 16 default bundler)
  // @ts-ignore - turbopack type not yet in NextConfig
  turbopack: {
    // Turbopack has better file watching than webpack by default
    // No additional config needed for Docker hot reload
  },

  // External packages for Server Components (native modules)
  // @ts-ignore - experimental type not yet in NextConfig
  experimental: {
    serverComponentsExternalPackages: ['re2', 'better-sqlite3', 'metascraper'],
  },

  // Keep webpack config for backwards compatibility if needed
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay rebuild after change
      }
    }
    return config
  },

  // Standalone output for production Docker (smaller image)
  output: 'standalone',

  // Enable gzip/brotli compression for all responses
  // This significantly reduces payload sizes (typically 60-80% reduction)
  compress: true,

  // Performance and security optimizations
  poweredByHeader: false, // Remove X-Powered-By header
}

export default nextConfig
