/**
 * GENERATED — do not edit. THE ANNOTATION PLANE, as data: the
 * working tag annotation nodes ride, the name seat's key, and the
 * subject union's arm-to-tag table, emitted from
 * `library/cas/Cas/Schema/Annotation.lean` by `lake exe schemas`;
 * regeneration is byte-identity-gated (`--check`, wired into
 * `check:cas`). The arm table is read off
 * `AnnotationSubject.schemaCode` — the deriving handler's output —
 * so it widens when the union does and never before.
 *
 * `bin/cli/naming.ts` is this file's consumer: `cas name` writes
 * annotation nodes at `AnnotationKindTag` under `AnnotationNameKey`,
 * and refuses subjects on planes this table does not carry.
 */

/** One nameable plane: the subject union's arm name, and the wire
 * kind tag a reference through that arm expects at its target. */
export interface AnnotationSubjectArm {
  readonly arm: string
  readonly tag: number
}

/** The working tag annotation nodes ride — the Lean pin's own
 * choice (`pinAnnotationKindTag`). Working means the kind registry
 * gives it no row: the annotation plane deliberately has no
 * reserved tag, and this is the caller's spelling, pinned. */
export const AnnotationKindTag = 65

/** The name seat's annotation key, exactly as the Lean worked
 * example pins it (`pinName`). */
export const AnnotationNameKey = "foldlab/name"

/** The nameable planes, in the subject union's own member
 * order: arm name and expected kind tag, read off the union's
 * canonical code. */
export const AnnotationSubjectArms: ReadonlyArray<AnnotationSubjectArm> = [
  {
    arm: "exchange",
    tag: 88,
  },
  {
    arm: "git",
    tag: 71,
  },
  {
    arm: "program",
    tag: 15,
  },
  {
    arm: "schema",
    tag: 83,
  },
  {
    arm: "system",
    tag: 84,
  },
]
