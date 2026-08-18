// EXEMPLAR ONLY — not wired into any build, gate, module, or package.
// Nothing in scratch/km-polyglot is imported by go/, packages/, proto/,
// or verify/. This file is a demonstration that a schema-v1
// kernel-conformance artifact is mechanically consumable from Go.
//
// kmgen reads a schema-v1 NDJSON artifact, validates it against the
// frozen grammar (byte rules, key order, record order, header-count
// consistency), and emits a Go source file carrying the kind, stage,
// and refusal tables plus the brand types.
//
// Usage:
//
//	go run ./kmgen.go sample-kernel-conformance.ndjson kmconform
//
// Stdlib only. No module required.
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"go/format"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ---------------------------------------------------------------------
// The frozen grammar, as data.
// ---------------------------------------------------------------------

// keyOrder pins the exact key sequence of every record type. The freeze
// specifies key order and it is NOT alphabetical, so a consumer that
// decodes into a map and re-serializes cannot round-trip the artifact.
var keyOrder = map[string][]string{
	"header":             {"record", "format", "generator", "source", "counts"},
	"kind":               {"record", "name", "rank"},
	"stage":              {"record", "name", "rank"},
	"refusal":            {"record", "reason", "law", "repair", "applicability"},
	"type":               {"record", "name", "form", "params", "constructors"},
	"encoding":           {"record", "name", "act"},
	"admission:refused":  {"record", "name", "verdict", "reason"},
	"admission:admitted": {"record", "name", "verdict", "encoded"},
}

var countsKeyOrder = []string{"kind", "stage", "refusal", "type", "encoding", "admission"}

// recordOrder is the mandated file order of record types.
var recordOrder = []string{"header", "kind", "stage", "refusal", "type", "encoding", "admission"}

const supportedFormat = 1

// ---------------------------------------------------------------------
// Decoded records.
// ---------------------------------------------------------------------

type header struct {
	Format    int            `json:"format"`
	Generator string         `json:"generator"`
	Source    string         `json:"source"`
	Counts    map[string]int `json:"counts"`
}

type ranked struct {
	Name string `json:"name"`
	Rank int    `json:"rank"`
}

type refusal struct {
	Reason        string `json:"reason"`
	Law           string `json:"law"`
	Repair        string `json:"repair"`
	Applicability string `json:"applicability"`
}

type param struct {
	Name string `json:"name"`
	Role string `json:"role"`
}

type field struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type ctor struct {
	Name   string  `json:"name"`
	Fields []field `json:"fields"`
}

type declType struct {
	Name         string  `json:"name"`
	Form         string  `json:"form"`
	Params       []param `json:"params"`
	Constructors []ctor  `json:"constructors"`
}

type encoding struct {
	Name string   `json:"name"`
	Act  []uint64 `json:"act"`
}

type admission struct {
	Name    string   `json:"name"`
	Verdict string   `json:"verdict"`
	Reason  string   `json:"reason"`
	Encoded []uint64 `json:"encoded"`
}

type artifact struct {
	Head       header
	Kinds      []ranked
	Stages     []ranked
	Refusals   []refusal
	Types      []declType
	Encodings  []encoding
	Admissions []admission
}

// ---------------------------------------------------------------------
// Byte-level and grammar validation.
// ---------------------------------------------------------------------

// objectKeys walks one JSON object with the streaming decoder so the
// literal key order survives. A map decode would lose it.
func objectKeys(line []byte) ([]string, error) {
	dec := json.NewDecoder(bytes.NewReader(line))
	tok, err := dec.Token()
	if err != nil {
		return nil, err
	}
	if d, ok := tok.(json.Delim); !ok || d != '{' {
		return nil, fmt.Errorf("record is not a JSON object")
	}
	var keys []string
	depth := 0
	for dec.More() || depth > 0 {
		tok, err := dec.Token()
		if err != nil {
			return nil, err
		}
		if d, ok := tok.(json.Delim); ok {
			switch d {
			case '{', '[':
				depth++
			case '}', ']':
				depth--
				if depth < 0 {
					return keys, nil
				}
			}
			continue
		}
		if depth == 0 {
			key, ok := tok.(string)
			if !ok {
				return nil, fmt.Errorf("expected a key, got %v", tok)
			}
			keys = append(keys, key)
			// Consume the value; a composite value bumps depth on its
			// opening delimiter in the branch above.
			if !dec.More() {
				break
			}
			vtok, err := dec.Token()
			if err != nil {
				return nil, err
			}
			if d, ok := vtok.(json.Delim); ok && (d == '{' || d == '[') {
				depth++
			}
		}
	}
	return keys, nil
}

func checkBytes(raw []byte) error {
	if bytes.ContainsRune(raw, '\r') {
		return fmt.Errorf("CR byte present: the artifact must use LF line endings")
	}
	if len(raw) == 0 || raw[len(raw)-1] != '\n' {
		return fmt.Errorf("artifact does not end with a newline")
	}
	for i, b := range raw {
		if b > 0x7f {
			return fmt.Errorf("non-ASCII byte 0x%02x at offset %d", b, i)
		}
	}
	return nil
}

// checkNoFloat refuses any JSON number carrying a decimal point or an
// exponent. Every numeric position in schema v1 is a Nat.
func checkNoFloat(line []byte, lineNo int) error {
	dec := json.NewDecoder(bytes.NewReader(line))
	dec.UseNumber()
	for {
		tok, err := dec.Token()
		if err != nil {
			return nil // end of line; malformed JSON is caught elsewhere
		}
		if n, ok := tok.(json.Number); ok {
			s := n.String()
			if strings.ContainsAny(s, ".eE") || strings.HasPrefix(s, "-") {
				return fmt.Errorf("line %d: %q is not a Nat", lineNo, s)
			}
		}
	}
}

func load(path string) (*artifact, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if err := checkBytes(raw); err != nil {
		return nil, err
	}

	art := &artifact{}
	seenHeader := false
	phase := 0 // index into recordOrder

	scanner := bufio.NewScanner(bytes.NewReader(raw))
	scanner.Buffer(make([]byte, 0, 1<<20), 1<<22)
	lineNo := 0
	for scanner.Scan() {
		lineNo++
		line := scanner.Bytes()
		if len(line) == 0 {
			return nil, fmt.Errorf("line %d: blank line (one record per line, no padding)", lineNo)
		}
		if err := checkNoFloat(line, lineNo); err != nil {
			return nil, err
		}

		var probe struct {
			Record  string `json:"record"`
			Verdict string `json:"verdict"`
		}
		if err := json.Unmarshal(line, &probe); err != nil {
			return nil, fmt.Errorf("line %d: %w", lineNo, err)
		}

		// Record order: the type must be at or after the current phase.
		idx := -1
		for i, r := range recordOrder {
			if r == probe.Record {
				idx = i
			}
		}
		if idx < 0 {
			// Add-only discipline: an unknown record type inside a known
			// format is skippable, not fatal.
			fmt.Fprintf(os.Stderr, "note: line %d: unknown record type %q, skipped (add-only rule)\n", lineNo, probe.Record)
			continue
		}
		if idx < phase {
			return nil, fmt.Errorf("line %d: record %q appears after %q; file order is fixed", lineNo, probe.Record, recordOrder[phase])
		}
		phase = idx

		// Key order.
		shape := probe.Record
		if probe.Record == "admission" {
			shape = "admission:" + probe.Verdict
		}
		want, known := keyOrder[shape]
		if !known {
			return nil, fmt.Errorf("line %d: no key order pinned for %q", lineNo, shape)
		}
		got, err := objectKeys(line)
		if err != nil {
			return nil, fmt.Errorf("line %d: %w", lineNo, err)
		}
		if strings.Join(got, ",") != strings.Join(want, ",") {
			return nil, fmt.Errorf("line %d: key order is [%s], want [%s]", lineNo, strings.Join(got, ","), strings.Join(want, ","))
		}

		switch probe.Record {
		case "header":
			if seenHeader {
				return nil, fmt.Errorf("line %d: a second header record", lineNo)
			}
			seenHeader = true
			if lineNo != 1 {
				return nil, fmt.Errorf("the header must be line 1, found it at line %d", lineNo)
			}
			if err := json.Unmarshal(line, &art.Head); err != nil {
				return nil, err
			}
			if art.Head.Format != supportedFormat {
				return nil, fmt.Errorf("format %d is not supported (this consumer knows format %d); refusing", art.Head.Format, supportedFormat)
			}
			gotCounts, err := objectKeys(mustField(line, "counts"))
			if err != nil {
				return nil, err
			}
			if strings.Join(gotCounts, ",") != strings.Join(countsKeyOrder, ",") {
				return nil, fmt.Errorf("counts key order is [%s], want [%s]", strings.Join(gotCounts, ","), strings.Join(countsKeyOrder, ","))
			}
		case "kind":
			var r ranked
			if err := json.Unmarshal(line, &r); err != nil {
				return nil, err
			}
			art.Kinds = append(art.Kinds, r)
		case "stage":
			var r ranked
			if err := json.Unmarshal(line, &r); err != nil {
				return nil, err
			}
			art.Stages = append(art.Stages, r)
		case "refusal":
			var r refusal
			if err := json.Unmarshal(line, &r); err != nil {
				return nil, err
			}
			if r.Applicability != "machine-applicable" && r.Applicability != "advisory" {
				return nil, fmt.Errorf("line %d: applicability %q is outside the closed set", lineNo, r.Applicability)
			}
			art.Refusals = append(art.Refusals, r)
		case "type":
			var t declType
			if err := json.Unmarshal(line, &t); err != nil {
				return nil, err
			}
			if t.Form != "inductive" && t.Form != "structure" {
				return nil, fmt.Errorf("line %d: form %q is outside the closed set", lineNo, t.Form)
			}
			for _, p := range t.Params {
				if p.Role != "brand" && p.Role != "type" {
					return nil, fmt.Errorf("line %d: param role %q is outside the closed set", lineNo, p.Role)
				}
			}
			art.Types = append(art.Types, t)
		case "encoding":
			var e encoding
			if err := json.Unmarshal(line, &e); err != nil {
				return nil, err
			}
			art.Encodings = append(art.Encodings, e)
		case "admission":
			var a admission
			if err := json.Unmarshal(line, &a); err != nil {
				return nil, err
			}
			if a.Verdict != "refused" && a.Verdict != "admitted" {
				return nil, fmt.Errorf("line %d: verdict %q is outside the closed set", lineNo, a.Verdict)
			}
			art.Admissions = append(art.Admissions, a)
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	if !seenHeader {
		return nil, fmt.Errorf("no header record")
	}
	return art, validate(art)
}

// mustField re-extracts one object-valued field as raw bytes so its own
// key order can be checked.
func mustField(line []byte, name string) []byte {
	var m map[string]json.RawMessage
	if err := json.Unmarshal(line, &m); err != nil {
		return []byte("{}")
	}
	if v, ok := m[name]; ok {
		return v
	}
	return []byte("{}")
}

func validate(art *artifact) error {
	// Header counts must equal emitted record counts.
	actual := map[string]int{
		"kind":      len(art.Kinds),
		"stage":     len(art.Stages),
		"refusal":   len(art.Refusals),
		"type":      len(art.Types),
		"encoding":  len(art.Encodings),
		"admission": len(art.Admissions),
	}
	keys := make([]string, 0, len(actual))
	for k := range actual {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		declared, ok := art.Head.Counts[k]
		if !ok {
			return fmt.Errorf("header counts omit %q", k)
		}
		if declared != actual[k] {
			return fmt.Errorf("header declares %d %s records, file carries %d", declared, k, actual[k])
		}
	}
	if len(art.Head.Counts) != len(actual) {
		return fmt.Errorf("header counts carry %d entries, want %d", len(art.Head.Counts), len(actual))
	}

	// Ranks are dense and ascending from zero.
	for _, set := range []struct {
		what string
		rows []ranked
	}{{"kind", art.Kinds}, {"stage", art.Stages}} {
		for i, r := range set.rows {
			if r.Rank != i {
				return fmt.Errorf("%s %q has rank %d at position %d; ranks must be dense and ascending from zero", set.what, r.Name, r.Rank, i)
			}
		}
	}

	// Refusal reasons are unique.
	seen := map[string]bool{}
	for _, r := range art.Refusals {
		if seen[r.Reason] {
			return fmt.Errorf("duplicate refusal reason %q", r.Reason)
		}
		seen[r.Reason] = true
		if r.Law == "" || r.Repair == "" {
			return fmt.Errorf("refusal %q is missing a law or a repair; refusal parity is total", r.Reason)
		}
	}

	// Every admission reason names a refusal row.
	admitted := 0
	for _, a := range art.Admissions {
		switch a.Verdict {
		case "refused":
			if !seen[a.Reason] {
				return fmt.Errorf("admission %q refuses with %q, which has no refusal row", a.Name, a.Reason)
			}
		case "admitted":
			admitted++
			if len(a.Encoded) == 0 {
				return fmt.Errorf("admitted row %q carries no encoding", a.Name)
			}
		}
	}
	if admitted == 0 {
		return fmt.Errorf("no admitted row: a door that refuses everything proves nothing")
	}

	// Every type reference resolves to a declared type, a leaf, or a
	// declared alias. Ref is an abbrev in the model with no type record.
	declared := map[string]bool{"Nat": true, "String": true, "Ref": true}
	for _, t := range art.Types {
		declared[t.Name] = true
	}
	for _, t := range art.Types {
		for _, c := range t.Constructors {
			for _, f := range c.Fields {
				head := typeHead(f.Type)
				if head == "List" || head == "Option" {
					head = typeHead(typeArg(f.Type))
				}
				if !declared[head] {
					return fmt.Errorf("type %s.%s.%s references undeclared type %q", t.Name, c.Name, f.Name, head)
				}
			}
		}
	}
	return nil
}

// typeHead splits "Digest(program)" into "Digest".
func typeHead(ref string) string {
	if i := strings.IndexByte(ref, '('); i >= 0 {
		return ref[:i]
	}
	return ref
}

// typeArg splits "List(RawArg)" into "RawArg".
func typeArg(ref string) string {
	i := strings.IndexByte(ref, '(')
	j := strings.LastIndexByte(ref, ')')
	if i < 0 || j <= i {
		return ref
	}
	return ref[i+1 : j]
}

// ---------------------------------------------------------------------
// Go rendering.
// ---------------------------------------------------------------------

func exported(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func quote(s string) string { return strconv_Quote(s) }

// strconv_Quote is spelled out rather than imported so the generated
// escaping discipline is visible: the artifact is ASCII, so Go's
// default quoting is a faithful round-trip.
func strconv_Quote(s string) string {
	var b strings.Builder
	b.WriteByte('"')
	for i := 0; i < len(s); i++ {
		switch c := s[i]; c {
		case '"':
			b.WriteString("\\\"")
		case '\\':
			b.WriteString("\\\\")
		default:
			if c < 0x20 {
				fmt.Fprintf(&b, "\\x%02x", c)
			} else {
				b.WriteByte(c)
			}
		}
	}
	b.WriteByte('"')
	return b.String()
}

func render(art *artifact, srcPath string) string {
	var b strings.Builder
	p := func(format string, args ...any) { fmt.Fprintf(&b, format+"\n", args...) }

	p("// Code generated by scratch/km-polyglot/kmgen.go from %s (schema v1).", filepath.Base(srcPath))
	p("// DO NOT EDIT.")
	p("//")
	p("// EXEMPLAR ONLY. Nothing imports this package. It exists to show that a")
	p("// schema-v1 kernel-conformance artifact drives a Go type layer")
	p("// mechanically. It is a demonstration, not a runtime, and it promotes no")
	p("// runtime guarantee: the model's theorems are about the model.")
	p("")
	p("package kmconform")
	p("")
	p("import \"fmt\"")
	p("")
	p("// Source names the model this table was emitted from.")
	p("const (")
	p("\tSource    = %s", quote(art.Head.Source))
	p("\tGenerator = %s", quote(art.Head.Generator))
	p("\tFormat    = %d", art.Head.Format)
	p(")")
	p("")

	// DeclKind.
	p("// DeclKind is the closed universe of declaration kinds. The numeric")
	p("// value is the model's rank, so it is wire-stable within a format.")
	p("type DeclKind uint8")
	p("")
	p("const (")
	for _, k := range art.Kinds {
		p("\tKind%s DeclKind = %d", exported(k.Name), k.Rank)
	}
	p(")")
	p("")
	p("var declKindNames = [...]string{")
	for _, k := range art.Kinds {
		p("\t%s,", quote(k.Name))
	}
	p("}")
	p("")
	p("func (k DeclKind) String() string {")
	p("\tif int(k) >= len(declKindNames) {")
	p("\t\treturn fmt.Sprintf(\"DeclKind(%%d)\", uint8(k))")
	p("\t}")
	p("\treturn declKindNames[k]")
	p("}")
	p("")
	p("// DeclKindFromRank is the decode half of the rank. It refuses an")
	p("// out-of-range rank rather than saturating.")
	p("func DeclKindFromRank(rank uint8) (DeclKind, bool) {")
	p("\tif int(rank) >= len(declKindNames) {")
	p("\t\treturn 0, false")
	p("\t}")
	p("\treturn DeclKind(rank), true")
	p("}")
	p("")

	// HoleStage.
	p("// HoleStage is the epistemic stage of a hole, in rising rank order.")
	p("type HoleStage uint8")
	p("")
	p("const (")
	for _, s := range art.Stages {
		p("\tStage%s HoleStage = %d", exported(s.Name), s.Rank)
	}
	p(")")
	p("")
	p("var holeStageNames = [...]string{")
	for _, s := range art.Stages {
		p("\t%s,", quote(s.Name))
	}
	p("}")
	p("")
	p("func (s HoleStage) String() string {")
	p("\tif int(s) >= len(holeStageNames) {")
	p("\t\treturn fmt.Sprintf(\"HoleStage(%%d)\", uint8(s))")
	p("\t}")
	p("\treturn holeStageNames[s]")
	p("}")
	p("")
	p("// Reached reports whether s is at least target. A hole production")
	p("// observes rank only in the reached-at-least direction.")
	p("func (s HoleStage) Reached(target HoleStage) bool { return s >= target }")
	p("")

	// Applicability and refusals.
	p("// Applicability marks whether a taught repair is a function of the")
	p("// refused candidate alone.")
	p("type Applicability uint8")
	p("")
	p("const (")
	p("\tMachineApplicable Applicability = iota")
	p("\tAdvisory")
	p(")")
	p("")
	p("func (a Applicability) String() string {")
	p("\tif a == MachineApplicable {")
	p("\t\treturn \"machine-applicable\"")
	p("\t}")
	p("\treturn \"advisory\"")
	p("}")
	p("")
	p("// RefusalReason indexes the taught table. The numeric value is this")
	p("// table's position, not a model rank; compare by Wire across versions.")
	p("type RefusalReason uint8")
	p("")
	p("const (")
	for i, r := range art.Refusals {
		p("\tReason%s RefusalReason = %d", exported(goIdent(r.Reason)), i)
	}
	p(")")
	p("")
	p("// Refusal is one row of the taught table: the reason, the law it")
	p("// defends, the taught repair, and how the repair may be applied.")
	p("// The door never refuses without teaching the legal next move.")
	p("type Refusal struct {")
	p("\tReason        RefusalReason")
	p("\tWire          string")
	p("\tLaw           string")
	p("\tRepair        string")
	p("\tApplicability Applicability")
	p("}")
	p("")
	p("// RefusalTable is the taught table, in the model's declaration order.")
	p("var RefusalTable = [...]Refusal{")
	for i, r := range art.Refusals {
		app := "Advisory"
		if r.Applicability == "machine-applicable" {
			app = "MachineApplicable"
		}
		p("\t{")
		p("\t\tReason:        %d,", i)
		p("\t\tWire:          %s,", quote(r.Reason))
		p("\t\tLaw:           %s,", quote(r.Law))
		p("\t\tRepair:        %s,", quote(r.Repair))
		p("\t\tApplicability: %s,", app)
		p("\t},")
	}
	p("}")
	p("")
	p("// Taught returns the row a reason carries. Total by construction: a")
	p("// reason without its law and repair cannot exist in this table.")
	p("func Taught(r RefusalReason) Refusal { return RefusalTable[r] }")
	p("")
	p("// RefusalByWire resolves a wire reason. Unknown reasons are refused,")
	p("// never defaulted.")
	p("func RefusalByWire(wire string) (RefusalReason, bool) {")
	p("\tfor i := range RefusalTable {")
	p("\t\tif RefusalTable[i].Wire == wire {")
	p("\t\t\treturn RefusalReason(i), true")
	p("\t\t}")
	p("\t}")
	p("\treturn 0, false")
	p("}")
	p("")
	p("// RefusalError carries a taught refusal as a Go error, so the taught")
	p("// table becomes the caller-facing diagnostic vocabulary.")
	p("type RefusalError struct{ Refusal Refusal }")
	p("")
	p("func (e RefusalError) Error() string {")
	p("\treturn e.Refusal.Wire + \": \" + e.Refusal.Law + \" [repair: \" + e.Refusal.Repair + \"]\"")
	p("}")
	p("")
	p("// Refuse mints the error for a reason.")
	p("func Refuse(r RefusalReason) error { return RefusalError{Taught(r)} }")
	p("")

	// Brand types, one defined type per kind.
	p("// ---- Brand types ----")
	p("//")
	p("// The model brands a digest by the kind of declaration it names, and")
	p("// the comparison of two differently branded digests HAS NO TYPE: the")
	p("// Lean elaborator refuses it. Go's nearest equivalent is one defined")
	p("// type per kind. `KindProgramDigest == KindPolicyDigest` is a compile")
	p("// error (mismatched types), which is the enforcement this layer buys.")
	p("//")
	p("// What it does NOT buy, stated plainly:")
	p("//   - an untyped constant compares against any brand (`d == 3` compiles);")
	p("//   - an explicit conversion crosses any brand (`PolicyDigest(p)`);")
	p("//   - value-level brands (a token's register, a position's partition)")
	p("//     cannot be type indices in Go, so they ride as unexported data and")
	p("//     the elaborator's refusal becomes a run-time check below.")
	for _, k := range art.Kinds {
		p("type %sDigest uint64", exported(k.Name))
	}
	p("")
	p("// The constructor discipline: a digest is minted only from a resolved")
	p("// identifier, never from an arbitrary integer at a call site. Nothing")
	p("// mints a name.")
	for _, k := range art.Kinds {
		p("func New%sDigest(id uint64) %sDigest { return %sDigest(id) }", exported(k.Name), exported(k.Name), exported(k.Name))
	}
	p("")
	p("// Token is register-branded in the model: the register is part of the")
	p("// token's TYPE, so a cross-register comparison fails to elaborate. Go")
	p("// cannot index a type by a value, so the register rides as unexported")
	p("// data and the refusal is a run-time check.")
	p("type Token struct {")
	p("\tregister ProgramDigest")
	p("\tvalue    uint64")
	p("}")
	p("")
	p("// NewToken pins the issuing register at construction.")
	p("func NewToken(register ProgramDigest, value uint64) Token {")
	p("\treturn Token{register: register, value: value}")
	p("}")
	p("")
	p("// Spend refuses a token presented at a register that did not issue it.")
	p("// In the model this is the must-not-compile row cross-register-token.")
	p("func (t Token) Spend(register ProgramDigest) (uint64, error) {")
	p("\tif t.register != register {")
	p("\t\treturn 0, Refuse(ReasonCrossSortIdentifier)")
	p("\t}")
	p("\treturn t.value, nil")
	p("}")
	p("")
	p("// LanePartition is the venue-local shard of an evidence stream.")
	p("type LanePartition struct {")
	p("\tLane  LaneDigest")
	p("\tShard uint64")
	p("}")
	p("")
	p("// Position is partition-branded in the model. Same story as Token: the")
	p("// partition rides as data and the refusal is a run-time check.")
	p("type Position struct {")
	p("\tpartition LanePartition")
	p("\tvalue     uint64")
	p("}")
	p("")
	p("func NewPosition(partition LanePartition, value uint64) Position {")
	p("\treturn Position{partition: partition, value: value}")
	p("}")
	p("")
	p("// Compare refuses two positions denominated in different partitions —")
	p("// the proven-but-vacuous-bound failure the model gives no syntax.")
	p("func (p Position) Compare(other Position) (int, error) {")
	p("\tif p.partition != other.partition {")
	p("\t\treturn 0, Refuse(ReasonCrossSortIdentifier)")
	p("\t}")
	p("\tswitch {")
	p("\tcase p.value < other.value:")
	p("\t\treturn -1, nil")
	p("\tcase p.value > other.value:")
	p("\t\treturn 1, nil")
	p("\tdefault:")
	p("\t\treturn 0, nil")
	p("\t}")
	p("}")
	p("")

	// Conformance vectors.
	p("// ---- Conformance vectors ----")
	p("//")
	p("// These are the model's own outputs. A consumer tests its door against")
	p("// them verdict for verdict. They check a runtime against the model's")
	p("// verdicts; they do not promote model theorems into runtime guarantees.")
	p("")
	p("// EncodingVector is one canonical sentence framing.")
	p("type EncodingVector struct {")
	p("\tName string")
	p("\tAct  []uint64")
	p("}")
	p("")
	p("var EncodingVectors = []EncodingVector{")
	for _, e := range art.Encodings {
		p("\t{Name: %s, Act: []uint64{%s}},", quote(e.Name), joinNats(e.Act))
	}
	p("}")
	p("")
	p("// AdmissionVector is one planted candidate and the door's verdict.")
	p("type AdmissionVector struct {")
	p("\tName     string")
	p("\tAdmitted bool")
	p("\tReason   string")
	p("\tEncoded  []uint64")
	p("}")
	p("")
	p("var AdmissionVectors = []AdmissionVector{")
	for _, a := range art.Admissions {
		if a.Verdict == "admitted" {
			p("\t{Name: %s, Admitted: true, Encoded: []uint64{%s}},", quote(a.Name), joinNats(a.Encoded))
		} else {
			p("\t{Name: %s, Admitted: false, Reason: %s},", quote(a.Name), quote(a.Reason))
		}
	}
	p("}")
	p("")
	p("// MachineApplicableRepairs is the codemod catalog: the repairs that are")
	p("// a function of the refused candidate alone.")
	p("func MachineApplicableRepairs() []Refusal {")
	p("\tvar out []Refusal")
	p("\tfor _, r := range RefusalTable {")
	p("\t\tif r.Applicability == MachineApplicable {")
	p("\t\t\tout = append(out, r)")
	p("\t\t}")
	p("\t}")
	p("\treturn out")
	p("}")

	return b.String()
}

func goIdent(wire string) string {
	parts := strings.Split(wire, "-")
	for i, p := range parts {
		parts[i] = exported(p)
	}
	return strings.Join(parts, "")
}

func joinNats(xs []uint64) string {
	strs := make([]string, len(xs))
	for i, x := range xs {
		strs[i] = fmt.Sprintf("%d", x)
	}
	return strings.Join(strs, ", ")
}

// ---------------------------------------------------------------------

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: go run ./kmgen.go <schema-v1.ndjson> <outdir>")
		os.Exit(2)
	}
	src, outdir := os.Args[1], os.Args[2]

	art, err := load(src)
	if err != nil {
		fmt.Fprintf(os.Stderr, "REFUSED: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("read %s: format=%d source=%s\n", src, art.Head.Format, art.Head.Source)
	fmt.Printf("validated: %d kinds, %d stages, %d refusals, %d types, %d encodings, %d admissions\n",
		len(art.Kinds), len(art.Stages), len(art.Refusals), len(art.Types), len(art.Encodings), len(art.Admissions))

	machine := 0
	for _, r := range art.Refusals {
		if r.Applicability == "machine-applicable" {
			machine++
		}
	}
	fmt.Printf("taught table: %d machine-applicable repairs, %d advisory\n", machine, len(art.Refusals)-machine)

	if err := os.MkdirAll(outdir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "REFUSED: %v\n", err)
		os.Exit(1)
	}
	out := filepath.Join(outdir, "kmconform_exemplar.go")
	// Canonical formatting is part of the artifact discipline: a
	// generated file that is not gofmt-canonical cannot be regenerated
	// byte-identically by anyone who runs gofmt on it.
	formatted, err := format.Source([]byte(render(art, src)))
	if err != nil {
		fmt.Fprintf(os.Stderr, "REFUSED: generated source does not parse: %v\n", err)
		os.Exit(1)
	}
	body := string(formatted)
	if err := os.WriteFile(out, []byte(body), 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "REFUSED: %v\n", err)
		os.Exit(1)
	}
	modPath := filepath.Join(outdir, "go.mod")
	if _, err := os.Stat(modPath); os.IsNotExist(err) {
		_ = os.WriteFile(modPath, []byte("// EXEMPLAR ONLY: an isolated module so the generated package can be\n// vetted and built without joining any real module.\nmodule kmconform\n\ngo 1.26\n"), 0o644)
	}
	fmt.Printf("wrote %s (%d bytes)\n", out, len(body))
}
