import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @whiskeysockets/baileys (WhatsApp notifications) pulls in `ws`, which
  // uses native Node bindings for WebSocket frame masking. Left to Next's
  // default Server Components bundling, webpack rewrites `ws` through its
  // browser-safe shims and breaks that native path — the connection opens
  // but immediately closes with "bufferUtil.mask is not a function".
  // Excluding both from bundling makes Next `require()` them natively at
  // runtime instead, which is what a WebSocket client needs.
  serverExternalPackages: ["@whiskeysockets/baileys", "ws"],

  // The seeded SQLite file has to travel with the server bundle: on a hosted
  // deployment it is copied into /tmp at first use (see src/db/bootstrap.ts),
  // and without this Next traces it away as an unused file.
  outputFileTracingIncludes: {
    "/**": ["./local.db"],
  },
};

export default nextConfig;
