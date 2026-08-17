# Where `flb.type.v0` is restated

The grammar is declared once in `SPEC.md` and restated sixteen times in
executable code. That is the drift engine the estate is dismantling, and
until it is gone every grammar change has to visit this list. This file is
the list.

Two runs built it independently and agree: the Eng survey required by
`scratch/dispatch/21-float-leaf-drop.md` §1, and the Rev seat's own
enumeration in `docs/research/2026-08-16-review-float-hygiene-branch.md`
§(g). Verified again against the tree at the brief-25 cure
(`scratch/dispatch/25-float-hygiene-cure.md`, C7). A site that appears in
the tree and not in this table is a finding.

"Touched" means the float-leaf drop or the literal narrowing edited the
site. "Checked-clean" means the site was read and carries no kind
alphabet to edit.

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
`walk.go` states it. Sites 15 and 16 are deliberately outside that guard:
they are another lane's sources behind another lane's gate
(`bash verify/ir/run.sh`), and a Go test in `proto/` reaching across the
boundary would make one gate's failure read as the other's.

The guard checks for the quoted kind name itself rather than a shape
around it. `case "float", "int":` evades a `case\s+"float"\s*:` pattern,
which is exactly how a dropped leaf comes back.
