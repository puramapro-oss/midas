import type { NextConfig } from "next";
import path from "node:path";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// @purama/retention + @purama/antifraud sont des packages locaux (file:../packages/*),
// hors du dossier de l'app — piège SMARANA (PIEGES.md 2026-08-23) : transpilePackages +
// externalDir + outputFileTracingRoot + turbopack.root + resolveAlias, sinon
// `Module not found` malgré un tsc propre (rencontré 9x sur les pilotes précédents).

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://auth.purama.dev http://72.62.191.111:8000 https://api.coingecko.com https://api.alternative.me https://cryptopanic.com https://api.stripe.com wss:; frame-src https://js.stripe.com" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@purama/smarana", "@purama/retention", "@purama/antifraud", "@purama/entraide"],
  experimental: {
    externalDir: true,
  },
  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: {
    root: path.join(__dirname, ".."),
    resolveAlias: {
      "@purama/retention": "../packages/purama-retention/src/index.ts",
      "@purama/antifraud": "../packages/purama-antifraud/src/index.ts",
      "@purama/entraide": "../packages/purama-entraide/src/index.ts",
    },
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'midas.vercel.app' }],
        destination: 'https://midas.purama.dev/:path*',
        permanent: true,
      },
      { source: '/signup', destination: '/register', permanent: true },
      { source: '/mentions-legales', destination: '/legal/mentions', permanent: true },
      { source: '/politique-confidentialite', destination: '/legal/privacy', permanent: true },
      { source: '/cgv', destination: '/legal/cgv', permanent: true },
      { source: '/cgu', destination: '/legal/cgu', permanent: true },
    ];
  },
  serverExternalPackages: ['ccxt'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
