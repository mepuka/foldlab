package protod

import (
	"bytes"
	"fmt"
	"regexp"
	"sort"
	"unicode/utf16"
)

// The flb.type.v0 structure walk. One pass validates the grammar,
// refuses with the offending path (W7), and reports every ref digest so
// the catalog can resolve them (the catalog is a DAG by construction:
// no forward refs, no cycles). Unknown kinds refuse; unknown keys
// refuse — a strict grammar is what makes refusals teachable.

var hexDigest = regexp.MustCompile(`^[0-9a-f]{64}$`)

var v0Kinds = []string{
	"string", "bool", "int", "float", "null", "opaque",
	"literal", "list", "struct", "union", "brand", "check", "ref",
}

var partialKinds = append(append([]string{}, v0Kinds...), "hole")

type refUse struct {
	digest string
	path   []string
}

type walkResult struct {
	refs  []refUse // every ref encountered, with its exact digest path
	holes [][]string
}

func walkStructure(value any, path []string) (*walkResult, *Refusal) {
	return walk(value, path, false)
}

func walkPartial(value any, path []string) (*walkResult, *Refusal) {
	return walk(value, path, true)
}

func walk(value any, path []string, allowHoles bool) (*walkResult, *Refusal) {
	result := &walkResult{refs: []refUse{}, holes: [][]string{}}
	if r := walkNode(value, path, result, allowHoles); r != nil {
		return nil, r
	}
	return result, nil
}

func walkNode(value any, path []string, result *walkResult, allowHoles bool) *Refusal {
	node, ok := value.(map[string]any)
	if !ok {
		return structureRefusal(path,
			"flb.type.v0: every node is a JSON object carrying a \"k\" kind",
			value, "an object with a \"k\" field", map[string]any{"k": "string"})
	}
	kindValue, present := node["k"]
	if !present {
		return structureRefusal(path,
			"flb.type.v0: every node is a JSON object carrying a \"k\" kind",
			node, "an object with a \"k\" field", map[string]any{"k": "string"})
	}
	kind, ok := kindValue.(string)
	if !ok {
		expected := v0Kinds
		if allowHoles {
			expected = partialKinds
		}
		return structureRefusal(append(path, "k"),
			"flb.type.v0: \"k\" is a string naming the kind",
			kindValue, expected, map[string]any{"k": "string"})
	}

	switch kind {
	case "string", "bool", "int", "float", "null", "opaque":
		return checkKeys(node, path, kind, "k")
	case "hole":
		if r := checkKeys(node, path, kind, "k"); r != nil {
			return r
		}
		if !allowHoles {
			return structureRefusal(path,
				"C5: holes are authoring-only — a tree containing a hole never enters the catalog and never bears identity",
				node, "a decided flb.type.v0 node", map[string]any{"k": "string"})
		}
		result.holes = append(result.holes, frozenPath(path))
		return nil
	case "literal":
		if r := checkKeys(node, path, kind, "k", "value"); r != nil {
			return r
		}
		literal, present := node["value"]
		if !present {
			return structureRefusal(path,
				"flb.type.v0: a literal node carries its scalar in \"value\"",
				node, `{"k":"literal","value":<json scalar>}`,
				map[string]any{"k": "literal", "value": "on"})
		}
		switch literal.(type) {
		case string, float64, bool, nil:
			return nil
		default:
			return structureRefusal(append(path, "value"),
				"flb.type.v0: a literal value is a JSON scalar — string, number, bool, or null",
				literal, "a JSON scalar", map[string]any{"k": "literal", "value": 1})
		}
	case "list":
		if r := checkKeys(node, path, kind, "k", "of"); r != nil {
			return r
		}
		of, present := node["of"]
		if !present {
			return structureRefusal(path,
				"flb.type.v0: a list node carries its element type in \"of\"",
				node, `{"k":"list","of":T}`,
				map[string]any{"k": "list", "of": map[string]any{"k": "string"}})
		}
		return walkNode(of, append(path, "of"), result, allowHoles)
	case "struct":
		return walkStruct(node, path, result, allowHoles)
	case "union":
		if r := checkKeys(node, path, kind, "k", "of"); r != nil {
			return r
		}
		members, ok := node["of"].([]any)
		if !ok || len(members) == 0 {
			return structureRefusal(append(path, "of"),
				"flb.type.v0: a union carries a non-empty array of member types in \"of\"",
				node["of"], "a non-empty array of types",
				map[string]any{"k": "union", "of": []any{map[string]any{"k": "string"}, map[string]any{"k": "null"}}})
		}
		for index, member := range members {
			if r := walkNode(member, append(path, "of", fmt.Sprintf("%d", index)), result, allowHoles); r != nil {
				return r
			}
		}
		// Partials have no identity. Preserve their union positions so a
		// fill followed by unfill at the same path is an exact inverse.
		if allowHoles {
			return nil
		}
		type canonicalMember struct {
			value any
			bytes []byte
		}
		canonical := make([]canonicalMember, len(members))
		for index, member := range members {
			memberBytes, err := canonicalBytes(member)
			if err != nil {
				return structureRefusal(append(path, "of", fmt.Sprintf("%d", index)),
					"flb.type.v0: every union member must have canonical JSON bytes",
					member, "a canonicalizable type node", map[string]any{"k": "string"})
			}
			canonical[index] = canonicalMember{value: member, bytes: memberBytes}
		}
		// Law: order never moves identity in an unordered collection.
		// Normalize union members by their canonical bytes before the
		// enclosing structure is encoded and digested.
		sort.Slice(canonical, func(i, j int) bool {
			return bytes.Compare(canonical[i].bytes, canonical[j].bytes) < 0
		})
		for index := 1; index < len(canonical); index++ {
			if bytes.Equal(canonical[index-1].bytes, canonical[index].bytes) {
				return structureRefusal(append(path, "of", fmt.Sprintf("%d", index)),
					"flb.type.v0: union members must be unique after canonical-byte sorting",
					canonical[index].value, "a member with distinct canonical bytes",
					map[string]any{"k": "union", "of": []any{map[string]any{"k": "null"}, map[string]any{"k": "string"}}})
			}
		}
		for index := range canonical {
			members[index] = canonical[index].value
		}
		return nil
	case "brand":
		if r := checkKeys(node, path, kind, "k", "name", "of"); r != nil {
			return r
		}
		name, ok := node["name"].(string)
		if !ok || name == "" {
			return structureRefusal(append(path, "name"),
				"flb.type.v0: a brand carries a non-empty name — declared nominal intent is what a catalog preserves",
				node["name"], "a non-empty string",
				map[string]any{"k": "brand", "name": "UserId", "of": map[string]any{"k": "string"}})
		}
		of, present := node["of"]
		if !present {
			return structureRefusal(path,
				"flb.type.v0: a brand wraps its base type in \"of\"",
				node, `{"k":"brand","name":<string>,"of":T}`,
				map[string]any{"k": "brand", "name": "UserId", "of": map[string]any{"k": "string"}})
		}
		return walkNode(of, append(path, "of"), result, allowHoles)
	case "check":
		return walkCheck(node, path, result, allowHoles)
	case "ref":
		if r := checkKeys(node, path, kind, "k", "digest"); r != nil {
			return r
		}
		digest, ok := node["digest"].(string)
		if !ok || !hexDigest.MatchString(digest) {
			return structureRefusal(append(path, "digest"),
				"flb.type.v0: a ref carries a 64-char lowercase hex digest of a cataloged type",
				node["digest"], "64 lowercase hex characters",
				map[string]any{"k": "ref", "digest": "0000000000000000000000000000000000000000000000000000000000000000"})
		}
		result.refs = append(result.refs, refUse{
			digest: digest,
			path:   frozenPath(append(path, "digest")),
		})
		return nil
	default:
		expected := v0Kinds
		if allowHoles {
			expected = partialKinds
		}
		return structureRefusal(append(path, "k"),
			"flb.type.v0: unknown kind refuses — the grammar grows under ticket 004, never by admission on faith",
			kind, expected, map[string]any{"k": "string"})
	}
}

func walkStruct(node map[string]any, path []string, result *walkResult, allowHoles bool) *Refusal {
	if r := checkKeys(node, path, "struct", "k", "fields", "optional"); r != nil {
		return r
	}
	fields, ok := node["fields"].(map[string]any)
	if !ok {
		return structureRefusal(append(path, "fields"),
			"flb.type.v0: a struct carries an object of field name to type in \"fields\"",
			node["fields"], `{"k":"struct","fields":{<name>:T,...}}`,
			map[string]any{"k": "struct", "fields": map[string]any{"id": map[string]any{"k": "string"}}})
	}
	names := make([]string, 0, len(fields))
	for name := range fields {
		names = append(names, name)
	}
	sort.Slice(names, func(i, j int) bool {
		return utf16Less(names[i], names[j])
	})
	for _, name := range names {
		if r := walkNode(fields[name], append(path, "fields", name), result, allowHoles); r != nil {
			return r
		}
	}
	if optionalValue, present := node["optional"]; present {
		optional, ok := optionalValue.([]any)
		if !ok {
			return structureRefusal(append(path, "optional"),
				"flb.type.v0: \"optional\" is an array of field names",
				optionalValue, "an array of strings", []string{"note"})
		}
		seen := map[string]bool{}
		previous := ""
		for index, item := range optional {
			name, ok := item.(string)
			if !ok {
				return structureRefusal(append(path, "optional", fmt.Sprintf("%d", index)),
					"flb.type.v0: \"optional\" is an array of field names",
					item, "a string naming a field", "note")
			}
			if _, declared := fields[name]; !declared {
				return structureRefusal(append(path, "optional", fmt.Sprintf("%d", index)),
					"flb.type.v0: every optional name must be a declared field",
					name, names, nil)
			}
			if seen[name] {
				return structureRefusal(append(path, "optional", fmt.Sprintf("%d", index)),
					"flb.type.v0: optional names must be unique",
					name, "each declared field at most once", nil)
			}
			// Arrays are ordered and order would move identity: the
			// canonical structure pins one order (UTF-16 code units,
			// matching RFC 8785 member sorting).
			if index > 0 && !utf16Less(previous, name) {
				return structureRefusal(append(path, "optional", fmt.Sprintf("%d", index)),
					"flb.type.v0: optional names are sorted by UTF-16 code units — list order must not move identity",
					name, fmt.Sprintf("a name sorting after %q", previous), nil)
			}
			seen[name] = true
			previous = name
		}
	}
	return nil
}

func walkCheck(node map[string]any, path []string, result *walkResult, allowHoles bool) *Refusal {
	if r := checkKeys(node, path, "check", "k", "base", "check"); r != nil {
		return r
	}
	base, present := node["base"]
	if !present {
		return structureRefusal(path,
			"flb.type.v0: a check wraps its base type in \"base\"",
			node, `{"k":"check","base":T,"check":{"name":<string>,"args":{...}}}`,
			exampleCheck())
	}
	if r := walkNode(base, append(path, "base"), result, allowHoles); r != nil {
		return r
	}
	checkValue, ok := node["check"].(map[string]any)
	if !ok {
		return structureRefusal(append(path, "check"),
			"flb.type.v0: a check node declares serializable metadata — a name and args; code with no canonical form cannot claim identity",
			node["check"], `{"name":<string>,"args":{...}}`, exampleCheck())
	}
	for key := range checkValue {
		if key != "name" && key != "args" {
			return structureRefusal(append(path, "check", key),
				"flb.type.v0: a declared check carries exactly \"name\" and \"args\"",
				key, []string{"name", "args"}, exampleCheck())
		}
	}
	name, ok := checkValue["name"].(string)
	if !ok || name == "" {
		return structureRefusal(append(path, "check", "name"),
			"flb.type.v0: a declared check carries a non-empty name",
			checkValue["name"], "a non-empty string", exampleCheck())
	}
	if _, ok := checkValue["args"].(map[string]any); !ok {
		return structureRefusal(append(path, "check", "args"),
			"flb.type.v0: check args are a JSON object (possibly empty)",
			checkValue["args"], "an object", exampleCheck())
	}
	return nil
}

func checkKeys(node map[string]any, path []string, kind string, allowed ...string) *Refusal {
	allowedSet := make(map[string]bool, len(allowed))
	for _, key := range allowed {
		allowedSet[key] = true
	}
	extra := make([]string, 0)
	for key := range node {
		if !allowedSet[key] {
			extra = append(extra, key)
		}
	}
	if len(extra) == 0 {
		return nil
	}
	sort.Strings(extra)
	return structureRefusal(append(path, extra[0]),
		fmt.Sprintf("flb.type.v0: a %q node carries exactly its declared keys — unknown keys refuse", kind),
		extra, allowed, nil)
}

// utf16Less mirrors go/canonical's member ordering (RFC 8785): compare
// by UTF-16 code units, which differs from Go's byte order only above
// the basic multilingual plane.
func utf16Less(left, right string) bool {
	leftUnits := utf16.Encode([]rune(left))
	rightUnits := utf16.Encode([]rune(right))
	length := min(len(leftUnits), len(rightUnits))
	for index := 0; index < length; index++ {
		if leftUnits[index] != rightUnits[index] {
			return leftUnits[index] < rightUnits[index]
		}
	}
	return len(leftUnits) < len(rightUnits)
}

func structureRefusal(path []string, law string, got, expected, example any) *Refusal {
	return &Refusal{
		Kind:     KindInvalidStructure,
		Law:      law,
		Path:     frozenPath(path),
		Got:      got,
		Expected: expected,
		Example:  example,
		Next: []NextHint{
			{
				Subject: SubjectTypeCreate,
				Note:    "repair the node at path and resubmit; same bytes converge, they never error",
			},
			describeHint(),
		},
	}
}

func frozenPath(path []string) []string {
	frozen := make([]string, len(path))
	copy(frozen, path)
	return frozen
}

func exampleCheck() map[string]any {
	return map[string]any{
		"k":     "check",
		"base":  map[string]any{"k": "string"},
		"check": map[string]any{"name": "minLength", "args": map[string]any{"min": 1}},
	}
}
