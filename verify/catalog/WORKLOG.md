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
