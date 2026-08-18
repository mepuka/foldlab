package kmconform

// The program group: the ninth corpus group, and the DAG builder's
// interchange form.
//
// A program record carries a named declaration and that declaration's own
// canonical bytes, so the corpus self-tests every consumer the way the canon
// group does: canonicalizing the declaration must reproduce the bytes member
// exactly. The difference is that a declaration is not arbitrary JSON — it has
// a grammar, and this file decodes it into that grammar and re-emits from the
// decoded fields, so a member this reader drops breaks the both-ways law on
// the next run rather than surviving as a byte this reader echoed.
//
// The shape, per the program-group freeze:
//
//	{"bytes":"<canonical serialization of the declaration>",
//	 "declaration":{"edges":[...],"holes":[...],"lineage":[...],"nodes":[...]},
//	 "name":"<vector name>","record":"program"}
//
// Four laws ride on the declaration and are checked in validate.go:
//
//   - NODES ARE NEWEST-FIRST, the house ledger orientation, matching
//     Kernel.ProgramNode lists. A local reference therefore names a node
//     STRICTLY LATER in the list — that is exactly Kernel.ProgramAdmission,
//     and CheckAdmission is its Go reading.
//   - THE EDGE SET IS DERIVED. Every edge is one consumption: from is the
//     consuming (younger) node, to is the consumed (older) one, and the set
//     must equal exactly what the local argrefs imply. An emitter that drops
//     an edge, or invents one, disagrees with its own nodes.
//   - HOLES ASCEND by name, and every hole argref names a declared hole.
//   - ARGS ARE KEYED BY THE GENERATOR'S OWN FIELD NAMES, taken from the
//     corpus's mini-AST record for Kernel.Act rather than retyped here. A
//     key the generator does not declare is refused.
//
// Digests are identity labels — unbounded non-negative integers, as
// everywhere in the model. Real hashing is the runtime's trusted base and
// nothing here claims otherwise. Nothing here executes anything either: a
// declaration is a declaration, never an execution record.

import (
	"fmt"
	"math/big"
	"strings"
)

// The argref tags. An argument is a tagged reference and never a value the
// declaration carries inline: computation is referenced, never embedded.
const (
	// ArgDigest names something outside the declaration by content address,
	// carrying the kind of thing it names.
	ArgDigest = "digest"
	// ArgLocal names an earlier (older) node of this same declaration. Every
	// local reference is one edge.
	ArgLocal = "local"
	// ArgLiteral is an inline natural.
	ArgLiteral = "literal"
	// ArgHole names a declared parameter of the program. THE FREEZE IS SILENT
	// on this tag — it enumerates digest, local, and literal — and yet it also
	// requires a one-hole vector and its filled twin, which cannot differ
	// unless a hole can stand where an argument stands. The emitted corpus
	// settles it: the holey vector spells the fourth tag exactly as below.
	// This consumer refuses any other spelling rather than guessing at one.
	ArgHole = "hole"
)

// declarationKeys, nodeKeys, edgeKeys, holeKeys are the exact member sets of
// each level of a declaration. Exact, not minimum: an unrecognised member
// inside a declaration is a producer this consumer does not understand, and
// the add-only leniency of the format applies to RECORD GROUPS, never to the
// inside of a record.
var (
	declarationKeys = []string{"edges", "holes", "lineage", "nodes"}
	nodeKeys        = []string{"args", "generator", "name"}
	edgeKeys        = []string{"from", "to"}
	holeKeys        = []string{"name", "schema"}
)

// ArgRef is one tagged argument reference. Exactly one shape's fields are
// populated, selected by Arg.
type ArgRef struct {
	Arg string
	// Kind and ID carry a digest reference.
	Kind string
	ID   *big.Int
	// Name carries a local reference or a hole.
	Name *big.Int
	// Value carries a literal.
	Value *big.Int
}

// NodeArg is one generator argument: the generator's own field name, and the
// reference bound to it.
type NodeArg struct {
	Field string
	Ref   ArgRef
}

// ProgramNodeRow is one node of a declaration: a program-scoped name, the
// generator it applies, and its arguments by field name.
type ProgramNodeRow struct {
	Name      *big.Int
	Generator string
	Args      []NodeArg
}

// ProgramEdge is one consumption made explicit: From is the consuming
// (younger) node, To the consumed (older) one.
type ProgramEdge struct {
	From *big.Int
	To   *big.Int
}

// ProgramHole is one declared parameter: its name and the digest of the
// schema it is typed by.
type ProgramHole struct {
	Name   *big.Int
	Schema *big.Int
}

// ProgramDeclaration is the canonical program value of the builder freeze.
type ProgramDeclaration struct {
	Edges   []ProgramEdge
	Holes   []ProgramHole
	Lineage []*big.Int
	Nodes   []ProgramNodeRow
}

// ProgramRow is one program record: a named declaration and its own canonical
// bytes.
type ProgramRow struct {
	Name        string
	Bytes       string
	Declaration ProgramDeclaration
}

// Valuation fills holes by name. The key is the hole name in minimal decimal,
// because a *big.Int cannot be a Go map key and rendering it is the only
// spelling that cannot collide.
type Valuation map[string]*big.Int

// ValuationOf builds a valuation from name/value pairs.
func ValuationOf(pairs ...[2]uint64) Valuation {
	valuation := Valuation{}
	for _, pair := range pairs {
		valuation[new(big.Int).SetUint64(pair[0]).String()] =
			new(big.Int).SetUint64(pair[1])
	}
	return valuation
}

// Uses is the node's consumptions, oldest reference first in argument order,
// deduplicated. It is the ProgramNode.uses of the model's erasure.
func (n ProgramNodeRow) Uses() []*big.Int {
	seen := map[string]bool{}
	uses := make([]*big.Int, 0, len(n.Args))
	for _, arg := range n.Args {
		if arg.Ref.Arg != ArgLocal || arg.Ref.Name == nil {
			continue
		}
		key := arg.Ref.Name.String()
		if seen[key] {
			continue
		}
		seen[key] = true
		uses = append(uses, arg.Ref.Name)
	}
	return uses
}

// CheckAdmission is the Go reading of Kernel.ProgramAdmission over the
// erasure of a declaration: reading the newest-first node list from the
// oldest end, every consumption names a node already admitted, and a name
// admits at most once.
//
// What it covers and what it does not: admission depends on names and uses
// alone, and both survive the erasure exactly, so this IS the model's
// predicate rather than an approximation of it. The rest of the erasure — the
// positional flattening of args into Kernel.RawArg — carries no admission
// obligation and is not reconstructed here.
func (d ProgramDeclaration) CheckAdmission() error {
	admitted := map[string]bool{}
	// Oldest first: the list is newest-first, so walk it backwards.
	for index := len(d.Nodes) - 1; index >= 0; index-- {
		node := d.Nodes[index]
		if node.Name == nil {
			return fmt.Errorf("node at position %d carries no name", index)
		}
		name := node.Name.String()
		if admitted[name] {
			return fmt.Errorf(
				"node name %s admits twice; a name admits at most once", name)
		}
		for _, use := range node.Uses() {
			if !admitted[use.String()] {
				return fmt.Errorf(
					"node %s consumes %s, which is not an already-admitted node; "+
						"nodes are newest-first, so a consumed node stands strictly later in the list",
					name, use)
			}
		}
		admitted[name] = true
	}
	return nil
}

// DerivedEdges is the edge set the local argrefs imply, in node order
// (newest-first, argument order within a node). Duplicated consumptions
// collapse: an edge is a relation between two nodes, so consuming one node
// through two arguments is still one edge.
func (d ProgramDeclaration) DerivedEdges() []ProgramEdge {
	seen := map[string]bool{}
	edges := make([]ProgramEdge, 0, len(d.Nodes))
	for _, node := range d.Nodes {
		for _, use := range node.Uses() {
			key := edgeKey(node.Name, use)
			if seen[key] {
				continue
			}
			seen[key] = true
			edges = append(edges, ProgramEdge{From: node.Name, To: use})
		}
	}
	return edges
}

// Fill applies a valuation: a covered hole becomes a literal everywhere it
// stands, the hole leaves the declared parameters, and nothing else moves.
// This is Kernel.fillProgram at the declaration level, and it is what makes
// the corpus's filled twin a DERIVED vector rather than a second hand-built
// one.
func (d ProgramDeclaration) Fill(valuation Valuation) ProgramDeclaration {
	filled := ProgramDeclaration{
		Edges:   append([]ProgramEdge(nil), d.Edges...),
		Lineage: append([]*big.Int(nil), d.Lineage...),
	}
	for _, hole := range d.Holes {
		if hole.Name != nil {
			if _, covered := valuation[hole.Name.String()]; covered {
				continue
			}
		}
		filled.Holes = append(filled.Holes, hole)
	}
	for _, node := range d.Nodes {
		next := ProgramNodeRow{Name: node.Name, Generator: node.Generator}
		for _, arg := range node.Args {
			if arg.Ref.Arg == ArgHole && arg.Ref.Name != nil {
				if value, covered := valuation[arg.Ref.Name.String()]; covered {
					next.Args = append(next.Args, NodeArg{
						Field: arg.Field,
						Ref:   ArgRef{Arg: ArgLiteral, Value: value},
					})
					continue
				}
			}
			next.Args = append(next.Args, arg)
		}
		filled.Nodes = append(filled.Nodes, next)
	}
	return filled
}

// Canonical is the declaration's own canonical serialization — the string a
// program record's bytes member must carry.
func (d ProgramDeclaration) Canonical() ([]byte, error) {
	value, err := encodeDeclaration(d)
	if err != nil {
		return nil, err
	}
	return value.Canonical()
}

func edgeKey(from, to *big.Int) string {
	return natText(from) + "->" + natText(to)
}

func natText(number *big.Int) string {
	if number == nil {
		return "<absent>"
	}
	return number.String()
}

// ---------------------------------------------------------------------
// Decode and encode. The two halves sit together for the same reason as
// everywhere else in this package: a field added to one and forgotten in the
// other breaks the both-ways law on the next run.
// ---------------------------------------------------------------------

func decodeProgram(value JSONValue) (ProgramRow, error) {
	if err := requireKeys(value, "bytes", "declaration", "name", "record"); err != nil {
		return ProgramRow{}, err
	}
	var row ProgramRow
	var err error
	if row.Bytes, err = stringMember(value, "bytes"); err != nil {
		return ProgramRow{}, err
	}
	if row.Name, err = stringMember(value, "name"); err != nil {
		return ProgramRow{}, err
	}
	declaration, ok := value.Member("declaration")
	if !ok {
		return ProgramRow{}, fmt.Errorf("member \"declaration\" is absent")
	}
	if row.Declaration, err = decodeDeclaration(declaration); err != nil {
		return ProgramRow{}, fmt.Errorf("program vector %q: %w", row.Name, err)
	}
	return row, nil
}

func encodeProgram(row ProgramRow) (JSONValue, error) {
	declaration, err := encodeDeclaration(row.Declaration)
	if err != nil {
		return JSONValue{}, err
	}
	return ObjectValue(
		JSONMember{Name: "bytes", Value: StringValue(row.Bytes)},
		JSONMember{Name: "declaration", Value: declaration},
		JSONMember{Name: "name", Value: StringValue(row.Name)},
		JSONMember{Name: "record", Value: StringValue(RecordProgram)},
	)
}

func decodeDeclaration(value JSONValue) (ProgramDeclaration, error) {
	if value.Kind() != JSONObject {
		return ProgramDeclaration{}, fmt.Errorf(
			"the declaration is a %s, not an object", value.Kind())
	}
	if err := requireKeys(value, declarationKeys...); err != nil {
		return ProgramDeclaration{}, fmt.Errorf("declaration: %w", err)
	}
	declaration := ProgramDeclaration{}

	edges, err := arrayMember(value, "edges")
	if err != nil {
		return ProgramDeclaration{}, err
	}
	declaration.Edges = make([]ProgramEdge, 0, len(edges))
	for index, item := range edges {
		if err := requireKeys(item, edgeKeys...); err != nil {
			return ProgramDeclaration{}, fmt.Errorf("edges[%d]: %w", index, err)
		}
		from, err := natMember(item, "from")
		if err != nil {
			return ProgramDeclaration{}, fmt.Errorf("edges[%d]: %w", index, err)
		}
		to, err := natMember(item, "to")
		if err != nil {
			return ProgramDeclaration{}, fmt.Errorf("edges[%d]: %w", index, err)
		}
		declaration.Edges = append(declaration.Edges, ProgramEdge{From: from, To: to})
	}

	holes, err := arrayMember(value, "holes")
	if err != nil {
		return ProgramDeclaration{}, err
	}
	declaration.Holes = make([]ProgramHole, 0, len(holes))
	for index, item := range holes {
		if err := requireKeys(item, holeKeys...); err != nil {
			return ProgramDeclaration{}, fmt.Errorf("holes[%d]: %w", index, err)
		}
		name, err := natMember(item, "name")
		if err != nil {
			return ProgramDeclaration{}, fmt.Errorf("holes[%d]: %w", index, err)
		}
		schema, err := natMember(item, "schema")
		if err != nil {
			return ProgramDeclaration{}, fmt.Errorf("holes[%d]: %w", index, err)
		}
		declaration.Holes = append(declaration.Holes, ProgramHole{Name: name, Schema: schema})
	}

	lineage, err := natArrayMember(value, "lineage")
	if err != nil {
		return ProgramDeclaration{}, err
	}
	declaration.Lineage = lineage

	nodes, err := arrayMember(value, "nodes")
	if err != nil {
		return ProgramDeclaration{}, err
	}
	declaration.Nodes = make([]ProgramNodeRow, 0, len(nodes))
	for index, item := range nodes {
		node, err := decodeProgramNode(item)
		if err != nil {
			return ProgramDeclaration{}, fmt.Errorf("nodes[%d]: %w", index, err)
		}
		declaration.Nodes = append(declaration.Nodes, node)
	}
	return declaration, nil
}

func decodeProgramNode(value JSONValue) (ProgramNodeRow, error) {
	if err := requireKeys(value, nodeKeys...); err != nil {
		return ProgramNodeRow{}, err
	}
	var node ProgramNodeRow
	var err error
	if node.Name, err = natMember(value, "name"); err != nil {
		return ProgramNodeRow{}, err
	}
	if node.Generator, err = stringMember(value, "generator"); err != nil {
		return ProgramNodeRow{}, err
	}
	args, ok := value.Member("args")
	if !ok {
		return ProgramNodeRow{}, fmt.Errorf("member \"args\" is absent")
	}
	members, ok := args.Members()
	if !ok {
		return ProgramNodeRow{}, fmt.Errorf("member \"args\" is a %s, not an object", args.Kind())
	}
	node.Args = make([]NodeArg, 0, len(members))
	for _, member := range members {
		reference, err := decodeArgRef(member.Value)
		if err != nil {
			return ProgramNodeRow{}, fmt.Errorf("args.%s: %w", member.Name, err)
		}
		node.Args = append(node.Args, NodeArg{Field: member.Name, Ref: reference})
	}
	return node, nil
}

func decodeArgRef(value JSONValue) (ArgRef, error) {
	if value.Kind() != JSONObject {
		return ArgRef{}, fmt.Errorf("an argument reference is a %s, not an object", value.Kind())
	}
	tag, err := stringMember(value, "arg")
	if err != nil {
		return ArgRef{}, err
	}
	reference := ArgRef{Arg: tag}
	switch tag {
	case ArgDigest:
		if err := requireKeys(value, "arg", "id", "kind"); err != nil {
			return ArgRef{}, err
		}
		if reference.Kind, err = stringMember(value, "kind"); err != nil {
			return ArgRef{}, err
		}
		if reference.ID, err = natMember(value, "id"); err != nil {
			return ArgRef{}, err
		}
	case ArgLocal, ArgHole:
		if err := requireKeys(value, "arg", "name"); err != nil {
			return ArgRef{}, err
		}
		if reference.Name, err = natMember(value, "name"); err != nil {
			return ArgRef{}, err
		}
	case ArgLiteral:
		if err := requireKeys(value, "arg", "value"); err != nil {
			return ArgRef{}, err
		}
		if reference.Value, err = natMember(value, "value"); err != nil {
			return ArgRef{}, err
		}
	default:
		return ArgRef{}, fmt.Errorf(
			"argument tag %q is outside the closed set {%s}",
			tag, strings.Join([]string{ArgDigest, ArgHole, ArgLiteral, ArgLocal}, ", "))
	}
	return reference, nil
}

func encodeDeclaration(declaration ProgramDeclaration) (JSONValue, error) {
	edges := make([]JSONValue, 0, len(declaration.Edges))
	for _, edge := range declaration.Edges {
		encoded, err := ObjectValue(
			JSONMember{Name: "from", Value: IntValue(edge.From)},
			JSONMember{Name: "to", Value: IntValue(edge.To)},
		)
		if err != nil {
			return JSONValue{}, err
		}
		edges = append(edges, encoded)
	}
	holes := make([]JSONValue, 0, len(declaration.Holes))
	for _, hole := range declaration.Holes {
		encoded, err := ObjectValue(
			JSONMember{Name: "name", Value: IntValue(hole.Name)},
			JSONMember{Name: "schema", Value: IntValue(hole.Schema)},
		)
		if err != nil {
			return JSONValue{}, err
		}
		holes = append(holes, encoded)
	}
	nodes := make([]JSONValue, 0, len(declaration.Nodes))
	for _, node := range declaration.Nodes {
		encoded, err := encodeProgramNode(node)
		if err != nil {
			return JSONValue{}, err
		}
		nodes = append(nodes, encoded)
	}
	return ObjectValue(
		JSONMember{Name: "edges", Value: ArrayValue(edges...)},
		JSONMember{Name: "holes", Value: ArrayValue(holes...)},
		JSONMember{Name: "lineage", Value: natArrayValue(declaration.Lineage)},
		JSONMember{Name: "nodes", Value: ArrayValue(nodes...)},
	)
}

func encodeProgramNode(node ProgramNodeRow) (JSONValue, error) {
	members := make([]JSONMember, 0, len(node.Args))
	for _, arg := range node.Args {
		encoded, err := encodeArgRef(arg.Ref)
		if err != nil {
			return JSONValue{}, fmt.Errorf("args.%s: %w", arg.Field, err)
		}
		members = append(members, JSONMember{Name: arg.Field, Value: encoded})
	}
	args, err := ObjectValue(members...)
	if err != nil {
		return JSONValue{}, err
	}
	return ObjectValue(
		JSONMember{Name: "args", Value: args},
		JSONMember{Name: "generator", Value: StringValue(node.Generator)},
		JSONMember{Name: "name", Value: IntValue(node.Name)},
	)
}

func encodeArgRef(reference ArgRef) (JSONValue, error) {
	switch reference.Arg {
	case ArgDigest:
		return ObjectValue(
			JSONMember{Name: "arg", Value: StringValue(ArgDigest)},
			JSONMember{Name: "id", Value: IntValue(reference.ID)},
			JSONMember{Name: "kind", Value: StringValue(reference.Kind)},
		)
	case ArgLocal, ArgHole:
		return ObjectValue(
			JSONMember{Name: "arg", Value: StringValue(reference.Arg)},
			JSONMember{Name: "name", Value: IntValue(reference.Name)},
		)
	case ArgLiteral:
		return ObjectValue(
			JSONMember{Name: "arg", Value: StringValue(ArgLiteral)},
			JSONMember{Name: "value", Value: IntValue(reference.Value)},
		)
	default:
		return JSONValue{}, fmt.Errorf(
			"argument tag %q is outside the closed set {%s}",
			reference.Arg,
			strings.Join([]string{ArgDigest, ArgHole, ArgLiteral, ArgLocal}, ", "))
	}
}
