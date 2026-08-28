# Lean 4 prior art for Git, content-addressed storage, metaprogramming, and language design

Status: research note, 2026-08-28. This is a bounded primary-source survey, not a
claim that no other implementation exists. Exact source revisions are recorded in
[`lean4-git-cas-meta-pl-sources.json`](../../.reference/provenance/receipts/lean4-git-cas-meta-pl-sources.json).

## Executive answer

The search found **no exact Lean 4 Git object-model implementation** within the
boundary below. Lean's own Lake code is an operational wrapper around the external
`git` executable; it does not reify or validate Git's blob, tree, commit, and tag
formats. The recommended implementation boundary is therefore a Git-specific model
built over Foldlab's generic CAS envelope, with Git's official source as the format
authority.

The closest executable CAS precedents are:

- **Alaya**, for a small SHA-256 directory-Merkle store with snapshots, named refs,
  and garbage collection;
- **Ix**, for a BLAKE3-addressed Lean expression/environment graph, canonicalization,
  and a disk store;
- **Radiya.lean**, for typed CID wrappers and IPLD/DAG-CBOR encodings of Lean syntax.

None of those is a drop-in Git model. `btc-verified` is a useful proof-pattern
analogue because its Merkle binding theorems expose an explicit SHA-256 collision
alternative instead of silently assuming collision resistance.

For Lean metaprogramming, start with the source-matched Lean 4 examples and API
modules, then use the reference manual and metaprogramming book for worked examples.
For programming-language design, Lean's `tc.lean` and `interp.lean` form a compact
extrinsic/intrinsic pair; Lean4Lean and Concrete are larger architectural studies.

## Search boundary and classification

Observed on 2026-08-28:

- GitHub repository and code searches for `git language:Lean`, `GitRepo`,
  `GitObject`, `"git cat-file"`, `"git rev-parse"`, and `"Git object"`;
- direct inspection of the pinned Lean/Lake, Git, Alaya, Ix, Radiya.lean,
  `btc-verified`, Lean reference/example, Lean4Lean, SampCert, and Concrete sources;
- source-tree searches for Git object constructors/parsers and for CAS theorem and
  test declarations.

“Exact” means that the source models the target format or mechanism itself.
“Partial analogue” means that it supplies a reusable representation, implementation
pattern, or theorem shape while differing semantically. A negative result means only
that no match surfaced inside this boundary.

## Git: negative result and semantic baseline

Lean 4 at `819816b2e0a3bf405af45ae5c7af2491d8f5bee6` contains
[`Lake.Util.Git`](https://github.com/leanprover/lean4/blob/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/src/lake/Lake/Util/Git.lean).
It represents a repository as a directory, a revision as `String`, recognizes a
40-hex-digit SHA-1 spelling, and invokes the external `git` program. It is useful as
process-integration precedent, but it is not a Git object grammar, object-ID
implementation, packfile reader, or repository-validity model.

The semantic baseline is Git v2.55.0 at
`e9019fcafe0040228b8631c30f97ae1adb61bcdc` (GPL-2.0-only):

- [`object-file.c`](https://github.com/git/git/blob/e9019fcafe0040228b8631c30f97ae1adb61bcdc/object-file.c)
  forms the logical object header from object type and byte length, includes its NUL
  terminator, and hashes header followed by content. That is the object-ID preimage;
  packfiles are a physical storage representation.
- [`gitrepository-layout.adoc`](https://github.com/git/git/blob/e9019fcafe0040228b8631c30f97ae1adb61bcdc/Documentation/gitrepository-layout.adoc),
  [`gitformat-index.adoc`](https://github.com/git/git/blob/e9019fcafe0040228b8631c30f97ae1adb61bcdc/Documentation/gitformat-index.adoc),
  and [`gitformat-pack.adoc`](https://github.com/git/git/blob/e9019fcafe0040228b8631c30f97ae1adb61bcdc/Documentation/gitformat-pack.adoc)
  separate immutable objects from mutable refs, reflogs, and the index, and describe
  loose/packed physical layouts.
- [`shallow.adoc`](https://github.com/git/git/blob/e9019fcafe0040228b8631c30f97ae1adb61bcdc/Documentation/technical/shallow.adoc)
  permits a shallow commit whose parents are absent locally.
  [`partial-clone.adoc`](https://github.com/git/git/blob/e9019fcafe0040228b8631c30f97ae1adb61bcdc/Documentation/technical/partial-clone.adoc)
  permits promisor objects that refer to locally missing objects.

Consequently, the bounded search result is: **Git modeling must start from scratch at
the Git semantic layer**, while reusing the existing generic CAS machinery where its
contract fits.

## Fit to Foldlab CAS

Foldlab's `Cas.Node` is a useful generic immutable envelope, and its codec and
admission layers already separate canonical bytes, addressing, and store checks.
A faithful Git adapter still has these obligations:

| Concern | Local fit | Required Git adapter decision |
|---|---|---|
| Digest carrier | `Addr32` is exactly 32 bytes. | Carry the object-format algorithm with its digest width. Ordinary SHA-1 repositories use 20-byte IDs; SHA-256 repositories use 32-byte IDs. Do not pad SHA-1 into `Addr32` without a separately specified, injective envelope. |
| Hash preimage | `Node` has Foldlab framing. | Hash Git's exact logical preimage: ASCII type, space, decimal content length, NUL, then content. Do not hash Foldlab node framing and call the result a Git object ID. |
| Physical storage | `Store` abstracts address-to-node lookup. | Treat loose files and packfiles/deltas as physical projections. Their bytes are not the logical object preimage. |
| Mutable repository state | CAS nodes are immutable. | Model refs, reflogs, index, worktree, and configuration outside immutable object identity. |
| Closure | `Store.Closed` requires every typed reference to resolve. | Separate (1) object-byte validity, (2) typed connectivity when a target is present, and (3) repository completeness. Valid shallow and promisor repositories need not satisfy global closure. |
| Edge roles | `Ref` carries one `expectedTag` and address. | Trees require entry name, mode, and object-ID role; commits require one root-tree edge and ordered parent edges; tags have a target plus declared target type. Put role metadata in the payload and provide checked typed projections, or refine the edge carrier. |

This is an adapter obligation, not a request to change the generic CAS definitions.

## CAS prior-art ledger

| Source | Exact revision | License | Toolchain | Declaration/path | Intended role | Proved guarantee | Assumptions / TCB | Semantic mismatch | Dependency cost | Reuse class | Adapter obligation |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [Alaya](https://github.com/mechtaev/alaya/tree/e88b330aab585820371061ef40f06b11b3d7a6bb/Alaya/Cas) | `e88b330aab585820371061ef40f06b11b3d7a6bb` | MIT | Lean `v4.31.0` | `Cas/Core.lean`, `Sha256.lean`, `Store.lean`, `Workspace.lean`; `Test/Cas.lean`, `Test/Sha256.lean` | Compact executable SHA-256 blob/tree store, snapshots, refs, GC | No CAS theorem declarations surfaced; runtime tests exercise SHA-256, store, and workspace behavior | Lean runtime, filesystem IO; implementation-local JSON encoding/canonicality | Directory-Merkle application format, not Git; SHA-256 only; no collision-explicit admission theorem | Medium | **adapt** operational layout; **pattern** obligations | Replace its entry/JSON identity with Git object grammars and exact preimages; add proof-facing codec/admission contracts |
| [Ix](https://github.com/argumentcomputer/ix/tree/929796e7355a20960568d8eb2847290f3a6ae083) | `929796e7355a20960568d8eb2847290f3a6ae083` | Apache-2.0 OR MIT | Lean `v4.33.1` | `Ix/Address.lean`, `CanonM.lean`, `Ixon.lean`, `Environment.lean`, `Store.lean`, `Tc/Verify/` | Content-addressed Lean names, levels, expressions, environments, and disk store | Individual checker theorems/audits exist; the audit source explicitly records native axioms and `typingDebt` allowances | Native BLAKE3/Rust boundary; audited axiom allowances; pre-alpha source status | Raw `ByteArray` does not enforce the documented 32-byte address width; supplied store addresses are not a Git object-ID contract; language IR, not Git | High | **pattern / adapt** | Make digest width/algorithm intrinsic, verify address/content relation at the boundary, and replace Ix canonicalization with Git's mandated bytes |
| [Radiya.lean](https://github.com/argumentcomputer/Radiya.lean/tree/46898dd3172070bc7b9880b95300ea11703e2b72/src/Radiya/Content) | `46898dd3172070bc7b9880b95300ea11703e2b72` | MIT | Lean nightly `2022-05-10` | `Content/Cid.lean`, `Expr.lean`, `Env.lean`, `ToIpld.lean` | Typed CID wrappers and an IPLD/DAG-CBOR graph of Lean syntax | No theorem declarations surfaced in the content modules; tests are executable/snapshot evidence | CID/IPLD/DAG-CBOR libraries; archived old Lean toolchain | Codec-tagged Lean syntax graph, not Git; substantial porting drift | High | **pattern** | Preserve typed address roles, but define current-toolchain carriers and Git-specific codecs from primary Git formats |
| [`btc-verified` Merkle spec](https://github.com/ProofOfKeags/btc-verified/blob/6edb4527204b320d7e4499158c5cf9e2d93e6bdd/BtcVerified/Crypto/Merkle.lean) and [Bitcoin Core implementation proof](https://github.com/ProofOfKeags/btc-verified/blob/6edb4527204b320d7e4499158c5cf9e2d93e6bdd/BtcVerified/Impl/BitcoinCore/Merkle.lean) | `6edb4527204b320d7e4499158c5cf9e2d93e6bdd` | Apache-2.0 | Lean `v4.30.0-rc2` | `root_binding_of_length_eq`, `root_binding_of_canonical`, `computeRoot_eq_root` | Proof pattern for commitment binding and specification/implementation separation | Equal canonical roots imply equal lists **or** an explicit `Sha256.Collision`; procedural root computation equals the specification | Lean kernel plus the source's SHA-256 model; theorem conclusion retains the collision alternative | Bitcoin transaction Merkle trees, not a CAS store or Git graph | Medium | **pattern** | State Git/Foldlab address uniqueness with an explicit digest-collision alternative; separately prove executable hashing/encoding refines the specification |

## Lean 4 metaprogramming references

Use source-matched material before ecosystem tutorials:

1. **Official Lean 4 source, `819816b2…` (Apache-2.0).**
   [`doc/examples/ICERM2022/meta.lean`](https://github.com/leanprover/lean4/blob/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/doc/examples/ICERM2022/meta.lean)
   is a compact worked example. Read it beside the actual APIs in
   [`Lean.Meta.Basic`](https://github.com/leanprover/lean4/blob/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/src/Lean/Meta/Basic.lean),
   [`Lean.Elab.Macro`](https://github.com/leanprover/lean4/blob/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/src/Lean/Elab/Macro.lean),
   [`Lean.Elab.Quotation`](https://github.com/leanprover/lean4/blob/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/src/Lean/Elab/Quotation.lean),
   and [`Lean.Elab.Tactic.Basic`](https://github.com/leanprover/lean4/blob/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/src/Lean/Elab/Tactic/Basic.lean).
   This is the API authority for the Foldlab-pinned Lean release.
2. **[Lean reference manual](https://github.com/leanprover/reference-manual/tree/e6157b93205004412a9caa7edcc40c2abe9955b7/Manual),
   `e6157b93…` (Apache-2.0).** `NotationsMacros/Elab.lean`,
   `NotationsMacros/Delab.lean`, and `Tactics/Custom.lean` are maintained worked
   syntax, elaborator, delaborator, and tactic examples. Its current snapshot targets
   a newer Lean release; port examples through the source-matched API above.
3. **[Lean 4 metaprogramming book](https://github.com/leanprover-community/lean4-metaprogramming-book/tree/59e56eff3948ba2b4ae153a433beea1fd9130ec8/lean/main),
   `59e56eff…` (Apache-2.0).** Chapters `03_expressions.lean` through
   `09_tactics.lean`, especially `08_dsls.lean`, provide the most coherent tutorial
   sequence. It is a community tutorial, not the API specification, and its current
   snapshot also targets a newer Lean release.
4. **[SampCert extractor](https://github.com/leanprover/SampCert/tree/e85bd645ac21fd2a533bc77ce53d8962fece851a/SampCert/Extractor),
   `e85bd645…` (Apache-2.0, Lean `v4.33.1`).** `Extension.lean`, `IR.lean`,
   `Translate.lean`, and `Extraction.lean` show persistent environment extensions,
   custom attributes, reflection from Lean expressions into an application IR, and
   code emission in a project on the same Lean release. Unsupported/partial cases in
   the source remain boundary obligations; it is not a general extraction-correctness
   result.

## Programming-language-design references

| Source/path | Syntax discipline | Executable component | Formal result visible at the path | Why it matters / caution |
|---|---|---|---|---|
| Lean [`doc/examples/tc.lean`](https://github.com/leanprover/lean4/blob/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/doc/examples/tc.lean) | **Extrinsic**: raw terms plus a separate typing relation | Type inference/checking over raw syntax | Checker soundness/completeness lemmas relate the executable checker to the typing judgment | Small reference for raw/WF boundaries and a decidable admission checker |
| Lean [`doc/examples/interp.lean`](https://github.com/leanprover/lean4/blob/819816b2e0a3bf405af45ae5c7af2491d8f5bee6/doc/examples/interp.lean) | **Intrinsic**: expressions indexed by context/type | Total interpreter for the typed core | Typing is enforced by the expression indices; this is not an extrinsic preservation theorem | Clean contrast with `tc.lean`; the later factorial example contains `sorry`, so use the interpreter core rather than treating the whole file as proof-grade |
| [Lean4Lean](https://github.com/digama0/lean4lean/tree/3adf6da696960c671096243420be6ea0f04b686e/Lean4Lean) | Extrinsic Lean syntax with abstract typing theory and executable checker layers | `TypeChecker.lean`, environment and inductive processing | `Theory/Typing/Basic.lean` and `Verify/TypeChecker/` relate checker components to typing infrastructure | Deep study of a Lean kernel/typechecker architecture. Its README says the executable checker is derived from Lean's C++ kernel and may share bugs, so it is not independent validation |
| [Concrete](https://github.com/lambdaclass/concrete/tree/28a25a4e27fd2eaed5193e5f1c1454e06399506f) | Extrinsic surface/core/SSA layers with checked judgments | Parser, elaborator, lowering, SSA checks, proof-obligation machinery | `Concrete/Semantics/TypeJudgment.lean`, `Concrete/Proof/ObligationCore.lean`, and `Concrete/Proof/ProofSoundness.lean` expose local judgments/results | Useful parser → elaborator → typed core → SSA/evidence architecture; inspect theorem-by-theorem rather than inferring an end-to-end compiler-preservation claim |

## Reuse decision

- **Git:** from scratch for the semantic model and exact codecs; reuse Foldlab's
  generic node/codec/admission patterns only behind an explicit Git adapter.
- **CAS implementation:** adapt Alaya's operational decomposition where useful;
  use Ix and Radiya as patterns for typed content-addressed language graphs.
- **Proof shape:** pattern commitment claims after `btc-verified` by retaining an
  explicit collision alternative and separating specification from executable code.
- **Metaprogramming:** use the pinned Lean source as authority, the manual/book for
  pedagogy, and SampCert for a release-matched production example.
- **Language design:** use `tc.lean` and `interp.lean` to choose extrinsic versus
  intrinsic syntax deliberately; consult Lean4Lean and Concrete after that choice,
  not as dependencies by default.

The immediate design work should therefore specify four independent judgments:
Git object-byte validity, object-ID correctness, typed edge interpretation, and
repository completeness. Collapsing them into one “valid repository” predicate would
incorrectly reject legitimate shallow and promisor repositories and obscure which
guarantee each checker establishes.
