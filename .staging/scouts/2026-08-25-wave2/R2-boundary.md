# R2 — BOUNDARY: breaking the executable store

Scout report, wave 2, REFUTER 2. **ADVISORY (G0), pre-grade.** Every claim below carries a
receipt (a command and its verbatim output, reproduced in this session) or the
`UNVERIFIED:` form. Nothing here is a ruling; nothing here is proved.

Artifacts under attack: `experiments/entity-store-shell` @ working tree of `d994bd3`,
built with `~/.elan/bin/lake build` on macOS 25.2.0 / APFS. Baseline reproduced first:
**build green, gates printed (`shell gates ok (884 constants scanned)`), 10 committed
scripts pass** (`harness: 10 scripts, all model/disk observables identical`). All work ran
in `…/scratchpad/wave2-r2/`; `git status --porcelain` at exit shows no repository file
touched.

---

## RESULT

**The store broke on four of the five named targets.** Three are reproducible crashes or
divergences; one is a spec-level gap strictly wider than the finding that named it.

| # | Target | Verdict | Headline |
|---|---|---|---|
| 1 | Differential divergence | **BROKEN** | Two names differing only in case are two bindings in the model and one file on disk. `name-get` returns a **different address** on each side — a silent wrong answer, not an error. |
| 2 | PUT boundary / F-21 | **BROKEN — F-21 explodes** | The §9 claim that duplicate keys are "operationally covered by the canonicity byte-compare" is **false**: `canonFields` is an involution, and involutions have fixed points. Worse, the boundary enforces **none** of `WFS` — not `dupFreeS`, not `closedB`, not `guardedB` — although all three are decidable today. `check clean` does not imply `Reachable`. |
| 3 | Verification-on-open | **BROKEN** | A directory where a file should be → **uncaught Lean exception**, no report, exit code **1 — indistinguishable from "violations found"**. A FIFO → **unbounded hang**. |
| 4 | The G-S gates | **BROKEN (three holes)** | Clock + `getEnv` + `IO.rand` in `Main.lean` build with **all four gates green**. A leading underscore evades G-S1/G-S2/G-S4. G-S4 does not scan the `Sha3` namespace — the digest itself can be shadowed silently. |
| 5 | Resource behaviour | measured, no crash | No stack overflow at nesting depth 2 000 000. But `H` runs at **~26 KB/s** (2 MB object = 76 s), and *every verb* re-pays the full scan (F-5). |

The one target that held: **hostile bytes proper.** Truncation, oversized LEB128 length
claims, wrong version/kind bytes, invalid UTF-8, trailing garbage, and hand-encoded
unsorted fields were all rejected, including the non-minimal-LEB128 parser differential.
The full attack list is in §2.4.

---

## Target 1 — differential divergence: **BROKEN**

### The divergence

`Shell.validName` (Verbs.lean:60) admits `[A-Za-z0-9._-]`. The model plane is
`NameMap := List (String × Address)`, keyed by an exact Lean `String`. The disk plane is
one file per name under `names/`. On any case-folding filesystem — macOS APFS by default
(confirmed: `File System Personality: APFS`, and `touch CaseTest.txt` is found as
`casetest.txt`), and NTFS — those two planes are not the same map.

Script (`r2-11-name-case-collision.script`):

```
(schema-put (prim int))
(schema-put (prim str))
(name-set "Widget" @1)
(name-set "widget" @2)
(name-get "Widget")
(name-get "widget")
(check)
```

Receipt — `lake exe harness …/atk …/work/a1`:

```
FAIL A1-name-case.script
     DIVERGENCE at line 10:
      model: 5 | ok 27d77d3bdd54ae5f783a56e0662b83837600334a65e75d427153ac3488fe16a469cc79259b4ed55ede9eb73d86ed5664230feeac3d922e5d1a05c45ff6338a38
      disk : 5 | ok bf279c82644b7403aaa5f6f325c6ed3197266b5715285639152c717b16ef3d320db553733deb08a6ed2c9370572b0acd73ac5468886f9dccc3d65c9098ca572e
```

Step 5 is `(name-get "Widget")`. The model answers with step 1's address; the disk answers
with step 2's. **Both exit 0.** No verb reports anything wrong.

The store directory afterwards:

```
$ ls -la …/A1-name-case.script/names/
-rw-r--r--  1 pooks  wheel  129 Aug 25 10:36 Widget
$ cat …/names/Widget
bf279c82644b7403aaa5f6f325c6ed3197266b5715285639152c717b16ef3d320db553733deb08a6ed2c9370572b0acd73ac5468886f9dccc3d65c9098ca572e
```

One file, keeping the *first* binding's spelling and the *second* binding's content —
`IO.FS.rename` onto a case-insensitively-equal path replaces the content and preserves the
existing directory entry. Had the run continued, `(check)` would have diverged too:
`names=2` on the model, `names=1` on disk.

### Scope, established by probe

The collapse is exactly the *collision*, not case handling in general. A single
mixed-case name round-trips correctly on both sides, because `readDir` returns the
filename with its stored case and `runVerb .nameGet` does an exact `List.lookup`:

```
2 (name-set "Widget" @1) => code=0
3 (name-get "widget")    => code=1
3 | rejected name-unbound "widget"
```

(`r2-…/A8-name-case-reverse.script`, PASS — both sides agree.) So the refutation is
precise: **`name-set` is not injective from the model's name space into the disk's.**

### Why this matters beyond one script

- STORE-MODEL L-names-inert / M16 says a `NameMap` change leaves every address, every
  resolve and `σ` unchanged. That still holds — nothing here touches an address. What
  fails is the *representation* of `NameMap` itself: the disk cannot hold the map the
  model holds. The README's "Names are inert (STORE-MODEL M16)" is true and beside the
  point.
- STORE-SHELL §4 makes `names/<name>` "one address per file — the mutable plane". The
  filename **is** the key, so the key space is the filesystem's, not Lean's.
- The v1 wire protocol (`GET/PUT /names/{name}`) inherits this verbatim.
- **The owed Windows leg will hit this too**, on NTFS. Two further Windows-only hazards
  that `validName` admits and I confirmed succeed on macOS
  (`r2-15-name-plane-edges.script`, steps 13–15): `(name-set "trailing." …)` — Windows
  strips a trailing dot, collapsing `trailing.` and `trailing` — and `(name-set "con" …)` /
  `(name-set "NUL" …)` — reserved device names. `UNVERIFIED:` the Windows behaviour
  itself; I have no Windows host. What is verified is that the shell admits all three
  names today.

### Ruling shapes available (recommendation withheld — I hold no design authority)

1. Restrict the alphabet to a case-closed set (lowercase + digits + `-_.`), rejecting
   uppercase at `validName`. Cheapest; makes the two planes agree by construction.
2. Keep the alphabet and make the disk plane case-preserving-and-case-exact by encoding
   the name (e.g. hex or a percent-escape) into the filename, so the file name is not the
   key.
3. Declare the store's name plane filesystem-dependent and say so in §7 "Not claimed".

### Other divergence attempts on this target — all SURVIVED

Each ran on both runners with identical observables
(`r2-16-hostile-carriers.script`, 58 transcript lines, PASS; `r2-15`, 44 lines, PASS):

- **A-4 constructors**: `(tuple-rest (prim int))` with zero positional elements;
  `(tuple-rest (prim str) (prim int) (record address))`; `(record (record (record …)))`.
- **Empty containers**: `(object)`, `(tuple)`, `(union anyOf)`, `(union oneOf)`,
  `(lit (obj))`, `(lit (arr))`, `(entity-put … (obj))`.
- **Deep `mu` nesting**: 60 nested `mu` with the same discriminator.
- **Long unions**: 200-member `(union oneOf (lit (i 0)) … )`.
- **Deep arrays**: 200-deep `(array (array …))`.
- **`vaddr` chains with unsorted keys**: `(obj ("z" (vaddr @1)) ("a" (vaddr @2)))` — the
  `canonV` sort, the `refs` order (`sAddr` heads the list, then `refsV`), and the resolve
  round-trip all agree byte-for-byte.
- **Name-plane edges**: exactly-128-char name (accepted), 129 (rejected `bad-name`), empty
  (rejected), a name spelling 128 hex characters (accepted — no collision with the object
  plane), `-`, `_`, `a.b.c`, `.hidden` (rejected), `esc/ape` (rejected), `..) ` (rejected).
- **Empty strings inside carriers**: `(mu "" …)`, `(object (f "" req …))`,
  `(filter "" (arr) false)`, and a field key containing `\t \n " \\`.
- **Nested `refine` with empty check groups**: `(group)`, `(group (filter "a" null true))`.
- **`Shell.classify` vs `E2.refsOfPreimage` (README F-2)**: probed for disagreement over
  what a well-formed pre-image is. None found — `classify`'s schema-then-entity fallthrough
  and `refsOfPreimage`'s version-then-kind dispatch agree on every input I threw, including
  a schema-tagged prefix with an undecodable body. F-2's risk is **structural drift**, not
  a present divergence.

---

## Target 2 — the PUT boundary under adversarial bytes: **BROKEN (F-21 explodes)**

Method: a Python re-implementation of the E2 wire format
(`scratchpad/wave2-r2/e2.py`), verified byte-identical against `estore-encode` before use:

```
$ estore-encode schema t.sexp t.bin ; xxd -p t.bin
ok 9649a80a…5f17 bytes=15
010032020161003002016201343003
$ python3 -c "…e2.preSchema(e2.sobject([…]))…"
010032020161003002016201343003
addr 9649a80a…5f17
```

Then 40 hand-crafted pre-images fed to `estore put-schema` / `put-entity` against a real
scratch store.

### 2.1 F-21 is FALSE as stated — and the real gap is wider

STORE-SHELL §9 and FINDINGS F-21 both say the missing `dupFreeS` is "operationally
covered today because a duplicate-key submission fails the §5 check-2 re-canonicalization
byte-compare."

**It is not.** `canonFields` (Canon.lean:53) is an insertion sort whose `insertField`
places an equal key *after* the existing run (`if key < k` is false on ties). On a
duplicate-key run it therefore **reverses** the run — the F-12 involution. An involution's
fixed points are its **palindromes**, and a palindromic run byte-compares equal to its own
re-canonicalization.

Receipt (`r2-12-dupkey-admitted.script`, PASS — model and disk agree):

```
1 (schema-put (object (f "a" req (prim int)) (f "a" req (prim int)))) => code=0
1 | ok a517f195…f91b
2 (check) => code=0
2 | check clean objects=1 schemas=1 entities=0 names=0
3 (resolve @1) => code=0
3 | ok schema (object (f "a" req (prim int)) (f "a" req (prim int)))
4 (schema-put (object (f "a" req (prim int)) (f "a" req (prim str)) (f "a" req (prim int)))) => code=0
4 | ok 93f432ea…2ad6
5 (check) => code=0
5 | check clean objects=2 schemas=2 entities=0 names=0
6 (resolve @4) => code=0
6 | ok schema (object (f "a" req (prim int)) (f "a" req (prim str)) (f "a" req (prim int)))
```

Step 4 is the sharp one: three fields keyed `"a"`, carrying **two different schemas**, and
the store calls itself clean. `resolve` hands the ambiguity straight back.

The admitted family, enumerated by the byte-level battery (all rc=0):

| Shape | Result |
|---|---|
| `a:int, a:int` (identical entries) | **ADMITTED** |
| `a:int, a:str, a:int` (palindromic run) | **ADMITTED** |
| `a:req-int, a:opt-int, a:req-int` (differing optionality) | **ADMITTED** |
| `a:int, a:int, b:str` (dup run beside a distinct key) | **ADMITTED** |
| `a:int, a:str` (non-palindromic) | rejected `non-canonical` |
| duplicate-key `vobj` in an entity, palindromic | **ADMITTED** |

The general rule: **a field list that is key-sorted and whose every equal-key run is a
palindrome is a `canonS` fixed point.** Check 2 cannot see duplicate keys at all; it only
sees sortedness.

The value twin is identical (`r2-17-dupkey-value-admitted.script`, PASS):

```
2 (entity-put @1 (obj ("a" (i 1)) ("a" (i 1)))) => code=0
3 (check) => code=0
3 | obligation conforms-unverified entity=62d1816c… schema=1b55cba1…
3 | check clean objects=2 schemas=1 entities=1 names=0
5 (entity-put @1 (obj ("a" (i 1)) ("a" (i 2)) ("a" (i 1)))) => code=0
6 | check clean objects=3 schemas=1 entities=2 names=0
```

### 2.2 The wider gap: the boundary enforces **none** of `WFS`

`E2.WFS s := closedB 0 s = true ∧ guardedB s = true ∧ dupFreeS s = true` (Model.lean:163)
is `Reachable.putS`'s premise. **All three clauses are `Bool` functions in the gated core
— decidable today, no seat owed.** The §5 boundary checks none of them.

Receipt (`r2-13-wfs-unchecked.script`, PASS — model and disk agree, so this is a boundary
property, not a plumbing one):

```
1 (schema-put (var 0)) => code=0                                   ; closedB 0 = false
2 (schema-put (mu "d" (var 0))) => code=0                          ; guardedB = false
3 (schema-put (mu "d" (union anyOf (var 0) (prim int)))) => code=0 ; guardedB = false
4 (schema-put (mu "d" (refine (var 0) (filter "f" null true)))) => code=0 ; guardedB = false
5 (schema-put (object (f "a" req (prim int)) (f "a" req (prim int)))) => code=0 ; dupFreeS = false
6 (schema-put (array (var 7))) => code=0                           ; closedB 0 = false
7 (check) => code=0
7 | check clean objects=6 schemas=6 entities=0 names=0
8 (resolve @1) => code=0
8 | ok schema (var 0)
9 (resolve @2) => code=0
9 | ok schema (mu "d" (var 0))
```

Also admitted by the byte battery: `(var 2**256)` — an open schema with an
astronomically-indexed free variable.

**Consequences, stated separately per claim discipline C5:**

1. **`check clean` does not establish `Reachable`.** STORE-SHELL §4 says "opening a
   directory as a store ESTABLISHES reachability"; README says the same. A store built
   *entirely through the shell's own admitted verbs* can hold six schemas none of which
   any `Reachable.putS` derivation admits. Every theorem quantified over `Reachable` —
   M8/WF1, M9/WF2, M15 faithfulness, NEG-2 — has no purchase on it.
2. **Three ratified documents define "legal insert" three different ways.**
   STORE-MODEL §3's prose `legalInsert` has two clauses (parses; refs closed).
   `E2.Reachable.putS` has `WFS` + `AllResolve`. STORE-SHELL §5 has five checks, four
   enforced. The shell implements §3's prose; the theorems are about `Reachable`. The
   difference is exactly `closedB ∧ guardedB ∧ dupFreeS`.
3. **This is the executable witness for F-14.** `check` decides a *set* property (every
   ref resolves somewhere in the directory). `Reachable` is a *sequential* property with
   per-step premises. The duplicate-key store above passes `check` and is producible by no
   insert sequence. F-14 said "no theorem bridges them"; this is a concrete store where
   the bridge is needed and absent.
4. **Forward landmine for M18.** SH6 rules "when M18 lands, enforcement with no grace
   period". M18's pinned statement (`ObligationM18_conforms_decidable`, Model.lean:386)
   takes `WFS s` as a **hypothesis**, and the joint-C shape is "total-on-guarded, no
   fuel". `(mu "d" (var 0))` is stored today and is not guarded. When M18 lands, the
   decision procedure has no defined behaviour on objects already in the store, and there
   is no grace period in which to remove them (there is no deletion in v0).

### 2.3 The boundary rejects bytes it produced itself

The mirror of §2.1. `schemaBytes s = preimageS s = ver ∷ kind ∷ encSchema (canonS s)`;
check 2 then recomputes `canonS` on the decoded schema. On a non-palindromic duplicate-key
run `canonS` is an involution, so the two disagree.

Receipt (`r2-14-canon-involution-self-reject.script`, PASS — both sides agree):

```
1 (schema-put (object (f "a" req (prim int)) (f "a" req (prim str)))) => code=1
1 | rejected non-canonical
3 (schema-put (object (f "b" req (prim int)) (f "a" req (prim int)) (f "a" req (prim str)))) => code=1
3 | rejected non-canonical
```

So on duplicate-key input the boundary is **neither sound** (§2.1: admits schemas outside
`WFS`) **nor complete** (§2.3: rejects the shell's own canonicalizing assembly of a
carrier literal). Stated precisely: **`admit ∘ schemaBytes` is not the identity on
carriers**, and `preimageS` is not idempotent as a byte function.

### 2.4 SURVIVED — the full attack list

Everything below was thrown and **correctly rejected**
(`scratchpad/wave2-r2/put_battery.py`, verbatim table in the session transcript):

*Check 1 — parse:* empty input; version byte alone; wrong version `0x02`; wrong kind
`0x7f`; entity pre-image offered to `put-schema` (→ `wrong-kind expected=schema
got=entity`, the only rejection that distinguishes itself); unknown schema tags `0x3d` and
`0x00`; object claiming 1 field with no body; `array` with no element; string frame
claiming 5 bytes with 2 given; **trailing garbage after an otherwise valid schema**;
invalid UTF-8 in a field key.

*Check 1 — oversized LEB128 length claims:* object claiming 2⁶⁴ fields; tuple claiming
2⁶⁴ elements; string claiming 2⁶⁴ bytes; address frame claiming 2⁶⁴ bytes; an
unterminated LEB128 run of 64 × `0x80`. All `not-a-preimage`, all promptly — `decNat`
returns a bignum and the element loops fail on the first missing child rather than
iterating the claimed count, and `readN` is bounded by the actual list.

*Check 2 — canonicity:* hand-encoded **unsorted** object fields (→ `non-canonical`, the
check working exactly as §5 intends); hand-encoded **unsorted `vobj` keys** in an entity;
and the langsec classic — **non-minimal LEB128** (`0x81 0x00` decodes to 1, as does
`0x01`) in a field count, in a string length, and in a `var` index. All three rejected
`non-canonical`. Control: correctly sorted fields admitted.

*Checks 3/4 — refs and typing:* schema ref to an absent address; schema ref of non-digest
width (3 bytes); schema ref of **zero** width; entity value carrying a zero-width `vaddr`;
entity whose embedded schema address is 3 bytes (caught one layer earlier, at the CLI
address parser, rc=2).

*Two observable nits, non-blocking:* the zero-width case renders as
`rejected dangling-ref ` with an empty hex field, and the 3-byte case as
`rejected dangling-ref 010203` — so `Rejection.render`/`Violation.render` can emit an
address field that is not 128 characters. A log parser keyed on width will mis-read it.
`Shell.Hex` enforces the digest width at every *input* boundary (README F-9) but not at
the *output* one.

### 2.5 Literature

`.staging/explore/hash-db-anatomy.md` §7.5 gives git's check as "re-hash every object's
pre-image and compare to its address — cheap: the pre-image is exactly what is on disk",
and §8.6 warns in terms that land squarely here: re-hash-on-read "catches storage
corruption, truncation, and substitution. It does **not** catch an encoder bug… 'the store
verifies itself' invites exactly the wrong inference."

§2.1/§2.2 are a third category the document does not name: **the bytes are canonical, the
hash is right, the encoder is right, and the object is still not one the model admits.**
Canonicity and well-formedness are different predicates, and this boundary only has the
first.

`UNVERIFIED:` (from my own knowledge; no network here, not checked against a source in
this repo) — git's `fsck` splits precisely these apart. Its message table carries
`treeNotSorted` **and** `duplicateEntries` as *separate* named checks, alongside
structural ones (`nullSha1`, `emptyName`, `hasDotgit`, `badFilemode`,
`unterminatedHeader`); and `transfer.fsckObjects` applies them at *receive* time — the
analogue of our §5 boundary. Git learned that a tree with duplicate entries hashes fine,
is a perfectly valid content-addressed object, and is still to be refused. If that recall
is right, our boundary has git's sortedness check and is missing its duplicate check, and
the fix has a well-trodden precedent.

The langsec framing is the standard one: this is a **shotgun parser** at the trust
boundary — `classify` re-derives structure that `E2.refsOfPreimage` also derives (README
F-2 admits the duplication and says the two "agree by inspection, not by theorem"), and
the recogniser for "well-formed stored object" is spread across `stripPre`,
`decodeSchema`, the canonicity byte-compare, and `scanObject`, with **no single predicate
naming the accepted language**. `WFS` is that predicate, it exists, it is decidable, and
the boundary does not call it.

---

## Target 3 — verification-on-open beyond scripts 06/07: **BROKEN (two crashes)**

Method: 19 hostile store *directories* assembled by Python
(`scratchpad/wave2-r2/open_battery.py`), then `estore check`. These model the case
STORE-SHELL §4 explicitly anticipates — stores "assembled or transported by something
else" (README, `parse`/`non-canonical` classes).

### 3.1 CRASH — a directory where a file should be

```
$ mkdir <store>/objects/cdcd…cd            # 128 valid lowercase hex characters
$ estore --store <store> check
uncaught exception: inappropriate type (error code: 21, is a directory)
$ echo $?
1
```

Same for `names/`:

```
$ mkdir <store>/names/widget
$ estore --store <store> check
uncaught exception: inappropriate type (error code: 21, is a directory)
```

And it poisons every verb, not just `check`:

```
$ estore --store <store> get abab…ab
uncaught exception: inappropriate type (error code: 21, is a directory)   rc=1
```

**Three separate contract breaches in one bug:**

1. **The verdict channel is corrupted.** STORE-SHELL §5 says `check`'s "exit code = the
   verdict". README fixes `1` = "rejection, not-found, or a failed store verification" and
   `2` = "a usage or environment fault". An unreadable directory entry is an environment
   fault, but it arrives as an uncaught exception, which Lean exits `1` for. Measured
   side by side:

   ```
   t6  (directory poisoning)  rc=1     ← nothing was checked
   t1  (genuine wf1 corruption) rc=1   ← checked, violations found
   t14 (clean)                  rc=0
   ```

   No caller can distinguish "checked and found bad" from "could not check at all."
2. **The output contract is broken.** README: `check` emits "one line per violation, then
   a one-line verdict… deterministic in every position." Here stdout is empty and stderr
   carries a raw runtime message.
3. **Root cause, and it collides with G-S3.** `StoreRoot.readView` (Store.lean:71)
   classifies a directory entry **by its filename only** and then unconditionally
   `IO.FS.readBinFile`s it. It never asks what kind of entry it is — and it *cannot*: the
   §3 whitelist enumerated in `Shell.Gate.ioWhitelist` contains no `metadata` /
   `FileType` / `isDir` primitive. **The whitelist forbids the check that would make
   `readView` total.** Any fix widens the whitelist, which is a ruling (SH3), not a patch.

### 3.2 HANG — a FIFO where a file should be

```
$ mkfifo <store>/objects/5656…56
$ timeout 120 estore --store <store> check
*** TIMEOUT ***
```

Unbounded block inside `readBinFile`, no timeout, no error, no report. Related, same
mechanism: `readDir` + `readBinFile` follow symlinks, so a transported store can point
`check` at anything readable —

```
$ ln -s /etc/hosts <store>/objects/1212…12
$ estore check
violation wf1 addr=1212…12 actual=fa78f5a8f5599…      ← it read /etc/hosts
$ ln -s /dev/zero <store>/objects/7878…78
$ timeout 20 estore check   → rc=124 (timeout), unbounded read
```

§7 makes "no security claims", so this is not a security refutation. It **is** an
availability and totality refutation: `check` is not a total function of the directory,
and the git-transport story (R-15c) is precisely the path by which a directory you did not
build becomes one you `check`.

### 3.3 SURVIVED — the rest of the battery

Every case below produced the right violation class and a well-formed report:

| Attack | Result |
|---|---|
| bit flipped **inside** an object body, length unchanged | `violation wf1` + `actual=` — correct |
| **two object files' contents swapped** | two `wf1` lines, one per file — correct |
| dangling ref made by **deleting the referent file** | `violation wf2 … missing=…` |
| entity whose **schema object was deleted** | `wf2` **and** `typing`, both reported (refs do not cascade — as documented) |
| **zero-byte** object file with a valid hex name | `violation wf1` |
| obligation record **deleted** for a stored entity | `violation obligation-missing` |
| obligation record for a **nonexistent** entity | `violation obligation-orphan` |
| a **directory** named as valid hex under `obligations/` | `obligation-orphan` — no crash, because `readView` never reads obligation *contents* |
| `objects/.tmp-<hex>` left by an interrupted write | `violation stray-object` |
| object filename in **UPPERCASE** hex | `violation stray-object` (`hexVal` rejects uppercase by design) |
| non-hex **subdirectory** inside `objects/` | `violation stray-object file="objects/subdir"` — no crash: the filename fails `addrOfHex` before any read |
| name file that is a **symlink** to `/etc/hosts` | `violation stray-name` (content is not digest hex) |
| `names/` entry pointing at an **absent** address | `check clean` — correct, per README F-8 |

Two documented-but-worth-restating laxities:

- **Obligation content is inert** (README F-7). A record rewritten to
  `conforms-VERIFIED by nobody` still yields `check clean` and still prints
  `obligation conforms-unverified …`, because `check` derives the line from the object
  bytes. This is the *safe* direction — the record cannot be forged into a false negative
  — but it means the SH6 record carries zero integrity and its **only** semantic content
  is presence/absence.
- **The names plane has no canonicity discipline.** `addrOfFileBytes` takes bytes up to
  the first whitespace, so `names/x` containing `00…00 and then arbitrary junk` resolves
  cleanly:

  ```
  $ estore check      → check clean … names=1
  $ estore name-get sloppy → ok 0000…0000
  ```

  The objects plane rejects non-canonical bytes (Q5 strictness); the names plane accepts
  many byte strings per binding. Not a soundness break — names are inert — but the two
  planes are governed by opposite disciplines and neither document says so.

### 3.4 A structural gap in the differential harness

None of §3.1–§3.3 is reachable from a harness script. The only writer that bypasses
admission is `(corrupt <addr> <idx> <mask>)`, which can only flip bytes in an object that
is already there. `StoreView.strayObjectFiles`/`strayNameFiles` are **hard-wired empty on
the model side** (Boundary.lean:163), so no script can produce a stray, a directory, a
symlink, or a malformed name file as a *differential* observable.

Consequence: the whole transported-store class — the class §4 says the `parse` and
`non-canonical` violation classes exist for — is tested only by disk-side anecdote, which
is exactly the thing `corrupt` was introduced to avoid. **Candidate remedy for the grill:**
a second below-the-boundary primitive, e.g. `(place <plane> <filename> <hex>)`, with the
model side extended to carry stray-file lists. That would let scripts 06/07's discipline
reach §3's cases.

---

## Target 4 — the G-S gates: **BROKEN (three holes)**

Method: `experiments/entity-store-shell` copied to
`scratchpad/wave2-r2/gateprobe`, manifest paths rewritten to absolute, then modified and
rebuilt. The repo copy was never touched. Each probe is paired with a **control** showing
the gate does fire when not evaded.

### 4.1 The executable roots are outside every scan

`Shell.Gate`'s loop is `unless (`Shell).isPrefixOf n … do continue` (Gate.lean:92). The
three `main` functions are declared at **root** namespace in `Main.lean`,
`HarnessMain.lean`, `EncodeMain.lean` — and those modules `import Shell`, i.e. they are
elaborated *downstream* of the gate. The gate structurally cannot see them.

Probe — `Main.lean` replaced with:

```lean
def main (argv : List String) : IO UInt32 := do
  let t ← IO.monoMsNow                              -- CLOCK
  let home ← IO.getEnv "HOME"                       -- ENVIRONMENT
  let r ← IO.rand 0 1000                            -- RANDOMNESS
  IO.println s!"gate-probe clock={t} env={home.isSome} rand-drawn={r != 99999}"
  Shell.runCli argv
```

Build:

```
info: Shell/Gate.lean:134:0: shell gates ok (884 constants scanned) — G-S1 opaque/unsafe clean;
G-S2 IO confined to [Shell.Store, Shell.Cli, Shell.Encode, Shell.Harness]; G-S4 no core shadowing.
Build completed successfully (84 jobs).
```

**884 constants — identical to the untouched build.** And the binary does it:

```
$ ./estore --store <scratch> init
gate-probe clock=1545480650 env=true rand-drawn=true
ok initialized …
```

This falsifies the README's G-S3 row verbatim: *"Adding a clock, a random source, an
environment read, or a socket fails the build here rather than in review."* It does not.
It also weakens STORE-SHELL §3's whitelist claim and PROCEDURE §8's "live-build side"
ledger, which reads "the enumerated IO whitelist" off this gate line.

The three roots are one line each today, so nothing is *currently* wrong — the refutation
is that the **gate does not cover them**, and a socket added to `HarnessMain.lean` for the
v1 daemon would land in exactly this blind spot.

### 4.2 A leading underscore evades G-S1, G-S2 and G-S4

`isInternal` (Gate.lean:74) returns true for any name whose final component
`s.startsWith "_"`. The rule exists to skip `_unsafe_rec`; it is over-broad. G-S1, G-S2
and G-S4 all guard on `!isInternal n`.

**Control** — plainly-named IO def appended to `Shell/Hex.lean` (not one of the four
`ioModules`):

```lean
namespace Shell
def backdoor : IO Unit := IO.println "backdoor"
end Shell
```
```
error: Shell/Gate.lean:134:0: G-S2 FAILED — IO outside the permitted modules: [(Shell.backdoor, Shell.Hex)]
```

**Probe** — same body, one character different:

```lean
namespace Shell
def _backdoor : IO Unit := IO.println "backdoor"
unsafe def _unsafeBackdoor (n : Nat) : String := unsafeCast n
end Shell
```
```
info: Shell/Gate.lean:134:0: shell gates ok (886 constants scanned) — G-S1 opaque/unsafe clean;
G-S2 IO confined to […]; G-S4 no core shadowing.
Build completed successfully (43 jobs).
```

It counted them (886, up from 884) and exempted them. The `unsafe def` is the precise
shape G-S1 exists to catch — README: *"the `partial`→opaque trap… The shell is not
proved, but it stays provable."*

**Bound on the hole, established by a further probe.** G-S3's accumulation is *not*
`isInternal`-guarded, so a non-whitelisted primitive inside an underscore-named definition
is still caught:

```lean
def _clockBackdoor : IO Nat := IO.monoMsNow
```
```
error: G-S3 FAILED — IO constants outside the SHELL-v0 whitelist: [IO.monoMsNow]
```

So the evasion is confined to the **whitelisted** primitives — which is still
`readBinFile`, `writeBinFile`, `rename`, `createDirAll`, `readDir`, `pathExists` at **any
path**, from **any module**. G-S2's stated purpose — *"bounds the effectful surface to
files a reviewer can read"* — does not hold.

### 4.3 G-S4 does not scan the `Sha3` namespace

G-S4 compares each shell definition's final name component against `E2 ++ base` only
(Gate.lean:116). The package requires **two** libraries: `entity-store` (`E2`) and
`fips202` (`Sha3`), and `Shell/Hash.lean` defines `H` in terms of `Sha3.Impl.sha3_512`.

**Control** (a genuine `E2` shadow):
```lean
def canonS (s : Nat) : Nat := s
```
```
error: G-S4 FAILED — Shell constants shadowing core names: [Shell.canonS]
```

**Probe** (a `Sha3` shadow):
```lean
def sha3_512 (b : List UInt8) : List UInt8 := b
```
```
info: shell gates ok (885 constants scanned) — … G-S4 no core shadowing.
Build completed successfully (43 jobs).
```

The digest — the one function whose silent shadowing changes **every address in the
store** — is outside the scan.

### 4.4 A wording gap, not a hole

STORE-SHELL §1 rung 0 says the shell "defines no function whose **type** could shadow a
core function". G-S4 checks **names**. These are different predicates, and the package
already contains an instance of the gap it leaves: README F-2 records that
`Shell.classify` duplicates the parse inside `E2.refsOfPreimage` and that the two "agree
by inspection, not by theorem". G-S4 cannot catch it because the name differs. I probed
for a present disagreement between them and found none (§Target 1, last bullet) — so this
is a **statement/mechanism mismatch**, not a live defect. Either §1's wording or G-S4's
scope should move.

---

## Target 5 — resource behaviour (claims-free measurement)

Measured with `/usr/bin/time -l` on this Mac. No claim about any other host.

**Deep nesting does not overflow the stack.** `(array (array … address …))` nested `N`
deep, offered as raw pre-image bytes to `estore put-schema`:

| N (nesting depth) | rc | wall | peak RSS |
|---|---|---|---|
| 1 000 | 0 | 0.03 s | 36 MB |
| 10 000 | 0 | 0.32 s | 37 MB |
| 100 000 | 0 | 3.81 s | 55 MB |
| 400 000 | 0 | 9.23 s | 104 MB |
| 2 000 000 | 0 | 76.8 s | 378 MB |

I could not break it. Reported because I expected to: `decS`, `canonS`, `encSchema` and
`refsS` are all non-tail-recursive over a 2 000 000-deep tree, and the Lean 4 runtime
absorbed it.

**The cost is the digest, not the parse.** A *flat* 2 MB payload — `(lit (s "xxx…"))`,
depth 1 — costs the same as the 2 MB deep one:

```
input bytes: 2000007
$ estore put-schema flat.bin   → real 75.79
```

So `H` (`Sha3.Impl.sha3_512` over `List UInt8`, via `bytesOfByteArray`) runs at roughly
**38 µs/byte ≈ 26 KB/s**. Since every verb opens with the full scan (README F-5), a single
2 MB object makes *every subsequent verb* on that store cost ≈76 s, forever — and there is
no deletion in v0. `estore check` on the depth-100 000 store measured `real 3.99`.

**Large-store `check`, linear-ish:**

| objects (tiny, no refs) | `check` wall | | objects (chained `(ref prev)`) | `check` wall |
|---|---|---|---|---|
| 250 | 0.43 s | | 200 | 0.63 s |
| 500 | 0.88 s | | 400 | 1.27 s |
| 1 000 | 1.71 s | | 800 | 2.74 s |
| 2 000 | 3.68 s | | 1 600 | 6.22 s |

≈1.8 ms per tiny object; ≈3.9 ms per object once it carries a reference, and mildly
superlinear (2.0× → 2.16× → 2.27× per doubling). `StoreMap.find` is a linear list scan
(Model.lean:275) called once per reference per object per verb. Separately, `checkReport`
calls `classify` — i.e. a full decode — **three times per object** (once in `scanObject`,
once building `entities`, once building `schemas`).

**None of this contradicts anything claimed.** §7 makes no performance claim and the spec
is v0-correctness-only, per the brief. It matters for v1 because SH5's amortisation
("manifest/append-log optimizations arrive only by amendment") is the natural fix, and
§2.1 shows that if check 2 is ever amortised away, the non-minimal-LEB128 forms currently
caught by it walk straight in.

---

## Candidate harness scripts

Beside this report, one rationale line each. Six pass and one fails **by design** — it is
the divergence.

| Script | Rationale |
|---|---|
| `r2-11-name-case-collision.script` | **FAILS today.** The target-1 divergence: two names differing only in case are two model bindings and one disk file, and `name-get` silently answers differently on each side. |
| `r2-12-dupkey-admitted.script` | Pins F-21's actual state: a palindromic duplicate-key run passes check 2 and `check` calls the store clean. |
| `r2-17-dupkey-value-admitted.script` | The `canonV`/`dupFreeV` twin of the above, through `entity-put`. |
| `r2-13-wfs-unchecked.script` | Pins the wider gap: six schemas outside `closedB`/`guardedB`/`dupFreeS` admitted, `check clean`, `resolve` hands them back. |
| `r2-14-canon-involution-self-reject.script` | Pins the mirror: the boundary rejects `preimageS`'s own output as `non-canonical` on a non-palindromic duplicate-key run. |
| `r2-15-name-plane-edges.script` | Regression cover for the name alphabet and width bounds, including the three Windows-hazardous names (`trailing.`, `con`, `NUL`) the shell admits today. |
| `r2-16-hostile-carriers.script` | Regression cover for A-4 constructors, empty containers, 60-deep `mu`, 200-member unions, 200-deep arrays, `vaddr` chains with unsorted keys, and empty strings in every string position. |

Note for the coordinator: `12/13/14/17` assert **today's wrong behaviour**. Committing
them now makes the hole an executable fact; when the boundary is amended, their expected
outcomes flip, and that flip is the amendment record PROCEDURE §5 asks for ("every model
change gains a differential harness script the same day"). If the grill would rather not
commit a script that encodes a defect, the alternative is to hold them here and commit the
corrected forms with the fix.

`UNVERIFIED:` I have not run these on Windows; the dual-host gate is owed and
`r2-11`/`r2-15` are the two most likely to behave differently there.

---

## Bookkeeping observation

Not a refutation, but it is exactly the drift PROCEDURE §8 predicts of a hand ledger.
STORE-SHELL §9 says "nine committed scripts, all green" and README's rung table says
"**9 committed scripts, all green**". `harness/` holds **ten** (`10-a4-constructors.script`
landed at `e9b1bcc` closing F-16), and the harness itself reports
`harness: 10 scripts, all model/disk observables identical`. Two ratified documents
disagree with the instrument. Input for the **ledger-extractor** seat.

---

## Questions for the grill

1. **What is `legalInsert`?** Three ratified texts give three answers (§2.2 point 2). Does
   the shell's boundary implement STORE-MODEL §3's prose, or `E2.Reachable`'s premises? If
   the latter, checks `1a`–`4` must gain `WFS`, and F-21's disposition should be rewritten
   to name all three clauses, not `dupFreeS` alone.
2. **Does `check clean` claim reachability?** STORE-SHELL §4 and the README both say
   opening *establishes* reachability. §2.2 exhibits a shell-built store where it does not.
   Is the claim to be narrowed to the decidable subset `check` actually decides, or is
   `check` to be widened to `WFS`? These are different rulings.
3. **F-21's disposition.** It reads "operationally covered by the canonicity byte-compare."
   That sentence is falsified (§2.1). Under PROCEDURE §6 a disposition cell updates exactly
   once — does this become the resolution of F-21, or a new F-number citing it?
4. **`preimageS` is not idempotent as a byte function** (§2.3). M12's dedup is stated over
   `canonS s₁ = canonS s₂`, which is untouched. But the *executable* dedup story — put a
   carrier, get its canonical bytes back — fails on duplicate-key input in both directions.
   Is that a boundary bug, or a carrier-admission rule that `sexpToFieldList` should
   enforce before `preimageS` is ever called?
5. **Names: which plane is authoritative?** Is the name key a Lean `String` (model) or a
   filename (disk)? Every fix in Target 1 §"Ruling shapes" answers this differently, and
   the v1 wire protocol needs the answer before `PUT /names/{name}` is written.
6. **G-S3's whitelist versus `readView`'s totality** (§3.1 point 3). Making `readView`
   total requires a file-type primitive, which the SHELL-v0 whitelist forbids. Does SH3
   admit `IO.FS.metadata` (or `System.FilePath.isDir`), or does §7 gain "no claim that
   `check` is total on arbitrary directories"?
7. **Should the gates cover the executable roots?** (§4.1.) The fix is mechanical — declare
   `main` inside `Shell`, or run `#shell_gates` from a module that imports the roots — but
   the v1 daemon's socket will live exactly there.
8. **`isInternal`'s underscore rule** (§4.2) is over-broad by roughly one line
   (`s == "_unsafe_rec" || s == "_cstage1" || …` without the blanket `s.startsWith "_"`).
   Is that a seat, or a same-day fix at adjudication?
9. **Should G-S4 scan `Sha3` as well as `E2`?** (§4.3.) And should §1's rung-0 wording
   ("no function whose *type* could shadow") be brought into line with what G-S4 checks
   (*names*), or G-S4 brought up to the wording? (§4.4.)
10. **Should the harness gain a below-the-boundary file-placement primitive?** (§3.4.) The
    transported-store class is the one §4 names the `parse`/`non-canonical` classes for,
    and today no script can reach it.
11. **M18's precondition versus the store's contents** (§2.2 point 4). SH6 promises
    enforcement with no grace period. Unguarded schemas are already storable and there is
    no deletion in v0. What happens to them?
