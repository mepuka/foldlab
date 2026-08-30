/**
 * The naming seat, spoken from the shell — the CLI's side of the
 * annotation plane.
 *
 * Names are annotations, never identity (backend backlog ruling,
 * decision 23): `cas name` stores one `Annotations.Annotation` node
 * saying `foldlab/name` about an addressed subject, and nothing about
 * the subject moves. Every spelling here is the Lean pin's own
 * (`library/cas/Cas/Schema/Annotation.lean`): the key is `foldlab/name`
 * (`pinName`), the node rides working tag 0x41 at revision 1
 * (`pinAnnotationKindTag`, the same choice `SchemaAnnotation.test.ts`
 * makes), and the wire is the `Annotation` mirror through the ordinary
 * doors — `Cas.value` to put, admission to refuse, `RootStore` to
 * publish.
 *
 * ## Why a name is PUBLISHED
 *
 * The store has no reverse index: nothing can ask "which nodes point at
 * this address" without walking something. Roots are the one walkable
 * surface the estate already has — "the addresses published as entry
 * points" — and a name exists precisely to be an entry point for a
 * person. So `cas name` publishes the annotation node as a root, which
 * is what lets `cas show <subject>` find it again over EITHER backend,
 * and lets `cas verify` audit the naming plane with everything else.
 * Content addressing makes this idempotent: the same name said twice is
 * the same node, and one root.
 *
 * ## What can be named
 *
 * Only what the ratified subject union spans. `AnnotationSubject` is a
 * `oneOf` union over five addressable planes — exchange, git, program,
 * schema, system — because a reference must declare the kind tag it
 * expects. A plane outside the union is not nameable, and this module
 * says so rather than inventing an arm the Lean twin does not have.
 */
import { Array as Arr, cast, Effect, Option } from "effect"
import { Cas } from "../../src/index.ts"
import {
  AnnotationKindTag,
  AnnotationNameKey,
  AnnotationSubjectArms,
} from "../../src/cas/generated/annotationPlane.ts"

/** The kind tag annotation nodes ride and the name seat's key — the
 * EMITTED spellings (`annotationPlane.ts`, from
 * `Cas/Schema/Annotation.lean`'s own pins, byte-gated), re-exported so
 * every CLI module names them through this seat. */
export { AnnotationKindTag }
export const NameKey = AnnotationNameKey

/** The annotation projection: revision 1 at the working tag, the same
 * projection the byte pins are checked against. */
export const AnnotationNode = Cas.value({
  kindTag: AnnotationKindTag,
  revision: 1,
  schema: Cas.Annotations.Annotation,
})

/**
 * The nameable planes, exactly as the emitted arm table spells them —
 * the subject union's own member order, arm name and expected kind
 * tag. This is the table the refusal prints, so the message and the
 * union cannot drift apart: a widened union widens the emitted table
 * on regeneration, and the byte gate refuses until it has.
 */
export const nameablePlanes: ReadonlyArray<readonly [string, number]> =
  AnnotationSubjectArms.map((row) => [row.arm, row.tag])

/** The five arm constructors by arm name — the hand half of the seam,
 * because a constructor is code and the emitted table is data. The
 * suite walks the emitted table through `subjectFor` and fails when an
 * emitted arm has no constructor here, so a widened union cannot ship
 * a refusal that lies about the plane being unspellable. */
const constructors: ReadonlyMap<string, (id: Cas.ContentId) => Cas.Annotations.Subject> =
  new Map([
    ["exchange", Cas.Annotations.onExchange],
    ["git", Cas.Annotations.onGit],
    ["program", Cas.Annotations.onProgram],
    ["schema", Cas.Annotations.onSchema],
    ["system", Cas.Annotations.onSystem],
  ])

/** The subject arm a stored node's kind tag selects, or none when the
 * emitted table has no arm at that plane. */
export const subjectFor = (
  tag: number,
  id: Cas.ContentId,
): Option.Option<Cas.Annotations.Subject> =>
  Option.fromUndefinedOr(AnnotationSubjectArms.find((row) => row.tag === tag)).pipe(
    Option.flatMap((row) => Option.fromUndefinedOr(constructors.get(row.arm))),
    Option.map((make) => make(id)),
  )

/** One annotation found about a subject: the annotation node's own
 * address, and what it says. */
export interface FoundAnnotation {
  readonly annotation: Cas.ContentId
  readonly key: string
  readonly value: Cas.Annotations.Value
}

/** Names first, then other keys, then by annotation address — a stable
 * order for rendering, compared by codepoint so no locale decides it. */
const byNameFirst = (left: FoundAnnotation, right: FoundAnnotation): number => {
  const leftRank = left.key === NameKey ? 0 : 1
  const rightRank = right.key === NameKey ? 0 : 1
  if (leftRank !== rightRank) return leftRank - rightRank
  if (left.key !== right.key) return left.key < right.key ? -1 : 1
  return left.annotation < right.annotation ? -1 : left.annotation > right.annotation ? 1 : 0
}

/**
 * Every published annotation about one address: the roots listing
 * walked, each root read through the annotation projection, and the
 * ones whose subject is this address kept.
 *
 * Best-effort by design: a root of another kind, another revision, or
 * another shape simply is not an annotation about this subject, and
 * the walk moves on — `cas verify` is the verb that judges roots, not
 * this read. The cost is one load per published root, which is the
 * honest price of having no reverse index; the day an index kind
 * lands, this walk is what it replaces.
 */
export const annotationsAbout = (
  subject: Cas.ContentId,
): Effect.Effect<
  ReadonlyArray<FoundAnnotation>,
  never,
  Cas.RootStore | Cas.Loader
> =>
  Cas.RootStore.pipe(
    Effect.flatMap((roots) => roots.list),
    Effect.flatMap((published) =>
      Effect.forEach(published, (id) =>
        AnnotationNode.get(cast(id)).pipe(
          Effect.map((annotation) =>
            annotation.subject.address === subject
              ? Option.some({
                  annotation: id,
                  key: annotation.key,
                  value: annotation.value,
                } satisfies FoundAnnotation)
              : Option.none<FoundAnnotation>()
          ),
          Effect.orElseSucceed(() => Option.none<FoundAnnotation>()),
        ))
    ),
    Effect.map((found) => Arr.getSomes(found).toSorted(byNameFirst)),
    Effect.orElseSucceed((): ReadonlyArray<FoundAnnotation> => []),
  )
