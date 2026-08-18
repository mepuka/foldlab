// The brand lint over this package, wired where the module's other checks
// run: `go test -count=1 ./...`.
//
// The package doc claims that foldlab/brandlint closes the untyped-constant
// and cross-brand-conversion leaks and is run over this package. This file is
// that claim, executed. Its cost is the source importer type-checking the
// standard library dependencies from source — under a second, and it buys a
// mechanical check where the alternative was a paragraph.
package kmconform_test

import (
	"strings"
	"testing"

	"foldlab/brandlint"
	"foldlab/kmconform"
)

func TestThisPackageIsBrandClean(t *testing.T) {
	findings, err := brandlint.Check(".", "foldlab/kmconform", brandlint.Config{})
	if err != nil {
		t.Fatalf("brandlint: %v", err)
	}
	if len(findings) == 0 {
		return
	}
	pass, loadErr := brandlint.Load(".", "foldlab/kmconform", brandlint.Config{})
	if loadErr != nil {
		t.Fatalf("brandlint: %v", loadErr)
	}
	t.Fatalf("brandlint found %d leaks in this package:\n%s",
		len(findings), strings.Join(brandlint.Format(pass.Fset, findings), "\n"))
}

func TestTheLintSeesEveryGeneratedBrand(t *testing.T) {
	// A clean run means nothing if the lint never recognised a brand. This
	// pins the brand set the lint actually derived from the generated
	// directives against the set the generator says it emitted.
	pass, err := brandlint.Load(".", "foldlab/kmconform", brandlint.Config{})
	if err != nil {
		t.Fatalf("brandlint: %v", err)
	}
	for _, name := range kmconform.BrandTypeNames {
		key := "foldlab/kmconform." + name
		if !pass.Brands[key] {
			t.Fatalf("the lint did not see %s as a brand; the //foldlab:brand directive is missing "+
				"or the generator stopped emitting it", key)
		}
	}
	if len(pass.Brands) != len(kmconform.BrandTypeNames) {
		t.Fatalf("the lint sees %d brands, the generated table publishes %d",
			len(pass.Brands), len(kmconform.BrandTypeNames))
	}
}
