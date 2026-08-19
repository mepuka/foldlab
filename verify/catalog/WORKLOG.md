# Catalog verify/ worklogs — two lanes, one file

Merge note (coordinator): the PROVER (R3 repair) and HARDENER (gate
hardening) lanes each began a WORKLOG.md at this path; both are kept
verbatim below, in merge order.

---

# Catalog R3 repair worklog

Timestamped record of every checker run made while repairing the R3
induction hypothesis (the Gen-bound audit finding). Verdicts here are
never asserted: each line names the verbatim log under `_runlogs/`.

Times are UTC. Wall clock is the harness-measured elapsed time, which
includes JVM startup and is therefore >= Apalache's own "Total time".

## Toolchain (this repair)

| Item | Value |
|---|---|
| Apalache | 0.61.0, build 831d473 |
| Release artifact | `apalache-0.61.0.tgz` from `github.com/apalache-mc/apalache/releases/download/v0.61.0/` |
| Artifact sha256 | `68fb56dd9d053cf21d692fd7ec3fbaaeba1395661ec7434fa2b4c47e6fc432b8` |
| Jar sha256 | `33611081942d392646af60993c599907f1f41752fce4a62304dbf9e2cdad4346` (`lib/apalache.jar`) |
| JVM | Temurin/OpenJDK 21.0.2+13-58, provisioned by `mise x java@21` |
| Host | darwin arm64, 8 cores, 16 GiB |

The jar sha256 matches the value recorded in `README.md` for the
2026-08-13 R3 run exactly, so the tool pin is confirmed, not asserted.

## 2026-08-13T09:51Z — tool acquisition

- Downloaded the official 0.61.0 release tarball; recorded both the
  artifact sha256 and the extracted jar sha256 (table above).
- `mise x java@21 -- java -version` provisioned Temurin 21.0.2 — the
  same JVM build the committed run record names.

## 2026-08-13T09:52Z — baseline attempt at HEAD: BLOCKED (FINDING-R3-001)

Command (obligation 1, base case, exactly as `README.md` prints it):

```
mise x java@21 -- java -jar $APALACHE_JAR check --config=CatalogInd.cfg \
  --init=Init --inv=IndInv --length=0 CatalogInd.tla
```

Verdict: **EXITCODE: ERROR (120)** — Snowcat type-check failure, before
any proof obligation was attempted. Log:
`_runlogs/base-01-baseline.log`.

```text
[Catalog.tla:142:18-142:21]: Cannot apply s to the argument 1 in s[1].
[Catalog.tla:142:1-142:21]: Error when computing the type of CatalogOf
```

Cause (git archaeology, not inference): commit `0701b8b` (the R4 claim)
added the untyped wire-bridge accessors `ModelState`, `CatalogOf`,
`MirrorOf`, `DataOf`, `CreatorsOf`, `Become` to `Catalog.tla` and
rewrote `CreateBegin`/`CreateFinish` through them. `CatalogInd.tla` and
`CatalogInd.cfg` are byte-identical to the R3 claim commit `be3ebf8`
(`git diff be3ebf8 HEAD -- verify/catalog/` touches only `Catalog.tla`
among the R3 inputs). None of the six R3 obligations can run at HEAD.

## 2026-08-13T09:53Z — baseline against the spec R3 was claimed on

To establish that the committed verdicts were real, the six obligations
were re-run against `Catalog.tla` as of `be3ebf8` (extracted read-only
into a scratch directory; `CatalogInd.tla`/`.cfg` are HEAD's, which are
identical to `be3ebf8`'s).

| # | Obligation | Verdict | Wall | Log |
|---|---|---|---:|---|
| 1 | base: `Init => IndInv` | NoError | 3s | `_runlogs/baseline-preR4-ob1-base.log` |
| 2 | consecution | see log | | `_runlogs/baseline-preR4-ob2-consecution.log` |
| 3 | state safety | see log | | `_runlogs/baseline-preR4-ob3-statesafety.log` |
| 4 | action safety | see log | | `_runlogs/baseline-preR4-ob4-actionsafety.log` |
| 5 | CONTROL: no CAS freshness | see log | | `_runlogs/baseline-preR4-ob5-ctrl-nofresh.log` |
| 6 | CONTROL: blind ingress | see log | | `_runlogs/baseline-preR4-ob6-ctrl-blind.log` |

(Rows filled in as each run lands; the log is the record.)

## 2026-08-19T10:25Z — the repaired-bounds re-proof, Windows arm: GATE PASS

The re-proof the 2026-08-13 entries left in flight. One uninterrupted
`bash verify/catalog/run-ind.sh`, exit code 0, verbatim logs in
`_runlogs/gate-20260819T102518Z/`.

Machine W: Windows 11 Home 26200, x64. Java: Temurin/OpenJDK 21.0.2+13-58
via `mise x java@21` (there is no `java` on PATH on this host — `mise`
provisions it, which is the resolution order `run-ind.sh` documents).

Toolchain, recorded rather than asserted. The release tarball fetched
today hashed to
`68fb56dd9d053cf21d692fd7ec3fbaaeba1395661ec7434fa2b4c47e6fc432b8` and
the extracted jar to
`33611081942d392646af60993c599907f1f41752fce4a62304dbf9e2cdad4346` —
both identical to the values the 2026-08-13 repair recorded, so this is
the same Apalache 0.61.0 build 831d473 and the timings below are
comparable to that entry's.

| # | Run | Verdict | Wall | Log |
|---|---|---|---:|---|
| 0 | CANARY: blind ingress from concrete `Init` | Error, required | 7s | `ob0-canary-refutable.log` |
| 1 | base | NoError | 6s | `ob1-base.log` |
| 2 | consecution | NoError | 5,776s | `ob2-consecution.log` |
| 4 | action safety | NoError | 684s | `ob4-actionsafety.log` |
| 3 | TRIPWIRE: state safety | NoError | 423s | `ob3-tripwire.log` |
| 5 | CONTROL: no CAS freshness, on `Convergence` | Error, required | 131s | `ob5-ctrl-nofresh.log` |
| 6 | CONTROL: blind ingress, on `AdmissionStep` | Error, required | 74s | `ob6-ctrl-blind.log` |
| 6b | CONTROL: independence, `MonotonicityStep` undisturbed | NoError | 653s | `ob6b-ctrl-blind-independence.log` |
| 7 | CONTROL: insensitivity, consecution at data `Gen(3)` | NoError | 4,503s | `ob7-datadeep.log` |

Apalache's own `Total time` for the two long runs was 5773.495 sec
(obligation 2) and 4502.11 sec (control 7); the wall-clock column is
the harness measurement and includes JVM startup. Obligation 2 ran
roughly 3.6x the 2026-08-13 macOS time (26m35s), for two reasons worth
recording so the numbers are not read as a regression: this is a
different host, and for its first 22 minutes it shared the machine with
the R2 TLC closure described below. The verdicts, not the timings, are
the gate.

Verdicts against the 2026-08-13 macOS entry: every one agrees. What
moved is the hypothesis, not the answer — obligation 2 at catalog
`Gen(3)` returns the same `NoError` it returned at `Gen(2)`, which is
the whole content of the C4 repair.

The R2 gate was run first on the clean tree, as the preflight that makes
this arm meaningful: `bash verify/catalog/run.sh` returned `R2 GATE:
PASS`, with the cap2 cross-version canary exact (119,145 generated /
18,295 distinct / depth 16) and the gate closure at 103,407,991
generated / 12,707,989 distinct — the same closure the R2 record names,
on TLC `2026.08.11.125311` (the rolling `v1.8.0` asset, sha256
`ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f`).

Residual, stated because the ledger advertised it: this is the Windows
arm alone. The macOS arm at the argued bounds has not been re-run at
this HEAD.

---

# Catalog gate hardening worklog

Every entry: what ran, the exact command, the verdict, the log path, and
wall-clock. A verdict without a committed log under `_runlogs/` is not a
verdict. Times are CDT (UTC-5); the machine is named in each entry.

Machine H (this hardening pass): Apple MacBook Air, macOS 26.2 (build
25C56), Darwin 25.2.0 arm64, 8 cores, 16 GB. Java: Temurin/OpenJDK
21.0.2 via `mise x java@21` (the `java` on PATH is Homebrew OpenJDK
11.0.28 and is NOT what the gate uses). `tla2tools.jar` fetched
2026-08-13 from the rolling `v1.8.0` release asset, sha256
`ab323b79802aedc3203b3f9af37c6aca3ed43f4e0225b36f2aa77b26de46c05f` —
identical to the asset README recorded on 2026-08-12 (TLC
`2026.08.11.125311`), so this pass is a same-jar reproduction of the
cross-version canary, not a third jar.

## 2026-08-13 04:45 CDT — finding (d) confirmed and fixed

`run.sh:63` called `sha256sum`, which is not present on stock macOS
(`shasum -a 256` is). Replaced with a `sha256_of` helper that tries
`sha256sum`, then `shasum -a 256`, and fails the gate loudly if neither
exists — a run record that cannot state the sha of its jar is not a run
record. (On THIS machine `sha256sum` happens to exist via Homebrew
coreutils, so the bug would not have bitten here; it bites any Mac
without coreutils.)

## 2026-08-13 04:50 CDT — baseline gate, before any spec edit

Baseline first: a hardening pass that changes the spec before
reproducing the recorded canaries cannot tell its own drift from
pre-existing drift.

| Run | Command | Log | Verdict |
|---|---|---|---|
| R2 gate | `bash verify/catalog/run.sh` | `_runlogs/01-baseline-run.sh.log` | in flight |
| Wire bridge | `bash verify/catalog/run-wire.sh` | `_runlogs/02-baseline-run-wire.sh.log` | in flight |
