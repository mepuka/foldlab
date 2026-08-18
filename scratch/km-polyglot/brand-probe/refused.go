// EXEMPLAR ONLY. The REFUSED arm of the Go brand probe: what the Go
// compiler rejects. This file MUST NOT compile; `go build` on it is
// expected to fail with the two diagnostics pinned in expected.txt.
package main

type ProgramDigest uint64
type PolicyDigest uint64
type Token[R any] struct{ value uint64 }
type ProgramBrand struct{}
type LaneBrand struct{}

func main() {
	p := ProgramDigest(3)
	q := PolicyDigest(4)
	_ = p == q // cross-kind digest comparison
	var t Token[ProgramBrand]
	var u Token[LaneBrand]
	t = u // cross-register token assignment
	_ = t
}
