/**
 * The three stacks, and what each one costs.
 *
 * The point of naming them here is that they differ only in which adapters sit
 * under the same service. `runCached` is written once and does not know which
 * of these it is running in — no flag reaches it, no branch in it names a
 * deployment — so a node can be moved from local to federated by changing the
 * Layer it is built with and nothing else.
 */

import { Layer } from "effect"
import { BackingInMemory, BackingJournalKv, type JournalKvConfig } from "./backing.ts"
import { Federation, FederationLive, PeersOf, type Peer } from "./federation.ts"
import { FoldCache, FoldCacheLive, FoldCacheVerified } from "./foldCache.ts"
import type { BackingUnavailable } from "./refusal.ts"

/**
 * One process, one map. A hit is trusted after the canonical-form check, which
 * is the right trade when this node is the only writer: nothing else can have
 * put bytes there.
 */
export const LocalFoldCache: Layer.Layer<FoldCache> = Layer.provide(FoldCacheLive, BackingInMemory)

/**
 * One process, every hit re-folded. Costs a history walk per hit and buys the
 * guarantee that a returned value equals a fresh fold — worth it wherever the
 * store is shared, durable, or older than the code reading it.
 */
export const VerifiedFoldCache: Layer.Layer<FoldCache> = Layer.provide(
  FoldCacheVerified,
  BackingInMemory,
)

/**
 * Many nodes. Verification is not optional here: peers are untrusted by
 * construction, which is exactly what makes gossip safe to accept from anyone.
 *
 * Both services are provided one `Backing`, and Layer memoization is what makes
 * that one store rather than two — the cache reads what federation absorbed
 * because they are the same map, not because they were wired to agree.
 */
export const FederatedFoldCache = (
  peers: ReadonlyArray<Peer>,
): Layer.Layer<FoldCache | Federation> =>
  Layer.provide(Layer.merge(FoldCacheVerified, FederationLive), [
    BackingInMemory,
    PeersOf(peers),
  ])

/**
 * The same federated stack over durable storage. The only difference in the
 * type is the `BackingUnavailable` that opening a remote store can produce; the
 * services above it are identical, which is the seam doing its job.
 */
export const DurableFederatedFoldCache = (
  config: JournalKvConfig,
  peers: ReadonlyArray<Peer>,
): Layer.Layer<FoldCache | Federation, BackingUnavailable> =>
  Layer.provide(Layer.merge(FoldCacheVerified, FederationLive), [
    BackingJournalKv(config),
    PeersOf(peers),
  ])
