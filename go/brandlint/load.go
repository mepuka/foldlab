package brandlint

// Loading a package for the lint, with the standard library only.
//
// go/importer's source importer type-checks a package's dependencies from
// source. It is slower than reading export data — roughly two thirds of a
// second for kmconform against Go 1.26 — and it needs no module tooling, no
// build cache, and no third-party loader. For a lint that runs over a handful
// of packages inside one module's test suite, that trade is the right one,
// and it is the only one the module's stdlib-only contract allows.

import (
	"fmt"
	"go/ast"
	"go/importer"
	"go/parser"
	"go/token"
	"go/types"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// Config carries what the caller knows and the source does not.
type Config struct {
	// Brands are extra brand keys in "<import path>.<type name>" form. A
	// package that CONSUMES brands declared elsewhere is linted by passing
	// them here; a package that declares its own needs nothing, because the
	// //foldlab:brand directives are read out of its syntax.
	Brands []string

	// IncludeTests parses _test.go files too. Off by default: a test may
	// legitimately construct a leak in order to prove the lint catches it.
	IncludeTests bool
}

// Load parses and type-checks one package directory and returns the Pass the
// analyzers run over. importPath is the path the package is known by, and it
// is what brand keys are built from, so it must match whatever a consumer
// passes in Config.Brands.
func Load(dir, importPath string, config Config) (*Pass, error) {
	fset := token.NewFileSet()
	names, err := goFilesIn(dir, config.IncludeTests)
	if err != nil {
		return nil, err
	}
	if len(names) == 0 {
		return nil, fmt.Errorf("%s carries no Go files to lint", dir)
	}
	files := make([]*ast.File, 0, len(names))
	for _, name := range names {
		parsed, err := parser.ParseFile(fset, name, nil, parser.ParseComments)
		if err != nil {
			return nil, err
		}
		files = append(files, parsed)
	}

	info := &types.Info{
		Types: map[ast.Expr]types.TypeAndValue{},
		Defs:  map[*ast.Ident]types.Object{},
		Uses:  map[*ast.Ident]types.Object{},
	}
	var typeErrors []string
	checker := types.Config{
		Importer: importer.ForCompiler(fset, "source", nil),
		Error:    func(err error) { typeErrors = append(typeErrors, err.Error()) },
	}
	pkg, err := checker.Check(importPath, fset, files, info)
	if len(typeErrors) > 0 {
		// A package that does not type-check cannot be linted honestly: every
		// expression whose type is unknown would be silently exempt.
		return nil, fmt.Errorf("%s does not type-check:\n\t%s", dir, strings.Join(typeErrors, "\n\t"))
	}
	if err != nil {
		return nil, err
	}

	brands := declaredBrands(files, importPath)
	for _, key := range config.Brands {
		brands[key] = true
	}
	return &Pass{Fset: fset, Files: files, Pkg: pkg, TypesInfo: info, Brands: brands}, nil
}

// Check loads a package and runs every analyzer over it.
func Check(dir, importPath string, config Config) ([]Diagnostic, error) {
	pass, err := Load(dir, importPath, config)
	if err != nil {
		return nil, err
	}
	var findings []Diagnostic
	for _, analyzer := range Analyzers {
		findings = append(findings, analyzer.Run(pass)...)
	}
	SortDiagnostics(pass.Fset, findings)
	return findings, nil
}

// Format renders findings the way a vet-style tool does: one
// file:line:col: check: message per line.
func Format(fset *token.FileSet, findings []Diagnostic) []string {
	lines := make([]string, 0, len(findings))
	for _, finding := range findings {
		at := fset.Position(finding.Pos)
		lines = append(lines, fmt.Sprintf("%s:%d:%d: %s: %s",
			filepath.ToSlash(at.Filename), at.Line, at.Column, finding.Check, finding.Message))
	}
	return lines
}

func goFilesIn(dir string, includeTests bool) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") {
			continue
		}
		if !includeTests && strings.HasSuffix(entry.Name(), "_test.go") {
			continue
		}
		names = append(names, filepath.Join(dir, entry.Name()))
	}
	sort.Strings(names)
	return names, nil
}
