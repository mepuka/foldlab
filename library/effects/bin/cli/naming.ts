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
import { cast, Effect, Option } from "effect"
import { Cas } from "../../src/index.ts"
import { KindTagsByName } from "../../src/cas/generated/grammar/kindTags.ts"

/** The kind tag annotation nodes ride: the Lean pin's own working tag
 * (`pinAnnotationKindTag`, 0x41). Working means the registry gives it
 * no row yet — the annotation plane deliberately has no reserved tag,
 * so the tag is the caller's, and this CLI is the caller. */
export const AnnotationKindTag = 0x41

/** The name seat's annotation key, exactly as the Lean worked example
 * pins it (`pinName`). Other keys are legal annotation content; this is
 * the one `cas name` writes and `cas show` puts first. */
export const NameKey = "foldlab/name"

/** The annotation projection: revision 1 at the working tag, the same
 * projection the byte pins are checked against. */
export const AnnotationNode = Cas.value({
  kindTag: AnnotationKindTag,
  revision: 1,
  schema: Cas.Annotations.Annotation,
})

/**
 * The five nameable planes, in the subject union's own member order
 * (ascending tag is the canonical spelling; this list is by arm name
 * as the union declares them). Each row is the arm's everyday name and
 * the kind tag its reference expects — the table the refusal prints,
 * so the message and the union cannot drift apart silently.
 */
export const nameablePlanes: ReadonlyArray<readonly [string, number]> = [
  ["exchange", Cas.Exchanges.KindTag],
  ["git", KindTagsByName.git],
  ["program", KindTagsByName.cont],
  ["schema", KindTagsByName.schema],
  ["system", Cas.Annotations.SystemKindTag],
]

/** The subject arm a stored node's kind tag selects, or none when the
 * union has no arm for that plane. The switch is over the same tags
 * `nameablePlanes` lists, so a widened union grows both together. */
export const subjectFor = (
  tag: number,
  id: Cas.ContentId,
): Option.Option<Cas.Annotations.Subject> => {
  switch (tag) {
    case Cas.Exchanges.KindTag:
      return Option.some(Cas.Annotations.onExchange(id))
    case KindTagsByName.git:
      return Option.some(Cas.Annotations.onGit(id))
    case KindTagsByName.cont:
      return Option.some(Cas.Annotations.onProgram(id))
    case KindTagsByName.schema:
      return Option.some(Cas.Annotations.onSchema(id))
    case Cas.Annotations.SystemKindTag:
      return Option.some(Cas.Annotations.onSystem(id))
    default:
      return Option.none()
  }
}

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
    Effect.map((found) =>
      found.filter(Option.isSome).map((some) => some.value).toSorted(byNameFirst)
    ),
    Effect.orElseSucceed((): ReadonlyArray<FoundAnnotation> => []),
  )
