/** @type {import('next').NextConfig} */

const ContentSecurityPolicy = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for __NEXT_DATA__ and hydration scripts
  "script-src 'self' 'unsafe-inline'",
  // Tailwind utility classes may be applied as inline styles
  "style-src 'self' 'unsafe-inline'",
  // Inter font is bundled locally at build time via next/font/google
  "font-src 'self'",
  // QR code library (qrcode.react) may render as blob/data URI
  "img-src 'self' data: blob:",
  // All API calls are same-origin; also covers WebSocket for dev HMR
  "connect-src 'self'",
  // Clipboard API used for copy-link button
  "worker-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy',   value: ContentSecurityPolicy },
  // Redundant with frame-ancestors but needed for older browsers
  { key: 'X-Frame-Options',           value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  // Limit referrer information on cross-origin requests
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  // Allow clipboard-write (copy-link button), block everything else
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=(), clipboard-write=(self)' },
];

const nextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
