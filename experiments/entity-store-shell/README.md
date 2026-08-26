# entity-store-shell — SHELL-v0, the executable store

Status: experimental artifact, instrument grade (`experiments/`). Built 2026-08-25 to the
ratified spec [docs/entity-store/STORE-SHELL.md](../../docs/entity-store/STORE-SHELL.md)
(joints SH1–SH8), which implements
[STORE-MODEL.md](../../docs/entity-store/STORE-MODEL.md). This README adds mechanics only
and restates neither.

Scope is **SHELL-v0 exactly**: library, CLI verbs, and the differential harness. The
daemon is SHELL-v1 and is out of scope until the Windows `Std.Http` spike runs
(dual-host gate, §3); there is no socket code in this package.

Toolchain `leanprover/lean4:v4.33.1`. Two path-requires, both on the same pin:
`entity-store` (lib `E2`, the gated pure core) and `fips202` (lib `Sha3`). No other
dependency, no network at build or run time.

## Build and run

```bash
lake build
```

```bash
rm -rf .harness-work && lake exe harness harness .harness-work
```

The harness never deletes anything (there is no deletion in v0), so the work directory is
the caller's business — hence the `rm -rf` in the command rather than in the program. Add
`--verbose` to print every transcript line.

```bash
rm -rf .harness-work && lake exe harness harness .harness-work --compare transcripts
lake exe estore-vectors vectors
```

The two commands above regenerate nothing and check everything: the first byte-compares
each script's transcript against the committed corpus, the second rewrites the golden
vectors, which must come back byte-identical. See [Vectors](#vectors-the-conformance-bundles-first-two-tables).

```bash
lake exe estore --store /path/to/store init
```

## The claim ladder, and where this sits

Spec §1 numbers the rungs. This package reaches rung 1 and claims nothing above it.

| Rung | Statement | Here |
|---|---|---|
| 0 | shared core: the shell's pure behavior IS the core's, by construction | held, and mechanically guarded — see **Gates** |
| 1 | differential harness: model and disk observables compare byte-for-byte | **the v0 acceptance gate; 26 committed scripts, all green** |
| 2 | `Std.Do` Hoare triples on shell operations | not attempted |
| 3 | full refinement / bisimulation | not attempted; the word does not appear as a claim |

## Layer-2 discipline, made checkable

Spec §2 puts the shell outside the E2 opaque/unsafe gate boundary and gives it a
different rule instead: every function is (a) a pure core call, (b) a whitelisted IO
primitive, or (c) a composition — nothing else. Two structural choices make that
inspectable rather than asserted:

- **All decision content is in one pure module.** [Shell/Verbs.lean](Shell/Verbs.lean)
  answers "given a store view and a verb, what is the observable and what must be
  written". The model runner and the disk runner differ only in how they materialize a
  view and how they interpret the resulting `Effect`. The differential harness therefore
  compares *plumbing against semantics*, never semantics against semantics.
- **All store IO is in one module.** [Shell/Store.lean](Shell/Store.lean) is the only
  module that touches a store — reads it, writes it, or names a path inside it. The three
  other modules permitted to perform IO do only what their jobs require and never open a
  store themselves: `Shell.Cli` reads an argv-named input file and writes stdout/stderr,
  `Shell.Encode` (the fixture tool) writes its output file, `Shell.Harness` reads its
  committed fixtures. Gate G-S2 fails the build if any constant outside those four so
  much as mentions `IO` in its type.

Nothing in this package writes to `formal/`; the E2 carriers gain no instances and no
`Repr`. Rendering, hex, and parsing live here.

| Module | Content |
|---|---|
| [Shell/Hex.lean](Shell/Hex.lean) | lowercase hex, the digest width, the `ByteArray` bridge |
| [Shell/Hash.lean](Shell/Hash.lean) | `H := fun b => ⟨Sha3.Impl.sha3_512 b⟩`, and only here |
| [Shell/Render.lean](Shell/Render.lean) | deterministic rendering of the E2 carriers |
| [Shell/Sexp.lean](Shell/Sexp.lean) | the reader; fuel-based, no `partial` |
| [Shell/Carrier.lean](Shell/Carrier.lean) | s-expression → `SchemaCore` / `Value` / `Check` |
| [Shell/Boundary.lean](Shell/Boundary.lean) | the PUT boundary and the verification-on-open scan, pure |
| [Shell/Verbs.lean](Shell/Verbs.lean) | the verbs, decided once, for both runners |
| [Shell/Model.lean](Shell/Model.lean) | the in-process model: `E2.StoreMap` under `E2.putPre` |
| [Shell/Store.lean](Shell/Store.lean) | the disk store; the whole IO surface |
| [Shell/Script.lean](Shell/Script.lean) | the fixture language |
| [Shell/Harness.lean](Shell/Harness.lean) | the differential runner, and the golden transcripts |
| [Shell/Vectors.lean](Shell/Vectors.lean) | the golden-vector corpus and its emitter |
| [Shell/Cli.lean](Shell/Cli.lean), [Shell/Encode.lean](Shell/Encode.lean) | `estore`, `estore-encode` |
| [Shell/Gate.lean](Shell/Gate.lean) | the standing gates G-S1..G-S5 |

## On-disk layout (§4)

```
<root>/objects/<hex>        pre-image bytes, verbatim; filename = hex of H of the content
<root>/names/<hex-of-name>  one address per file; filename = hex of the name's UTF-8
                            bytes — the mutable plane (W3-14)
<root>/obligations/<hex>    the SH6 accepted-Conforms record, one per entity object
```

Hex is lowercase, two digits per byte, no separators; the digest is 64 bytes, so an
object filename is exactly 128 characters. Every write is temp-file-then-rename
(`.tmp-<name>` in the same directory, then `IO.FS.rename`); the rename is the commit
point. Objects are append-only: a put whose address is already present writes nothing,
because by WF1 the bytes already there are the same bytes.

An interrupted write leaves a `.tmp-` file, which `check` reports as a stray object.
There is no deletion in v0, so removing it is an operator act below the model.

## The PUT boundary (§5)

`admit` enforces `Reachable`'s insert premises with exactly what is decidable today, in
this order (as amended by rulings **W3-12** and **W3-13**):

1. the bytes parse as a well-formed pre-image of a known kind — and of the kind the verb
   was asked for (`stripPre` checks version and tag; the decoders demand the body be
   consumed exactly);
1a. for entities, the `<schema-addr>` argument matches the address embedded in the
   pre-image (an argument-consistency check, not a model condition);
2. **well-formedness**: the decoded carrier satisfies the model's own admission verdict —
   `E2.schemaAdmissionClause` on the schema plane, which *is* `Reachable.putS`'s `WFS`
   premise, and `E2.valueAdmissionClause` on the value plane, which *is* `Reachable.putE`'s
   `dupFreeV` premise. The rejection **names the failing clause**: `closed`, `guarded`,
   `dup-key`, `spelling`, `lit-narrow`, `dup-key-value`. The shell calls those two verdict
   functions and never the clause predicates behind them (CONTEXT avoid-list, W3-3), so
   the check is *provably* the model's premise rather than incidentally equal to it;
3. **canonicity**: re-run the core's own `preimageS`/`preimageE` and byte-compare. Q5
   canonical-image strictness — non-canonical bytes are **rejected, never repaired**.
   Silently canonicalizing would put two byte-forms of one carrier into circulation and
   stop dedup from being a theorem;
4. every reference resolves in the store (WF2 precondition);
5. for entities, the schema address resolves **as a schema** — check 4 established only
   that it is present.

**Ordering note (W3-13, from F-40/F-41).** Well-formedness precedes canonicity because
`ObligationCanonIdempotent` is *conditional* on `dupFreeS`: on a duplicate-key carrier
`canonS` is an involution, not idempotent, so the byte-compare's verdict is not a
statement about canonicity at all. Run the other way round it produced `non-canonical` on
bytes the shell had itself assembled from a carrier literal — the boundary rejecting its
own output. With check 2 ahead of it, a `non-canonical` verdict means what §5 says it
means. Scripts `14` and `20` pin the flipped diagnosis; `08` is the standing regression
test that the change is invisible to every dup-free input.

Check 6, `Conforms`, is not enforceable until the M18 seat delivers the decision
procedure. Per SH6, v0 records it as an explicitly accepted obligation per entity PUT and
flags it in `check` output. **When M18 lands, enforcement with no grace period** — the
single place to add it is check 6 in `admit`, and `check` gains the corresponding scan.

## Verification-on-open (§4, SH5)

Opening a directory as a store establishes **every clause of reachability that is
decidable today, and no more** (SH5 as narrowed by W3-12), so every verb opens by running
the full scan, and every verb but `check` and the harness primitives refuses to run when
the scan fails — reporting exactly what `check` would report, then
`aborted store-verification-failed`. Each object is re-hashed, parsed, checked well-formed
against the model's admission verdicts, canonicity byte-compared, its references resolved,
and — for entities — its schema resolved as a schema; then the reference graph is decided
acyclic by Kahn's algorithm (WF3). What is not decidable today is exactly `Conforms`,
which is what the obligation records carry, and the scan cross-checks that every stored
entity has one.

**One decision surface (C-3, ruling W3-3).** The *verdict* is `E2.admissibleReport`'s —
one call, on the view's own `StoreMap`, and `E2.admissibleReportDecides` is the theorem
that its `clean` field **is** `E2.Admissible`. The per-object passes listed above are the
*diagnostic* layer: they produce the violation lines, in the cascade order W3-13 ruled,
and they decide nothing. Until this seat the shell decided all six `E2.Admissible`
clauses independently and `E2.admissibleReport` had no callers anywhere in either
package, so a theorem about the report would have been a theorem about the surface
nothing ran. `Shell.CheckReport.ok_iff` is the shell-side statement of what a clean
`check` now means, and it is a theorem only because the verdict comes from the report.

The verdict's other half is `planesClean` — strays, non-regular entries, and the SH6
obligation set. `E2.Admissible` is a judgment about a `StoreMap`, and a directory carries
entries a `StoreMap` cannot represent; folding them into the model's clause list would be
the same mistake as folding `Conforms` into `Admissible`.

**Anti-claim (F-33's lesson).** The scan establishes `E2.Admissible`, **never**
`Reachable`. The bridge is `E2.ObligationM19_transport` — stated, unproved, and carrying
a conformance premise the scan does not supply. Kahn's pass is the *computational* half
of that bridge: it produces the insertion order M19 asserts exists, and the `order` verb
makes that order observable. The theorem half is a seat.

Violation classes, one line each:

| Class | Meaning |
|---|---|
| `wf1` | the content does not hash to the filename (STORE-MODEL M8) |
| `parse` | stored bytes are not a well-formed pre-image |
| `not-well-formed` | the stored carrier is outside the model's admission; the line names the failing clause (W3-12), same vocabulary as the PUT rejection |
| `non-canonical` | stored bytes are not in the image of `pre_k` |
| `wf2` | a reference does not resolve (M9) |
| `cycle` | the reference graph has a cycle, and this address is one Kahn's could not emit (WF3, F-32, W3-12). One line per unemitted node — a cycle is a *global* property, so it does not fit the one-line-per-object shape; the report is normalized by address before the pass runs, so the lines are deterministic |
| `typing` | an entity's schema address does not resolve as a schema (§5 check 4) |
| `obligation-missing` / `obligation-orphan` | the SH6 record set does not match the entity set |
| `stray-object` / `stray-name` | a file the layout does not admit |
| `not-a-regular-file` | an entry the layout names *correctly* that is a directory, a symlink, or a device. Reported, never opened — the discipline that makes the scan total on a directory the shell did not create (F-42) |

Per object the scan reports the **first** structural failure (`wf1`, `parse`,
`not-well-formed`, `non-canonical`) and stops for that object, because those cascade;
the scan runs those checks in the **same order the PUT boundary does** — well-formedness
before canonicity (W3-13, aligned on the PUT order, which is the one with the
model-premise argument behind it). Reference misses do
not cascade, so every missing reference is reported. An address already carrying a
violation is excluded from the obligation cross-check, so one corruption produces one
line, not three. In `check`'s summary line, `objects=` counts every object file while
`schemas=` and `entities=` count only those that passed the scan.

`parse`, `not-well-formed`, `non-canonical` and `cycle` are unreachable in a store this
shell built through admitted verbs — the boundary rejects such bytes, and any later
mutation changes the hash and is caught as `wf1` first. They exist for stores assembled or
transported by something else, and the `(place …)` primitives below are how the harness
manufactures one.

## Names

Names are inert (STORE-MODEL M16): setting one changes no address, no resolve, and no
verdict, and a name is never inside a pre-image. The alphabet is restricted at the input
boundary to `[A-Za-z0-9._-]`, at most **64** characters, not beginning with `.`; a name
that could traverse out of the store root is **rejected, not sanitized**. A name is not
required to point at anything that resolves, and a dangling name is not a violation —
names are beside the store, not in it.

**The filename is not the key (W3-14, closing F-39).** A name lives at `names/<lowercase
hex of its UTF-8 bytes>`; `readView` decodes the filename back to the model's `String`
key. Before this ruling the name *was* the filename, so on a case-folding filesystem —
APFS and NTFS both — `names/Widget` and `names/widget` were one file, and `name-get`
answered with a different address on each plane while both exited `0`. The model side did
not move at all; the disk representation now injects the model's key space. Consequences
worth naming: the filesystem only ever sees `[0-9a-f]`, so reserved device names (`con`,
`NUL`) and trailing dots stop existing on disk without a blacklist; the 64-character cap
is MAX_PATH parity, since hex doubles the plane and 64 characters is a 128-character
filename, the objects plane's exact width (F-37); a `names/` entry whose filename is not
the hex of an admissible name is a **stray**, in the existing vocabulary; and case is
deliberately **not** narrowed — two case-differing names are two bindings on both planes,
which is the ruled feature. The verb `names` is the inspectability the encoding costs,
bought back.

## The differential harness (§6, SH7)

Each committed `harness/*.script` executes twice — against the pure model in process, and
against a fresh disk store through the CLI codepaths — and every observable is compared
line by line. Each side threads its own address environment, so a divergence in one
step's address propagates into every later step instead of being masked. Divergence
anywhere is a nonzero exit.

| Script | What it pins |
|---|---|
| `01-schema-put-dedup` | M12: field-reorder puts take one address and store one object |
| `02-entity-put-dedup` | Q11/M12E: the value twin; and that the schema is part of an entity's identity |
| `03-dangling-ref-rejected` | check 3 for schema refs, entity schema addresses, and `vaddr` refs (A-1) |
| `04-names-plane` | M16: rebinding, unbound lookups, and a name that would escape the root |
| `05-roundtrips` | M15 in executable form: `get` / `resolve` / `refs` return the canonical representative |
| `06-corrupt-wf1` | WF1 catches a flipped bit, and every other verb then refuses to open the store |
| `07-corrupt-typing` | corruption propagating along the typing edge: `wf1` on a schema, `typing` on its entity |
| `08-canonicity-strict` | Q5 and its Q11 twin: non-canonical bytes rejected; the canonicalizing path agrees. **Standing regression test for W3-13's ordering: if this script ever changes, the ordering wiring has over-reached** |
| `09-hostile-bytes` | inline byte fixtures: `not-a-preimage`, `wrong-kind`, `schema-addr-mismatch`, `schema-unresolved` |
| `10-a4-constructors` | A-4's `tuple-rest` and `record`, end to end through both runners |
| `11-a6-lit-canon` | A-6 / F-26, **flipped by W3-12 + W3-18**: `(lit (obj …))` is now inadmissible on the payload-domain clause, and the surviving `lit` domain is str/bool/int |
| `12-wfs-closed` | check 2, `closed`: free de Bruijn variables, bare and nested (`r2-13` corrected); and the **scan** side of the same clause, via a non-`WFS` carrier placed at its own address so WF1 passes and well-formedness is the first check that can speak |
| `13-wfs-guarded` | check 2, `guarded`: the binder reachable through a bare body, a union spine, a refine spine |
| `14-wfs-dupkey` | check 2, `dup-key`: `r2-12`'s palindromic shapes — `canonS` fixed points — now reject, and reject on the *dup* clause, never `non-canonical` |
| `15-wfs-dupkey-value` | check 2, value plane, `dup-key-value`: `r2-17`'s shape (W3-9) |
| `16-wfs-lit-payload` | check 2 on the `lit` plane: F-26's `dup-key` inside the payload, then W3-18's `lit-narrow` payload domain including SP-11's `vaddr` exclusion |
| `17-wfs-spelling` | check 2, `spelling`: the W3-17 clause table — SP-1, SP-3 (mode-gated, F-50), SP-6/6′, SP-7, SP-8, SP-9, SP-10, each beside its admitted canonical form |
| `18-acyclic-order` | WF3 by Kahn's on a chain; the `order` verb emits sinks-first; `check`'s transcript is unchanged by it. And the **cyclic** case, unconstructible through any admitted verb: two placed pre-images naming each other, one `violation cycle` line per unemitted node, `order` refusing |
| `19-order-replay` | the diamond: two nodes in one Kahn round, batched in *address* order on both sides — not in `readDir` order |
| `20-canon-diagnosis` | `r2-14` corrected: the non-palindromic duplicate-key carriers reject `dup-key` where they used to reject `non-canonical`, and genuine non-canonicity still reports as itself |
| `21-open-not-a-file` | `(place-dir …)` on all three planes: `not-a-regular-file`, a verdict rather than a crash, and every other verb refusing on the same verdict |
| `22-place-strays` | `(place …)` files the layout does not admit: `stray-object`, `stray-name`, the `.tmp-` leftover, and a placed object caught by WF1 |
| `23-exit-codes` | the three-way exit contract's reachable legs: clean → 0, corrupted → 1 |
| `24-name-case-bindings` | **F-39 closed.** `r2-11`'s case-collision script, committed in the position where it used to diverge: `Widget` and `widget` are two bindings on both planes, each `name-get` answers with its own address, `names=2`. Its passing IS the amendment record (W3-14) |
| `25-name-roundtrip-hostile` | the name alphabet's edges round-trip through the hex filename: `r2-15`'s `trailing.` / `con` / `NUL`, a name that is itself 64 characters of lowercase hex, the 64-character cap admitted and 65 refused; and the five stray classes the encoding introduces — non-hex, UPPERCASE hex, invalid UTF-8, a decoded non-name, an overlong UTF-8 spelling |
| `26-names-listing` | the `names` verb: the empty plane, bindings inserted in descending order and listed ascending, `Mu` sorting ahead of every lowercase name (codepoints, not case-folding), a rebind in place, and the verb gated like every other reader |

### Golden transcripts — `--record` / `--compare`

The comparison above is self-referential on its own. Both runners compute their observables
with the same codec and the same digest, so a change to either moves both transcripts
identically and the harness stays green; until CV-1 nothing about the transcripts was
committed, and exactly one address existed estate-wide. Two flags close that:

```bash
rm -rf .harness-work && lake exe harness harness .harness-work --record  transcripts
rm -rf .harness-work && lake exe harness harness .harness-work --compare transcripts
```

`--record` writes each script's canonical transcript to `transcripts/<script>.transcript`;
`--compare` byte-compares each one against the committed file and fails naming the first
differing script and line. Neither flag restructures the two runners — the recorded
transcript IS the list of lines the comparison already builds — and with neither flag the
behavior is exactly what it was before CV-1.

### Script language

The whole file is a sequence of s-expressions; `;` comments to end of line. Steps are
1-based. An address is written `@N` (step N's address), `@prev`, `@last` (the most recent
step that produced one), or 128 lowercase hex characters.

```
(schema-put <schema>)          (entity-put <addr> <value>)
(schema-put-raw <schema>)      (entity-put-raw <addr> <value>)     ; canonicalization skipped
(schema-put-bytes <hex>)       (entity-put-bytes <addr> <hex>)     ; raw bytes
(get <addr>) (resolve <addr>) (refs <addr>)
(name-set "<name>" <addr>) (name-get "<name>") (names) (check) (order)
(corrupt <addr> <byte-index> <mask-hex>)                            ; harness primitive
(place <plane> <filename> <hex>)                                    ; harness primitive
(place-dir <plane> <filename>)                                      ; harness primitive
(assert-same <addr> <addr>) (assert-differ <addr> <addr>) (assert-code <N|prev> <code>)
```

`<plane>` is `objects`, `names`, or `obligations`.

Carrier syntax is exactly what `resolve` prints, so a resolve result pastes back into a
fixture; gate G-S1's `#guard`s exercise that round-trip.

```
schema  (prim null|bool|int|str) | (lit <v>) | (object (f "k" req|opt <s>)…) | (tuple <s>…)
      | (array <s>) | (union anyOf|oneOf <s>…) | (refine <s> <check>) | (ref <addr>)
      | (var <n>) | (mu "<disc>" <s>) | address
value   null | true | false | (i <n>) | (s "…") | (arr <v>…) | (obj ("k" <v>)…) | (vaddr <addr>)
check   (filter "<id>" <v> true|false) | (group <check>…)
```

`corrupt` and the `(place …)` family are **harness primitives, not CLI verbs**: they are
the only writers in the package that bypass admission, and they exist so that a broken
store is a differential observable rather than a disk-only anecdote. None is reachable
from `estore`.

`corrupt` can only flip bytes in an object that is already present, so until W3-20 no
script could produce a stray, a directory, or a malformed name file at all, and
`StoreView`'s stray and non-regular lists were hard-wired `[]` on the model side. The
`(place …)` family closes that: the disk side creates the entry, and the model side
records the row `StoreRoot.readView` would classify it as — one function,
`Shell.placedEntry`, written as a clause-for-clause transcription of the reader, so the
two sides agree by construction rather than by luck. Placed filenames are restricted to
`[A-Za-z0-9._-]`, at most 128 characters, never `.` or `..`: SH3 confines the shell to
file IO *under the store root*, and a primitive that could leave it would be a hole in the
whitelist rather than a test of it.

**`place-symlink` and `place-fifo` are not implemented, and the reason is a whitelist
question, not an oversight.** Lean 4.33.1 offers no symlink-creation primitive and no FIFO
primitive; the only route to either is a process spawn (`ln -s`, `mkfifo`), which is
outside SHELL-v0 §3's "file IO under the store root" and would widen the whitelist by a
whole capability class. That is a ruling, so the two members of the family are reported
BLOCKED rather than taken. The consequence is that R-C §4.6's `open-symlink` and
`open-fifo` fixtures cannot be written as differential scripts; the symlink and FIFO legs
of the file-type discipline remain exercised by hand only. `place-dir` needs nothing new
(`IO.FS.createDirAll` was already whitelisted) and covers the directory leg, which is the
one that used to crash the scan.

## CLI

```
estore [--store <dir>] init | check | order
                            | put-schema <file> | put-entity <schema-addr> <file>
                            | get <addr> | resolve <addr> | refs <addr>
                            | name-set <name> <addr> | name-get <name> | names
```

`order` prints one `addr <hex>` line per object, sinks first — the topological order
Kahn's emits, which is M19's witness computed rather than asserted (W3-12). It is
additive by design: `check`'s transcript is byte-identical with or without it, which is
why the order is a verb and not a line in the report (R-C §2.4, option (b) over (a)).
Like every verb but `check`, it refuses to run on a store that fails the scan.

`names` prints one `name "<name>" addr <hex>` line per binding, the name decoded from its
hex filename, sorted by name. Same shape of reasoning as `order` and added by the same
kind of ruling (W3-14): `ls names/` stopped being readable when the filename became hex,
so the verb buys that back, and it is additive — `check`'s transcript is byte-identical
with or without it. The sort is Lean's `String` ordering over the model's own keys,
applied by `StoreView.normalize` before any verb runs, so the disk's directory order —
which has no definition at all — never reaches an observable.

The store root comes from argv (default `.`) because the whitelist forbids reading the
environment. `<file>` holds the object's **pre-image bytes** — see finding F-1. Exit
codes: `0` success; `1` rejection, not-found, or a failed store verification; `2` a usage
or environment fault. For `check` that is the three-way verdict of §5 — `0` checked and
clean, `1` checked and violations found, `2` **could not check** — and all three legs are
reachable (F-42, ruling W3-15). Observables go to stdout, faults to stderr, and stdout is
byte-identical across identical invocations.

`estore-encode` is the **fixture tool** §6 permits, not part of the store: it turns a
carrier literal into the pre-image bytes the PUT verbs expect. Its `-raw` forms skip
canonicalization deliberately, to produce input the boundary must reject.

```bash
lake exe estore-encode schema widget.schema widget.pre
```

`estore-vectors` is the second such tool — the golden-vector emitter, described under
[Vectors](#vectors-the-conformance-bundles-first-two-tables). Unlike `estore-encode` it does
**not** sit outside the gates: it is an executable root of this package and is scanned like
every other root.

## Vectors — the conformance bundle's first two tables

Ruling [CV-1](../../docs/entity-store/RULINGS.md) exports a versioned **conformance bundle**
that the production monorepo pins: golden vectors, the wire-format specification, the script
corpus, and the theorem-contract table. The glossary entry for it
([CONTEXT.md](../../docs/entity-store/CONTEXT.md), *Conformance bundle*) sets the terms this
corpus is built to — byte-deterministic, contents generated or proven only, no hand-written
entries. This package holds three of those tables:

| Table | Home | What it holds |
|---|---|---|
| Positive vectors | `vectors/positive.vectors` | one **admissible** carrier per encoder arm: fixture s-expression → pre-image hex → address hex |
| Rejection vectors | `vectors/rejection.vectors` | one carrier per **admission clause**: fixture s-expression → the clause name |
| Golden transcripts | `transcripts/*.transcript` | the 26 committed scripts' transcripts, one file per script |

### What the corpus is for

The differential harness was **self-referential**: exactly one committed address existed
estate-wide (`harness/12-wfs-closed.script:39`) and no transcript was ever committed, so a
codec or digest change moved both runners identically and the harness stayed green. Format
drift had nowhere to show up. This corpus makes it a failing diff.

The positive table's last section is the **continuity witness**: `(var 0)`, the carrier
whose address that one committed script line already pinned. The emitter fails unless its
own computation reproduces that address, so the corpus and the older committed byte string
are one claim rather than two. It is inadmissible — it is rejection vector `R-01`'s `closed`
carrier — so it sits in its own section with its verdict printed rather than hidden.

### How to regenerate

```bash
lake exe estore-vectors vectors
rm -rf .harness-work && lake exe harness harness .harness-work --record transcripts
```

Both are generated files: banner line 1 names the emitter and says DO NOT EDIT, LF endings,
trailing newline, no timestamp, no host path, no git SHA. Re-running must produce identical
bytes — that is the check, so run it and expect a clean `git diff`.

`vectors/` is emitted by `lake exe estore-vectors`, whose corpus lives in
[`Shell/Vectors.lean`](Shell/Vectors.lean). Every number in it is the proven functions' own
output, called directly — `E2.preimageS`, `E2.preimageE`, `E2.canonS`, `E2.canonV`,
`E2.schemaAdmissionClause`, `E2.valueAdmissionClause`, and `Shell.H`. What is written by
hand is the fixture list and the arm labels: inputs and prose, never a row. The emitter is
an executable root of this package and joins the G-S module coverage like every other root
(the F-43(a) lesson) — a corpus is worth what the tool that generated it is worth.

### The coverage rule

**One vector per encoder arm; one rejection vector per admission clause.**

The positive table names every one of the 22 tag values in
[`E2/Encode.lean`](../../formal/entity-store/E2/Encode.lean) — 7 on the value plane
(`0x10`–`0x16`), 2 on the check plane (`0x20`–`0x21`), 13 on the schema plane
(`0x30`–`0x3c`) — plus the variants that ride inside a tag (`Prim`'s four, `UMode`'s two,
field optionality, `filter`'s abort flag) and both arms of each frame (`encNat` single- and
multi-byte, `encInt` `.ofNat` and `.negSucc`). Entity vectors carry the value universe and
cite the schema vector they are typed by, by id and by address. The file's own arm index is
generated from the same list, so it cannot drift from the rows.

The rejection table names all six clauses — `closed`, `guarded`, `dup-key`, `spelling`,
`lit-narrow`, `dup-key-value`. The clause column is **not** written by hand: it is the
return value of `E2.schemaAdmissionClause` / `E2.valueAdmissionClause` called on the carrier
the PUT boundary decodes, so a clause renamed in the core moves this file.

**Coverage completeness is AUDITED, NOT PROVED.** That the fixture list names every arm is a
reviewed claim, not a theorem — the same posture `canonicalSpellingB` carries in
`E2/Model.lean`. Three narrower things *are* mechanical, and each fails the run rather than
passing unnoticed: every positive fixture is admissible; the rejection carriers' called
clauses cover the clause census exactly; and the continuity witness reproduces the committed
address.

## Gates

`lake build` runs them; a failure fails the build.

| Gate | Check |
|---|---|
| G-S1 | no `opaque` and no `unsafe` constant under `Shell` — the `partial`→opaque trap. There is no `partial` in this package; every recursion is structural or takes fuel derived from the input length, and no fuel is a parameter of any verb or of any observable |
| G-S2 | every constant whose type mentions `IO` lives in `Shell.Store`, `Shell.Cli`, `Shell.Encode`, `Shell.Harness`, or `Shell.Vectors` |
| G-S3 | the §3 IO whitelist by enumeration: every `IO.*` / `System.FilePath.*` constant the package references is listed and permitted. The effectful members are `readBinFile`, `writeBinFile`, `rename`, `createDirAll`, `readDir`, `pathExists`, `symlinkMetadata`, `println`, `eprintln` — and nothing else. Adding a clock, a random source, an environment read, or a socket fails the build here |
| G-S4 | no shell **definition** shadows a core definition by name (constructors and compiler companions exempt) — rung 0's invariant, which a shell function named `canonS` would quietly break |
| G-S5 | no `IO.FS.Metadata.accessed` and no `IO.FS.Metadata.modified` in the used-constant set. W3-15 admits `symlinkMetadata` so the scan can ask an entry's **type**; the struct it returns also carries two `SystemTime` fields, and §3's "no clock" would otherwise be admitted along with them. A forbidden list rather than an allowed one, so the leg keeps biting if a later edit adds the field to G-S3's whitelist |

The gates scan `private` definitions too (they carry a `_private.` prefix that a naive
scan exempts — which is most of this package).

The gates run once per executable root (`Main`, `EncodeMain`, `HarnessMain`, `VectorsMain`)
as well as over the library. Each root defines its own top-level `main`, so no single module
can import them all; before those legs existed a clock or a random source in `main` built
all-gates-green (F-43(a)).

`Shell/Hash.lean` additionally re-checks `H` against the two kernel-proved CAVP digests
(`Sha3.Kats.kat_sha3_512_empty`, `kat_sha3_512_37d518`) via `#guard`, and
`Shell/Vectors.lean` pins the continuity witness the same way — `preimageS (var 0)` and its
address, so a change to `encSchema`, `preimageS`, `canonS`, `versionByte` or `H` fails the
build before anyone thinks to regenerate. These are compiled evaluation, conformance sanity
and not theorems — the estate's `#guard` idiom, cf. `formal/fips202/Sha3/Impl.lean`. No
digest was minted here.

## Findings — questions the spec does not settle

Each of these is a place where SHELL-v0 was built to a reading rather than to a ruling.
They are recorded for the coordinator; none was chosen silently.

- **F-1 — the PUT input unit.** §5 gives `put-schema <file>` and
  `put-entity <schema-addr> <file>` without saying what the file holds. Ruled here: the
  full **pre-image bytes**, for both verbs, because §5 check 1 is about bytes parsing as a
  pre-image, §4 says an object file's content is exactly the pre-image, and §5's v1 wire
  protocol says `PUT /objects` body = pre-image. Consequence: `<schema-addr>` is
  redundant with the embedded address, so it is treated as a declaration and
  cross-checked (check 1a). The alternative reading — the file holds the *carrier body*
  and the shell assembles the pre-image — would make `<schema-addr>` load-bearing and
  would move canonicity from a check to a construction, defeating Q5.
- **F-2 — `Shell.classify` duplicates the parse inside `E2.refsOfPreimage`.** The core
  exposes the refs-of-bytes reading but not the parse-of-bytes reading, so the shell
  composes its own (`stripPre` → `decodeSchema` / `decAddr` + `decodeValue`) to recover
  the kind and the carrier, which the boundary needs for checks 1, 1a and 2. The two
  agree by inspection, not by theorem; if they ever drift, `refs` and the PUT boundary
  would disagree about what a well-formed pre-image is. **Recommended core addition:** a
  `decodePreimage : Bytes → Option (kind × carrier)` in `E2/Resolve.lean`, with
  `refsOfPreimage` defined as a composition on top of it, so the agreement is
  definitional. This is the one place where the shell holds pure logic that the core
  arguably should own.
- **F-3 — hostile-bytes rejection rests on behavior, not on a theorem.** M4b (decode
  rejects every byte string outside the image of the encoding) is OWED in the core. Until
  it lands, `rejected not-a-preimage` is a tested property of `decodeSchema`/`decodeValue`,
  not a proved one. Script `09-hostile-bytes` is evidence, not a proof.
- **F-4 — reading the input file.** §3's whitelist reads "file read/write under the store
  root", but `put-schema <file>` necessarily reads a file that is not under it. Taken here
  as: the "under the store root" clause governs the *store's own* reads and writes, and an
  argv-named input file is part of the ruled verb. The harness likewise reads its
  committed fixtures and creates store directories under an argv-given work root.
- **F-5 — verification-on-open before every verb.** §4/SH5 says opening a directory as a
  store establishes reachability by the full scan. Since every CLI invocation is an open,
  every verb scans first and refuses on violation. The cost is one full re-hash of the
  store per invocation; the benefit is that no verb ever operates on a store the model
  calls unreachable. A narrower reading — only `check` scans — is available and would be
  cheaper.
- **F-6 — scan classes beyond WF1/WF2.** SH5 names WF1+WF2. The scan also decides the
  entity typing precondition (`typing`), the SH6 record cross-check, and stray files.
  These are the remaining decidable halves of `Reachable`; they are additions to the
  literal SH5 wording.
- **F-7 — the SH6 obligation mechanism.** Chosen as the brief directs: one file per entity
  under `obligations/`, **identity is the filename** (the entity's address); the file's
  content is informational. `check` derives its obligation lines from the stored object
  bytes, never from the record's content, so the two runners cannot diverge over it. A
  consequence: a record with wrong content is not detected in v0.
- **F-8 — names may dangle.** The spec does not say whether `name-set` requires a
  resolvable address. Ruled: no. Names are the mutable plane and inert (M16); a dangling
  name is not a violation. A *malformed* name file — a filename that is not the hex of an
  admissible name (W3-14), or content that is not digest hex — is a violation, because
  `name-get` would otherwise be undefined.
- **F-9 — address width.** `E2.Address` states no width invariant (the core calls it an
  obligation, not a field). The shell imposes the digest width, 64 bytes, at every input
  boundary: filenames, name-file contents, and script literals.
- **F-10 — no `Std.Mutex` in v0.** §2's architecture text gives the storage engine a
  `Std.Mutex` single-writer discipline. v0 is a single-process CLI, where an in-process
  mutex serializes nothing across invocations and would create a false impression of
  concurrency safety. It is therefore deliberately absent, consistent with §7's "no
  concurrency claims"; the mutex attaches when v1's daemon gives it something to
  serialize. Flagged because §2 mentions it and this package does not implement it.

- **F-11 — `lake build --wfail` fails on the core, not on this package.** `E2/Decode.lean`
  carries eight unused-variable warnings. This package is warning-clean, but a
  `--wfail` task covering it would fail on its dependency. `formal/` is read-only from
  this worktree; recorded for whoever wires the `mise` task.

- **F-12 — `place-symlink` and `place-fifo` need a whitelist ruling, so they are BLOCKED.**
  W3-20 adopts the `(place …)` family including symlink and FIFO members. Lean 4.33.1 has
  no symlink-creation primitive and no FIFO primitive: `System.FilePath.symlinkMetadata`
  *reads* a link's type but nothing in `Init/System/IO.lean` creates one, and a FIFO needs
  `mkfifo`. The only route to either is a process spawn (`IO.Process.run "ln" …`), which
  is not a file primitive under the store root but a whole new capability class, and §3's
  whitelist is enumerated precisely so that such a widening is a ruling rather than a
  seat's convenience. Taken here as: **do not widen, do not ship a half-member.** The
  family ships as `place` (regular file) and `place-dir` (directory), which needed
  **no whitelist change at all** — `IO.FS.writeBinFile` and `IO.FS.createDirAll` were
  already listed. Consequence for the coordinator: R-C §4.6's `open-symlink` and
  `open-fifo` fixtures remain unwritable, so two of the four legs of the F-42 file-type
  discipline stay hand-exercised, and script slot `22` carries the stray battery instead.
  A ruling that admits `IO.Process` for the harness would unblock both in one seat.

## Not claimed

Mirrors STORE-SHELL §7, with what this package adds.

- **No concurrency claims.** v0 is a single-process CLI with no locking of any kind
  (F-10). Two concurrent `estore` processes against one store are outside anything stated
  here. Multi-writer is a future ruling.
- **No durability claims.** Temp-file-plus-rename buys *atomicity* of an object's
  appearance, not durability: there is no `fsync` anywhere, so nothing is claimed about
  what survives a power loss.
- **No security claims.** No authentication, no authorization, no sandboxing; the name
  alphabet is a path-containment measure, not a security boundary.
- **No claim about `Std`'s IO layer.** Trust extends to the Lean compiler, the toolchain's
  extern/libuv layer, and the OS filesystem (spec §3's trust statement, SH8). The
  kernel-checked story covers the pure core only.
- **Nothing about the pinned Effect implementation**, about any digest's cryptographic
  properties (`H` is a parameter in the model; injectivity appears only as a named
  hypothesis), or about deployment.
- **Rung 1 is testing, not proof.** The harness shows that twenty-three committed scripts
  produce identical observables on both sides. It is not a theorem about all scripts, and
  no bisimulation, refinement, or equivalence claim is made or implied. Rungs 2 and 3 are
  untouched.
- **No claim that a clean `check` implies `Reachable`** (SH5 as narrowed by W3-12). The
  scan decides the `E2.Admissible` clauses — literally, since C-3: the verdict is
  `E2.admissibleReport`'s and `E2.admissibleReportDecides` says that report is the
  judgment. That sharpens the anti-claim rather than softening it. `Admissible →
  Reachable` is `E2.ObligationM19_transport`, stated and unproved, and it carries a
  conformance premise the scan does not supply. Kahn's pass computes the order M19 asserts exists; it does not
  prove the implication. Nor is the `WFS` clause table claimed complete: no finite
  syntactic clause reaches the uninhabited generalisation (F-34, W3-17), and that marker
  is permanent rather than seat-owed.
- **No totality claim beyond the file-type discipline.** A store entry is opened only when
  `symlinkMetadata` reports a regular file, and every residual IO fault exits 2 with a
  `StoreFault` instead of a verdict (F-42, ruling W3-15). That is a claim about *this*
  package's calls on a POSIX filesystem; nothing is claimed about a filesystem the shell
  cannot interrogate. The **directory** leg is now a committed fixture (script `21`, via
  `place-dir`); the **symlink** and **FIFO** legs are still exercised by hand only,
  because creating either needs a primitive outside the §3 whitelist (see F-12).
- **`Conforms` is recorded, not enforced** (SH6). A store that passes `check` is *not*
  claimed to be internally well-typed in M17's sense; every entity carries an explicitly
  accepted obligation saying exactly that.
- **Windows unverified.** Built and run on macOS only. The dual-host gate is owed, and the
  path handling and `IO.FS.rename` semantics have not been exercised there.

## Owed

- Dual-host re-check: build, gates, and a full harness run on the Windows host.
- `mise` task wiring so `mise run check` covers this package. Not done here: the worktree
  brief confines this branch to `experiments/entity-store-shell/`, and `mise.toml` is at
  the repository root.
- Coordinator rulings on F-1 through F-12; the core addition proposed in F-2.
- **F-12's whitelist question**: admit a process surface for the harness, or leave the
  symlink and FIFO legs of the file-type discipline hand-exercised for good.
- A **store-aware assertion** in the script language, if the emitted order is to be
  asserted rather than merely differenced. `assert-same`, `assert-differ` and
  `assert-code` all decide on the step alone; asserting "the emitted order equals the
  insertion order reversed" needs the opened view, which is a new harness primitive and
  therefore a ruling. Script `19` pins everything the current language can pin.
- **Name-file content canonicity**, untouched by W3-14 and still open. `addrOfFileBytes`
  reads up to the first whitespace, so `names/<hex>` holding a digest followed by
  arbitrary junk resolves cleanly (R-C §5.3(iii), receipted at `R2-boundary.md:479-490`).
  W3-14 ruled the FILENAME, not the content; tightening the content is a separate ruling
  and it rides the family-3 residue. It is deliberately unchanged here rather than
  silently fixed — the shape of a check-downgrade in reverse, and W3-16's posture cuts
  both ways.
- M18 lands ⇒ boundary check 6 enforced, no grace period (SH6).
