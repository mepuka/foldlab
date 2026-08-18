package kmconform

// The integration validation checklist, made mechanical. Every check below
// has a mutation in controls_test.go that proves it can fail; a validator
// with no failing case proves nothing, and one that rejects everything
// proves nothing either.

import (
	"fmt"
	"math/big"
	"strings"
)

func (c *Corpus) validate(tally map[string]int) error {
	for _, check := range []func(map[string]int) error{
		c.validateCounts,
		c.validateLineCount,
		c.validateProvenance,
		c.validateKinds,
		c.validateStages,
		c.validateRefusals,
		c.validateTypes,
		c.validateEncodings,
		c.validateAdmissions,
		c.validateDocs,
		c.validateCanons,
		c.validateCrossRecord,
	} {
		if err := check(tally); err != nil {
			return err
		}
	}
	return nil
}

func (c *Corpus) validateProvenance(map[string]int) error {
	// Provenance is display only and is never branched on, but an artifact
	// naming a different model, or a different emitter, is not this
	// consumer's artifact.
	if c.Header.Source != ExpectedSource {
		return fmt.Errorf("header source is %q, want %q", c.Header.Source, ExpectedSource)
	}
	if c.Header.Generator != ExpectedGenerator {
		return fmt.Errorf("header generator is %q, want %q", c.Header.Generator, ExpectedGenerator)
	}
	return nil
}

// validateLineCount is the cheap cross-check that a partial read fails
// immediately: the file carries one header plus exactly the records the
// header counts. It is stated in terms of the counts rather than as the
// literal 117 so that an add-only group joining the corpus does not require
// editing an arithmetic constant that nothing derives.
//
// A file carrying an unrecognised group whose count the header omits is
// exempt, because then the counts no longer account for every line and this
// check would be measuring the consumer's ignorance rather than the file.
func (c *Corpus) validateLineCount(map[string]int) error {
	if len(c.Unknown) > 0 {
		return nil
	}
	declared := 0
	for _, count := range c.Header.Counts {
		declared += count.Value
	}
	if c.Lines != declared+1 {
		return fmt.Errorf(
			"the file has %d lines; the header counts %d records, so a complete file has %d",
			c.Lines, declared, declared+1)
	}
	return nil
}

// validateCounts checks every counts key against the records actually read.
// Unknown counts keys are checked too rather than skipped: an unknown key
// belongs to an unknown record type, and a count that disagrees with the
// records present is a defect whichever group it names.
func (c *Corpus) validateCounts(tally map[string]int) error {
	declared := map[string]int{}
	for _, count := range c.Header.Counts {
		if _, duplicate := declared[count.Group]; duplicate {
			return fmt.Errorf("header counts carry %q twice", count.Group)
		}
		declared[count.Group] = count.Value
	}
	for _, group := range countedGroups {
		if _, present := declared[group]; !present {
			return fmt.Errorf("header counts omit %q", group)
		}
	}
	for _, count := range c.Header.Counts {
		if actual := tally[count.Group]; actual != count.Value {
			return fmt.Errorf(
				"header declares %d %s records, the file carries %d",
				count.Value, count.Group, actual)
		}
	}
	return nil
}

func validateDenseRanks(what string, rows []Ranked, want int) error {
	if len(rows) != want {
		return fmt.Errorf("%s records: got %d, want %d", what, len(rows), want)
	}
	seen := map[string]bool{}
	for index, row := range rows {
		if row.Rank != index {
			return fmt.Errorf(
				"%s %q has rank %d at position %d; ranks are dense and ascending from zero, and rank order is file order",
				what, row.Name, row.Rank, index)
		}
		if row.Name == "" {
			return fmt.Errorf("%s at rank %d has an empty name", what, index)
		}
		if seen[row.Name] {
			return fmt.Errorf("duplicate %s name %q", what, row.Name)
		}
		seen[row.Name] = true
	}
	return nil
}

func (c *Corpus) validateKinds(map[string]int) error {
	return validateDenseRanks(RecordKind, c.Kinds, 12)
}

func (c *Corpus) validateStages(map[string]int) error {
	return validateDenseRanks(RecordStage, c.Stages, 5)
}

func (c *Corpus) validateRefusals(map[string]int) error {
	if len(c.Refusals) != 16 {
		return fmt.Errorf("refusal records: got %d, want 16", len(c.Refusals))
	}
	seen := map[string]bool{}
	machineApplicable := 0
	for _, row := range c.Refusals {
		if seen[row.Reason] {
			return fmt.Errorf("duplicate refusal reason %q", row.Reason)
		}
		seen[row.Reason] = true
		// Refusal parity is total: the model's taught function is total by
		// construction, and the door never refuses without teaching the
		// legal next move.
		if row.Law == "" || row.Repair == "" {
			return fmt.Errorf("refusal %q is missing a law or a repair; refusal parity is total", row.Reason)
		}
		switch row.Applicability {
		case "machine-applicable":
			machineApplicable++
		case "advisory":
		default:
			return fmt.Errorf(
				"refusal %q has applicability %q, outside the closed set {machine-applicable, advisory}",
				row.Reason, row.Applicability)
		}
	}
	if machineApplicable != len(machineApplicableReasons) {
		return fmt.Errorf(
			"%d refusals are machine-applicable, want %d; the split is what makes the taught table a codemod catalog rather than a message catalog",
			machineApplicable, len(machineApplicableReasons))
	}
	// Which four, not merely how many. A table that swapped an advisory row
	// for a machine-applicable one would keep the count and change the
	// codemod catalog, which is the part an agent may apply without asking.
	for _, reason := range machineApplicableReasons {
		found := false
		for _, row := range c.Refusals {
			if row.Reason == reason {
				found = true
				if row.Applicability != "machine-applicable" {
					return fmt.Errorf(
						"refusal %q is %q; the machine-applicable four are %s",
						reason, row.Applicability, strings.Join(machineApplicableReasons, ", "))
				}
			}
		}
		if !found {
			return fmt.Errorf("no refusal record names %q", reason)
		}
	}
	return nil
}

func (c *Corpus) validateTypes(map[string]int) error {
	if len(c.Types) != len(closedTypeNames) {
		return fmt.Errorf("type records: got %d, want the closed %d", len(c.Types), len(closedTypeNames))
	}
	declared := map[string]bool{"Nat": true, "String": true, "Ref": true}
	for index, row := range c.Types {
		if row.Name != closedTypeNames[index] {
			return fmt.Errorf(
				"type at position %d is %q, want %q; the type group is the closed list in declaration order",
				index, row.Name, closedTypeNames[index])
		}
		declared[row.Name] = true
	}
	kindNames := map[string]bool{}
	for _, kind := range c.Kinds {
		kindNames[kind.Name] = true
	}
	for _, row := range c.Types {
		switch row.Form {
		case "inductive":
		case "structure":
			if len(row.Constructors) != 1 {
				return fmt.Errorf(
					"structure %s carries %d constructors, want exactly one",
					row.Name, len(row.Constructors))
			}
			if row.Constructors[0].Name != "mk" {
				return fmt.Errorf(
					"structure %s names its constructor %q, want \"mk\"",
					row.Name, row.Constructors[0].Name)
			}
		default:
			return fmt.Errorf(
				"type %s has form %q, outside the closed set {inductive, structure}",
				row.Name, row.Form)
		}
		bound := map[string]bool{}
		for _, param := range row.Params {
			if param.Role != "brand" && param.Role != "type" {
				return fmt.Errorf(
					"type %s parameter %s has role %q, outside the closed set {brand, type}",
					row.Name, param.Name, param.Role)
			}
			bound[param.Name] = true
		}
		for _, ctor := range row.Constructors {
			inScope := map[string]bool{}
			for name := range bound {
				inScope[name] = true
			}
			for _, field := range ctor.Fields {
				if err := checkTypeReference(field.Type, declared, kindNames, inScope); err != nil {
					return fmt.Errorf("type %s.%s.%s: %w", row.Name, ctor.Name, field.Name, err)
				}
				// A brand argument may name an EARLIER field of the same
				// constructor, so a field enters scope only after its own
				// reference has been resolved.
				inScope[field.Name] = true
			}
		}
	}
	return nil
}

// checkTypeReference resolves one schema type reference:
//
//	ref  ::= name | name "(" arg ("," arg)* ")"
//
// The head must be a leaf, a declared type, or a container; every brand
// argument must be a DeclKind constructor name or the name of a preceding
// field or param in the same constructor. A reference matching neither is
// refused, never guessed.
func checkTypeReference(reference string, declared, kindNames, inScope map[string]bool) error {
	head, args, err := splitTypeReference(reference)
	if err != nil {
		return err
	}
	switch head {
	case "List", "Option":
		if len(args) != 1 {
			return fmt.Errorf("%s takes exactly one argument, got %d in %q", head, len(args), reference)
		}
		return checkTypeReference(args[0], declared, kindNames, inScope)
	}
	if !declared[head] {
		return fmt.Errorf("reference %q names the undeclared type %q", reference, head)
	}
	for _, arg := range args {
		if kindNames[arg] || inScope[arg] {
			continue
		}
		return fmt.Errorf(
			"reference %q has the brand argument %q, which is neither a DeclKind constructor name nor a preceding field or param",
			reference, arg)
	}
	return nil
}

func splitTypeReference(reference string) (string, []string, error) {
	open := strings.IndexByte(reference, '(')
	if open < 0 {
		if reference == "" {
			return "", nil, fmt.Errorf("empty type reference")
		}
		return reference, nil, nil
	}
	if !strings.HasSuffix(reference, ")") {
		return "", nil, fmt.Errorf("type reference %q opens an argument list it does not close", reference)
	}
	head := reference[:open]
	inner := reference[open+1 : len(reference)-1]
	if head == "" || inner == "" {
		return "", nil, fmt.Errorf("type reference %q is malformed", reference)
	}
	return head, strings.Split(inner, ","), nil
}

func (c *Corpus) validateEncodings(map[string]int) error {
	if len(c.Encodings) != 12 {
		return fmt.Errorf("encoding records: got %d, want the twelve named vectors", len(c.Encodings))
	}
	seen := map[string]bool{}
	tagSeen := map[int64]bool{}
	for _, row := range c.Encodings {
		if seen[row.Name] {
			return fmt.Errorf("duplicate encoding vector name %q", row.Name)
		}
		seen[row.Name] = true
		if len(row.Act) == 0 {
			return fmt.Errorf("encoding vector %q carries an empty act", row.Name)
		}
		tag := row.Act[0]
		if !tag.IsInt64() || tag.Int64() < 0 || tag.Int64() > 7 {
			return fmt.Errorf(
				"encoding vector %q has generator tag %s, outside the eight generators 0..7",
				row.Name, tag)
		}
		want := generatorArity[tag.Int64()]
		if len(row.Act) != want {
			return fmt.Errorf(
				"encoding vector %q has %d elements, want %d for generator tag %s",
				row.Name, len(row.Act), want, tag)
		}
		tagSeen[tag.Int64()] = true
	}
	for tag := int64(0); tag < 8; tag++ {
		if !tagSeen[tag] {
			return fmt.Errorf("no encoding vector carries generator tag %d; no generator may be unrepresented", tag)
		}
	}
	if _, ok := c.lawfulEncoding(); !ok {
		return fmt.Errorf(
			"no encoding vector is named %q or %q; the lawful twin is not optional",
			"lawful-declare", "lawfulDeclareAct")
	}
	return nil
}

// lawfulEncoding resolves the vector the admitted row must agree with. Two
// spellings are accepted because the model-end lane's name is normative and
// the schema document and the corpus disagree on it today; if a third
// appears, this is where it lands.
func (c *Corpus) lawfulEncoding() (EncodingRow, bool) {
	for _, name := range []string{"lawful-declare", "lawfulDeclareAct"} {
		for _, row := range c.Encodings {
			if row.Name == name {
				return row, true
			}
		}
	}
	return EncodingRow{}, false
}

func (c *Corpus) validateAdmissions(map[string]int) error {
	if len(c.Admissions) != 17 {
		return fmt.Errorf("admission records: got %d, want 17", len(c.Admissions))
	}
	for index, row := range c.Admissions {
		wantVerdict := "refused"
		if index == 16 {
			wantVerdict = "admitted"
		}
		if row.Verdict != wantVerdict {
			return fmt.Errorf(
				"admission %d (%s) has verdict %q, want %q; sixteen refusals then the lawful twin",
				index, row.Name, row.Verdict, wantVerdict)
		}
	}
	// The seventeenth row exists to refute the door that refuses everything.
	admitted := c.Admissions[16]
	if len(admitted.Encoded) == 0 {
		return fmt.Errorf("admitted row %q carries no encoding", admitted.Name)
	}
	return nil
}

func (c *Corpus) validateDocs(map[string]int) error {
	position := map[string]int{}
	for index, row := range c.Types {
		position[row.Name] = index
	}
	previous := -1
	seen := map[string]bool{}
	for _, row := range c.Docs {
		if row.Target != "type" {
			return fmt.Errorf("doc record %q has target %q, want \"type\"", row.Name, row.Target)
		}
		at, declaredType := position[row.Name]
		if !declaredType {
			return fmt.Errorf("doc record names %q, which is not a declared type", row.Name)
		}
		if seen[row.Name] {
			return fmt.Errorf("two doc records name %q", row.Name)
		}
		seen[row.Name] = true
		if at <= previous {
			return fmt.Errorf(
				"doc record %q is out of order; the doc group follows type declaration order",
				row.Name)
		}
		previous = at
		if row.Doc == "" {
			return fmt.Errorf("doc record %q carries an empty docstring", row.Name)
		}
	}
	return nil
}

func (c *Corpus) validateCanons(map[string]int) error {
	if len(c.Canons) != len(canonVectorNames) {
		return fmt.Errorf("canon records: got %d, want %d", len(c.Canons), len(canonVectorNames))
	}
	for index, row := range c.Canons {
		if row.Name != canonVectorNames[index] {
			return fmt.Errorf(
				"canon vector at position %d is %q, want %q; the canon group is a fixed list in a fixed order",
				index, row.Name, canonVectorNames[index])
		}
		// The whole point of the group: the declared bytes are the canonical
		// serialization of the declared value, checked here rather than
		// trusted. CheckBothWays runs the same comparison over a file; this
		// keeps it true of a Corpus obtained any other way.
		canonical, err := row.Value.Canonical()
		if err != nil {
			return fmt.Errorf("canon vector %q: %w", row.Name, err)
		}
		if string(canonical) != row.Bytes {
			return fmt.Errorf(
				"canon vector %q: canonicalizing the value yields %s, the record declares %s",
				row.Name, string(canonical), row.Bytes)
		}
	}
	return nil
}

func (c *Corpus) validateCrossRecord(map[string]int) error {
	reasons := map[string]bool{}
	for _, row := range c.Refusals {
		reasons[row.Reason] = true
	}
	for _, row := range c.Admissions {
		if row.Verdict != "refused" {
			continue
		}
		if !reasons[row.Reason] {
			return fmt.Errorf(
				"admission %q refuses with %q, which has no refusal record",
				row.Name, row.Reason)
		}
	}
	// The kernel gate's control order and the RefusalReason declaration
	// order coincide today. This pins the coincidence so a reorder on either
	// side is caught rather than silently accepted; if a future change
	// breaks the alignment deliberately, this check is retired by a ruling,
	// not by deletion.
	for index := range c.Refusals {
		if c.Admissions[index].Reason != c.Refusals[index].Reason {
			return fmt.Errorf(
				"admission %d refuses with %q while refusal %d is %q; the control order and the declaration order have diverged",
				index, c.Admissions[index].Reason, index, c.Refusals[index].Reason)
		}
	}
	// Two emissions of one fact must agree.
	lawful, ok := c.lawfulEncoding()
	if !ok {
		return fmt.Errorf("the lawful encoding vector is absent")
	}
	if !sameNats(lawful.Act, c.Admissions[16].Encoded) {
		return fmt.Errorf(
			"the admitted row encodes %s while the %q vector encodes %s; these are two emissions of the same fact",
			formatNats(c.Admissions[16].Encoded), lawful.Name, formatNats(lawful.Act))
	}
	return nil
}

func sameNats(left, right []*big.Int) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index].Cmp(right[index]) != 0 {
			return false
		}
	}
	return true
}

func formatNats(numbers []*big.Int) string {
	parts := make([]string, 0, len(numbers))
	for _, number := range numbers {
		parts = append(parts, number.String())
	}
	return "[" + strings.Join(parts, ",") + "]"
}
