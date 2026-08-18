// The brand lint's own control arm.
//
// A lint with no failing case proves nothing, and one that fires on
// everything proves nothing either, so both arms are here: testdata/clean
// must produce no finding, and testdata/leaky must produce exactly the set
// pinned below — no more, and no fewer.
package brandlint_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"foldlab/brandlint"
)

func TestTheCleanArmProducesNoFinding(t *testing.T) {
	dir := filepath.Join("testdata", "clean")
	findings, err := brandlint.Check(dir, "brandlint/testdata/clean", brandlint.Config{})
	if err != nil {
		t.Fatalf("load %s: %v", dir, err)
	}
	if len(findings) != 0 {
		pass, _ := brandlint.Load(dir, "brandlint/testdata/clean", brandlint.Config{})
		t.Fatalf("the clean arm produced %d findings:\n%s",
			len(findings), strings.Join(brandlint.Format(pass.Fset, findings), "\n"))
	}
}

func TestTheLeakyArmProducesExactlyThePinnedFindings(t *testing.T) {
	dir := filepath.Join("testdata", "leaky")
	pass, err := brandlint.Load(dir, "brandlint/testdata/leaky", brandlint.Config{})
	if err != nil {
		t.Fatalf("load %s: %v", dir, err)
	}
	var findings []brandlint.Diagnostic
	for _, analyzer := range brandlint.Analyzers {
		findings = append(findings, analyzer.Run(pass)...)
	}
	brandlint.SortDiagnostics(pass.Fset, findings)

	source, err := os.ReadFile(filepath.Join(dir, "leaky.go"))
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(string(source), "\n")

	// Pinned by the declaration the finding sits inside rather than by line
	// number, so adding a comment to the arm does not rewrite this table.
	want := []struct{ check, inside string }{
		{"brandconversion", "func CrossBrand("},
		{"brandconversion", "func CrossBrandBack("},
		{"brandconstant", "func CompareLiteral("},
		{"brandconstant", "func CompareLiteralReversed("},
		{"brandconstant", "func CompareNamedUntypedConstant("},
		{"brandconstant", "func Arithmetic("},
		{"brandconversion", "func Both("},
		{"brandconstant", "func Both("},
	}

	got := make([]string, 0, len(findings))
	for _, finding := range findings {
		at := pass.Fset.Position(finding.Pos)
		if at.Line < 1 || at.Line > len(lines) {
			t.Fatalf("finding at an impossible line %d", at.Line)
		}
		got = append(got, finding.Check+" @ "+strings.TrimSpace(lines[at.Line-1]))
	}
	if len(got) != len(want) {
		t.Fatalf("the leaky arm produced %d findings, want %d:\n%s",
			len(got), len(want), strings.Join(got, "\n"))
	}
	for index, expected := range want {
		if !strings.HasPrefix(got[index], expected.check+" @ ") {
			t.Fatalf("finding %d is %q, want the check %q", index, got[index], expected.check)
		}
		if !strings.Contains(got[index], expected.inside) {
			t.Fatalf("finding %d is %q, want it inside %q", index, got[index], expected.inside)
		}
	}
}

func TestTheEscapeDirectiveIsNotABlanketSilence(t *testing.T) {
	// The marked crossing in the clean arm is silent; the same crossing
	// without the directive is not. Without this pairing the escape hatch
	// could be a comment the lint never reads.
	dir := t.TempDir()
	const marked = `package hatch

//foldlab:brand program
type ProgramDigest uint64

//foldlab:brand policy
type PolicyDigest uint64

//foldlab:brandcast one digest column on the wire
func Marked(p PolicyDigest) ProgramDigest { return ProgramDigest(p) }
`
	if err := os.WriteFile(filepath.Join(dir, "hatch.go"), []byte(marked), 0o644); err != nil {
		t.Fatal(err)
	}
	findings, err := brandlint.Check(dir, "hatch", brandlint.Config{})
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(findings) != 0 {
		t.Fatalf("a marked crossing produced %d findings", len(findings))
	}

	unmarked := strings.Replace(marked, "//foldlab:brandcast one digest column on the wire\n", "", 1)
	if unmarked == marked {
		t.Fatal("the control mutation removed nothing")
	}
	if err := os.WriteFile(filepath.Join(dir, "hatch.go"), []byte(unmarked), 0o644); err != nil {
		t.Fatal(err)
	}
	findings, err = brandlint.Check(dir, "hatch", brandlint.Config{})
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(findings) != 1 {
		t.Fatalf("removing the directive produced %d findings, want 1", len(findings))
	}
}

func TestABrandWithoutItsDirectiveIsNotABrand(t *testing.T) {
	// Brands are declared, not guessed by naming convention. A type called
	// SomethingDigest with no directive is an ordinary defined type, and a
	// lint that guessed otherwise would fire on unrelated code.
	dir := t.TempDir()
	const undeclared = `package guess

type ProgramDigest uint64
type PolicyDigest uint64

func Cross(p PolicyDigest) ProgramDigest { return ProgramDigest(p) }
func Compare(d ProgramDigest) bool       { return d == 3 }
`
	if err := os.WriteFile(filepath.Join(dir, "guess.go"), []byte(undeclared), 0o644); err != nil {
		t.Fatal(err)
	}
	findings, err := brandlint.Check(dir, "guess", brandlint.Config{})
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(findings) != 0 {
		t.Fatalf("undirected types produced %d findings; brands are declared, not guessed", len(findings))
	}

	// The same package, with the brand set supplied by the caller instead of
	// by a directive: this is how a CONSUMER of foldlab/kmconform is linted.
	findings, err = brandlint.Check(dir, "guess", brandlint.Config{
		Brands: []string{"guess.ProgramDigest", "guess.PolicyDigest"},
	})
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(findings) != 2 {
		t.Fatalf("a caller-supplied brand set produced %d findings, want 2", len(findings))
	}
}

func TestAPackageThatDoesNotTypeCheckIsRefused(t *testing.T) {
	// Every expression whose type is unknown would be silently exempt, so a
	// broken package is refused rather than linted optimistically.
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "broken.go"),
		[]byte("package broken\n\nfunc F() int { return \"not an int\" }\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := brandlint.Check(dir, "broken", brandlint.Config{}); err == nil {
		t.Fatal("a package that does not type-check was linted")
	}
}

func TestTheGapsAreNamed(t *testing.T) {
	// A green run must not read as full coverage. Two of the four checks the
	// schema asks for are not implemented, and saying so mechanically means
	// the omission survives a reader who never opens the package doc.
	if len(brandlint.Gaps) != 2 {
		t.Fatalf("brandlint names %d gaps, want the 2 the schema leaves open", len(brandlint.Gaps))
	}
	for _, gap := range brandlint.Gaps {
		if gap == "" {
			t.Fatal("an unnamed gap")
		}
	}
}
