# Source Provenance

This context defines the immutable identity of external evidence. It exists so a theorem, fixture, or conformance receipt cannot silently depend on a mutable link.

## Language

**Repository Identity**:
The canonical host, owner, and repository name of one source repository.
_Avoid_: GitHub link, repo URL

**Revision Selector**:
A human request such as a branch, tag, or commit that must be resolved before use.
_Avoid_: Version, pin

**Commit Identity**:
A full algorithm-qualified Git object identifier verified to name a commit.
_Avoid_: SHA, hash, short SHA

**Artifact Locator**:
A Repository Identity, Commit Identity, exact repository-relative path, and expected object kind.
_Avoid_: Link, file reference

**Resolved Artifact**:
The commit, root tree, blob identity, content digest, byte length, and materialized bytes produced from one Artifact Locator.
_Avoid_: Download, checkout

**Content Digest**:
An algorithm-qualified digest of the materialized file bytes, independent of the Git object identifier.
_Avoid_: Git SHA, checksum

**Source Lock**:
The immutable set of Repository Identities, Commit Identities, Artifact Locators, and expected resolved identities approved for a claim.
_Avoid_: Lockfile, manifest

**Resolution Receipt**:
An observation recording how a Source Lock entry resolved and whether every expected identity matched.
_Avoid_: Proof, attestation

**Pending Source**:
An authority or repository whose exact artifact identity has not been accepted into the Source Lock.
_Avoid_: Latest, current version
