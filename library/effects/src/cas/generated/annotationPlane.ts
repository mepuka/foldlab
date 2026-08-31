/**
 * GENERATED — do not edit. THE ANNOTATION PLANE, as data: the
 * working tag annotation nodes ride and the everyday word for it,
 * the revision they ride, the name seat's key, and the subject
 * union's arm-to-tag table, emitted from
 * `library/cas/Cas/Schema/Annotation.lean` by `lake exe schemas`;
 * regeneration is byte-identity-gated (`--check`, wired into
 * `check:cas`). The arm table is read off
 * `AnnotationSubject.schemaCode` — the deriving handler's output —
 * so it widens when the union does and never before.
 *
 * `bin/cli/naming.ts` is this file's consumer: `cas name` writes
 * annotation nodes at `AnnotationKindTag` under `AnnotationNameKey`,
 * and refuses subjects on planes this table does not carry.
 * `bin/cli/render.ts` is the second: every everyday kind word the
 * annotation plane owns is seeded from here, so no rendered surface
 * spells one by hand. `src/cas/Annotations.ts` is the third: it
 * builds the subject union's arms, and reads the system plane's
 * working tag from here rather than spelling it.
 *
 * emitted — schemaVersion 1, emitter `schemas`,
 * module `library/cas/tools/Schemas.lean`, toolchain Lean 4.33.1.
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

/** The everyday word for that kind — what `cas show` prints
 * where a registry row would give a name, since this plane has
 * none to give. Emitted rather than written in TypeScript: a
 * rendered kind name enters the human register off the generated
 * registry (decision 25). */
export const AnnotationKindWord = "annotation"

/** The revision annotation nodes ride, the Lean pin's own
 * (`pinAnnotationRevision`) — the projection's revision is part
 * of the wire, so its consumer reads it here. */
export const AnnotationRevision = 1

/** The name seat's annotation key, exactly as the Lean worked
 * example pins it (`pinName`). */
export const AnnotationNameKey = "foldlab/name"

/** The service-topology plane's WORKING tag
 * (`Cas.Schema.systemKindTag`), which the `system` arm below
 * demands at its target. It is emitted HERE because this is the
 * only generated surface in the effects package that names it:
 * the kind registry has no row for a working tag, and the system
 * lane generates layers rather than a node mirror. The day a
 * system mirror lands, this constant moves beside it. Named
 * rather than searched out of the arm table, so its consumer
 * reads a constant the way it reads `KindTagsByName.cont`. */
export const SystemKindTag = 84

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
