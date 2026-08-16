package protod

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
)

const protocolScheme = "flb.protocol.v0"

const (
	protocolRevisionSuccessorRound = "successor-round"
	protocolRevisionAbsorb         = "absorb"
)

type protocolFence struct {
	Rule  string   `json:"rule"`
	Order []string `json:"order"`
}

type protocolHole struct {
	Name  string         `json:"name"`
	Type  string         `json:"type"`
	Seats []string       `json:"seats"`
	Fence *protocolFence `json:"fence,omitempty"`
}

type protocolDefinition struct {
	Scheme     string         `json:"scheme"`
	Name       string         `json:"name"`
	Seats      []string       `json:"seats"`
	Holes      []protocolHole `json:"holes"`
	Completion []string       `json:"completion"`
	Close      []string       `json:"close"`
	Revision   string         `json:"revision"`
	Identity   string         `json:"identity"`
	Liveness   []string       `json:"liveness"`
}

type protocolCreateRequest struct {
	Protocol       any    `json:"protocol"`
	AssertedDigest string `json:"assertedDigest"`
	Submitter      string `json:"submitter"`
}

func (d *Daemon) serveProtocolCreate(ctx context.Context, body []byte) any {
	certificate, refusal, err := d.certifyProtocol(ctx, body)
	if err != nil {
		return nil
	}
	if refusal != nil {
		return refuse(refusal)
	}
	fact := certificate.Fact
	definition, err := protocolFromFact(fact)
	if err != nil {
		return nil
	}
	bindings := make(map[string]any, len(definition.Seats))
	for _, seat := range definition.Seats {
		bindings[seat] = seat + "-principal"
	}
	return createReply{
		OK: true, Created: certificate.Created, Digest: fact.Digest,
		Scheme: fact.Scheme, CatalogSeq: fact.seq,
		CatalogHead: certificate.CatalogHead,
		Next: []NextHint{{
			Subject: SubjectProtocolSessionOpen,
			Note:    "bind every declared seat to a trusted principal and open a protocol session",
			Body:    map[string]any{"protocol": fact.Digest, "bindings": bindings},
		}, readCatalogHint()},
	}
}

func (d *Daemon) validateProtocol(value any, path []string) (protocolDefinition, *Refusal) {
	root, ok := value.(map[string]any)
	if !ok {
		return protocolDefinition{}, protocolMalformed(path, value, "an object carrying the flb.protocol.v0 fields")
	}
	if refusal := protocolKeys(root, path, "scheme", "name", "seats", "holes", "completion", "close", "revision", "identity", "liveness"); refusal != nil {
		return protocolDefinition{}, refusal
	}
	definition := protocolDefinition{}
	var okField bool
	definition.Scheme, okField = root["scheme"].(string)
	if !okField || definition.Scheme != protocolScheme {
		return protocolDefinition{}, protocolMalformed(append(path, "scheme"), root["scheme"], protocolScheme)
	}
	definition.Name, okField = root["name"].(string)
	if !okField || definition.Name == "" {
		return protocolDefinition{}, protocolMalformed(append(path, "name"), root["name"], "a non-empty protocol name")
	}
	var refusal *Refusal
	definition.Seats, refusal = protocolStringSet(root["seats"], append(path, "seats"), true)
	if refusal != nil {
		return protocolDefinition{}, refusal
	}
	seatSet := stringSet(definition.Seats)
	definition.Identity, okField = root["identity"].(string)
	if !okField || definition.Identity != "trusted-principals" {
		return protocolDefinition{}, protocolMalformed(append(path, "identity"), root["identity"], "trusted-principals")
	}
	definition.Liveness, refusal = protocolStringSet(root["liveness"], append(path, "liveness"), false)
	if refusal != nil {
		return protocolDefinition{}, refusal
	}
	for index, seat := range definition.Liveness {
		if !seatSet[seat] {
			return protocolDefinition{}, protocolMalformed(
				append(path, "liveness", fmt.Sprint(index)), seat, "a declared protocol seat",
			)
		}
	}

	holeValues, ok := root["holes"].([]any)
	if !ok || len(holeValues) == 0 {
		return protocolDefinition{}, protocolMalformed(append(path, "holes"), root["holes"], "a non-empty array of named holes")
	}
	holeNames := map[string]bool{}
	definition.Holes = make([]protocolHole, len(holeValues))
	for index, holeValue := range holeValues {
		holePath := append(path, "holes", fmt.Sprint(index))
		holeMap, ok := holeValue.(map[string]any)
		if !ok {
			return protocolDefinition{}, protocolMalformed(holePath, holeValue, "a protocol hole object")
		}
		if refusal := protocolKeys(holeMap, holePath, "name", "type", "seats", "fence"); refusal != nil {
			return protocolDefinition{}, refusal
		}
		hole := protocolHole{}
		hole.Name, ok = holeMap["name"].(string)
		if !ok || hole.Name == "" || holeNames[hole.Name] {
			return protocolDefinition{}, protocolMalformed(append(holePath, "name"), holeMap["name"], "a non-empty hole name unique in this protocol")
		}
		holeNames[hole.Name] = true
		hole.Type, ok = holeMap["type"].(string)
		if !ok || !hexDigest.MatchString(hole.Type) {
			return protocolDefinition{}, protocolMalformed(append(holePath, "type"), holeMap["type"], "a 64-character cataloged type digest")
		}
		fact, known := d.catalog.resolveFact(hole.Type)
		if !known || !isTypeFactScheme(fact.Scheme) {
			return protocolDefinition{}, &Refusal{
				Kind: KindUnknownRef,
				Law:  "flb.protocol.v0 hole types resolve to cataloged flb.type.v0 structures before protocol creation",
				Path: append(holePath, "type"), Got: hole.Type,
				Expected: "a digest already committed under an owned or attested type scheme",
				Next:     []NextHint{{Subject: SubjectTypeCreate, Note: "create the hole type first, then resubmit this protocol"}, readCatalogHint()},
			}
		}
		hole.Seats, refusal = protocolStringSet(holeMap["seats"], append(holePath, "seats"), true)
		if refusal != nil {
			return protocolDefinition{}, refusal
		}
		for seatIndex, seat := range hole.Seats {
			if !seatSet[seat] {
				return protocolDefinition{}, protocolMalformed(append(holePath, "seats", fmt.Sprint(seatIndex)), seat, "a seat declared by the protocol")
			}
		}
		fenceValue, hasFence := holeMap["fence"]
		if len(hole.Seats) == 1 && hasFence {
			return protocolDefinition{}, protocolMalformed(append(holePath, "fence"), fenceValue, "no fence on a single-seat hole")
		}
		if len(hole.Seats) > 1 {
			fenceMap, ok := fenceValue.(map[string]any)
			if !hasFence || !ok {
				return protocolDefinition{}, protocolMalformed(append(holePath, "fence"), fenceValue, "a seat-authority fence for every multi-seat hole")
			}
			if refusal := protocolKeys(fenceMap, append(holePath, "fence"), "rule", "order"); refusal != nil {
				return protocolDefinition{}, refusal
			}
			rule, ok := fenceMap["rule"].(string)
			if !ok || rule != "seat-authority" {
				return protocolDefinition{}, protocolMalformed(append(holePath, "fence", "rule"), fenceMap["rule"], "seat-authority")
			}
			order, refusal := protocolStringSet(fenceMap["order"], append(holePath, "fence", "order"), true)
			if refusal != nil {
				return protocolDefinition{}, refusal
			}
			if !sameStringSet(order, hole.Seats) {
				return protocolDefinition{}, protocolMalformed(append(holePath, "fence", "order"), order, "a permutation of the hole's seats")
			}
			hole.Fence = &protocolFence{Rule: rule, Order: order}
		}
		definition.Holes[index] = hole
	}
	definition.Completion, refusal = protocolDeclaredNames(
		root["completion"], append(path, "completion"), holeNames,
		completionExpectation, "hole name", "completion names",
	)
	if refusal != nil {
		return protocolDefinition{}, refusal
	}
	definition.Close, refusal = protocolDeclaredNames(
		root["close"], append(path, "close"), seatSet,
		closeExpectation, "seat", "close seats",
	)
	if refusal != nil {
		return protocolDefinition{}, refusal
	}
	definition.Revision, okField = root["revision"].(string)
	if !okField || !protocolRevisionLawful(definition.Revision) {
		return protocolDefinition{}, protocolMalformed(
			append(path, "revision"), root["revision"],
			[]any{protocolRevisionSuccessorRound, protocolRevisionAbsorb},
		)
	}
	return definition, nil
}

// completionExpectation is the completion declaration's lawful shape,
// taught verbatim by every refusal about the whole field. The empty list
// is refused because an empty ∀ would close every round vacuously
// completed; unconditional completion is declared by naming a hole the
// protocol always fills.
const completionExpectation = "a non-empty, UTF-16-sorted, duplicate-free array of declared hole names whose terminal states decide the close outcome"

// closeExpectation is the close declaration's lawful shape, taught verbatim
// by every refusal about the whole field.
const closeExpectation = "a non-empty, UTF-16-sorted, duplicate-free array of declared seat names whose bound principals may close the round (any-of)"

// protocolDeclaredNamesCheck is the one sorted/unique/declared-names law.
// Completion and close parameterize their teaching text; their creation
// refusals and decoded-fact predicates both derive from this checker, so the
// two surfaces cannot drift. It reports the first offense as (index,
// expected); index -1 offends at the array itself.
func protocolDeclaredNamesCheck(names []string, declared map[string]bool, wholeExpectation, noun, field string) (int, string, bool) {
	if len(names) == 0 {
		return -1, wholeExpectation, false
	}
	for index, name := range names {
		if !declared[name] {
			return index, fmt.Sprintf("a %s declared by this protocol", noun), false
		}
		if index > 0 && !utf16Less(names[index-1], name) {
			return index, fmt.Sprintf("%s sorted by UTF-16 code units without duplicates", field), false
		}
	}
	return 0, "", true
}

// protocolDeclaredNames shapes a submitted declaration and refuses through
// protocolDeclaredNamesCheck at the exact offending path.
func protocolDeclaredNames(value any, path []string, declared map[string]bool, wholeExpectation, noun, field string) ([]string, *Refusal) {
	values, ok := value.([]any)
	if !ok {
		return nil, protocolMalformed(path, value, wholeExpectation)
	}
	result := make([]string, len(values))
	for index, item := range values {
		name, ok := item.(string)
		if !ok {
			return nil, protocolMalformed(append(path, fmt.Sprint(index)), item, fmt.Sprintf("a %s declared by this protocol", noun))
		}
		result[index] = name
	}
	index, expected, lawful := protocolDeclaredNamesCheck(result, declared, wholeExpectation, noun, field)
	if lawful {
		return result, nil
	}
	if index < 0 {
		return nil, protocolMalformed(path, value, expected)
	}
	return nil, protocolMalformed(append(path, fmt.Sprint(index)), result[index], expected)
}

func protocolRevisionLawful(revision string) bool {
	return revision == protocolRevisionSuccessorRound || revision == protocolRevisionAbsorb
}

// protocolGrammarLawful re-checks the completion, close, and revision laws
// on a decoded catalog fact. Creation validates before commit, so this can
// refuse only a fact cataloged before these fields existed — which must
// refuse rather than fold under missing semantics.
func protocolGrammarLawful(definition protocolDefinition) bool {
	holeNames := map[string]bool{}
	for _, hole := range definition.Holes {
		holeNames[hole.Name] = true
	}
	_, _, completionLawful := protocolDeclaredNamesCheck(
		definition.Completion, holeNames, completionExpectation, "hole name", "completion names",
	)
	_, _, closeLawful := protocolDeclaredNamesCheck(
		definition.Close, stringSet(definition.Seats), closeExpectation, "seat", "close seats",
	)
	return completionLawful && closeLawful && protocolRevisionLawful(definition.Revision)
}

func isTypeFactScheme(scheme string) bool {
	return scheme == flbTypeV1Scheme || scheme == (bytesSHA256V1{}).Name()
}

func protocolKeys(value map[string]any, path []string, allowed ...string) *Refusal {
	extra := unknownKeysInIdentityOrder(value, allowed...)
	if len(extra) > 0 {
		return protocolMalformed(append(path, extra[0]), extra[0], allowed)
	}
	for _, key := range allowed {
		if key == "fence" {
			continue
		}
		if _, present := value[key]; !present {
			return protocolMalformed(append(path, key), nil, protocolFieldExpectation(key))
		}
	}
	return nil
}

// protocolFieldExpectation teaches a missing required field's lawful shape.
// contract.describe brands the protocol body opaque, so the refusal is the
// only surface where the grammar's new fields are discoverable.
func protocolFieldExpectation(key string) any {
	switch key {
	case "completion":
		return completionExpectation
	case "close":
		return closeExpectation
	case "revision":
		return []any{protocolRevisionSuccessorRound, protocolRevisionAbsorb}
	default:
		return "a required flb.protocol.v0 field"
	}
}

func protocolStringSet(value any, path []string, nonempty bool) ([]string, *Refusal) {
	values, ok := value.([]any)
	if !ok || (nonempty && len(values) == 0) {
		return nil, protocolMalformed(path, value, "an array of unique non-empty strings")
	}
	result := make([]string, len(values))
	seen := map[string]bool{}
	for index, value := range values {
		item, ok := value.(string)
		if !ok || item == "" || seen[item] {
			return nil, protocolMalformed(append(path, fmt.Sprint(index)), value, "a non-empty string unique in this array")
		}
		seen[item] = true
		result[index] = item
	}
	return result, nil
}

func stringSet(values []string) map[string]bool {
	result := make(map[string]bool, len(values))
	for _, value := range values {
		result[value] = true
	}
	return result
}

func sameStringSet(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	leftCopy := append([]string{}, left...)
	rightCopy := append([]string{}, right...)
	sort.Strings(leftCopy)
	sort.Strings(rightCopy)
	for index := range leftCopy {
		if leftCopy[index] != rightCopy[index] {
			return false
		}
	}
	return true
}

func protocolMalformed(path []string, got, expected any) *Refusal {
	return &Refusal{
		Kind: KindInvalidStructure,
		Law:  "flb.protocol.v0 values satisfy the cataloged fixed-seat, fixed-hole protocol grammar",
		Path: frozenPath(path), Got: got, Expected: expected,
		Next: []NextHint{{Subject: SubjectProtocolCreate, Note: "repair the protocol value at path and resubmit"}, describeHint()},
	}
}

func protocolFromFact(fact catalogFact) (protocolDefinition, error) {
	if fact.Scheme != protocolScheme {
		return protocolDefinition{}, fmt.Errorf("catalog fact scheme %q is not %q", fact.Scheme, protocolScheme)
	}
	bytes, err := canonicalBytes(fact.Structure)
	if err != nil {
		return protocolDefinition{}, err
	}
	var definition protocolDefinition
	if err := json.Unmarshal(bytes, &definition); err != nil {
		return protocolDefinition{}, err
	}
	if !protocolGrammarLawful(definition) {
		return protocolDefinition{}, fmt.Errorf("catalog fact %s does not satisfy the flb.protocol.v0 grammar", fact.Digest)
	}
	return definition, nil
}
