# Transcript — exit-code masking

Executed 2026-08-16 on Windows 11. Bash half under Git Bash (GNU bash);
PowerShell half under pwsh 7.6.5.

## `bash masking.sh`

```text
== (1) bash, no pipefail: the gate's failure is lost
  observed exit=0

== (2) bash, set -o pipefail: the failure survives
  outer saw exit=1

== (3) command substitution swallows -e as well
  caught
  continued
```

## `pwsh masking.ps1`

```text
== (1) native exit code survives Tee-Object
  LASTEXITCODE=3

== (2) $? after a failing native command
  dollar-question=False  LASTEXITCODE=3

== (3) $ErrorActionPreference='Stop' does NOT stop on a native nonzero exit
  still running; LASTEXITCODE=3
pwsh version: 7.6.5
```

## What the transcript establishes

* **bash:** `gate | tee log` reports the *tee's* status. Without
  `set -o pipefail` a red gate is green in CI. This is not folklore: the
  same hazard is called out in a comment in AWS's own SAW proof driver,
  `aws/s2n-tls` `tests/saw/Makefile` — "The pipefail command causes the
  entire command to fail if saw fails, even though we pipe it to tee /
  without it we would see only the tee return code".
  `.github/workflows/gates.yml` and `negative-controls.yml` in this
  estate already set `shell: bash -Eeuo pipefail {0}`, so their many
  `... 2>&1 | tee ci-logs/...` steps are safe. Any future gate step that
  forgets that `defaults.run.shell` line is not.

* **PowerShell:** `Tee-Object` does *not* clobber `$LASTEXITCODE` (measured
  above: it stays 3). The hazard is different — there is no `set -e` for
  native commands, and `$ErrorActionPreference = 'Stop'` does not change
  that. Execution continues past a failed native command, so the last
  statement's status is what the step reports. The explicit
  `if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }` in the `windows-r4`
  job of `.github/workflows/negative-controls.yml` is what converts a red
  gate into a red step there.
