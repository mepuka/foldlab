/** The library-owned CAS kind tags, in one registry.
 *
 * Every fixed tag the runtime interprets lives here so no two kind
 * planes can collide: replay histories and witnesses, and the three
 * blob-graph tags. `Cas.value` refuses this whole set — a caller-defined
 * projection must never alias a node kind the library already reads.
 * A future fixed tag enters this registry before any module uses it. */
export const HistoryKindTag = 0x48
export const WitnessKindTag = 0x57
export const ChunkDataTag = 8
export const BlobNodeTag = 9
export const BlobManifestTag = 10
/** Canonical-schema nodes: the schema plane's own kind. */
export const SchemaKindTag = 0x53

export const ReservedKindTags: ReadonlySet<number> = new Set([
  HistoryKindTag,
  WitnessKindTag,
  ChunkDataTag,
  BlobNodeTag,
  BlobManifestTag,
  SchemaKindTag,
])
