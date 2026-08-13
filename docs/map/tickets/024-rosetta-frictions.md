---
id: 024
title: Rosetta frictions — three DX gaps the demo surfaced
type: wayfinder:grilling
status: open
assignee:
blocked-by: []
---

## Question

Building the Rosetta demo (issue #14 Exhibit A) against the real
packages/core surface exposed three small, verified friction points.
Each is a behavior or type-surface decision, so each gets a grill
before any build — none is a bug.

1. **The number-carrier gap.** `steps.payloadNumber` carries
   `number | null` while `sum` is an `Algebra<number>` — the obvious
   "sum of amounts" fold cannot be assembled from the declared
   registry (it composes with `max`/`min`, whose carriers absorb
   null, but not `sum`). Options: a declared `payloadNumberOrZero`
   step (new machinery — needs a consumer per the standing precept);
   a declared null-absorbing sum; or document the gap as deliberate
   (meaning must decide what null means before it sums).
2. **`stateDigest` throws where the wall refuses.** `applyKV` returns
   a typed `MalformedPayload`; `stateDigest` throws `RangeError` on
   the same class of inputs. Inside the package this is the ratified
   three-way discipline (internal encoder violations throw); at the
   public seam the demo had to know which discipline it was touching.
   Grill: is `stateDigest` public surface (then it deserves the
   union) or internal (then its doc must say so)?
3. **`isAdmittedFold` is not a narrowing guard.** It returns bare
   `boolean` and `Fold.digest` is optional, forcing `fold.digest!` in
   consumer code. A type-predicate overload (or an `AdmittedFold`
   type carrying a required digest) is the clean
   universal-property-to-DX move: the admission check should narrow
   the type it admits.

## Pre-registered note

Item 3 is type-only and near-certainly safe; items 1 and 2 change
what the surface promises. If any resolution adds machinery without a
consumer, the machinery waits — the demo itself is not a consumer, it
is a probe.
