// EXEMPLAR ONLY. The ACCEPTED arm of the Go brand probe: what the Go
// compiler permits. Two of these are leaks the Lean elaborator does not
// have, because in Lean the forbidden comparison has no type at all.
package main

import "fmt"

type ProgramDigest uint64
type PolicyDigest uint64

// A phantom type parameter: R appears nowhere in the struct body.
// Contrary to a common assumption, Go permits this.
type Token[R any] struct{ value uint64 }

type ProgramBrand struct{}
type LaneBrand struct{}

func main() {
	p := ProgramDigest(3)
	q := PolicyDigest(4)
	var t Token[ProgramBrand]
	var u Token[LaneBrand]
	_, _ = t, u

	// LEAK 1: an untyped constant adopts any brand.
	fmt.Println("untyped-const-compare:", p == 3)
	// LEAK 2: an explicit conversion crosses any brand, silently.
	fmt.Println("explicit-conversion:", ProgramDigest(q))
	fmt.Println("phantom-type-param: compiles")
}
