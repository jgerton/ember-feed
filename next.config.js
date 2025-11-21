/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    // Turbopack has better file watching than webpack by default
    // No additional config needed for Docker hot reload
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
}

module.exports = nextConfig
