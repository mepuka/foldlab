# P5 climb log

One line per attempt: `attempt N: <what changed> -> <result>`.
Never delete prior lines — the climb history is data.
attempt 1: baseline after committing green P3b -> durable.ts missing; determinism suite does not typecheck
attempt 2: added Observation replay registry, absolute-deadline sleep, journal gate, and CloudEvents projection -> typecheck green; DT 5/5
attempt 3: ran whole-workspace and scoped Go gates (stability run 1/3) -> TS 61/61; Go green
attempt 4: reran final whole-workspace and scoped Go gates after audit hardening (stability run 1/3) -> TS 61/61; Go green
attempt 5: repeated final whole-workspace and scoped Go gates (stability run 2/3) -> TS 61/61; Go green
attempt 6: completed final whole-workspace and scoped Go gates (stability run 3/3) -> TS 61/61; Go green
