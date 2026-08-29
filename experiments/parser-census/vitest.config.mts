import { defineConfig } from "vitest/config";

// Both legs are in-process (typescript + oxc-parser), so the suite needs no
// pooling and no long timeouts. Nothing here touches the gitignored corpus:
// the suite tests the INSTRUMENT against sources it writes itself, so it is
// green on a host that has never seen corpus/.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
