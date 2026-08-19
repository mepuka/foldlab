package daemon

import (
	"errors"
	"fmt"
	"math"
	"sort"

	"foldlab/canonical"
)

// The substrate session — one connection's identity, folded at establishment.
//
// This file is the Go side of a fold whose reference implementation is the
// TypeScript spine's. It is a TRANSCRIPTION and never a twin: the field
// roster, its order, the three groups' shapes, and the folded value's key set
// are read out of that implementation and restated here, and the wall that
// makes the restatement honest is a byte comparison across the language
// boundary rather than two hand-maintained tables agreeing with each other by
// inspection. A divergence the wall exposes is a defect in THIS file — the
// spine's fold is the reference, and a divergence is never reconciled by
// moving the reference.
//
// Three groups fold into one canonical value whose digest is the session's
// name: what the substrate declares about the connection, what the connecting
// process declares about itself, and what the estate knows that the substrate
// cannot. The fold is a pure function of the three groups and reaches no
// connection — which is the property the daemon exists to exercise, because a
// party holding the same three groups computes the same digest from a
// completely different carriage.
//
// Nothing here reads a clock, and nothing here folds a predecessor. Both
// omissions are the reference's and both are load-bearing: a claimed time is
// observation data and never identity, and a party holding only the three
// groups must still be able to compute the name.
//
// Staged debt, inherited from the reference and stated rather than absorbed:
// the roster and the group shapes are hand-carried transcription owing the
// corpus's substrate-vocabulary group, which the emitter does not yet mint.

// FieldSort is the wire sort one group-one field carries.
type FieldSort string

// The three sorts the substrate sends.
const (
	SortString  FieldSort = "string"
	SortNumber  FieldSort = "number"
	SortBoolean FieldSort = "boolean"
)

// FieldProvenance records how one group-one field reaches this package.
type FieldProvenance string

// The two provenances the reference roster distinguishes.
const (
	// ProvenanceDeclared marks a field the pinned client's own
	// server-information type carries.
	ProvenanceDeclared FieldProvenance = "declared"
	// ProvenanceMeasured marks a field the substrate sends on the wire that
	// the pinned client's type does not carry.
	ProvenanceMeasured FieldProvenance = "measured"
)

// SubstrateField is one transcribed field of the substrate's own declaration.
type SubstrateField struct {
	// Name is the substrate's own key, verbatim; never renamed.
	Name string
	Sort FieldSort
	// Provenance is the reference roster's own reading of how the field
	// reaches a folder, carried unchanged so the two rosters' bytes agree.
	Provenance FieldProvenance
}

// SubstrateFields is the field roster this package folds group one under.
//
// **The expansion discipline is ADD-ONLY and it is not this side's to
// exercise.** The roster's digest rides the folded declaration, so a row
// renamed, reordered, retyped, or removed here would silently rename every
// session this package ever folded AND would break the cross-language wall on
// the same edit. A field joins the roster on the reference side first; this
// list follows it, appending.
var SubstrateFields = []SubstrateField{
	{Name: "server_id", Sort: SortString, Provenance: ProvenanceDeclared},
	{Name: "server_name", Sort: SortString, Provenance: ProvenanceDeclared},
	{Name: "version", Sort: SortString, Provenance: ProvenanceDeclared},
	{Name: "proto", Sort: SortNumber, Provenance: ProvenanceDeclared},
	{Name: "go", Sort: SortString, Provenance: ProvenanceDeclared},
	{Name: "host", Sort: SortString, Provenance: ProvenanceDeclared},
	{Name: "port", Sort: SortNumber, Provenance: ProvenanceDeclared},
	{Name: "headers", Sort: SortBoolean, Provenance: ProvenanceDeclared},
	{Name: "max_payload", Sort: SortNumber, Provenance: ProvenanceDeclared},
	{Name: "jetstream", Sort: SortBoolean, Provenance: ProvenanceDeclared},
	{Name: "client_id", Sort: SortNumber, Provenance: ProvenanceDeclared},
	{Name: "client_ip", Sort: SortString, Provenance: ProvenanceDeclared},
	{Name: "connect_info", Sort: SortBoolean, Provenance: ProvenanceMeasured},
	{Name: "remote_account", Sort: SortString, Provenance: ProvenanceMeasured},
	{Name: "api_lvl", Sort: SortNumber, Provenance: ProvenanceDeclared},
	{Name: "xkey", Sort: SortString, Provenance: ProvenanceMeasured},
}

// RosterValue declares one field roster as a value, so that it has a name of
// its own and the fold can say which roster it folded under.
func RosterValue(fields []SubstrateField) map[string]any {
	rows := make([]any, 0, len(fields))
	for _, field := range fields {
		rows = append(rows, map[string]any{
			"name":       field.Name,
			"sort":       string(field.Sort),
			"provenance": string(field.Provenance),
		})
	}
	return map[string]any{
		"v":      float64(0),
		"kind":   "substrate-field-roster",
		"fields": rows,
	}
}

// SubstrateRoster is the declared roster this package stands on.
var SubstrateRoster = RosterValue(SubstrateFields)

// RosterDigest is one roster's name: the digest of its declared bytes.
func RosterDigest(roster map[string]any) (string, error) { return digestOf(roster) }

// ErrFieldSort refuses a substrate field sent at a sort the roster does not
// name. A coerced field would move the session digest without moving anything
// the substrate said.
var ErrFieldSort = errors.New("the substrate sent a field at a sort the roster does not name")

// SubstrateDeclarationUnder folds group one under a named roster.
//
// The roster is walked and nothing is selected by hand, which is what makes an
// expansion a one-row edit on both sides rather than a code change on either.
// A field the substrate did not send folds as null rather than being absent,
// so the folded key set is fixed and two mints over one connection cannot
// differ by an optional field's presence.
func SubstrateDeclarationUnder(
	roster []SubstrateField,
	rosterName string,
	sent map[string]any,
) (map[string]any, error) {
	fields := make(map[string]any, len(roster))
	for _, field := range roster {
		value, present := sent[field.Name]
		if !present || value == nil {
			fields[field.Name] = nil
			continue
		}
		folded, err := foldField(field, value)
		if err != nil {
			return nil, err
		}
		fields[field.Name] = folded
	}
	return map[string]any{
		"v":      float64(0),
		"kind":   "substrate-declaration",
		"roster": rosterName,
		"fields": fields,
	}, nil
}

func foldField(field SubstrateField, value any) (any, error) {
	switch field.Sort {
	case SortString:
		text, ok := value.(string)
		if !ok {
			return nil, sortRefusal(field, value)
		}
		return text, nil
	case SortNumber:
		number, ok := value.(float64)
		if !ok {
			return nil, sortRefusal(field, value)
		}
		if math.IsInf(number, 0) || math.IsNaN(number) {
			return nil, fmt.Errorf("%w: %s is not a finite number", ErrFieldSort, field.Name)
		}
		return number, nil
	case SortBoolean:
		flag, ok := value.(bool)
		if !ok {
			return nil, sortRefusal(field, value)
		}
		return flag, nil
	default:
		return nil, fmt.Errorf("%w: %s names the unknown sort %q", ErrFieldSort, field.Name, field.Sort)
	}
}

func sortRefusal(field SubstrateField, value any) error {
	return fmt.Errorf("%w: %s is %T, not %s", ErrFieldSort, field.Name, value, field.Sort)
}

// SubstrateDeclarationOf folds group one under the roster this package stands
// on.
func SubstrateDeclarationOf(sent map[string]any) (map[string]any, error) {
	name, err := RosterDigest(SubstrateRoster)
	if err != nil {
		return nil, err
	}
	return SubstrateDeclarationUnder(SubstrateFields, name, sent)
}

// ClientZeroConnectOptions declares group two for the daemon's own connection.
//
// **This declaration UNDER-DECLARES, deliberately and visibly.** The
// reference's group-two declaration names every option its pinned client runs
// under — the ones the estate sets and the ones the client's own default table
// carries — because that client's defaults have been transcribed with a wall
// behind them. The Go client's default table has NOT been transcribed, and
// transcribing it here would be a value nobody has ruled entering the estate
// through a package that has no wall for it. So this value names exactly the
// three options the daemon SETS, in the pinned Go client's own option
// vocabulary, and names no default at all. An absent row here is honestly
// absent: it says the estate has declared nothing about that option, which is
// true, rather than claiming a value it has not measured.
//
// Naming the client's full option set, and pinning the values, is the declared
// server-and-connect-configuration slice's work.
func ClientZeroConnectOptions(name string) map[string]any {
	return map[string]any{
		"v":    float64(0),
		"kind": "substrate-connect-options",
		"options": map[string]any{
			"InProcessServer": true,
			"Name":            name,
			"Servers":         []any{},
		},
	}
}

// EstateDeclaration declares group three — what the estate knows and the
// substrate cannot.
//
// The shape set is sorted and deduplicated here rather than by callers, so two
// parties that assert the same shapes in different orders fold the same bytes.
// A nil writ is the honest reading of "no writ is declared for this layer",
// and it is a different fact from the least writ, which is declared and empty.
func EstateDeclaration(writ *string, layer string, shapes []string) map[string]any {
	seen := make(map[string]struct{}, len(shapes))
	set := make([]any, 0, len(shapes))
	unique := make([]string, 0, len(shapes))
	for _, shape := range shapes {
		if _, already := seen[shape]; already {
			continue
		}
		seen[shape] = struct{}{}
		unique = append(unique, shape)
	}
	sort.Strings(unique)
	for _, shape := range unique {
		set = append(set, shape)
	}
	declared := map[string]any{
		"v":      float64(0),
		"kind":   "substrate-estate",
		"layer":  layer,
		"shapes": set,
	}
	if writ == nil {
		declared["writ"] = nil
	} else {
		declared["writ"] = *writ
	}
	return declared
}

// SessionValue folds the three groups into the value whose digest is one
// substrate session's name.
func SessionValue(substrate map[string]any, optionsDigest string, estate map[string]any) map[string]any {
	return map[string]any{
		"v":         float64(0),
		"kind":      "substrate-session",
		"substrate": substrate,
		"options":   optionsDigest,
		"estate":    estate,
	}
}

// SessionBytes are one folded session's canonical bytes.
func SessionBytes(session map[string]any) ([]byte, error) {
	return canonical.CanonicalizeValue(session)
}

// SessionName is the session's name: the digest over its canonical bytes,
// through the one canonicalizer.
func SessionName(session map[string]any) (string, error) { return digestOf(session) }

// EstablishedFact is one connection's establishment, named by the session
// digest it cites.
//
// The predecessor rides the FACT and never the folded value, because the name
// must stay computable by a party holding only the three groups and a
// predecessor is not one of them. A reconnect lands a NEW fact naming the
// prior session and leaves the prior fact exactly as it lies.
func EstablishedFact(session string, optionsDigest string, roster string, predecessor *string) map[string]any {
	fact := map[string]any{
		"v":       float64(0),
		"kind":    "substrate-session-established",
		"session": session,
		"options": optionsDigest,
		"roster":  roster,
	}
	if predecessor == nil {
		fact["predecessor"] = nil
	} else {
		fact["predecessor"] = *predecessor
	}
	return fact
}

// digestOf names one value: the digest of its canonical bytes.
func digestOf(value any) (string, error) {
	bytes, err := canonical.CanonicalizeValue(value)
	if err != nil {
		return "", err
	}
	return canonical.DigestHex(bytes), nil
}
