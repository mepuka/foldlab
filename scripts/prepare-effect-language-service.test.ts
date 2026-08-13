import { describe, expect, it } from "bun:test"
import { prepareEffectLanguageService } from "./prepare-effect-language-service"

describe("Effect language-service bootstrap", () => {
  it("lets installation finish when dependencies are not linked yet", () => {
    const messages: Array<string> = []
    let ran = false

    const exitCode = prepareEffectLanguageService(
      { cliPath: "missing-cli.js", required: false },
      {
        exists: () => false,
        run: () => {
          ran = true
          return 0
        },
        info: (message) => messages.push(message),
        error: () => undefined,
      },
    )

    expect(exitCode).toBe(0)
    expect(ran).toBe(false)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain("patch deferred")
  })

  it("refuses a typecheck when the patch dependency is unavailable", () => {
    const errors: Array<string> = []

    const exitCode = prepareEffectLanguageService(
      { cliPath: "missing-cli.js", required: true },
      {
        exists: () => false,
        run: () => 0,
        info: () => undefined,
        error: (message) => errors.push(message),
      },
    )

    expect(exitCode).toBe(1)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain("patch deferred")
  })

  it("runs the installed CLI and preserves its verdict", () => {
    const invoked: Array<string> = []

    const exitCode = prepareEffectLanguageService(
      { cliPath: "installed-cli.js", required: false },
      {
        exists: () => true,
        run: (path) => {
          invoked.push(path)
          return 23
        },
        info: () => undefined,
        error: () => undefined,
      },
    )

    expect(exitCode).toBe(23)
    expect(invoked).toEqual(["installed-cli.js"])
  })
})
