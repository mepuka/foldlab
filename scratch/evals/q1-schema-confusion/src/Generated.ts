/**
 * The committed artifacts, rendered from the declared source in one place so
 * that `generate`, `check`, and the negative control cannot drift apart.
 *
 * Law 9 (root `AGENTS.md`, "corpus artifacts are never scratch") requires
 * byte-identical regeneration and an executed negative control for anything
 * machine-generated. Round 1 committed these artifacts with neither, and the
 * repository gate claimed the harness's tests while being unable to install its
 * dependencies. Everything below is a pure function of the base projection and
 * the generated kernel corpus: no clock, no randomness, no filesystem order.
 *
 * @module
 */
import {
  deriveBattery,
  deriveLedger,
  ledgerCandidates,
  type LedgerEntry,
} from "./Battery.ts"
import type { KernelCorpus } from "./Corpus.ts"
import { makePrompt } from "./Prompt.ts"
import {
  projectToolDocument,
  Variants,
  type ToolDocument,
  type Variant,
} from "./Projection.ts"

export const GENERATE_COMMAND = "bun run generate"
export const BASE_PATH = "verify/kernel/projections/tools.schema.json"

export interface RenderInput {
  readonly base: ToolDocument
  readonly baseSha256: string
  readonly corpus: KernelCorpus
}

export interface Rendered {
  readonly files: ReadonlyMap<string, string>
  readonly ledger: readonly LedgerEntry[]
  readonly battery: ReturnType<typeof deriveBattery>
  readonly prompts: ReadonlyMap<Variant, string>
}

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`

const provenance = (input: RenderInput) => ({
  command: GENERATE_COMMAND,
  base: BASE_PATH,
  base_sha256: input.baseSha256,
  corpus: input.corpus.provenance.corpus,
  corpus_command: input.corpus.provenance.command,
})

export const schemaPath = (variant: Variant): string =>
  `generated/tools.${variant}.schema.json`

export const promptPath = (variant: Variant): string =>
  `generated/prompt.${variant}.json`

export const BATTERY_PATH = "generated/battery.json"

/**
 * Every committed artifact, keyed by its path relative to this harness's root.
 * The prompts are returned alongside so a run sends the same bytes the check
 * compares rather than a second rendering of them.
 */
export const renderGenerated = (input: RenderInput): Rendered => {
  const ledger = deriveLedger(input.base, input.corpus)
  const battery = deriveBattery(input.base, ledger)
  const candidates = ledgerCandidates(ledger)
  const files = new Map<string, string>()
  const prompts = new Map<Variant, string>()

  for (const variant of Variants) {
    const tools = projectToolDocument(input.base, variant)
    const prompt = makePrompt({ tools, tasks: battery, candidates })
    prompts.set(variant, prompt)
    files.set(schemaPath(variant), json({
      $provenance: provenance(input),
      ...tools,
    }))
    files.set(promptPath(variant), `${prompt}\n`)
  }

  files.set(BATTERY_PATH, json({
    $provenance: provenance(input),
    ledger,
    tasks: battery,
  }))

  return { files, ledger, battery, prompts }
}

export type CheckResult =
  | { readonly ok: true; readonly checked: number }
  | { readonly ok: false; readonly reason: string }

/**
 * Committed bytes against a fresh rendering. `committed` is read from disk by
 * the caller: comparing two renderings of the same expression would be
 * vacuously green, which is the failure mode this arm exists to avoid.
 */
export const compareGenerated = (
  committed: ReadonlyMap<string, string | null>,
  rendered: ReadonlyMap<string, string>,
): CheckResult => {
  for (const [path, expected] of rendered) {
    const actual = committed.get(path)
    if (actual === undefined || actual === null) {
      return { ok: false, reason: `${path} is missing from the working tree` }
    }
    if (actual !== expected) {
      return { ok: false, reason: `${path} is not byte-identical to its regeneration` }
    }
  }

  for (const path of committed.keys()) {
    if (!rendered.has(path)) {
      return { ok: false, reason: `${path} is committed and no longer generated` }
    }
  }

  return { ok: true, checked: rendered.size }
}
