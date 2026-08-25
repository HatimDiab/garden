import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

// Kept on the app rather than only on the Traefik router, so the plain-HTTP
// `make start` path on the LAN is covered too — a reverse proxy is not always
// in front of this.
//
// `'unsafe-inline'` on style-src is required by Next's inlined critical CSS and
// by next/font. Scripts need `'unsafe-inline'` for the bootstrap script and
// `'unsafe-eval'` only in dev, where React refresh uses it.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
  }`,
  "connect-src 'self'",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Don't advertise the framework version to anyone scanning the host.
  poweredByHeader: false,
  images: {
    formats: ["image/webp"],
    remotePatterns: [],
    localPatterns: [
      { pathname: "/uploads/**" },
      { pathname: "/art/**" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Admin pages must never be cached by an intermediary.
        source: "/:lang/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
