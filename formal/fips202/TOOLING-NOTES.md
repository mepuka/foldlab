# Verification-gate tooling notes — edge cases for resolution

Gate runs on this artifact (2026-08-24/25, B1 and B2 batteries, PC + Mac) were driven by shell
pipelines. Each edge case below produced a wrong or misleading intermediate reading before being
caught by hand. Each is recorded as a requirement on the functional verification tooling this lab
intends to build: gates as checked programs that parse tool output into typed facts and emit a
single verdict, replacing grep pipelines.

## 1. Axiom-report format drift across invocation paths

`lake build` replay prints `info: <file>:<pos>: '<name>' depends on axioms: [...]`; a direct
`lean <file>` run prints the severity after the location instead. A raw line diff between two
hosts (or two invocation paths on one host) reports false mismatches.

**Requirement:** gates parse every axiom report into `(declaration, axiom-set)` pairs and compare
those; raw log lines are never comparison keys.

## 2. Cached-replay double counting

One log that contains both a direct elaboration and a `lake build` replay carries every info line
twice in the two formats above: the B2 gate log held 123 raw axiom lines for 68 true declarations.
A count-based check on raw lines passes or fails for the wrong reason.

**Requirement:** counts are computed on deduplicated parsed pairs only.

## 3. Success-is-silent checkers

`leanchecker` (bundled with the v4.33.1 toolchain) prints nothing on success. A grep-for-pass gate
cannot distinguish success from a tool that never ran.

**Requirement:** gates assert the exact expected output shape (empty, for leanchecker) AND the
exit code, and independently confirm the tool actually executed against the intended modules.

## 4. Exit codes and truncated console output lie (standing house lesson; recurred)

PowerShell pipelines and console truncation have repeatedly hidden real errors (first observed in
the B1 proof loop round 8; guarded against since by full-log capture).

**Requirement:** every tool invocation writes a complete log to a file; verdicts are computed from
the file, never from the console stream.

## 5. Rendering-layer loss in gate transcripts

PowerShell `Format-Table` silently dropped the `SideIndicator` column of a `Compare-Object` result
and truncated long lines during the B2 cross-host axiom diff, making a formatting artifact look
like a real cross-host difference until re-run with explicit string output.

**Requirement:** gate output is machine-shaped (explicit strings or structured data), never
console-formatted tables; anything a human reads is rendered from the structured form.

## 6. Remote gate-host state assumptions

`scp` to a not-yet-existing remote directory fails; a stale checkout on the gate host would build
the wrong bytes if reused. The B2 gate created the remote directory explicitly and extracted the
shipped tarball into a fresh directory.

**Requirement:** remote gates are idempotent — create their target paths, build only from the
bytes they shipped, and never reuse a pre-existing checkout.

## 7. A clean `git status` is not a clean state

During promotion, a second layout of this artifact appeared in the graded tree with one module
diverging from the gated bytes (a stale copy predating the reviewed header) and an edit to a
ratified frozen contract document. `git status` reported nothing for any of it — the files
matched a commit that had been minted outside the review loop, so "no changes" meant "already
committed", not "nothing happened". The divergence was caught only by hand-hashing the landed
tree against the gated one.

**Requirement:** promotion gates verify landed bytes against the gated digest set — the source
lock must carry per-file digests of the artifact itself, and frozen documents carry digests so
any edit is mechanically detected. Commit minting is a gated step, never a side effect of a
proof seat's run.

## Disposition

Open. To be resolved by the functional-verification-tooling lane when it opens; until then these
constraints bind hand-run gates.
