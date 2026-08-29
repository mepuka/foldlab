/**
 * The architecture, as a value — the library described in itself.
 *
 * The same description the Lean model carries as a type and a value
 * (`library/cas/Cas/Architecture.lean`), expressed the Effect-native
 * four ways: a Schema (the codec of the description), a value (this
 * library), a service (the description as a dependency), and a layer
 * (providing it). The two descriptions cannot drift: each side derives
 * the capability matrix from its own value, renders it through its own
 * canonical JSON, and guards the SAME pinned string.
 *
 * Prose fields are per-side commentary; the matrix — which
 * capabilities each law needs, each backend provides, the seam set,
 * the data-vocabulary names — is the load-bearing shared projection.
 */
import { Context, Layer, Schema } from "effect"

/** One capability of the byte plane — the unit the seams split by. */
export const Capability = Schema.Literals(["read", "roots", "write"])
export type Capability = typeof Capability.Type

/** One carrier of the data vocabulary, with its model and runtime
 * homes. */
export const ArchType = Schema.Struct({
  form: Schema.String,
  lean: Schema.String,
  name: Schema.String,
  ts: Schema.String,
})
export type ArchType = typeof ArchType.Type

/** One law above the seams: what it means and which capabilities it
 * needs — nothing else about storage. */
export const ArchLaw = Schema.Struct({
  means: Schema.String,
  name: Schema.String,
  needs: Schema.Array(Capability),
  plane: Schema.Literals(["cas", "server"]),
})
export type ArchLaw = typeof ArchLaw.Type

/** One backend below the seams: which capabilities it provides. */
export const ArchBackend = Schema.Struct({
  means: Schema.String,
  name: Schema.String,
  provides: Schema.Array(Capability),
})
export type ArchBackend = typeof ArchBackend.Type

/** The library's shape: data vocabulary, seams, laws, backends. */
export const Description = Schema.Struct({
  backends: Schema.Array(ArchBackend),
  laws: Schema.Array(ArchLaw),
  seams: Schema.Array(Capability),
  types: Schema.Array(ArchType),
})
export type Description = typeof Description.Type

/** The value: `@foldlab/cas`. */
export const value: Description = Description.make({
  backends: [
    {
      means: "plain maps, grow-only",
      name: "memory",
      provides: ["read", "roots", "write"],
    },
    {
      means: "a store root: objects/<2 hex>/<62 hex> + roots/<hex>, temp+rename",
      name: "file",
      provides: ["read", "roots", "write"],
    },
    {
      means: "any Effect KeyValueStore; SQL is the Litestream route; no roots seam",
      name: "kvs",
      provides: ["read", "write"],
    },
    {
      means: "any host serving bytes at a path; writes do not compile",
      name: "pathReader",
      provides: ["read"],
    },
  ],
  laws: [
    {
      means: "put is the admission law: closure and edge kinds checked",
      name: "store",
      needs: ["read", "write"],
      plane: "cas",
    },
    {
      means: "load-only re-verification: digest recomputed, canonical re-decode",
      name: "loader",
      needs: ["read"],
      plane: "cas",
    },
    {
      means: "typed values encode; references marker-lowered in canonical order",
      name: "valuePut",
      needs: ["read", "write"],
      plane: "cas",
    },
    {
      means: "typed values decode; references resolve to lazy typed roots",
      name: "valueGet",
      needs: ["read"],
      plane: "cas",
    },
    {
      means: "verified chunked blobs, recipe 1",
      name: "blob",
      needs: ["read", "write"],
      plane: "cas",
    },
    {
      means: "children-first deduplicated reachability",
      name: "graphClosure",
      needs: ["read"],
      plane: "cas",
    },
    {
      means: "the untrusted-host audit: every reachable node re-verified",
      name: "graphVerify",
      needs: ["read"],
      plane: "cas",
    },
    {
      means: "cas-http/0 interpreted over the same seams an embedded store uses",
      name: "serverCore",
      needs: ["read", "roots", "write"],
      plane: "server",
    },
  ],
  seams: ["read", "roots", "write"],
  types: [
    {
      form: "32-byte digest of the canonical pre-image — the identity",
      lean: "Addr32 (Cas/Node.lean)",
      name: "address",
      ts: "ContentId (src/cas/Node.ts)",
    },
    {
      form: "expected kind tag + address: one typed edge",
      lean: "Ref (Cas/Node.lean)",
      name: "ref",
      ts: "CasReference (src/cas/Node.ts)",
    },
    {
      form: "version byte, kind tag, payload bytes, ordered refs",
      lean: "Node (Cas/Node.lean)",
      name: "node",
      ts: "CasNodeInput (src/cas/Node.ts)",
    },
    {
      form: "partial map address ⇀ node; grows only; closed = nothing dangles",
      lean: "Store (Cas/Store.lean)",
      name: "store",
      ts: "seams + store law (src/cas/Backend.ts, Store.ts)",
    },
    {
      form: "typed address: phantom value type + expected kind tag",
      lean: "Root α (Cas/Refs.lean)",
      name: "root",
      ts: "Root<A> (src/cas/Value.ts)",
    },
    {
      form: `{"$ref": k} — the k-th reference, in canonical byte order`,
      lean: "marker grammar (Cas/Refs.lean)",
      name: "marker",
      ts: "refMarkers walks (src/internal/refMarkers.ts)",
    },
    {
      form: "canonical JSON envelope {revision, value}",
      lean: "Json.Value + renderCompact (Cas/Json.lean)",
      name: "payload",
      ts: "canonicalJson (src/cas/Value.ts)",
    },
    {
      form: "the digest the laws recompute — quantified over, never fixed",
      lean: "H : Bytes → Addr (Cas/Address.lean)",
      name: "addressScheme",
      ts: "AddressScheme service (src/cas/Store.ts)",
    },
  ],
})

/** The seam capabilities mapped to the service keys that realize them
 * — asserted against the real tags by the architecture suite. */
export const seamKeys = {
  read: "foldlab/cas/ByteReader",
  roots: "foldlab/cas/RootStore",
  write: "foldlab/cas/ByteWriter",
} satisfies Record<Capability, string>

/** The digest every law recomputes, as its own dependency: not a seam
 * (it stores nothing) and not a law (it decides nothing) — the scheme
 * the composition chooses, which is why the model quantifies over it. */
export const addressSchemeKey = "foldlab/cas/AddressScheme"

/** The description as a dependency: ask the context what the library
 * is. */
export class Service extends Context.Service<Service, Description>()(
  "foldlab/cas/Architecture",
) {}

/** Provide the description. */
export const layer: Layer.Layer<Service> = Layer.succeed(Service, value)

const sorted = (items: ReadonlyArray<string>): ReadonlyArray<string> =>
  items.toSorted()

/** The shape of the shared projection, named so the derivation keeps
 * its type evidence. */
export interface CapabilityMatrix {
  readonly backends: Record<string, ReadonlyArray<string>>
  readonly laws: Record<string, ReadonlyArray<string>>
  readonly seams: ReadonlyArray<string>
  readonly types: ReadonlyArray<string>
}

/** The load-bearing shared projection — one canonical-JSON object both
 * descriptions derive and pin. */
export const capabilityMatrix = (description: Description): CapabilityMatrix => ({
  backends: Object.fromEntries(description.backends.map((backend) =>
    [backend.name, sorted(backend.provides)])),
  laws: Object.fromEntries(description.laws.map((law) =>
    [law.name, sorted(law.needs)])),
  seams: sorted(description.seams),
  types: sorted(description.types.map((carrier) => carrier.name)),
})

/** The pinned canonical rendering, shared verbatim with the model's
 * `library/cas/Cas/Architecture.lean`. Changing the shape means
 * changing this string in BOTH homes — that is the point. */
export const capabilityMatrixPin =
  `{"backends":{"file":["read","roots","write"],"kvs":["read","write"],"memory":["read","roots","write"],"pathReader":["read"]},"laws":{"blob":["read","write"],"graphClosure":["read"],"graphVerify":["read"],"loader":["read"],"serverCore":["read","roots","write"],"store":["read","write"],"valueGet":["read"],"valuePut":["read","write"]},"seams":["read","roots","write"],"types":["address","addressScheme","marker","node","payload","ref","root","store"]}`
