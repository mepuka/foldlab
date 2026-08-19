// The program group — the ninth corpus group, read, validated, and re-emitted.
//
// OBLIGATION TABLE (freeze clause -> test):
//
//	record shape, sorted keys, group order  -> TestTheGrownCorpusSatisfiesTheBothWaysLaw
//	counts key and the counts-derived lines -> TestTheGrownCorpusCountsAccountForEveryLine
//	bytes == canonicalize(declaration)      -> TestEveryProgramRecordSelfTests
//	native construction == the record       -> TestNativeProgramVectorsMatchTheRecords
//	the valuation correspondence            -> TestTheFilledTwinIsTheValuationApplied
//	erasure satisfies ProgramAdmission      -> TestEveryDeclarationErasesToAnAdmissibleNodeList
//	the mutant arm                          -> TestProgramMutationControls
//
// RUN WITH -count=1, for the reason corpus_test.go states: the corpus lives
// outside this module and Go's cache cannot attribute a mutation in it.
package kmconform_test

import (
	"bytes"
	"fmt"
	"math/big"
	"strings"
	"testing"

	"foldlab/kmconform"
)

// spliceProgramGroup rebuilds the corpus around a chosen program group and a
// chosen declared count, through the package's own emitter, so nothing about
// the framing or the canonical bytes is typed.
//
// Every mutation control below is expressed as a degenerate DECLARATION
// rather than as a text edit, because a text edit inside a declaration has to
// be applied twice — once in the declaration and once inside the bytes string
// that declaration is serialized into — and a control that has to be applied
// twice is a control that can be applied once by mistake.
func spliceProgramGroup(t *testing.T, rows []kmconform.ProgramRow, declaredCount int) []byte {
	t.Helper()
	base, err := kmconform.CheckBothWays(corpusBytes(t))
	if err != nil {
		t.Fatalf("the committed corpus is not conformant: %v", err)
	}
	base.Programs = rows
	counted := false
	for index := range base.Header.Counts {
		if base.Header.Counts[index].Group == kmconform.RecordProgram {
			base.Header.Counts[index].Value = declaredCount
			counted = true
		}
	}
	if !counted {
		t.Fatal("the corpus header carries no program count for these controls to set")
	}
	grown, err := base.Emit()
	if err != nil {
		t.Fatalf("emit the spliced corpus: %v", err)
	}
	return grown
}

// nativeVectors indexes this package's own construction by vector name.
func nativeVectors(t *testing.T) map[string]kmconform.ProgramRow {
	t.Helper()
	byName := map[string]kmconform.ProgramRow{}
	for _, row := range nativeRows(t) {
		byName[row.Name] = row
	}
	return byName
}

// nativeRows is a fresh copy of the native vectors on every call, so a
// control that mutates one cannot leak into the next.
func nativeRows(t *testing.T) []kmconform.ProgramRow {
	t.Helper()
	rows, err := kmconform.ProgramVectors()
	if err != nil {
		t.Fatalf("ProgramVectors: %v", err)
	}
	return rows
}

func TestTheGrownCorpusSatisfiesTheBothWaysLaw(t *testing.T) {
	raw := corpusBytes(t)
	corpus, err := kmconform.ParseCorpus(raw)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	emitted, err := corpus.Emit()
	if err != nil {
		t.Fatalf("re-emit: %v", err)
	}
	if !bytes.Equal(raw, emitted) {
		t.Fatalf("both-ways law broken over the grown corpus: %d bytes in, %d bytes out, "+
			"first difference at byte %d", len(raw), len(emitted), firstDifference(raw, emitted))
	}
	if len(corpus.Programs) == 0 {
		t.Fatal("the corpus carries no program records")
	}
	t.Logf("both-ways (nine groups, %d program records): %d bytes over %d lines, byte-identical",
		len(corpus.Programs), len(raw), corpus.Lines)
}

func TestTheGrownCorpusCountsAccountForEveryLine(t *testing.T) {
	corpus := loadCorpus(t)
	declared := 0
	program := -1
	for _, count := range corpus.Header.Counts {
		declared += count.Value
		if count.Group == kmconform.RecordProgram {
			program = count.Value
		}
	}
	if program < 0 {
		t.Fatal("the corpus carries program records and the header counts omit them")
	}
	if program != len(corpus.Programs) {
		t.Fatalf("the header counts %d program records, the file carries %d", program, len(corpus.Programs))
	}
	// The rule the schema states and the literal 117 did not: an add-only
	// group joins without a format bump, and a summed count survives that
	// where an arithmetic constant does not. The ninth group is the proof.
	if corpus.Lines != declared+1 {
		t.Fatalf("the corpus has %d lines; the header counts %d records, so a complete file has %d",
			corpus.Lines, declared, declared+1)
	}
	if len(corpus.Unknown) != 0 {
		t.Fatalf("the corpus carries %d unrecognised records: %s",
			len(corpus.Unknown), strings.Join(corpus.SkipLog(), "; "))
	}
	t.Logf("counts: %d lines = 1 header + %d counted records, program=%d",
		corpus.Lines, declared, program)
}

// TestTheProgramGroupComesLast is the add-only rule read the other way: the
// ninth group was appended after all eight, which is the condition that let it
// arrive without a format bump. The tenth group, model-admission, arrived the
// same way and stands after it — so what this test pins is that nothing but a
// LATER-appended group may follow the program records, never that the file
// ends there.
func TestTheProgramGroupComesLast(t *testing.T) {
	raw := corpusBytes(t)
	lines := strings.Split(strings.TrimSuffix(string(raw), "\n"), "\n")
	seenProgram := false
	for index, line := range lines {
		isProgram := strings.Contains(line, `"record":"program"`)
		if isProgram {
			if seenProgram && index > 0 && !strings.Contains(lines[index-1], `"record":"program"`) {
				t.Fatalf("line %d resumes the program group after it ended; a group is contiguous", index+1)
			}
			seenProgram = true
			continue
		}
		if seenProgram && !strings.Contains(line, `"record":"model-admission"`) &&
			!strings.Contains(line, `"record":"run"`) {
			t.Fatalf("line %d is neither a program record nor a later-appended group and follows the "+
				"program group; groups are appended after every existing group, never interleaved", index+1)
		}
	}
	if !seenProgram {
		t.Fatal("no line carries a program record")
	}
}

func TestEveryProgramRecordSelfTests(t *testing.T) {
	corpus := loadCorpus(t)
	if len(corpus.Programs) == 0 {
		t.Fatal("the corpus carries no program records")
	}
	for _, row := range corpus.Programs {
		encoded, err := row.Declaration.Canonical()
		if err != nil {
			t.Fatalf("program vector %q: %v", row.Name, err)
		}
		if string(encoded) != row.Bytes {
			t.Fatalf("program vector %q: canonicalizing the declaration gives %s, the record declares %s",
				row.Name, encoded, row.Bytes)
		}
	}
	t.Logf("self-test: %d program records, declaration re-canonicalizes to bytes", len(corpus.Programs))
}

// TestNativeProgramVectorsMatchTheRecords is the cross-implementation
// tripwire, and the one the lane's acceptance names: build the ground-two-node
// declaration in Go from the bridge's planted program, and compare it to the
// record the corpus carries.
//
// The identities are a PIN. The freeze names the vectors and their shapes and
// leaves the ground labels to the model-end lane, so a disagreement here is a
// reconciliation item resolved toward the emitted corpus — in
// programvectors.go, which says so at its head. The SHAPE is asserted
// separately below so that moving the pin to match a broken emitter could not
// look like reconciliation.
func TestNativeProgramVectorsMatchTheRecords(t *testing.T) {
	native := nativeVectors(t)
	corpus := loadCorpus(t)

	ground, carried := programByName(corpus, "ground-two-node")
	if !carried {
		t.Fatal("the corpus carries no ground-two-node vector")
	}
	built, constructed := native["ground-two-node"]
	if !constructed {
		t.Fatal("this package does not construct ground-two-node")
	}
	if built.Bytes != ground.Bytes {
		t.Fatalf(
			"ground-two-node disagrees across implementations:\n  corpus: %s\n  native: %s\n"+
				"This is a reconciliation item against the model-end lane, not a fixture to overwrite.",
			ground.Bytes, built.Bytes)
	}
	// The shape the freeze states: two nodes, newest first, an emit consuming
	// a declare, exactly one edge running from the consumer to the consumed.
	if len(ground.Declaration.Nodes) != 2 {
		t.Fatalf("ground-two-node carries %d nodes, want the planted two", len(ground.Declaration.Nodes))
	}
	if ground.Declaration.Nodes[0].Generator != "emit" || ground.Declaration.Nodes[1].Generator != "declare" {
		t.Fatalf("ground-two-node is [%s, %s]; the freeze says an emit consuming a declare, newest first",
			ground.Declaration.Nodes[0].Generator, ground.Declaration.Nodes[1].Generator)
	}
	if len(ground.Declaration.Edges) != 1 {
		t.Fatalf("ground-two-node declares %d edges, want the one consumption",
			len(ground.Declaration.Edges))
	}
	edge := ground.Declaration.Edges[0]
	if edge.From.Cmp(ground.Declaration.Nodes[0].Name) != 0 ||
		edge.To.Cmp(ground.Declaration.Nodes[1].Name) != 0 {
		t.Fatalf("the edge runs %s->%s; from is the consuming node and to the consumed one",
			edge.From, edge.To)
	}
	t.Logf("ground-two-node, natively constructed and byte-identical: %s", built.Bytes)

	// And every other vector the corpus carries that this package also builds.
	matched := 0
	for _, row := range corpus.Programs {
		built, constructed := native[row.Name]
		if !constructed {
			t.Logf("the corpus carries a program vector %q this consumer does not construct natively",
				row.Name)
			continue
		}
		if built.Bytes != row.Bytes {
			t.Fatalf("program vector %q disagrees across implementations:\n  corpus: %s\n  native: %s",
				row.Name, row.Bytes, built.Bytes)
		}
		matched++
	}
	t.Logf("native construction agrees with %d of the corpus's %d program vectors",
		matched, len(corpus.Programs))
}

// TestTheFilledTwinIsTheValuationApplied checks the correspondence rather than
// the transcription: the filled vector must be what applying the valuation to
// the holey one produces. Two independently built vectors could agree with
// each other and with nothing else.
func TestTheFilledTwinIsTheValuationApplied(t *testing.T) {
	corpus := loadCorpus(t)
	holey, carriedHoley := programByName(corpus, "holey")
	filled, carriedFilled := programByName(corpus, "holey-filled")
	if !carriedHoley || !carriedFilled {
		t.Fatalf(
			"the corpus does not carry the two-record holey convention (it carries %v). The freeze "+
				"leaves the naming to the model-end lane; if it switched to a paired convention, this "+
				"check follows it rather than being deleted.",
			programNames(corpus))
	}
	if len(holey.Declaration.Holes) != 1 {
		t.Fatalf("the holey vector declares %d holes, want one", len(holey.Declaration.Holes))
	}
	hole := holey.Declaration.Holes[0]
	// The value the twin was filled with, read off the twin rather than
	// assumed: the correspondence is what is being tested, not the number.
	value, found := filledLiteral(filled.Declaration)
	if !found {
		t.Fatal("the filled twin carries no literal argument; filling turns a hole into a literal")
	}
	applied := holey.Declaration.Fill(kmconform.Valuation{hole.Name.String(): value})
	encoded, err := applied.Canonical()
	if err != nil {
		t.Fatalf("canonicalize the filled declaration: %v", err)
	}
	if string(encoded) != filled.Bytes {
		t.Fatalf("filling hole %s with %s gives\n  %s\nthe corpus's twin is\n  %s",
			hole.Name, value, encoded, filled.Bytes)
	}
	if len(applied.Holes) != 0 {
		t.Fatalf("the filled declaration still declares %d holes; a filled hole is no longer a parameter",
			len(applied.Holes))
	}
	t.Logf("valuation correspondence: hole %s := %s carries holey to holey-filled byte for byte",
		hole.Name, value)
}

func TestEveryDeclarationErasesToAnAdmissibleNodeList(t *testing.T) {
	corpus := loadCorpus(t)
	for _, row := range corpus.Programs {
		if err := row.Declaration.CheckAdmission(); err != nil {
			t.Fatalf("program vector %q does not erase to an admissible node list: %v", row.Name, err)
		}
	}
	t.Logf("erasure: %d declarations satisfy the model's ProgramAdmission", len(corpus.Programs))
}

// TestProgramMutationControls is the mutant arm. Every row is one degenerate
// declaration, or one edit at the byte level, spliced into an otherwise
// conformant corpus; each must be refused, and refused for ITS OWN named
// reason rather than by whatever check happens to fire first.
func TestProgramMutationControls(t *testing.T) {
	// The positive control, through the same entry point: without it these
	// rows prove only that the validator can say no.
	if _, err := kmconform.CheckBothWays(corpusBytes(t)); err != nil {
		t.Fatalf("the committed corpus was refused: %v", err)
	}

	for _, control := range []struct {
		name    string
		mutated func() []byte
		expects string
	}{
		{
			// The freeze's consistency rule, broken in the direction an emitter
			// actually breaks it: the nodes still consume, the edge list forgot.
			name: "an edge dropped",
			mutated: func() []byte {
				return spliceMutated(t, "ground-two-node", func(d kmconform.ProgramDeclaration) kmconform.ProgramDeclaration {
					d.Edges = nil
					return d
				})
			},
			expects: "is implied by a local argument reference and is not declared",
		},
		{
			name: "an edge invented",
			mutated: func() []byte {
				return spliceMutated(t, "distill-shape", func(d kmconform.ProgramDeclaration) kmconform.ProgramDeclaration {
					d.Edges = append(append([]kmconform.ProgramEdge(nil), d.Edges...),
						kmconform.ProgramEdge{From: big.NewInt(4), To: big.NewInt(1)})
					return d
				})
			},
			expects: "no local argument reference implies it",
		},
		{
			// The self-test the group exists for: the bytes are the
			// declaration's, and a record whose two halves describe different
			// values is the one defect a schema check cannot see.
			name: "a bytes and declaration mismatch",
			mutated: func() []byte {
				rows := nativeRows(t)
				rows[0].Bytes = rows[len(rows)-1].Bytes
				return spliceProgramGroup(t, rows, len(rows))
			},
			expects: "canonicalizing the declaration yields",
		},
		{
			// Canonical form is about bytes: the record still denotes the same
			// value, and the parse refuses it before any grammar check runs.
			name: "an unsorted args object",
			mutated: func() []byte {
				sorted, swapped := holeyArgsSpellings(t)
				return mutate(t, corpusBytes(t), sorted, swapped)
			},
			expects: "members are sorted",
		},
		{
			name: "a counts miss",
			mutated: func() []byte {
				rows := nativeRows(t)
				return spliceProgramGroup(t, rows, len(rows)-1)
			},
			expects: "program records, the file carries",
		},
		{
			name: "the counts key omitted while the records are present",
			mutated: func() []byte {
				raw := corpusBytes(t)
				return mutate(t, raw, fmt.Sprintf(`"program":%d,`, len(loadCorpus(t).Programs)), "")
			},
			expects: `header counts omit "program"`,
		},
		{
			name: "a generator outside the model's eight",
			mutated: func() []byte {
				return spliceMutated(t, "ground-two-node", func(d kmconform.ProgramDeclaration) kmconform.ProgramDeclaration {
					d.Nodes[0].Generator = "sleep"
					return d
				})
			},
			expects: "the model's Act record does not declare",
		},
		{
			// The args object is keyed by the generator's OWN field names, read
			// out of the corpus's mini-AST record rather than retyped, so a
			// field the model never declared is refused by the model's own list.
			name: "an argument the generator does not declare",
			mutated: func() []byte {
				return spliceMutated(t, "ground-two-node", func(d kmconform.ProgramDeclaration) kmconform.ProgramDeclaration {
					d.Nodes[0].Args[0].Field = "clock"
					return d
				})
			},
			expects: "does not declare; its fields are",
		},
		{
			name: "a digest reference of no declared kind",
			mutated: func() []byte {
				return spliceMutated(t, "distill-shape", func(d kmconform.ProgramDeclaration) kmconform.ProgramDeclaration {
					d.Nodes[0].Args[0].Ref.Kind = "closure"
					return d
				})
			},
			expects: "not one of the model's twelve declaration kinds",
		},
		{
			// Nodes are newest-first, so a list in the other order makes every
			// consumption name a node that has not been admitted yet. This is
			// Kernel.ProgramAdmission failing, in Go.
			name: "the node list in oldest-first order",
			mutated: func() []byte {
				return spliceMutated(t, "ground-two-node", func(d kmconform.ProgramDeclaration) kmconform.ProgramDeclaration {
					d.Nodes = []kmconform.ProgramNodeRow{d.Nodes[1], d.Nodes[0]}
					return d
				})
			},
			expects: "not an already-admitted node",
		},
		{
			name: "one node name admitted twice",
			mutated: func() []byte {
				return spliceMutated(t, "distill-shape", func(d kmconform.ProgramDeclaration) kmconform.ProgramDeclaration {
					d.Nodes[0].Name = d.Nodes[1].Name
					return d
				})
			},
			expects: "admits twice",
		},
		{
			name: "holes out of order",
			mutated: func() []byte {
				return spliceMutated(t, "holey", func(d kmconform.ProgramDeclaration) kmconform.ProgramDeclaration {
					first := d.Holes[0]
					d.Holes = []kmconform.ProgramHole{
						{Name: new(big.Int).Add(first.Name, big.NewInt(1)), Schema: first.Schema},
						first,
					}
					return d
				})
			},
			expects: "holes ascend by name",
		},
		{
			// A hole is a declared parameter, not a wildcard: an argument
			// standing in a hole nobody declared is the wildcard reading.
			name: "an argument standing in an undeclared hole",
			mutated: func() []byte {
				return spliceMutated(t, "holey", func(d kmconform.ProgramDeclaration) kmconform.ProgramDeclaration {
					d.Holes = nil
					return d
				})
			},
			expects: "which the declaration does not declare",
		},
		{
			// The closure row, spelled at the wire: computation is referenced
			// by digest and never carried as a value, so there is no argument
			// tag for one and an unknown tag is refused rather than ignored.
			name: "an argument tag outside the closed set",
			mutated: func() []byte {
				return mutate(t, corpusBytes(t), `"arg":"hole"`, `"arg":"closure"`)
			},
			expects: "outside the closed set",
		},
		{
			name: "the program group before the canon group",
			mutated: func() []byte {
				raw := corpusBytes(t)
				lines := strings.Split(strings.TrimSuffix(string(raw), "\n"), "\n")
				// The first program line is FOUND, not computed from the end of
				// the file: a later-appended group stands after the program
				// group, so counting backwards from the last line swaps two
				// rows inside that group instead of across the boundary under
				// test, and the control passes vacuously.
				first := -1
				for index, line := range lines {
					if strings.Contains(line, `"record":"program"`) {
						first = index
						break
					}
				}
				if first <= 0 {
					t.Fatal("no program record found; the group-order control has nothing to swap")
				}
				lines[first-1], lines[first] = lines[first], lines[first-1]
				return []byte(strings.Join(lines, "\n") + "\n")
			},
			expects: "the group order is fixed",
		},
		{
			name: "a vector the freeze names dropped",
			mutated: func() []byte {
				kept := []kmconform.ProgramRow{}
				for _, row := range nativeRows(t) {
					if row.Name == "distill-shape" {
						continue
					}
					kept = append(kept, row)
				}
				return spliceProgramGroup(t, kept, len(kept))
			},
			expects: `no vector named "distill-shape"`,
		},
		{
			name: "two program records under one name",
			mutated: func() []byte {
				rows := nativeRows(t)
				rows[1].Name = rows[0].Name
				return spliceProgramGroup(t, rows, len(rows))
			},
			expects: "two program records name the vector",
		},
	} {
		mutated := control.mutated()
		if bytes.Equal(mutated, corpusBytes(t)) {
			t.Fatalf("%s: the mutation changed nothing", control.name)
		}
		_, err := kmconform.CheckBothWays(mutated)
		if err == nil {
			t.Fatalf("%s: the mutated corpus was ACCEPTED; this validator cannot catch it", control.name)
		}
		if !strings.Contains(err.Error(), control.expects) {
			t.Fatalf("%s: refused with %q, want the refusal to name %q", control.name, err, control.expects)
		}
		t.Logf("control %-52q refused: %v", control.name, err)
	}
}

// spliceMutated applies one degenerate transformation to one named vector,
// recomputes that vector's bytes so the record stays self-consistent, and
// splices the group back in. Recomputing the bytes is what makes each control
// name its own law: a control that left them stale would be refused by the
// self-test no matter what else it broke.
func spliceMutated(
	t *testing.T,
	vector string,
	degenerate func(kmconform.ProgramDeclaration) kmconform.ProgramDeclaration,
) []byte {
	t.Helper()
	rows := nativeRows(t)
	found := false
	for index, row := range rows {
		if row.Name != vector {
			continue
		}
		found = true
		mutatedDeclaration := degenerate(row.Declaration)
		encoded, err := mutatedDeclaration.Canonical()
		if err != nil {
			t.Fatalf("canonicalize the mutated %q: %v", vector, err)
		}
		rows[index] = kmconform.ProgramRow{
			Name:        row.Name,
			Bytes:       string(encoded),
			Declaration: mutatedDeclaration,
		}
	}
	if !found {
		t.Fatalf("no native vector is named %q", vector)
	}
	return spliceProgramGroup(t, rows, len(rows))
}

// holeyArgsSpellings returns the holey vector's args object as canonical form
// writes it, and the same two members swapped. Both are derived from the
// vector this package builds — a swapped spelling cannot be produced by the
// emitter, which sorts — so a change to the vector fails here with a clear
// message rather than leaving the control silently targeting nothing.
func holeyArgsSpellings(t *testing.T) (string, string) {
	t.Helper()
	holey, constructed := nativeVectors(t)["holey"]
	if !constructed {
		t.Fatal("this package does not construct the holey vector")
	}
	// The node that binds the hole, not simply the first node: the holey and
	// holey-filled vectors share an identical emit node, so its args object
	// occurs twice in the corpus and a mutation aimed at it would silently
	// change one record while the control believed it had changed the other.
	// The declare node's args differ between the twins by construction.
	body := argsObjectBodyBinding(t, holey.Bytes, `"arg":"hole"`)
	first, second := splitTopLevelPair(t, body)
	sorted := `"args":{` + body + `}`
	swapped := `"args":{` + second + "," + first + `}`
	if !strings.Contains(holey.Bytes, sorted) {
		t.Fatalf("the holey declaration %s does not carry %s; this control's target is stale",
			holey.Bytes, sorted)
	}
	return sorted, swapped
}

// argsObjectBodyBinding returns the contents of the first args object in a
// declaration's canonical bytes that carries the given text. Counting braces
// is sound here and only here: no string inside a declaration carries a
// brace — field names, generator names, and kind names are all identifiers —
// so no brace in this text is quoted.
func argsObjectBodyBinding(t *testing.T, declaration, needle string) string {
	t.Helper()
	const marker = `"args":{`
	for offset := 0; ; {
		found := strings.Index(declaration[offset:], marker)
		if found < 0 {
			t.Fatalf("no args object in %s binds %s", declaration, needle)
		}
		start := offset + found + len(marker)
		depth := 1
		end := -1
		for index := start; index < len(declaration); index++ {
			switch declaration[index] {
			case '{':
				depth++
			case '}':
				depth--
				if depth == 0 {
					end = index
				}
			}
			if end >= 0 {
				break
			}
		}
		if end < 0 {
			t.Fatalf("an args object in %s is not closed", declaration)
		}
		if body := declaration[start:end]; strings.Contains(body, needle) {
			return body
		}
		offset = end
	}
}

// splitTopLevelPair splits an object body at its one top-level comma.
func splitTopLevelPair(t *testing.T, body string) (string, string) {
	t.Helper()
	depth := 0
	for index := 0; index < len(body); index++ {
		switch body[index] {
		case '{':
			depth++
		case '}':
			depth--
		case ',':
			if depth == 0 {
				return body[:index], body[index+1:]
			}
		}
	}
	t.Fatalf("the object body %s has no top-level comma; this control needs two members so that "+
		"there is a member order to get wrong", body)
	return "", ""
}

func programByName(corpus *kmconform.Corpus, name string) (kmconform.ProgramRow, bool) {
	for _, row := range corpus.Programs {
		if row.Name == name {
			return row, true
		}
	}
	return kmconform.ProgramRow{}, false
}

func programNames(corpus *kmconform.Corpus) []string {
	names := make([]string, 0, len(corpus.Programs))
	for _, row := range corpus.Programs {
		names = append(names, row.Name)
	}
	return names
}

// filledLiteral reads the first literal argument out of a declaration: the
// value a hole became.
func filledLiteral(declaration kmconform.ProgramDeclaration) (*big.Int, bool) {
	for _, node := range declaration.Nodes {
		for _, arg := range node.Args {
			if arg.Ref.Arg == kmconform.ArgLiteral {
				return arg.Ref.Value, true
			}
		}
	}
	return nil, false
}
