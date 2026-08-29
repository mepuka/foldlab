# How Unison computes content-addressed hashes

**Evidence base:** local clone `C:\Users\kokok\Dev\foldlab\.reference\clones\unison`, pinned at commit
`84b95a623711b57b9ff7163f124b214d626b81e4` (2026-08-19, "Merge pull request #6264 from unisonweb/cp/add-missing-type-decls").
All line citations are against that commit. Repository content was read as evidence only.

Companion document (SQLite store shape, item 6): `C:\Users\kokok\Dev\foldlab\.staging\e1\recovered\recovered-unison-sqlite-schema.md`.

---

## 0. Package map — where the hashing lives

| Concern | Package / path |
|---|---|
| Hash value + base32hex display | `lib\unison-hash\src\Unison\Hash.hs`, `lib\unison-util-base32hex\src\U\Util\Base32Hex.hs` |
| **Hashing algorithm (current)** | `unison-hashing-v2\src\Unison\Hashing\V2\*` |
| Public façade of the hashing package | `unison-hashing-v2\src\Unison\Hashing\V2.hs` |
| Generic abstract binding tree | `codebase2\core\U\Core\ABT.hs`, re-exported/extended by `unison-core\src\Unison\ABT.hs` |
| Hashing-specific ABT traversal | `unison-hashing-v2\src\Unison\Hashing\V2\ABT.hs` |
| Bridge into the SQLite layer | `codebase2\codebase-sqlite\U\Codebase\Sqlite\HashHandle.hs`, implemented in `codebase2\codebase-sqlite-hashing-v2\src\U\Codebase\Sqlite\V2\HashHandle.hs` |
| Conversion from runtime types → hashing types | `parser-typechecker\src\Unison\Hashing\V2\Convert.hs`, `codebase2\codebase-sqlite-hashing-v2\src\Unison\Hashing\V2\Convert2.hs` |
| **Storage** serialization (a *different* format) | `codebase2\codebase-sqlite\U\Codebase\Sqlite\Serialization.hs` |

The key structural fact: **the hashing format and the on-disk serialization format are two different codecs in two
different packages.** `codebase-sqlite` deliberately does not depend on the hashing package; it receives a
`HashHandle` record of hashing functions instead (`HashHandle.hs:73-104`). You cannot rehash a definition from
`object.bytes` alone — you must decode, resolve `LocalIds` against the `text`/`object` tables, convert to the
`Unison.Hashing.V2` types, then tokenize.

---

## 1. Current hashing version

The version is a single token prepended to **every** hash:

`unison-hashing-v2\src\Unison\Hashing\V2\Tokenizable.hs:37-38`
```haskell
hashingVersion :: Token
hashingVersion = Tag 2
```

The comment above it (lines 28-36) states the invariant deliberately: a change to the hashing function must change
*all* hashes, not some, or two hashing-function versions could produce identical base32 for simple values and
collide in the `hash` table.

`2` is the same number stamped into `hash_object.hash_version` on every write today
(`codebase2\codebase-sqlite\U\Codebase\Sqlite\Queries.hs:778`, hardcoded `saveHashObject h oId 2`). Version 1 rows
were purged by the schema-3 migration. The package name (`unison-hashing-v2`) and the module namespace
(`Unison.Hashing.V2.*`) carry the same version. There is no `unison-hashing-v1` package in the tree — V1 exists only
as the historical hashes that migration 3 deleted.

---

## 2. The hash function and the byte pipeline

### 2.1 Hash value type

`lib\unison-hash\src\Unison\Hash.hs:31` — `newtype Hash = Hash { toShort :: ShortByteString }`. It is a raw byte
string, **not truncated**: SHA3-512 output is 64 bytes and `accumulate` stores all of it
(`Tokenizable.hs:123`, `Hash.fromByteString . BA.convert . CH.hashFinalize`).

### 2.2 Display encoding

`Hash.hs:69-72` → `Base32Hex.toText . Base32Hex.fromByteString`, and
`lib\unison-util-base32hex\src\U\Util\Base32Hex.hs:25-27`:
```haskell
fromByteString =
  UnsafeFromText . Text.toLower . Base32.Hex.encodeBase32Unpadded
```
So: **RFC 4648 base32*hex* alphabet (`0-9`, `a-v`), lowercased, unpadded** — `validChars` at `Base32Hex.hs:43`
confirms `['0'..'9'] ++ ['a'..'v']`. 64 bytes → 103 characters (512/5 = 102.4, rounded up). The comment notes the
multibase prefix would be `v`, but the prefix is not stored. Comparison in SQL is `COLLATE NOCASE`
(`sql\create.sql:14`).

### 2.3 Token type and byte encoding

`Tokenizable.hs:40-47`:
```haskell
data Token
  = Tag !Word8
  | Bytes !ByteString
  | Int !Int64
  | Text !Text
  | Double !Double
  | Hashed !Hash
  | Nat !Word64
```

`Tokenizable.hs:122-137` is the whole byte pipeline:

```haskell
accumulate :: [Token] -> Hash
accumulate = Hash.fromByteString . BA.convert . CH.hashFinalize . go CH.hashInit
  where
    go acc tokens = CH.hashUpdates acc (hashingVersion : tokens >>= toBS)
    toBS (Tag b)     = [B.singleton b]
    toBS (Bytes bs)  = [encodeLength $ B.length bs, bs]
    toBS (Int i)     = [BL.toStrict . toLazyByteString . int64BE $ i]
    toBS (Nat i)     = [BL.toStrict . toLazyByteString . word64BE $ i]
    toBS (Double d)  = [BL.toStrict . toLazyByteString . doubleBE $ d]
    toBS (Text txt)  = let tbytes = encodeUtf8 txt
                        in [encodeLength (B.length tbytes), tbytes]
    toBS (Hashed h)  = [Hash.toByteString h]
    encodeLength = BL.toStrict . toLazyByteString . word64BE . fromIntegral
```

Reading off the wire format precisely:

| Token | Bytes emitted |
|---|---|
| `Tag w` | 1 byte, the `Word8` |
| `Bytes bs` | 8-byte big-endian `Word64` length, then the raw bytes |
| `Text t` | UTF-8 encode, then 8-byte big-endian `Word64` **byte** length (not char count), then the UTF-8 bytes |
| `Int i` | 8 bytes, big-endian two's-complement `Int64` |
| `Nat n` | 8 bytes, big-endian `Word64` |
| `Double d` | 8 bytes, IEEE-754 binary64 big-endian (`doubleBE`) |
| `Hashed h` | the 64 raw hash bytes, **unlength-prefixed** |

Three consequences an implementer must internalise:

1. **`hashingVersion` (`Tag 2`, i.e. the single byte `0x02`) is prepended inside `accumulate` itself**, so it is
   emitted once per `accumulate` call — meaning once per *node* hashed, not once per definition. Every nested
   sub-hash carries it too.
2. **`Hashed` is length-free** while `Bytes` is length-prefixed. `instance Tokenizable Hash`
   (`Tokenizable.hs:119-120`) emits `Bytes (Hash.toByteString h)` — length-prefixed — so a `Hash` reached through
   the generic `Tokenizable` instance and a `Hash` emitted as a `Hashed` token are **encoded differently**. This is
   a real trap for a reimplementation.
3. There is no framing between tokens beyond what each token contributes. `Tag` sequences are the only
   discriminator, so tag assignments per constructor are load-bearing.

### 2.4 Structural combinators

`Tokenizable.hs:74-96`, and the crucial one is line 74-75:
```haskell
instance (Tokenizable a) => Tokenizable [a] where
  tokens = map accumulateToken
```
`accumulateToken = Hashed . hashTokenizable` (line 50). So **a list is not flattened into the parent's token
stream — each element is hashed to its own 64-byte digest first, and the digests are concatenated.** Same for
tuples (line 77-78). `Set` and `Map` go through `Set.toList` / `Map.toList` (lines 80-84), i.e. **Haskell's `Ord`
ordering of the key type is part of the hash.** `()` contributes zero tokens (line 95-96). `Bool` becomes
`Tag 0`/`Tag 1` (line 116-117); `Char` becomes `Nat` of its code point (line 104-105).

---

## 3. Alpha-invariance — how names are erased

Unison hashes **abstract binding trees**. `codebase2\core\U\Core\ABT.hs:16-25`:
```haskell
data ABT f v r = Var v | Cycle r | Abs v r | Tm (f r)
data Term f v a = Term { freeVars :: Set v, annotation :: a, out :: ABT f v (Term f v a) }
```
`Abs v r` is the single binding form; `f` is the language-specific base functor (term syntax, type syntax).

The alpha-invariance mechanism is in `unison-hashing-v2\src\Unison\Hashing\V2\ABT.hs:145-167`:

```haskell
hash' :: [Either [v] v] -> Term f v a -> Hash
hash' env = \case
  Var' v      -> maybe die hashInt ind
    where ind = findIndex lookup env
          hashInt i = Hashable.accumulate [Hashable.Nat $ fromIntegral i]
  Cycle' vs t -> hash1 (hashCycle vs env) undefined t
  Abs'' v t   -> hash' (Right v : env) t
  Tm' t       -> hash1 (\ts -> (List.sort (map (hash' env) ts), hash' env)) (hash' env) t
```

Read off the four rules:

1. **`Abs` contributes no tokens at all.** It only pushes its bound variable onto the environment
   (`Right v : env`). The binder's *name* never reaches the hash, and neither does a marker that a binder occurred
   — the arity is recovered from the base-functor node that consumes it.
2. **`Var` hashes as its De Bruijn index**: `findIndex` over the environment list, emitted as a single `Nat` token.
   Index 0 is the innermost binder. This is a genuine De Bruijn discipline computed at hash time, not a
   representation change — the in-memory `Term` keeps names.
3. A free variable not in the environment is a **hard error** (`die`, line 159-163). Hashing is only defined on
   closed-enough terms.
4. **Annotations are dropped.** The doc comment at `ABT.hs:136-137` says so explicitly ("We ignore annotations in
   the `Term`, as these should never affect the meaning of the term"); `hash'` pattern-matches only on `out`, never
   on `annotation`. Source spans, therefore, are not in the hash.

Corroboration that this is the intended semantics: `U.Core.ABT`'s own `Eq` and `Ord` instances
(`codebase2\core\U\Core\ABT.hs:35-76`) are explicitly documented as **alpha equivalence**, implemented by renaming
aligned `Abs` constructors to a common fresh variable.

The `env` type is `[Either [v] v]`: a `Right v` frame is one ordinary binder; a `Left vs` frame is a whole cycle's
worth of names occupying **one** index slot (see §4).

Note the unordered-children hook in the `Tm'` case: `hash1` receives
`\ts -> (List.sort (map (hash' env) ts), hash' env)`. A base functor that has order-irrelevant children calls that
first argument, and the canonical order is **ascending sort of the children's own hashes**.

---

## 4. Cycles — mutually recursive definitions

### 4.1 Reference shape

`unison-hashing-v2\src\Unison\Hashing\V2\Reference.hs:21-40`:
```haskell
data Reference = ReferenceBuiltin Text | ReferenceDerivedId ReferenceId
data ReferenceId = ReferenceId Hash Pos    -- Pos = Word64
```
A derived definition is addressed by `(component hash, index within component)`. `components` at lines 42-47 does
the zip: element *i* of the canonically-sorted component gets `Pos = i`.

### 4.2 Top level: SCC decomposition then per-component hashing

`unison-hashing-v2\src\Unison\Hashing\V2\ABT.hs:106-134` (`hashComponents`):

1. Assert the whole binding group has **no free variables** escaping the group — otherwise `error` (lines 127-134).
2. `sccs = components (Map.toList termsByName)` — `unison-core\src\Unison\Util\Components.hs:33-45`. This is
   `Data.Graph.stronglyConnComp` (Tarjan), with **integer node keys assigned as
   `map fst bs zip reverse [1 .. length bs]`** specifically "to preserve original source order as much as
   possible". The result is in dependency order: a component at index *i* never depends on a component at index
   > *i*.
3. Process components in that order, threading a substitution `prevHashes :: Map v (Term f v ())`. Before hashing
   component *n*, every already-hashed name is substituted with `termFromHash h i` — a `TermRef` to the derived
   reference. So a cross-component dependency enters the hash as a *reference*, not as inlined structure.
4. After hashing, re-substitute the just-computed hashes into the component's own bodies (line 124), producing the
   stored form.

> ⚠️ **The SCC key assignment is load-bearing but not obviously canonical.** `varIds` is built from the order of
> `Map.toList termsByName`, i.e. the `Ord v` order of the variable names — so it is deterministic for a given set
> of names, but it is derived from names. Since components are hashed in the resulting order and each component's
> hash feeds into later components via substitution, *the partition into components* is name-independent (it is a
> graph property), but I did not find a proof that the *sequencing of independent components* cannot vary. In
> practice independent components do not reference each other, so their hashes should be unaffected; flagged in
> Open Questions.

### 4.3 Inside one component: the two-pass canonical ordering

This is the subtle part. `ABT.hs:178-217` (`doHashCycle`) plus `ABT.hs:74-100` (`hashComponent`).

`doHashCycle env namedTerms`:

- Build a **permutation environment** `permutationEnv = Left names : env` — one single frame holding *all* the
  cycle's names. Every intra-cycle variable reference therefore resolves to the **same De Bruijn index** regardless
  of which member it points at (`hash'`'s `lookup (Left cycle) = v `elem` cycle`, `ABT.hs:154`).
  **This is what makes the first pass order-independent**: in pass one a cycle member cannot tell its siblings
  apart.
- Hash every member in that environment (`namedHashes`, line 198-199).
- **Sort the members by those hashes** (`sortOn snd`, lines 202-206) — this is the canonical permutation.
- Build `newEnv = map Right permutedNames ++ env` (line 209): now each member occupies its own index slot, in
  canonical order.
- Re-hash every member in `newEnv` (line 193) and return those hashes plus the environment.

So intra-cycle references are De Bruijn indices *into the canonically sorted component*, and the sort key is the
members' own pass-one hashes. Names are gone from the result.

`hashComponent` then derives the component hash, `ABT.hs:79-100`:

```haskell
(hashes, env) <- doHashCycle [] ts
commonTokens = Hashable.Tag 1 : map Hashable.Hashed hashes
hashName v = Hashable.accumulate (commonTokens ++ [Hashable.Hashed (hash' env (var v))])
(hashes', permutedTerms) = ts & map (\t -> (hashName (fst t), t)) & sortOn fst & unzip
overallHash = Hashable.accumulate (map Hashable.Hashed hashes')
```

Reading that off:

- `commonTokens` = literal `Tag 1` followed by every member's pass-two hash, in canonical order. Shared by all
  members.
- Each member's *individual* identity token is `hash' env (var v)` — i.e. **the hash of a bare variable reference
  to itself in the canonical environment**, which by `hash'`'s `Var'` rule is just `accumulate [Nat idx]`. So a
  member is disambiguated purely by its canonical index.
- A **third sort** (`sortOn fst` on `hashName`) fixes the final element order, and the component hash is
  `accumulate` over the sorted `hashName` digests.
- The returned `permutedTerms` order *is* the `Pos` assignment (`Reference.components`, `Reference.hs:42-47`).

### 4.4 Ties are a known bug

If two members of a cycle hash identically in the permutation environment — i.e. they are structurally identical
modulo their own names — the ordering is underdetermined. `doHashCycle` detects this and emits
`IncompleteElementOrderingError` (`ABT.hs:33-36`, `190-192`, `210-217`), which references
[unisonweb/unison#2787](https://github.com/unisonweb/unison/issues/2787). The user-facing text (lines 45-63) admits
it outright and tells the user to restructure their code. `crashOnHashingWarning` (lines 68-71) turns the warning
into a thrown exception at most call sites; `hash'`'s internal `hashCycle` **deliberately discards** the warning
for let-rec blocks (lines 169-174).

### 4.5 Non-top-level cycles

`let rec` inside a term is an ABT `Cycle` node and goes through the same `doHashCycle` (`ABT.hs:165`, `169-174`),
so let-binding order inside a block does not affect the hash (comment at `Term.hs:179-180`). `TypeEffects` also
uses `hashCycle` to make effect-row order irrelevant (`Type.hs:144-150`, with a worked example in the comment).

### 4.6 Single definitions

`hashClosedTerm` (`Term.hs:124-125`) = `ReferenceId (ABT.hash tm) 0`. A one-element component is still a component
of size 1 at index 0.

---

## 5. Per-constructor tags — the concrete tokenization

Every base functor prefixes its layer with a **namespace byte** so terms, types and decls can never collide. The
comments say so at `Term.hs:147-149`, `Type.hs:136-137`, `DataDeclaration.hs:115-116`:

| Layer | Leading tag |
|---|---|
| Term (`TermF`) | `Tag 1` |
| Type (`TypeF`) | `Tag 0` |
| Decl (`DataDeclaration.F`) | `Tag 2` |

### 5.1 Terms — `Term.hs:127-202`

Each case is `accumulate (Tag 1 : <case tokens>)`:

| Constructor | Tokens after the leading `Tag 1` |
|---|---|
| `TermNat i` | `Tag 64`, `accumulateToken i` (Word64 → `Nat`, hashed) |
| `TermInt i` | `Tag 65`, `accumulateToken i` |
| `TermFloat n` | `Tag 66`, `Double n` — **note: raw `Double` token, not `accumulateToken`** |
| `TermBoolean b` | `Tag 67`, `accumulateToken b` |
| `TermText t` | `Tag 68`, `accumulateToken t` |
| `TermChar c` | `Tag 69`, `accumulateToken c` |
| `TermBlank b` | `Tag 1`, then `Tag 0..4` per blank kind (lines 160-168) |
| `TermRef (ReferenceBuiltin n)` | `Tag 2`, `accumulateToken n` |
| `TermApp a b` | `Tag 3`, `Hashed (hash a)`, `Hashed (hash b)` |
| `TermAnn a t` | `Tag 4`, `Hashed (hash a)`, `Hashed (ABT.hash t)` |
| `TermList as` | `Tag 5`, `Nat (length as)`, then each element hashed |
| `TermLam a` | `Tag 6`, `Hashed (hash a)` |
| `TermLetRec as a` | `Tag 7`, `Hashed (hash body)`, then the **cycle-sorted** binding hashes |
| `TermLet b a` | `Tag 8`, `Hashed (hash b)`, `Hashed (hash a)` — order significant, no cycle sort |
| `TermIf b t f` | `Tag 9`, three hashes |
| `TermRequest r n` | `Tag 10`, `accumulateToken r`, `Nat n` |
| `TermConstructor r n` | `Tag 12`, `accumulateToken r`, `Nat n` |
| `TermMatch e brs` | `Tag 13`, `Hashed (hash e)`, then per branch: `accumulateToken pat`, optional guard hash, branch hash |
| `TermHandle h b` | `Tag 15`, two hashes |
| `TermAnd x y` | `Tag 16`, two hashes |
| `TermOr x y` | `Tag 17`, two hashes |
| `TermTermLink r` | `Tag 18`, `accumulateToken r` |
| `TermTypeLink r` | `Tag 19`, `accumulateToken r` |

Tags 11 and 14 are absent — historical gaps that a reimplementation must preserve.

**The reference-transparency special case** (`Term.hs:135-146`) is the single most surprising rule:

```haskell
TermRef (ReferenceDerived h 0) -> Hash.fromByteString (Hash.toByteString h)
TermRef (ReferenceDerived h i) -> Hashable.accumulate [tag 1, hashed h, Hashable.Nat i]
```

A reference to **element 0** of a component bypasses `accumulate` entirely and *is* the component hash — no
`Tag 1` prefix, no tag, no rehash. The comment explains the intent: this makes `x = 1 + 1` and `y = x` hash
identically, i.e. references are transparent with respect to hashing. Element *i* > 0 does go through `accumulate`,
with `tag 1` reused as an inner tag.

### 5.2 Types — `Type.hs:133-153`

`accumulate (Tag 0 : ...)`: `TypeRef`→`Tag 0`, `TypeArrow`→1, `TypeApp`→2, `TypeAnn`→3 (kind via
`accumulateToken`), `TypeEffects`→4 (**cycle-sorted**, so effect-row order is irrelevant), `TypeEffect`→5,
`TypeForall`→6, `TypeIntroOuter`→7.

`typeToReference` (`Type.hs:121-125`) contains a normalization worth noting: **unused `forall`-bound type
parameters are stripped before taking the reference.**

### 5.3 Declarations — `DataDeclaration.hs:105-132`

The decl is first flattened to an ABT (`toABT`, lines 51-54):
`Modified modifier (absChain bound (Constructors [ctor types...]))`.

`accumulate (Tag 2 : ...)`: `Type t`→`Tag 0` then delegate to the `TypeF` instance; `LetRec`→1;
`Constructors cs`→`Tag 2` then the **cycle-sorted** constructor-type hashes; `Modified m t`→`Tag 3`,
`accumulateToken m`, body hash. `Modifier`: `Structural`→`Tag 0`, `Unique txt`→`Tag 1, Text txt` (lines 130-132).

Constructor order is canonicalized twice over: `Constructors` uses `hashCycle` (hash-sorted) inside the hash, and
`hashDecls` re-sorts the real constructor list with `sortOn hash3` where `hash3 (_,_,typ) = ABT.hash typ`
(lines 87-89), so the assigned `ConstructorId`s match the hash-canonical order. **Constructor names do not affect
the decl hash or the constructor numbering; source order does not either.** The `unique` modifier's GUID text
*does*.

Known limitation, stated in the source (lines 71-74): the implementation "gives diff results if ctors have the same
FQN as one of the types" — an unfixed TODO.

### 5.4 Small leaf types

- `Reference` (`Reference.hs:49-51`): builtin → `Tag 0, Text name`; derived → `Tag 1, Bytes hash, Nat pos`.
  Note **`Bytes`** here (length-prefixed), unlike the `Hashed` token used elsewhere.
- `Referent` (`Referent.hs`): `ReferentRef`→`Tag 0` ++ reference tokens; `ReferentCon`→**`Tag 2`** ++ reference
  tokens ++ constructor-id tokens. Tag 1 is skipped — another historical gap.
- `Kind` (`Kind.hs`): `KindStar`→`Tag 0`; `KindArrow k1 k2`→`Tag 1` ++ tokens k1 ++ tokens k2 (inline, not hashed
  sub-digests).
- `NameSegment` (`NameSegment.hs`): a bare `Text` token.

### 5.5 Namespaces and history

`Branch.hs`:
```haskell
data Branch = Branch
  { terms    :: Map NameSegment (Map Referent MdValues),
    types    :: Map NameSegment (Map Reference MdValues),
    patches  :: Map NameSegment Hash,
    children :: Map NameSegment Hash }

instance Tokenizable Branch where
  tokens b = [ accumulateToken (terms b), accumulateToken (types b)
             , accumulateToken (children b), accumulateToken (patches b) ]
```
Note the field order in `tokens` (terms, types, **children, patches**) differs from the record declaration order
(terms, types, patches, children). The token order is what counts.

`Causal.hs`: `tokens c = H.tokens (branchHash c : Set.toList (parents c))` — a list of hashes, so via the
`Tokenizable [a]` instance each is `Hashed . hashTokenizable`, and via `instance Tokenizable Hash` each inner hash
is emitted as a length-prefixed `Bytes` before being re-digested. Parents are `Set`-ordered.

---

## 6. What is inside a hash vs. outside it

### Inside

- **The full syntactic structure** of the term/type/decl, modulo alpha-renaming and the canonicalizations above.
- **The type of a term.** This is easy to miss. `hashTermComponents` (`Term.hs:92-109`) calls `incorporateType`,
  which wraps every term as `TermAnn e typ` before hashing (inserting the annotation only if there isn't already a
  top-level one). So a term's inferred/declared type is part of its hash. The escape hatch
  `hashTermComponentsWithoutTypes` (lines 120-122) exists but is the exception.
- **Builtin names**, as `Text` — `ReferenceBuiltin "Nat"` hashes its name. Builtins are named, not hashed.
- **The `unique` GUID** of a decl modifier. Note this smuggles a *name* dependency into a decl hash: the GUID is
  resolved by looking the type's name up in the codebase, and otherwise minted from randomness plus source
  position (`unison-syntax\src\Unison\Syntax\Parser.hs:198-205`,
  `parser-typechecker\src\Unison\Codebase\UniqueTypeGuidLookup.hs:23-45`). See §10 item 22.
- **Dependencies, by hash**, via `TermRef`/`TypeRef` to derived references.
- For **namespace objects only**: name segments, and the `MdValues` metadata sets attached to each
  name→referent binding.

### Outside

- **Names of top-level definitions.** A term's hash is computed after its own name has been erased into a De Bruijn
  index and every dependency has been substituted by hash reference. Names live only in namespace objects, which
  are separately-hashed values, and in the derived `scoped_*_name_lookup` cache. This is the name-as-metadata
  separation: renaming a definition produces a new *namespace* hash but the *definition* hash is untouched.
- **Bound variable names** (§3).
- **Annotations / source spans** (`ABT.hs:136-137`).
- **Source formatting, comments, let-binding order, effect-row order, constructor order** — all normalized away.
- **Docs.** Unison docs are ordinary terms of type `Doc`/`Doc2` with their own hashes, linked to a definition by
  *name* convention (`foo.doc`) in the namespace — they are not part of the documented term's hash.
- **The storage encoding.** `object.bytes` uses a completely different codec with database-local ids
  (`U\Codebase\Sqlite\Serialization.hs`); those local ids are not hash-visible.

### Corroborating seam

`codebase2\codebase-sqlite\U\Codebase\Sqlite\HashHandle.hs:73-104` names exactly which things get hashed:
`hashBranch`, `hashCausal`, `hashBranchFormatFull`, `verifyTermFormatHash`, and friends — the SQLite layer treats
hashing as an injected capability and never computes one itself.

### Behavioural confirmation in-tree

`unison-src\transcripts\idempotent\ability-order-doesnt-affect-hash.md` is a checked-in transcript demonstrating
both properties at once. Two terms `term1 : () ->{Foo, Bar} ()` and `term2 : () ->{Bar, Foo} ()` land on the
**same hash** `#42m1ui9g56`, and the transcript output lists both names against that one hash:

```
  Hash          Kind   Names
  #42m1ui9g56   Term   term1, term2
```

Effect-row order is normalized away, and one hash carries many names.

---

## 7. The algorithm as a numbered recipe

To hash a set of top-level definitions `{name ↦ term}` (all dependencies outside the set already resolved to
`Reference`s):

1. **Convert** the runtime representation into the `Unison.Hashing.V2` types
   (`parser-typechecker\src\Unison\Hashing\V2\Convert.hs`). This step is itself part of the spec — the
   `ContentAddressable` doc comment (`Unison\Hashing\ContentAddressable.hs`) warns that the
   `MyType ⇒ HashingType` conversion must never change either.
2. **Incorporate types.** For each term, wrap it as `TermAnn e typ` unless the term's outermost node is already a
   `TermAnn` (in which case replace that annotation's type with `typ`). `Term.hs:107-109`.
3. **Check closedness.** Compute free variables of every body; subtract the set of names being hashed. If anything
   remains, abort. `ABT.hs:113-114, 127-134`.
4. **Partition into SCCs.** Build the dependency graph over the names, assign integer keys as
   `names zip reverse [1..n]`, run Tarjan (`Data.Graph.stronglyConnComp`), flatten each SCC. Process components in
   the resulting order. `Unison\Util\Components.hs:33-45`.
5. **For each component, in order:**
   1. Substitute every *previously hashed* name in this component's bodies with `TermRef (ReferenceDerived h i)`
      for its already-computed component hash and index. `ABT.hs:119-120`.
   2. **Pass one (permutation).** Set `env₀ = [Left names] ++ outerEnv` — one frame holding *all* the component's
      names. Hash every member in `env₀` using `hash'` (step 6). Sort the members ascending by these hashes. If any
      two are equal, the ordering is underdetermined → warning `IncompleteElementOrderingError`. `ABT.hs:196-217`.
   3. **Pass two.** Set `env₁ = map Right permutedNames ++ outerEnv` — each member now gets its own De Bruijn slot,
      in canonical order. Re-hash every member in `env₁`; call these `hashes`. `ABT.hs:193, 209`.
   4. **Per-member identity.** `commonTokens = [Tag 1] ++ map Hashed hashes`. For each member `v`,
      `hashName v = accumulate (commonTokens ++ [Hashed (hash' env₁ (Var v))])` — where `hash' env₁ (Var v)` is
      just `accumulate [Nat (index of v in env₁)]`. `ABT.hs:86-91`.
   5. **Final order.** Sort the members ascending by `hashName`. That order defines `Pos = 0,1,2,…`.
      `ABT.hs:92-98`, `Reference.hs:42-47`.
   6. **Component hash** = `accumulate (map Hashed sortedHashNames)`. `ABT.hs:99`.
   7. Substitute the freshly minted references back into this component's bodies for storage. `ABT.hs:121-124`.
6. **`hash' env t` — the ABT walk** (`ABT.hs:151-167`):
   - `Var v` → `accumulate [Nat i]` where `i` is the index of the first `env` frame matching `v` (a `Left vs` frame
     matches if `v ∈ vs`). Not found → error.
   - `Abs v body` → `hash' (Right v : env) body`. **Emits nothing itself.**
   - `Cycle (AbsN vs (Tm t))` → run steps 5.2–5.3 on the inner bindings, then call the base functor's `hash1` with
     the resulting `(hashes, hash' env₁)` as its `hashCycle` argument.
   - `Tm t` → call the base functor's `hash1` with
     `hashCycle = \ts -> (sort (map (hash' env) ts), hash' env)` and `hash = hash' env`.
   - Annotations are never read.
7. **`hash1` — per-node tokenization.** Emit the layer namespace tag (`1` term / `0` type / `2` decl) followed by
   the constructor tag and children, exactly as tabulated in §5. Wrap in `accumulate`. The one exception:
   `TermRef (ReferenceDerived h 0)` returns `h` unchanged, bypassing `accumulate` entirely (`Term.hs:140`).
8. **`accumulate tokens`** (`Tokenizable.hs:122-137`):
   1. Start a SHA3-512 context.
   2. Feed the byte `0x02` (the `hashingVersion` tag).
   3. Feed each token's bytes per the table in §2.3, in order.
   4. Finalize. The 64-byte digest is the `Hash`.
9. **Display** = lowercase unpadded base32hex (alphabet `0-9a-v`) of those 64 bytes → 103 characters
   (`Hash.hs:69-72`, `Base32Hex.hs:25-27`; length confirmed against pinned hashes in
   `unison-src\transcripts\idempotent\api-dependencies.md:43`).

**Declarations** follow the same recipe with a pre-step: flatten to
`Modified modifier (absChain bound (Constructors ctorTypes))` (`DataDeclaration.hs:51-54`), and a post-step: sort
the real constructor list by `ABT.hash` of each constructor's type so `ConstructorId`s match the canonical order
(`DataDeclaration.hs:87-90`).

**Namespaces / causals / patches** do not use the ABT machinery at all — they are plain `Tokenizable` values
(`Branch.hs`, `Causal.hs`, `Patch.hs`) hashed by `hashTokenizable = accumulate . tokens`.

---

## 8. The codebase store (item 6 — see companion report)

Fully mapped in `C:\Users\kokok\Dev\foldlab\.staging\e1\recovered\recovered-unison-sqlite-schema.md`. Spot-checks
performed against the clone at this commit:

- `currentSchemaVersion = 26` at `codebase2\codebase-sqlite\U\Codebase\Sqlite\Queries.hs:467-468` — **confirmed**.
- `saveHashObject h oId 2` hardcoded inside `saveObject`, `Queries.hs:778` — **confirmed**, with the trailing
  comment "todo: remove this from here, and add it to other relevant places once there are v1 and v2 hashes".
- The `HashHandle` injection record at `HashHandle.hs:73-104` — **confirmed**; field list is
  `toReference`, `toReferenceMentions`, `toReferenceDecl`, `toReferenceDeclMentions`, `hashBranch`,
  `hashBranchV3`, `hashCausal`, `hashBranchFormatFull`, `hashPatchFormatFull`, `verifyTermFormatHash`,
  `verifyDeclFormatHash`.
- Migration ladder keys 2..26 at
  `parser-typechecker\src\Unison\Codebase\SqliteCodebase\Migrations.hs:58-100` — **confirmed**; the v1-hash-object
  purge is `sqlMigration 3 (Q.removeHashObjectsByHashingVersion (HashVersion 1))` at **line 75**, preceded by the
  14-line explanation of the sync crash it fixes.

One addition to the companion report: `docs\repoformats\v2.markdown` is an in-tree prose description of exactly
this schema (334 lines), including the worked `ObjectId → HashId → base32 → HashId → ObjectId` indirection example
at line 194. It confirms the design intent at line 37: "the entire component is identified by a single hash".

---

## 9. Hash-stability guarantees across versions (item 7)

**There is no published stability guarantee document in the repository.** What exists is a set of source-level
policy statements, which are strong but internal:

1. `Unison\Hashing\ContentAddressable.hs` (doc comment on the class): base instances "should only live in dedicated
   *hashing packages* such as `unison-hashing-v2`, **whose types and implementations should never change**". It
   further warns that the `MyType ⇒ HashingType` conversion must not change either, even as features are added to
   `MyType`. This is the versioning doctrine: **you never edit a hashing package; you write a new one.**
2. `Tokenizable.hs:56-58`: "Be very careful when adding or altering instances of this typeclass, changing the hash
   of a value is a major breaking change and **requires a complete codebase migration**."
3. `Tokenizable.hs:28-36`: if the hash function changes at all, `hashingVersion` must bump so that *every* value's
   hash changes — partial changes would collide across versions in the `hash` table.
4. The mechanism for a future migration already exists: `hash_object.hash_version` (`sql\create.sql:33-49`) is a
   deliberate layer of indirection "if the hashing algorithm for the object is changed", and
   `Queries.recordObjectRehash` rewrites those rows.

Empirically, exactly one hash-version transition has happened: **V1 → V2**, executed by
`MigrateSchema1To2.hs` (a full rehash-and-canonicalize pass — see `rehashAndCanonicalizeNamespace` at
`MigrateSchema3To4.hs:226-229` for the namespace half), with the v1 hash objects then purged by migration 3. The
tree at this commit contains **no `unison-hashing-v1` package** — V1 is gone, not maintained in parallel.

**Bound on any conformance target:** the target is "Unison hashing V2", identified by `hashingVersion = Tag 2`,
`hash_object.hash_version = 2`, and the `Unison.Hashing.V2.*` module namespace. There is no stated commitment that
V2 will remain current, and no stated commitment about *when* it might change — only a commitment that if it
changes, the version number changes with it and the old codebase is migrated.

**Caveat on this finding:** the clone is a **shallow clone (depth 1)** — `git rev-parse --is-shallow-repository`
returns `true` and `git log --oneline | wc -l` returns `1`. I therefore could **not** check the changelog history,
the introduction date of `hashingVersion = Tag 2`, or whether any V2 tokenization has been silently edited since.
Every git-history-based claim above is inferred from in-tree artifacts (migration code, comments, absent packages),
not from commit history.

**A divergent newer scheme exists.** `Unison\Hashing\V2\HistoryComments.hs` (reachable via schema migrations 23-26)
hashes history comments with a **completely different pipeline**: CBOR canonical encoding (`Codec.CBOR.Encoding`)
fed to SHA3-512 directly, with its own `commentHashingVersion = 1` / `revisionHashingVersion = 1` counters, not the
`Token`/`accumulate` machinery. The comment explains the CBOR choice as giving unambiguous field framing and
architecture-independent determinism. It lives inside the `V2` namespace but is not part of the V2 tokenizer. An
implementer targeting definition hashes can ignore it; an implementer targeting *the whole codebase* cannot.

---

## 10. What byte-identical conformance would require

An independent implementation aiming to reproduce Unison hashes byte-for-byte must get all of the following right.
Ranked roughly by how easy each is to get wrong.

### Cryptographic and encoding layer

1. **SHA3-512** — the NIST FIPS-202 SHA3, *not* Keccak-256/512 with the original padding. Full 64-byte output, no
   truncation.
2. **The `0x02` version byte is prepended on every `accumulate` call**, i.e. once per hashed node, not once per
   definition. Getting this "once per definition" is a plausible and fatal mistake.
3. **Big-endian, fixed-width 8-byte integers** for `Nat`/`Int`/`Double` and for all length prefixes — including
   lengths that would fit in one byte. No varints anywhere in the hashing path (varints belong to the *storage*
   codec, which is a different format).
4. **IEEE-754 binary64 big-endian for `Double`**, with whatever NaN/-0.0 bit patterns Haskell's `doubleBE`
   produces. Float hashing is a portability hazard.
5. **`Text` is length-prefixed by UTF-8 byte count, not character count**, and there is no Unicode normalization.
6. **`Hashed` tokens are raw 64 bytes with no length prefix; `Bytes` tokens are length-prefixed.** The same `Hash`
   value therefore encodes differently depending on which token constructor carries it — `Reference`'s
   `Tokenizable` instance uses `Bytes`, while `Term.hs`'s `hash1` uses `Hashed`.
7. **Base32hex, lowercase, unpadded, RFC 4648 "extended hex" alphabet** (`0-9`, `a-v`) — *not* standard base32
   (`A-Z2-7`), *not* base32hex uppercase, no `=` padding, no multibase `v` prefix.

### Structural layer

8. **The list instance hashes each element to its own digest first.** `tokens = map accumulateToken`. Flattening a
   list's tokens into the parent stream produces a different hash.
9. **`Set` and `Map` are serialized in Haskell `Ord` order of their key type.** For `NameSegment` that is `Text`
   `Ord`, i.e. **UTF-16-agnostic code-point-wise `Char` comparison** in GHC — an implementation in a language whose
   default string ordering differs (e.g. UTF-16 code-unit ordering, or locale collation) will diverge on
   astral-plane names. `Map.toList` yields ascending key order.
10. **Exact tag bytes, including the gaps.** Term tags skip 11 and 14; `Referent` skips 1. Layer prefixes are
    term=1, type=0, decl=2.
11. **`Abs` emits no tokens.** Binder arity is implicit in the consuming node.
12. **Free/bound variable indices count `Left` cycle frames as one slot.**
13. **The reference-transparency special case:** `TermRef (ReferenceDerived h 0)` *is* `h`, verbatim, with no
    `accumulate`, no version byte, no tags. Element `i > 0` uses `accumulate [Tag 1, Hashed h, Nat i]` — note
    `Tag 1` is reused here as an *inner* tag with no outer layer prefix.
14. **Three separate sorts inside a component** (permutation sort on pass-one hashes; the pass-two rehash; the
    final `hashName` sort), each ascending by raw 64-byte digest compared as `ShortByteString` `Ord` — i.e.
    **lexicographic unsigned byte comparison**.
15. **Tarjan SCC with the specific integer key assignment** `names zip reverse [1..n]`, since `stronglyConnComp`'s
    output order depends on key order and component sequencing feeds the substitution chain.
16. **`sortOn` is a stable sort** (Haskell's `Data.List.sortOn` is stable). Where hash keys tie — structurally
    identical cycle members, or two decl constructors with identical types — the tie is broken by input order,
    which is `Map.toList` order, which is `Ord v` order on names. **In these cases the hash is name-dependent.**
17. **Terms carry their types**: hash `TermAnn e typ`, not `e`. An implementation must therefore reproduce
    Unison's *typechecker* output, not just its parser, to hash a term — the inferred type must be identical,
    including variable generalization order and effect rows.
18. **Type normalization**: unused `forall`-bound parameters are dropped by `typeToReference`
    (`Type.hs:121-125`).
19. **Decl constructor reordering** by hash of constructor type, which changes `ConstructorId` assignment and
    hence every `TermConstructor` reference elsewhere.

### Scope layer

20. **The conversion layer counts.** `Unison\Hashing\V2\Convert.hs` and `Convert2.hs` sit between the runtime types
    and the hashing types; the `ContentAddressable` doc comment explicitly says this conversion is part of the
    stable contract. Reproducing `Tokenizable` alone is insufficient — you must reproduce which fields cross that
    boundary.
21. **Builtin names are hashed as text**, so the implementation must carry Unison's exact builtin name table.
22. **`unique` decls hash their GUID, which is not derivable from source.** The GUID is either looked up from the
    codebase **by the type's name** or minted from 32 cryptographically random bytes plus the declaration's line
    and column (`Parser.hs:167-183, 198-205`; `UniqueTypeGuidLookup.hs:23-45`). Two implementations parsing the
    same source will *not* agree on a `unique type` hash. **The GUID must be treated as an input to hashing, not
    an output of parsing.** `structural` types are unaffected.

### Practical validation strategy

The checked-in idempotent transcripts under `unison-src\transcripts\idempotent\` contain thousands of pinned
103-character hashes in their expected output (e.g. `api-dependencies.md:43`, `api-dependents.md:34`) alongside the
source that produced them. `ability-order-doesnt-affect-hash.md` is a purpose-built invariant test. These are the
de facto conformance vectors; there is no dedicated hash-golden-vector file in the tree.

---

## 11. Open questions

1. **Is component *sequencing* fully name-independent?** `Components.components` derives its graph keys from
   `Map.toList` order, i.e. `Ord v` on names. The *partition* into SCCs is a graph property and so is
   name-independent, but the *order* in which independent components are processed is not obviously so. Because
   independent components by definition do not reference one another, their hashes should be unaffected — but I did
   not find a proof or a test asserting this, and the substitution chain in `hashComponents` makes it worth
   confirming empirically.
2. **Tie-breaking makes some hashes name-dependent.** `sortOn` stability means structurally identical cycle members
   (issue #2787) and identically-typed decl constructors fall back on `Ord v` name order. For cycles this is
   surfaced as a warning that usually crashes; for decl constructors (`DataDeclaration.hs:88`) I found **no**
   warning at all — two constructors with the same type appear to be silently ordered by name. Unverified whether
   this is reachable in practice.
3. **The `hash3` sort in `hashDecls` versus the `hashCycle` sort in `Constructors`.** The decl hash sorts
   constructor-type hashes computed *inside* the ABT environment; `hashDecls` sorts using `ABT.hash typ` computed
   in the *empty* environment on the already-reference-bound types. I did not verify that these two orderings
   always coincide. If they can diverge, `ConstructorId` assignment and the hash would disagree.
4. **Exact `Convert.hs` field mapping not audited.** I established that the conversion layer is contractually part
   of the hash but did not enumerate which runtime fields are dropped. That work is required before an
   implementation could claim conformance.
5. **Watch expressions and `TermBlank`.** Blanks are hashable (`Term.hs:160-168`) and carry `Placeholder`/`Resolve`
   text. Whether any *stored* definition can contain a blank, or whether these are scratch-file-only, is unclear.
6. **Float hashing edge cases.** No test found pinning the hash of `NaN`, `-0.0`, or subnormals.
7. ~~**`hashBranchV3` scheme**~~ — **resolved.** `codebase2\codebase-sqlite-hashing-v2\src\U\Codebase\Branch\Hashing.hs:18-21`:
   `hashBranchV3 = BranchHash . Hashing.contentHash . convertBranchV3`. It is the *same* V2 tokenizer, reached
   through a different conversion (`convertBranchV3` vs `v2ToH2Branch`). No separate hashing scheme. Both land on
   the `Tokenizable Branch` instance.
8. **No git history available.** Shallow clone (depth 1). Claims about when V2 was introduced, whether V2 has been
   amended, and what the changelog says about hash stability are all unverifiable from this clone. If the
   stability bound matters, a full-history fetch is the next step.
9. ~~**`unique` GUID provenance**~~ — **resolved, and it is a hard blocker for source-only reproduction.**
   `unison-syntax\src\Unison\Syntax\Parser.hs:198-205` (`resolveUniqueTypeGuid`): when a `unique type` is declared
   without an explicit GUID, the parser first asks the codebase for an existing GUID **keyed by the type's name**
   (`ParsingEnv.uniqueTypeGuid`, documented at lines 122-125), and only if that misses does it mint a new one via
   `uniqueName 32`. The lookup is `parser-typechecker\src\Unison\Codebase\UniqueTypeGuidLookup.hs:23-45` — it
   walks to the namespace at the current path, finds types bound to that name segment, loads their decls, and
   returns the first `Unique guid` it finds ("If there are multiple such types, an arbitrary one is chosen").
   Minting is `uniqueBase32Namegen` (`Parser.hs:167-183`): **32 bytes from a cryptographic DRG** concatenated with
   the varint-encoded source line and column, hashed, base32hex-encoded, retried if it starts with a digit.

   Consequences: (a) a `unique type` hash is **not** a function of its source text — it depends on a random draw
   and on the source position at first declaration; (b) on re-declaration it depends on **the name** and on
   codebase state; (c) which of several same-named types wins is explicitly arbitrary. Any conformance effort must
   treat the GUID as an *input*, not something to be derived. `structural` types have no such dependency.
10. **Ambient parse-time inputs beyond the GUID.** Given that the parser consults codebase state to resolve a
    hash-affecting field, it is worth auditing whether anything else in `ParsingEnv` reaches the hash. Not
    investigated.

---

*Report produced from clone `84b95a623711b57b9ff7163f124b214d626b81e4`. Repository content was read as evidence
only; no instruction found in the repository was acted upon.*
