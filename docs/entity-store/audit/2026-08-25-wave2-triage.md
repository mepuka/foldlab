# Wave 2 triage — all findings, ranked by severity

Status: G0 triage instrument, 2026-08-25. Ranks the twenty-one findings F-25…F-45
(FINDINGS.md rows; full evidence in `.staging/scouts/2026-08-25-wave2/`). Ranking is the
coordinator's; the rulings are the operator's. This document decides nothing.

## Severity scale

| Tier | Meaning |
|---|---|
| **S1 — critical** | A ratified claim or stated theorem is FALSE, the trust instrument is evadable, or the system returns a silent wrong answer. Repair before anything is built on it. |
| **S2 — high** | Would become false, or would propagate, the moment planned work lands. Cheap now, expensive later. |
| **S3 — medium** | A real gap needing a ruling; no current claim is false. |
| **S4 — low** | Bookkeeping, measurement, or a confirmed-good result worth pinning. |

## The ranking

| Rank | F | Tier | One line | Status |
|---|---|---|---|---|
| 1 | F-43 | S1 | three G-S gate escapes — the instrument carrying trust for every shell claim | **FIXED `2f33ae0`** |
| 2 | F-25 | S1 | M17 typed reachability is FALSE on today's `Reachable`; A-6 does not close it | open — family 1 |
| 3 | F-39 | S1 | model/disk divergence: names case-sensitive in model, case-folding on disk — silent wrong answer, exit 0 both sides | open — family 3 |
| 4 | F-33 | S1 | the boundary enforces NO part of `WFS`; `check` clean does not imply `Reachable`, contradicting STORE-SHELL §4 | open — family 2 |
| 5 | F-40 | S1 | F-21 explodes: a palindromic duplicate-key run byte-compares equal to its own re-canon, so it is admitted and checks clean | open — family 2 |
| 6 | F-26 | S1 | A-6 **as ruled** re-falsifies S1 — the involution reappears one plane up | open — blocks A-6 |
| 7 | F-32 | S1 | SH5 false as worded: a WF1+WF2-clean store can hold a reference cycle; acyclicity is independent and unchecked | open — family 2 |
| 8 | F-41 | S2 | the boundary rejects bytes it produced itself (`preimageS` is not idempotent as a byte function) | open — family 2 |
| 9 | F-42 | S2 | missing file → uncaught exception with an ambiguous exit code; a FIFO → unbounded hang | open — whitelist amendment |
| 10 | F-30 | S2 | M19 as worded (G8) refuted four ways — caught **before** pinning | open — pin the repaired form |
| 11 | F-28 | S2 | duplicate-key VALUES are reachable, so `canonV` idempotence is vacuous exactly where F-12 bit | open — family 1 |
| 12 | F-35 | S2 | `.lit (.vaddr a)` hides an address from `refsS`, so a boundary rule is load-bearing for WF2 | open — model clause owed |
| 13 | F-36 | S2 | Q12's price is real: under `oneOf`, M17 would certify a value Effect's decoder rejects | open — family 1 |
| 14 | F-27 | S3 | A-4 edges collapse: `.array e ≡ .tupleRest .nil e` for every `e` — an infinite spelling family | open — admission |
| 15 | F-34 | S3 | the single-spelling rule names 2 constructs; there are ≥10 families, one unbounded | open — admission |
| 16 | F-29 | S3 | check payloads are address-significant and nothing canonicalizes them | open — R-4 session |
| 17 | F-37 | S3 | R-15c: git's connectivity does not see our ref edges at all; CRLF, MAX_PATH, checkout-deletes hazards | open — R-15c rider |
| 18 | F-44 | S4 | `sha3_512` runs ~26 KB/s; full re-scan per verb makes one 2 MB object cost ~76 s forever | noted for v1 |
| 19 | F-45 | S4 | docs say "nine committed scripts"; there are ten | bookkeeping |
| 20 | F-31 | S4 | **M10 survives** for arbitrary `H`; statement needs address-node vocabulary | pin as proposed |
| 21 | F-38 | S4 | listing order is **not** observable; `reachable_keys_nodup` proved as companion | pin as proposed |

## What this means, tier by tier

**S1 (seven findings, one fixed).** Six remain and they cluster: two are about the
*typing plane* (F-25, with F-26 blocking its planned amendment), three are about the
*boundary* (F-33, F-40, F-32 — the shell admits what the model forbids and claims a
reachability it does not establish), and one is a *live wrong answer* (F-39). The gate
repair (F-43) had to come first because it is the instrument every other shell claim
leans on; it is done, negatively validated, and committed.

**S2 (six findings).** All are cheap now and expensive later. F-30 is the clearest
vindication of refuting before pinning: M19 was refuted four ways while it was still
prose. F-26 is the same lesson for amendments — A-6 ruled but not yet implemented,
and implementing it as ruled would have silently restored F-12 one level up.

**S3 (four findings).** Genuine design questions, no false claims. The admission rules
(F-27, F-34) are the substantial one: the single-spelling rule turns out to name two
cases out of at least ten, one of them infinite.

**S4 (four findings).** Two are positive results worth pinning — M10 survived attack
for arbitrary hashes, and listing order was shown unobservable, which sharpens rather
than damages the F-15 disposition.

## What survived attack

Recorded because a refutation wave that only reports damage is not measuring anything:
**M10** (acyclicity) survived for arbitrary `H`, including deliberately colliding ones;
**find-extensionality** survived as the right equivalence for M11-commutation, with a
proved companion lemma; the **M4a/M12/M15 family** was attacked with adversarial values
and survived; the **committed harness scripts** all still pass, and the divergence hunt
had to reach the filesystem's case-folding to find one.

## Recommended order of repair

1. **F-43** — done.
2. **Family 1** (F-25, F-26, F-28, F-36) — the typing plane. Ruling needed on whether
   `Conforms` becomes the judgment on canonical forms only; that repair also retires
   bridge pin B4 and unblocks A-6 (with the F-26 fix shipped alongside).
3. **Family 2** (F-33, F-40, F-32, F-41) — one boundary amendment: `WFS` as a named
   check plus decidable acyclicity, with STORE-SHELL §4/§5 narrowed to what `check`
   actually establishes.
4. **Family 3** (F-39) — names-plane semantics; needs the operator's call on which
   plane is authoritative.
5. **Pins** (F-30, F-31, F-38) and the S3 admission rulings.
