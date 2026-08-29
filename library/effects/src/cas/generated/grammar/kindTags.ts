/**
 * GENERATED — do not edit. THE KIND-TAG REGISTRY, as data: every wire
 * tag `Cas.Grammar.manifestV0` gives a row, emitted from
 * `library/cas/Cas/Grammar/Manifest.lean` by `lake exe emitgrammar`;
 * regeneration is byte-identity-gated (`--check`, wired into
 * `check:cas`). `REGISTRY.md` is the same table's human rendering and
 * `manifest.json` its machine one.
 *
 * `src/internal/kindTags.ts` is the door's projection of this file.
 * `Cas.value` refuses every tag listed here, which is what stops a
 * caller-defined projection from aliasing a kind plane the library
 * already reads. A RESERVED row is a code point the registry holds
 * outside `Ty` (`Cas/Lang/Defun.lean` writes 14 and 15); it is
 * refused exactly like a ratified sort, because a tag with a second
 * public interpretation is the same hole either way.
 */

/** One registry row's tag surface: the sort's registry name, its
 * wire kind tag, and whether the row is RESERVED — a code point the
 * registry holds outside `Ty` — rather than a ratified sort. Both
 * kinds of row are refused identically at the door. */
export interface KindTagRow {
  readonly name: string
  readonly tag: number
  readonly reserved: boolean
}

/** Every registry row, in registry order — the table
 * `REGISTRY.md` renders for humans, as data. */
export const KindTagRows: ReadonlyArray<KindTagRow> = [
  {
    name: "value",
    tag: 1,
    reserved: false,
  },
  {
    name: "chunk",
    tag: 8,
    reserved: false,
  },
  {
    name: "tree",
    tag: 9,
    reserved: false,
  },
  {
    name: "manifest",
    tag: 10,
    reserved: false,
  },
  {
    name: "file",
    tag: 11,
    reserved: false,
  },
  {
    name: "entry",
    tag: 12,
    reserved: false,
  },
  {
    name: "context",
    tag: 13,
    reserved: false,
  },
  {
    name: "step",
    tag: 14,
    reserved: true,
  },
  {
    name: "cont",
    tag: 15,
    reserved: true,
  },
  {
    name: "git",
    tag: 71,
    reserved: false,
  },
  {
    name: "schema",
    tag: 83,
    reserved: false,
  },
]

/** The registry's wire tags by sort name: how a consumer names
 * one row without repeating its number. */
export const KindTagsByName = {
  value: 1,
  chunk: 8,
  tree: 9,
  manifest: 10,
  file: 11,
  entry: 12,
  context: 13,
  step: 14,
  cont: 15,
  git: 71,
  schema: 83,
}

/** THE door's refusal set: every tag the registry gives a row,
 * in registry order. `Cas.value` refuses each of these, so a
 * caller-defined projection can never give a registry row a second
 * public interpretation. */
export const GrammarKindTags: ReadonlyArray<number> = [1, 8, 9, 10, 11, 12, 13, 14, 15, 71, 83]
