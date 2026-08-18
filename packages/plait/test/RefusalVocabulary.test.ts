import { describe, expect, test } from "bun:test"
import { resolve } from "node:path"

import { KERNEL_RUNTIME_STRUCTURAL_REFUSALS } from "../src/kernel/KernelTables.generated.js"
import { StructuralRefusalKind } from "../src/truth/Refusal.js"
import {
  REFUSAL_VOCABULARY_PATHS,
  RUNTIME_REFUSAL_WAIVER_TICKET,
  checkProjectionAncestry,
  checkRefusalVocabulary,
  checkRuntimeUnionWiring,
  readCorpusRefusalReasons,
  readRuntimeRefusalKinds,
  readStagedDebtPin,
  type RefusalVocabularyEvidence,
} from "../scripts/refusal-vocabulary.js"

const repository = resolve(import.meta.dir, "../../..")
const read = (path: string): Promise<string> => Bun.file(resolve(repository, path)).text()

const evidence = async (): Promise<RefusalVocabularyEvidence> => ({
  runtimeKinds: readRuntimeRefusalKinds(
    await read(REFUSAL_VOCABULARY_PATHS.runtimeUnion),
    REFUSAL_VOCABULARY_PATHS.runtimeUnion,
  ),
  corpusReasons: readCorpusRefusalReasons(
    await read(REFUSAL_VOCABULARY_PATHS.corpusFixture),
    REFUSAL_VOCABULARY_PATHS.corpusFixture,
  ),
  waivers: readStagedDebtPin(
    await read(REFUSAL_VOCABULARY_PATHS.stagedDebtPin),
    REFUSAL_VOCABULARY_PATHS.stagedDebtPin,
  ),
  waiverTicket: RUNTIME_REFUSAL_WAIVER_TICKET,
})

describe("the refusal vocabulary", () => {
  test("every minted kind is corpus-backed or pinned staged debt", async () => {
    expect(checkRefusalVocabulary(await evidence()).ok).toBe(true)
  })

  test("the module the minting sites import takes its union from the generated roster", async () => {
    expect(checkRuntimeUnionWiring(
      await read(REFUSAL_VOCABULARY_PATHS.refusalModule),
      REFUSAL_VOCABULARY_PATHS.refusalModule,
      "./RefusalKinds.generated.js",
    ).ok).toBe(true)
  })

  test("the roster read from source bytes is the union the schema ships", async () => {
    const base = await evidence()
    expect([...base.runtimeKinds]).toEqual([...StructuralRefusalKind.literals])
  })

  test("the kernel table's ancestry rows agree with the corpus fixture's bytes", async () => {
    expect(checkProjectionAncestry(
      KERNEL_RUNTIME_STRUCTURAL_REFUSALS,
      await evidence(),
    ).ok).toBe(true)
  })

  test("a kind with no corpus row and no pin is refused", async () => {
    const base = await evidence()
    expect(checkRefusalVocabulary({
      ...base,
      runtimeKinds: [...base.runtimeKinds, "hand-minted-refusal"],
    })).toEqual({
      ok: false,
      reason:
        "runtime structural refusal kind \"hand-minted-refusal\" is neither a kernel corpus"
        + " refusal reason nor a pinned DEV-804 staged-debt waiver",
    })
  })

  test("a waiver citing another ticket is refused", async () => {
    const base = await evidence()
    const first = base.waivers[0]!
    expect(checkRefusalVocabulary({
      ...base,
      waivers: [{ kind: first.kind, ticket: "DEV-000" }, ...base.waivers.slice(1)],
    })).toEqual({
      ok: false,
      reason:
        `staged-debt waiver for ${JSON.stringify(first.kind)} cites "DEV-000"`
        + " rather than \"DEV-804\"",
    })
  })

  test("a waiver the corpus has since covered is refused as stale", async () => {
    const base = await evidence()
    const first = base.waivers[0]!
    expect(checkRefusalVocabulary({
      ...base,
      corpusReasons: [...base.corpusReasons, first.kind],
    })).toEqual({
      ok: false,
      reason:
        `staged-debt waiver for ${JSON.stringify(first.kind)} is stale: the kernel corpus`
        + " now carries that refusal reason",
    })
  })

  test("a waiver naming a kind nothing mints is refused", async () => {
    const base = await evidence()
    expect(checkRefusalVocabulary({
      ...base,
      waivers: [...base.waivers, { kind: "retired-refusal", ticket: RUNTIME_REFUSAL_WAIVER_TICKET }],
    })).toEqual({
      ok: false,
      reason:
        "staged-debt waiver names \"retired-refusal\", which the runtime structural"
        + " refusal union does not mint",
    })
  })

  test("a kernel table row that disagrees with the corpus fixture is refused", async () => {
    const base = await evidence()
    const [first, ...rest] = KERNEL_RUNTIME_STRUCTURAL_REFUSALS
    expect(checkProjectionAncestry(
      [{ kind: first.kind, source: "kernel-corpus" }, ...rest],
      base,
    )).toEqual({
      ok: false,
      reason:
        `the kernel table records ${JSON.stringify(first.kind)} as "kernel-corpus" while the`
        + " corpus fixture says \"staged-debt\"",
    })
  })
})
