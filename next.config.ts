import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' http://72.62.191.111:8000 https://api.coingecko.com https://api.alternative.me https://cryptopanic.com https://api.stripe.com wss:; frame-src https://js.stripe.com" },
];

const nextConfig: NextConfig = {
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
