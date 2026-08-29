import { defineConfig } from "vitest/config"

// Scoped to `test/oxc-*.test.ts` ON PURPOSE. `test/extract.test.ts` is the
// compiler-API leg's own suite and is written against `bun:test`; running it under
// vitest would fail on the import, and rewriting it is a change to the lane's oldest
// trusted component for no gate benefit. Two runners, two suites, one `check` task
// that runs both — see the root `check:extract-oxc`.
export default defineConfig({
  test: {
    include: ["test/oxc-*.test.ts"],
    testTimeout: 60_000
  }
})
