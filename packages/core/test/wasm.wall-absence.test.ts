import { expect, test } from "bun:test"
import { join } from "node:path"
import { tmpdir } from "node:os"

const root = join(import.meta.dir, "../../..")
const wall = join(import.meta.dir, "wasm.wall.test.ts")
const missingDist = join(tmpdir(), `foldlab-wasm-wall-missing-${process.pid}`)
const expected = "WASM WALL UNBUILT: dist/stream.wasm or dist/wasm_exec.js is missing"

const run = (command: ReadonlyArray<string>, strict: boolean) => {
  const env: Record<string, string | undefined> = {
    ...process.env,
    FOLDLAB_WASM_DIST_DIR: missingDist,
  }
  delete env["FOLDLAB_REQUIRE_WASM"]
  if (strict) env["FOLDLAB_REQUIRE_WASM"] = "1"

  const result = Bun.spawnSync({
    cmd: [...command],
    cwd: root,
    env,
    stdout: "pipe",
    stderr: "pipe",
  })
  return {
    exitCode: result.exitCode,
    output: new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr),
  }
}

test("the strict wall refuses when its built artifacts are absent", () => {
  const result = run([process.execPath, "test", wall], true)

  expect(result.exitCode).not.toBe(0)
  expect(result.output).toContain(expected)
})

test("the public WASM gate refuses when its built artifacts are absent", () => {
  const result = run([process.execPath, "run", "test:wasm"], false)

  expect(result.exitCode).not.toBe(0)
  expect(result.output).toContain(expected)
})
