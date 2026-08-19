/**
 * Plane: internal — private adapters, housed flat.
 * Seam: truth — the vocabulary every sentence speaks.
 *
 * @module
 */
import { Effect } from "effect"

import type { WireValue } from "../truth/Canonical.js"
import { digestOf, type Digest } from "../truth/Digest.js"
import { structuralRefusal, type Next, type Refusal } from "../truth/Refusal.js"

/**
 * The substrate writ: what one connection may do at the substrate, DECLARED.
 *
 * Group 3 of the substrate session has always carried a writ digest, and until
 * now that digest was `null` because no writ existed to name. This module is
 * the value the digest names. A connection no longer acts under an unnamed
 * authority: the layer that opens it declares the writ, the writ's own bytes
 * are its name, and the session fact carries that name — so "what was this
 * connection allowed to do" is a resolve rather than an inference from the
 * connection's nickname.
 *
 * **The writ is a declaration, not a guard, and this bound is load-bearing.**
 * Nothing here enforces anything. Enforcement at the substrate is the
 * substrate's: the NATS account ACLs the carrier-permission projection derives
 * are what actually refuses a publish, and they are provisioned by the daemon
 * that owns the credentials. A writ that disagreed with those ACLs would be a
 * WRONG DECLARATION and would change no runtime behaviour — which is the same
 * failure posture the connect-options declaration takes, and it is the one to
 * prefer, because the other posture changes what the estate may do by editing a
 * table. The estate's read-plane writ (`planes/Session.ts`) takes the identical
 * stance: the holder it names is attribution, never authority.
 *
 * **Its content is the carrier-permission projection's, gated rather than
 * imported.** Every family below is exactly what `internal/permissions.ts`
 * grants the named roles, read out of that projection under a scope whose free
 * coordinates are brace-wrapped names — so `flb.fab.ev.{lane}.*` is the family
 * and the deployment binds the coordinate. The projection is NOT imported here:
 * it sits at the carriage seam and this module sits at truth, and a truth
 * module importing carriage is the one edge the layering law refuses. The wall
 * closes that gap by deriving the same rows from the projection and comparing
 * them byte for byte, so the two cannot drift undetected; what is lost against
 * a direct import is that the drift is caught by the battery rather than by the
 * type checker, and that is stated rather than hidden.
 *
 * **Under-declaration is real and is named.** The projection declares roles for
 * the estate's publishing and key-value carriers only; it declares none for a
 * consuming connection, and none for the chaos harness or the CLI's head probe.
 * Those two layers therefore hold the LEAST writ — no role, no family — which
 * is the same shape as the read plane's empty writ and is honest: the estate
 * has declared no substrate authority for them. It is not a claim that they
 * reach nothing. Inventing a role to cover the gap would put a word in the
 * security projection's mouth that the projection never said.
 */

/** One connection's declared authority at the substrate, named by its bytes. */
export interface SubstrateWrit {
  readonly v: 0
  readonly kind: "substrate-writ"
  /** The service layer this writ is declared for; attribution, never authority. */
  readonly holder: string
  /** The carrier roles the layer acts as, in the projection's own vocabulary. */
  readonly roles: ReadonlyArray<string>
  /** The subject families the roles may publish to, coordinates unbound. */
  readonly publish: ReadonlyArray<string>
  /** The subject families the roles may subscribe to, coordinates unbound. */
  readonly subscribe: ReadonlyArray<string>
}

/** One declared writ and the digest that names it. */
export interface DeclaredSubstrateWrit {
  readonly declaration: SubstrateWrit
  readonly digest: Digest
}

/** One row of the per-layer writ table. */
export interface LayerWrit {
  /** The connection name the spine passes for this layer, verbatim. */
  readonly layer: string
  readonly roles: ReadonlyArray<string>
  readonly publish: ReadonlyArray<string>
  readonly subscribe: ReadonlyArray<string>
}

/**
 * Every layer the spine opens a connection for, with the writ it acts under.
 *
 * The key is the layer's OWN name — the default connection name the acquire
 * site passes — and not the caller's connection nickname. A caller that renames
 * its connection has renamed a connection, not changed what the layer may do,
 * so the writ is unmoved by the rename and the session fact carries both: the
 * nickname in `layer`, the authority in `writ`.
 *
 * The table is total over the spine's acquire sites and a layer absent from it
 * refuses, which is the fence: a further acquire site cannot open a connection
 * until somebody declares what it may do.
 */
export const SUBSTRATE_WRITS: ReadonlyArray<LayerWrit> = [
  {
    layer: "foldlab-plait",
    roles: ["fact-publisher", "node-publisher"],
    publish: [
      "$JS.API.INFO",
      "$JS.API.STREAM.INFO.{commons-stream}",
      "flb.fab.fact.{venue}",
      "flb.fab.node.{node}",
    ],
    subscribe: [
      "_INBOX.{fact-publisher-inbox}.>",
      "_INBOX.{node-publisher-inbox}.>",
    ],
  },
  {
    layer: "foldlab-plait-cell",
    roles: ["cell"],
    publish: [
      "$JS.API.DIRECT.GET.KV_flb-fab-cell.>",
      "$JS.API.INFO",
      "$JS.API.STREAM.INFO.KV_flb-fab-cell",
      "$KV.flb-fab-cell.>",
    ],
    subscribe: [
      "_INBOX.{cell-inbox}.>",
    ],
  },
  {
    layer: "foldlab-plait-chaos",
    roles: [],
    publish: [],
    subscribe: [],
  },
  {
    layer: "foldlab-plait-chaos-pin-head",
    roles: [],
    publish: [],
    subscribe: [],
  },
  {
    layer: "foldlab-plait-catalog",
    roles: ["catalog"],
    publish: [
      "$JS.API.DIRECT.GET.KV_flb-fab-cat.>",
      "$JS.API.INFO",
      "$JS.API.STREAM.INFO.KV_flb-fab-cat",
      "$KV.flb-fab-cat.>",
    ],
    subscribe: [
      "_INBOX.{catalog-inbox}.>",
    ],
  },
  {
    // The anchor carrier reads and writes two buckets: the checkpoint facts are
    // its own, and the state those facts name is an ordinary cataloged value
    // this layer admits through the durable catalog on the same connection.
    layer: "foldlab-plait-folds",
    roles: ["anchor"],
    publish: [
      "$JS.API.DIRECT.GET.KV_flb-fab-anchor.>",
      "$JS.API.DIRECT.GET.KV_flb-fab-cat.>",
      "$JS.API.INFO",
      "$JS.API.STREAM.INFO.KV_flb-fab-anchor",
      "$JS.API.STREAM.INFO.KV_flb-fab-cat",
      "$KV.flb-fab-anchor.>",
      "$KV.flb-fab-cat.>",
    ],
    subscribe: [
      "_INBOX.{anchor-inbox}.>",
    ],
  },
  {
    // The bounded lane read opens its own connection, and it opens one BECAUSE
    // the read must not carry the emit right: the publishing layer next door
    // holds `flb.fab.ev.{lane}.*`, and a read that shared its connection would
    // hold it too. What that read may address instead — the evidence streams'
    // own info and the ephemeral ordered consumers it reads them through — is a
    // carrier role the permission projection does not yet declare, so this row
    // is the LEAST writ: declared, empty, and honest about naming no authority
    // rather than borrowing the publisher's. The owed work is that role, and
    // until it lands a credentialed deployment grants this layer nothing, which
    // fails closed rather than open.
    layer: "foldlab-plait-lane-reads",
    roles: [],
    publish: [],
    subscribe: [],
  },
  {
    layer: "foldlab-plait-lanes",
    roles: ["evidence-publisher"],
    publish: [
      "$JS.API.INFO",
      "$JS.API.STREAM.INFO.{evidence-stream}",
      "flb.fab.ev.{lane}.*",
    ],
    subscribe: [
      "_INBOX.{evidence-publisher-inbox}.>",
    ],
  },
  {
    layer: "foldlab-plait-register",
    roles: ["register"],
    publish: [
      "$JS.API.DIRECT.GET.KV_flb-fab-reg.>",
      "$JS.API.INFO",
      "$JS.API.STREAM.INFO.KV_flb-fab-reg",
      "$KV.flb-fab-reg.>",
    ],
    subscribe: [
      "_INBOX.{register-inbox}.>",
    ],
  },
  {
    layer: "foldlab-plait-sessions",
    roles: ["anchor"],
    publish: [
      "$JS.API.DIRECT.GET.KV_flb-fab-anchor.>",
      "$JS.API.DIRECT.GET.KV_flb-fab-cat.>",
      "$JS.API.INFO",
      "$JS.API.STREAM.INFO.KV_flb-fab-anchor",
      "$JS.API.STREAM.INFO.KV_flb-fab-cat",
      "$KV.flb-fab-anchor.>",
      "$KV.flb-fab-cat.>",
    ],
    subscribe: [
      "_INBOX.{anchor-inbox}.>",
    ],
  },
]

const teachDeclareWrit: ReadonlyArray<Next> = [{
  subject: "substrate.writ",
  note: "Declare this layer's writ as a row of the substrate writ table, naming the carrier roles its connection acts as, before the layer opens a connection.",
}]

const undeclared = (
  path: ReadonlyArray<string>,
  got: string,
  expected: string,
): Refusal => structuralRefusal({
  kind: "malformed-value",
  law: "A substrate connection acts under a writ this package has declared for its layer.",
  path,
  got,
  expected,
  next: teachDeclareWrit,
})

const set = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  [...new Set(values)].sort()

/**
 * Declares one row as the canonical writ value.
 *
 * Every list is a SET — sorted and duplicate-free — so two parties writing the
 * same roles and families in different orders declare the same bytes and
 * therefore the same writ.
 */
export const substrateWritValue = (row: LayerWrit): SubstrateWrit => ({
  v: 0,
  kind: "substrate-writ",
  holder: row.layer,
  roles: set(row.roles),
  publish: set(row.publish),
  subscribe: set(row.subscribe),
})

/** One writ's name: the digest of its declared bytes. */
export const substrateWritDigest = (
  writ: SubstrateWrit,
): Effect.Effect<Digest, Refusal> => digestOf(writ as unknown as WireValue)

/**
 * Declares the writ one layer's connection acts under.
 *
 * A layer with no declared row REFUSES here rather than returning the least
 * writ, because the two are different facts and collapsing them is the
 * ambiguity group 3's declared fields exist to close: the least writ is
 * declared and empty, while an undeclared layer is a layer nobody wrote a writ
 * for at all.
 */
export const declareSubstrateWrit = Effect.fn("Writ.declare")(function* (
  layer: string,
): Effect.fn.Return<DeclaredSubstrateWrit, Refusal> {
  const row = SUBSTRATE_WRITS.find((candidate) => candidate.layer === layer)
  if (row === undefined) {
    return yield* undeclared(
      ["writ", "layer"],
      layer,
      `one of the ${SUBSTRATE_WRITS.length} layers the substrate writ table declares`,
    )
  }
  const declaration = substrateWritValue(row)
  return { declaration, digest: yield* substrateWritDigest(declaration) }
})

/**
 * The writ digest one layer's connection acts under, or `null` when this
 * package declares no writ for that layer.
 *
 * This is what the transport spine folds, and it does NOT refuse. A writ is a
 * declaration and not a guard, so a missing declaration must not take down a
 * connection — that would make the writ enforcement by the back door, at the
 * one seam where this package has said it builds none. `null` here is the
 * honest reading of "no writ is declared for this layer", it is distinguishable
 * from the least writ, and it is the value a caller outside the spine's own
 * layers folds.
 *
 * The fence against a spine acquire site drifting into that state lives in the
 * battery instead: the wall walks the acquire sites out of `src/` and refuses
 * any whose layer this table does not declare.
 */
export const writDigestFor = Effect.fn("Writ.digestFor")(function* (
  layer: string,
): Effect.fn.Return<Digest | null, Refusal> {
  const row = SUBSTRATE_WRITS.find((candidate) => candidate.layer === layer)
  return row === undefined ? null : yield* substrateWritDigest(substrateWritValue(row))
})

/**
 * Resolves a writ digest back to the exact declared value it names.
 *
 * This is the other half of "digest = name": the session fact carries the
 * digest, and a party holding the fact reads what the connection was declared
 * to do by resolving it here. The resolution is over the declared table, so it
 * reaches no connection and asks nothing.
 */
export const resolveSubstrateWrit = Effect.fn("Writ.resolve")(function* (
  digest: string,
): Effect.fn.Return<SubstrateWrit, Refusal> {
  for (const row of SUBSTRATE_WRITS) {
    const declaration = substrateWritValue(row)
    if ((yield* substrateWritDigest(declaration)) === digest) return declaration
  }
  return yield* undeclared(
    ["writ", "digest"],
    digest,
    "the digest of a writ the substrate writ table declares",
  )
})
