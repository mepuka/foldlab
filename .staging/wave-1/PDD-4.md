# PDD-4 — The attack hoover: adversarial proofs into the record

CATEGORIES specification-design, abstraction-modules, contracts,
           algebraic-laws
STATUS     WRITTEN, not yet dispatched — informal convention is in
           force now (BREAKER.md "Attack artifacts are record");
           this ticket mechanizes it. Dispatch after THE-ALGEBRA
           lands or on the operator's word, whichever first.

## The operator's ruling (2026-08-30)

Everything a breaker proves is preserved, ideally mechanically. The
estate needs APIs to hoover adversarial attack proofs against the
estate — anything well-found and proved joins the record: "we
actually do prove that, because it's part of the record."

## What exists informally (the floor this ticket lifts)

- `contracts/attacks/<ticket>/` per package: attack modules
  (elaborating Lean, outside every lib target) + RESULTS.md
  (verdict, witnesses, failed attempts), breaker-hand commits on
  `attack/<agent>/<ticket>` branches.
- The packet's `## Breaks` ledger citing attack modules.
- The re-run duty: a fired attack is re-proved refuted after the
  fix.

First inhabitants: PDD-1's attack (canonBad, raw_terms_differ,
drifted_pin_is_FALSE, the exhaustive F-checks) and PDD-2's
(whatever its breaker lands).

## The work (breaker states the algebra first, per the process)

Mechanize the corpus without minting a carrier (decision 2 binds;
hoover never mints identity — the direction law):

1. **The attack manifest, decoded not invented**: a small described
   document per attack (ticket, subject commit, verdict, per-finding
   class/witness/status, module paths, elaboration recipe) — grown
   the way other schema-plane documents grow, by ruling; until that
   ruling, a fixed RESULTS.md structure that a parser in the
   effects library can decode losslessly (the informal floor made
   parseable).
2. **The hoover verb**: ingest `contracts/attacks/**` — parse
   RESULTS.md + manifest data, verify each attack module still
   elaborates against its stated subject commit, and put the
   artifacts into the store as content (attack module bytes +
   manifest), answering addresses. Ingestion only: surfaces tables
   and provenance, mints nothing.
3. **The regression gate arm**: for every fired-then-fixed attack,
   the re-run duty becomes checkable — the gate elaborates the
   attack module against the amended subject and confirms the
   recorded refutation direction (was-satisfiable → now-refuted).
   A fired attack whose refutation cannot be re-proved is a red
   gate, not a stale note.
4. **The record surface**: `cas ls`/`show` (or an arm on an
   existing verb — naming is a CLI-lane ruling, named not claimed)
   can answer: which packets were attacked, by what, what fired,
   what failed, what closed. The breaker's earned-confidence table
   becomes queryable.

## Fences

No new sorts. No new CLI verb without its ruling — arms on existing
verbs preferred, candidates named in the packet. `Cas/Backend/Mcp.lean`
untouched. Nothing the pending merges carry.

## Gates

Effects test suite green; `check:cas` untouched unless the manifest
ruling lands (then byte gates regenerate through the backend
workflow). The packet's battery must include: one fired attack
round-trips (hoover → store → re-elaborate → refutation confirmed)
and one failed-attempt table survives losslessly.
