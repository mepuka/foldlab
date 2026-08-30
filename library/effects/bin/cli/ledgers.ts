/**
 * The emitted ledgers, read at runtime.
 *
 * Four documents land in this estate from Lean emitters, and until now
 * every one of them was reachable only through a `mise` or `lake` gate:
 * agent-readable JSON with no runtime reader (CLI audit §1). This
 * module is that reader, and `cas doctor` is its consumer.
 *
 * ## What is read, and what is NOT
 *
 * Only counters and headline facts — the numbers each emitter already
 * computed and wrote down. Nothing here re-derives a count, re-judges a
 * row, or restates a proof: a ledger says what it says, and this verb's
 * job is to say it out loud.
 *
 * Each ledger is read through a SCHEMA of exactly the fields `doctor`
 * reports, and no more. The structs are open, so an emitter is free to
 * grow a field without this reader noticing, and every field this
 * reader does want is optional, so an emitter is free to drop one
 * without the whole checkup refusing — `doctor` prints a dash for a
 * counter that was not there. What a schema still catches is a field
 * that has changed SHAPE, and that is exactly the drift worth hearing
 * about: it comes back as `unreadable`, naming the file.
 *
 * ## Where they live
 *
 * In the REPOSITORY, not in the store. A store is a directory of bytes
 * and can sit anywhere; the ledgers are the lab's paperwork about the
 * language the store speaks. So they are found by walking up for the
 * repository layout, and a store outside a checkout simply has none —
 * which `doctor` says, rather than reporting zeros.
 */
import { Effect, FileSystem, Option, Path, Schema } from "effect"

/** A counter an emitter may or may not have written. Absent is a real
 * answer here and is kept distinct from zero all the way to the
 * rendering — a ledger that did not say must never read as a ledger
 * that said none. */
const count = Schema.optionalKey(Schema.Finite)

/** A list of names an emitter may or may not have written. */
const names = Schema.optionalKey(Schema.Array(Schema.String))

/** A list whose LENGTH is the fact, not its contents. The members are
 * left undescribed on purpose: this reader counts rows, and describing
 * their shape would be this package taking on an emitter's schema it
 * has no use for. */
const rows = Schema.optionalKey(Schema.Array(Schema.Unknown))

/**
 * `docs/lab-core/ENVIRONMENT.json` — which Lean toolchains this estate
 * pins, how many gates are held out of the gate set, and how big the
 * task and executable tables are.
 */
export const EnvironmentLedger = Schema.Struct({
  distinctPins: names,
  excludedGates: names,
  leanExes: rows,
  tasks: rows,
})

/**
 * `library/cas/surface/cas-laws.json` — how many rulings the library
 * states, and how many are bound to an enforcing declaration rather
 * than owed.
 */
export const LawLedger = Schema.Struct({
  counters: Schema.optionalKey(Schema.Struct({
    bound: count,
    owed: count,
    rulings: count,
    superseded: count,
  })),
})

/**
 * `library/cas/surface/cas-obligations.json` — what the proof effort
 * has discharged, and what it still owes.
 */
export const ObligationLedger = Schema.Struct({
  counters: Schema.optionalKey(Schema.Struct({
    discharged: count,
    owed: count,
    parked: count,
    pinPending: count,
  })),
})

/**
 * `library/cas/conformance/admission-map.json` — of the carrier's rows,
 * how many this estate admits, defers, and rejects.
 */
export const AdmissionLedger = Schema.Struct({
  counts: Schema.optionalKey(Schema.Struct({
    admitted: count,
    deferred: count,
    rejected: count,
    rows: count,
  })),
})

export type EnvironmentLedger = typeof EnvironmentLedger.Type
export type LawLedger = typeof LawLedger.Type
export type ObligationLedger = typeof ObligationLedger.Type
export type AdmissionLedger = typeof AdmissionLedger.Type

/** The four ledgers: where each lives relative to the repository root,
 * and the schema it is read through. The paths are the ones the audit
 * and `ENVIRONMENT.json` itself name. */
export const ledgers = {
  admissionMap: {
    path: "library/cas/conformance/admission-map.json",
    schema: AdmissionLedger,
  },
  environment: {
    path: "docs/lab-core/ENVIRONMENT.json",
    schema: EnvironmentLedger,
  },
  laws: {
    path: "library/cas/surface/cas-laws.json",
    schema: LawLedger,
  },
  obligations: {
    path: "library/cas/surface/cas-obligations.json",
    schema: ObligationLedger,
  },
}

/** The directory a ledger path is resolved against — how the lab is
 * recognized from inside it. `library/cas/surface` is the marker
 * because it is the directory the surface emitters write into, so a
 * checkout that has it is a checkout that can have ledgers at all. */
const labMarker = "library/cas/surface"

/** Find the repository the ledgers live in: the nearest ancestor of a
 * starting directory that carries the lab's layout. Answers none when
 * there is no such ancestor — a store outside a checkout. */
export const findLabRoot = (
  start: string,
): Effect.Effect<Option.Option<string>, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    let current = path.resolve(start)
    for (;;) {
      const marked = yield* fs.exists(path.join(current, labMarker)).pipe(
        Effect.orElseSucceed(() => false),
      )
      if (marked) return Option.some(current)
      const parent = path.dirname(current)
      if (parent === current) return Option.none()
      current = parent
    }
  })

/**
 * How a ledger answered.
 *
 * The three states stay apart because they call for different repairs:
 * an emitter that has not run is `absent`, one whose output no longer
 * decodes is `unreadable` and names why, and one that answered is
 * `read` and carries its facts. A checkup that blurred them into a
 * missing number would be no use to the person holding it.
 */
export type LedgerRead<A> =
  | { readonly _tag: "read"; readonly path: string; readonly facts: A }
  | { readonly _tag: "absent"; readonly path: string }
  | { readonly _tag: "unreadable"; readonly path: string; readonly reason: string }

/** The three answers, as constructors — so each is built once, by
 * name, and the union's tags are never spelled inline. */
const wasRead = <A>(path: string, facts: A): LedgerRead<A> => ({ _tag: "read", facts, path })
const wasAbsent = <A>(path: string): LedgerRead<A> => ({ _tag: "absent", path })
const wasUnreadable = <A>(path: string, reason: string): LedgerRead<A> => ({
  _tag: "unreadable",
  path,
  reason,
})

/** Read one ledger under a lab root, through its own schema. Never
 * fails: an unreadable ledger is a finding to report, not a reason to
 * refuse the checkup. */
export const readLedger = <A>(
  labRoot: string,
  ledger: { readonly path: string; readonly schema: Schema.Codec<A, unknown, never, never> },
): Effect.Effect<LedgerRead<A>, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const full = path.join(labRoot, ledger.path)
    const raw = yield* fs.readFileString(full).pipe(
      Effect.asSome,
      Effect.orElseSucceed(() => Option.none<string>()),
    )
    if (Option.isNone(raw)) return wasAbsent<A>(full)
    // The described JSON codec, not the global parser: nothing in this
    // estate spells JSON itself, and the schema is what turns the text
    // into the handful of fields this reader actually reports.
    return yield* Schema.decodeUnknownEffect(
      Schema.fromJsonString(ledger.schema),
    )(raw.value).pipe(
      Effect.map((facts) => wasRead(full, facts)),
      Effect.orElseSucceed(() =>
        wasUnreadable<A>(full, "the file no longer reads as the ledger this build expects")
      ),
    )
  })

/** A counter as `doctor` states it: the number an emitter wrote, or
 * absent. `undefined` is turned into `null` here rather than at every
 * rendering, so the machine register never carries a missing key where
 * a stated absence belongs. */
export const stated = (value: number | undefined): number | null => value ?? null
