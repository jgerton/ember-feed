/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable hot reload in Docker (Windows/Mac require polling)
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
