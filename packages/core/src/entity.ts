/**
 * The entity collector: entities folded live from a mixed event stream.
 *
 * An entity is ONE CLASS of a stream's quotient by correlation — one key's
 * subsequence, folded twice: the identity fold (a chain head over exactly
 * its events) and the meaning fold (its state). The collector maintains both
 * incrementally, O(1) per event, over ANY backing layer (the `Backing`
 * interface is the seam — memory here, SQLite/NATS-KV/whatever later; the
 * laws in test/entity.test.ts are backing-independent by construction and
 * checked against two implementations).
 *
 * Composition of entities (EC4): a parent entity whose events ARE its
 * children's anchors — `key=childHead` facts folded like any others. The
 * parent's head therefore commits to every child's exact history
 * transitively, while its state is just "which children, at which heads":
 * the entity-of-entities is ordinary, not special. Decompose = quotient by
 * correlation; compose = fold of anchors. Both directions are folds.
 */

import {
  extend,
  kvStep,
  stateDigest,
  streamSeed,
  type Head,
  type KVState,
  type StreamEvent,
} from "./stream.ts"

export interface EntityView {
  readonly key: string
  /** Identity fold: chain head over exactly this entity's events. */
  readonly head: Head
  /** Meaning fold: last-write-wins state over key=value payloads. */
  readonly state: KVState
  readonly events: number
}

/** Any backing layer: the minimal synchronous seam. */
export interface Backing {
  get(key: string): EntityView | undefined
  set(key: string, view: EntityView): void
  keys(): ReadonlyArray<string>
}

export const memoryBacking = (): Backing => {
  const m = new Map<string, EntityView>()
  return {
    get: (k) => m.get(k),
    set: (k, v) => void m.set(k, v),
    keys: () => [...m.keys()].sort(),
  }
}

export const entitySeed = (key: string): Head => streamSeed(`entity:${key}`)

const emptyView = (key: string): EntityView => ({
  key,
  head: entitySeed(key),
  state: { entries: new Map(), count: 0 },
  events: 0,
})

/**
 * The entity meaning-fold: delegates to the one walled `kvStep`. A payload
 * outside the walled domain (non-UTF-8, NUL key/value, count overflow) is
 * FORGIVEN as a meaning no-op — the identity fold (head) still commits to it,
 * so the chain remembers what meaning drops and `anchors()` stays total over
 * arbitrary bytes. The meaning fold has exactly one walled decoder, so
 * distinct payloads never collide onto one replacement character and no
 * NUL-bearing key can reach `stateDigest`.
 */
const applySync = (state: KVState, e: StreamEvent): KVState => kvStep(state, e) ?? state

export interface Collector {
  /** Fold one event into its entity: O(1), both folds extended. */
  ingest(e: StreamEvent): EntityView
  entity(key: string): EntityView | undefined
  /** Every entity's anchor, deterministically ordered. */
  anchors(): ReadonlyArray<{ key: string; head: Head; state: Head }>
}

/**
 * A collector over a backing layer. `correlate` induces the quotient: which
 * entity an event belongs to (for agent streams: session id, span id, tool
 * call id — any correlation key discipline).
 */
export const makeCollector = (
  backing: Backing,
  correlate: (e: StreamEvent) => string,
): Collector => ({
  ingest: (e) => {
    const key = correlate(e)
    const prev = backing.get(key) ?? emptyView(key)
    const next: EntityView = {
      key,
      head: extend(prev.head, e),
      state: applySync(prev.state, e),
      events: prev.events + 1,
    }
    backing.set(key, next)
    return next
  },
  entity: (key) => backing.get(key),
  anchors: () =>
    backing
      .keys()
      .map((key) => backing.get(key)!)
      .map((v) => ({ key: v.key, head: v.head, state: stateDigest(v.state) })),
})

/**
 * EC4 — composition: fold child anchors into a parent entity. The parent's
 * events are `childKey=childHead` facts on a synthetic stream, in the given
 * order (composition commits an order of children, exactly like a merge
 * fact commits an order of picks).
 */
export const composeEntities = (
  parentKey: string,
  children: ReadonlyArray<{ key: string; head: Head }>,
): EntityView => {
  let view = emptyView(parentKey)
  const enc = new TextEncoder()
  children.forEach((child, i) => {
    const e: StreamEvent = {
      stream: `entity:${parentKey}`,
      seq: i + 1,
      payload: enc.encode(`${child.key}=${child.head}`),
    }
    view = {
      key: parentKey,
      head: extend(view.head, e),
      state: applySync(view.state, e),
      events: view.events + 1,
    }
  })
  return view
}
