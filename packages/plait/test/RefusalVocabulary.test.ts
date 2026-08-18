import { describe, expect, test } from "bun:test"

import { KERNEL_REFUSAL_VOCABULARY } from "../src/kernel/KernelTables.generated.js"
import { StructuralRefusalKind } from "../src/truth/Refusal.js"
import { checkRefusalVocabulary } from "../scripts/refusal-vocabulary.js"

describe("the refusal vocabulary", () => {
  test("the runtime structural union is contained by the generated kernel table", () => {
    expect(
      checkRefusalVocabulary(StructuralRefusalKind.literals, KERNEL_REFUSAL_VOCABULARY),
    ).toEqual({ ok: true })
  })
})
