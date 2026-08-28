import { defineConfig } from "vitest/config";

// Both engines are in-process now (typescript + oxc-parser), so the suite
// needs no special pooling and no long timeouts. It used to spawn an
// `oxlint` process per recognition, which cost ~300ms of start-up each and
// dominated the sweeps in T3 and T4. The oxlint chassis is still the gate's
// production surface; the suite reaches the same engine directly.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 60_000,
  },
});
