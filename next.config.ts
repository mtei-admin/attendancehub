import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  // Do not cache start URL HTML — / redirects by session/role.
  cacheStartUrl: false,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    // Replace defaults: static assets only; never cache portals/API/mutations.
    runtimeCaching: [
      {
        urlPattern: /\/api\/.*/i,
        handler: "NetworkOnly" as const,
      },
      {
        urlPattern: ({ request }: { request: Request }) => request.method !== "GET",
        handler: "NetworkOnly" as const,
      },
      {
        urlPattern: ({ url }: { url: URL }) => {
          const path = url.pathname;
          return (
            path.startsWith("/employee") ||
            path.startsWith("/manager") ||
            path.startsWith("/hr") ||
            path.startsWith("/admin") ||
            path.startsWith("/verification") ||
            path.startsWith("/login")
          );
        },
        handler: "NetworkOnly" as const,
      },
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst" as const,
        options: {
          cacheName: "next-static",
          expiration: {
            maxEntries: 128,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "CacheFirst" as const,
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst" as const,
        options: {
          cacheName: "google-fonts",
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
        },
      },
      {
        urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
        handler: "NetworkOnly" as const,
      },
    ],
  },
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);
