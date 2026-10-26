import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  // GitHub project pages live under a repository path. Cloudflare Pages and custom
  // domains serve the app at the hostname root.
  base: command !== "build" || process.env.CF_PAGES || process.env.VITE_PUBLIC_SITE_URL
    ? "/"
    : "/my-app-two_genshin/",
  plugins: [react({ include: /\.[jt]sx?$/ })],
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    restoreMocks: true,
  },
}));
