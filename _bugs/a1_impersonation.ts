// A1 — crisp impersonation: the digest gate proves CONSENSUS, not LAW.
// `mapped()` decides a source algebra is the homomorphism's declared source by
// comparing declaration digests. The Declaration brand is Symbol.for(...), so
// the token is globally reconstructable; and the gate never re-derives the
// source's behavior. An impostor with a copied digest but a LYING combine is
// certified as a law-carrying derived view.
import { algebras, homomorphisms, mapped, type Algebra } from "../packages/core/src/algebra.ts"

const realMax = algebras.max
const brand = Symbol.for("@foldlab/core/Declaration")

// A hand-rolled algebra: NOT max (combine ignores the right operand), wearing
// the real max declaration (same digest, same encoding, same spec object).
const impostor: Algebra<number | null> = {
  empty: null,
  combine: (left, _right) => left,
  declaration: {
    [brand]: true,
    spec: realMax.declaration!.spec,
    encoding: realMax.declaration!.encoding,
    digest: realMax.declaration!.digest,
  } as any,
}

// The homomorphism law it CLAIMS to license: map(combine(a,b)) == combine(map a, map b).
const hom = homomorphisms.isPositiveFromMax
const a = -3, b = 5 // left<=0<right: impostor's left-only combine breaks the hom law
const lhs = hom.map(impostor.combine(a, b))                 // map(impostor.combine)
const rhs = hom.target.combine(hom.map(a), hom.map(b))      // any.combine(map a, map b)

const derived = mapped(hom, impostor)

console.log(`impostor.combine(${a},${b}) =`, impostor.combine(a, b), ` (real max would be ${Math.max(a, b)})`)
console.log("homomorphism law holds for impostor? ", lhs === rhs, ` (lhs=${lhs} rhs=${rhs})`)
console.log("mapped() CERTIFIED the impostor:")
console.log("  declaration present:", derived.declaration !== undefined)
console.log("  identityIssue      :", derived.identityIssue)
console.log(derived.declaration !== undefined && lhs !== rhs
  ? "CONFIRMED: a law-VIOLATING source was admitted as a declared homomorphism source (digest consensus != law)"
  : "not reproduced")
