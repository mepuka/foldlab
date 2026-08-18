// Command brandlint runs the brand lint over one or more package directories
// and exits nonzero on any finding.
//
// With no arguments it lints the module's own brand-declaring packages, which
// is what the module's test suite already does; naming directories lints
// CONSUMERS of foldlab/kmconform, which is where the leaks actually bite,
// because a consumer is where a cross-brand conversion gets written.
//
//	go run ./cmd/brandlint                 # the module's own packages
//	go run ./cmd/brandlint ./somepackage   # a consumer, against kmconform's brands
//
// Consumers are linted against the brand set the generated tables publish
// (kmconform.BrandTypeNames), so the set is derived from the corpus rather
// than restated at the call site.
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"foldlab/brandlint"
	"foldlab/kmconform"
)

// selfLinted are the module's packages that declare brands of their own. They
// need no external brand set: the //foldlab:brand directives are in their
// syntax.
var selfLinted = []struct{ dir, importPath string }{
	{"kmconform", "foldlab/kmconform"},
}

func main() {
	includeTests := flag.Bool("tests", false, "lint _test.go files too")
	flag.Parse()

	targets := flag.Args()
	failed := false
	if len(targets) == 0 {
		for _, target := range selfLinted {
			if !lint(target.dir, target.importPath, nil, *includeTests) {
				failed = true
			}
		}
	}
	for _, dir := range targets {
		if !lint(dir, importPathFor(dir), consumerBrands(), *includeTests) {
			failed = true
		}
	}
	if failed {
		os.Exit(1)
	}
}

func lint(dir, importPath string, brands []string, includeTests bool) bool {
	findings, err := brandlint.Check(dir, importPath, brandlint.Config{
		Brands:       brands,
		IncludeTests: includeTests,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "REFUSED: %v\n", err)
		return false
	}
	if len(findings) == 0 {
		fmt.Printf("brandlint: %s clean (%d checks)\n", importPath, len(brandlint.Analyzers))
		return true
	}
	pass, loadErr := brandlint.Load(dir, importPath, brandlint.Config{
		Brands:       brands,
		IncludeTests: includeTests,
	})
	if loadErr != nil {
		fmt.Fprintf(os.Stderr, "REFUSED: %v\n", loadErr)
		return false
	}
	for _, line := range brandlint.Format(pass.Fset, findings) {
		fmt.Fprintln(os.Stderr, line)
	}
	return false
}

// consumerBrands is the brand set the generated tables publish, keyed the way
// the lint wants it.
func consumerBrands() []string {
	keys := make([]string, 0, len(kmconform.BrandTypeNames))
	for _, name := range kmconform.BrandTypeNames {
		keys = append(keys, "foldlab/kmconform."+name)
	}
	return keys
}

// importPathFor guesses the import path of a directory inside this module.
// A guess is acceptable here because the path only names brands DECLARED in
// that directory; the consumer brand set is supplied explicitly.
func importPathFor(dir string) string {
	cleaned := filepath.ToSlash(filepath.Clean(dir))
	cleaned = strings.TrimPrefix(cleaned, "./")
	if cleaned == "." || cleaned == "" {
		return "foldlab"
	}
	return "foldlab/" + cleaned
}
