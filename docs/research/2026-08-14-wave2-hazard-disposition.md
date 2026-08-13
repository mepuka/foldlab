# Wave-2 dispatch hazard disposition

Audit date: 2026-08-13 CDT. This maps GitHub issue #30’s four hazards to
current evidence. It is a merge-preparation record, not a claim that the
listed branch commits are already on `main`.

## H1 — session gate unreadable / law-name collision

Resolved in two parts:

- The session dossier defining U1–U4 and L1–L7 is now on main at
  `docs/design/2026-08-14-concierge-sessions-and-catalog.md`, so Task 37 no
  longer has to invent its gate.
- The estate map’s unrelated MCP rows are renamed `MCP-1` through `MCP-14`,
  and the three session-kernel references spell out “session law L2.”

Task 37 implementation is prepared separately on `codex/session-journal`;
issue #30 does not integrate that code.

## H2 — identity documentation contradicts ticket 004

Already resolved on current main. `CONTEXT.md`, `NEXT.md`, `proto/SPEC.md`,
`proto/wire/CONTRACT.md`, and `proto/go/protod/scheme.go` all state the same
two-stage rule: the current interim scheme hashes canonical submitted bytes;
the owned successor hashes `canonical(normalize(term))` over the
`flb.type.v0` walk. Vendor SchemaAST is derivation machinery, never identity.

The map now lists resolved ticket 004 among its decisions. The completed owned
encoding remains a prepared branch (`codex/owned-encoding`), not a main-branch
claim.

## H3 — refusal sort breaks strict decoders and frozen replies

Resolved on the owning Task 30 branch rather than here. The follow-up shape is
required `sort: "structural" | "absence"` on daemon refusal values. Go and
TypeScript require and round-trip it; the R4 decoder validates it. The
authorized fixture rewrite changes only `proto/wire/fixtures/concierge.json`;
the type, chain, and frame fixtures remain byte-identical. Merge Task 30’s
follow-up commit as a unit—production, strict decoder, both clients, manifest,
and fixture—not as isolated file picks.

## H4 — two live build orders in NEXT.md

Resolved here. The operator-ratified build order remains; the superseded
numbered backlog is removed from the live document and remains available in
Git history. `NEXT.md` now exposes one ordering.

## Merge notes

- This branch is documentation-only and independent of the Task 30 and Task 37
  implementation branches.
- Task 30 persists refusal sort and intentionally changes one authorized
  frozen fixture.
- Task 37 persists an asserted session-owner principal on every move and
  commit. Authentication remains a stated residual; the coordinate is not an
  `auth_basis` claim.
