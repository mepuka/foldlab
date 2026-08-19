# Designing a canonical serialization

A canonical form is a serialization where equal values have equal
bytes — which is what makes byte-diffs, content addressing, and
cross-language conformance possible at all. Getting one right is a
short list of decisions; getting one *almost* right is invisible until
two implementations disagree in production.

## The decisions, in order

1. **Pick a reference standard, then state your deviations.** For JSON,
   RFC 8785 (JCS) is the reference: lexicographic member ordering,
   minimal string escaping (`\"`, `\\`, `\b \f \n \r \t`, `\u00xx`
   for other control characters, nothing else), compact separators.
   Inherit everything you can from the standard verbatim — a consumer
   can then reuse standard tooling for those parts — and write down
   each deviation with its rationale next to it. An undocumented
   deviation is a future incompatibility with a search cost measured
   in days.

2. **The number trap (learn it before it bites).** JCS serializes
   numbers as IEEE-754 doubles. If your values include integers that
   can exceed 2^53 (hashes, content addresses, encodings of unbounded
   naturals), full JCS *silently corrupts them*. The proven fix:
   restrict numbers to unbounded non-negative integers in minimal
   decimal (no exponent, no fraction, no leading zeros, no sign), and
   require consumers to parse at arbitrary precision (Lean Nat, TS
   bigint, Go math/big) and to REFUSE any float-shaped token. Test
   with a vector just above 2^53 (9007199254740993 — a double rounds
   it to ...92) so a double-based implementation fails immediately.

3. **Key order: sorted beats fixed.** Fixed "readable" key order feels
   friendlier but means no standard canonicalizer can produce your
   format and every implementation needs a bespoke ordered writer.
   Sorted (canonical) order lets implementations lean on standard
   machinery and makes "canonicalize" a total function of the value.
   If you already shipped fixed-order files, migrating to sorted order
   is a format bump, not a patch.

4. **Pin the physical layer.** Character repertoire (ASCII-only is
   worth its cost when the content allows it — it removes Unicode
   normalization from the trust surface), line endings (LF, including
   after the final record), one record per line for line-diffable
   corpora, no whitespace between tokens.

5. **Determinism sources to eliminate.** Timestamps, commit hashes,
   map/dict iteration order, locale-dependent formatting, floats,
   filesystem enumeration order. If a value is genuinely wanted
   (a generation timestamp), it belongs OUTSIDE the canonical
   artifact, or the artifact stops being canonical.

## The both-ways law

Every implementation, in every language, owes both directions:

- `emit(parse(file)) == file`, byte-identical, over the whole artifact;
- `canonicalize(value) == pinned_bytes` for every canon test vector.

Embed the canon vectors IN the artifact itself (a record type whose
fields are `value` and `bytes`, where `bytes` is the canonical
serialization of `value` as a string). The artifact then self-tests
every consumer's canonicalizer at parse time, and a new consumer in a
new language has its conformance suite handed to it. Good vector
coverage: empty object/array/string, zero, the >2^53 integer, a
key-order case, nesting, every escape class, a raw control character.

## Version discipline

- One `format` field, a major-only integer. ANY grammar change bumps
  it — there are no compatible minor changes to a canonical form,
  because canonical means byte-exact.
- Consumers refuse unknown formats loudly. This rule is what makes
  bumping safe.
- Within a format, record TYPES are add-only (new types append after
  existing groups; existing shapes never change), with the counts
  corollary: if a header declares per-type counts, a new type adds a
  new counts key.
- Every place that pins bytes (gate line-count arms, expected-header
  strings, committed fixtures) must move in the SAME commit as a
  format change. List those places in the spec so the bump has a
  checklist rather than a hunt.
