# Gold 1967: scope of identification from an informant (issue #35 F6)

## Finding

The claim in `docs/design/2026-08-14-learning-by-refutation.md:545-547`
is wrong at **recursively enumerable**. In Gold's 1967 model, an informant
identifies the class of primitive recursive languages and therefore the listed
subclasses (context-sensitive, context-free, and regular), but it does **not**
identify the full class of recursive languages or the still larger class of
recursively enumerable languages.

## Primary-source evidence

- Gold's Table I, journal p. 452, orders the relevant classes as recursively
  enumerable, recursive, primitive recursive, context-sensitive, context-free,
  and regular. Its informant dividing line lies between recursive and primitive
  recursive; the accompanying paragraph says classes below a model's line are
  identifiable and classes above it are not. It also says this informant result
  covers all three informant variants and both naming relations. See the
  [original paper scan, p. 452](https://home.uni-leipzig.de/gkobele/courses/2023.WS/Colloq/files/Gold67.pdf#page=6).
- Theorem I.4, journal pp. 467-468, supplies the positive boundary: a methodical
  informant with the tester-naming relation identifies the class of primitive
  recursive languages. See [p. 467](https://home.uni-leipzig.de/gkobele/courses/2023.WS/Colloq/files/Gold67.pdf#page=21)
  and [p. 468](https://home.uni-leipzig.de/gkobele/courses/2023.WS/Colloq/files/Gold67.pdf#page=22).
- Theorem I.5, journal pp. 468-469, supplies the negative boundary: a methodical
  informant with the generator-naming relation does not identify the class of
  recursive languages. Table I and the preceding equivalence results propagate
  that boundary across the informant variants and naming relations. Because the
  recursively enumerable languages contain the recursive languages, the larger
  class cannot be informant-identifiable either. See [p. 468](https://home.uni-leipzig.de/gkobele/courses/2023.WS/Colloq/files/Gold67.pdf#page=22)
  and [p. 469](https://home.uni-leipzig.de/gkobele/courses/2023.WS/Colloq/files/Gold67.pdf#page=23).
- The recursively enumerable positive result is instead Gold's Theorem I.7 on
  journal p. 469: it uses the exceptional combination of primitive recursive
  **text** and generator naming, labelled `anomalous text` in Table I. It is not
  an informant result.

The stable bibliographic identifier is
[doi:10.1016/S0019-9958(67)91165-5](https://doi.org/10.1016/S0019-9958(67)91165-5),
which resolves to the
[Elsevier linking record](https://linkinghub.elsevier.com/retrieve/pii/S0019995867911655)
for E. Mark Gold, "Language Identification in the Limit," *Information and
Control* 10(5):447-474 (1967). The DOI resolution target and cited university-
hosted scan both returned HTTP 200 on 2026-08-13; the scan preserves the
original journal pagination.

## Recommended exact correction

Replace the sentence spanning lines 545-547 with:

> From an informant, identification succeeds for the regular, context-free,
> context-sensitive, and primitive recursive classes, but not for the recursive
> or recursively enumerable classes.
