# Where `flb.type.v0` is restated

**The invariant this list is kept for: a grammar rule that has to be
restated at N sites gets restated at N−1 and stays wrong at the last one.**
So a rule earns its place in the grammar only if it can be stated ONCE and
inherited — the closure law (operator ruling 7) is the shape to copy. "No
number anywhere in a term is non-integral" is enforced in one traversal at
the point numbers are decoded, so it is not a row per number position; it
holds at positions nobody has written yet. A rule that cannot be stated
that way is a rule this list has to police by hand, and this list has
already missed one: the sixteen rows below enumerate the KIND alphabet, so
when the bound was attached to positions instead of to numbers, a
sixteen-site audit could not see the third number position (`check.args`)
because no row was about numbers at all.

The grammar is declared once in `SPEC.md` and restated sixteen times in
executable code. That is the drift engine the estate is dismantling, and
until it is gone every grammar change has to visit this list. This file is
the list.

Two runs built it independently and agree: the Eng survey required by
`scratch/dispatch/21-float-leaf-drop.md` §1, and the Rev seat's own
enumeration in `docs/research/2026-08-16-review-float-hygiene-branch.md`
§(g). Verified again against the tree at the brief-25 cure
(`scratch/dispatch/25-float-hygiene-cure.md`, C7) and at the brief-26
closure-law cure (`scratch/dispatch/26-closure-law-cure.md`, R1/R4a). A site
that appears in the tree and not in this table is a finding.

"Touched" means the float-leaf drop, the literal narrowing, or the closure
law edited the site. "Checked-clean" means the site was read and carries no
kind alphabet to edit. The closure law edited sites 1, 3, 7, 10, 14, 15, and
16; the other nine were read and needed nothing, because the law is about
numbers and those sites are about kinds — which is the miss the number table
below exists to prevent repeating.

## The sixteen sites

| # | site | file | status |
|---|---|---|---|
| 1 | grammar declaration | `proto/SPEC.md` (`T ::=` block) | touched |
| 2 | certifier kind list | `proto/go/protod/walk.go` (`v0Kinds`) | touched |
| 3 | certifier leaf switch | `proto/go/protod/walk.go` (`walkNode`) | touched |
| 4 | protocol value checker | `proto/go/protod/value_check.go` (`checkValue`) | touched |
| 5 | completion alphabet | `proto/go/protod/completion.go` (`leafCompletion` rows) | touched |
| 6 | frontier choices | `proto/go/protod/concierge.go` (legal-choice table) | touched |
| 7 | session grammar descriptor | `proto/go/protod/session.go` (`sessionGrammarDescriptor`) | touched |
| 8 | fixture corpus alphabet | `proto/go/cmd/wirefix/main.go` (`buildTypes`) | touched |
| 9 | `contract.describe` surface | `proto/go/protod/contract.go` (`describeReply`) | checked-clean — describes reply shapes through `vKind`, never enumerates the alphabet |
| 10 | author fold | `proto/ts/src/author.ts` (`foldBase`) | touched |
| 11 | effect-schema target | `proto/ts/src/codegen.ts` | touched |
| 12 | json-schema target | `proto/ts/src/codegen.ts` | touched |
| 13 | go target | `proto/ts/src/codegen.ts` | touched |
| 14 | TypeScript session descriptor | `proto/ts/src/session.ts` (`SESSION_GRAMMAR_DESCRIPTOR`) | touched |
| 15 | Lean reference grammar | `verify/ir/IR/Syntax.lean` (`Prim`) | touched |
| 16 | Lean semantics | `verify/ir/IR/Semantics.lean` (`conforms`) | touched |

## Number positions — the axis the kind table cannot see

A row above is a place the KIND alphabet is restated. Numbers cut across
that axis: they appear at positions, and a position is not a kind. This
table exists so the next number-shaped rule is not audited by reading a
kind list.

| position | where a number can appear | who bounds it |
|---|---|---|
| `int` leaf | the VALUE admitted under `{"k":"int"}` | `checkValue` → `isIntegralJSONNumber` |
| `literal.value` | the term itself | the closure traversal in `walk()` |
| `check.args` | the term itself, at any JSON depth | the closure traversal in `walk()` |
| opaque payload | the VALUE admitted under `{"k":"opaque"}` | nobody — the sole exception (ruling 6): uninterpreted canonical bytes, walled at the JCS seam |
| any position added later | the term itself | the closure traversal in `walk()`, by construction |

The last row is the point. The traversal runs over the whole term after the
grammar walk, so it does not enumerate positions and cannot fall behind one.
The TypeScript mirror is the same shape: one traversal over the folded term
in `foldSchema`, not a check per position.

Test-side restatements, all touched with their sources:
`conformance_test.go`, `normalize_test.go`, `session_conformance_test.go`,
`concierge.test.ts`, `normalize.test.ts`, `session-journal.test.ts`,
`author.test.ts`, `codegen.test.ts`. `session_conformance_test.go` is a
deliberate second copy of the session descriptor kept as a drift oracle;
editing both in one commit spends that oracle, so a reviewer reads both.

Checked-clean, no v0 kind alphabet anywhere in them: `packages/core`,
`packages/moves`, `go/**`.

## What is mechanically guarded

`proto/go/protod/float_leaf_test.go` greps sites 1–14 for the dropped
`"float"` kind and, for the integrality bound, requires that only
`walk.go` states it. `proto/go/protod/closure_law_test.go` adds the guard
the number table needs: `walk.go` may call the bound from exactly ONE
place, and that place must be the number-decoding traversal — so the
per-position patch that failed twice cannot be pasted back in beside a new
position. Sites 15 and 16 are deliberately outside that guard:
they are another lane's sources behind another lane's gate
(`bash verify/ir/run.sh`), and a Go test in `proto/` reaching across the
boundary would make one gate's failure read as the other's.

The guard checks for the quoted kind name itself rather than a shape
around it. `case "float", "int":` evades a `case\s+"float"\s*:` pattern,
which is exactly how a dropped leaf comes back.
