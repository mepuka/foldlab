# P4 climb log

One line per attempt: `attempt N: <what changed> -> <result>`.
Never delete prior lines — the climb history is data.
attempt 1: baseline after committing green P3b -> Go effector build red; P4 TS modules missing
attempt 2: implemented lookup-then-prove KV binding, CAS claims, and create-only fence-first commits -> Go effector 15/15 with race detector
attempt 3: extended journald and TS transport, then launched an EF2-equivalent probe from workspace root -> probe blocked by root-level Effect resolution
attempt 4: reran the primitive fence probe from the kernel package -> held/steal/commit/fenced/lookup wire path green
attempt 5: factored guarded activity hooks and added lookup-claim-poll-commit-adopt protocol -> EF 3/3; P3 10/10; perf 4/4; live 9/9
attempt 6: ran whole-workspace and scoped Go gates (stability run 1/3) -> TS 61/61; Go green
attempt 7: hardened authority reads to strict canonical JSON and propagated raced outcome lookup failures -> Go effector 15/15 with race detector
attempt 8: reran final whole-workspace and scoped Go gates after audit hardening (stability run 1/3) -> TS 61/61; Go green
attempt 9: repeated final whole-workspace and scoped Go gates (stability run 2/3) -> TS 61/61; Go green
attempt 10: completed final whole-workspace and scoped Go gates (stability run 3/3) -> TS 61/61; Go green
attempt 11: ran the ratified A6 red baseline against the legacy two-key effector -> amended wire/fencing laws 0/2
attempt 12: migrated claims and terminal outcomes to one work.<digest> key with revision-CAS commit -> amended wire/fencing laws 2/2
attempt 13: widened the A6 migration to the complete effector race suite -> Go effector 15/15 green under -race
attempt 14: ran the ratified full TypeScript, scoped Go, and three-run effector race gates -> TS 61/61; Go format/vet/tests green; effector -race count=3 green
