# @foldlab/core entry map

Slimmed 2026-08-15 to the RFC 8785 seam. The stream, xform, schema,
entity, and fold-algebra modules live at tag `archive/pre-estate-focus`
(manifest: `docs/research/2026-08-15-estate-focus-retirement.md`).

| Module | Owns | Refusal channel |
| --- | --- | --- |
| `jcs` | Constrained JSON decode and RFC 8785 encoding | `{ ok: false, refusal }` union |

The module is one half of the JCS differential wall: every generated
candidate and every fast-check shrink runs BOTH real implementations
(`go/canonical` through the persistent probe), refereed by RFC 8785
Appendix B's 26 rows in `fixtures/jcs-rfc8785.json`.
