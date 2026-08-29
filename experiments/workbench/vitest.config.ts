import { defineConfig } from "vitest/config"

/**
 * Story and Scene both operate on VNodes, so neither needs a DOM. The
 * default `node` environment is the correct one: adding jsdom would buy
 * nothing and hide the fact that these tests never touch a browser.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
})
