/**
 * E2 toy CAS journal. Entries are content-addressed over canonical bytes
 * (the estate's own RFC 8785 encoder), appends are compare-and-swap on the
 * chain head, and the meaning fold over any prefix yields an epistemic
 * state whose digest is recorded beside the entry — so every head is a
 * checkable claim about what was understood at that point.
 */

import { encodeJsonValue, type JsonValue } from "../../packages/core/src/jcs.ts"

export const digest = (value: JsonValue): string => {
  const bytes = encodeJsonValue(value).bytes
  const hasher = new Bun.CryptoHasher("sha256")
  hasher.update(bytes)
  return hasher.digest("hex")
}

// ---------------------------------------------------------------- moves

export type Move =
  | { readonly kind: "fill"; readonly hole: string; readonly value: JsonValue; readonly by: string }
  | { readonly kind: "dispute"; readonly hole: string; readonly candidates: readonly JsonValue[]; readonly by: string }
  | { readonly kind: "decide"; readonly hole: string; readonly value: JsonValue; readonly by: string }

// ------------------------------------------------------ epistemic state

export type HoleState =
  | { readonly status: "open" }
  | { readonly status: "filled"; readonly value: JsonValue; readonly by: string }
  | { readonly status: "disputed"; readonly candidates: readonly JsonValue[] }
  | { readonly status: "decided"; readonly value: JsonValue; readonly by: string }

export type EpistemicState = { readonly holes: Record<string, HoleState> }

export const initialState = (holes: readonly string[]): EpistemicState => ({
  holes: Object.fromEntries(holes.map((h) => [h, { status: "open" as const }])),
})

/** Candidate sets are order-free: kept sorted by canonical-byte digest. */
const sortCandidates = (candidates: readonly JsonValue[]): readonly JsonValue[] =>
  [...candidates].sort((a, b) => digest(a).localeCompare(digest(b)))

/**
 * The meaning fold's step. Returns the next state, or a refusal when the
 * move is not admissible against this state (the caller must repair —
 * never silently clobber).
 */
export type StepResult =
  | { readonly ok: true; readonly state: EpistemicState }
  | { readonly ok: false; readonly refusal: string }

export const step = (state: EpistemicState, move: Move): StepResult => {
  const hole = state.holes[move.hole]
  if (hole === undefined) return { ok: false, refusal: `unknown hole ${move.hole}` }
  const put = (h: HoleState): EpistemicState => ({ holes: { ...state.holes, [move.hole]: h } })
  switch (move.kind) {
    case "fill":
      switch (hole.status) {
        case "open":
          return { ok: true, state: put({ status: "filled", value: move.value, by: move.by }) }
        case "filled":
          // Idempotent re-fill converges; a different value is a conflict
          // the caller must surface as a dispute, never a clobber.
          return digest(hole.value) === digest(move.value)
            ? { ok: true, state }
            : { ok: false, refusal: `conflict on ${move.hole}` }
        default:
          return { ok: false, refusal: `fill on ${hole.status} hole ${move.hole}` }
      }
    case "dispute": {
      if (hole.status === "decided") return { ok: false, refusal: `dispute after decision on ${move.hole}` }
      const existing = hole.status === "disputed" ? hole.candidates : hole.status === "filled" ? [hole.value] : []
      const merged = sortCandidates(
        [...existing, ...move.candidates].filter(
          (c, i, all) => all.findIndex((d) => digest(d) === digest(c)) === i,
        ),
      )
      return { ok: true, state: put({ status: "disputed", candidates: merged }) }
    }
    case "decide":
      if (hole.status !== "disputed") return { ok: false, refusal: `decide on ${hole.status} hole ${move.hole}` }
      return { ok: true, state: put({ status: "decided", value: move.value, by: move.by }) }
  }
}

// -------------------------------------------------------------- journal

export type Entry = {
  readonly prev: string
  readonly move: Move
  readonly stateDigest: string
}

export type AppendResult =
  | { readonly ok: true; readonly head: string; readonly state: EpistemicState }
  | { readonly ok: false; readonly refusal: "cas-conflict" | string; readonly head: string; readonly state: EpistemicState }

export class Journal {
  readonly entries: Entry[] = []
  #state: EpistemicState
  #head: string
  readonly #mode: "lawful" | "clobber"

  /** "clobber" is the NEGATIVE CONTROL: conflicting fills silently overwrite. */
  constructor(holes: readonly string[], mode: "lawful" | "clobber" = "lawful") {
    this.#state = initialState(holes)
    this.#head = digest({ genesis: this.stateDigest() })
    this.#mode = mode
  }

  head(): string {
    return this.#head
  }

  state(): EpistemicState {
    return this.#state
  }

  stateDigest(): string {
    return digest(this.#state as unknown as JsonValue)
  }

  /** CAS append: refuses on stale prev or inadmissible move. Atomic (one sync op). */
  append(expectedPrev: string, move: Move): AppendResult {
    if (expectedPrev !== this.#head)
      return { ok: false, refusal: "cas-conflict", head: this.#head, state: this.#state }
    let next = step(this.#state, move)
    if (!next.ok && this.#mode === "clobber" && move.kind === "fill" && next.refusal.startsWith("conflict")) {
      // The lawless world: last writer wins, no dispute, no fence.
      next = {
        ok: true,
        state: { holes: { ...this.#state.holes, [move.hole]: { status: "filled", value: move.value, by: move.by } } },
      }
    }
    if (!next.ok) return { ok: false, refusal: next.refusal, head: this.#head, state: this.#state }
    this.#state = next.state
    const entry: Entry = { prev: this.#head, move, stateDigest: digest(next.state as unknown as JsonValue) }
    this.#head = digest(entry as unknown as JsonValue)
    this.entries.push(entry)
    return { ok: true, head: this.#head, state: this.#state }
  }
}

/** Verify-on-read: refold the whole journal, checking every recorded digest. */
export const verifyJournal = (
  journal: Journal,
  holes: readonly string[],
): { readonly ok: boolean; readonly failures: readonly string[] } => {
  const failures: string[] = []
  let state = initialState(holes)
  let head = digest({ genesis: digest(state as unknown as JsonValue) })
  for (const [i, entry] of journal.entries.entries()) {
    if (entry.prev !== head) failures.push(`entry ${i}: prev mismatch`)
    const next = step(state, entry.move)
    if (!next.ok) {
      failures.push(`entry ${i}: inadmissible move in committed history (${next.refusal})`)
      break
    }
    state = next.state
    if (digest(state as unknown as JsonValue) !== entry.stateDigest)
      failures.push(`entry ${i}: state digest mismatch`)
    head = digest(entry as unknown as JsonValue)
  }
  if (head !== journal.head()) failures.push("final head mismatch")
  return { ok: failures.length === 0, failures }
}
