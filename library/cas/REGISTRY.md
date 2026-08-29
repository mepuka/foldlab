# Kind-tag registry — scheme 0

The wire kind tags of the grammar's sorts (`Cas/Grammar/Sorts.lean`,
`Ty.wireTag`/`Ty.ofTag`). Ratified by the grammar grill (2026-08-28,
rulings 2 and 3; recorded in
`library/effects/IMPLEMENTATION-PLAN.md` §14). Tags 8, 9, and 10 are
also the blob kinds of PROFILE-CAS-HTTP-0. A tag names one node form;
references type-check at tag granularity, so a row here is a contract
on every wire.

| Tag (dec) | Tag (hex) | Sort       | Status   | Notes |
| --------- | --------- | ---------- | -------- | ----- |
| 1         | 0x01      | `value`    | RATIFIED core | Opaque value payload |
| 8         | 0x08      | `chunk`    | RATIFIED core | Position-free chunk data (profile blob kind) |
| 9         | 0x09      | `tree`     | RATIFIED core | Blob leaf/interior node (profile blob kind) |
| 10        | 0x0A      | `manifest` | RATIFIED core | Recipe-1 blob manifest (profile blob kind) |
| 11        | 0x0B      | `file`     | RATIFIED core | Named file over a blob manifest |
| 12        | 0x0C      | `entry`    | RATIFIED core | Journal entry / genesis |
| 13        | 0x0D      | `context`  | RATIFIED core | Context node: typed edges, no payload |
| 14        | 0x0E      | `step`     | RESERVED | F3 defunctionalized code point (in flight, separate actor) |
| 15        | 0x0F      | `cont`     | RESERVED | F3 continuation (in flight, separate actor) |
| 83        | 0x53      | `schema`   | RATIFIED (opaque-payload revision 1) | Payload = the canonical JSON envelope of Effect's persistent `SchemaRepresentation` document; refs remain empty. Revision 0's tagged projection is read-compatible. The cross-runtime byte pin is gated; the revision-1 byte theorem remains pending. Typed schema-to-schema edges ($defs as real CAS references) are the named follow-up |

Rows 1 and 11–13 were previously marked "illustrative"; ruling 2
ratifies all seven data sorts into core. Consumer extension (profiles,
the GrammarSpec registration pattern) is a named follow-up, not
retrofitted here; a new tag enters only through the grill with a real
consumer.
