/**
 * Plane: internal — private adapters, housed flat.
 * Seam: planes — the state carriers, one seam per plane.
 *
 * The admin surface every authority carrier pins, and the two laws that are
 * not shape laws.
 *
 * A carrier's backing stream carries more configuration than the shape gates
 * used to read. The vendor corpus graded that remainder UNCHECKED
 * (`docs/research/2026-08-13-nats-vendor-corpus-scorecard.md` item 6): a
 * republish rule, a subject transform, direct-get access, atomic publish, a
 * message counter, compression, a message-size cap, and per-message TTL are
 * all settable on a stream the carrier then opens and trusts. This module is
 * the one reading of that surface, shared by every carrier that opens one.
 *
 * Two of those fields are not shape at all, and each gets its own named law:
 *
 * - **A mirrored or sourced carrier** is refused by
 *   {@link mirroredAuthorityCarrier}, not by the subjects-count clause of a
 *   shape gate. ADR-0009 rules the role: an authority imports nothing; a
 *   replica is a verified mirror and is locally read-only. A mirror carries no
 *   `subjects`, so before this law existed the shape gates refused one
 *   INCIDENTALLY, on the subject list, and taught "restore the declared
 *   partition stream shape" — a repair that is wrong for every mirror, because
 *   the mirror does not want its subjects back, it wants to be read as a
 *   replica.
 * - **A carrier that expires its own facts** is refused by
 *   {@link expiringAuthorityCarrier}. Per-message TTL lets the server delete a
 *   fact a decision cited, which un-decides that decision after the fact; the
 *   repair is a different carrier, not a different retention number.
 *
 * Everything else is shape, and stays with each carrier's own shape kind.
 *
 * @module
 */
import { StoreCompression, type StreamConfig } from "@nats-io/jetstream"

import { structuralRefusal, type Refusal } from "../truth/Refusal.js"

/**
 * The lane's evidence stream is read through consumers, never through the
 * direct-get API, so that carrier pins direct access OFF.
 */
export const LANE_ALLOW_DIRECT = false

/**
 * The KV carriers pin direct access ON: `@nats-io/kv` turns it on at bucket
 * creation and reads through it, and at the R=1 this package also pins there
 * is no second replica for a direct read to be stale against.
 */
export const KV_ALLOW_DIRECT = true

/**
 * Where a carrier is opened, for the refusal to name.
 *
 * `path` addresses the carrier inside its own plane and `subject` names the
 * seam whose next call the repair applies to, so one law can be minted once
 * and still teach an operator which carrier refused.
 */
export interface CarrierSite {
  /** The refusal path prefix identifying this carrier. */
  readonly path: ReadonlyArray<string>
  /** The seam the taught repair applies to. */
  readonly subject: string
}

/**
 * The admin-surface fields, read with every absence resolved to the value the
 * server means by leaving it out.
 *
 * The pinned server (v2.14.4, `test/NatsHarness.ts`) omits `allow_atomic` and
 * `allow_msg_counter` entirely when they are off, and returns `allow_direct`,
 * `mirror_direct`, `compression`, `max_msg_size`, and `allow_msg_ttl` on every
 * stream. A gate that compared raw fields would therefore read `undefined` for
 * two of the nine and could not tell "off" from "this server does not speak
 * it"; resolving absence here means the comparison below is over one closed
 * record whatever the server chose to serialize.
 */
export interface AdminSurface {
  readonly republish: { readonly src: string; readonly dest: string } | null
  readonly subject_transform: { readonly src?: string; readonly dest: string } | null
  readonly allow_direct: boolean
  readonly mirror_direct: boolean
  readonly allow_atomic: boolean
  readonly allow_msg_counter: boolean
  readonly compression: string
  readonly max_msg_size: number
  readonly allow_msg_ttl: boolean
}

/** Reads one carrier's admin surface off its backing stream config. */
export const adminSurface = (config: StreamConfig): AdminSurface => ({
  republish: config.republish ?? null,
  subject_transform: config.subject_transform ?? null,
  allow_direct: config.allow_direct ?? false,
  mirror_direct: config.mirror_direct ?? false,
  allow_atomic: config.allow_atomic ?? false,
  allow_msg_counter: config.allow_msg_counter ?? false,
  compression: config.compression ?? StoreCompression.None,
  max_msg_size: config.max_msg_size ?? -1,
  allow_msg_ttl: config.allow_msg_ttl ?? false,
})

/**
 * Whether the carrier's admin surface is the pinned one.
 *
 * `allowDirect` is the one field a carrier chooses rather than inherits: a
 * lane's evidence stream is read through consumers and pins it OFF, while a KV
 * bucket's own client turns it ON at creation and reads through it, so the KV
 * carriers pin it ON. Pinning one value for both would refuse a carrier this
 * package itself created.
 *
 * `mirror`, `sources`, and `allow_msg_ttl` are deliberately absent from this
 * comparison: each has its own named law below, and a shape refusal for them
 * would teach the wrong repair.
 */
export const hasPinnedAdminSurface = (
  config: StreamConfig,
  allowDirect: boolean,
): boolean => {
  const surface = adminSurface(config)
  return surface.republish === null
    && surface.subject_transform === null
    && surface.allow_direct === allowDirect
    && surface.mirror_direct === false
    && surface.allow_atomic === false
    && surface.allow_msg_counter === false
    && surface.compression === StoreCompression.None
    && surface.max_msg_size === -1
}

/** Whether the carrier's backing stream takes its facts from somewhere else. */
export const importsFacts = (config: StreamConfig): boolean =>
  config.mirror !== undefined || (config.sources ?? []).length > 0

/** Whether the carrier's backing stream lets the server delete a fact by age. */
export const expiresFacts = (config: StreamConfig): boolean =>
  config.allow_msg_ttl === true

/**
 * The mirror law, named.
 *
 * Minted here rather than at each carrier so that one law has one text: the
 * carrier appears in `path` and in the repair's subject, and nowhere else. The
 * taught-payload wall renders that subject `<expression>` by design — what it
 * pins is the law and the repair, which are the same sentence at every carrier
 * precisely because the role rule is ADR-0009's and not any one plane's.
 */
export const mirroredAuthorityCarrier = (
  site: CarrierSite,
  config: StreamConfig,
): Refusal =>
  structuralRefusal({
    kind: "mirrored-authority-carrier",
    law:
      "An authority carrier is the sole origin of its facts: its stream imports nothing — no mirror, no sources.",
    path: [...site.path, "stream", "config", "mirror"],
    got: {
      mirror: config.mirror?.name ?? null,
      sources: (config.sources ?? []).map((source) => source.name),
    },
    expected: { mirror: null, sources: [] },
    next: [{
      subject: site.subject,
      note:
        "Open this carrier against a stream that imports nothing, and declare a replica read-plane carrier for the mirrored copy instead: a mirror stores its origin's facts at its origin's sequence numbers and is locally read-only, so it can be read but never held as an authority (ADR-0009). Sources renumber and carry no journal at all.",
      body: { mirror: null, sources: [] },
    }],
  })

/**
 * The per-message-TTL law, named.
 *
 * The server does not allow `allow_msg_ttl` to be cleared once it is set, so
 * the repair is a carrier, not a setting — which is exactly why this cannot be
 * a shape refusal teaching "restore the shape".
 */
export const expiringAuthorityCarrier = (
  site: CarrierSite,
  config: StreamConfig,
): Refusal =>
  structuralRefusal({
    kind: "expiring-authority-carrier",
    law:
      "An authority carrier never expires a fact it carries: a fact the server deletes un-decides every decision that cited it.",
    path: [...site.path, "stream", "config", "allow_msg_ttl"],
    got: {
      allow_msg_ttl: config.allow_msg_ttl ?? false,
      subject_delete_marker_ttl: config.subject_delete_marker_ttl ?? 0,
    },
    expected: { allow_msg_ttl: false },
    next: [{
      subject: site.subject,
      note:
        "Open this carrier against a stream created with per-message TTL off — the server refuses to clear `allow_msg_ttl` once it is set, so an existing one is replaced, not edited — and carry material that is meant to expire on a carrier no decision reads.",
      body: { allow_msg_ttl: false },
    }],
  })
