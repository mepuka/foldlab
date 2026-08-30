# PDD-12 — Loop tooling: the ritual, mechanized

CATEGORIES contracts, specification-design, assertions
BRANCH     agent/opus-cc-mac/pdd-12

Five loops have run by hand. Every builder and breaker repeats the
same ritual, and every step of it is checkable. Streamline WITHOUT
minting: mise tasks + scripts, riding existing machinery.

## The work (host-side; no Lean obligations beyond what exists)

1. **`mise run loop:verify -- <ticket>`** — one command asserting
   the loop's mechanical laws from git history and the tree:
   packet exists at contracts/<ticket>.contract.md and its first
   commit PRECEDES the first implementation commit touching the
   code under contract; the packet's battery paths exist; ledger
   rows with FIXED-BY reference commits that exist; attack records
   (if present) carry RESULTS.md + a subject commit that exists.
   Red output names the violated law in the everyday register.
2. **`mise run loop:census -- <module>`** — the axiom census every
   agent hand-rolled: #print axioms over a module's public
   declarations via a scratch driver, diffed against an expected
   set. Reuse the surface emitter's machinery where it reaches;
   note (do not fix) the Walk-registration gap.
3. **`mise run loop:attack-scaffold -- <ticket>`** — lays out
   contracts/attacks/<ticket>/{Attack.lean,RESULTS.md} skeletons
   with the header discipline (subject commit, outside-lib-target
   notice, re-run log table) prefilled.
4. Wire 1 into `check:cas` or the effects suite ONLY if it can be
   made deterministic and fast; otherwise it stays an on-demand
   task, stated as such.

## Fences

Scripts and mise tasks only — no new sorts, no CLI verb (mise is
the seat), no fenced files, no lakefile globs changed. The
packet-first law's SOURCE stays CONTRACT.md; the tool cites it,
never restates it. Packet first at
library/cas/contracts/PDD-12.contract.md — yes, the tooling ticket
gets a packet too: its laws are the checks above, its falsifiers
are staged violations (a packet committed after its implementation
must go red; a missing RESULTS.md must go red).

## Gates

The tool run against the five landed/standing loops (PDD-1, PDD-2,
PDD-3, PDD-8 branches; PDD-7/9 when present) — every real loop
green, every staged violation red. Effects suite untouched or
green.
