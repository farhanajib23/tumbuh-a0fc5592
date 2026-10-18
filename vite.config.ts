// Pembungkus ini sudah menyediakan plugin React, TanStack Start, Tailwind, dan Nitro.
// Jangan menambahkan plugin yang sama dua kali.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const pagesBuild = process.env.TUMBUH_PAGES === "true";

export default defineConfig({
  vite: {
    base: pagesBuild ? "/tumbuh-a0fc5592/" : "/",
  },
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      enabled: true,
      autoSubfolderIndex: true,
      autoStaticPathsDiscovery: true,
      crawlLinks: true,
      concurrency: 2,
      failOnError: true,
    },
  },
});
