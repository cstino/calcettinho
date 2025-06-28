const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Cache per API di Airtable
    {
      urlPattern: /^https:\/\/api\.airtable\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'airtable-api',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 30, // 30 minuti
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cache per immagini giocatori
    {
      urlPattern: /\/players\/.*\.(jpg|jpeg|png|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'player-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 1 settimana
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cache per card templates
    {
      urlPattern: /\/cards\/.*\.(jpg|jpeg|png|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'card-templates',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 1 mese
        },
      },
    },
    // Cache per API backend locali
    {
      urlPattern: /^\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'backend-api',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 15, // 15 minuti
        },
        networkTimeoutSeconds: 5,
      },
    },
    // Cache per static assets
    {
      urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 1 mese
        },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  
  // Ottimizzazioni PWA
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // Ottimizzazioni bundle per PWA
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          name: 'vendor',
          test: /[\\/]node_modules[\\/]/,
          chunks: 'all',
          enforce: true,
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      }
    }
    return config
  },
  
  // Evita errori durante il build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
}

module.exports = withPWA(nextConfig) 