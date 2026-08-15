# The laws index

Every law ID cited anywhere in this repository, the file that STATES it, and
the test that ENFORCES it — or `—`, honestly, when nothing does.

This file exists because of a specific failure mode. `proto/AGENTS.md` opens
its law list with "each is a test"; `proto/SPEC.md` heads its own with "each
one is a test somewhere". For most laws that is true. For some it is a
sentence in a comment above a test that checks something adjacent, and for a
few it is not true at all. The distinction is invisible from either end: a
reader of the law list cannot tell which laws are load-bearing, and a reader
of the test file cannot tell that deleting a line of prose retires a ratified
law. **Rewrite the comment and the law is gone**, silently, with every gate
still green.

`scripts/check-laws.ts` reads the tables below and checks them against the
tree. It is a gate: it exits nonzero when the index and reality disagree in
either direction — a row pointing at a file that no longer names the law, and
an ID named in a test file that no row claims. Adding a law without indexing
it fails. Removing the test that binds a law fails. Writing the missing test
for a law recorded here as `—` ALSO fails, because the row is then a lie about
the state of the evidence; upgrade the row in the same commit.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `BOUND` | The named test exists AND the law ID appears as a standalone token within 30 lines of it — in the test's name (`t.Run("W1 …")`, `test("EC1: …")`), its comment, or its refusal message. Deleting the test, renaming it, or removing the ID all break the index, so the binding is checkable. Proximity is the point: an ID sitting elsewhere in a 700-line test file is not a binding, and the checker will not accept it as one. |
| `UNBOUND` | A test covers the law's behaviour, but nothing in the test names the law. The coverage is real; the CORRESPONDENCE is a human judgement recorded here and nowhere else. Every `UNBOUND` row is a cheap upgrade: put the ID in the test name. |
| `DESIGN` | A scope or honesty boundary, not a mechanically refutable behaviour. It is indexed so absence is explicit, but manufacturing a mutant would pretend the verifier proves something the law says it does not. |
| `—` | No test. The law is a sentence. Each one is a finding. |

Scope: LAWS only. Decision registries (`D<n>`, per `proto/DECISIONS.md`),
verification rungs (`R0`–`R5`), and sweep item numbers (`A<n>`) are not laws
and are not indexed here.

## proto-wire:W1–W10 — the tracer bullet's wire laws

Statement: `proto/SPEC.md`, under "Laws (each one is a test somewhere)".

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `proto-wire:W1` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W1 asserted digest the daemon cannot re-derive refuses with both values` | BOUND |
| `proto-wire:W2` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W2 formatting never moves identity or refuses` | BOUND |
| `proto-wire:W3` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W3 same bytes converge, never error` | BOUND |
| `proto-wire:W4` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W4 unknown identity never enters a journal` | BOUND |
| `proto-wire:W5` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W5 an admit reply means durably appended and readable` | BOUND |
| `proto-wire:W6` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W6 the reader recomputes the head the reply claims` | BOUND |
| `proto-wire:W7` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W7 facts teach: every ok reply carries next hints` | BOUND |
| `proto-wire:W8` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W8 remaining refusal kinds arrive as data`; `proto/ts/test/smoke.test.ts::client-local failures are refusal values, marked local (W8)` | BOUND |
| `proto-wire:W9` | `proto/SPEC.md` | — | — |
| `proto-wire:W10` | `proto/SPEC.md` | `proto/go/protod/conformance_test.go::W10 the catalog fact is scheme-tagged` | BOUND |

`proto-wire:W9` — "the writ is three verbs; the client implements no authority protocol
(no CAS, no fencing)" — has no test. The conformance suite's own header says
so: it covers "W1–W8 (plus W10)". The single `W9` string in that file is a
parenthetical on `unknown-request`, which tests that an unhandled subject
still answers with data — a different claim. W9 is a NEGATIVE law (the client
must not grow an authority protocol), and negative laws want a structural
check, not a behavioural one: an import/AST assertion that the client package
never reaches for CAS or fencing, in the shape of `go/substrate/assumptions_test.go`.

## catalog-model:W1–W5 — the catalog model's local law names

`verify/catalog/Catalog.tla` reuses W1–W5 as source-local identifiers. The
registry qualifies them because an unadorned `W3` citation otherwise cannot
say whether it means the public wire contract or this model abstraction. The
frozen TLA module is not renamed here: `catalog-model:*` is an index alias.
W2 and W5 deliberately collapse in the abstraction and are not claimed;
their `DESIGN` status records that boundary rather than inventing a control.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `catalog-model:W1` | `verify/catalog/Catalog.tla#W1 no asserted identity` | `verify/catalog/run.sh::expect_violation CatalogBroken.assert` | BOUND |
| `catalog-model:W2` | `verify/catalog/Catalog.tla#W2 (canonicalization)` | — | DESIGN |
| `catalog-model:W3` | `verify/catalog/Catalog.tla#W3 create converges` | `verify/catalog/run.sh::expect_clean  Catalog.cap2` | UNBOUND |
| `catalog-model:W4` | `verify/catalog/Catalog.tla#W4 create before publish` | `verify/catalog/run.sh::expect_violation CatalogBroken        ` | BOUND |
| `catalog-model:W5` | `verify/catalog/Catalog.tla#W5 (read-your-admissions)` | — | DESIGN |

## concierge:C1–C5 — the concierge laws

Statement: `proto/AGENTS.md` — as the compressed range `C1-C5`, not five
sentences. C2, C3, and C4 are not individually stated in any contract file;
their only prose lives in test names and in `docs/research/`. That is the
same defect this index exists to expose, so the statement cell records the
range literally rather than pretending each ID has a home.

| Law | Statement | Enforcer | Status |
| --- | --- | --- | --- |
| `concierge:C1` | `proto/AGENTS.md#C1-C5` | `proto/go/protod/conformance_test.go::C1 fill and unfill are byte-pure`; `proto/ts/test/concierge.test.ts::C1 fill is pure: the same request returns byte-identical data` | BOUND |
| `concierge:C2` | `proto/AGENTS.md#C1-C5` | `proto/ts/test/concierge.test.ts::C2 unfill(fill(p, path, subtree), path) equals p over generated partials` | BOUND |
| `concierge:C3` | `proto/AGENTS.md#C1-C5` | `proto/go/protod/conformance_test.go::C3 frontier empty means the decided partial creates`; `proto/ts/test/concierge.test.ts::C3 frontier-empty iff zero holes iff type.create accepts` | BOUND |
| `concierge:C4` | `proto/AGENTS.md#C1-C5` | `proto/go/protod/conformance_test.go::C4 every advertised root fill is accepted`; `proto/ts/test/concierge.test.ts::C4 generated reachable partials have no dead ends and every frontier example is accepted` | BOUND |
| `concierge:C5` | `proto/AGENTS.md#C1-C5` | `proto/ts/test/concierge.test.ts::C5 holes never bear identity or enter catalog fixtures` | BOUND |

C2 and C5 are TS-island-only: the Go daemon carries C5's refusal sentence in
`proto/go/protod/walk.go` but no Go test names it. Cross-language law coverage
is asymmetric and the index is where that shows.

**Registry resolution.** Source-local `C1` denotes two unrelated laws. `concierge:C1` is
"fill and unfill are byte-pure". Entity `C1` ("entity meaning-fold
totality") is archived with its family below; `entity:C1` stays
reserved for it. These are aliases; renaming the source-local tokens
in coordinator-owned contracts remains a ratification boundary.

## Archived families (2026-08-15, tag `archive/pre-estate-focus`)

The estate-focus purge
(`docs/research/2026-08-15-estate-focus-retirement.md`) archived the
subjects of seven families whole — statement files, enforcer tests,
and implementations together, at the tag. No row below this section is
checked by `scripts/check-laws.ts`, because a table row pointing at an
archived file would fail the gate while claiming nothing; the record
here is prose so absence stays explicit.

- `EC1`–`EC4` + `entity:C1` — entity composition
  (`packages/core/test/entity.test.ts`).
- `EL0`–`EL10` — the effector register
  (`go/effector/effector_test.go`; the eleven tests were the A6
  protocol's only in-repo spec, and that honest status archives with
  them).
- `WL1`–`WL4` — the register watch (`go/effector/watch_test.go`).
- `GV1`–`GV9`, `RL1`–`RL7`, `TV1`–`TV8`, `CL1`–`CL5` — the gauntlet
  verifier lanes (`go/gauntlet/`, `docs/gauntlet/` statements remain
  frozen in-tree; their enforcers are at the tag).
- `SL1`, `SL4` — the demo server (`packages/server/`).
- The generated fold laws (`packages/core/test/fold.laws.test.ts`) and
  the substrate assumptions (`go/substrate/assumptions_test.go`) —
  both were outside the ID scheme by design and archive without rows.

Every archived ID stays RESERVED: numbers and names are never reused,
so a citation in a frozen dossier still denotes exactly one law. A
family returns by un-archiving its subject with its tests, not by
re-typing the table.

## Families outside the ID scheme

- **`R0`–`R5`** are verification RUNGS (`docs/map/tickets/009`), recorded in
  `VERIFICATION.md`, not laws.
- **`D<n>`** are decisions. Four live registries collide (#33 A1); that is a
  namespacing debt, not a law debt.
- **Source-local `W1`–`W5` in `verify/catalog/`** are registered as
  `catalog-model:W1`–`catalog-model:W5`; the tracer bullet's are
  `proto-wire:W1`–`proto-wire:W5`. Likewise source-local `C1` is registered as
  `concierge:C1` or `entity:C1`. The aliases remove ambiguous citations
  without editing frozen authority; an actual source-ID rename requires
  coordinator ratification.
