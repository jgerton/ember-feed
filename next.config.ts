import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Temporarily disabled due to Edge runtime compilation issues
  // experimental: {
  //   instrumentationHook: true,
  // },

  // Enable gzip/brotli compression for all responses
  // This significantly reduces payload sizes (typically 60-80% reduction)
  compress: true,

  // Performance and security optimizations
  poweredByHeader: false, // Remove X-Powered-By header
}

export default nextConfig
