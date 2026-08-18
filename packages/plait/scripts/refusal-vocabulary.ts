/** The result of checking the runtime refusal union against generated truth. */
export type RefusalVocabularyCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

/**
 * Checks the one direction runtime safety needs: every structural refusal the
 * implementation can mint has a row in the generated kernel vocabulary.
 */
export const checkRefusalVocabulary = (
  runtimeKinds: ReadonlyArray<string>,
  generatedKinds: ReadonlyArray<string>,
): RefusalVocabularyCheck => {
  const generated = new Set(generatedKinds)
  for (const kind of runtimeKinds) {
    if (!generated.has(kind)) {
      return {
        ok: false,
        reason: `runtime structural refusal kind ${JSON.stringify(kind)} is absent from the generated kernel refusal vocabulary`,
      }
    }
  }
  return { ok: true }
}
