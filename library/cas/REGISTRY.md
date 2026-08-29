# Kind-tag registry — scheme 0

GENERATED — projection of `Cas.Grammar.manifestV0` by `lake exe emitgrammar`; do not edit. The layouts below are read off the encoders in `Cas/Grammar/Tree.lean` through a witness term per form, so this document cannot drift from them.

The wire kind tags of the grammar's sorts (`Cas/Grammar/Sorts.lean`, `Ty.wireTag`/`Ty.ofTag`). Ratified by the grammar grill (2026-08-28, rulings 2 and 3; recorded in `library/effects/IMPLEMENTATION-PLAN.md` §14). Tags 8, 9, and 10 are also the blob kinds of PROFILE-CAS-HTTP-0. A tag names one node form family; references type-check at tag granularity, so a row here is a contract on every wire.

## The node envelope

Every node is written as `version ++ tag ++ frame(payload) ++ nat32(refCount) ++ refs` and its content address is the digest of exactly those bytes. The version and tag bytes lead so that the separation theorems can quantify over them; the payload is framed rather than trailing, so the reference count is reachable without knowing a sort. Each reference record is one expected-tag byte followed by a 32-byte address.

| field | encoding | bytes | meaning |
| --- | --- | --- | --- |
| `version` | `u8` | 1 | the scheme-version byte — scheme 0 for every row here |
| `tag` | `u8` | 1 | the sort's wire kind tag: the row this manifest gives it |
| `payload` | `framed-u32` | variable | the sort's payload bytes, self-delimiting |
| `refCount` | `be-u32` | 4 | how many typed references follow |
| `refs` | `opaque` | variable | refCount reference records, in order |

## The sorts

| Tag (dec) | Tag (hex) | Sort | Status | Exemplar | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `0x01` | `value` | RATIFIED core | `value-single` | Opaque value payload. A leaf: no references. |
| 8 | `0x08` | `chunk` | RATIFIED core | `blob-two-leaves` | Position-free chunk data (profile blob kind). The chunk carries no index: position lives in the `tree` leaf that names it, which is what lets one chunk be shared by two leaves. |
| 9 | `0x09` | `tree` | RATIFIED core | `blob-two-leaves` | Blob leaf and interior node share one sort and one tag — references type-check at tag granularity, so a `tree` edge accepts either. The forms are told apart by the payload: eight bytes for a leaf, none for an interior node. |
| 10 | `0x0A` | `manifest` | RATIFIED core | `blob-two-leaves` | Recipe-1 blob manifest (profile blob kind). Sixteen payload bytes in this order: recipe, total, leaf count — the total is the only 64-bit field in the grammar. |
| 11 | `0x0B` | `file` | RATIFIED core | `file-readme` | Named file over a blob manifest. Both payload fields are framed, so the payload is self-delimiting; each is bounded under 2^16 bytes so the framed pair stays inside one node payload bound. |
| 12 | `0x0C` | `entry` | RATIFIED core | `journal-two-entries` | Journal entry or genesis. The sort does not fix its reference list: the codec constrains a reference's expected tag, never the arity, and the agent language writes a three-edge entry (context, value, entry) over this same tag. A reader dispatches on what it finds, not on this row. |
| 13 | `0x0D` | `context` | RATIFIED core | — | Context node: typed edges, no payload. A ratified tag with NO grammar form — `Cas/Grammar/Tree.lean` has no `context` constructor, so nothing in the grammar writes this sort's layout. It is elaborated at the node layer by consumers (`CasExamples.AgentStep.contextNode`): empty payload, one typed edge per folded item, the edge tags read off whatever was loaded. Giving `context` a grammar form is its own slice. |
| 14 | `0x0E` | `step` | RESERVED | — | F3 defunctionalized code point. Spelled as the bare def `Cas.Lang.stepWireTag`, outside `Ty`, and pinned against this row by `#guard` in `Cas/Lang/Defun.lean`. |
| 15 | `0x0F` | `cont` | RESERVED | — | F3 continuation. Spelled as the bare def `Cas.Lang.contWireTag`, outside `Ty`, and pinned against this row by `#guard` in `Cas/Lang/Defun.lean`. |
| 71 | `0x47` | `git` | RATIFIED core | `git-pin-commit` | The estate's VERSIONING primitive (drafted 2026-08-29; awaiting ratification). A git object enters the store as content: the payload IS the loose-object preimage — `"<type> <length>\0" ++ content` — so `sha1(payload)` is the object's git id while the node's own address is the digest of its canonical pre-image. One node, two identities, neither declared in a field and both derivable by any host from the bytes alone. That dual identity is what makes the sort a versioning primitive rather than an import format: a commit admitted this way carries its git-side name with it, so pinning a dependency by revision and pinning it by content address name the same bytes, and the estate can hold a version without leaving the store. The exemplar is the `git-pin-commit` vector — the lean4-tree-sitter pin commit as one node, its payload's SHA-1 the commit id it names. References are empty in v0: git's internal SHA-1 edges (a commit's tree and parents, a tree's entries) stay inside the payload rather than becoming typed CAS edges, exactly as the schema sort's `$defs` graph does. Promoting them is the named follow-up, and is what would turn a pinned object into a walkable history. |
| 83 | `0x53` | `schema` | RATIFIED (opaque-payload revision 1) | `schema-vector-document` | Payload = the canonical JSON envelope of Effect's persistent `SchemaRepresentation` document; references remain empty. Revision 0's tagged projection is read-compatible. The cross-runtime byte pin is gated; the revision-1 byte theorem remains pending. Typed schema-to-schema edges (`$defs` as real CAS references) are the named follow-up. |

Rows 1 and 11–13 were previously marked "illustrative"; ruling 2 ratifies all seven data sorts into core. Consumer extension (profiles, the GrammarSpec registration pattern) is a named follow-up, not retrofitted here; a new tag enters only through the grill with a real consumer.

Rows 14 and 15 carry a reconciliation debt on purpose: they are used by `Cas/Lang/Defun.lean` but are NOT `Ty` constructors, because growing `Ty` is F3's own slice (a measured five-file amplification). The debt is machine-visible rather than prose-only — `Defun.lean` guards both literals against this table AND guards that `Ty.ofTag` still refuses both tags, so ratifying either row into `Ty` turns that build red and names the site that must follow.

## Payload layout and reference discipline

One section per node form, read off the encoders in `Cas/Grammar/Tree.lean` through a witness term. Rows with no form: context, step, cont — see their notes above.

### value.value

An opaque value payload.

- payload: variable
- references: none

| field | encoding | bytes | meaning |
| --- | --- | --- | --- |
| `payload` | `opaque` | variable | the value's bytes; nothing in the grammar reads them |

### chunk.chunk

Position-free chunk data.

- payload: variable
- references: none

| field | encoding | bytes | meaning |
| --- | --- | --- | --- |
| `bytes` | `opaque` | variable | the chunk's bytes |

### tree.leaf

A blob leaf: a positioned pointer at one chunk.

- payload: 8 bytes
- references: data

| field | encoding | bytes | meaning |
| --- | --- | --- | --- |
| `index` | `be-u32` | 4 | the leaf's absolute chunk index within the blob |
| `length` | `be-u32` | 4 | the declared byte length of the chunk |

| reference | expects | tag | meaning |
| --- | --- | --- | --- |
| `data` | `chunk` | `0x08` | the chunk this leaf positions |

### tree.parent

A blob interior node: two ordered subtrees, no payload.

- payload: 0 bytes
- references: left, right

| reference | expects | tag | meaning |
| --- | --- | --- | --- |
| `left` | `tree` | `0x09` | the earlier subtree |
| `right` | `tree` | `0x09` | the later subtree |

### manifest.manifest

The recipe-1 blob manifest.

- payload: 16 bytes
- references: root

| field | encoding | bytes | meaning |
| --- | --- | --- | --- |
| `recipe` | `be-u32` | 4 | the chunking recipe id (1 = fixed-size chunks) |
| `totalBytes` | `be-u64` | 8 | the blob's total byte length |
| `leafCount` | `be-u32` | 4 | how many leaves the tree carries |

| reference | expects | tag | meaning |
| --- | --- | --- | --- |
| `root` | `tree` | `0x09` | the blob tree this manifest heads |

### file.file

A named file over a blob manifest.

- payload: variable, at least 8 bytes
- references: content

| field | encoding | bytes | meaning |
| --- | --- | --- | --- |
| `name` | `framed-u32` | variable | the file name, UTF-8, under 2^16 bytes |
| `mediaType` | `framed-u32` | variable | the media type, UTF-8, under 2^16 bytes |

| reference | expects | tag | meaning |
| --- | --- | --- | --- |
| `content` | `manifest` | `0x0A` | the blob manifest holding the file's bytes |

### entry.genesis

The journal's first entry: no note, no edges.

- payload: 0 bytes
- references: none

### entry.entry

One journal entry over a file, linked to its predecessor.

- payload: variable
- references: item, prev

| field | encoding | bytes | meaning |
| --- | --- | --- | --- |
| `note` | `opaque` | variable | the entry's note bytes, uninterpreted |

| reference | expects | tag | meaning |
| --- | --- | --- | --- |
| `item` | `file` | `0x0B` | the file this entry records |
| `prev` | `entry` | `0x0C` | the entry before it |

### git.git

A git object as content.

- payload: variable
- references: none

| field | encoding | bytes | meaning |
| --- | --- | --- | --- |
| `object` | `opaque` | variable | the git loose-object preimage: the type word, a space, the decimal byte length, a NUL, then the object's content |

### schema.schema

A canonical schema as content.

- payload: variable
- references: none

| field | encoding | bytes | meaning |
| --- | --- | --- | --- |
| `bytes` | `opaque` | variable | the schema's canonical bytes, opaque at this layer |
