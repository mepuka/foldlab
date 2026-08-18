// The POSITIVE arm of the brand lint. Everything here is disciplined use of
// branded digests, and the lint must report nothing over it.
//
// A checker that rejects everything proves as little as one that rejects
// nothing, so this arm is as load-bearing as the leaky one next to it.
package clean

//foldlab:brand program
type ProgramDigest uint64

//foldlab:brand policy
type PolicyDigest uint64

// Unbranded, on purpose: conversions to and from it are ordinary Go and must
// stay silent.
type Sequence uint64

// The constructor discipline. Minting from a resolved identifier through a
// named function is the sanctioned path, and converting a plain uint64 is not
// a brand crossing.
func NewProgramDigest(id uint64) ProgramDigest { return ProgramDigest(id) }

func NewPolicyDigest(id uint64) PolicyDigest { return PolicyDigest(id) }

// SameProgram compares within one brand, which is what the model permits.
func SameProgram(left, right ProgramDigest) bool { return left == right }

// IsUnset compares against the designated zero, the one constant that means
// the same thing in every sort.
func IsUnset(digest ProgramDigest) bool { return digest == 0 }

// Widen leaves the brand for its underlying type, which loses information but
// invents none.
func Widen(digest ProgramDigest) uint64 { return uint64(digest) }

// Narrow crosses no brand: Sequence carries no directive.
func Narrow(sequence Sequence) uint64 { return uint64(sequence) }

// CompareTyped compares against a value that was NAMED in its own sort rather
// than adopted from an untyped constant.
func CompareTyped(digest ProgramDigest) bool { return digest == NewProgramDigest(3) }

// Reinterpret is the marked escape: a deliberate crossing at a boundary, with
// its reason in the source where a reader and a grep both find it.
//
//foldlab:brandcast the wire carries one digest column for both sorts
func Reinterpret(policy PolicyDigest) ProgramDigest { return ProgramDigest(policy) }
