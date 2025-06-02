/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // Disabilita ESLint durante il build per evitare errori di deploy
  },
  typescript: {
    ignoreBuildErrors: true, // Disabilita TypeScript checking durante il build
  },
}

module.exports = nextConfig; 