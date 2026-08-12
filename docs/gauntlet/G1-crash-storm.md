# G1 — The Crash-Storm Gauntlet

COORDINATOR-OWNED. The spec and the verifier
(`go/gauntlet/`, `go/cmd/gauntletverify/`) are frozen: climbers build the
harness that survives this page, they do not edit it.

## The claim under test

N worker processes over a real (out-of-process, file-backed) NATS
JetStream advance ONE chained workflow of effectful steps while an
adversary kills workers and restarts the server — and afterwards, a
verifier holding ONLY the exported run bundle proves, by recomputation:

1. the history verifies (chain, canonical bytes, positions),
2. every effect was committed exactly once (fences from the ledger),
3. replay of the journal reproduces the claimed final state byte-exactly,
4. a counterfactual substitution re-folds its cone to the claimed state.

This is the combination the prior-art record says nobody demonstrates,
aimed at exactly the CAS-under-faults territory the Jepsen NATS analysis
left untested (see the JetStream dossier §7).

## Pinned workload semantics (what makes verification possible)

All canonical forms are RFC 8785 via `go/canonical`; `H(v)` below means
`DigestHex(Canonicalize(json(v)))`. `salt` is a 64-hex string from the
manifest. Steps are `i = 0 .. steps-1`; `r_{-1} = ""`.

    base_i = H({"salt": salt, "step": i})
    d_i    = H({"base": base_i, "prev": r_{i-1}})   -- the work digest
    r_i    = H({"do": d_i})                          -- the effect result
    payload_i = canonical bytes of {"digest": d_i, "result": r_i, "step": i}

Each step's digest depends on the previous step's RESULT, so the workload
is one long dependency chain: substituting any result changes every later
digest — the counterfactual has a real cone. Effects are deterministic in
the digest so the verifier can recompute them; physical executions are
distinguished by ledger nonces, not by result bytes.

The journal is the standard `go/journal` chain (payload strings above).
The register protocol is the standard `go/effector` single-key protocol.
A worker's step loop is: derive `d_i` → effector claim/run/commit (the
effect body appends its ledger line BEFORE returning) → journal append at
position i (position-CAS; losers re-read and converge). Crashes may land
anywhere in that sentence.

Counterfactual: for the manifest's `cf_position = k`, the pinned
alternative is `r'_k = H({"cf": d_k})`; for `i > k`:
`d'_i = H({"base": base_i, "prev": r'_{i-1}})`, `r'_i = H({"do": d'_i})`.
The counterfactual state replaces results from position k onward.

State (the meaning fold): the object `{ "<i>": r_i }` for all steps, keys
decimal strings; its digest is `H(state)`.

## The bundle (artifact contract)

One directory per run:

    manifest.json        canonical JSON, exactly:
                         {"cf_position":k,"dup_runs":n,"salt":s,
                          "seed":str,"state_digest":h,"steals":n,
                          "steps":n,"workers":n}
    journal.ndjson       the journal's wire bytes, verbatim, one entry
                         per line, in order
    registers.ndjson     canonical JSON per line, sorted by digest:
                         {"digest":d,"fence":f,"result":r}
    ledger/<owner>.ndjson one file per worker; one line per PHYSICAL
                         effect execution, appended by the effect body:
                         {"at":ms,"digest":d,"fence":f,"nonce":u,"owner":o}
    storm.ndjson         one line per adversary action:
                         {"action":"kill"|"restart-server"|"spawn",
                          "at":ms,"target":t}
    counterfactual.json  canonical JSON:
                         {"position":k,"result":r,"state_digest":h}

## Verifier laws (GV1–GV9, enforced by `gauntletverify`)

- **GV1 chain**: every journal line is canonical bytes; seq contiguous
  from 0; prev-links verify from genesis.
- **GV2 semantics**: every payload is canonical, `step == seq`, and
  `d_i`/`r_i` match the pinned derivation. (This is replay: the verifier
  recomputes the whole workload.)
- **GV3 unique commitment**: registers are strictly digest-sorted, in
  bijection with journal digests, results agree with the journal,
  fences ≥ 1.
- **GV4 ledger**: every ledger line names a known digest and its file's
  owner; nonces are globally unique; **no two owners share a
  (digest, fence)** — fencing, cross-checked from physical evidence;
  every committed (digest, fence) has at least one ledger line — the
  committed fence-holder really ran.
- **GV5 honest at-least-once**: `dup_runs` = ledger lines − steps,
  recomputed, must match the manifest. Duplicates are legal (crash
  windows exist); lying about them is not.
- **GV6 replay**: the folded state's digest equals
  `manifest.state_digest`.
- **GV7 counterfactual**: `result` equals the pinned alternative; the
  re-folded cone state's digest equals `counterfactual.state_digest`;
  `cf_position ≤ steps − 10` (the cone must be nonempty enough to mean
  something).
- **GV8 storm floors** (G1 hardness): steps ≥ 500; distinct ledger
  owners ≥ 8 (= manifest.workers); hard worker kills ≥ 25; server
  restarts ≥ 5; steals (registers with fence > 1) ≥ 10, recomputed and
  equal to the manifest.
- **GV9 manifests are canonical**: manifest.json and counterfactual.json
  bytes are canonical JSON with exactly the pinned fields.

A G1 pass is `gauntletverify` exit 0 on **three bundles from three
distinct seeds**, produced by the same harness build.

## Epistemic honesty (house rule 10.1)

The verifier proves record CONSISTENCY: chain, commitment uniqueness,
replay, and counterfactual are recomputed facts. The storm log is
ATTESTED, not proven — a bundle cannot demonstrate that kills happened,
only record them; the in-concert review (coordinator watches a live run)
is the check on storm truthfulness. Fencing evidence (GV4) is real but
conditional on effect bodies writing the ledger before returning — that
discipline is part of the harness contract, reviewed, not verified.

## RESULT — PASSED, ratified 2026-08-12 (in-concert review)

Climber A's harness (`go/crashstorm`, `go/cmd/gauntlet`; build SHA-256
2F75AD23…3B61 per the attempts log) passed. Coordinator verification,
performed independently: frozen paths byte-untouched; full Go/TS gates
green under the coordinator's own runs; `gauntletverify` exit 0 on the
three final bundles (500/8/25 kills/5 restarts/25 steals each, 25
honestly-counted crash-window duplicate runs per bundle); TWO fresh
coordinator-chosen seeds (`coordinator-witness-1/2`) run live under
observation — both verified, with a mid-run process census showing the
10-process fleet (controller + server + 8 workers) churning through
kills. The headline law held under real violence: at-least-once effects
(duplicates exist and are counted), exactly-once commitment (500
registers, zero double commits), portable proof (the verifier needed
only the bundle).

**Named caveat, carried forward**: the storm is CHOREOGRAPHED — every
seed produces exactly 25 kills / 25 steals / 25 duplicates / 5
restarts, with kills timed to land in the effect-ran-commit-pending
window. That deterministically targets the hardest window (good) but
explores a single schedule family and shapes the floors exactly
(minimum-effort). Legal under G1's floors-as-minimums. A successor rung
(G2) should require stochastic storm schedules with per-seed variance,
or verifier-supplied schedules, before any claim stronger than "the
laws hold under an adversarially-timed but fixed storm shape."

## Non-goals for G1

Network partitions (JetStream client reconnect churn is in scope via
server restarts; partition injection is a later rung). Multiple journals.
R>1 clustering (single server process, file-backed — the restart tests
recovery and dedup-rebuild paths; clustered storms are G2's hill).
