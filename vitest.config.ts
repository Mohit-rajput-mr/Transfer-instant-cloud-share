import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests for pure logic (src/**/*.test.ts). Run: npm test. Part of npm run check and of CI (.github/workflows/check.yml).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
