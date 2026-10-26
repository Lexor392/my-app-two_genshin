import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/my-app-two_genshin/" : "/",
  plugins: [react({ include: /\.[jt]sx?$/ })],
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    restoreMocks: true,
  },
}));
