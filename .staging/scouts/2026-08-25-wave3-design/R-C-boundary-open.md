# R-C — the shell boundary and verification-on-open: one amendment package

**Status: G0 ADVISORY, 2026-08-25. This document decides nothing; the rulings are the
operator's.** Draft-quality design analysis for wave-2 fault family 2 (F-33, F-40, F-41,
F-32) plus the riders assigned to this lane (F-39 names plane, F-42 whitelist/totality,
F-44 amortization, F-37 git transport). Consolidation over existing design work and held
literature — no from-scratch design. Every external fact carries an in-repo or pinned-
toolchain receipt, or is marked `ACQUISITION-GAP`.

## 0. Method, and what this report is not

**Sources actually read, with what each contributed.**

| Source | Contributed |
|---|---|
| `docs/entity-store/audit/2026-08-25-wave2-faults.md` | the violated-theory statement for each fault in this lane |
| `docs/entity-store/audit/2026-08-25-wave2-triage.md` §"Recommended order of repair" item 3 | the framing: family 2 is *one* boundary amendment |
| `.staging/scouts/2026-08-25-wave2/R2-boundary.md` targets 1, 2, 3, 5 | the executable receipts — every transcript quoted below |
| `.staging/scouts/2026-08-25-wave2/r2-1{1,2,3,4,7}.script` | the reproductions, read verbatim |
| `.staging/scouts/2026-08-25-wave2/R3-p5_openscan.lean` | the kernel exhibit that `check` clean ⇏ `Reachable` |
| `.staging/scouts/2026-08-25-wave2/R3-transport-admission.md` §5.2–§5.5, §6 | the `Admissible` structure, the Kahn's proposal, the git seam |
| `docs/entity-store/STORE-SHELL.md` | every line quoted for amendment below |
| `experiments/entity-store-shell/Shell/{Boundary,Store,Gate,Verbs,Cli,Model,Script}.lean` | the actual check paths |
| `formal/entity-store/E2/{Model,Canon,Resolve,Closure,Obligations,Bridge}.lean` | the inventory of decidable procedures in §1.1 |
| `.staging/explore/hash-db-anatomy.md` §2.4, §2.5, §7.2, §7.3, §7.5, §8.4, §8.5, §8.6 | what real systems do about pre-images, refs, amortization, and integrity |
| `~/.elan/toolchains/leanprover--lean4---v4.33.1/src/lean/Init/System/{IO,IOError}.lean` | the file-metadata and typed-error API for §4 |

**Two briefed sources contributed nothing, and the absence is itself a finding.**
`.staging/explore/implementation-approach-notes.md` and `.staging/explore/state-of-play.md`
are both about a *different* program — a verified Keccak/SHA-3 primitive and Unison's
cycle hashing (`implementation-approach-notes.md:1`, `state-of-play.md:1`). Both are
self-marked exploration-grade (`implementation-approach-notes.md:3`: "Register:
EXPLORATION. Nothing here is a graded finding or a ratified decision."). Confirmed by
exhaustive grep, **neither file contains any occurrence of**: a PUT or admission boundary,
"legal insert", closed/guarded/duplicate-free as a well-formedness notion,
verification-on-open, a manifest or index or cache as a scan amortization, a names plane
of any kind, Kahn's algorithm, "topological", "insertion order", exit codes, IO error
handling, `isDir`/`FileType`/symlink/FIFO, `.gitattributes`, CRLF, path length, or
"differential". So this lane has **no prior implementation thinking to consolidate** —
which is worth stating plainly, because the brief assumed there was some. Two items in
those files are nonetheless transferable and are cited where they bite (§6.5, §4.4).

**What this report is not.** It is not a ruling, not a patch, and not a proof. It names
what would change, prices the alternatives, and marks every place where a choice needs
the operator rather than an argument. No file in the repository was edited except this
one.

---

## 1. `WFS` as a named boundary check (F-33)

### 1.1 The exact inventory: decidable procedures that exist in E2 today

`E2.WFS` is a `Prop` built from three `Bool` equalities
(`formal/entity-store/E2/Model.lean:163-164`):

```lean
def WFS (s : SchemaCore) : Prop :=
  closedB 0 s = true ∧ guardedB s = true ∧ dupFreeS s = true
```

All three conjuncts are **decidable today, in the gated core, with no seat owed**. The
full inventory, with homes:

| Procedure | Signature | Home | Status |
|---|---|---|---|
| `closedB` | `Nat → SchemaCore → Bool` | `E2/Model.lean:85` | **exists** (with `closedF:101`, `closedL:106`) |
| `guardedB` | `SchemaCore → Bool` | `E2/Model.lean:133` | **exists** (with `guardSpineB:118`, `guardSpineL:126`, `guardedF:149`, `guardedL:154`) |
| `dupFreeS` | `SchemaCore → Bool` | `E2/Canon.lean:110` | **exists** (with `keyAbsent:101`, `fieldsDupFreeB:105`, `dupFreeF:126`, `dupFreeL:131`) |
| `dupFreeV` | `Value → Bool` | `E2/Canon.lean:146` | **exists** (with `vkeyAbsent:137`, `vfieldsDupFreeB:141`, `dupFreeVF:156`, `dupFreeVL:161`) |
| `fieldsSortedB` | `FieldList → Bool` | `E2/Canon.lean:168` | **exists, and is called by nothing** |
| `refsS` / `refsV` / `refsOfPreimage` | `… → List Address` / `Bytes → Option (List Address)` | `E2/Model.lean:32,60`, `E2/Resolve.lean:60` | **exists** — the graph reading |
| `StoreMap.find` | `StoreMap → Address → Option Bytes` | `E2/Model.lean:275` | **exists** — linear list scan |
| `canonS` / `canonV` / `preimageS` / `preimageE` / `decodeSchema` / `decodeValue` / `stripPre` / `decAddr` | — | `E2/Canon.lean`, `E2/Encode.lean`, `E2/Decode.lean`, `E2/Resolve.lean:26` | **exists** — what the boundary already calls |

R2's own statement of this, with its receipt (`R2-boundary.md:232`): "`E2.WFS s :=
closedB 0 s = true ∧ guardedB s = true ∧ dupFreeS s = true` (Model.lean:163) is
`Reachable.putS`'s premise. **All three clauses are `Bool` functions in the gated core —
decidable today, no seat owed.** The §5 boundary checks none of them."

### 1.2 What is missing — five items, three of them one-liners

1. **No packaged `Bool` for `WFS`, and no `Decidable` instance.** Grep over `E2/*.lean`
   finds `Decidable` only in `deriving DecidableEq` on the carrier types
   (`E2/Core.lean:28,32,37,59,73,103`) and inside `ObligationM18_conforms_decidable`
   (`E2/Model.lean:389,391`). Nothing names the decision procedure for `WFS`. **Owed:**

   ```lean
   /-- The decision procedure for `WFS`, in the gated core so the shell CALLS it rather
       than re-implementing the conjunction. -/
   def wfsB (s : SchemaCore) : Bool := closedB 0 s && guardedB s && dupFreeS s

   theorem wfsB_iff (s : SchemaCore) : wfsB s = true ↔ WFS s := by
     simp [wfsB, WFS, Bool.and_eq_true, and_assoc]
   ```

   This matters beyond convenience. STORE-SHELL §2's layer-2 discipline (line 57-59)
   reads: "every function is (a) a pure core call, (b) a whitelisted IO primitive, or
   (c) a composition of (a)/(b) — nothing else." A shell-side conjunction of three core
   calls is a legal composition — but a **single named core call with an iff-theorem to
   the model's premise** is the shape that makes the boundary check *provably* the
   model's premise rather than incidentally equal to it. It also keeps G-S4 quiet:
   `E2.wfsB` exists, so a shell definition named `wfsB` would (correctly) fail the
   shadowing gate.

2. **No value-plane well-formedness at all.** There is no `WFV`. Per the A-3 record
   (`STORE-MODEL.md:260-262`), value-plane duplicate-freedom "stays a boundary admission,
   not a `Reachable` clause (a JS object cannot carry duplicate keys, so the excluded
   values have no host counterpart)." **The boundary is the designated carrier of that
   admission and does not carry it** — that is F-28's second half, receipted executably by
   `r2-17-dupkey-value-admitted.script`. **Owed:** either `E2.wfvB : Value → Bool :=
   dupFreeV` as a name for the admission, or an `ObligationBoundaryWFV` in the ledger
   stating what the boundary owes. Minting the name is cheaper and makes the boundary's
   call auditable.

3. **`dupFreeS (.lit _) = true` unconditionally** (`E2/Canon.lean:112`). This is F-26. A
   boundary that calls today's `dupFreeS` still admits a duplicate-key `vobj` **inside a
   `lit` payload**. R1 supplied the repair (`dupFreeS (.lit v) := dupFreeV v`, verified
   over 15,310 schemas — `FINDINGS.md:34`). **Dependency, stated flatly: this package's
   `dupFreeS` check is only as strong as F-26's repair.** If the repair does not ship
   alongside, §3's ordering argument still holds but F-40's `lit` variant survives.

4. **No decidable acyclicity anywhere.** `refsAt`, `Edge`, `Path`, `Acyclic` are *proposed*
   in `R3-transport-admission.md:567-591`; none of them exists in `E2`. Full treatment in
   §2.

5. **No `litNarrowB`** (SP-11 / F-35). MAPPING admission rule 1 forbids `vaddr` literals,
   and `R3-transport-admission.md:339-343` proves that rule is load-bearing for WF2:
   `refsS (.lit (.vaddr a)) = []` while `WFS (.lit (.vaddr a))` holds and the store is
   `Reachable`. **Out of this lane's ruling** (F-35 is "model clause owed"), but named
   here because the `WFS` call site in `admit` is *exactly* where a `litNarrowB` conjunct
   would land, and landing both in one serialization window is cheaper than two.

### 1.3 Where the check goes, and on which carrier

Two call sites, both in `Shell/Boundary.lean`.

**PUT.** `admit` (`Boundary.lean:125-148`) runs checks 1, 1a, 2, 3, 4 in that order. The
new check is a `Rejection` constructor plus one branch. **On the schema plane the subject
is the decoded carrier `p`, not the source carrier**, and that is not arbitrary — it is
forced, and the forcing argument is short enough to give in full:

- Check 2 asserts `p.canonicalPreimage = b`, i.e. `preimageS p = b`.
- `b` decoded to `p`, so `decodeSchema (encSchema (canonS p)) = some p`.
- `M4a_schema` gives `decodeSchema (encSchema (canonS p)) = some (canonS p)`
  (used exactly this way at `R3-p5_openscan.lean:21`).
- Hence **`canonS p = p`**.
- So `Reachable.putS` can fire with witness `s := p`: its stored bytes are
  `preimageS p = b`, and its premise is `WFS p`.

That is precisely R3's `Admissible.admitted` clause
(`R3-transport-admission.md:641-643`): `∃ s, WFS s ∧ canonS s = s ∧ b = preimageS s`.
**The boundary check `wfsB p && (p.canonicalPreimage == b)` establishes that clause with
`p` as the witness.** Nothing else needs to be proved to connect the boundary to the
model's premise; the connection is the two checks together.

**Scan.** `scanObject` (`Boundary.lean:215-227`) runs WF1 → parse → canonicity → WF2 →
typing. The `WFS` test slots between canonicity and WF2 (see §3 for why the *order*
relative to canonicity is the opposite here — the scan re-derives, PUT admits, and the
argument differs), and emits a new `Violation` class rather than a `Rejection`.

Sketch, in the existing style (both are pure, both run on both runners, so the
divergence property of SH7 is preserved by construction):

```lean
-- Boundary.lean, Rejection
  | notWellFormed (clause : String)          -- "closed" | "guarded" | "dup-key" | "dup-key-value"
-- Boundary.lean, Violation
  | notWellFormed (a : Address) (clause : String)

/-- The well-formedness a stored object must satisfy for the model's insert rule to
    admit it. Schema plane: `E2.wfsB`, which IS `Reachable.putS`'s premise. Value plane:
    `dupFreeV`, which is A-3's boundary admission (STORE-MODEL §7). -/
def Parsed.wellFormed : Parsed → Option String
  | .schema s =>
      if !closedB 0 s then some "closed"
      else if !guardedB s then some "guarded"
      else if !dupFreeS s then some "dup-key"
      else none
  | .entity _ v => if !dupFreeV v then some "dup-key-value" else none
```

Naming the failing clause in the observable is not decoration: R2's battery
(`R2-boundary.md:239-251`) distinguishes six admitted schemas across three clauses, and a
single `not-well-formed` verdict would make the corrected harness scripts unable to tell
a `closedB` fix from a `guardedB` fix.

### 1.4 What this closes, and what it does not

**Closes.** `HEADLINE_scan_does_not_establish_reachability`
(`R3-p5_openscan.lean:80-83`) and `dup_not_wfs` (`:133`) both become unreachable states:
every schema the boundary admits now satisfies `Reachable.putS`'s premise, with a witness.

**Does not close.** Two things, and they must be said in the same breath or the amendment
over-claims:

- **`check` clean still does not imply `Reachable`** — it implies the `Admissible`
  clauses the shell can decide. The gap that remains after §1 and §2 is `Admissible.typed`'s
  second conjunct, `Conforms env s v`, which is the M18 seat (SH6, still an obligation
  record). So SH5's wording must narrow to *what the scan establishes*, not to
  "reachability". §2 closes the acyclicity clause; conformance stays open by ruling.
- **The gap R2 names as F-14's executable witness** (`R2-boundary.md:270-273`): `check`
  decides a *set* property, `Reachable` is a *sequential* property. Even with every
  `Admissible` clause decided, the bridge from `Admissible` to `Reachable` is
  `ObligationM19_transport` (`R3-transport-admission.md:664-666`) — **stated, not
  proved**. §2's Kahn's implementation is the computational half of that bridge; the
  theorem half is a seat.

### 1.5 STORE-SHELL text changes

**Change 1 — §5, the boundary check list.**

Current (`STORE-SHELL.md:104-113`), quoted:

> The PUT boundary enforces `legalInsert` with exactly what is decidable today:
>
> 1. bytes parse as a well-formed pre-image of a known kind (decode — M4a's machinery);
> 2. canonicity: re-canonicalize and byte-compare (canonical-image strictness, Q5);
> 3. refs resolve in the store (WF2 precondition);
> 4. entities: the schema address resolves (typing precondition, schema half);
> 5. entities: `Conforms` — NOT enforceable until the M18 seat delivers the decision procedure.

Proposed:

> The PUT boundary enforces `Reachable`'s insert premises with exactly what is decidable
> today. `legalInsert` as STORE-MODEL §3 words it is **strictly weaker** than
> `Reachable.putS`/`putE`; where the two differ, this boundary implements the latter
> (F-33, F-40).
>
> 1. bytes parse as a well-formed pre-image of a known kind (decode — M4a's machinery);
> 2. **well-formedness: schemas satisfy `E2.wfsB` — `closedB 0`, `guardedB`, `dupFreeS`,
>    which IS `Reachable.putS`'s `WFS` premise; entities satisfy `dupFreeV`, which is
>    A-3's value-plane boundary admission (STORE-MODEL §7). The rejection names the
>    failing clause;**
> 3. canonicity: re-canonicalize and byte-compare (canonical-image strictness, Q5).
>    **Runs AFTER check 2 — see the ordering note below;**
> 4. refs resolve in the store (WF2 precondition);
> 5. entities: the schema address resolves (typing precondition, schema half);
> 6. entities: `Conforms` — NOT enforceable until the M18 seat delivers the decision
>    procedure. Ruled (SH6): v0 enforces 1–5 and records 6 as an explicit accepted
>    obligation per entity PUT.

**Change 2 — §9's F-21 disposition sentence.** Current (`STORE-SHELL.md:165-167`),
quoted:

> Known follow-up: the branch predates A-3, so the boundary does not yet name `dupFreeS`
> explicitly — operationally covered today because a duplicate-key submission fails the
> §5 check-2 re-canonicalization byte-compare.

That sentence is falsified twice over (`R3-p5_openscan.lean:125` `dup_canon_fixed`;
`r2-12-dupkey-admitted.script` steps 1–6). Under PROCEDURE §6 a delivery record is not a
findings row, so §9 may be corrected by a dated addendum rather than by a disposition
edit. Proposed addendum text:

> **Addendum 2026-08-25 (F-40, superseding F-21).** The sentence above is FALSE.
> `canonFields` is an involution on a duplicate-key run, and an involution has fixed
> points: a *palindromic* run byte-compares equal to its own re-canonicalization and is
> admitted (`r2-12`, kernel receipt `dup_canon_fixed`). The canonicity byte-compare
> covers sortedness only; it cannot see duplicate keys at all. Corrected by the §5 check-2
> amendment above.

### 1.6 Harness scripts that would pin it

`r2-13-wfs-unchecked.script` already exists and asserts today's wrong behaviour: six
schemas outside `WFS` admitted, `check clean`, `resolve` handing them back. Two routes:

- **Commit it now, flip it on amendment.** PROCEDURE §5's ratchet says "the harness never
  loses a script"; a committed script whose expected outcomes flip *is* the amendment
  record PROCEDURE §5 asks for ("every model change gains a differential harness script
  the same day"). R2 offers exactly this choice at `R2-boundary.md:721-726`.
- **Commit only the corrected form.** Cheaper, loses the executable record of the hole.

Proposed corrected forms, one per clause so a partial fix is visible:

| Script | Asserts |
|---|---|
| `11-wfs-closed.script` | `(schema-put (var 0))` → code 1, `rejected not-well-formed closed`; `(schema-put (array (var 7)))` likewise; `(check)` → `objects=0` |
| `12-wfs-guarded.script` | the three unguarded `mu` forms from `r2-13` lines 2–4 → code 1, `guarded` |
| `13-wfs-dupkey.script` | `r2-12`'s six shapes: identical pair, palindromic triple, differing-optionality triple, dup-run beside a distinct key — **all** now code 1, `dup-key` |
| `14-wfs-dupkey-value.script` | `r2-17`'s `(entity-put @1 (obj ("a" (i 1)) ("a" (i 1))))` → code 1, `dup-key-value` |
| `15-wfs-lit-payload.script` | **blocked on F-26.** `(schema-put (lit (obj ("a" (i 1)) ("a" (i 1)))))` — passes `dupFreeS` today by `E2/Canon.lean:112`. Commit as an expected-FAIL marker or hold until the repair lands |

---

## 2. Decidable acyclicity — Kahn's over the store (F-32)

### 2.1 The gap, receipted

`HEADLINE_wf1_wf2_insufficient` (`R3-transport-admission.md:123-128`) exhibits a store
satisfying WF1 and WF2 that contains a reference cycle and is unreachable. `check` tests
neither acyclicity nor anything implying it. The honest scope caveat is R3's own
(`:136-141`): the witness uses a colliding toy `H`, and under a preimage-resistant `H` a
cycle is computationally infeasible to exhibit — "but 'infeasible' is a cryptographic
claim the model deliberately never makes."

That caveat cuts *for* implementing the check, not against it. The model's `H` is an
unconstrained parameter (STORE-MODEL §1), so the cyclic case is inside the theorem's
scope; and a *transported* directory is not something the shell built, so its filenames
are whatever the sender wrote — the "infeasible to construct" argument covers hashes, not
filenames.

### 2.2 Why Kahn's specifically: it triples

This is the single strongest engineering argument in this report, and it is R3's
(`:490-492`): "Run Kahn's algorithm over the address graph `refsAt`. It (i) decides
acyclicity — the algorithm terminates with every node emitted iff the graph is a DAG —
and (ii) **emits the topological order**, which is precisely the insertion sequence M19
asserts exists."

Three uses from one pass:

| Use | Statement it serves | Where the statement lives |
|---|---|---|
| **Decide WF3** | F-32's missing check; `Admissible.acyclic` | `R3-transport-admission.md:652-655` |
| **Emit M19's insertion-order witness** | `ObligationM19_transport : Admissible → Reachable` | `R3-transport-admission.md:664-666` |
| **Emit M10's rank witness** | `ObligationM10_rank : Edge σ a b → idxOf (Keys σ) a < idxOf (Keys σ) b` | `R3-transport-admission.md:614-617` |

The M10 leg is the subtle one and is worth spelling out because it turns SH5 from an
assertion into a *replayable* computation. `putPre` conses, so a reachable store's list is
already in reverse topological order (F-31, the wave's positive result). Kahn's over an
opened directory recomputes that order from the bytes. **The two must agree**, and the
harness can compare them: open the directory, obtain Kahn's order, replay it through
`putSchema`/`putEntity` on the in-process `StoreMap`, compare byte-for-byte with the disk
view (`R3-transport-admission.md:495-501`). That is a differential observable of a kind
the harness does not currently have — it tests the *model's insert rule* against the
*disk's contents*, not just plumbing.

R3 also notes the direct precedent: this "is what git's own `index-pack` plus connectivity
check does one level down, in git's name space rather than ours" (`:500-501`). Caveat on
that sentence: the git half of it is marked `UNVERIFIED` at `R3-transport-admission.md:445`
("my own knowledge of git internals, not receipted in-repo") and remains so here.

### 2.3 Shape and cost

Vocabulary, mint in `E2` beside `refsOfPreimage` (all of this is R3 §6's, restated with
the decidable half added):

```lean
def refsAt (σ : StoreMap) (a : Address) : List Address :=
  match σ.find a with
  | some b => (refsOfPreimage b).getD []
  | none   => []

/-- Kahn's. `none` iff the reference graph has a cycle; otherwise the topological order,
    sinks first — i.e. a legal insertion sequence. -/
def topoOrder (σ : StoreMap) : Option (List Address)
```

with two obligations to state beside it:

```lean
def ObligationTopoSound : Prop :=          -- the order respects every edge
  ∀ σ o, topoOrder σ = some o →
    ∀ a b, Edge σ a b → idxOf o b < idxOf o a
def ObligationTopoComplete : Prop :=       -- and it exists exactly when acyclic
  ∀ σ, (topoOrder σ).isSome ↔ Acyclic σ
```

**Cost.** R3 calls it "one linear pass over an object graph the scan already walks for
WF2" (`:498-499`). Sharpening that with R2's measurements, and flagging the sharpening as
my own analysis rather than a receipt: `StoreMap.find` is a linear list scan
(`E2/Model.lean:275`), and `checkReport` already pays one `find` per reference per object
(`Boundary.lean:222`). Kahn's needs in-degree bookkeeping plus a worklist over the same
edge set, so over a list-backed map it is the **same complexity class the WF2 pass already
sits in** — R2 measured that class at ≈3.9 ms per object once objects carry references,
mildly superlinear (2.0× → 2.16× → 2.27× per doubling, `R2-boundary.md:685-693`). So:
no new asymptotic class, a constant-factor addition, and **entirely negligible beside the
digest** (§6.2). "Free" is the right order of magnitude; "one linear pass" is optimistic
about `find`.

A second, smaller win worth naming: `checkReport` currently calls `classify` — a full
decode — **three times per object** (`R2-boundary.md:694-696`; visible at
`Boundary.lean:242,249,252`). Any pass that materializes the parsed carrier once and
threads it would pay for Kahn's several times over. That is a refactor, not an amendment,
and belongs in the same seat.

### 2.4 Where the order is observable — three options, priced

The order must be *emitted*, not merely computed, or the M19/M10 legs are wasted.

| Option | Change | Cost |
|---|---|---|
| **(a)** `check` always prints the order | one line per object, before the verdict | breaks the expected transcript of **all ten** committed scripts; the verdict line's `objects=` field already gives the count, so the order is pure addition. Highest churn |
| **(b)** a new verb `order` | `estore [--store <dir>] order` → one `addr <hex>` line per object, sink-first | additive; needs a §5 verb-list amendment and a `Verb` constructor. **Recommended for pricing purposes** — it keeps `check`'s transcript stable and gives the harness a first-class observable |
| **(c)** `check` prints one summary line | e.g. `order acyclic objects=N` or `violation cycle addr=…` | smallest diff — one line appended to `CheckReport.render`; the order itself stays unobservable, so the M19 replay test cannot be written |

(c) is the minimum that closes F-32. (b) is the minimum that buys the M19 and M10 legs.
They compose: (c)'s violation line for the failing case, (b)'s verb for the passing case.

The failing case needs a `Violation` constructor. Note the report is a *list* of
violations and a cycle is a *global* property, so it does not fit the one-line-per-object
shape cleanly. Two shapes: `violation cycle involving=<k>` naming the count of nodes
Kahn's could not emit, or `violation cycle addr=<hex>` per unemitted node (deterministic
because the objects list is already `normalize`d by address, `Boundary.lean:202-207`). The
second is more useful and stays deterministic; it does inflate the violation count.

### 2.5 STORE-SHELL text changes

**Change 3 — §4, the SH5 bullet.** Current (`STORE-SHELL.md:92-94`), quoted:

> - **Verification-on-open (SH5)**: opening a directory as a store ESTABLISHES
>   reachability — v0 does the full scan: every object re-hashed (WF1), parsed, refs
>   resolved (WF2). Manifest/append-log optimizations arrive only by amendment.

This is the sentence R3 calls false three times over (`R3-transport-admission.md:36-44`).
Proposed:

> - **Verification-on-open (SH5)**: opening a directory as a store **establishes every
>   clause of reachability that is decidable today, and no more**. v0 does the full scan:
>   every object re-hashed (WF1), parsed, canonicity byte-compared (Q5), checked
>   well-formed (`wfsB` on schemas, `dupFreeV` on entity values), refs resolved (WF2),
>   entity schema addresses resolved as schemas, and **the reference graph decided acyclic
>   by Kahn's algorithm, which also emits the insertion order (WF3; M19's witness,
>   computed rather than asserted)**. What remains undecided is exactly `Conforms` — the
>   M18 seat — carried as the SH6 obligation record. **The scan therefore establishes
>   `Admissible` (R3 §6), not `Reachable`; the bridge between them is
>   `ObligationM19_transport`, stated and unproved.** Manifest/append-log optimizations
>   arrive only by amendment (see §4 amortization, SH5′).

**Change 4 — §8, the SH5 ruling row.** Current (`STORE-SHELL.md:146`), quoted:

> | SH5 | Verification-on-open depth | full WF1+WF2 scan in v0; amortized forms only by amendment |

Proposed:

> | SH5 | Verification-on-open depth | full scan in v0 — WF1, parse, canonicity, `wfsB`/`dupFreeV`, WF2, typing-schema-half, WF3 by Kahn's; `Conforms` deferred to M18 as an obligation record. The scan establishes `Admissible`, not `Reachable`. Amortized forms only by amendment (SH5′) |

**Change 5 — §7 "Not claimed".** Current (`STORE-SHELL.md:133-136`) makes no claim about
the scan's reach. Proposed addition:

> No claim that a clean `check` implies `Reachable`: the scan decides the `Admissible`
> clauses (R3 §6) and `Admissible → Reachable` is `ObligationM19_transport`, stated and
> unproved. No claim that `check` is total on arbitrary directories beyond §3's
> file-type discipline (see §5 amendment).

### 2.6 Harness scripts

| Script | Asserts |
|---|---|
| `16-acyclic-clean.script` | a chained store `(ref @1)`, `(ref @2)`, … then `(order)` → the emitted order is sink-first and matches the address list; `(check)` → clean |
| `17-cycle-rejected.script` | **needs a new below-the-boundary primitive.** A cycle cannot be built through admitted verbs — check 3 (refs resolve) forbids it, which is the point. See §2.7 |
| `18-order-replay.script` | the M19 replay: `(order)` on a built store, then assert the emitted sequence equals the model's `Keys σ` reversed. Needs `order` to be an observable (option (b)) |

### 2.7 The structural harness gap this exposes

R2 §3.4 (`R2-boundary.md:494-506`) already names it: the only writer that bypasses
admission is `(corrupt <addr> <idx> <mask>)`, which can only flip bytes in an object
already present, and `StoreView.strayObjectFiles`/`strayNameFiles` are **hard-wired empty
on the model side** (`Boundary.lean:168-169`, comment at `:161-163`). Consequence: no
script can produce a cycle, a stray, a directory, a symlink, or a malformed name file as a
*differential* observable.

R2's candidate remedy (`:503-505`) is a second below-the-boundary primitive,
`(place <plane> <filename> <hex>)`, with the model side extended to carry stray-file
lists. **This lane's finding is that the remedy is a precondition, not an optional
extra**: §2 (cycles), §4 (hostile directory entries), and §6 (a stale manifest) are all
untestable differentially without it. Three of this package's six pieces cannot be pinned
by any script the harness can currently express. That is a ruling the operator has to
make before the amendment is testable at rung 1.

Model-side cost: `StoreView` gains real stray lists instead of `:= []` defaults, and
`ModelState.apply` gains a `.place` case. Both sides then diverge only where they should.

---

## 3. Check ORDERING — `dupFree` before the canonicity byte-compare (F-40 + F-41)

### 3.1 The mechanism, from the R2 receipts

Two faults, one root, opposite directions.

**F-40 — the boundary admits what the model forbids.** `canonFields` (`E2/Canon.lean:53-56`)
is an insertion sort whose `insertField` (`:28-34`) places an equal key *after* the
existing run (`if key < k` is false on ties). On a duplicate-key run it therefore
**reverses** the run — the F-12 involution. An involution's fixed points are its
**palindromes**. R2's statement of the general rule (`R2-boundary.md:216-218`):

> a field list that is key-sorted and whose every equal-key run is a palindrome is a
> `canonS` fixed point. Check 2 cannot see duplicate keys at all; it only sees sortedness.

Receipt (`r2-12-dupkey-admitted.script`, PASS — model and disk agree, so this is a
boundary property, not a plumbing one):

```
4 (schema-put (object (f "a" req (prim int)) (f "a" req (prim str)) (f "a" req (prim int)))) => code=0
4 | ok 93f432ea…2ad6
5 (check) => code=0
5 | check clean objects=2 schemas=2 entities=0 names=0
6 (resolve @4) => code=0
6 | ok schema (object (f "a" req (prim int)) (f "a" req (prim str)) (f "a" req (prim int)))
```

Three fields keyed `"a"` carrying **two different schemas**, admitted, check-clean, and
`resolve` hands the ambiguity back. The kernel twin is `dup_canon_fixed`
(`R3-p5_openscan.lean:125`) on the two-identical-field case.

**F-41 — the boundary rejects what it produced itself.** `schemaBytes s = preimageS s =
versionByte ∷ kindSchema ∷ encSchema (canonS s)` (`Shell/Verbs.lean:144`,
`Boundary.lean:52-54`). Feed a *non-palindromic* duplicate-key carrier:

- bytes `b = preimageS s`, which encode `canonS s`;
- `admit` decodes `b` to `p = canonS s`;
- check 2 recomputes `p.canonicalPreimage = preimageS (canonS s)`, which encodes
  `canonS (canonS s) = s` by the involution;
- `s ≠ canonS s`, so the byte-compare **fails**.

Receipt (`r2-14-canon-involution-self-reject.script`, PASS — both sides agree):

```
1 (schema-put (object (f "a" req (prim int)) (f "a" req (prim str)))) => code=1
1 | rejected non-canonical
```

R2's summary (`R2-boundary.md:297-299`): "on duplicate-key input the boundary is **neither
sound** … **nor complete** … Stated precisely: `admit ∘ schemaBytes` is not the identity
on carriers, and `preimageS` is not idempotent as a byte function."

### 3.2 Why ordering is the right lever, and exactly what it buys

Ordering does **not** change any verdict on the schema plane. Both F-40's and F-41's
inputs are rejected either way once §1's check exists. What ordering changes is *which
check speaks*, and that turns out to be load-bearing for a reason internal to the model.

**The argument.** `ObligationCanonIdempotent` (`E2/Obligations.lean:62-63`) reads, in its
post-F-12 conditional form:

```lean
def ObligationCanonIdempotent : Prop :=
  ∀ s : SchemaCore, dupFreeS s = true → canonS (canonS s) = canonS s
```

with the amendment note above it (`:56-61`) recording that the unconditional form was
falsified. Check 2 — "re-canonicalize and byte-compare" — is a test whose *meaning*
("these bytes are the canonical image of what they decode to") depends on `canonS` being
idempotent. **On duplicate-key input `canonS` is not idempotent, so check 2 is being run
outside its own hypothesis.** Its `non-canonical` verdict on F-41's input is not a
statement about canonicity at all; it is the involution leaking.

Placing `wfsB` before check 2 restores the hypothesis:

> **Ordering lemma (proposed, provable from `ObligationCanonIdempotent`).** If check 2 is
> reached, `dupFreeS p = true`, hence `canonS` is idempotent at `p`, hence a check-2
> failure means the submitted bytes genuinely are not the canonical image of the carrier
> they decode to. `non-canonical` then means what §5 says it means.

Concretely, the amendment buys:

1. **F-41's incoherence dissolves.** No input is ever rejected `non-canonical` on account
   of the duplicate-key involution. `rejected not-well-formed dup-key` is a true
   statement about the carrier; `rejected non-canonical` was not.
2. **The Q5 strictness ruling stops being contradicted.** The canonical-image strictness
   claim ("the store never holds a non-canonical byte-form of anything", quoted in
   `2026-08-25-wave2-faults.md:96-97`) is about a predicate that, on duplicate-key input,
   has no stable meaning. Ordering confines check 2 to the domain where it does.
3. **The corrected harness transcript is diagnostic.** `r2-14`'s two steps become
   `dup-key` rather than `non-canonical`, so a reader can tell F-40's fix from a
   canonicity regression.

### 3.3 The scan runs the opposite order, deliberately

`scanObject` (`Boundary.lean:215-227`) short-circuits on structural failure with the
comment "those faults cascade, and one line per faulty object naming the first check it
fails is the readable report." There the order is **WF1 → parse → canonicity → WFS →
WF2/typing**, because on the scan side canonicity is a statement about *bytes already on
disk* and is the more primitive fault: bytes that are not a canonical image should be
reported as such regardless of what they decode to. On the PUT side the subject is a
*submission* and well-formedness is the more primitive gate.

Flagging this as a genuine asymmetry rather than an oversight, because a reviewer will
read it as one. The two sides answer different questions:

| | PUT (`admit`) | Scan (`scanObject`) |
|---|---|---|
| Question | "may these bytes enter?" | "why is this object bad?" |
| Order | 1 parse → **2 WFS** → 3 canonicity → 4 refs → 5 typing | WF1 → parse → canonicity → **WFS** → WF2/typing |
| Rationale | WFS is `putS`'s premise; check 2's meaning is conditional on it | cascade order: the more primitive byte-level fault reports first |

**An operator may reasonably rule that the two must agree** for reviewability. If so, the
PUT order wins (it is the one with the model-premise argument), and `scanObject` moves
`WFS` before canonicity. The cost is one changed line in the report for the F-41 shape,
which no committed script currently exercises on the scan side.

### 3.4 The companion fix, upstream: carrier admission

Ordering makes the *verdict* honest. It does not make `admit ∘ schemaBytes` the identity
on carriers, because a duplicate-key carrier is simply not admissible and never should
have been assembled. R2's question 4 (`R2-boundary.md:758-761`) puts it exactly: "Is that
a boundary bug, or a carrier-admission rule that `sexpToFieldList` should enforce before
`preimageS` is ever called?"

`Shell/Carrier.lean:184` is the site. A duplicate-key field list rejected at *fixture
parse time* means the harness fails with a fixture error rather than a store rejection —
which is the right register: a script that writes a duplicate-key object literal has a bug
in the script, not a claim about the boundary.

**Both are wanted, and they are not redundant.** Carrier-side rejection covers fixtures and
the future generator; boundary-side rejection covers raw bytes off the wire
(`schema-put-bytes`, and v1's `PUT /objects`), which carrier admission never sees.

### 3.5 STORE-SHELL text changes

Covered by Change 1 (§1.5), which already renumbers well-formedness to check 2 and
canonicity to check 3. One sentence to add beneath the list:

> **Ordering note (F-40/F-41).** Well-formedness precedes canonicity because
> `ObligationCanonIdempotent` is conditional on `dupFreeS`: on a duplicate-key carrier
> `canonS` is an involution, not idempotent, so the byte-compare's verdict is not a
> statement about canonicity. Running check 2 first produced `non-canonical` on bytes the
> shell had itself assembled from a carrier literal — the boundary rejecting its own
> output. With check 2 ahead of it, a `non-canonical` verdict means what §5 says it means.

### 3.6 Harness scripts

| Script | Asserts |
|---|---|
| `13-wfs-dupkey.script` (from §1.6) | **now also pins the ordering**: `r2-12`'s palindromic shapes reject with `dup-key`, never `non-canonical` |
| `19-canon-diagnosis.script` | the corrected form of `r2-14`: both non-palindromic duplicate-key submissions → code 1 with `not-well-formed dup-key`. The assertion that matters is the *rejection string*, not the code |
| `08-canonicity-strict.script` (existing) | must stay green unchanged — it exercises genuine non-canonicity (hand-encoded unsorted fields, non-minimal LEB128, `R2-boundary.md:320-323`), none of which involves duplicate keys. **If it changes, the ordering amendment has over-reached** |

That last row is the real regression test for this piece: the ordering change must be
invisible to every dup-free input.

---

## 4. Typed IO errors, three-way exit codes, and the minimal SH3 whitelist amendment (F-42)

### 4.1 The three breaches, receipted

R2 target 3 (`R2-boundary.md:377-426`):

```
$ mkdir <store>/objects/cdcd…cd            # 128 valid lowercase hex characters
$ estore --store <store> check
uncaught exception: inappropriate type (error code: 21, is a directory)
$ echo $?
1
```

and

```
$ mkfifo <store>/objects/5656…56
$ timeout 120 estore --store <store> check
*** TIMEOUT ***
```

R2 measures the verdict-channel collapse side by side (`:407-411`): the directory
poisoning exits 1 with *nothing checked*, a genuine WF1 corruption exits 1 with
*violations found*, a clean store exits 0. "No caller can distinguish 'checked and found
bad' from 'could not check at all.'"

Root cause (`:420-425`): `StoreRoot.readView` (`Shell/Store.lean:71-97`) classifies a
directory entry **by filename only** (`addrOfHex fn`, `:75-80`) and then unconditionally
`IO.FS.readBinFile`s it — "and it *cannot* [do better]: the §3 whitelist enumerated in
`Shell.Gate.ioWhitelist` contains no `metadata` / `FileType` / `isDir` primitive. **The
whitelist forbids the check that would make `readView` total.**"

Confirmed against source: `ioWhitelist` (`Shell/Gate.lean:64-73`) enumerates
`IO.FS.readBinFile`, `writeBinFile`, `rename`, `createDirAll`, `System.FilePath.readDir`,
`System.FilePath.pathExists`, the four print primitives, and carrier types. No file-type
primitive. And `Main.lean` is `def main (argv : List String) : IO UInt32 := Shell.runCli
argv` — no handler anywhere.

Two related hazards from the same mechanism (`R2-boundary.md:436-444`): `readDir` +
`readBinFile` follow symlinks, so `ln -s /etc/hosts` is read as an object (producing a
`wf1` violation with a digest of `/etc/hosts`), and `ln -s /dev/zero` reads unboundedly.

### 4.2 Which primitive, from the pinned toolchain's actual API

Receipts from `~/.elan/toolchains/leanprover--lean4---v4.33.1/src/lean/Init/System/IO.lean`:

```lean
-- :1082-1094
inductive FileType where
  | dir | file | symlink | other
  deriving Repr, BEq

-- :1115-1129
structure Metadata where
  accessed : SystemTime
  modified : SystemTime
  byteSize : UInt64
  type     : FileType
  numLinks : UInt64

-- :1148-1149
@[extern "lean_io_metadata"]
opaque metadata : @& FilePath → IO IO.FS.Metadata

-- :1155-1156
@[extern "lean_io_symlink_metadata"]
opaque symlinkMetadata : @& FilePath → IO IO.FS.Metadata

-- :1162-1165
def isDir (p : FilePath) : BaseIO Bool := do
  match (← p.metadata.toBaseIO) with
  | Except.ok m => return m.type == IO.FS.FileType.dir
  | Except.error _ => return false
```

**The primitive to add is `System.FilePath.symlinkMetadata`, not `metadata` and not
`isDir`.** The toolchain's own doc-comment on `FileType.symlink` says why
(`Init/System/IO.lean:1088-1090`): "`System.FilePath.metadata` never indicates this type
as it follows symlinks; use `System.FilePath.symlinkMetadata` instead."

The discipline that follows is one rule: **`readView` reads an entry only when
`symlinkMetadata` reports `FileType.file`.** Everything else is a stray. One primitive
kills all four hazards at once:

| Hazard | `symlinkMetadata` reports | Outcome |
|---|---|---|
| directory named as valid hex | `.dir` | stray, reported, exit 1 as a verdict |
| FIFO named as valid hex | `.other` | stray — **never opened, so no hang** |
| symlink to `/etc/hosts` | `.symlink` | stray — not followed, no bogus `wf1` |
| symlink to `/dev/zero` | `.symlink` | stray — no unbounded read |

`isDir` would catch only the first and would additionally follow symlinks. `metadata`
would report a symlink's *target* type — so `ln -s /etc/hosts` would come back `.file`
and be read. Both are wrong for this job.

`Metadata.byteSize` arrives free in the same call and is available for a size cap if the
operator ever wants one; nothing in this package requires it, and F-44's cost is a
per-store problem, not a per-file one (§6).

**A note on G-S3's reach.** G-S3 collects `IO`/`System.FilePath` constants referenced by
constants **in covered modules** (`Shell/Gate.lean:120-121,141-144`). `pathExists` and
`isDir` are themselves defined in terms of `metadata`, but their bodies live outside the
covered set, so their internals never enter `usedIO`. The whitelist amendment is therefore
genuinely minimal: exactly the names the shell writes down.

### 4.3 The minimal SH3 amendment

**Change 6 — §3, the SHELL-v0 whitelist line.** Current (`STORE-SHELL.md:63-65`), quoted:

> - **SHELL-v0 (CLI + harness):** file read/write under the store root, argv,
>   stdout/stderr, exit codes, temp-file + atomic rename. No clock, no randomness, no
>   environment, no network.

Proposed:

> - **SHELL-v0 (CLI + harness):** file read/write under the store root, **file-type
>   interrogation of store entries without following symlinks
>   (`System.FilePath.symlinkMetadata`)**, argv, stdout/stderr, exit codes, temp-file +
>   atomic rename. No clock, no randomness, no environment, no network. **The file-type
>   primitive is admitted for one purpose only (F-42): a directory entry is read only when
>   it is a regular file, so that `readView` is total on arbitrary directories and
>   `check`'s exit code stays a verdict.** Note `Metadata` carries no clock reading the
>   shell may use: `accessed`/`modified` are timestamps and are OUT of the whitelist's
>   spirit; the shell reads `Metadata.type` and nothing else.

That last sentence is not pedantry. `IO.FS.Metadata` bundles two `SystemTime` fields, and
§3's "no clock" is a substantive rung-0 property that G-S3 currently enforces by
enumeration — R2 proved a clock in `main` used to build all-gates-green (F-43(a), since
fixed by module coverage). Admitting the struct admits the timestamps unless the ruling
says otherwise. **Candidate mechanization:** a fifth gate leg, G-S5, forbidding
`IO.FS.Metadata.accessed` and `IO.FS.Metadata.modified` in the used-constant set — the
same enumeration shape G-S3 already uses, roughly four lines in `Gate.lean`.

Corresponding `ioWhitelist` additions (`Shell/Gate.lean:64-73`): `System.FilePath.symlinkMetadata`,
`IO.FS.Metadata`, `IO.FS.Metadata.type`, `IO.FS.FileType`, and whichever `FileType`
constructor/`BEq` companions the elaborator surfaces. The list is deliberately
exhaustive-by-enumeration already (`Gate.lean:90-92`: "a new compiler companion shape
fails the build as a false offender, which is the safe direction for a trust instrument"),
so the exact set is discovered by building, not by guessing.

### 4.4 Typed errors and the three-way exit code

The three-way contract **already exists** and is already written down
(`Shell/Cli.lean:20-23`), quoted:

> Exit codes: 0 success; 1 rejection, not-found, or a failed store verification; 2 a usage
> or environment fault (bad arguments, uninitialized store, unreadable input file).

The bug is not the contract; it is that **the 2-path is unreachable from `check`**.
`fail` returns 2 (`Cli.lean:45-47`), `emit` returns `out.code` (`:49-51`), `onStore`
returns `fail 2` only for an uninitialized store (`:66`). An exception thrown inside
`r.readView` propagates past all of it to a `main` with no handler, and Lean exits 1.

Two mechanisms, both needed:

**(i) File-type discipline turns the common case into a verdict.** With §4.2's rule, a
hostile directory entry is a *violation*, exit 1, one deterministic line — which is
correct: a directory named as a valid hex address **is** a malformed store, and `check`
exists to say so. This is the same treatment R2 already observed working for the cases
that happen to fail the filename test first (`R2-boundary.md:468`: "non-hex subdirectory
inside `objects/` → `violation stray-object file="objects/subdir"` — no crash: the
filename fails `addrOfHex` before any read").

Whether these become `stray-object`/`stray-name` or a new class is a small ruling.
Argument for a new class `not-a-regular-file`: a stray is a *misnamed* file, while this is
a *correctly named non-file*, and a transported store diagnosing "your objects/ contains a
symlink" is more useful than "stray". Argument for reuse: it costs nothing and no existing
script changes.

**(ii) Typed errors turn the residual case into an environment fault.** Even with (i),
races and permissions remain: an entry vanishing between `readDir` and `symlinkMetadata`,
or an unreadable file. The toolchain gives the machinery:

```lean
-- Init/System/IO.lean:82
def EIO.toBaseIO (act : EIO ε α) : BaseIO (Except ε α)
-- Init/System/IO.lean:100
instance : MonadExceptOf ε (EIO ε) := …          -- so `try … catch` works in IO
```

and `IO.Error` (`Init/System/IOError.lean`) already carries exactly the constructors this
lane needs, each documented with its POSIX mapping:

| Constructor | POSIX | The case it names |
|---|---|---|
| `inappropriateType (filename) (osCode) (details)` | `EISDIR`, `ENOTDIR`, `EBADMSG` | **the crash R2 reproduced** — "is a directory" |
| `noFileOrDirectory (filename) (osCode) (details)` | `ENOENT` | F-42's missing file; the readDir race |
| `permissionDenied (filename?) …` | `EACCES`, `EPERM`, `EROFS` | an unreadable store |
| `resourceExhausted (filename?) …` | `EMFILE`, `ENOSPC`, `ENOMEM` | a full disk during `atomicWrite` |
| `interrupted (filename) …` | `EINTR` | a signalled read |

Proposed shape, one place, in `Shell/Store.lean` (the only module that touches a store —
`Store.lean:5-7`):

```lean
/-- Every store-touching IO call goes through here. An IO fault is an ENVIRONMENT fault
    (exit 2), never a verdict (exit 1): STORE-SHELL §5 makes `check`'s exit code the
    verdict, and a run that could not read the store has no verdict to give. -/
inductive StoreFault
  | unreadable (path : String) (kind : String)
  | vanished (path : String)
  | denied (path : String)
  | other (path : String) (detail : String)

def StoreFault.render : StoreFault → String    -- deterministic, one line, to stderr
```

with `StoreRoot.readView : IO (Except StoreFault StoreView)` and `runCli` mapping a
`.error` to `fail` (exit 2). Determinism matters: `IO.Error`'s `details` field is
libuv's message text and differs across hosts, so **the rendered line must be derived from
the constructor and the path, never from `details`** — otherwise the Windows leg diverges
from the Mac leg in the harness transcript.

**A caution the estate already recorded.** The nearest transferable note in the explore
corpus is `implementation-approach-notes.md:600-601`: "The `getElem!` route works and
reduces, but reintroduces `Inhabited` defaults that hide errors as zeros." The same hazard
is live here: an `Option`-returning `readView` that maps every fault to `none` would turn
a permission error into an empty store, and an empty store checks *clean*. **The typed
error is not decoration; a defaulting `readView` would be a soundness break dressed as
robustness.**

### 4.5 STORE-SHELL text changes

**Change 7 — §5's verdict clause.** Current (`STORE-SHELL.md:99-100`), quoted:

> CLI verbs (v0): `init`, `check` (verification-on-open, exit code = verdict),

Proposed:

> CLI verbs (v0): `init`, `check` (verification-on-open, exit code = verdict: **0 checked
> and clean, 1 checked and violations found, 2 could not check — an environment fault,
> never a verdict**),

**Change 8 — §7 "Not claimed", second sentence.** Add:

> No claim of totality on directories the shell did not create beyond the file-type
> discipline of §3: entries that are not regular files are reported and not read, and any
> residual IO fault exits 2 without a verdict. No claim about a store on a filesystem the
> shell cannot interrogate.

### 4.6 Harness scripts

**All of §4 is currently untestable at rung 1** — R2 §3.4's gap again. With `(place …)`
from §2.7 extended to place non-file entries (a `(place-dir objects <hex>)` /
`(place-fifo …)` / `(place-symlink … <target>)` family), these become writable:

| Script | Asserts |
|---|---|
| `20-open-not-a-file.script` | a directory placed at a valid hex name in `objects/` → `check` exits 1 with `violation not-a-regular-file file="objects/…"`, and **stdout is non-empty** (the output contract) |
| `21-open-symlink.script` | a symlink placed in `objects/` → reported, not followed; the digest of the target never appears |
| `22-open-fifo.script` | a FIFO placed in `objects/` → reported; **the script completes**, which is the whole assertion |
| `23-exit-codes.script` | the three-way discipline side by side: clean → 0, corrupted (existing `corrupt` primitive) → 1, unreadable store → 2 |

`22` is the one that pins the hang, and it is also the one that cannot be written on a
platform without FIFOs — a dual-host consideration for the Windows leg (§5.4).

---

## 5. The names plane (F-39), priced — and the F-37 rider

### 5.1 The divergence, and its exact scope

`Shell.validName` (`Shell/Verbs.lean:60-66`) admits `[A-Za-z0-9._-]`, length 1–128, no
leading dot. The model plane is `NameMap := List (String × Address)` keyed by an exact
Lean `String` (`E2/Model.lean:315`); the disk plane is one file per name under `names/`
(`STORE-SHELL.md:85`). On a case-folding filesystem those are not the same map.

Receipt (`R2-boundary.md:60-65`), the harness reporting a hard divergence:

```
FAIL A1-name-case.script
     DIVERGENCE at line 10:
      model: 5 | ok 27d77d3b…a38f
      disk : 5 | ok bf279c82…a572e
```

Step 5 is `(name-get "Widget")`; the model answers with step 1's address, the disk with
step 2's, **both exit 0**. On disk, one file survives, keeping the *first* binding's
spelling and the *second* binding's content (`R2-boundary.md:72-83`).

R2's scope probe is what makes this precise (`:86-97`): a single mixed-case name
round-trips correctly on both sides, because `readDir` returns the stored case and
`nameGet` does an exact `List.lookup` (`Verbs.lean:132`). **The refutation is exactly
that `name-set` is not injective from the model's name space into the disk's**
(`R2-boundary.md:97`).

Three further hazards `validName` admits today, confirmed to succeed on macOS and
`UNVERIFIED` on Windows (`R2-boundary.md:109-115`): `trailing.` (Windows strips a trailing
dot, collapsing it with `trailing`), and the reserved device names `con` / `NUL`.

### 5.2 What the anatomy records about case-folding — nothing. `ACQUISITION-GAP`

Exhaustive grep over `.staging/explore/hash-db-anatomy.md` for `case-fold`, `casefold`,
`case-insensitive`, `ignorecase`, `unicode`, `normaliz`, `NFC`, `NFD`, `precompose`,
`APFS`, `HFS`, `NTFS`: **zero relevant hits.** (The two `normaliz` hits are §1.2's "every
exclusion is a normalization you must then defend" and §3.1's de Bruijn note; the one
`autocrlf` hit is a scratch-repo config line at `:106`.)

What the document *does* record about name planes, and it is uniform:

- §2.5 (`:238`): "A ref is a **mutable file containing an address**. That is the entire
  mechanism." Consequence recorded at `:241-242`: "Names are **outside** the object graph."
- §7.3 (`:822`): "The pattern is uniform: **a name is a mutable cell containing an
  address.** Nothing more." Table at `:815-820` puts git, Unison, IPFS and Nix in the same
  column.
- §7.3 (`:824-827`): the variation worth stealing — Unison makes "the *name map itself* a
  content-addressed value, with a causal parent chain".
- §8.5 (`:1086-1098`): the straw — "a separate metadata map, outside the store"; "*Who
  else did this:* all four, uniformly (§7.3). It is the least controversial line in this
  document"; and Nix's fusion of the name into the fingerprint is "*Explicitly rejected*".

**So the estate holds no receipt on how any real system handles case-folding or Unicode
normalization in its name plane.** That absence is load-bearing for F-39, because option
(1) below is exactly the choice git made (`git-check-ref-format`'s restrictions, and
`core.ignorecase`), and this lane cannot cite it.

> `ACQUISITION-GAP — F-39 literature.` No web access in this session. What would close it,
> named so an acquisition seat can be briefed: (a) git's `core.ignorecase` and
> `core.precomposeunicode` documentation and the `git-check-ref-format` rules — git is
> the closest analogue since its refs *are* filenames; (b) git's `packed-refs` file, which
> is the precedent for option (3) below and is not in the anatomy either; (c) Nix's store-
> path name alphabet from the pinned Store Path Specification already cited at
> `hash-db-anatomy.md:1161`; (d) OSTree's ref rules — OSTree is named nowhere in the main
> tree (only in stale `.claude/worktrees` copies, which have no standing); (e) the Windows
> reserved-device-name and trailing-dot rules, needed for §5.1's three admitted hazards.
> Until (a)–(e) land, every claim below about what real systems do is **my analysis, not a
> receipt**, and is marked as such.

### 5.3 Four options, priced

R2 offers three (`R2-boundary.md:119-125`); the brief adds a fourth (a single index file).
Prices below are mine.

---

**Option 1 — case-closed alphabet.** Restrict `validName` to lowercase + digits + `-_.`.

- *Change:* one line, `Shell/Verbs.lean:64` (drop the `'A' ≤ c && c ≤ 'Z'` disjunct).
- *Buys:* the two planes agree by construction on case. Cheapest thing that closes F-39's
  headline.
- *Costs:* (i) the name space shrinks and `name-set "Widget"` becomes `bad-name` — a
  behavior change flipping `r2-15-name-plane-edges.script` and possibly
  `04-names-plane.script`; (ii) **it does not close the other three hazards.**
  `trailing.`, `con` and `NUL` are all lowercase. Closing those needs a reserved-name
  blacklist plus a no-trailing-dot rule — i.e. **Windows filesystem policy baked into a
  cross-platform alphabet**, which is a design smell and an ongoing maintenance liability
  (the reserved list is `con, prn, aux, nul, com1‑9, lpt1‑9`, and `UNVERIFIED` here);
  (iii) it leaves the filename *as* the key, so any future filesystem quirk is a new
  divergence.
- *Verdict:* cheapest, incomplete, and it keeps the structural defect (filename = key).

---

**Option 2 — hex-encoded name files.** `names/<lowercase hex of UTF-8 of the name>`.

- *Change:* `readView`'s name branch decodes the filename (`Store.lean:83-90`);
  `applyEffect .setName` encodes it (`Store.lean:119`). Both are small. `Shell.Hex`
  already exists and already rejects uppercase (`R2-boundary.md:467`: "object filename in
  UPPERCASE hex → `violation stray-object` (`hexVal` rejects uppercase by design)"), so
  the discipline is one the package already runs on the objects plane.
- *Buys:* **the filename stops being the key.** Case-folding is closed by construction (the
  shell only ever writes lowercase hex; uppercase hex is a stray, mirroring the objects
  plane). Reserved device names vanish (`con` → `636f6e`). Trailing dots vanish. The
  alphabet is `[0-9a-f]`, the smallest possible filesystem surface. The `validName`
  alphabet can then be *widened* rather than narrowed, if that is ever wanted, without
  touching the disk plane.
- *Costs:* (i) **inspectability**, which the straw explicitly values — `hash-db-anatomy.md:1069-1071`
  chose directory-of-files because "the store should be the part you can inspect with
  `xxd` and delete with `rm -rf`". `ls names/` stops being readable. Mitigations: a
  `names` listing verb, or writing the plaintext name into the file content beside the
  address — but see (iii); (ii) **path length**: a 128-character name becomes a
  256-character filename, doubling the plane most at risk from Windows `MAX_PATH` 260
  (F-37, `R3-transport-admission.md:480-483`). The objects plane is already at 128; this
  makes names the worst case. A name-length cap of 64 would restore parity and is a
  cheap rider; (iii) the names plane currently has **no canonicity discipline at all** —
  `addrOfFileBytes` takes bytes up to the first whitespace, so `names/x` containing a
  digest followed by arbitrary junk resolves cleanly (`R2-boundary.md:479-490`, with a
  transcript). Adding plaintext to the content would make that laxity load-bearing.
- *Verdict:* structurally correct, closes all four hazards, and costs one property the
  straw named as a reason for the whole design. **The strongest option if inspectability
  can be bought back with a listing verb.**

---

**Option 3 — a single index file.** One `names` file, one line per binding.

- *Change:* largest of the four. `readView` parses one file; `applyEffect .setName`
  rewrites it whole through the existing temp+rename.
- *Buys:* the filesystem leaves the key space entirely. The key is a Lean `String`,
  **exactly** the model's `NameMap`, so the two planes are the same map by construction —
  the strongest closure of F-39 available. One file also means one path, so `MAX_PATH`
  becomes a non-issue for this plane.
- *Costs:* (i) a whole-file rewrite per `name-set`, so a lost update if two writers race.
  v0 is a single-process CLI and §7 makes no concurrency claims, so this is acceptable
  *now* — but the v1 daemon inherits it, and §5's wire protocol has `PUT /names/{name}`;
  (ii) **a new canonicity plane.** The index needs a total serialization — key escaping,
  a sort order, a line format — or two stores with identical bindings differ byte-wise.
  That is a fresh instance of the very discipline Q5 exists for, on a plane that currently
  has none; (iii) it diverges from the uniform pattern the anatomy records (§7.3's "a name
  is a mutable cell containing an address"). *My analysis, unreceipted:* git in fact does
  both — loose refs **and** `packed-refs`, a single index file adopted as an
  amortization — which would make this option well-precedented rather than novel. That
  claim is exactly the `ACQUISITION-GAP` (b) above and must not be relied on until
  receipted.
- *Verdict:* the cleanest model/disk correspondence, at the price of inventing a fourth
  serialization format and a concurrency question v1 will have to answer anyway.

---

**Option 4 — refuse case-folding filesystems.** Probe at `init`; refuse if folding.

- *Change:* `StoreRoot.init` writes `names/.probe-A`, tests `pathExists names/.probe-a`,
  removes the probe. No new whitelist entry needed (`writeBinFile`, `pathExists` are
  already in). **But there is no `remove` in the whitelist** (`Gate.lean:64-73`), so the
  probe file cannot be cleaned up — it would persist and, being `.`-prefixed, be reported
  as a stray by `check` forever. Adding a delete primitive to the whitelist is a much
  larger ruling than adding `symlinkMetadata`: §4's "no deletion" (`STORE-SHELL.md:95`)
  is a *model-adjacent* property.
- *Costs:* it refuses this estate's own two primary hosts. Per the estate's own record,
  primary development is a Windows PC (NTFS) and this Mac is APFS; R2 confirmed APFS
  folding first-hand (`R2-boundary.md:42-44`). An option that makes the store unusable on
  both development hosts is not an option.
- *Verdict:* **non-starter for this estate**, and worth saying so explicitly so the grill
  does not spend time on it.

---

**Option 5 (degenerate) — declare it and move on.** §7 "Not claimed" gains a sentence:
the name plane's key space is the filesystem's, not Lean's, on case-folding hosts.

- *Costs:* the divergence stays a **silent wrong answer** — `name-get` returning a
  different address on each plane with exit 0 on both. That is the definition of the S1
  tier (`2026-08-25-wave2-triage.md:11`). Declaring an S1 silent-wrong-answer as
  not-claimed is available to the operator but is a different kind of act from the other
  four, and the triage document ranks F-39 third of twenty-one.
- *Verdict:* recorded for completeness; the ranking argues against it.

---

**Cross-cutting observation.** Options 2 and 3 both answer R2's question 5
(`R2-boundary.md:763-764`) — "Is the name key a Lean `String` (model) or a filename
(disk)?" — with **the model**. Options 1, 4 and 5 answer **the disk**. That is the ruling;
everything else is implementation. And it is a ruling v1 needs before `PUT /names/{name}`
is written, because a wire protocol whose key space is a remote filesystem's is not a
protocol.

### 5.4 The F-37 rider items

Three, all from `R3-transport-admission.md:466-483` and all flagged `UNVERIFIED` there.
None is refuted here; each is priced.

**(a) Line endings.** Object files are binary pre-images that frequently contain `0x0A`.
With `core.autocrlf` on the Windows host and no `.gitattributes`, a checkout rewrites
`0x0A` → `0x0D 0x0A` and **breaks WF1 for every affected object**. Fix: one line,
`* -text` (or `-text -diff -merge`) in a `.gitattributes` under the store root.

The estate holds a *first-hand* receipt for this failure mode in a different plane, which
raises it above "mechanically plausible": `docs/entity-store/research/schema-ast-census.md:10-17`
records that the sources lock's byte counts exceed the blobs' "by exactly one byte per
line" (`:12`), and that "The lock was computed against a CRLF working copy (Windows
checkout with `autocrlf`), not against the git objects" (`:14-15`). **This estate has
already shipped one CRLF-corrupted digest record.** That is the strongest argument in the
rider and it is in-repo.

**(b) `MAX_PATH`.** 64-byte digests are 128 hex characters, so `store/objects/<128>` plus
a repo root "is comfortable on macOS/Linux but within sight of Windows' legacy `MAX_PATH`
260 without long-path support" (`R3-transport-admission.md:480-483`). Interaction with
§5.3: **option 2 doubles the names plane to 256 characters and would make it the binding
constraint.** A name-length cap of 64 restores parity. Cheap check owed before R-15c is
exercised across hosts; `UNVERIFIED` here (no Windows host in this session).

**(c) Checkout deletes objects.** `R3-transport-admission.md:468` puts it in the table:
"Append-onlyness (M13/L-frame) | `git checkout` of an earlier commit **deletes** object
files | not a git property at all." And `:470-473`: "the store's append-only law is a
*model* law; a git working tree is not append-only, and a branch switch or a reset can
remove object files that a later name still points at."

Proposed rider text for the R-15c record (R3's own question 9 wording, `:752-753`,
sharpened):

> **R-15c rider.** The store directory is git-**transported**, not git-**managed**. A
> working tree is never the store of record. Git's connectivity check and `fsck` cover
> git's own DAG; our reference edges live inside blob content git never parses, so they
> contribute **zero** to WF2 and WF3 (`R3-transport-admission.md:456-457`). A branch
> switch or reset can delete object files a name still points at — append-onlyness is a
> model law, not a git property. `.gitattributes` with `* -text` under the store root is
> required before any dual-host exercise.

### 5.5 STORE-SHELL text changes

**Change 9 — §4's layout line**, only under options 2 or 3. Current
(`STORE-SHELL.md:85`), quoted:

> ```
>   names/<name>              # one address per file — the mutable plane, beside the store
> ```

Proposed (option 2):

> ```
>   names/<hex-of-name>       # one address per file, filename = lowercase hex of the
>                             # name's UTF-8 bytes — the mutable plane, beside the store.
>                             # The FILENAME IS NOT THE KEY (F-39): a case-folding
>                             # filesystem would otherwise merge two model bindings into
>                             # one file and answer `name-get` differently on each plane,
>                             # both exiting 0.
> ```

Proposed (option 3):

> ```
>   names                     # ONE file: the whole name map, one canonical line per
>                             # binding — the mutable plane, beside the store. The key
>                             # space is Lean's `String`, matching `E2.NameMap` exactly
>                             # (F-39); the filesystem never sees a name.
> ```

**Change 10 — §1 rung 1.** Current (`STORE-SHELL.md:37-39`), quoted:

> - **Rung 1 — differential harness (tested).** The same operation scripts run against
>   the pure `StoreMap` model and the disk store; observable results compare
>   byte-for-byte. Divergence is a hard failure. This is the test-and-iterate loop.

F-39 is a live divergence against exactly this rung. If the operator picks option 5, this
line needs a carve-out; under options 1–3 it stands unchanged, and *that is the argument
for 1–3*. Worth stating in the ruling record either way.

### 5.6 Harness scripts

| Script | Asserts |
|---|---|
| `r2-11-name-case-collision.script` (exists, **FAILS today**) | the divergence itself. Under option 1 it becomes two `bad-name` rejections; under 2 or 3 it becomes two distinct bindings agreeing on both planes. **Either way its transcript flips, and the flip is the amendment record** |
| `r2-15-name-plane-edges.script` (exists, passes) | regression cover for the alphabet and width bounds, *including* `trailing.`, `con`, `NUL`. Under option 1 the first flips; under 2/3 all three keep passing and stop being hazards |
| `24-name-roundtrip-hostile.script` | new: names at the alphabet's edges round-trip through `name-set`/`name-get` with byte-identical observables on both planes — the property options 2 and 3 buy |
| `25-name-file-canonicity.script` | new, needs `(place …)`: a name file whose content is a digest followed by junk. Today it resolves clean (`R2-boundary.md:483-489`); pins whichever discipline the operator rules |

---

## 6. SH5 amortization (F-44) — a design sketch, and the invariant that keeps it honest

### 6.1 The measurement

R2 target 5 (`R2-boundary.md:672-681`), `/usr/bin/time -l` on this Mac:

- `H` (`Sha3.Impl.sha3_512` over `List UInt8`) runs at **≈38 µs/byte ≈ 26 KB/s**.
- A 2 MB object costs ≈76 s to admit.
- Every verb opens with the full scan (README F-5), so **that 2 MB object makes every
  subsequent verb on that store cost ≈76 s, forever** — and v0 has no deletion.
- Large-store `check` is roughly linear: ≈1.8 ms per tiny object, ≈3.9 ms once objects
  carry a reference (`:685-693`).

**The decisive line for the design** (`:672-677`): "The cost is the digest, not the parse."
A *flat* 2 MB payload at depth 1 costs the same as a 2 000 000-deep one. R2 also could not
break the parser on depth — no stack overflow at 2 000 000 (`:659-665`).

Read together with the per-object numbers: on a store of *ordinary* objects the scan is
milliseconds; the pathology is entirely in `H` over large payloads. **So the whole of
F-44's cost is captured by amortizing WF1 alone.** Every other check — parse, canonicity,
`wfsB`, WF2, typing, Kahn's — is in the 1.8–3.9 ms/object band and should keep running
every time. That is a much narrower amendment than "cache the scan", and it is the one the
measurement supports.

### 6.2 What the anatomy records about how git and Nix amortize

- **§2.4, packfiles** (`:220-229`): "replace many loose objects with one compressed file
  plus an index, and store some objects as *deltas*"; "Delta encoding is invisible to the
  address"; and the sentence that licenses this whole section: "**The address commits you
  to an encoding, not to a storage format.**" A manifest is a storage-layer artifact, so
  it may exist without touching identity — but only if it stays on that side of the line.
- **§7.5, integrity** (`:854`, `:861-864`): git's `fsck` is "cheap: the pre-image is
  exactly what is on disk", and the generalizable rule — "**Re-hash-on-read is cheap
  exactly to the degree that your stored bytes ARE your pre-image bytes.**" So git's real
  amortization is not skipping verification; it is having made verification one hash call.
  Our store already made that choice (§8.4's "single highest-leverage decision", `:1078`).
- **§7.5, Nix's bottom row** (`:866-869`) — the sharpest warning available: "an
  input-addressed path has **no self-check at all**. Its address is derived from a recipe,
  so corrupted content is indistinguishable from correct content without an external
  signature. Choosing the input-addressed axis (§5.2) means giving up local
  verifiability."
- **§8.6** (`:1110-1115`): re-hash-on-read "catches storage corruption, truncation, and
  substitution. It does **not** catch an encoder bug… This is worth saying out loud
  because 'the store verifies itself' invites exactly the wrong inference."

**The synthesis, and it is the design's whole content:** a manifest that is *trusted* is a
recipe, and a store whose integrity rests on a recipe is input-addressed. Nix's row says
what that costs. So the manifest must never be trusted — it must be a *cache of a
computation whose inputs are all still present*.

### 6.3 The manifest invariant — four clauses

Stated as the thing SH5′ would have to carry, because "it must be an optimization, never a
trust source" is only a slogan until it is four testable clauses.

> **M-INV-1 (verdict identity).** Deleting the manifest must not change any observable.
> `check` on a store with its manifest removed produces **byte-identical** output to
> `check` with it present. The manifest is a performance artifact and appears in no
> verdict, no violation, and no count.
>
> **M-INV-2 (self-invalidating).** The manifest declares the store state it summarizes, by
> a digest over the sorted address list it covers. A manifest whose declared listing does
> not match the actual directory listing is **ignored** — a cache miss, not a violation.
> Staleness must be *detectable without trusting the manifest*, which means the validity
> test may only read directory metadata the scan reads anyway.
>
> **M-INV-3 (bounded claim).** The manifest may record only *"WF1 held for address `a`
> under listing-digest `D`"*. It may not record "this store is clean", may not record WF2,
> WF3, `wfsB`, or typing — those are graph properties, they are cheap (§6.1), and a cached
> graph property is a cached *conclusion*, which is the recipe shape M-INV-1 exists to
> forbid.
>
> **M-INV-4 (falsifiable by construction).** There must exist a mode in which the manifest
> is ignored and the full scan runs — and the harness must exercise both, comparing. If
> "verify fully" is not a reachable code path, M-INV-1 is unfalsifiable.

M-INV-1 and M-INV-4 together are what make this differentially testable: a script places a
manifest, deletes it, and asserts identical transcripts. **That requires §2.7's `(place …)`
primitive**, which is the third piece of this package depending on it.

### 6.4 Two shapes, and the honest gap between them

**Shape A — manifest (a cache).** `manifest/` or a single `manifest` file listing
`(address, listing-digest)` pairs for objects whose WF1 was verified. On open: read the
directory listing, compute its digest, and re-hash only the objects not covered by a
manifest entry at that digest. Update after a successful scan.

- Amortizes: WF1 only, which is the whole of F-44's cost (§6.1).
- The listing-digest binding is what makes it self-invalidating: any file added, removed,
  or renamed changes the listing digest, invalidating every entry at once. Crude, but it
  is the version that cannot be subtly wrong. A per-file binding (address + size +
  something) is finer-grained and re-opens the question of what metadata may be trusted —
  and §4.3's ruling that the shell reads `Metadata.type` and nothing else would have to be
  reopened to admit `byteSize` or `modified`. **Recommend the crude version**; the fine
  one trades a soundness question for a constant factor.
- Note what it does **not** protect against: an attacker who can write the manifest can
  also write the objects, so this adds no adversarial exposure — §7 makes no security
  claims anyway. The exposure it *does* add is a **new plane a transported store can carry
  hostile content in**, which is F-42's class all over again. **§4's file-type discipline
  is therefore a precondition of §6**, not a sibling.

**Shape B — append-log (a journal).** A `journal` file listing addresses in insertion
order, appended on each successful PUT.

- Amortizes nothing by itself, but it **is** M19's insertion-order witness *recorded*
  rather than recomputed, and it is the one artifact that could make the M10 rank claim
  checkable against history rather than against a re-derivation.
- The same invariant applies with more force: a journal that is *believed* is a recipe.
  The honest design is that **the journal is a hint Kahn's verifies** — if the journal
  disagrees with the recomputed topological order, the journal is wrong and is discarded,
  never the graph. Under that rule the journal buys nothing computationally (Kahn's runs
  anyway) and buys something diagnostically (a mismatch localizes a transport fault).
- Against it: `hash-db-anatomy.md:1063` records that in an append-log deletion is
  "**impossible without rewriting** — that is the point of an append log", and `:1059`
  that "a torn tail must be detectable and truncated on recovery". A journal is a third
  durability problem in a package that makes no durability claims (§7).

**Recommendation shape (not a ruling):** Shape A alone, WF1 only, crude listing-digest
invalidation. Shape B is a v1 diagnostic, and it should not land before
`ObligationM19_transport` is proved, because until then the journal would be the only
statement of an order nothing else can check.

### 6.5 One piece of counter-evidence from the estate's own record

`implementation-approach-notes.md:546-570` (§C.7) is the estate's single *measured*
instance of "memoize the expensive intermediate, reuse it", and **it lost by 6×**: "Total:
525 s. The direct, unstaged `rfl` on the same goal: 86 s" (`:556-557`), with the author's
own warning at `:566-568` — "**This is the most dangerous item in the note**, because it
is the fix a competent person reaches for first, it looks correct, it *is* correct, and it
silently costs 6×."

That is a proof-elaboration result, not an IO result, so it does not transfer directly.
It transfers as a *procedural* obligation: **SH5′ should not be ruled on the strength of
an argument that caching will be faster. It should be ruled with a measurement**, on the
same store sizes R2 used (`:685-693`), showing the manifest path beats the full path.
Cheap to produce and it forecloses the estate's own recorded failure mode.

### 6.6 STORE-SHELL text changes

**Change 11 — §4's last clause and §8's SH5 row** both currently say amortization arrives
"only by amendment" (`:94`, `:146`). Those sentences already reserve the ground; the
amendment would add a new ruling row rather than rewrite them:

> | SH5′ | Verification-on-open amortization | A manifest may cache **WF1 only**, keyed by a digest of the objects-directory listing; every other scan clause runs on every open. Four invariants bind it: (1) deleting the manifest changes no observable; (2) a manifest not matching the current listing digest is ignored, never a violation; (3) the manifest records only "WF1 held for `a` under listing `D`", never a verdict; (4) a manifest-ignoring mode exists and the harness exercises both and compares. Ruled only on a measurement, not on an argument. Prerequisite: §3's file-type discipline (the manifest is a plane a transported store can poison). |

**Change 12 — §7 "Not claimed".** Add:

> No durability claim for the manifest: it is a cache, and losing it costs time, never
> correctness. No claim that the manifest detects an encoder bug — re-hashing does not
> either (`hash-db-anatomy.md` §8.6).

### 6.7 Harness scripts

| Script | Asserts |
|---|---|
| `26-manifest-invisible.script` | **M-INV-1.** Build a store, run `check`, place a manifest, run `check`, delete the manifest, run `check` — all three transcripts byte-identical. Needs `(place …)` |
| `27-manifest-stale.script` | **M-INV-2.** Place a manifest, add an object, `check` → the stale manifest is ignored and the new object is verified; **no violation line mentions the manifest** |
| `28-manifest-lying.script` | **M-INV-3, the sharp one.** Place a manifest asserting WF1 for an address whose bytes are corrupted, at a listing digest that *matches*. `check` must still report `violation wf1`. If it does not, the manifest is a trust source and the amendment is unsound. **This is the script that decides whether SH5′ shipped correctly** |
| `29-scan-cost.md` (not a script) | the measurement SH5′ should be ruled on: `check` wall time with and without the manifest, at R2's store sizes |

`28` deserves emphasis: it is the only script in this package that can distinguish "the
manifest is an optimization" from "the manifest is a recipe", and it is only writable if
the manifest's coverage claim is *narrow enough to contradict* (M-INV-3). A manifest that
recorded "store clean" would make `28` unwritable — which is a good test of whether the
claim is bounded.

---

## 7. The package as one amendment: order, dependencies, and what it leaves open

### 7.1 Dependency order

```
  F-26 repair (dupFreeS (.lit v) := dupFreeV v)        ← family 1; §1 is weaker without it
        │
  §1  wfsB minted in E2 + boundary check + scan check   ← closes F-33
        │
  §3  ordering: WFS before canonicity, + carrier-side   ← closes F-40, re-diagnoses F-41
        │
  §4  symlinkMetadata + typed errors + exit-code 2      ← closes F-42
        │   (precondition for §2's and §6's new planes)
  §2  Kahn's + order emission                           ← closes F-32, computes M19/M10
        │
  §2.7 (place …) harness primitive                      ← WITHOUT THIS, §2/§4/§6 are untestable
        │
  §5  names ruling (operator's; 5 options)              ← closes F-39
  §6  SH5′ manifest, on a measurement                   ← addresses F-44
  §5.4 F-37 rider (.gitattributes now; MAX_PATH check)  ← cheap, independent, do first
```

The F-37 rider is independent of everything and costs one file; there is no reason for it
to wait.

### 7.2 What one amendment package would contain

Twelve text changes across STORE-SHELL §1, §3, §4, §5, §7, §8, §9; one new E2 definition
with an iff-theorem (`wfsB`); one new E2 module (`topoOrder` plus two obligations); one
whitelist entry plus a candidate G-S5 gate leg; one harness primitive family; and
somewhere between fourteen and nineteen scripts depending on how many of the
assert-today's-defect forms are committed first.

### 7.3 What it does not close — stated so the amendment cannot over-claim

1. **`Conforms`.** The M18 seat. Until it lands, `check` clean means `Admissible` minus
   the conformance conjunct.
2. **`Admissible → Reachable`.** `ObligationM19_transport` is stated
   (`R3-transport-admission.md:664-666`), unproved. §2 computes the witness; the theorem
   is a seat. R3's proof shape is at `:669-684` and names the one piece with real content
   (root existence in a finite DAG).
3. **F-35 / SP-11.** `.lit (.vaddr a)` stays refs-invisible. A `litNarrowB` conjunct would
   land at §1's call site; the ruling is family 1's.
4. **F-14's set-vs-sequence gap** in general. §2 narrows it; only M19 closes it.
5. **The encoder.** `hash-db-anatomy.md:1111-1113`: re-hashing "does **not** catch an
   encoder bug — if `encodeF` is wrong, the stored bytes and the recomputed digest agree
   perfectly with each other and are both wrong." Nothing in this package changes that,
   and §6.2's warning applies to the amended scan exactly as it applied to the old one.
6. **Windows.** Everything in §4 and §5 is Mac-only evidence. `UNVERIFIED` throughout.

### 7.4 Questions this lane cannot answer

Carried forward from R2 and R3, narrowed to this lane, with what has changed:

1. **Which plane is authoritative for names?** (R2 q5.) §5.3 shows options 2 and 3 answer
   "the model" and 1/4/5 answer "the disk". Nothing here can pick.
2. **Does `check` claim reachability?** (R2 q2.) §1.4 and §2.5 propose narrowing the claim
   to `Admissible` *and* widening the scan. Both, not either — but the wording is the
   operator's.
3. **Does SH3 admit a file-type primitive?** (R2 q6.) §4.2 answers *which* primitive if
   the answer is yes, and §4.3 flags the timestamp rider the admission drags in.
4. **Does the harness gain `(place …)`?** (R2 q10.) §2.7 upgrades this from "candidate
   remedy" to "precondition for three of six pieces".
5. **Do the four assert-today's-defect scripts get committed?** (R2's closing note.)
   PROCEDURE §5's ratchet makes the flip an amendment record; PROCEDURE §6's one-time
   disposition rule does not obviously cover a script.
6. **Does F-21 resolve, or does F-40 supersede it?** (R2 q3.) FINDINGS already records
   F-40 as "supersedes F-21" (`FINDINGS.md:48`), and §1.5's Change 2 assumes that reading.
7. **Do PUT and scan run the same check order?** (New, §3.3.) Two defensible answers.
8. **Is SH5′ ruled at all before a measurement exists?** (New, §6.5.)

---

## 8. `ACQUISITION-GAP` register

| # | Gap | Why it bites | What closes it |
|---|---|---|---|
| AG-1 | No in-repo receipt on filesystem case-folding or Unicode normalization in any real system's name plane | §5.3's options 1 and 2 are both moves git has made; this lane cannot cite either | git `core.ignorecase`, `core.precomposeunicode`, `git-check-ref-format` |
| AG-2 | `packed-refs` is not in the anatomy | §5.3 option 3 looks novel and is (probably) well-precedented | git refs storage documentation |
| AG-3 | OSTree appears nowhere in the main tree | the brief names it as a comparator; only stale `.claude/worktrees` copies mention it, and those have no standing | an OSTree pass in the anatomy's §-per-system shape |
| AG-4 | git's `fsck` message table (`treeNotSorted` vs `duplicateEntries` as *separate* checks) | R2 §2.5 (`R2-boundary.md:350-358`) relies on it for the precedent that "sortedness" and "no duplicates" are different checks — **exactly §1/§3's thesis** — and marks it `UNVERIFIED:` from memory | `git-fsck` documentation; `fsck.h`'s message list |
| AG-5 | `transfer.fsckObjects` / `fetch.fsckObjects` / `receive.fsckObjects` defaults | R3 (`:449-450`) and R2 (`:354`) both rely on receive-time checking as the analogue of our §5 boundary; both flag it `UNVERIFIED` | git configuration documentation |
| AG-6 | Windows behaviour: reserved device names, trailing dots, `MAX_PATH`, `core.autocrlf` on a real checkout | §5.1's three admitted hazards and the whole F-37 rider | the Windows leg of the dual-host gate — a host, not a document |
| AG-7 | No prior implementation thinking on this lane in the estate | the two briefed explore documents are about a different program entirely (§0) | nothing to acquire; the gap is that this design has no predecessor |

---

## 9. Receipts index

| Claim in this report | Source | Locator |
|---|---|---|
| `WFS`'s three conjuncts are decidable Bools | `E2/Model.lean` | `:163-164`, `:85`, `:133`; `E2/Canon.lean:110` |
| the boundary checks none of them | `Shell/Boundary.lean` | `admit` `:125-148`; `scanObject` `:215-227` |
| six such schemas admitted, `check` clean | `r2-13-wfs-unchecked.script`; `R2-boundary.md` | `:239-251` |
| an unclosed schema passes checks 1–3 yet is unreachable | `R3-p5_openscan.lean` | `chk1:21`, `chk2:26`, `chk3:30`, `not_wfs:36`, `HEADLINE…:80` |
| a palindromic duplicate-key run is a `canonS` fixed point | `R3-p5_openscan.lean`; `R2-boundary.md` | `dup_canon_fixed:125`; `:184-199`, `:216-218` |
| a three-`"a"` carrier with two schemas is admitted and check-clean | `r2-12-dupkey-admitted.script` | steps 4–6 |
| the value twin, through `entity-put` | `r2-17-dupkey-value-admitted.script` | steps 2–6 |
| the boundary rejects bytes it produced itself | `r2-14-canon-involution-self-reject.script`; `R2-boundary.md` | `:287-299` |
| `ObligationCanonIdempotent` is conditional on `dupFreeS` | `E2/Obligations.lean` | `:56-63` |
| WF1+WF2 ⇏ reachability; Kahn's decides and emits the order | `R3-transport-admission.md` | `:123-128`, `:490-501` |
| M10 rank / M19 candidate-store forms | `R3-transport-admission.md` | `:614-617`, `:630-666` |
| `readView` classifies by filename and reads unconditionally | `Shell/Store.lean` | `:71-97`, esp. `:75-80` |
| directory → uncaught exception, exit 1 = "violations found" | `R2-boundary.md` | `:377-411` |
| FIFO → unbounded hang; symlinks followed | `R2-boundary.md` | `:428-444` |
| the whitelist has no file-type primitive | `Shell/Gate.lean` | `:64-73` |
| `symlinkMetadata`, `Metadata.type`, `FileType` | pinned toolchain v4.33.1 | `Init/System/IO.lean:1082-1094,1115-1129,1148-1156` |
| `metadata` follows symlinks; use `symlinkMetadata` | pinned toolchain v4.33.1 | `Init/System/IO.lean:1088-1090` |
| `EIO.toBaseIO`, `MonadExceptOf` for `EIO` | pinned toolchain v4.33.1 | `Init/System/IO.lean:82,100` |
| `IO.Error.inappropriateType` (EISDIR/ENOTDIR), `noFileOrDirectory` (ENOENT) | pinned toolchain v4.33.1 | `Init/System/IOError.lean`, `inappropriateType`/`noFileOrDirectory` constructors |
| the three-way exit code contract already exists | `Shell/Cli.lean` | `:20-23`, `:45-51`, `:66` |
| `main` has no handler | `experiments/entity-store-shell/Main.lean` | whole file (3 lines) |
| names: model/disk divergence, both exit 0 | `R2-boundary.md`; `r2-11-name-case-collision.script` | `:60-83` |
| `name-set` is not injective into the disk's key space | `R2-boundary.md` | `:86-97` |
| `trailing.`, `con`, `NUL` admitted today | `R2-boundary.md` | `:109-115` |
| names plane has no canonicity discipline | `R2-boundary.md` | `:479-490` |
| uppercase hex object filenames are strays by design | `R2-boundary.md` | `:467` |
| the anatomy records nothing on case-folding | `.staging/explore/hash-db-anatomy.md` | exhaustive grep, §8 AG-1 |
| a name is a mutable cell containing an address (all four systems) | `hash-db-anatomy.md` | `:238`, `:815-822`, `:1086-1098` |
| packing is a storage change; the address commits to an encoding | `hash-db-anatomy.md` | `:220-229` |
| re-hash-on-read is cheap because the stored bytes are the pre-image | `hash-db-anatomy.md` | `:854`, `:861-864`, `:1078-1079` |
| an input-addressed path has no self-check | `hash-db-anatomy.md` | `:866-869` |
| "the store verifies itself" invites the wrong inference | `hash-db-anatomy.md` | `:1110-1115` |
| `H` ≈26 KB/s; the cost is the digest, not the parse | `R2-boundary.md` | `:667-681` |
| `check` scaling, ≈1.8–3.9 ms/object | `R2-boundary.md` | `:685-693` |
| `classify` runs three times per object | `R2-boundary.md`; `Shell/Boundary.lean` | `:694-696`; `:242,249,252` |
| the harness cannot reach the transported-store class | `R2-boundary.md`; `Shell/Boundary.lean` | `:494-506`; `:161-169` |
| this estate has already shipped a CRLF-corrupted digest record | `docs/entity-store/research/schema-ast-census.md` | `:14-18` |
| git's DAG is not our DAG; checkout deletes objects | `R3-transport-admission.md` | `:456-473` |
| memoizing the expensive intermediate cost 6× (estate's own measurement) | `.staging/explore/implementation-approach-notes.md` | `:546-570` |
| defaulting hides errors as zeros | `.staging/explore/implementation-approach-notes.md` | `:600-601` |

**Claim posture.** G0 advisory, pre-grade. Every Lean statement cited is a G1 statement
about lab-owned definitions, kernel-checked by wave-2's refuters on the pinned toolchain
with axiom reports inside the estate allowlist; this report re-ran none of them and adds
no new theorem. Every shell transcript quoted is R2's, reproduced by R2 on macOS 25.2.0 /
APFS, not re-run here. Toolchain API facts are read directly from the pinned v4.33.1
source tree on this host. Claims marked `UNVERIFIED` in the source reports remain
`UNVERIFIED` here and are not upgraded by being repeated. Nothing here claims anything
about SHA3-512's security, about Windows behaviour, or about deployment. **This document
decides nothing.**
