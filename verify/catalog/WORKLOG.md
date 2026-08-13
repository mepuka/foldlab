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
