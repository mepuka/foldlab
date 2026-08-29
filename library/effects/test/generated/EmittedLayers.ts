/**
 * GENERATED — do not edit. Effect layers lowered from an authored
 * service topology (`tools/EmitLayers.lean`), stored at the system
 * kind and printed by `lake exe emitlayers`; regeneration is
 * byte-identity-gated (`--check`, wired into `check:cas`).
 *
 * The acceptance this module carries is BEHAVIOURAL SHAPE, not byte
 * identity of a hand-written original: `EmittedLayers.test.ts` builds
 * each requirement-free layer below and asserts its Context holds
 * exactly the key set the topology declares.
 *
 * What that certifies: the key set. What it does not: acquisition
 * order, provide-versus-provideMerge residuals below the surface, and
 * how many instances of a shared child exist. The last one is the
 * failure mode worth naming, because its industry precedent is silent
 * — an action cache that agrees on a hash and disagrees on the output
 * serves the wrong answer without a word. This gate is the loud
 * version of that check, and it is deliberately narrower than the
 * estate's usual byte gate. The module's own BYTES are still gated by
 * `--check`; what is behavioural is only the claim that the wiring
 * means what the description says.
 */
import { ByteReader, ByteWriter, RootStore, layerMemoryBackend } from "../../src/cas/Backend.ts"
import { layerKvsBackend } from "../../src/cas/KvsBackend.ts"
import { AddressScheme, CasLoader, CasStore, layerCryptoWebCrypto, layerStore } from "../../src/cas/Store.ts"
import { Crypto, Layer } from "effect"
import { KeyValueStore, layerMemory } from "effect/unstable/persistence/KeyValueStore"

/** The platform digest, as a leaf this grammar refuses to open: the
 * constructor reaches for `crypto.subtle` through `Effect.tryPromise`.
 * It contributes identity, never structure. */
export const cryptoWebCrypto: Layer.Layer<Crypto.Crypto> = layerCryptoWebCrypto

/** Scheme-0 SHA-256 as the address scheme — one key answered, one
 * key still demanded. */
export const addressSha256: Layer.Layer<AddressScheme, never, Crypto.Crypto> = AddressScheme.layerSha256

/** The scheme over the platform digest, the digest kept PRIVATE:
 * `provide` keeps only the outer layer's answers. */
export const addressLive: Layer.Layer<AddressScheme> = Layer.provide(addressSha256, cryptoWebCrypto)

/** The three byte-plane seams from one in-memory backend — a leaf
 * whose constructor answers a whole context. */
export const memoryBacking: Layer.Layer<ByteReader | ByteWriter | RootStore> = layerMemoryBackend

/** The same backing, built again rather than shared. This topology
 * wants ITS OWN store, and `fresh` is the only place a description
 * can say so: sharing is extensional here, by digest, so two
 * occurrences of one backing are one instance unless told otherwise. */
export const freshMemoryBacking: Layer.Layer<ByteReader | ByteWriter | RootStore> = Layer.fresh(memoryBacking)

/** The scheme and the seams side by side — neither demands anything
 * of the other. */
export const foundation: Layer.Layer<AddressScheme | ByteReader | ByteWriter | RootStore> = Layer.mergeAll(addressLive, freshMemoryBacking)

/** The typed-node law: two services answered, three demanded. Left
 * unsatisfied on purpose, so the residual fold has something to
 * discharge. */
export const storeLaw: Layer.Layer<CasLoader | CasStore, never, AddressScheme | ByteReader | ByteWriter> = layerStore

/** The whole system: the law over its own foundation, with the
 * foundation KEPT — `provideMerge` answers with both sides, and
 * nothing is demanded of the caller. */
export const casSystem: Layer.Layer<AddressScheme | ByteReader | ByteWriter | CasLoader | CasStore | RootStore> = Layer.provideMerge(storeLaw, foundation)

/** Effect's own in-memory key-value store — the persistence family's
 * simplest realization, and a written constructor like any other. */
export const kvsMemory: Layer.Layer<KeyValueStore> = layerMemory

/** The byte-plane seams derived from whatever `KeyValueStore` the
 * composition supplies — two seams answered, the realization
 * demanded. */
export const kvsBacking: Layer.Layer<ByteReader | ByteWriter, never, KeyValueStore> = layerKvsBackend

/** The seams over the memory realization, the realization kept
 * private. */
export const kvsSeams: Layer.Layer<ByteReader | ByteWriter> = Layer.provide(kvsBacking, kvsMemory)

/** The scheme beside the key-value seams. */
export const kvsFoundation: Layer.Layer<AddressScheme | ByteReader | ByteWriter> = Layer.mergeAll(addressLive, kvsSeams)

/** The second root: the SAME law, over a different backing. It
 * answers with no `RootStore` — the key-value seams do not publish
 * roots — which is the residual fold visibly doing its job rather
 * than copying the first root's answer. */
export const kvsSystem: Layer.Layer<AddressScheme | ByteReader | ByteWriter | CasLoader | CasStore> = Layer.provideMerge(storeLaw, kvsFoundation)

/** Every requirement-free topology beside the service keys it
 * declares — what the Context-key-set differential compares. */
export const topology = [
  {
    name: "cryptoWebCrypto",
    keys: ["effect/Crypto"],
    layer: cryptoWebCrypto,
  },
  {
    name: "addressLive",
    keys: ["foldlab/cas/AddressScheme"],
    layer: addressLive,
  },
  {
    name: "memoryBacking",
    keys: ["foldlab/cas/ByteReader", "foldlab/cas/ByteWriter", "foldlab/cas/RootStore"],
    layer: memoryBacking,
  },
  {
    name: "freshMemoryBacking",
    keys: ["foldlab/cas/ByteReader", "foldlab/cas/ByteWriter", "foldlab/cas/RootStore"],
    layer: freshMemoryBacking,
  },
  {
    name: "foundation",
    keys: ["foldlab/cas/AddressScheme", "foldlab/cas/ByteReader", "foldlab/cas/ByteWriter", "foldlab/cas/RootStore"],
    layer: foundation,
  },
  {
    name: "casSystem",
    keys: ["foldlab/cas/AddressScheme", "foldlab/cas/ByteReader", "foldlab/cas/ByteWriter", "foldlab/cas/CasLoader", "foldlab/cas/CasStore", "foldlab/cas/RootStore"],
    layer: casSystem,
  },
  {
    name: "kvsMemory",
    keys: ["effect/persistence/KeyValueStore"],
    layer: kvsMemory,
  },
  {
    name: "kvsSeams",
    keys: ["foldlab/cas/ByteReader", "foldlab/cas/ByteWriter"],
    layer: kvsSeams,
  },
  {
    name: "kvsFoundation",
    keys: ["foldlab/cas/AddressScheme", "foldlab/cas/ByteReader", "foldlab/cas/ByteWriter"],
    layer: kvsFoundation,
  },
  {
    name: "kvsSystem",
    keys: ["foldlab/cas/AddressScheme", "foldlab/cas/ByteReader", "foldlab/cas/ByteWriter", "foldlab/cas/CasLoader", "foldlab/cas/CasStore"],
    layer: kvsSystem,
  },
]
