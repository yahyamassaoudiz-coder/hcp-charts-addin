import { defineConfig } from "vitest/config";

// v1.2: node environment (v1.1 asked for jsdom without installing it)
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/mocks/setup.js"],
    testTimeout: 30000
  }
});
