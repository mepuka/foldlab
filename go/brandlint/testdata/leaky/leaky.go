// The NEGATIVE arm of the brand lint: every line the lint must catch, one
// finding per numbered comment. The test pins the exact set, so a check that
// stops firing fails here rather than going quiet in production.
//
// Every construct below COMPILES. That is the point: these are the two holes
// Go's defined types leave, and neither of them is an error to the compiler.
package leaky

//foldlab:brand program
type ProgramDigest uint64

//foldlab:brand policy
type PolicyDigest uint64

type Sequence uint64

const three = 3

// want brandconversion
func CrossBrand(policy PolicyDigest) ProgramDigest { return ProgramDigest(policy) }

// want brandconversion
func CrossBrandBack(program ProgramDigest) PolicyDigest { return PolicyDigest(program) }

// want brandconstant
func CompareLiteral(digest ProgramDigest) bool { return digest == 3 }

// want brandconstant
func CompareLiteralReversed(digest PolicyDigest) bool { return 7 != digest }

// want brandconstant
func CompareNamedUntypedConstant(digest ProgramDigest) bool { return digest > three }

// want brandconstant
func Arithmetic(digest ProgramDigest) ProgramDigest { return digest + 1 }

// Two findings on one line are two findings: a conversion inside a comparison
// against a literal.
//
// want brandconversion
// want brandconstant
func Both(policy PolicyDigest) bool { return ProgramDigest(policy) == 5 }

// Silent on purpose: an unbranded type crossing into a brand is minting, and
// the constructor discipline is a convention this lint does not police.
func FromUnbranded(sequence Sequence) ProgramDigest { return ProgramDigest(uint64(sequence)) }
