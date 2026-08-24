# Lab Core

This context owns Foldlab's lab-wide vocabulary: the terms every other context
consumes when talking about what the lab builds and how built things earn
standing.

## Language

**Artifact**:
A thing the lab built that has earned its grade: it carries a kind, a
canonical identity, and declared transformations.
_Avoid_: build artifact, work product, output

**Grade**:
The earned standing of a built thing — staged material, experimental artifact,
or formal verification artifact. Promotion between grades is a declared
transformation, never silent.
_Avoid_: maturity, quality level, confidence

**Staged material**:
A built thing whose grade and publish-readiness are undecided; not yet an
artifact.
_Avoid_: draft, WIP, scratch

**Experimental artifact**:
An artifact built to explore a question; its correctness claims are optional
and carry no gate stamp.
_Avoid_: prototype, spike

**Formal verification artifact**:
An artifact whose claims are stamped on the claim ladder; it enters and moves
only through gating.
_Avoid_: proven code, gold code

**Formally verified**:
Used as the literature's term of art: a machine-checked proof that the
artifact satisfies a named specification — and always stated with its scope:
the property proved, the semantic model it is proved against, and the trusted
base. Never used unscoped.
_Avoid_: verified (bare), proven correct, bug-free

**Artifact kind**:
The classifier an artifact carries in the artifact-kind ledger; the first
component of earning artifact grade.
_Avoid_: kind (bare, for this sense), type (for this sense), category

**Kind**:
Reserved for the literature's meaning: the classifier of type constructors
(e.g., a type constructor taking one type argument has kind Type → Type).
Never used for ledger classification.
_Avoid_: sort

**Human semantic projection**:
The derived plain-language rendering of an artifact — what it is, what it
claims, and what produced it. A transformation of the artifact, never a
document maintained beside it.
_Avoid_: documentation (for this sense), summary, writeup

**Evidence**:
An external thing the lab selected rather than built, identified by a
provenance pin; never an artifact.
_Avoid_: reference material, source dump
