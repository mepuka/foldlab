# packages/core — agent contract

Slimmed 2026-08-15 to the RFC 8785 seam (estate-focus purge; the full
algebra package lives at tag `archive/pre-estate-focus`). Read root
`AGENTS.md` first; scoped laws:

- `src/jcs.ts` is one half of the JCS differential wall: constrained
  decode and RFC 8785 encoding, walled against `go/canonical` under
  bidirectional fuzz, refereed by the independent Appendix B oracle in
  `fixtures/jcs-rfc8785.json`. Identity is of canonical uncompressed
  bytes (ADR-0002); never fingerprint a transport form.
- Decode acceptance is part of identity: one value, valid UTF-8 and
  scalars, names unique after unescaping, finite binary64,
  256-container depth. Widening or narrowing acceptance moves identity
  and is a ratification boundary.
- This package is authoring and proof, never runtime authority: no
  NATS, no IO. `src/jcs.ts` imports nothing at runtime.
- Runtime dependency: `effect` at the pinned catalog version, nothing
  else. devDependencies for testing are permitted (fast-check, exact
  pin). Confirm APIs against the pinned declarations and
  `repos/effect/`, never memory.
