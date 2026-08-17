# Rev round 3 — the brief-26 closure-law cure on `agent/codex/kernel-hygiene-gates`

Third pass by the same Rev seat, 2026-08-17. Baselines:
`docs/research/2026-08-16-review-float-hygiene-branch.md` (round 1, F1–F12) and
`docs/research/2026-08-17-review-float-hygiene-cure.md` (round 2, one blocker +
N2/N3/N4). Scope law for this diff: dispatch brief 26 (`scratch/dispatch/26-closure-law-cure.md`)
under rulings 5–7 of `docs/design/2026-08-16-ref0-extraction-grill-record.md`.

Four commits on top of the round-2 tip `157ee53f5`:

| commit | subject | cures |
|---|---|---|
| `19422b670` | Close the grammar over integrality | R1, R2 / the blocker |
| `86b7bb0f1` | Build the regeneration gate the estate assumed it had | R3 / N2 |
| `cf1b10e98` | Say what the IR model's Int abstraction actually drops | R4a / N3, F9 |
| `334c01618` | Cite brief 26 by number, not by a path a fresh checkout lacks | R4b / N4 |

Findings only. Nothing was fixed, committed, or pushed.

---

## VERDICT: **FINDINGS**

**No blocker. One major, three minors.** All four round-2 findings are cured,
and the blocker is cured *at the seam ruling 7 named* rather than at the
position that failed. The family hunt below found **no fourth wire-reachable
position**: every number a client can put into a `flb.type.v0` term now passes
one bound at one place, and I could not construct a term that escapes it.

**The one sentence:** the closure law holds, and the branch's best new
insight — that a fixture gate outside its Go module can report a stale
cached pass — was armed for exactly one of the four packages that read those
fixtures, and one of the three left unarmed is the closure law's own corpus
check, added by this same diff.

The three minors are precision defects of the same family the two prior rounds
were about, one abstraction level down each time: the enforcement mechanism's
type switch is narrower than the sentence it enforces (R2), the TypeScript
mirror's closure is at the author fold and nowhere else (R3), and the corrected
Lean note states half of a two-conjunct bound (R4). None reinstates the
shortest-round-trip obligation. None blocks the merge of the law itself.

---

## Review environment

Reviewed from a detached worktree at the branch tip, because the primary
checkout is on the branch and carries the coordinator's uncommitted records:

```
$ git worktree add --detach C:/Users/kokok/Dev/foldlab-rev-r3 334c01618
HEAD is now at 334c01618 Cite brief 26 by number, not by a path a fresh checkout lacks
```

Every build, gate, probe, plant and revert below ran in
`C:\Users\kokok\Dev\foldlab-rev-r3`. It was left clean
(`git status --short --untracked-files=all` empty) after every probe and
removed at the end of this review. Nothing was written to the primary checkout
except this file.

**Worktree report for the operator, as asked:**

- `C:/Users/kokok/Dev/foldlab-rev-cure` (round 2) — **gone**. It was removed by
  the round-2 seat as that report said it would be.
- `C:/Users/kokok/Dev/foldlab-rev-hyg` (round 1) — **STILL EXISTS**, detached at
  `7cfb0b660`, working tree clean. It has now survived two reviews that both
  asked for it to be removed. Remove it with
  `git worktree remove C:/Users/kokok/Dev/foldlab-rev-hyg`.
- `C:/Users/kokok/Dev/foldlab-dev-676` — a separate lane's worktree at
  `31c483524`, untouched by me and not this review's business.

Environment note carried forward and confirmed again: a fresh worktree needs
`cd proto/ts && bun install` (and `bun install` at the root) before
`bun run gates`; `gates` does not bootstrap `proto/ts`'s own lockfile. Not a
branch defect.

---

## Commit hygiene: **PASS**

No coordinator record was swept into any commit. Each commit's file list was
inspected individually, not just the aggregate diff:

```
$ git diff --name-only 157ee53f5..334c01618 | grep -Ei 'scratch/|docs/research|docs/design|\.gitignore|MEMORY'
(no matches)

per commit — total files / coordinator-record files
  19422b670 : 16 / 0
  86b7bb0f1 :  6 / 0
  cf1b10e98 :  3 / 0
  334c01618 :  3 / 0
```

The primary checkout carries two modified tracked files and twenty-six
untracked coordinator records at review time; none appears in the diff. Each
commit's file list matches its stated scope and no commit reaches into
another's.

The seam fence held for the third time. Untouched by the whole round-2 diff:

```
$ git diff --name-only 157ee53f5..334c01618 -- go/canonical packages/core packages/moves \
    fixtures/ verify/moves proto/wire/fixtures/{owned-types-v1,scheme-bridges,protocol-moves}.json \
    proto/wire/{reply-conformance,refusal-sorts}.json
(empty)
```

`sessions.json` is the only frozen fixture that moves, and it moves exactly as
much as the grammar digest forces (see §Regeneration).

---

## Gate transcripts (all re-run by this seat, at tip, in the review worktree)

| gate | exit | result |
|---|---|---|
| `cd proto/go && go test -count=1 ./...` | **0** | all packages ok |
| `bash verify/moves/run.sh` | **0** | 12 `GATE: PASS` lines, unchanged from round 2 |
| `bash verify/ir/run.sh` | **0** | `GATE: PASS (IR model proofs check)`; one pre-existing `simpa` linter note |
| `bun run gates` | **0** | `FOLDLAB GATES: PASS`, 157 pass / 4 skip / 0 fail |

`verify/ir/run.sh` was re-run this round because `cf1b10e98` edits two files in
that lane (prose only). Both before and after: exit 0. `GRAMMAR-SITES.md`'s
sites 15 and 16 are visited per its own law.

`bun run gates` stage list at tip now includes the new stage:

```
== proto/go — tests
ok  	foldlab/proto/cmd/wirefix	(cached)          <-- see finding R1
ok  	foldlab/proto/protod	9.364s

== proto/go — wire fixture regeneration
ok  	foldlab/proto/cmd/wirefix	1.653s

FOLDLAB GATES: PASS
```

---

## Per-finding disposition — all three rounds

### Round 1 (F1–F12), re-checked at this tip

| # | prior sev | round-2 disposition | **round-3 disposition** |
|---|---|---|---|
| **F1** | blocker | partially cured; still open at `check.args` | **CURED — at the class, not the instance.** The bound moved into the walker's number-decoding path. Verified by execution below; the round-1 literal vectors still refuse, now under the widened shared law. |
| F2 | major | cured as ruled (ruling 6) | **STILL CURED.** `checkValue({"k":"opaque"}, 5e-324)` → `nil`, by design. `closure_law_test.go` now pins opaque as a value-not-term exception, and my probe P9 maps how far the exception reaches (see family hunt §5). |
| F3 | major | cured | **STILL CURED.** Nine controls, nine `GATE: PASS` refutation lines re-observed at tip. `verify/moves/**` untouched by this diff. |
| F4 | major | cured beyond the brief | **STILL CURED.** Hygiene line set unchanged and green. |
| F5 | major | cured | **STILL CURED.** Untouched. |
| F6 | major | cured, with residual N2 | **CURED, residual closed.** All five fixtures regenerate byte-identical, and now a gate says so. |
| F7 | major | cured | **STILL CURED, and improved.** `GRAMMAR-SITES.md` gains a *number-position* table — the axis whose absence let `check.args` hide from a sixteen-site audit. Its top-of-file invariant is now the closure law itself. This is the right lesson drawn from the right evidence. |
| F8 | minor | cured | **STILL CURED, and widened.** The SPEC grep guard is joined by a set-equality guard between the `T ::=` block and `v0Kinds`, verified to fire in both directions. |
| **F9** | minor | **still open** (became N3) | **CURED** by `cf1b10e98`. Both notes now state the post-ruling-5/7 truth. See R4 for the one thing still unsaid. |
| F10 | minor | cured | **STILL CURED, and updated honestly.** `proto/AGENTS.md` now says *three* instances, and reads the third as evidence: "two position-by-position spec edits in two days is what a missing class-level law costs." |
| F11 | minor | cured | **STILL CURED.** Untouched; counts still match. |
| F12 | minor | cured | **STILL CURED, and extended.** The digest chain is now recorded across all three moves, `d5ff3590… → 78aff5581… → ca4ac75f… → 3cabc043…`. |

### Round 2 (the four), disposed by brief 26

| # | prior sev | brief clause | **round-3 disposition** |
|---|---|---|---|
| **F1-R2** (`check.args`) | **blocker** | R1 | **CURED.** One traversal, one predicate, one law sentence. The four canonical vectors are dead at four depths, under four enclosing kinds, through the fill seam and the catalog-admission seam — and, by my own probes, through the unfill seam, through a union member (where duplicate-detection canonicalization runs first), at depth 9, and through a resolved `ref` to a pre-law catalog fact. |
| **N2** (no regeneration gate) | major | R3 | **CURED, and the cure produced a better finding than the gate.** Gate green at tip; demonstrated red reproduced exactly, including the claimed byte offset; the cached-stale-pass hazard reproduced verbatim. `docs/FREEZING.md`'s inventory gains the five missing rows, and I checked each row's claim against the tree — all accurate, including the two files that live at `proto/wire/` rather than `proto/wire/fixtures/`. **Residual → finding R1.** |
| **N3** (`Semantics.lean` prose) | minor | R4a | **CURED.** Prose only; no theorem, definition, or `Prim` change. `verify/ir/run.sh` exit 0. The claim the note leans on — `conforms` accepts every value under `.opaque` — is true at `IR/Semantics.lean:131` (`| .opaque => true`). **Residual → finding R4.** |
| **N4** (uncommitted citations) | minor | R4b | **CURED, after being reproduced and fixed forward.** `19422b670` added two NEW citations to the untracked `scratch/dispatch/26-closure-law-cure.md`; `334c01618` replaced both with a by-number citation and restored SPEC.md's pre-existing brief-25 path citation. At tip, zero occurrences of the brief-26 path. Checklist for the merging coordinator below. |

### Round 3 (this seat's own)

| # | sev | file | finding |
|---|---|---|---|
| **R1** | **major** | `scripts/gates.ts:27-38`; `docs/FREEZING.md:165-174`; `proto/go/protod/{wall_test.go,protocol_moves_test.go,closure_law_test.go:296}` | The stale-cached-pass hazard this commit discovered, measured and documented is armed for `cmd/wirefix` only. Three other test files read the same cross-module fixtures under the `proto/go — tests` stage, which runs `go test ./...` with no `-count=1` — including `TestCommittedTypeVectorsCarryNoNonIntegralNumber`, the closure law's own corpus check, added in this diff. Reproduced: with a committed digest byte flipped in `types.json`, `go test ./...` printed `ok foldlab/proto/protod (cached)` while `-count=1` failed with `leaf-string: digest drifted`. `FREEZING.md` states the hazard prospectively ("Any future fixture gate…") when it is already actual for three present readers. |
| **R2** | minor | `proto/go/protod/walk.go:56-83` | `requireIntegralNumbers`' type switch is `float64 \| map[string]any \| []any` with no default, so a term constructed in Go with any other numeric type passes unbounded. Executed: `check.args` `{"min": float32(0.5)}` is ADMITTED with identity bytes `…"args":{"min":0.5}…` and digest `eae38e7e…`. Not wire-reachable — `canonical.Decode` converts every `json.Number` to `float64` recursively at every depth — but the four tracked files state the law universally over terms, and the literal position is closed against this while `check.args` is not, so the two positions still differ in a way the "one law" framing says they do not. |
| **R3** | minor | `proto/ts/src/jcs.ts:104-109`; `proto/ts/src/session.ts:60`; `proto/GRAMMAR-SITES.md:65-76` | The TS mirror's closure lives in `foldSchema` and nowhere else. `structureDigest` and its alias `sessionStateDigest` accept raw `Json` and mint a v0 identity for a term the certifier refuses. Executed: `structureDigest` on the round-2 counterexample returns `{ok:true, digest:"ca76451e…"}` over canonical bytes `…"args":{"min":5e-324}…` — the exact ES2019 shortest-round-trip rendering, and byte-identical to the digest the Go side derives for the same term. No tracked file is falsified (all four scope the mirror's claim to the author fold), but `GRAMMAR-SITES.md`'s new number table answers "who bounds it" with "the closure traversal in `walk()`" and never records that the TS identity utilities bound nothing. |
| **R4** | minor | `verify/ir/IR/Semantics.lean:16-24` | The closure law is a conjunction — `Trunc(n) = n` **and** `\|n\| ≤ 2^53−1`. The corrected note states what the `Int` abstraction *drops* and never what it *adds*: `Json.num : Int` is unbounded, so the model admits `num 10^30`, which the wire refuses. `grep -rn '2\^53\|9007199254740991' verify/ir/` returns nothing. The direction is the safe one (model ⊇ wire, so a conformance result over the model covers the wire's admitted set), which is why this is minor — but the file's own charter is "Abstractions, stated so they can be argued with", and this diff rewrote exactly that bullet with the bound in hand. |

---

## THE FAMILY HUNT

The round-1 mistake was approving a cut whose stated purpose a second position
refuted; the round-2 blocker was the third position. This section is the search
for a fourth.

### Method

Six passes, adversarial, each ending in an executed probe rather than a reading:

1. **Grammar exhaustion.** Every kind in `v0Kinds` plus `hole`, probed with a
   number placed at every key the production declares and at one it does not.
2. **Seam enumeration.** Every non-test caller of `walkStructure` / `walkPartial`
   (11 call sites across `catalog.go`, `completion.go`, `concierge.go`,
   `recursion.go`, `session.go`), plus every non-test caller of `canonicalBytes`
   (the digest-preimage producers) in `proto/go/**` — asking of each whether a
   walk stands in front of it.
3. **Decoder audit.** Whether any decode path can deliver a number to the walk
   in a form the traversal's type switch cannot see (`json.Number`, Go integer
   types, `float32`).
4. **Corpus sweep.** A mechanical scan of every committed JSON and NDJSON file
   in the repository for a number that is non-integral or outside ±(2^53−1),
   run independently of the branch's own claimed sweep.
5. **Value side.** Which type kinds admit a non-integral number as a *value*,
   and how far ruling 6's opaque exception propagates through containers.
6. **TypeScript mirror.** Every module in `proto/ts/src/**` that computes an
   identity or constructs a v0 term.

### Sites checked, and the result

**1 — every certifier kind's decode path (`walk.go`).** All sixteen probes
refuse, each under the law that owns the position:

```
P6 string+extra     REFUSED  a "string" node carries exactly its declared keys      path=[value]
P6 bool+extra       REFUSED  a "bool" node carries exactly its declared keys        path=[x]
P6 int+extra        REFUSED  a "int" node carries exactly its declared keys         path=[min]
P6 null+extra       REFUSED  a "null" node carries exactly its declared keys        path=[n]
P6 opaque+extra     REFUSED  a "opaque" node carries exactly its declared keys      path=[payload]
P6 hole+extra       REFUSED  a "hole" node carries exactly its declared keys        path=[x]
P6 list.of=number   REFUSED  every node is a JSON object carrying a "k" kind        path=[of]
P6 struct.fields.n  REFUSED  every node is a JSON object carrying a "k" kind        path=[fields a]
P6 struct.optional  REFUSED  "optional" is an array of field names                  path=[optional 0]
P6 union.of=number  REFUSED  every node is a JSON object carrying a "k" kind        path=[of 0]
P6 brand.name=num   REFUSED  a brand carries a non-empty name                       path=[name]
P6 ref.digest=num   REFUSED  a ref carries a 64-char lowercase hex digest           path=[digest]
P6 check.name=num   REFUSED  a declared check carries a non-empty name              path=[check name]
P6 check.args=num   REFUSED  check args are a JSON object (possibly empty)          path=[check args]
P6 check+extra      REFUSED  a "check" node carries exactly its declared keys       path=[x]
P6 check.check+ex   REFUSED  a declared check carries exactly "name" and "args"     path=[check x]
```

The grammar has exactly two term positions where a number is *lawful shape*:
`literal.value` and anywhere inside `check.args`. Every other key is typed to
string, array-of-string, object-of-term, or term. `checkKeys` refuses unknown
keys on every production, so no third position can be smuggled in beside them.
That is the structural argument that there is no fourth position to find — and
the closure traversal makes it irrelevant, because it does not depend on the
enumeration being complete.

**2 — the seams.** All eleven walk call sites are ahead of their digest:
`catalog.commitCertified` walks before `normalize` → `canonicalBytes` → derive;
`serveFill` / `serveUnfill` / the concierge / `completion` / `session.open` /
`session.move` / `session.state` / `session.commit` all walk the *whole updated
term* before any event is encoded. Probed rather than read:

```
P7 walkPartial, partial carrying 5e-324    REFUSED law=<closure> path=[fields b check args min]
P7 serveUnfill                              REFUSED law=<closure> path=[partial fields b check args min]
P1 union member check.args 5e-324           REFUSED law=<closure> path=[of 1 check args min]
P1 union member check.args 1e21 / 1e-7 / 0.1  all REFUSED, same law, same coordinate shape
P5 check.args 0.5 at depth 9                REFUSED law=<closure> path=[check args lvl 0 … leaf]
```

The union probe is the one I most expected to break: `walkNode`'s duplicate
detection normalizes and canonicalizes every member *before* the closure
traversal runs. It does not break — the member canonicalizes fine and the
closure law is still what refuses, with the right coordinate.

**3 — the ref graph, and pre-law catalog facts.** `walkRefGraph` re-walks every
resolved target, so a type cataloged *before* this cure that carries a
non-integral number cannot be reached through a `ref` by a new term:

```
P8 legacy fact identity = {"base":{"k":"string"},"check":{"args":{"min":5e-324},"name":"minLength"},"k":"check"}
P8 legacy fact digest   = ca76451e168b430da5a5614af038a9c2ac7802a8c02a0cdc954bc7e75710a726
P8 walkRefGraph over that ref  REFUSED law=<closure> path=[structure of digest $resolved check args min]
```

Recorded as a consequence rather than a finding: on a daemon whose JetStream
catalog predates the cure, such a fact stays resolvable by digest but every new
term that references it now refuses. That is the same hard-cutover shape as F12
and is bounded the same way, but it is not written down anywhere.

**4 — the decoder.** This is where a fourth position would have been invisible
to every probe above, so it was checked by reading:
`decodeBody` → `canonical.Decode` (`go/canonical/canonical.go:72-107`) sets
`decoder.UseNumber()` and then `decodeJSONValue` converts **every** `json.Number`
to `float64` **recursively, at every depth**, refusing non-finite values. Then
`CanonicalizeValue`, then `json.Unmarshal` into the request carrier, which
produces `float64` again for `any` members. **No `json.Number` and no non-float64
numeric can reach the walk from the wire.** `grep -rn "UseNumber\|json.Number"`
over `proto/go/**` returns nothing.

The in-process direction is open and is finding **R2**:

```
P2 check.args as Go float32(0.5)   ADMITTED identity={…"args":{"min":0.5}…} digest=eae38e7e…
P2 check.args as Go int(1)         ADMITTED (integral — harmless, but unchecked)
P2 check.args as Go float64(0.5)   REFUSED  <closure law>
P2 literal value float32(0.5)      REFUSED  a literal value is a JSON scalar — string, integral number, bool, or null
```

Two side-results worth recording because they look like holes and are not:

```
P3 literal -0                                  ADMITTED identity={"k":"literal","value":0}
P4 literal 9007199254740991.0000000000001      ADMITTED identity={"k":"literal","value":9007199254740991}
```

`-0` canonicalizes to `0`, which is ES2019 / RFC 8785 §3.2.2.3 behaviour, and a
non-integral JSON *literal* that rounds to an integral binary64 is admitted as
the integer it decodes to. Neither reinstates the obligation: the *canonical
form* is integral in both cases, and W2 already says identity is of canonical
bytes, never of what the submitter sent.

**5 — the value side, and how far ruling 6 reaches.** A fill value is not a
term, but it does enter a digest preimage, so its domain was mapped:

```
P9 value under int                    refused
P9 value under string                 refused
P9 value under literal 100            refused
P9 value under check over int         refused
P9 value under opaque                 ADMITTED (5e-324 enters the value digest preimage)
P9 value under list<opaque>           ADMITTED
P9 value under struct{a:opaque}       ADMITTED
P9 value under union[int,opaque]      ADMITTED
P9 value under brand<opaque>          ADMITTED
```

Ruling 6's exception propagates through every container, as it must. Stated
plainly because "the sole exception" reads narrower than it behaves: any
container wrapping an `opaque` inherits it.

Two further unconstrained-JSON-into-a-digest-preimage positions were found and
both are **declared, not silent**:

- `ingress.go:12-20` — `journal.publish` canonicalizes the whole frame,
  payload included, into a chain-entry digest with no conformance check. The
  file says so in its header comment and every admit reply carries the sentence
  `"admitted on identity resolution only; payload conformance against the
  claimed structure was NOT checked"`. Ratified, disclosed on the wire.
- `flb.protocol.v0` definitions (`protocol.go:76-…`) reach a digest through
  `catalog.commitValue`. I read `validateProtocol` field by field: `scheme`,
  `name`, `identity` are enum-or-string, `seats` / `liveness` / `close` /
  `completion` / `fence.order` are arrays of unique non-empty strings, `holes[].type`
  is a hex64, `fence.rule` is the literal `seat-authority`. **There is no
  number-bearing position in the protocol grammar at all**, so it cannot host a
  fourth member of this family.

**6 — every fixture schema.** An independent mechanical sweep, not the branch's:

```
$ git ls-files '*.json' '*.ndjson' | wc -l
155
scanned 152 of 155  (3 skipped: JSONC files under repos/effect/, not repo data)
--- non-integral / out-of-range numbers ---
  go/canonical/probes/cg1-vector.json  :: invalidSequence/1 = 9007199254740992  (deliberate negative control)
  proto/wire/fixtures/frames.json      :: 0/frame/payload/reading = 21.5
total hits: 2
```

`frames.json`'s `21.5` is under `sensor-reading`'s `"reading": {"k":"opaque"}` —
verified by resolving the frame's `type` digest against `types.json`. It is a
value in a payload, ruling 6's exception exactly, not a term. The branch's
commit message claimed one hit; the second is a canonicalizer negative-control
vector for chain sequences and is not a type term either. **The committed
corpus is clean.**

Note for completeness, because a naive sweep would miss it and then overclaim:
`fixtures/jcs-rfc8785.json` stores its numbers as *strings*
(`{"ieee754":"0000000000000001","encoded":"5e-324"}`). The shortest-round-trip
renderings live there deliberately — that is the trusted base's own conformance
corpus, differentially walled, and it is where the estate has always said this
printing lives.

**7 — the TypeScript mirror.** `grep` for every identity computation in
`proto/ts/src/**` returns exactly three consumers of `jcs.ts`: `author.ts`,
`codegen.ts`, `session.ts`. `client.ts`, `mcp.ts`, `cluster/**` compute none.
`protocol.ts` hand-builds v0 terms but only with string literals and takes every
digest from the daemon's reply (W1). The author fold is closed:

```
T1 fold Int.greaterThan(5e-324)  REFUSED  …every number in a type term is integral…  path=["structure","check","args","exclusiveMin"]
T1 fold Int.greaterThan(0.1 / 1e21 / 1e-7)   all REFUSED, same law, same coordinate
T2 fold Literal(0.1)             REFUSED  …every number in a type term is integral…  path=["structure","value"]
T4 fold String.minLength(3)      ADMITTED {"k":"check",…,"args":{"min":3}}
```

The raw identity utilities are not, and that is finding **R3**:

```
T5 structureDigest(raw 5e-324 term)   {"ok":true,"digest":"ca76451e168b430da5a5614af038a9c2ac7802a8c02a0cdc954bc7e75710a726"}
T5 canonical bytes                    {"base":{"k":"string"},"check":{"args":{"min":5e-324},"name":"minLength"},"k":"check"}
T6 sessionStateDigest(raw partial)    {"ok":true,"digest":"ca76451e…"}   (same digest — it is a thin alias)
```

That digest is byte-identical to the one the Go side derives for the same term
(probe P8). Both runtimes agree on an identity for a term neither certifier will
mint. The daemon simply refuses, so no wrong agreement is possible — but a TS
consumer can hold what looks like a v0 identity and is not one.

### Result

**No fourth position found on the wire.** The two lawful number positions
(`literal.value`, `check.args` at any depth) are both governed by one traversal
at the point numbers are decoded, and I could not construct a wire-submittable
term that escapes it — by depth, by enclosing kind, by seam, through the union
canonicalization ordering, or through a resolved reference to a pre-law fact.
The remaining number-bearing surfaces are: opaque payloads (ruling 6,
propagating through containers), journal frame payloads (declared unchecked on
the wire itself), the in-process Go-typed-number gap (**R2**), and the TS raw
identity utilities (**R3**). The `flb.protocol.v0` grammar has no numeric
position at all.

Two structural remarks the operator should have, because they are why I believe
this rather than merely failed to disprove it:

- The closure is a property of **where** the guard sits, and the branch guards
  that property mechanically — `TestIntegralityBoundHasOneCallSiteInTheWalker`,
  which I confirmed fires (below). A vector suite would not have survived a
  re-patch; this does.
- `GRAMMAR-SITES.md` now carries a **number-position table** beside the
  kind-site table. That is the correct response to the round-2 blocker: the
  blocker was invisible to a sixteen-site audit *because the audit enumerated
  kinds and a position is not a kind*. R3 is the one row that table is still
  missing.

---

## Spot-check transcripts

### The closure probes, in `check.args` positions

Committed suite (`closure_law_test.go`, 10 tests) green under `-count=1`. My own
probes beyond it — union nesting, depth 9, `serveUnfill`, the ref graph, Go
numeric types, `-0`, and the rounding case — are quoted in the family hunt above.
The probe file was deleted afterwards and the worktree confirmed clean.

### The one-call-site guard, verified to fire

The branch's DECISIONS entry claims this guard was verified by restoring the old
per-position branch. Reproduced, by planting exactly that:

```
$ # walk.go: literal case restored to `case float64: if isIntegralJSONNumber(value) {...}`
$ go test -count=1 -run TestIntegralityBoundHasOneCallSiteInTheWalker ./protod/
--- FAIL: TestIntegralityBoundHasOneCallSiteInTheWalker
    closure_law_test.go:233: walk.go calls the integrality bound 2 times; the closure law has exactly one call site
$ git checkout -- proto/go/protod/walk.go   # worktree clean
```

### The grammar-block / certifier agreement guard, both directions

```
A) at tip                              ok  foldlab/proto/protod
B) opaque production deleted from SPEC.md
   float_leaf_test.go:143: the certifier admits "opaque" and SPEC.md's grammar block declares no production for it
C) spurious {"k":"decimal"} added to the block
   float_leaf_test.go:148: SPEC.md's grammar block declares "decimal" and the certifier does not admit it
D) git checkout -- proto/SPEC.md        # worktree clean
```

Set equality in both directions, as the commit message claims.

### The regeneration gate: green, red, and the cache hazard

Green at tip:

```
$ cd proto/go && go test -count=1 -v -run TestCommittedFixturesAreAFreshEmission ./cmd/wirefix/
--- PASS: TestCommittedFixturesAreAFreshEmission (0.09s)
ok  	foldlab/proto/cmd/wirefix	1.406s
--- PASS: TestRegenerationGateCoversEveryFixtureTheGeneratorWrites (0.08s)
--- PASS: TestOverwriteGuardRefusesWithoutForce (0.00s)
```

Demonstrated red, reproducing the commit message's exact offset:

```
$ # flip one byte of types.json's first committed digest (offset 133)
$ go test -count=1 ./cmd/wirefix/
    regeneration_test.go:55: types.json drifted: the committed bytes are not what cmd/wirefix
        emits today (committed 6005 bytes, regenerated 6005). This is a FINDING, not a fixture
        to update: report it with the diff and stop.
    regeneration_test.go:61: types.json: first difference at byte 133
EXIT=1
$ git checkout -- proto/wire/fixtures/types.json   # worktree clean
```

The cache hazard, reproduced verbatim from a cold start:

```
$ go test ./cmd/wirefix/          ok  foldlab/proto/cmd/wirefix  1.482s     (populates the cache)
$ go test ./cmd/wirefix/          ok  foldlab/proto/cmd/wirefix  (cached)
$ # mutate one byte of concierge.json
$ go test ./...  | grep wirefix   ok  foldlab/proto/cmd/wirefix  (cached)
$ go test ./...  | grep wirefix   ok  foldlab/proto/cmd/wirefix  (cached)
$ go test -count=1 ./cmd/wirefix/
    concierge.json: first difference at byte 12866
FAIL
```

The branch's account is exact. **And the same probe run against the sibling
package is finding R1:**

```
$ # mutate one byte of a committed digest in types.json
$ go test ./...  | grep protod    ok  foldlab/proto/protod  (cached)
$ go test -count=1 -run TestTypeFixturesRederive ./protod/
    wall_test.go:55: leaf-string: digest drifted:
        got 3b67b844b3d096bc06a752cfdb4ff7ba292aa25662d6ee36e65135df797f2fc0
        want 0b67b844b3d096bc06a752cfdb4ff7ba292aa25662d6ee36e65135df797f2fc0
FAIL
$ git checkout -- proto/wire/fixtures/types.json   # worktree clean
```

`wall_test.go` is the differential fixture wall — the thing that says the
committed evidence still re-derives — and under `bun run gates` it can report a
stale pass on exactly the input it exists to watch. So can
`protocol_moves_test.go`, and so can `closure_law_test.go:296`, the closure
law's own corpus closure check that this diff added. The remedy is one line:
`-count=1` on the `proto/go — tests` stage, or a second dedicated stage for
`./protod/`.

Fairness note: on a cold CI cache the stale pass cannot occur. It bites the warm
local cache — which is precisely the situation of a seat that plants a mutation
and re-runs, and of the operator spot-checking a claim.

### `sessions.json` regeneration — the "exactly nine values" claim

Verified independently by value-level diff, not by line count:

```
CHANGED  grammarDigest          ca4ac75f… -> 3cabc043…
CHANGED  session                flb_session_v0_4727ee1a… -> flb_session_v0_b3e1b11e…
CHANGED  steps/0/canonical
CHANGED  steps/0/event/grammar  ca4ac75f… -> 3cabc043…
CHANGED  steps/{0,1,2,3,4}/head
total value-level changes: 9        line diff: 9 added / 9 removed
```

Nine values, no formatting churn, and no `stateDigest` among them — correct,
since the state digests depend only on the partial term, which did not change.
The TS mirror computes the same new grammar digest independently
(`SESSION_GRAMMAR_DIGEST = 3cabc043…`), and the deliberately hand-restated
black-box copy in `session_conformance_test.go:208` gained the same
`"numbers": "integral"` row. Both copies of the drift oracle were edited in one
commit again, which spends the oracle; I read both and they agree.

### `docs/FREEZING.md` inventory, spot-checked against the tree

All five new rows are accurate, including the honest split between "hand
authored contract vectors" and "model-shaped evidence with no provenance":

```
_provenance present:  protocol-moves.json, sessions.json
_provenance absent:   types, chains, frames, concierge, owned-types-v1, scheme-bridges
```

and `reply-conformance.json` / `refusal-sorts.json` really do live at
`proto/wire/`, not under `fixtures/` — the new inventory has the paths right
where round 1's report had them wrong. `refusal-sorts.json`'s embedded
`grammarDigest` (`26193b59…`) is derived from `{grammar, sortByKind}`, not from
the type grammar, so the third grammar-digest move correctly does not move it.

---

## N4 checklist — cited paths still uncommitted at this tip

For the merging coordinator. These are the tracked files that cite a path a
fresh checkout cannot open, enumerated mechanically (`git grep` for every
`scratch/dispatch|docs/research|docs/design` path in tracked files, then
`git cat-file -e HEAD:<path>` on each):

| cited path | cited by |
|---|---|
| `scratch/dispatch/21-float-leaf-drop.md` | `proto/GRAMMAR-SITES.md` |
| `scratch/dispatch/25-float-hygiene-cure.md` | `proto/SPEC.md`, `proto/DECISIONS.md`, `proto/GRAMMAR-SITES.md`, `verify/moves/DECISIONS.md` |
| `docs/research/2026-08-16-review-float-hygiene-branch.md` | `proto/DECISIONS.md`, `proto/GRAMMAR-SITES.md`, `verify/moves/DECISIONS.md` |
| `docs/design/2026-08-16-ref0-extraction-grill-record.md` | `proto/DECISIONS.md` |

Round 2 named three; `21-float-leaf-drop.md` is the fourth and was missed. Brief
26 itself is cited by number only, as R4b required — `git grep 26-closure-law-cure`
returns nothing at tip. Once the coordinator's records land with the merge, all
four resolve.

Out of this lane, recorded because the same query surfaced them and someone
should own them: six pre-existing dangling citations elsewhere in the tree —
`docs/design/{2026-08-13-capstone-deep-modules, 2026-08-14-federated-fold-cache,
2026-08-14-systems-as-data, 2026-08-15-codegen-services,
2026-08-15-type-population-from-data}.md` and `docs/research/effector-model-gate.md`,
cited from `README.md`, `NEXT.md`, `docs/design/**` and `verify/catalog/README.md`.
These are not this branch's doing and are a sibling of the two dangling pointers
`FREEZING.md` already documents.

---

## What is right, and worth saying

- **The cure is at the class, and the guard is on the class.** Ruling 7 asked
  for a class-killer; the branch delivered one and then defended the *shape* of
  the fix, not just its verdict, with a guard that turns red if anyone ever
  pastes the predicate back beside a position. I tried it. It works.
- **The refusal coordinate is identity-ordered.** Go randomizes map iteration;
  a two-argument counterexample would otherwise refuse at a different path on
  different runs. The 64-iteration determinism check is the right size of
  paranoia for the right reason.
- **The declaration landed in the same commit as the certifier.** The round-1 F1
  defect class was a spec that says one thing and a certifier that does another;
  `19422b670` fixes both and adds a set-equality guard so they cannot part again.
  `{"k":"opaque"}` finally appears in the `T ::=` block that its own amendment 3
  ratified.
- **`GRAMMAR-SITES.md` learned from its own miss.** The number-position table,
  and the invariant rewritten at the top of the file to say that a rule earns
  its place only if it can be stated once and inherited, is the most durable
  thing in this diff.
- **N2's cure produced a better finding than the gate it was asked for.** The
  executor built the gate, then discovered the gate could lie, measured it,
  armed against it, and wrote the hazard down. That sequence is exactly the
  house standard. R1 is only that the sequence stopped one package short.
- **N4 was reproduced by the commit meant to stop reproducing it, and fixed
  forward rather than amended.** The commit message says so plainly. That is the
  branch treating its own history as the record.
- **The IR correction is prose only** — no theorem, no definition, no `Prim`
  change — and it leans on a fact I verified rather than assumed
  (`conforms | .opaque => true`).

---

## Recommended disposition order

1. **R1 (major)** — one line. Add `-count=1` to the `proto/go — tests` stage in
   `scripts/gates.ts`, or give `./protod/` its own stage; and widen
   `docs/FREEZING.md`'s hazard paragraph from "any future fixture gate" to name
   the three present readers (`wall_test.go`, `protocol_moves_test.go`,
   `closure_law_test.go`). The branch's own sentence is the argument.
2. **R2 (minor)** — either a `default:` in `requireIntegralNumbers` that refuses
   any value outside the JSON-decoded domain, or one sentence in `walk.go`
   stating that the traversal's domain is `canonical.Decode`'s output and naming
   the decoder that guarantees it. Prefer the former; it costs three lines and
   makes the universal true without a footnote.
3. **R3 (minor)** — add a row to `GRAMMAR-SITES.md`'s number table recording
   that `jcs.ts`'s `structureDigest` / `normalize` and `session.ts`'s
   `sessionStateDigest` bound nothing, and that the TS closure is at
   `foldSchema` only. Whether to bound them is a separate call; recording it is
   not.
4. **R4 (minor)** — one sentence in `IR/Semantics.lean` saying the model's `Int`
   is unbounded where the wire bounds `|n| ≤ 2^53−1`, and that the gap runs
   model ⊇ wire.
5. **Housekeeping** — remove `C:/Users/kokok/Dev/foldlab-rev-hyg`; and land the
   four coordinator records so the N4 checklist above resolves at merge.

Nothing here blocks DEV-670's generation barrier. Ruling 5's and ruling 7's
condition — that no non-integral number enters `flb.type.v0` identity bytes — is
met for every term a client can submit, and I looked for the counterexample the
way the last two rounds found theirs.
