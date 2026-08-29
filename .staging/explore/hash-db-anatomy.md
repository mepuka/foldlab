# Comparative anatomy of content-addressed stores

*Probe, 2026-08-24. Written to give the lab a picture it can draw on a whiteboard: how the
**encoding layer**, the **term carrier**, and the **address** relate — grounded in how git,
Unison, IPFS/IPLD and Nix actually do it.*

**What this document is.** Sections 1–7 are comparative facts, receipted. Section 8 is a
single clearly-marked **straw** — a starting position for an argument, not a proposal, not a
requirement. Nothing here is ratified.

**Local knowledge this builds on** (read, not redone):

| Source | What it already establishes |
|---|---|
| `C:\Users\kokok\Dev\foldlab\.staging\e1\unison-hashing.md` | 717-line recipe of Unison V2 hashing, clone pinned @ `84b95a6` |
| `C:\Users\kokok\Dev\foldlab\.staging\e1\recovered\recovered-unison-sqlite-schema.md` | Unison's SQLite store shape, schema v26 |
| `C:\Users\kokok\Dev\foldlab\.staging\unison-fragment\Fragment\Stream.lean` | The lab's token-stream layer in Lean; `v2_stream_not_injective` proved; framed scheme `toBSF` drafted at §5 |
| `C:\Users\kokok\Dev\foldlab\.staging\explore\concrete-spine-feasibility.md` | Concrete's Core IR compiles at v4.33.1; its fingerprints embed binder names |

---

## 1. The universal three-layer picture

Every system in this document is the same three functions stacked, plus two maps beside
them. Draw it once and the rest of the document is bookkeeping.

```
        ┌───────────────────────────────────────────────────────┐
  (a)   │  CARRIER            the typed value being addressed   │
        │                     AST node · record · file bytes    │
        └────────────────────────────┬──────────────────────────┘
                                     │   encode
                                     ▼
        ┌───────────────────────────────────────────────────────┐
  (b)   │  ENCODING           canonical bytes                   │
        │                     ◄── INJECTIVITY LIVES HERE        │
        └────────────────────────────┬──────────────────────────┘
                                     │   digest
                                     ▼
        ┌───────────────────────────────────────────────────────┐
  (c)   │  ADDRESS            fixed-width digest                 │
        │                     ◄── COLLISION-RESISTANCE          │
        │                         IS *ASSUMED* HERE             │
        └───────────────────────────────────────────────────────┘

  STORE  :  address ───────────────► encoded bytes
            (the one map that must be total: every address you hand out
             must be resolvable back to the bytes it names)

  NAMES  :  name ──────────────────► address
            (many names → one address; mutable; BESIDE the store, never inside it)
```

### 1.1 Why the split matters — the conditional you are actually buying

The property everybody wants is:

> **distinct carriers get distinct addresses.**

Write `address = digest ∘ encode`. Injectivity of a composite needs both halves, and the two
halves have completely different epistemic status:

| Layer | Property needed | Status |
|---|---|---|
| (b) `encode` | injective | **provable** — finite case analysis over a finite constructor set |
| (c) `digest` | injective | **false** by pigeonhole (infinite domain, 512-bit codomain) |
| (c) `digest` | collision-*resistant* | **assumed** — nobody proves it; you inherit SHA3-512's standing |

So the honest end-to-end claim is always conditional: *if* the digest is collision-resistant
*and* the encoding is injective, then distinct carriers get distinct addresses.

The teaching payload of this whole document is the failure mode when the *first* conjunct is
the one that breaks:

> If `encode` is not injective, the cryptographic assumption buys you **nothing at that
> point**. Two distinct carriers produce byte-identical input, so they produce an identical
> digest *necessarily* — not by a lucky collision, but by arithmetic. No amount of
> hash-function strength is relevant. The collision is free, reproducible, and cheap to
> construct by hand.

That is not hypothetical. Section 3 places two shipped Unison defects at exactly this spot.

### 1.2 Three recurring sub-questions

Each system answers these differently, and the answers are the interesting comparative
material:

1. **Where do you put framing?** Self-delimiting codes (length prefixes, discriminator
   bytes) are what make (b) injective. Systems that skip framing lean on an *unwritten
   discipline* instead.
2. **How do children enter a parent?** Either **inlined** (the child's bytes appear in the
   parent's bytes) or **by reference** (the child's *address* appears in the parent's bytes —
   the Merkle move). The second is what makes the store a DAG instead of a pile.
3. **What is deliberately excluded?** Names, source spans, formatting, storage-local ids.
   Everything you exclude is a normalization you must then defend.

---

## 2. Git

Git is the cleanest exhibit because the three layers are separable by hand with a shell and
a SHA-1 implementation — which is exactly what was done below.

**Receipts.** Scratch repos at
`…\scratchpad\gitdemo2` (SHA-1) and `…\scratchpad\gitdemo256` (SHA-256), `git version
2.55.0.windows.2`, `commit.gpgsign=false`, `core.autocrlf=false`, fixed commit dates
`2000-01-01T00:00:00 +0000`. Single file `hello.txt` containing the 6 bytes `hello\n`.

### 2.1 The three layers

```
  CARRIER    blob        = an uninterpreted byte sequence (file contents)
             tree        = a sorted list of (mode, name, child-address)
             commit      = tree-address + parent-addresses + author + committer + message
             tag         = (annotated tags; same shape, omitted here)

  ENCODING   "<type> <bytelength>\0" ++ <body>        ◄── the whole scheme, one line
             ── body for blob:   the bytes, verbatim
             ── body for tree:   repeated: "<octal-mode> <name>\0" ++ <20 raw digest bytes>
             ── body for commit: newline-separated "<key> <value>" headers, blank line, message

  ADDRESS    SHA-1 of that byte string (SHA-256 in the newer object format)
```

Note what the header does: `"<type> <len>\0"` is a **type tag plus a length frame**. Git
puts framing at the very top of the encoding, and gets a lot of injectivity for one line of
design.

### 2.2 First-hand receipts — reconstructing every address by hand

**Blob.** Body = `hello\n` (6 bytes). Pre-image = `blob 6\0hello\n`:

```
62 6c 6f 62 20 36 00 68 65 6c 6c 6f 0a          "blob 6\0hello\n"
SHA-1 → ce013625030ba8dba906f756967f9e9ca394464a
git   → ce013625030ba8dba906f756967f9e9ca394464a     ✔ match
```

**Tree.** `git cat-file tree` body is 37 bytes, and it is *binary* — the child address is 20
raw bytes, not 40 hex characters:

```
31 30 30 36 34 34 20 68 65 6c 6c 6f 2e 74 78 74 00   "100644 hello.txt\0"
ce 01 36 25 03 0b a8 db a9 06 f7 56 96 7f 9e 9c a3 94 46 4a   ← the blob address, raw

pre-image = "tree 37\0" ++ those 37 bytes
SHA-1 → aaa96ced2d9a1c8e72c56b253a0e2fe78393feb7
git   → aaa96ced2d9a1c8e72c56b253a0e2fe78393feb7     ✔ match
```

This is sub-question (2) from §1.2 answered: git enters children **by reference**. The tree's
bytes contain the blob's *address*, never the blob's bytes.

**Commit.** Body is 156 bytes of ASCII:

```
tree aaa96ced2d9a1c8e72c56b253a0e2fe78393feb7
author probe <probe@foldlab.local> 946684800 +0000
committer probe <probe@foldlab.local> 946684800 +0000

one

pre-image = "commit 156\0" ++ body
SHA-1 → 9de6e5fd7d7bdc98c9a2e950da2de77c7d51af35
git   → 9de6e5fd7d7bdc98c9a2e950da2de77c7d51af35     ✔ match
```

Here the commit is *textual* where the tree was *binary* — the child address appears as 40
hex characters. Git's encoding is not uniform across carriers; each carrier has its own
hand-rolled format under one shared header.

**Accidental receipt.** A mistyped command computed the pre-image `"tree 0\0"` (empty body)
and produced `4b825dc642cb6eb9a060e54bf8d69288fbee4904` — git's well-known empty-tree hash.
The header scheme reproduces even the degenerate case.

### 2.3 The SHA-1 → SHA-256 transition, demonstrated

This is the single most useful experiment in the document for the lab's purposes, because it
isolates layer (c) from layers (a) and (b).

`git init --object-format=sha256`, same file, same content:

```
                          SHA-1 repo                     SHA-256 repo
 blob   ce013625030ba8dba906f756967f9e9ca394464a   2cf8d83d9ee29543b34a87727421fdecb7e3f3a183d337639025de576db9ebb4
 tree   aaa96ced2d9a1c8e72c56b253a0e2fe78393feb7   c7187e8fdb691b3a692e5f3f0bbcb6359e5046285225f18f9773d4fe54268c55
 commit 9de6e5fd7d7bdc98c9a2e950da2de77c7d51af35   4033fe175889162199df882409f157ede919464916e2861bbfbb855b544fe7b7
```

Verified by hand: `SHA-256("blob 6\0hello\n") = 2cf8d83d9ee29543b34a87727421fdecb7e3f3a183d337639025de576db9ebb4`
— **byte-identical pre-image, different digest function.** Layer (b) did not change at all.

Two facts fall out that a design must absorb:

- **The blob's encoding is unchanged; the tree's is not.** Tree body grew **37 → 49 bytes**,
  because the embedded child address is now 32 raw bytes instead of 20. Changing the digest
  changes the *size* of every reference, so every carrier that embeds an address has its
  encoding perturbed downstream. Layer (c) is not as cleanly separable as it first looks.
- **The choice is per-repository and recorded as an extension**, not per-object:
  `git config extensions.objectformat` → `sha256`. There is no address prefix saying which
  function produced a given hash; the *repository* declares it once. Compare §7.1.

This is the **flag-day** design: no versioning inside the address at all. A SHA-1 repo and a
SHA-256 repo are different universes, and interoperation is a conversion, not a lookup.

### 2.4 Storage vs model — packfiles

The model above says nothing about disk. Loose-object storage is one file per address,
zlib-deflated, sharded by the first byte of the hex digest:

```
.git/objects/ce/013625030ba8dba906f756967f9e9ca394464a
.git/objects/aa/a96ced2d9a1c8e72c56b253a0e2fe78393feb7
.git/objects/b0/e7b6055bc5b7c38bdbb6bd9c96638400380f3d
```

The two-character directory prefix exists to keep directory sizes tractable on ordinary
filesystems. It carries no meaning.

**Packfiles** replace many loose objects with one compressed file plus an index, and store
some objects as *deltas* against others. This is entirely a storage-layer concern:

> Delta encoding is invisible to the address. An object's address is always the digest of its
> full canonical pre-image, never of its delta representation. `git cat-file` reconstitutes
> the full object before you ever see it.

That separation is worth naming explicitly, because Unison makes the same split
(§3.4) and it is the thing that lets you change storage without a hash migration. **The
address commits you to an encoding, not to a storage format.**

### 2.5 Refs — the name layer

```
.git/refs/heads/main  →  9de6e5fd7d7bdc98c9a2e950da2de77c7d51af35
.git/HEAD             →  ref: refs/heads/main
```

A ref is a **mutable file containing an address**. That is the entire mechanism. Branches,
tags, `HEAD`, remotes — all the same. Consequences:

- Names are **outside** the object graph. Nothing in a commit's bytes says what branch it is
  on, so renaming a branch changes no addresses.
- Refs are the **only** mutable thing in git, and they are the sole entry point for garbage
  collection: an object is reachable iff some ref reaches it.
- `HEAD` shows the pattern nests — a name can point at a name.

---

## 3. Unison

Unison is the exhibit that matters most, because it addresses *code* rather than files, and
because it has two shipped defects that sit at precisely the place §1.1 warned about.

All structural facts below come from the local recipe
(`.staging\e1\unison-hashing.md`, clone pinned @ `84b95a6`) and were spot-checked against the
clone where cited.

### 3.1 The three layers

```
  CARRIER    an ABT — abstract binding tree
             data ABT f v r = Var v | Cycle r | Abs v r | Tm (f r)
             where f is the language's base functor (TermF / TypeF / declaration F)
             Binders are NAMED in memory; names are erased at encode time.

  ENCODING   two sub-stages, and this is the important structural difference from git:

             (b1) TOKENIZE:  carrier ──► [Token]
                  Token = Tag Word8 | Bytes ByteString | Int Int64 | Text Text
                        | Double Double | Hashed Hash | Nat Word64

             (b2) SERIALIZE: [Token] ──► bytes,  by concatenation
                  Tag b     →  1 naked byte, no frame
                  Bytes bs  →  8-byte BE length ++ bs
                  Text t    →  8-byte BE UTF-8 *byte* length ++ UTF-8 bytes
                  Int/Nat/Double → 8 bytes BE, fixed width
                  Hashed h  →  64 raw bytes, NO length frame

  ADDRESS    SHA3-512 over  0x02 ++ serialize(tokens)   — 64 bytes, untruncated
             0x02 = `hashingVersion = Tag 2`, prepended inside `accumulate` itself,
             i.e. once per hashed NODE, not once per definition.
             Displayed as lowercase unpadded base32hex (alphabet 0-9a-v), 103 chars.
```

Two features have no git counterpart:

- **Alpha-invariance is built into the encoder.** `Abs v r` — the binder — **emits no tokens
  at all**. It only pushes its variable onto an environment. `Var v` emits the De Bruijn
  *index* of that variable. So binder names are erased structurally rather than normalized
  away by a pass. Renaming `x` to `y` inside a term is invisible to the address by
  construction.
- **Children enter by reference, via re-hashing.** `instance Tokenizable [a]` is
  `tokens = map accumulateToken` where `accumulateToken = Hashed . hashTokenizable`. Each
  list element is hashed to its own 64-byte digest first, and the *digests* are concatenated.
  This is git's tree move, but applied at every structural level, not just at directories.

### 3.2 The store

```
  base32 text  ──►  hash.id  ──►  object.id  ──►  object.bytes
                        │                             │
                   hash_object                        └── a DIFFERENT codec:
                   (+ hash_version)                       tag bytes + varints,
                                                          with database-local ids
```

SQLite, schema version 26. The essential fact, already established locally, deserves
repeating here because it is the same lesson as git's packfiles in a sharper form:

> **The hashing codec and the storage codec are two different formats in two different
> packages.** `codebase-sqlite` deliberately does not depend on the hashing package; it
> receives a `HashHandle` record of hashing functions instead. You *cannot* re-hash a
> definition from `object.bytes` alone — you must decode it, resolve its `LocalIds` against
> the `text` and `object` tables, convert to the hashing types, then tokenize.

That is a stronger separation than git's, and it has a cost: **integrity verification is
expensive.** Git can re-hash an object straight off disk; Unison must run a whole conversion
pipeline. Note this when §8 gets to re-hash-on-read.

`hash_object.hash_version` exists specifically so a future hash-algorithm change is
non-destructive — many hashes may map to one object, never the reverse. Today it is
degenerate: every row is stamped `2`, hardcoded, duplicating `object.primary_hash_id`. It is
a **prepared migration seam that has been used exactly once** (V1→V2), and the V1 rows were
then purged.

### 3.3 Names as metadata

Names live in *namespace objects*, which are themselves separately-hashed values. A namespace
maps name segments to referents; history is a `causal` spine of `(self_hash, value_hash)`
plus a `causal_parent` edge table.

The separation is exact and is the property the lab wants:

> **Renaming a definition produces a new namespace hash. The definition's own hash is
> untouched.** One hash can carry many names — the in-tree transcript
> `ability-order-doesnt-affect-hash.md` shows two names `term1, term2` listed against the
> single hash `#42m1ui9g56`.

This is git's refs idea taken further: the name map is itself content-addressed and
versioned, so *the history of naming* is a first-class addressable object rather than a
mutable file. The derived `scoped_*_name_lookup` tables are a cache of this, and appear
dormant at HEAD.

### 3.4 Defect #3509 — an injectivity failure in layer (b)

**The symptom.** Issue [unisonweb/unison#3509](https://github.com/unisonweb/unison/issues/3509),
titled *"The empty ability has the same hash as the empty data decl"*, still **open**. These
two declarations receive the same address:

```unison
structural type    Void =
structural ability Void where
```

**The root cause, read first-hand from the clone.** In
`unison-hashing-v2\src\Unison\Hashing\V2\DataDeclaration.hs`:

```haskell
type Decl v a = Either (EffectDeclaration v a) (DataDeclaration v a)

newtype EffectDeclaration v a = EffectDeclaration
  { toDataDecl :: DataDeclaration v a }
```

An ability *is* a data declaration wearing a newtype. The distinguishing information is the
`Left`/`Right` of that `Either` — exactly one bit. And `hashDecls0` takes
`Map v (DataDeclaration v ())`, not `Map v (Decl v a)`. The bit is not in the encoder's
domain.

Where does the bit go? `parser-typechecker\src\Unison\Hashing\V2\Convert.hs:251-267`, with
the source's own comment naming the manoeuvre:

```haskell
hashDecls memDecls = do
  -- want to unwrap the decl before doing the rehashing, and then wrap it back up the same way
  let howToReassemble = memDecls <&> \case
        Left  {} -> CT.Effect
        Right {} -> CT.Data
      memDeclsAsDDs = Memory.DD.asDataDecl <$> memDecls
  result <- hashDataDecls memDeclsAsDDs
  ...  retag ct decl
```

The tag is **stripped, parked in a side map, and re-attached after hashing.** It is routed
*around* the encoder, by design, to keep the hashing types simple.

**Placing it on the picture.** This is not a cryptographic event. It is layer (b) losing
information:

```
   CARRIER          Left (EffectDeclaration d)          Right d
                              │                            │
                    encode ──►│                            │◄── encode
                              ▼                            ▼
   ENCODING              ┌─────────────────────────────────────┐
                         │   IDENTICAL BYTE STRING             │  ◄── the defect is HERE
                         └────────────────┬────────────────────┘
                                          │ SHA3-512
   ADDRESS                        ┌───────▼────────┐
                                  │  one address   │   collision guaranteed by arithmetic,
                                  └────────────────┘   not by luck
```

SHA3-512 performed flawlessly. It was handed one input and returned one output. The
collision-resistance assumption was never even engaged, because the two carriers never
became two byte strings.

**The lab's Lean fragment already proves the same shape one layer lower.**
`Fragment\Stream.lean` line 76:

```lean
theorem v2_stream_not_injective :
    ∃ ts us : List Token, ts ≠ us ∧ serialize ts = serialize us :=
  ⟨[.int 5], [.nat 5], by decide, rfl⟩
```

`Int 5` and `Nat 5` are different tokens, byte-identical on the wire, because `toBS` emits no
discriminator for either. And worse, cross-*arity*: eight `Tag 0` tokens serialize identically
to one `Int 0`. What keeps the real system alive is an **unwritten discipline** — each
`Tokenizable` instance is supposed to emit token shapes no other type can produce — and
**nothing checks that discipline**. #3509 is that discipline failing one layer up.

### 3.5 Defect #2787 — a canonicalization failure in layer (b)

**The symptom.** `IncompleteElementOrderingError`, cited in the source at
`unison-hashing-v2\src\Unison\Hashing\V2\ABT.hs:35` and
`codebase-sqlite\U\Codebase\Sqlite\HashHandle.hs:35` — both point at
[unisonweb/unison#2787](https://github.com/unisonweb/unison/issues/2787) with the comment
*"two or more component elements can not be completely ordered with respect to one another"*.

**The mechanism.** A mutually recursive group has no intrinsic order, so the encoder must
*manufacture* one. Unison's method is elegant: hash every member in an environment where all
the cycle's names occupy **one shared De Bruijn slot**, so no member can tell its siblings
apart. That first pass is genuinely order-independent. Then sort members by those hashes —
that sorted order is the canonical form — and re-hash in the now-distinguished environment.

It works unless **two members tie**: structurally identical modulo their own names. Then the
sort key does not determine the order. Haskell's `sortOn` is stable, so the order falls back
to input order, which is `Map.toList` order, which is `Ord v` order **on the names**.

**Placing it on the picture.** This is the *dual* of #3509:

```
   #3509   carrier has a bit the encoder DROPS
           many carriers ──► one byte string          (encoder not injective)

   #2787   carrier is an alpha-equivalence class, and the encoder
           ADMITS information that class does not contain
           one carrier ──► many possible byte strings, chosen by name order
                                                       (encoder not a function of the
                                                        intended carrier)
```

Both are layer (b). One under-specifies, one over-specifies. Neither is a digest problem, and
neither is fixable at layer (c).

Note what leaks: **names**, the exact thing the ABT design erased in §3.1. The
alpha-invariance guarantee is not unconditional — it holds *except* on tied cycles. Unison's
handling is honest but blunt: emit a warning, and `crashOnHashingWarning` turns it into a
thrown exception at most call sites, telling the user to restructure their code. The
`hashCycle` path for let-rec blocks **deliberately discards** the warning.

An unresolved sibling, flagged in the local recipe's open questions: `DataDeclaration.hs:88`
sorts constructors by type-hash with the same stable `sortOn`, and **no warning is emitted
there at all** — two constructors with identical types appear to be silently ordered by name.

### 3.6 What the lab should take from Unison

| Take | Leave |
|---|---|
| Binder erasure inside the encoder (`Abs` emits nothing, `Var` emits an index) — alpha-invariance by construction, not by a pass | Unframed token serialization; the discipline is unwritten and unchecked |
| Merkle-by-reference at every structural level, not just at containers | Routing carrier information *around* the encoder for convenience (#3509) |
| Names strictly outside definition hashes; the name map itself content-addressed | Canonical orders whose sort key can tie without a total tiebreak (#2787) |
| A prepared version seam (`hash_version`) before you need it | Hashing codec so distant from the storage codec that re-hash-on-read is expensive |

---

## 4. IPLD / IPFS

IPFS is the exhibit for **self-describing addresses**. Everything git decides once per
repository, IPFS decides once per object and writes the decision into the address itself.

### 4.1 The three layers

```
  CARRIER    the IPLD Data Model: nine kinds —
             null · boolean · integer · float · string · bytes · list · map · link
             `link` is a CID: a pointer to another block.

  ENCODING   a *codec*, named in the address. DAG-CBOR is the canonical one:
               · no tags except the CID tag (42)
               · integer encoding must be as short as possible
               · length encoding for major types 2–5 must be as short as possible
               · map keys sorted byte-wise lexically, including major type and length
               · map keys must be STRINGS — ints are not permitted as keys
               · floats always encoded 64-bit
             Stated goal: "a single, canonical way of encoding any given set of data,
             and encoded forms contain no superfluous data."

  ADDRESS    a CID.  CIDv1 layout:

             <multibase-prefix> <multicodec-cidv1> <multicodec-content-type> <multihash>
                    │                   │                    │                   │
              how the string      version = 0x01        WHICH CODEC        the digest itself,
              is base-encoded                           produced these     itself self-describing:
              (not part of the                          bytes             <fn-code><length><digest>
               binary form)
```

CIDv0 is the legacy shape: `cidv0 ::= <multihash-content-address>` with base58btc and the
`dag-pb` codec both *implicit*. CIDv1 made both explicit — which is itself the lesson.

### 4.2 What the self-describing address buys

A CID answers, without any external context:

1. **Which hash function**, and at what digest length (the multihash prefix).
2. **Which codec** produced the bytes (the multicodec content type) — so a receiver knows how
   to *interpret* the block, not merely how to check it.
3. **Which CID version**, so the format itself can evolve.

Contrast with git (§2.3), where `extensions.objectformat` lives in the repository config and
an object's hex string is context-free — you cannot tell a SHA-1 from a truncated SHA-256 by
looking at it, and you certainly cannot tell what encoder produced the pre-image.

**Hash-function agility is the headline.** With CIDs, migrating to a new digest is not a
flag day. Old CIDs stay valid and resolvable; new writes use the new function; both live in
the same store, and the store can tell them apart mechanically. Compare Unison, which needs
a full codebase migration and a `hash_version` column, and git, which needs a separate
repository.

### 4.3 What it costs

Honest ledger — these are real, and the lab should weigh them:

- **Addresses get longer and stop being fixed-width.** A CID is a variable-length
  byte string, not a 64-byte digest. Every store index, every embedded reference, every
  equality check now handles variable width.
- **Address equality is no longer content equality.** The same bytes hashed with SHA-256 and
  with BLAKE3 yield two different CIDs that both correctly name the same content. So
  "same address ⟺ same content" degrades to "same address ⟹ same content", and
  deduplication is no longer automatic. You may hold the same object twice under two names.
  CIDv0/CIDv1 already exhibit this: the same dag-pb block has both a v0 and a v1 CID.
- **The multicodec table is an external registry.** Your address's meaning depends on a
  numbering scheme maintained elsewhere. That is a governance dependency, not a technical
  one, but it is real.
- **Agility invites divergence.** If writers may choose their digest, a network can partition
  into cohorts that cannot deduplicate against each other.

### 4.4 Blocks, and where acyclicity comes from

A **block** is one encoded byte string plus its CID. The data model *within* a block is built
from `list` and `map` — recursive kinds that nest, with no construct for a back-reference.
So within a block the value is a **tree**, and cycles are simply not expressible.

*Across* blocks, links are CIDs. Here the acyclicity is not a rule anyone had to write down
— it is forced:

> To make block A link to block B, A's bytes must contain B's CID, so B must already exist
> and be hashed. A cycle A→B→A would require A's digest to be computed from bytes that
> already contain A's digest. That is a fixed point of the hash function on its own output.
> Constructing one is exactly a preimage attack.

**Content addressing forbids cycles for free.** This is the single most important structural
fact for §7.2 and for the lab's core calculus, and it is why every system here handles
recursion by some *other* mechanism: git forbids it outright; Unison manufactures a component
and addresses members by `(component hash, index)`; IPLD tells you to model the cycle inside
one block or use an indirection.

---

## 5. Nix

Nix is here for one reason: it introduces an axis the other three do not have. Nix addresses
things *whose bytes do not exist yet*.

### 5.1 The three layers

```
  CARRIER    a store object: a whole filesystem tree (a directory, a file, a symlink)

  ENCODING   NAR — the Nix Archive format. A canonical serialization of a filesystem tree:
             directory entries in sorted order, no timestamps, no owners, no inode data.
             Everything that varies between two builds of the same thing is excluded.

  ADDRESS    a store path.  Layout:

               store-path  =  store-dir "/" digest "-" name
               digest      =  base-32 of the FIRST 160 BITS of SHA-256(fingerprint)
               fingerprint =  type ":" "sha256" ":" inner-digest ":" store ":" name

             type ∈ { "text",             — text with optional store-path references
                      "source",           — NAR serialization, SHA-256 only
                      "output:<id>" }     — a derivation output
```

Three details worth noticing before the main point:

- **The digest is truncated** — 160 of 256 bits, rendered as 32 base-32 characters. Nix
  deliberately trades collision margin for path length, because these strings go in `PATH`,
  in shebangs, in `RPATH` headers. The lab has a related decision at §8: 64-byte SHA3-512
  displays as 103 base32hex characters.
- **The name is inside the fingerprint.** Unlike every other system here, the human-readable
  name is *part of the pre-image*. `hello-2.12` and `hello-2.13` with byte-identical content
  get different store paths. Nix deliberately fuses the name layer into the address layer.
- **The type string is a domain separator.** `"text:"` vs `"source:"` vs `"output:id"`
  guarantees the three address kinds cannot collide even given identical inner digests.
  Compare git's `"blob "` / `"tree "` / `"commit "` header — the same trick.

### 5.2 The axis: input-addressed vs content-addressed

This is the part worth teaching.

```
  CONTENT-ADDRESSED           address = digest( encode( the artifact ) )
                              "this names what the thing IS"
                              → git, Unison, IPFS, restic, and Nix's `source:` paths

  INPUT-ADDRESSED             address = digest( encode( the RECIPE for the artifact ) )
                              "this names what was ASKED FOR"
                              → Nix's classic `output:` paths
```

A classic Nix build output's store path is computed from its **derivation** — the full
recipe: every input path, the builder, its arguments, its environment — *before the build
runs*. The output's own bytes contribute nothing to its address.

That is a startling design if you have only seen content addressing, so state the trade
plainly:

| | Input-addressed | Content-addressed |
|---|---|---|
| Address known… | **before** the artifact exists | only **after** |
| Change a compiler flag | new address, always | new address only if output bytes differ |
| Two recipes, identical output | two addresses, **no dedup** | one address, dedup free |
| "Address ⇒ content" | holds only if builds are deterministic — an **assumption about the world** | holds by construction |
| Early cutoff (stop rebuilding downstream when a rebuild reproduces identical output) | impossible | possible |
| Can you plan the whole build graph up front? | **yes** | no — each step's address depends on the previous step's result |

The last row is why Nix chose it. You can compute the entire dependency closure's paths, ask
a remote cache "do you have these?", and substitute binaries — all before running anything.
Content addressing cannot do this: you would have to build a thing to learn its name.

The cost is that Nix's central integrity claim ("same path ⇒ same content") is **not a
theorem, it is a hope about build determinism** — which is precisely why reproducible-builds
work matters so much in that ecosystem, and why Nix has been growing content-addressed
derivations as an alternative.

### 5.3 What the lab should take from Nix

- **The domain-separator prefix.** `type ":"` in the fingerprint, like git's `"<type> "`
  header, makes address kinds non-collidable for one byte of design. The lab's spine will
  have several carrier kinds (term, type, module, name-map); separate them in the pre-image,
  not by convention.
- **Truncation is a knob, and it is a real cost.** Nix chose 160 bits for ergonomics. The
  lab's SHA3-512 gives 512. There is a legible middle. Whatever is chosen, it should be
  chosen deliberately and written down, not inherited by accident.
- **Know which axis you are on, per artifact kind.** For a *term* in a pure calculus,
  content addressing is obviously right. For anything the lab later wants to address that is
  the *result of running something* — a proof artifact, an elaboration output, a build — the
  input-addressed option is available and it buys plan-ahead. The two can coexist in one
  store, distinguished by the type prefix. Do not assume the whole store must pick one.
- **Do not fuse names into addresses.** Nix's choice to put the name in the fingerprint is
  driven by filesystem ergonomics the lab does not have. It costs Nix dedup and it is the
  opposite of §3.3. Take the separator, leave the name.

---

## 6. Two smaller exhibits

### 6.1 Content-defined chunking — addressing without a carrier

restic and bup address *file* data, and they do something the other systems do not: they
choose the boundaries of what to address, using the data itself.

```
  A file is split by a rolling hash (Rabin fingerprint, 64-byte sliding window).
  A boundary is declared wherever the rolling hash hits a chosen bit pattern.

  restic's parameters: files < 512 KiB are not split; blobs range 512 KiB – 8 MiB,
  targeting 1 MiB average. The irreducible polynomial is chosen at random per
  repository and stored in `config`, so watermark attacks are much harder.

  Each chunk is then addressed by SHA-256 of its content, and repository files are
  named by the lowercase hex of that digest.
```

The point of interest is *why* boundaries are content-defined. Fixed-size blocks are useless
for dedup: insert one byte at the front of a file and every subsequent block shifts, so every
address changes. Content-defined boundaries move *with* the data — insert a byte and only the
chunk containing it changes.

**In the three-layer picture, this is a degenerate but instructive case:**

```
  CARRIER    (none) — the chunk has no type, no structure, no constructors.
             It is a byte range, and the *choice of range* is itself computed
             from the bytes.
  ENCODING   the identity function.
  ADDRESS    SHA-256 of the bytes.
```

Layer (b) collapses to identity, so injectivity is trivial and there is *nothing to get
wrong*. All the design effort has migrated into choosing carrier boundaries. This is the
opposite end of the spectrum from Unison, where the carrier is richly typed and essentially
all the difficulty is in layer (b).

**Take for the lab:** where a carrier is genuinely unstructured bytes (a literal, a resource,
a proof term serialized by someone else), do not invent structure for it — identity-encode
and address. Reserve the framed encoding for the typed core. The per-repository random
polynomial is also a nice reminder that a *store* can carry parameters that are not part of
any address.

### 6.2 Pijul — addressing changes instead of states

Every other system here addresses **states**: a snapshot, a term, a filesystem tree. Pijul
addresses **changes**, and the difference reaches all the way into the address layer.

- Vertices are *"uniquely identified, by the hash of the change that introduced them, along
  with a position in that change"* — note the shape: `(change hash, position)`, structurally
  the same move as Unison's `ReferenceId = (component hash, Pos)`.
- The repository is *"append-only, in the sense that deletions are handled by a more
  sophisticated labelling of the edges"* — nothing is removed; edges are relabelled dead.
- The theory's core property: *"any two patches c0 and c1 that could be produced
  independently commute"* — applying them in either order yields the same repository.

That commutation forces something onto the address layer. If a state is a *set* of changes
and the order is meaningless, then, in Pijul's words, *"meaningful version identifiers must
be independent from the order."* An ordinary Merkle chain cannot do that — chaining is
inherently sequential, and `H(H(a) ++ b) ≠ H(H(b) ++ a)`. Pijul's answer is a **homomorphic
hashing scheme based on the discrete log problem**, so that a version identifier can be
combined from its parts commutatively while remaining unforgeable by a server.

**Take for the lab:** this is the sharpest available demonstration that *the algebra you want
over your objects constrains your digest*. Standard Merkle hashing gives you exactly one
operation — "hash this sequence" — and it is order-sensitive. Every system in this document
that wants order-*insensitivity* has to buy it at layer (b) by **sorting** (Unison sorts
cycle members and effect rows by their own hashes; DAG-CBOR sorts map keys byte-wise). Sorting
is the cheap answer and it has a known failure mode: **ties** — which is precisely §3.5.
Homomorphic hashing is the expensive answer that has no ties. The lab should know both exist
before it writes "sort by hash" into a spec.

---

## 7. Design axes extracted

Five axes, each with where the four systems land, and what the choice actually costs.

### 7.1 Address versioning

*"Given a bare address, can you tell which function produced it?"*

| System | Mechanism | Where the version lives |
|---|---|---|
| **git** | flag day | repository config: `extensions.objectformat`. Not in the address. |
| **Unison** | a version token *inside the pre-image* — `hashingVersion = Tag 2`, byte `0x02` prepended on **every** `accumulate` — plus a `hash_object.hash_version` column in the store | in the pre-image and in the store, **not** in the address |
| **IPFS** | multicodec + multihash prefix **inside the address** | in the address |
| **Nix** | the `type ":" "sha256" ":"` fields inside the fingerprint | in the pre-image |

The three positions are genuinely different, and the middle one is easy to miss:

```
  VERSION IN THE ADDRESS     (IPFS)
      ✔ old and new addresses coexist and are distinguishable; migration is not a flag day
      ✘ variable-width addresses; same content can hold two valid distinct addresses;
        dedup weakens; external registry dependency

  VERSION IN THE PRE-IMAGE   (Unison, Nix)
      ✔ costs one byte; guarantees a version bump changes EVERY address, so two
        versions can never produce the same digest for the same value
      ✔ fixed-width addresses preserved
      ✘ you cannot tell versions apart by looking; you need out-of-band knowledge
        (which is exactly why Unison also carries a `hash_version` COLUMN)

  VERSION NOWHERE            (git)
      ✔ simplest possible
      ✘ migration is a conversion of the entire repository
```

Unison's stated reason for the pre-image token is worth quoting in effect: if the hash
function changes and the version does *not* change all hashes, then two hashing versions could
produce identical digests for simple values and collide in the `hash` table. **A version
prefix in the pre-image is a domain separator between versions of yourself.** That is a
different job from IPFS's self-description, and a system can want both.

### 7.2 Acyclicity

| System | Cycles within one addressed unit | Cycles between units |
|---|---|---|
| **git** | not expressible | forbidden — a tree cannot contain itself |
| **IPLD** | not expressible (`list`/`map` nest; no back-reference kind) | forbidden by construction (§4.4) |
| **Unison** | **yes** — a `Cycle` node holds a whole mutually-recursive component | forbidden — cross-component refs are by `(hash, index)` |
| **Nix** | n/a | forbidden — a derivation's inputs are already-built paths |

The universal rule, and the reason for it, from §4.4: **a cycle between addressed units would
require a hash to be a fixed point of itself; constructing one is a preimage attack.** Content
addressing does not *forbid* cycles by policy — it makes them unconstructible.

So the real question is not "do you allow cycles" but **"how big is your addressed unit?"**
Unison's answer is the interesting one and the one the lab will need, because a language core
calculus has mutual recursion whether or not the designer wants it:

> **Make the strongly-connected component the unit of addressing.** One address for the whole
> group; members named `(component hash, index)`. Cycles live *inside* one unit, where they
> are ordinary data; the graph *between* units is acyclic by construction.

And then the bill arrives, which §3.5 is: the component has no intrinsic member order, so the
encoder must manufacture one, and manufacturing a canonical order out of hashes fails on
ties. **The cost of admitting cycles is that you owe a total, tie-free canonical order.**

### 7.3 Mutability escape hatches

Every append-only store needs exactly one mutable thing, or it is useless.

| System | The mutable thing | Granularity |
|---|---|---|
| **git** | refs — a file containing an address | one address per ref; no history of the ref itself (the reflog is local and unversioned) |
| **Unison** | causal spine + namespace objects; project-branch rows carry `causal_hash_id` | the name map is itself content-addressed and **its history is addressable** |
| **IPFS** | IPNS / DNSLink | one CID per name |
| **Nix** | GC roots, profile symlinks, channels | one path per root |

The pattern is uniform: **a name is a mutable cell containing an address.** Nothing more.

Unison's variation is the one worth stealing: it makes the *name map itself* a content-
addressed value, with a causal parent chain, so the mutable cell holds an address of a
*versioned* map rather than a bare pointer. Then "what were the names last Tuesday" is a
lookup, not an archaeology expedition. Git approximates this only for trees, not for refs.

### 7.4 Garbage collection vs append-only forever

| System | Policy |
|---|---|
| **git** | GC by reachability from refs; unreachable objects pruned after a grace period; `--prune` is real deletion |
| **Unison** | effectively append-only; the `causal` table references *hash* ids rather than object ids **specifically so values can be dropped while the history spine survives** |
| **IPFS** | pinning; unpinned blocks are collectable |
| **Nix** | GC roots; unrooted store paths deleted; this is the normal way to reclaim disk |

Two observations that matter for a design:

- **Reachability GC and content addressing interact badly with dedup across roots.** An
  object reachable from two roots must not be freed when one goes; every system solves this
  by tracing rather than refcounting.
- **Unison's `causal` design is the subtle one.** By making the history spine reference
  hash ids and not object ids, the spine can outlive the values. You keep a verifiable chain
  of *what happened* even after discarding *what it contained*. That is a real option for a
  lab store: append-only metadata, collectable payloads.

### 7.5 Store integrity verification

*"How do you check the store has not been corrupted, and how expensive is it?"*

| System | Check | Cost |
|---|---|---|
| **git** | `git fsck` — re-hash every object's pre-image and compare to its address | cheap: the pre-image is exactly what is on disk (post-inflate) |
| **Unison** | `verifyTermFormatHash` / `verifyDeclFormatHash` in the `HashHandle` | **expensive**: decode, resolve `LocalIds` against the `text`/`object` tables, convert to hashing types, tokenize, hash |
| **IPFS** | re-hash the block; the CID says which function to use | cheap and **self-contained** — the address tells you how to check it |
| **Nix** | `nix store verify`; for content-addressed paths re-NAR and hash. For **input-addressed** outputs there is nothing to re-derive from — you fall back to signatures | ranges from cheap to *impossible* |

The generalizable rule, and it points straight at §8:

> **Re-hash-on-read is cheap exactly to the degree that your stored bytes ARE your pre-image
> bytes.** Git and IPFS store the pre-image, so verification is one hash call. Unison stores a
> *different* encoding, so verification requires re-running the encoder — and re-running the
> encoder requires the whole conversion pipeline to be present and correct.

Nix's bottom row is the sharpest warning in this table: an input-addressed path has **no
self-check at all**. Its address is derived from a recipe, so corrupted content is
indistinguishable from correct content without an external signature. Choosing the
input-addressed axis (§5.2) means giving up local verifiability.

---

## 8. A STRAW for the lab's spine DB

> ⚠️ **This is a straw, not a proposal.** It exists to be argued with. Every choice below is
> made *so that there is something concrete to attack*, and each one names the systems that
> made the same call and the theorem that would guard it. Nothing here is ratified, and
> nothing here should be read as a requirement.
>
> **One thing is deliberately left blank.** The brief names a *six-constructor core
> calculus*. No document in this repository names those six constructors, and this probe will
> not invent them. The straw below is therefore written **parametrically over the constructor
> set** — which is also the honest engineering answer, since the encoding scheme should not
> care how many constructors there are. Where an example is needed, it is marked `‹placeholder›`.

### 8.0 The straw in one picture

```
   ┌─ CARRIER ──────────────────────────────────────────────────────────────┐
   │  Core : the six-constructor calculus            ‹constructor set TBR›  │
   │  Binders NAMED in memory, ERASED by the encoder (Unison's move)        │
   │  Unit of addressing = the strongly-connected COMPONENT (§7.2)          │
   └───────────────────────────────┬────────────────────────────────────────┘
                                   │  encodeF  — framed token scheme
                                   │            (Stream.lean §5, `toBSF`)
                                   ▼
   ┌─ ENCODING ─────────────────────────────────────────────────────────────┐
   │  every token opens with a discriminator byte                           │
   │  every variable-length payload carries an 8-byte BE length frame       │
   │  guard: F1 Peelable ⟹ F2 StreamInjective     ‹STATED, NOT YET PROVED›  │
   └───────────────────────────────┬────────────────────────────────────────┘
                                   │  0x01 ++ bytes,  then SHA3-512
                                   ▼
   ┌─ ADDRESS ──────────────────────────────────────────────────────────────┐
   │  64 bytes.  Version byte INSIDE the pre-image (Unison/Nix, not IPFS)   │
   │  guard: sha3_512_bridge  ‹PROVED›   collision resistance ‹ASSUMED›     │
   └───────────────────────────────┬────────────────────────────────────────┘
                                   ▼
   ┌─ STORE ────────────────────────────────────────────────────────────────┐
   │  append-only.  v0 substrate: directory-of-files (git loose objects)    │
   │  stores THE PRE-IMAGE BYTES, so re-hash-on-read is one hash call       │
   └────────────────────────────────────────────────────────────────────────┘
                                   │
   ┌─ NAMES ────────────────────────────────────────────────────────────────┐
   │  a separate map, beside the store, never inside it.                    │
   │  many names → one address.  renaming moves no addresses.               │
   └────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Carrier

**Straw: the core calculus term, with the strongly-connected component as the unit of
addressing; members named `(component address, index)`.**

- *Who else did this:* Unison (`ReferenceId = ReferenceId Hash Pos`), Pijul (`(change hash,
  position)`). Git and IPLD did **not** — they forbid cycles outright, which a language core
  cannot afford (§7.2).
- *Why:* mutual recursion is not optional in a calculus, and §4.4 shows a cycle *between*
  addressed units is unconstructible. Making the SCC the unit puts the cycle inside a unit
  where it is ordinary data.
- *What it costs, stated up front:* **an SCC has no intrinsic member order, so the straw owes
  a total, tie-free canonical order.** This is the exact bill §3.5 shows Unison failing to
  pay. Do not adopt "sort members by their own hashes" without a tiebreak; that *is* #2787.
  Candidate tiebreaks worth arguing about: refuse to hash a tied component (turn Unison's
  warning into a hard error everywhere, including let-rec); or add a total order derived
  from the component's *dependency structure* rather than from names; or accept a canonical
  renaming. This is an open design question, not a solved one.
- *Guard:* none yet. A `CanonicalOrderTotal` obligation would have to be stated.

**Straw: binder names erased inside the encoder, not by a prior pass.** `Abs` emits nothing;
`Var` emits an index.

- *Who else did this:* Unison. **Concrete did not** — `.staging\explore\concrete-spine-feasibility.md`
  establishes that Core IR binders are raw `String`s with no de Bruijn indices, and that both
  shipped digests (`bodyFingerprint`, `sourceBodyDigestV1`) embed binder names, so a user
  rename moves every digest. Concrete's own ROADMAP commits to alpha-invariance (R-0004 slice
  5) but that slice is **PENDING**.
- *Why this is a fork in the road:* if the lab's carrier is Concrete's Core IR as-is, alpha-
  invariance is *not* inherited — it must be built, and building it inside the encoder (Unison's
  way) is cheaper and more defensible than building it as a normalization pass.

**Straw: provenance excluded from the pre-image.** Spans, source paths, comments, formatting.

- *Who else did this:* all four systems. Unison drops ABT annotations; NAR drops timestamps
  and owners; git normalizes nothing but also stores nothing extraneous.
- *Concrete-specific note, already established:* `declSpan` and `CModule.sourceFile` are the
  provenance fields that would poison an address; body-level `CExpr`/`CStmt` nodes carry **no**
  spans, so the exclusion is a declaration-granularity cut, which is favourable.

### 8.2 Encoding

**Straw: the framed token scheme already drafted at `Fragment\Stream.lean` §5 — `toBSF`.**
Every token opens with a discriminator byte; every variable-length payload carries a length
frame.

```lean
def toBSF : Token → List UInt8
  | .tag b     => 0x00 :: [b]
  | .bytes bs  => 0x01 :: (be64 (UInt64.ofNat bs.length) ++ bs)
  | .int bits  => 0x02 :: be64 bits
  | .text s    => 0x03 :: (be64 (UInt64.ofNat s.utf8ByteSize) ++ s.toUTF8.toList)
  | .double b  => 0x04 :: be64 b
  | .hashed h  => 0x05 :: (be64 (UInt64.ofNat h.length) ++ h)
  | .nat n     => 0x06 :: be64 n
```

- *Who else did this:* git, at the object level — `"<type> <len>\0"` is a discriminator plus a
  length frame, and it is the whole scheme. DAG-CBOR, at every level — CBOR major types *are*
  discriminators and its canonical rules pin the rest. Nix, in the fingerprint's `type ":"`
  field. **Unison did not**, and that is #3509 and `v2_stream_not_injective`.
- *Guards, with honest status:*

  | Obligation | Statement | Status |
  |---|---|---|
  | `v2_stream_not_injective` | the *unframed* scheme is not injective | **PROVED** in `Stream.lean:76` — this is the motivation, a negative result |
  | `peelable_gives_injective` | peelable per-token codes ⟹ injective stream encoding | **STATED as a `Prop`**, not proved |
  | `obligation_F1` | `Peelable toBSF` | **STATED**, not proved. Noted as a 7×7 shallow case analysis needing `be64`-injectivity and length-frame cancellation; all core-library |
  | `obligation_F2` | `StreamInjective (List.flatMap toBSF)` | **STATED**; follows from F1 + the generic theorem, "ten lines given F1" |
  | `obligation_F3` | the framed encoding differs from V2's | **STATED**; the honest cost — any fix here changes every address |

- *The crucial scope caveat, already written into `Stream.lean` and worth carrying into every
  claim:* **stream-level injectivity is necessary but not sufficient.** F2 says distinct
  *token streams* give distinct bytes. It says nothing about whether the layer above
  tokenizes distinct *carriers* into distinct token streams — and that upper layer is exactly
  where #3509 lives. The straw therefore owes a **second** obligation, one layer up, which
  §8.6 names.

**Straw: children enter by reference (`.hashed`), not inlined.**

- *Who else did this:* all four. Git trees embed child digests; Unison's list instance hashes
  each element first; IPLD links are CIDs; Nix derivations reference input paths.
- *Why it matters beyond dedup:* it is what makes the store a DAG with sharing, and it is what
  makes §7.2's acyclicity argument apply.
- *One trap inherited from Unison and worth fixing in the straw:* in V2 the same `Hash` value
  encodes **two different ways** depending on which token carries it — `Hashed` is 64 raw
  bytes unframed, while `Bytes` is length-prefixed, and `Reference`'s instance uses `Bytes`
  while `Term`'s `hash1` uses `Hashed`. The framed scheme above already removes this by giving
  `.hashed` a length frame. Keep that.

### 8.3 Address

**Straw: `SHA3-512( version-byte ++ encodeF(carrier) )`, 64 bytes, untruncated. The version
lives in the pre-image, not in the address.**

- *Who else did this:* Unison (`hashingVersion = Tag 2`, byte `0x02`, prepended inside
  `accumulate`) and Nix (`type ":" "sha256" ":"` inside the fingerprint). **IPFS did not** —
  it puts the version in the address. **Git did not** — it has no version at all.
- *Why the pre-image and not the address, for a v0:* §7.1's ledger. In-address versioning buys
  hash-function agility and costs fixed-width addresses, automatic dedup, and an external
  registry dependency. A single-implementation language spine has little use for agility
  today and heavy use for fixed-width addresses. **But note the asymmetry: this decision is
  reversible in one direction only.** Starting with a pre-image version byte and later adding
  a CID-style wrapper is possible; starting without any version and later adding one is git's
  flag day.
- *Guards:*

  | Obligation | Status |
  |---|---|
  | `sha3_512_bridge : Impl.sha3_512 msg = Spec.sha3_512_bytes msg` | **PROVED** — `formal/fips202`, 67 theorems, axiom profile within `[propext, Classical.choice, Quot.sound]`, no `native_decide`, replayed under `leanchecker` on two architectures |
  | The digest is injective | **FALSE** — "false by counting", stated as not-claimed in the fips202 README |
  | The digest is collision-resistant | **ASSUMED, never proved** — explicitly listed among what fips202 does not claim |

  This is §1.1 made concrete: the lab has a *machine-checked* layer (c) implementation and an
  *assumed* layer (c) security property, so all the provable work is at layer (b). Every
  end-to-end statement must be written conditionally.

- *A useful precedent already in the corpus:* `sha3_ne_prefips_spec` proves the SHA-3 `01`
  domain-separation suffix actually changes the digest — i.e. the lab has already proved, once,
  that a prefix/suffix separator does its job. That is the shape of theorem a version byte
  wants, and it is worth asking whether `version_byte_separates` is provable in the same style
  rather than merely asserted.

- *Display:* Unison's lowercase unpadded base32hex (`0-9a-v`) gives 103 characters for 64
  bytes. Nix truncates to 160 bits for 32 characters because paths go in `PATH` and shebangs.
  **The straw does not truncate** — the lab has no filesystem-ergonomics forcing function, and
  truncation is the one layer-(c) decision that genuinely weakens the assumption. Truncate the
  *display* prefix for humans; never the stored address.

### 8.4 Store

**Straw: append-only, and for v0 a directory-of-files — git's loose objects.**

The honest trade table:

| | Directory of files | Single append-only log | SQLite |
|---|---|---|---|
| **Write** | one file create per object; atomic via write-temp-then-rename | one append; needs an offset index (in memory or a sidecar) | one INSERT; transactional |
| **Read by address** | filesystem lookup; sharded `ab/cdef…` to keep directories small | needs the index; O(1) once you have the offset | indexed lookup |
| **Atomicity / crash safety** | per-object only. No multi-object transaction. Torn writes possible without the rename dance | append is nearly atomic; a torn tail must be detectable and truncated on recovery | **real transactions**, the strongest of the three |
| **Concurrent writers** | works — same address means same bytes, so a racing duplicate write is harmless | needs a lock on the tail | handled |
| **Dedup** | free — the write is a no-op if the file exists | must check the index first, or accept duplicate appends | free via PK conflict |
| **Enumerate all objects** | directory walk | sequential scan — the best of the three | `SELECT` |
| **Deletion / GC** | trivial: unlink | **impossible without rewriting** — that is the point of an append log | `DELETE`, plus vacuum |
| **Inspectability** | highest — `ls`, `xxd`, any tool | low — you need a reader | medium — `sqlite3` shell |
| **Extra metadata (names, indices)** | needs a second mechanism | needs a second mechanism | already there, in the same transaction |
| **Dependency** | none | none | one C library |
| **Who chose it** | git, restic, Nix | (log-structured stores generally) | **Unison** |

*Straw reasoning for v0:* directory-of-files, because in a design whose whole point is
arguing about layers (a)–(c), the store should be the part you can inspect with `xxd` and
delete with `rm -rf`. Git shipped on loose objects for years before packfiles, and §2.4
establishes that **packing is a storage change that does not touch any address** — so this is
not a decision that locks anything. The migration path to SQLite or a log is open precisely
because the address commits to an encoding, not to a storage format.

*The one thing the straw asks the v0 store to do that git does:*

**Store the pre-image bytes, not a re-encoding.** This is the single highest-leverage
decision in §8.4, and it is §7.5's rule. Git stores the pre-image (post-inflate), so `fsck` is
one hash call. Unison stores a *different* codec with database-local ids, so verification
requires the entire conversion pipeline. Unison had a reason — the storage codec interns text
and uses varints, so it is much smaller — but the lab does not have Unison's scale problem
and should not pre-pay Unison's verification cost.

### 8.5 Names

**Straw: a separate metadata map, outside the store. Many names → one address. Renaming moves
no addresses.**

- *Who else did this:* all four, uniformly (§7.3). It is the least controversial line in this
  document.
- *The variation worth arguing about:* Unison makes the name map **itself** a content-addressed
  value with a causal parent chain, so naming has an addressable history. Git does not — a ref
  is a bare mutable file. The straw's v0 can start with git's version (a file mapping names to
  addresses) and adopt Unison's later, because the upgrade is additive: content-address the map,
  and let the mutable cell hold the map's address instead of holding the entries.
- *Explicitly rejected:* Nix's fusion of the name into the fingerprint (§5.3). It costs dedup
  and it is driven by constraints the lab does not have.

### 8.6 Integrity

**Straw: re-hash-on-read.** Read the bytes, re-run SHA3-512 over `version ++ bytes`, compare
to the address the caller asked for. Reject on mismatch.

- *Who else did this:* git (`fsck`, and object reads are checked), IPFS (the CID says which
  function). Nix's input-addressed paths **cannot** (§7.5) — a warning, not a model.
- *Why it is cheap here:* because of §8.4's decision to store the pre-image. If that decision
  is reversed, this one gets expensive, and the two should be argued together rather than
  separately.
- *What it does and does not catch:* it catches storage corruption, truncation, and
  substitution. It does **not** catch an encoder bug — if `encodeF` is wrong, the stored bytes
  and the recomputed digest agree perfectly with each other and are both wrong. Integrity
  checking is a layer-(c)-and-store property; layer (b) correctness is a *proof* obligation and
  there is no runtime check that substitutes for it. This is worth saying out loud because
  "the store verifies itself" invites exactly the wrong inference.

### 8.7 The obligation this straw still owes

Collecting the gaps named above, so they are not lost:

1. **Layer-(b) upper half.** F1/F2 cover token-stream injectivity. Nothing yet covers
   *carrier → token stream*. #3509 lives there, and it is the one that bit Unison in
   production. The obligation wants a name and a statement — something of the shape
   *"tokenize is injective on the carrier type"* — and it is the obligation that will actually
   be hard, because it must range over the whole constructor set.
2. **A total, tie-free canonical order for SCC members** (§8.1). Currently unstated. #2787.
3. **`version_byte_separates`** (§8.3) — provable in the style of `sha3_ne_prefips_spec`, or
   consciously left as an assertion.
4. **The six constructors** are not written down anywhere in this repository. Everything in
   §8 is parametric over them and stays parametric until they are.

---

## 9. Sources

### 9.1 Local evidence (first-hand, this probe)

| Claim | Receipt |
|---|---|
| Git object encodings, all three carriers | scratch repo `…\scratchpad\gitdemo2`, `git version 2.55.0.windows.2`. Pre-images reconstructed by hand and SHA-1 recomputed; all three match (§2.2) |
| SHA-1 → SHA-256 isolates layer (c) | scratch repo `…\scratchpad\gitdemo256`, `git init --object-format=sha256`; `git config extensions.objectformat` → `sha256`; `SHA-256("blob 6\0hello\n")` recomputed by hand and matches (§2.3) |
| Unison #2787 cited in-tree | `unison-hashing-v2\src\Unison\Hashing\V2\ABT.hs:35`, `codebase2\codebase-sqlite\U\Codebase\Sqlite\HashHandle.hs:35`, clone @ `84b95a6` |
| Unison #3509 root cause | `unison-hashing-v2\src\Unison\Hashing\V2\DataDeclaration.hs:27,40-42` (`Decl = Either EffectDeclaration DataDeclaration`; `EffectDeclaration` a newtype), `parser-typechecker\src\Unison\Hashing\V2\Convert.hs:251-267` (`howToReassemble` / `asDataDecl` / `retag`) |
| Framed token scheme and its obligations | `C:\Users\kokok\Dev\foldlab\.staging\unison-fragment\Fragment\Stream.lean` — `v2_stream_not_injective` at line 76 (proved); `toBSF`, `obligation_F1/F2/F3` at §5 (stated) |
| SHA3-512 proof status | `C:\Users\kokok\Dev\foldlab\formal\fips202\README.md` — `sha3_512_bridge`, 67 theorems, axiom profile, what is *not* claimed |
| Prior lab knowledge | `.staging\e1\unison-hashing.md`; `.staging\e1\recovered\recovered-unison-sqlite-schema.md`; `.staging\explore\concrete-spine-feasibility.md` |

### 9.2 External specifications and documentation

| Source | URL | Used for |
|---|---|---|
| Pro Git — Git Internals: Git Objects | https://git-scm.com/book/en/v2/Git-Internals-Git-Objects | The `"blob <size>\0"` header, zlib storage, tree and commit formats (§2) |
| Pro Git — Git Internals: Git References | https://git-scm.com/book/en/v2/Git-Internals-Git-References | Refs as the name layer (§2.5) |
| Pro Git — Git Internals: Packfiles | https://git-scm.com/book/en/v2/Git-Internals-Packfiles | Packing as a storage detail (§2.4) |
| Git `hash-function-transition` design doc | https://git-scm.com/docs/hash-function-transition | The SHA-1 → SHA-256 flag-day design (§2.3, §7.1) |
| multiformats/cid specification | https://github.com/multiformats/cid | CIDv0 vs CIDv1 layout; the `<multibase><version><multicodec><multihash>` order (§4.1) |
| multiformats/multihash | https://github.com/multiformats/multihash | `<fn-code><length><digest>` self-describing digests (§4.1) |
| IPLD DAG-CBOR specification | https://ipld.io/specs/codecs/dag-cbor/spec/ | Canonical encoding rules: tag 42 only, shortest-form integers and lengths, byte-wise sorted string map keys, 64-bit floats (§4.1) |
| IPLD Data Model — kinds | https://ipld.io/docs/data-model/kinds/ | The nine kinds; `link` as a scalar kind pointing to another block (§4.1, §4.4) |
| Nix manual — Store Path | https://nix.dev/manual/nix/2.24/store/store-path.html | Store path structure; 20-byte digest as 32 base-32 characters (§5.1) |
| Nix manual — Store Path Specification | https://nix.dev/manual/nix/2.24/protocols/store-path | `fingerprint = type ":" sha256 ":" inner-digest ":" store ":" name`; first 160 bits of SHA-256; the `text` / `source` / `output:id` type strings (§5.1) |
| restic references / design | https://restic.readthedocs.io/en/stable/100_references.html | Rabin-fingerprint CDC parameters (512 KiB – 8 MiB, 1 MiB target, 64-byte window, per-repository random polynomial); SHA-256 blob ids (§6.1) |
| Pijul manual — theory | https://pijul.org/manual/theory.html | Vertices as `(change hash, position)`; append-only deletion by edge labelling; patch commutation; order-independent version identifiers via homomorphic hashing (§6.2) |
| unisonweb/unison issue #3509 | https://github.com/unisonweb/unison/issues/3509 | *"The empty ability has the same hash as the empty data decl"* — **open** (§3.4) |
| unisonweb/unison issue #2787 | https://github.com/unisonweb/unison/issues/2787 | `IncompleteElementOrderingError` — cycle members that cannot be totally ordered (§3.5) |
| NIST FIPS 202 (SHA-3 Standard) | https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf | The digest standard; already pinned locally at `.reference\papers\nist-2015-fips202-sha3-standard.pdf` with its digest in `formal/fips202/PROVENANCE.md` |

### 9.3 Paper opened to the local corpus

| Field | Value |
|---|---|
| Citation | Eelco Dolstra, *The Purely Functional Software Deployment Model*, PhD thesis, Utrecht University, 2006 |
| Source URL | https://edolstra.github.io/pubs/phd-thesis.pdf |
| Local path | `C:\Users\kokok\Dev\foldlab\.reference\papers\dolstra-2006-purely-functional-software-deployment.pdf` |
| Bytes | 1,694,654 |
| SHA-256 | `f2bd78a82fb615ce2f3145d5418733bc65e09121147ecb814eba54eaf59875e4` |
| Public identifier | none printed (no DOI, no arXiv id) — per `.reference\papers\README.md`, the digest is the whole of this source's identity |
| Used for | §5, the input-addressed vs content-addressed axis and the store-path model |

> ⚠️ **Not registered.** `.reference\papers\README.md` states that a file entering the catalog
> requires the generator to assign it a cluster, and that this is the only way
> `.reference\provenance\papers.lock.json` will accept it. This probe downloaded the PDF and
> recorded its digest; it did **not** run the generator, so the file is present on this host
> but is **not** in the lock and **not** in `.reference\catalog\PAPERS.md`. Registering it is
> owed work, not done work.

---

## Appendix: the four systems side by side

| | git | Unison | IPLD / IPFS | Nix |
|---|---|---|---|---|
| **Carrier** | blob, tree, commit | ABT (term / type / decl) | 9-kind data model | filesystem tree |
| **Encoding** | `"<type> <len>\0" ++ body` | tokenize → concatenate, **unframed** | a named codec, e.g. DAG-CBOR | NAR |
| **Address** | SHA-1 (or SHA-256) | SHA3-512, 64 bytes | CID: multibase + version + multicodec + multihash | SHA-256 truncated to 160 bits, base-32 |
| **Version lives** | repo config (flag day) | in the pre-image (`0x02`) + a store column | **in the address** | in the pre-image (`type ":" sha256 ":"`) |
| **Children enter** | by reference | by reference (re-hashed) | by reference (CID) | by reference (input paths) |
| **Cycles** | forbidden | inside a component | forbidden | forbidden |
| **Names** | refs (mutable files) | namespace objects — **themselves addressed** | IPNS / DNSLink | GC roots, profiles; **name also in the address** |
| **Store** | loose objects + packfiles | SQLite | blockstore | filesystem + SQLite metadata |
| **Stored bytes = pre-image?** | **yes** | **no** — separate codec | **yes** | yes for `source:`, n/a for `output:` |
| **Verification** | cheap re-hash | expensive re-encode | cheap, self-describing | cheap … to impossible |
| **GC** | reachability from refs | append-only; spine outlives values | pinning | GC roots |
| **Addressing axis** | content | content | content | **input** (classic outputs) |
