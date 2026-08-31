# bench/ — the blinded evaluation bank

Law: [../BANK.md](../BANK.md) §Benchmark and blinding. Case stock:
[candidates.md](candidates.md) (preparer-only).

- `packets/<id>/` (local): scout-facing packet — frozen snapshot ref,
  target, draft contract or intent, budget. No answer material.
- `answers/` (local): per-case resolutions + the full mining report.
  Never read by a session that runs or evaluates a scout run.

Roles are separated exactly like breaker/implementer: PREPARER builds
packets from candidates + answers; SCOUT runs [../LOOP.md](../LOOP.md)
on a packet cold; the run ledger row ([../runs.md](../runs.md)) records
which role produced what. A scout that peeked marks its row
`contaminated`.
