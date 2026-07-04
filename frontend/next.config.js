/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },

  // Evita errori durante il build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // @napi-rs/canvas carica un binding nativo (.node) tramite dipendenza
  // opzionale per piattaforma: va escluso dal bundling del server, altrimenti
  // Turbopack/webpack non riescono a risolverlo e la route crasha all'import.
  serverExternalPackages: ['@napi-rs/canvas'],

  // Le route /api/card e /api/card-special leggono i template PNG e il font
  // Nebulax da public/ con path costruiti a runtime (es. `${template}.png`):
  // il tracciamento automatico dei file di Next non riesce a rilevarli e nel
  // bundle serverless di Netlify risulterebbero mancanti (500 in produzione).
  outputFileTracingIncludes: {
    '/api/card/\\[email\\]': ['./public/cards/**/*', './public/fonts/**/*'],
    '/api/card-special/\\[email\\]': ['./public/fonts/**/*'],
  },
}

module.exports = nextConfig; 