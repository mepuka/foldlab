/**
 * The storage seam: where entries actually sit, and the only place in this
 * package that knows.
 *
 * Five verbs, and each one is load-bearing for exactly one caller. `read` and
 * `write` are the memo the fold-through service runs on. `snapshot` is what a
 * peer is offered. `stats` and `drop` are the economic seam — the only pair
 * eviction is allowed to touch, and they carry sizes and ages, never bytes.
 *
 * The seam is real, not hypothetical: two adapters are named here — the
 * in-memory one the laws run against, and the journal-backed one that is
 * declared with its Layer signature and not built. What varies across it is
 * where the bytes live and nothing else, because an entry is content-keyed and
 * immutable: a store cannot make an entry wrong, only absent or slow.
 */

import { Context, Clock, Effect, Layer, Ref } from "effect"
import { readEntry } from "./entry.ts"
import {
  backingUnavailable,
  corruptEntry,
  type BackingUnavailable,
  type CorruptEntry,
} from "./refusal.ts"

/**
 * Everything a store holds, as one value: keys to canonical bytes. This is the
 * unit of federation — what one node offers another — and it is a set, not a
 * log, because entries have no order among themselves.
 */
export type Snapshot = ReadonlyMap<string, string>

/**
 * What an eviction policy is allowed to see about an entry: its name, how many
 * bytes it occupies, and when this node first stored it. No value, no fold, no
 * history. The absence of a byte field here is the type-level half of the claim
 * that eviction cannot affect correctness — the other half is that `select`
 * returns keys.
 *
 * `storedAtMillis` is local bookkeeping, not part of the entry: the same entry
 * on two nodes has two different values for it, and neither is more right, which
 * is exactly why it cannot be allowed anywhere near a key.
 */
export interface KeyStat {
  readonly key: string
  readonly size: number
  readonly storedAtMillis: number
}

export interface BackingShape {
  /** The bytes stored under a key, or `undefined` for a key never stored. */
  readonly read: (key: string) => Effect.Effect<string | undefined, BackingUnavailable>
  /**
   * Files bytes under a key.
   *
   * Writing the identical bytes twice is not a conflict and succeeds — that is
   * idempotence, and it is what lets merge be nothing but repeated write.
   * Writing different bytes under a key that already has some is refused as
   * `CorruptEntry`, never resolved: one name means one result, so a
   * disagreement is evidence, not a decision to be made.
   */
  readonly write: (
    key: string,
    bytes: string,
  ) => Effect.Effect<void, BackingUnavailable | CorruptEntry>
  /** Everything held, for offering to a peer. */
  readonly snapshot: Effect.Effect<Snapshot, BackingUnavailable>
  /** Sizes and ages, for the eviction seam. Never bytes. */
  readonly stats: Effect.Effect<ReadonlyArray<KeyStat>, BackingUnavailable>
  /** Forgets the named keys and reports how many were held. Absence is legal. */
  readonly drop: (keys: ReadonlySet<string>) => Effect.Effect<number, BackingUnavailable>
}

export class Backing extends Context.Service<Backing, BackingShape>()(
  "@foldlab/cache/Backing",
) {}

interface StoredEntry {
  readonly bytes: string
  readonly storedAtMillis: number
}

const makeInMemory = Effect.gen(function*() {
  const entries = yield* Ref.make(new Map<string, StoredEntry>())
  const shape: BackingShape = {
    read: (key) => Effect.map(Ref.get(entries), (held) => held.get(key)?.bytes),
    write: (key, bytes) =>
      Effect.gen(function*() {
        const held = yield* Ref.get(entries)
        const existing = held.get(key)
        if (existing !== undefined) {
          // Rewriting the same bytes is the idempotent case, and it is the
          // common one under federation: two peers holding the same correct
          // entry offer it to each other forever.
          return existing.bytes === bytes ? undefined : yield* Effect.fail(corruptEntry(
            key,
            "key-collision",
            "the key already names different canonical bytes",
          ))
        }
        // Only the local clock is consulted, and only for the economic seam.
        const storedAtMillis = yield* Clock.currentTimeMillis
        yield* Ref.update(entries, (current) => {
          const next = new Map(current)
          next.set(key, { bytes, storedAtMillis })
          return next
        })
        return undefined
      }),
    snapshot: Effect.map(
      Ref.get(entries),
      (held) => new Map([...held].map(([key, entry]) => [key, entry.bytes] as const)),
    ),
    stats: Effect.map(
      Ref.get(entries),
      (held) =>
        [...held].map(([key, entry]) => ({
          key,
          size: entry.bytes.length,
          storedAtMillis: entry.storedAtMillis,
        })),
    ),
    drop: (keys) =>
      Ref.modify(entries, (current) => {
        const next = new Map(current)
        let dropped = 0
        for (const key of keys) {
          if (next.delete(key)) dropped++
        }
        return [dropped, next]
      }),
  }
  return shape
})

/**
 * The store the laws run against: one process, one map, no IO.
 *
 * It is not a toy standing in for the real thing. Because entries are
 * content-keyed and immutable, this adapter and a durable one differ in what
 * survives a restart and in nothing else — there is no consistency model to get
 * wrong, no invalidation to miss, and no ordering to preserve. That is why the
 * semilattice laws proved here transfer to any backing that can store a string
 * under a key.
 */
export const BackingInMemory: Layer.Layer<Backing> = Layer.effect(Backing)(makeInMemory)

/**
 * What a durable backing needs to be told. The bucket is a name in the journal
 * substrate; nothing here interprets it.
 */
export interface JournalKvConfig {
  readonly bucket: string
  readonly url: string
}

/**
 * The durable adapter, declared and not built.
 *
 * The signature is the deliverable: it produces the same `Backing` service and
 * differs only by admitting `BackingUnavailable` while the layer is being
 * built, because a store on the other side of a network can fail to open and a
 * map cannot. Everything above this line is unchanged by wiring it — no caller
 * of `runCached` learns that its entries became durable.
 *
 * It refuses at construction until the daemon seam that owns broker access
 * exists. Standing law for this package: no broker comes up inside `bun test`,
 * so this adapter is never the one the laws run against.
 */
export const BackingJournalKv = (
  config: JournalKvConfig,
): Layer.Layer<Backing, BackingUnavailable> =>
  Layer.effect(Backing)(Effect.fail(backingUnavailable(
    `the journal-backed cache store is declared, not built (bucket ${config.bucket} at ${config.url}); ` +
      "durable entries wait on the daemon seam that owns broker access",
  )))

/**
 * Files a peer's entries, one at a time, through the same `write` a local fold
 * result goes through — so a peer's bytes are checked exactly as strictly as
 * our own, and a peer cannot install an entry by a path we do not audit.
 *
 * Returns how many entries the store did not already hold. That count is the
 * only thing a merge produces, and it is monotone: absorbing the same snapshot
 * twice reports zero the second time.
 */
export const absorb = (
  backing: BackingShape,
  remote: Snapshot,
): Effect.Effect<number, BackingUnavailable | CorruptEntry> =>
  Effect.gen(function*() {
    let absorbed = 0
    for (const [key, bytes] of remote) {
      const checked = readEntry(key, bytes)
      if (!checked.ok) return yield* Effect.fail(checked.refusal)
      const held = yield* backing.read(key)
      if (held === bytes) continue
      yield* backing.write(key, bytes)
      absorbed++
    }
    return absorbed
  })
