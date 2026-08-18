/**
 * Plane: internal — private adapters serve any layer and reach back only to their own public seam.
 *
 * @module
 */
import { Option, Schema, SchemaIssue } from "effect"

import {
  AbsenceRefusal,
  StructuralRefusal,
  structuralRefusal,
  type Refusal,
} from "../truth/Refusal.js"

/**
 * The schema-issue bridge, quarantined exactly like the transport is.
 *
 * At the pin a schema getter may fail only with `SchemaIssue.Issue`
 * (`SchemaGetter.d.ts:59`), so the wire refusal envelope and the Effect error
 * type stay one definition by having the refusal *ride* the issue's
 * annotations. Everything in this file is that bridge, and none of it is a
 * public name: `SchemaIssue.Issue` is a deep recursive union of classes, and
 * the public-surface type-level walk diverges (`TS2589`) the moment one of
 * these signatures is reachable from the barrel. `Refusal.decodeRefusing` is
 * the one public door, and it speaks `Refusal` on both sides.
 */

/** The annotation slot a refusal rides in while it crosses a schema parse. */
const REFUSAL_ANNOTATION = "@foldlab/plait/refusal"

/** Carries a minted refusal through the only error type a schema getter accepts. */
export const refusalIssue = (refusal: Refusal): SchemaIssue.Issue =>
  new SchemaIssue.InvalidValue({
    message: refusal.message,
    [REFUSAL_ANNOTATION]: refusal,
  })

const annotatedRefusal = (
  annotations: Schema.Annotations.Issue | undefined,
): Option.Option<Refusal> => {
  const candidate = annotations?.[REFUSAL_ANNOTATION]
  return candidate instanceof StructuralRefusal || candidate instanceof AbsenceRefusal
    ? Option.some(candidate)
    : Option.none()
}

/** Recovers the first ridden refusal from an issue tree, if the parse minted one. */
export const refusalOfIssue = (issue: SchemaIssue.Issue): Option.Option<Refusal> => {
  switch (issue._tag) {
    case "InvalidValue":
    case "Forbidden":
      return annotatedRefusal(issue.annotations)
    case "Filter":
    case "Encoding":
    case "Pointer":
      return refusalOfIssue(issue.issue)
    case "Composite":
    case "AnyOf": {
      for (const inner of issue.issues) {
        const found = refusalOfIssue(inner)
        if (Option.isSome(found)) return found
      }
      return Option.none()
    }
    default:
      return Option.none()
  }
}

const schemaShapeLaw =
  "A decoded value satisfies its declared schema; a decoder that repairs its input names a different value."

/**
 * The single classification seam: every schema issue leaves the parse boundary
 * as a refusal. An issue that already carries one is surfaced unchanged;
 * anything else is classified here, and nowhere else, as structural evidence.
 */
export const refusalOf = (issue: SchemaIssue.Issue): Refusal =>
  Option.getOrElse(
    refusalOfIssue(issue),
    (): Refusal =>
      structuralRefusal({
        kind: "malformed-value",
        law: schemaShapeLaw,
        path: [],
        got: SchemaIssue.makeFormatterDefault()(issue),
        expected: "one value admitted by the declared schema",
        next: [{
          subject: "decode",
          note: "Submit a value the declared schema admits; the reported issue names the refused path.",
        }],
      }),
  )
