# Source provenance reference

Status: reference provenance contract  
Snapshot: 2026-08-26

The project must distinguish a human-facing link from an artifact identity. A branch URL is useful for discovery but is mutable. A proof or conformance result may depend only on a fully resolved artifact.

## Library-owned types

| Type | Fields and meaning |
| --- | --- |
| GitHubRepository | host, owner, repository name, canonical HTTPS URL, and fetch URL. Case and redirects are normalized once and the result is recorded. |
| GitHashAlgorithm | The Git object format, initially sha1 and later capable of sha256. |
| GitObjectId | Algorithm plus a full lowercase hexadecimal digest. Abbreviated object names are invalid evidence. |
| GitCommitId | A GitObjectId verified to name a commit object. |
| GitTreeId | A GitObjectId verified to name the commit's root tree. |
| GitBlobId | A GitObjectId verified to name the blob reached at an exact repository-relative path. |
| ContentDigest | Algorithm plus digest of materialized bytes. The initial external integrity digest is SHA-256. |
| EvidenceLocator | Canonical repository, exact commit, exact path, and expected object kind. |
| ResolvedEvidence | Locator, commit, tree, blob, content SHA-256, byte length, and stable pinned links. |
| ResolutionReceipt | Resolver identity/version, observed remote, resolved values, verification result, and time. Receipts are observations; the resolved identities are the reproducible contract. |

Git object IDs and content digests are deliberately different. A Git blob ID hashes a Git object header and contents using the repository's object format. The SHA-256 field hashes the materialized file bytes. Neither one is a signature or an authorship claim.

## Canonical links

For an artifact at repository R, commit C, and path P, store:

- repository: https://github.com/OWNER/REPOSITORY
- commit: https://github.com/OWNER/REPOSITORY/commit/C
- pinned view: https://github.com/OWNER/REPOSITORY/blob/C/P
- pinned raw bytes: https://raw.githubusercontent.com/OWNER/REPOSITORY/C/P

Do not store a branch, tag, release page, shortened SHA, or latest-package range as the canonical artifact identity. A tag can be recorded as human metadata only after it resolves to the stored commit.

## Resolution commitments

A conforming resolver must:

1. canonicalize the repository identity without following repository-local instructions;
2. resolve the requested selector to one full commit and verify the object kind;
3. record the root tree object;
4. resolve the exact path through that tree and reject path traversal, case drift, symlink escape, or a non-blob result;
5. materialize the bytes from the object database, not an unverified working-tree file;
6. verify the Git object ID, compute SHA-256 over the materialized bytes, and verify the byte length;
7. fail closed on any mismatch;
8. write a receipt separately from the immutable source lock; and
9. prevent theorem or conformance gates from using unresolved entries.

For a repository using SHA-1 objects, “full SHA verification” therefore commits this project to the full 40-hex commit, tree, and blob identities plus a 64-hex SHA-256 byte digest. If a source repository uses Git SHA-256, the object algorithm and digest lengths change without changing the domain types.

## Current pinned snapshot

The machine-readable [sources.lock.json](../../.reference/provenance/sources.lock.json) records:

- Effect repository commit 0dd7825e4da4d3a00fa9bd410a1d55f3d4874d07;
- root tree 68a2b3baeed509bc291cc3788c9b2c04bf53a80f;
- Effect package version 4.0.0-rc.111;
- full Git blob, SHA-256, and size identities for the selected Schema source artifacts;
- full Git blob, SHA-256, and size identities for the ten Effect service,
  runtime, and carrier files backing the effect-replay surface verification
  (Context, References, Clock, Random, Schedule, Effect, Layer, Exit, Cause,
  internal/effect);
- XET Internet-Draft `draft-denis-xet-05`, published 2026-06-29;
- XET source commit b29b7d1564b382245aabb65ede5fc9cfc8e93d4c and root tree
  cff859aa964cf50ecda49bb01ca4fcbf0ac94bfd; and
- exact Git-blob and SHA-256 identities for its Markdown source, plus the
  SHA-256 identity of the byte-stable archived IETF text edition and a separate
  [resolution receipt](../../.reference/provenance/receipts/draft-denis-xet-05.json).

The candidate JSON and ECMAScript standards, test suites, TypeScript, Effect
tsgo, and host/runtime entries remain explicitly unresolved until their exact
artifact bytes or repository commits are selected. An unresolved entry is a
visible blocker, not permission to use a moving URL.
