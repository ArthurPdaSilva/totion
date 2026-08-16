import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    exclude: ["tests/e2e/**", "node_modules/**"],
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
  },
});
