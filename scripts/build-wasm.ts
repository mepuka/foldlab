/**
 * Builds the wasm face of the transform wall into dist/ (gitignored):
 * go/cmd/wasmwall compiled GOOS=js GOARCH=wasm, plus the matching
 * wasm_exec.js loader from the local Go toolchain. test/wasm.wall.test.ts
 * auto-skips until this has run.
 *
 *   bun run build:wasm
 */

import { $ } from "bun"
import { mkdirSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const dist = join(root, "dist")
mkdirSync(dist, { recursive: true })

const goroot = (await $`go env GOROOT`.text()).trim()

await $`go build -o ${join(dist, "stream.wasm")} ./cmd/wasmwall`
  .cwd(join(root, "go"))
  .env({ ...process.env, GOOS: "js", GOARCH: "wasm" })

// go >= 1.24 ships the loader at lib/wasm; earlier at misc/wasm.
const loader = await Bun.file(join(goroot, "lib", "wasm", "wasm_exec.js")).exists()
  ? join(goroot, "lib", "wasm", "wasm_exec.js")
  : join(goroot, "misc", "wasm", "wasm_exec.js")
await Bun.write(join(dist, "wasm_exec.js"), Bun.file(loader))

console.log("dist/stream.wasm + dist/wasm_exec.js built")
