package kmconform

// The format-2 corpus grammar.
//
// Record group order is total: header, kind, stage, refusal, type, encoding,
// admission, doc, canon, program. Every record is serialized in estate canonical form,
// so keys appear SORTED — which is the format-1 grammar's one visible break,
// and the reason a format-1 file is refused here rather than read leniently.
//
// Because every line is canonical, the key-order check and the
// no-whitespace check and the compact-form check are all one check: parse the
// line and re-emit it, and require the bytes back. That is the BOTH-WAYS LAW,
// and CheckBothWays is where it is enforced over a whole file.

import (
	"bytes"
	"fmt"
	"math/big"
	"sort"
	"strings"
)

// Record group names, in file order.
const (
	RecordHeader    = "header"
	RecordKind      = "kind"
	RecordStage     = "stage"
	RecordRefusal   = "refusal"
	RecordType      = "type"
	RecordEncoding  = "encoding"
	RecordAdmission = "admission"
	RecordDoc       = "doc"
	RecordCanon     = "canon"
	// RecordProgram is the ninth group, added under the format's add-only
	// rule: record types are add-only WITHIN a format, so a new group appends
	// itself after every existing one and brings a new counts key with it. No
	// format bump, and a consumer that does not know it skips it.
	RecordProgram = "program"
	// RecordModelAdmission is the tenth group. Its rows are admitted
	// sentences the model publishes to document ITSELF, each marked
	// scope="model-internal" by the emitter, and no host reproduces them:
	// they state a quotient of the model's payload fold that is ruled
	// intended and model-internal (operator grill ruling A8, DEV-772), while
	// real byte-level injectivity is walled elsewhere. This consumer KNOWS
	// the group — so it is not "skipped" and a generator reading the corpus
	// is not left guessing — and deliberately projects nothing from it.
	RecordModelAdmission = "model-admission"
)

// groupOrder is the mandated file order of the record groups this consumer
// knows. Unrecognised groups are skipped, and must follow all of these.
var groupOrder = []string{
	RecordHeader,
	RecordKind,
	RecordStage,
	RecordRefusal,
	RecordType,
	RecordEncoding,
	RecordAdmission,
	RecordDoc,
	RecordCanon,
	RecordProgram,
	RecordModelAdmission,
}

// countedGroups are the counts keys the header must ALWAYS carry. Extra keys
// are permitted (they belong to an unrecognised group and are skipped with
// it); a missing one is a malformed header.
//
// The list is in the header's own member order, which is lexicographic
// because the header is canonical. Note that this is NOT the file order:
// "program" belongs between "kind" and "refusal" as a counts key while its
// records stand last in the file, and the two orders are different facts
// neither of which derives the other.
var countedGroups = []string{
	RecordAdmission,
	RecordCanon,
	RecordDoc,
	RecordEncoding,
	RecordKind,
	RecordModelAdmission,
	RecordProgram,
	RecordRefusal,
	RecordStage,
	RecordType,
}

// closedTypeNames is the closed twenty-five, in Kernel/Definitions.lean
// declaration order. Adding a name is an add-only change to the corpus and a
// one-line change here; removing one is a format bump. The last three joined
// with the 2026-08-19 manifest growth (the door's verdict and the program
// vocabulary).
var closedTypeNames = []string{
	"DeclKind", "Digest", "Value", "StateLabel", "Petname", "Token",
	"LanePartition", "Position", "AnchorFact", "HoleStage",
	"KTriggerPredicate", "Act", "RawArg", "CandidateAnchor", "TokenClaim",
	"MergeStrategy", "CandidatePredicate", "CandidateAct", "RefusalReason",
	"Refusal", "Applicability", "Door", "AdmitResult", "GenTag",
	"ProgramNode",
}

// machineApplicableReasons are the four repairs that are a function of the
// refused candidate alone, and so may be applied by a codemod without asking.
// Naming them, rather than only counting them, is what stops a swap between
// the advisory and machine-applicable halves from passing unnoticed.
var machineApplicableReasons = []string{
	"last-writer-wins", "unverified-read", "past-mutation", "anchored-resolve",
}

// canonVectorNames is the canon group, in the freeze's order. These ten
// exercise the serializer's own corners: the empty containers, the empty
// string, zero, an integer above 2^53, member re-ordering, nesting on both
// sides, the two-char escapes, and a control character.
var canonVectorNames = []string{
	"empty-object", "empty-array", "empty-string", "zero", "big-integer",
	"key-order", "nested-object", "nested-array", "string-escapes",
	"control-char",
}

// generatorArity is the fixed arity of an encoded act per generator tag:
// declare 4, resolve 3, emit 3, join 3, fold 8, decide 4, trigger 6,
// spawn 3. A decoder dispatches on length and tag alone.
var generatorArity = [8]int{4, 3, 3, 3, 8, 4, 6, 3}

// Header is the provenance record and the file's self-check.
type Header struct {
	Format    int
	Generator string
	Source    string
	Counts    []Count
}

// Count is one header counts entry, in canonical member order.
type Count struct {
	Group string
	Value int
}

// Ranked is a kind or a stage: a name at a dense rank.
type Ranked struct {
	Name string
	Rank int
}

// RefusalRow is one taught refusal.
type RefusalRow struct {
	Reason        string
	Law           string
	Repair        string
	Applicability string
}

// Param is a type parameter and its role.
type Param struct {
	Name string
	Role string
}

// Field is a constructor field or argument and its schema type reference.
type Field struct {
	Name string
	Type string
}

// Ctor is one constructor.
type Ctor struct {
	Name   string
	Fields []Field
}

// TypeRow is one entry of the mini-AST.
type TypeRow struct {
	Name         string
	Form         string
	Params       []Param
	Constructors []Ctor
}

// EncodingRow is one canonical sentence framing.
type EncodingRow struct {
	Name string
	Act  []*big.Int
}

// AdmissionRow is one planted candidate and the door's verdict.
type AdmissionRow struct {
	Name    string
	Verdict string
	Reason  string
	Encoded []*big.Int
}

// DocRow is one type's docstring, extracted from the model's environment.
type DocRow struct {
	Name   string
	Target string
	Doc    string
}

// CanonRow is one canonicalization vector: a value and the exact bytes the
// canonical form of that value must have.
type CanonRow struct {
	Name  string
	Bytes string
	Value JSONValue
}

// Skipped records an unrecognised record type. Skipping is the add-only
// rule's one leniency, and it is logged rather than silent.
type Skipped struct {
	Line   int
	Record string
	Value  JSONValue
}

// ModelInternalRow is one model-admission record, retained verbatim.
//
// The group is RECOGNISED — so it never lands in the skip log and no
// generator reading this corpus is left guessing whether it is missing
// something — and deliberately NOT projected: nothing here becomes a Go
// table, and no host reproduces these verdicts. What is kept is the record's
// own value, which is what the both-ways law needs to re-emit the line and
// nothing a consumer could mistake for an admission verdict it owes.
type ModelInternalRow struct {
	Line  int
	Name  string
	Value JSONValue
}

// Corpus is one parsed, validated format-2 artifact.
type Corpus struct {
	// Lines is the record count of the file this corpus was parsed from,
	// kept so the header's counts can be checked against the file's own
	// length rather than only against each other.
	Lines      int
	Header     Header
	Kinds      []Ranked
	Stages     []Ranked
	Refusals   []RefusalRow
	Types      []TypeRow
	Encodings  []EncodingRow
	Admissions []AdmissionRow
	Docs       []DocRow
	Canons     []CanonRow
	Programs   []ProgramRow
	// ModelInternal carries the model-admission group: recognised, retained
	// for the both-ways law, projected nowhere.
	ModelInternal []ModelInternalRow
	Unknown       []Skipped
}

// FormatError names both the format found and the format understood. A
// consumer that meets an unknown format refuses; it does not degrade.
type FormatError struct {
	Found      int
	Understood int
}

func (e *FormatError) Error() string {
	return fmt.Sprintf(
		"corpus format %d is not understood (this consumer knows format %d); refusing rather than reading it best-effort",
		e.Found, e.Understood)
}

// ParseCorpus reads and validates a format-2 artifact.
func ParseCorpus(data []byte) (*Corpus, error) {
	if err := checkFileBytes(data); err != nil {
		return nil, err
	}
	corpus := &Corpus{}
	tally := map[string]int{}
	phase := 0
	sawUnknown := false
	sawHeader := false

	lines := bytes.Split(data[:len(data)-1], []byte("\n"))
	corpus.Lines = len(lines)
	for index, line := range lines {
		lineNo := index + 1
		if len(line) == 0 {
			return nil, fmt.Errorf("line %d: blank line; one record per line, no padding", lineNo)
		}
		value, err := ParseCanonical(line)
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", lineNo, err)
		}
		if value.Kind() != JSONObject {
			return nil, fmt.Errorf("line %d: record is a %s, not an object", lineNo, value.Kind())
		}
		name, err := stringMember(value, "record")
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", lineNo, err)
		}
		tally[name]++

		group := groupIndex(name)
		if group < 0 {
			// The add-only rule: an unrecognised record type inside a known
			// format is skipped, not fatal. It must still come after every
			// group this consumer knows, because add-only means appended.
			sawUnknown = true
			corpus.Unknown = append(corpus.Unknown, Skipped{Line: lineNo, Record: name, Value: value})
			continue
		}
		if sawUnknown {
			return nil, fmt.Errorf(
				"line %d: known record %q follows an unrecognised record type; add-only means appended after every known group",
				lineNo, name)
		}
		if group < phase {
			return nil, fmt.Errorf(
				"line %d: record %q appears after %q; the group order is fixed",
				lineNo, name, groupOrder[phase])
		}
		phase = group

		switch name {
		case RecordHeader:
			if sawHeader {
				return nil, fmt.Errorf("line %d: a second header record", lineNo)
			}
			if lineNo != 1 {
				return nil, fmt.Errorf("the header must be line 1; found it at line %d", lineNo)
			}
			sawHeader = true
			corpus.Header, err = decodeHeader(value)
		case RecordKind:
			var row Ranked
			row, err = decodeRanked(value, RecordKind)
			corpus.Kinds = append(corpus.Kinds, row)
		case RecordStage:
			var row Ranked
			row, err = decodeRanked(value, RecordStage)
			corpus.Stages = append(corpus.Stages, row)
		case RecordRefusal:
			var row RefusalRow
			row, err = decodeRefusal(value)
			corpus.Refusals = append(corpus.Refusals, row)
		case RecordType:
			var row TypeRow
			row, err = decodeType(value)
			corpus.Types = append(corpus.Types, row)
		case RecordEncoding:
			var row EncodingRow
			row, err = decodeEncoding(value)
			corpus.Encodings = append(corpus.Encodings, row)
		case RecordAdmission:
			var row AdmissionRow
			row, err = decodeAdmission(value)
			corpus.Admissions = append(corpus.Admissions, row)
		case RecordDoc:
			var row DocRow
			row, err = decodeDoc(value)
			corpus.Docs = append(corpus.Docs, row)
		case RecordCanon:
			var row CanonRow
			row, err = decodeCanon(value)
			corpus.Canons = append(corpus.Canons, row)
		case RecordProgram:
			var row ProgramRow
			row, err = decodeProgram(value)
			corpus.Programs = append(corpus.Programs, row)
		case RecordModelAdmission:
			// Recognised and deliberately not projected. The scope marking is
			// checked because it is the whole reason the row is exempt: a
			// model-internal row that lost its marking would be an ordinary
			// admission verdict wearing a group name, and a consumer that
			// dropped it silently would be dropping a claim it owed.
			var scope, rowName string
			scope, err = stringMember(value, "scope")
			if err == nil && scope != "model-internal" {
				err = fmt.Errorf(
					"model-admission record has scope %q, want \"model-internal\"", scope)
			}
			if err == nil {
				rowName, err = stringMember(value, "name")
			}
			if err == nil {
				corpus.ModelInternal = append(corpus.ModelInternal, ModelInternalRow{
					Line: lineNo, Name: rowName, Value: value,
				})
			}
		}
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", lineNo, err)
		}
	}
	if !sawHeader {
		return nil, fmt.Errorf("no header record")
	}
	if err := corpus.validate(tally); err != nil {
		return nil, err
	}
	return corpus, nil
}

// SkipLog reports the unrecognised record types the parse skipped, one line
// each, so the add-only rule's leniency is logged rather than silent.
func (c *Corpus) SkipLog() []string {
	log := make([]string, 0, len(c.Unknown))
	for _, skipped := range c.Unknown {
		log = append(log, fmt.Sprintf(
			"line %d: unrecognised record type %q, skipped (add-only rule)",
			skipped.Line, skipped.Record))
	}
	return log
}

func groupIndex(name string) int {
	for index, group := range groupOrder {
		if group == name {
			return index
		}
	}
	return -1
}

// checkFileBytes is the byte level: LF endings, ASCII, exactly one trailing
// newline, no empty line.
func checkFileBytes(data []byte) error {
	if len(data) == 0 {
		return fmt.Errorf("the corpus is empty")
	}
	if bytes.IndexByte(data, '\r') >= 0 {
		return fmt.Errorf("a CR byte is present at offset %d: the corpus uses LF line endings", bytes.IndexByte(data, '\r'))
	}
	if data[len(data)-1] != '\n' {
		return fmt.Errorf("the corpus does not end with a newline")
	}
	for offset, character := range data {
		if character > 0x7f {
			return fmt.Errorf("non-ASCII byte 0x%02x at offset %d: the corpus is ASCII-only by rule", character, offset)
		}
	}
	return nil
}

// Emit re-serializes the whole corpus from the parsed records. Nothing here
// echoes an input byte: every line is rebuilt from the decoded fields, which
// is what makes the both-ways law a claim about the reader rather than about
// a memcpy.
func (c *Corpus) Emit() ([]byte, error) {
	var out bytes.Buffer
	write := func(value JSONValue, err error) error {
		if err != nil {
			return err
		}
		line, err := value.Canonical()
		if err != nil {
			return err
		}
		out.Write(line)
		out.WriteByte('\n')
		return nil
	}
	if err := write(encodeHeader(c.Header)); err != nil {
		return nil, err
	}
	for _, row := range c.Kinds {
		if err := write(encodeRanked(row, RecordKind)); err != nil {
			return nil, err
		}
	}
	for _, row := range c.Stages {
		if err := write(encodeRanked(row, RecordStage)); err != nil {
			return nil, err
		}
	}
	for _, row := range c.Refusals {
		if err := write(encodeRefusal(row)); err != nil {
			return nil, err
		}
	}
	for _, row := range c.Types {
		if err := write(encodeType(row)); err != nil {
			return nil, err
		}
	}
	for _, row := range c.Encodings {
		if err := write(encodeEncoding(row)); err != nil {
			return nil, err
		}
	}
	for _, row := range c.Admissions {
		if err := write(encodeAdmission(row)); err != nil {
			return nil, err
		}
	}
	for _, row := range c.Docs {
		if err := write(encodeDoc(row)); err != nil {
			return nil, err
		}
	}
	for _, row := range c.Canons {
		if err := write(encodeCanon(row)); err != nil {
			return nil, err
		}
	}
	for _, row := range c.Programs {
		if err := write(encodeProgram(row)); err != nil {
			return nil, err
		}
	}
	for _, row := range c.ModelInternal {
		if err := write(row.Value, nil); err != nil {
			return nil, err
		}
	}
	for _, skipped := range c.Unknown {
		if err := write(skipped.Value, nil); err != nil {
			return nil, err
		}
	}
	return out.Bytes(), nil
}

// CheckBothWays enforces the both-ways law over a whole artifact:
//
//  1. parse then re-emit is byte-identical to the input, and
//  2. for every canon record, canonicalizing its value yields exactly its
//     bytes field, and for every program record, canonicalizing its
//     declaration yields exactly its bytes field.
//
// Half 1 subsumes the key-order, whitespace, escaping, and minimal-number
// checks, because a deviation in any of them changes a byte. Half 2 is the
// serializer checking itself against the model's own answer, in both the
// groups that carry their own bytes.
func CheckBothWays(data []byte) (*Corpus, error) {
	corpus, err := ParseCorpus(data)
	if err != nil {
		return nil, err
	}
	emitted, err := corpus.Emit()
	if err != nil {
		return nil, fmt.Errorf("re-emit: %w", err)
	}
	if !bytes.Equal(emitted, data) {
		return nil, fmt.Errorf(
			"both-ways law broken: re-emitting the parsed corpus is not the input (%d bytes in, %d bytes out, first difference at byte %d)",
			len(data), len(emitted), firstDifference(data, emitted))
	}
	for _, row := range corpus.Canons {
		canonical, err := row.Value.Canonical()
		if err != nil {
			return nil, fmt.Errorf("canon vector %q: %w", row.Name, err)
		}
		if string(canonical) != row.Bytes {
			return nil, fmt.Errorf(
				"canon vector %q: canonicalizing the value yields %s, the record declares %s",
				row.Name, string(canonical), row.Bytes)
		}
	}
	for _, row := range corpus.Programs {
		canonical, err := row.Declaration.Canonical()
		if err != nil {
			return nil, fmt.Errorf("program vector %q: %w", row.Name, err)
		}
		if string(canonical) != row.Bytes {
			return nil, fmt.Errorf(
				"program vector %q: canonicalizing the declaration yields %s, the record declares %s",
				row.Name, string(canonical), row.Bytes)
		}
	}
	return corpus, nil
}

func firstDifference(left, right []byte) int {
	limit := min(len(left), len(right))
	for index := 0; index < limit; index++ {
		if left[index] != right[index] {
			return index
		}
	}
	return limit
}

// ---------------------------------------------------------------------
// Member access. Every reader below refuses an absent or mistyped member
// rather than defaulting it: a zero value read from a malformed record is
// how a wrong table reaches production silently.
// ---------------------------------------------------------------------

func requireKeys(value JSONValue, want ...string) error {
	got := value.MemberNames()
	sorted := append([]string(nil), want...)
	sort.Strings(sorted)
	if strings.Join(got, ",") != strings.Join(sorted, ",") {
		return fmt.Errorf("record keys are [%s], want exactly [%s]",
			strings.Join(got, ","), strings.Join(sorted, ","))
	}
	return nil
}

func stringMember(value JSONValue, name string) (string, error) {
	member, ok := value.Member(name)
	if !ok {
		return "", fmt.Errorf("member %q is absent", name)
	}
	text, ok := member.Text()
	if !ok {
		return "", fmt.Errorf("member %q is a %s, not a string", name, member.Kind())
	}
	return text, nil
}

func natMember(value JSONValue, name string) (*big.Int, error) {
	member, ok := value.Member(name)
	if !ok {
		return nil, fmt.Errorf("member %q is absent", name)
	}
	number, ok := member.Int()
	if !ok {
		return nil, fmt.Errorf("member %q is a %s, not an integer", name, member.Kind())
	}
	return number, nil
}

// smallNatMember reads a count-sized natural. The wire domain is unbounded;
// a rank or a count that does not fit a Go int is a corpus defect, and it is
// named as one rather than truncated.
func smallNatMember(value JSONValue, name string) (int, error) {
	number, err := natMember(value, name)
	if err != nil {
		return 0, err
	}
	if !number.IsInt64() || number.Int64() > int64(^uint(0)>>1) {
		return 0, fmt.Errorf("member %q is %s, which does not fit a Go int", name, number)
	}
	return int(number.Int64()), nil
}

func arrayMember(value JSONValue, name string) ([]JSONValue, error) {
	member, ok := value.Member(name)
	if !ok {
		return nil, fmt.Errorf("member %q is absent", name)
	}
	items, ok := member.Items()
	if !ok {
		return nil, fmt.Errorf("member %q is a %s, not an array", name, member.Kind())
	}
	return items, nil
}

func natArrayMember(value JSONValue, name string) ([]*big.Int, error) {
	items, err := arrayMember(value, name)
	if err != nil {
		return nil, err
	}
	numbers := make([]*big.Int, 0, len(items))
	for index, item := range items {
		number, ok := item.Int()
		if !ok {
			return nil, fmt.Errorf("member %q element %d is a %s, not an integer", name, index, item.Kind())
		}
		numbers = append(numbers, number)
	}
	return numbers, nil
}

func natArrayValue(numbers []*big.Int) JSONValue {
	items := make([]JSONValue, 0, len(numbers))
	for _, number := range numbers {
		items = append(items, IntValue(number))
	}
	return ArrayValue(items...)
}

// ---------------------------------------------------------------------
// Per-record decode and encode. The two halves sit together on purpose: a
// field added to one and forgotten in the other breaks the both-ways law on
// the next run, which is the cheapest possible way to find out.
// ---------------------------------------------------------------------

func decodeHeader(value JSONValue) (Header, error) {
	if err := requireKeys(value, "counts", "format", "generator", "record", "source"); err != nil {
		return Header{}, err
	}
	format, err := smallNatMember(value, "format")
	if err != nil {
		return Header{}, err
	}
	if format != SupportedFormat {
		return Header{}, &FormatError{Found: format, Understood: SupportedFormat}
	}
	generator, err := stringMember(value, "generator")
	if err != nil {
		return Header{}, err
	}
	source, err := stringMember(value, "source")
	if err != nil {
		return Header{}, err
	}
	countsValue, ok := value.Member("counts")
	if !ok {
		return Header{}, fmt.Errorf("member \"counts\" is absent")
	}
	members, ok := countsValue.Members()
	if !ok {
		return Header{}, fmt.Errorf("member \"counts\" is a %s, not an object", countsValue.Kind())
	}
	counts := make([]Count, 0, len(members))
	for _, member := range members {
		number, ok := member.Value.Int()
		if !ok {
			return Header{}, fmt.Errorf("counts.%s is a %s, not an integer", member.Name, member.Value.Kind())
		}
		if !number.IsInt64() {
			return Header{}, fmt.Errorf("counts.%s is %s, which does not fit a Go int", member.Name, number)
		}
		counts = append(counts, Count{Group: member.Name, Value: int(number.Int64())})
	}
	return Header{Format: format, Generator: generator, Source: source, Counts: counts}, nil
}

func encodeHeader(header Header) (JSONValue, error) {
	members := make([]JSONMember, 0, len(header.Counts))
	for _, count := range header.Counts {
		members = append(members, JSONMember{Name: count.Group, Value: UintValue(uint64(count.Value))})
	}
	counts, err := ObjectValue(members...)
	if err != nil {
		return JSONValue{}, err
	}
	return ObjectValue(
		JSONMember{Name: "counts", Value: counts},
		JSONMember{Name: "format", Value: UintValue(uint64(header.Format))},
		JSONMember{Name: "generator", Value: StringValue(header.Generator)},
		JSONMember{Name: "record", Value: StringValue(RecordHeader)},
		JSONMember{Name: "source", Value: StringValue(header.Source)},
	)
}

func decodeRanked(value JSONValue, _ string) (Ranked, error) {
	if err := requireKeys(value, "name", "rank", "record"); err != nil {
		return Ranked{}, err
	}
	name, err := stringMember(value, "name")
	if err != nil {
		return Ranked{}, err
	}
	rank, err := smallNatMember(value, "rank")
	if err != nil {
		return Ranked{}, err
	}
	return Ranked{Name: name, Rank: rank}, nil
}

func encodeRanked(row Ranked, group string) (JSONValue, error) {
	return ObjectValue(
		JSONMember{Name: "name", Value: StringValue(row.Name)},
		JSONMember{Name: "rank", Value: UintValue(uint64(row.Rank))},
		JSONMember{Name: "record", Value: StringValue(group)},
	)
}

func decodeRefusal(value JSONValue) (RefusalRow, error) {
	if err := requireKeys(value, "applicability", "law", "reason", "record", "repair"); err != nil {
		return RefusalRow{}, err
	}
	var row RefusalRow
	var err error
	if row.Reason, err = stringMember(value, "reason"); err != nil {
		return RefusalRow{}, err
	}
	if row.Law, err = stringMember(value, "law"); err != nil {
		return RefusalRow{}, err
	}
	if row.Repair, err = stringMember(value, "repair"); err != nil {
		return RefusalRow{}, err
	}
	if row.Applicability, err = stringMember(value, "applicability"); err != nil {
		return RefusalRow{}, err
	}
	return row, nil
}

func encodeRefusal(row RefusalRow) (JSONValue, error) {
	return ObjectValue(
		JSONMember{Name: "applicability", Value: StringValue(row.Applicability)},
		JSONMember{Name: "law", Value: StringValue(row.Law)},
		JSONMember{Name: "reason", Value: StringValue(row.Reason)},
		JSONMember{Name: "record", Value: StringValue(RecordRefusal)},
		JSONMember{Name: "repair", Value: StringValue(row.Repair)},
	)
}

func decodeType(value JSONValue) (TypeRow, error) {
	if err := requireKeys(value, "constructors", "form", "name", "params", "record"); err != nil {
		return TypeRow{}, err
	}
	var row TypeRow
	var err error
	if row.Name, err = stringMember(value, "name"); err != nil {
		return TypeRow{}, err
	}
	if row.Form, err = stringMember(value, "form"); err != nil {
		return TypeRow{}, err
	}
	params, err := arrayMember(value, "params")
	if err != nil {
		return TypeRow{}, err
	}
	row.Params = make([]Param, 0, len(params))
	for index, item := range params {
		if err := requireKeys(item, "name", "role"); err != nil {
			return TypeRow{}, fmt.Errorf("params[%d]: %w", index, err)
		}
		name, err := stringMember(item, "name")
		if err != nil {
			return TypeRow{}, fmt.Errorf("params[%d]: %w", index, err)
		}
		role, err := stringMember(item, "role")
		if err != nil {
			return TypeRow{}, fmt.Errorf("params[%d]: %w", index, err)
		}
		row.Params = append(row.Params, Param{Name: name, Role: role})
	}
	ctors, err := arrayMember(value, "constructors")
	if err != nil {
		return TypeRow{}, err
	}
	row.Constructors = make([]Ctor, 0, len(ctors))
	for index, item := range ctors {
		if err := requireKeys(item, "fields", "name"); err != nil {
			return TypeRow{}, fmt.Errorf("constructors[%d]: %w", index, err)
		}
		name, err := stringMember(item, "name")
		if err != nil {
			return TypeRow{}, fmt.Errorf("constructors[%d]: %w", index, err)
		}
		fields, err := arrayMember(item, "fields")
		if err != nil {
			return TypeRow{}, fmt.Errorf("constructors[%d]: %w", index, err)
		}
		ctor := Ctor{Name: name, Fields: make([]Field, 0, len(fields))}
		for position, raw := range fields {
			if err := requireKeys(raw, "name", "type"); err != nil {
				return TypeRow{}, fmt.Errorf("constructors[%d].fields[%d]: %w", index, position, err)
			}
			fieldName, err := stringMember(raw, "name")
			if err != nil {
				return TypeRow{}, fmt.Errorf("constructors[%d].fields[%d]: %w", index, position, err)
			}
			fieldType, err := stringMember(raw, "type")
			if err != nil {
				return TypeRow{}, fmt.Errorf("constructors[%d].fields[%d]: %w", index, position, err)
			}
			ctor.Fields = append(ctor.Fields, Field{Name: fieldName, Type: fieldType})
		}
		row.Constructors = append(row.Constructors, ctor)
	}
	return row, nil
}

func encodeType(row TypeRow) (JSONValue, error) {
	params := make([]JSONValue, 0, len(row.Params))
	for _, param := range row.Params {
		encoded, err := ObjectValue(
			JSONMember{Name: "name", Value: StringValue(param.Name)},
			JSONMember{Name: "role", Value: StringValue(param.Role)},
		)
		if err != nil {
			return JSONValue{}, err
		}
		params = append(params, encoded)
	}
	ctors := make([]JSONValue, 0, len(row.Constructors))
	for _, ctor := range row.Constructors {
		fields := make([]JSONValue, 0, len(ctor.Fields))
		for _, field := range ctor.Fields {
			encoded, err := ObjectValue(
				JSONMember{Name: "name", Value: StringValue(field.Name)},
				JSONMember{Name: "type", Value: StringValue(field.Type)},
			)
			if err != nil {
				return JSONValue{}, err
			}
			fields = append(fields, encoded)
		}
		encoded, err := ObjectValue(
			JSONMember{Name: "fields", Value: ArrayValue(fields...)},
			JSONMember{Name: "name", Value: StringValue(ctor.Name)},
		)
		if err != nil {
			return JSONValue{}, err
		}
		ctors = append(ctors, encoded)
	}
	return ObjectValue(
		JSONMember{Name: "constructors", Value: ArrayValue(ctors...)},
		JSONMember{Name: "form", Value: StringValue(row.Form)},
		JSONMember{Name: "name", Value: StringValue(row.Name)},
		JSONMember{Name: "params", Value: ArrayValue(params...)},
		JSONMember{Name: "record", Value: StringValue(RecordType)},
	)
}

func decodeEncoding(value JSONValue) (EncodingRow, error) {
	if err := requireKeys(value, "act", "name", "record"); err != nil {
		return EncodingRow{}, err
	}
	name, err := stringMember(value, "name")
	if err != nil {
		return EncodingRow{}, err
	}
	act, err := natArrayMember(value, "act")
	if err != nil {
		return EncodingRow{}, err
	}
	return EncodingRow{Name: name, Act: act}, nil
}

func encodeEncoding(row EncodingRow) (JSONValue, error) {
	return ObjectValue(
		JSONMember{Name: "act", Value: natArrayValue(row.Act)},
		JSONMember{Name: "name", Value: StringValue(row.Name)},
		JSONMember{Name: "record", Value: StringValue(RecordEncoding)},
	)
}

func decodeAdmission(value JSONValue) (AdmissionRow, error) {
	verdict, err := stringMember(value, "verdict")
	if err != nil {
		return AdmissionRow{}, err
	}
	switch verdict {
	case "refused":
		if err := requireKeys(value, "name", "reason", "record", "verdict"); err != nil {
			return AdmissionRow{}, err
		}
		name, err := stringMember(value, "name")
		if err != nil {
			return AdmissionRow{}, err
		}
		reason, err := stringMember(value, "reason")
		if err != nil {
			return AdmissionRow{}, err
		}
		return AdmissionRow{Name: name, Verdict: verdict, Reason: reason}, nil
	case "admitted":
		if err := requireKeys(value, "encoded", "name", "record", "verdict"); err != nil {
			return AdmissionRow{}, err
		}
		name, err := stringMember(value, "name")
		if err != nil {
			return AdmissionRow{}, err
		}
		encoded, err := natArrayMember(value, "encoded")
		if err != nil {
			return AdmissionRow{}, err
		}
		return AdmissionRow{Name: name, Verdict: verdict, Encoded: encoded}, nil
	default:
		return AdmissionRow{}, fmt.Errorf("verdict %q is outside the closed set {refused, admitted}", verdict)
	}
}

func encodeAdmission(row AdmissionRow) (JSONValue, error) {
	if row.Verdict == "admitted" {
		return ObjectValue(
			JSONMember{Name: "encoded", Value: natArrayValue(row.Encoded)},
			JSONMember{Name: "name", Value: StringValue(row.Name)},
			JSONMember{Name: "record", Value: StringValue(RecordAdmission)},
			JSONMember{Name: "verdict", Value: StringValue(row.Verdict)},
		)
	}
	return ObjectValue(
		JSONMember{Name: "name", Value: StringValue(row.Name)},
		JSONMember{Name: "reason", Value: StringValue(row.Reason)},
		JSONMember{Name: "record", Value: StringValue(RecordAdmission)},
		JSONMember{Name: "verdict", Value: StringValue(row.Verdict)},
	)
}

func decodeDoc(value JSONValue) (DocRow, error) {
	if err := requireKeys(value, "doc", "name", "record", "target"); err != nil {
		return DocRow{}, err
	}
	var row DocRow
	var err error
	if row.Doc, err = stringMember(value, "doc"); err != nil {
		return DocRow{}, err
	}
	if row.Name, err = stringMember(value, "name"); err != nil {
		return DocRow{}, err
	}
	if row.Target, err = stringMember(value, "target"); err != nil {
		return DocRow{}, err
	}
	return row, nil
}

func encodeDoc(row DocRow) (JSONValue, error) {
	return ObjectValue(
		JSONMember{Name: "doc", Value: StringValue(row.Doc)},
		JSONMember{Name: "name", Value: StringValue(row.Name)},
		JSONMember{Name: "record", Value: StringValue(RecordDoc)},
		JSONMember{Name: "target", Value: StringValue(row.Target)},
	)
}

func decodeCanon(value JSONValue) (CanonRow, error) {
	if err := requireKeys(value, "bytes", "name", "record", "value"); err != nil {
		return CanonRow{}, err
	}
	var row CanonRow
	var err error
	if row.Bytes, err = stringMember(value, "bytes"); err != nil {
		return CanonRow{}, err
	}
	if row.Name, err = stringMember(value, "name"); err != nil {
		return CanonRow{}, err
	}
	inner, ok := value.Member("value")
	if !ok {
		return CanonRow{}, fmt.Errorf("member \"value\" is absent")
	}
	row.Value = inner
	return row, nil
}

func encodeCanon(row CanonRow) (JSONValue, error) {
	return ObjectValue(
		JSONMember{Name: "bytes", Value: StringValue(row.Bytes)},
		JSONMember{Name: "name", Value: StringValue(row.Name)},
		JSONMember{Name: "record", Value: StringValue(RecordCanon)},
		JSONMember{Name: "value", Value: row.Value},
	)
}
