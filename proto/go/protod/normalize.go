package protod

import (
	"bytes"
	"fmt"
	"sort"
)

// normalize returns the unique flb.type.v0 identity normal form without
// mutating its input. It is defined on grammar-valid terms: walkStructure is
// the admission check that runs before this function on the certify path.
//
// Termination is structural: every recursive call receives one strict child
// of the finite input tree. The only rewrite clause today sorts union members
// after their children reach normal form. That clause has a unique result, so
// disjoint/nested applications converge; normalize's property gate exercises
// bottom-up and fair top-down schedules and also pins idempotence.
func normalize(value any) (any, error) {
	node, ok := value.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("normalize flb.type.v0: node is not an object")
	}
	normalized := make(map[string]any, len(node))
	for key, item := range node {
		normalized[key] = item
	}

	normalizeChild := func(key string) error {
		child, err := normalize(node[key])
		if err != nil {
			return err
		}
		normalized[key] = child
		return nil
	}

	switch node["k"] {
	case "list", "brand":
		if err := normalizeChild("of"); err != nil {
			return nil, err
		}
	case "check":
		if err := normalizeChild("base"); err != nil {
			return nil, err
		}
	case "struct":
		fields, ok := node["fields"].(map[string]any)
		if !ok {
			return nil, fmt.Errorf("normalize flb.type.v0: struct fields are not an object")
		}
		normalizedFields := make(map[string]any, len(fields))
		for name, field := range fields {
			normalizedField, err := normalize(field)
			if err != nil {
				return nil, err
			}
			normalizedFields[name] = normalizedField
		}
		normalized["fields"] = normalizedFields
	case "union":
		members, ok := node["of"].([]any)
		if !ok {
			return nil, fmt.Errorf("normalize flb.type.v0: union members are not an array")
		}
		type canonicalMember struct {
			value any
			bytes []byte
		}
		canonical := make([]canonicalMember, len(members))
		for index, member := range members {
			normalizedMember, err := normalize(member)
			if err != nil {
				return nil, err
			}
			memberBytes, err := canonicalBytes(normalizedMember)
			if err != nil {
				return nil, err
			}
			canonical[index] = canonicalMember{value: normalizedMember, bytes: memberBytes}
		}
		sort.Slice(canonical, func(i, j int) bool {
			return bytes.Compare(canonical[i].bytes, canonical[j].bytes) < 0
		})
		normalizedMembers := make([]any, len(canonical))
		for index, member := range canonical {
			normalizedMembers[index] = member.value
		}
		normalized["of"] = normalizedMembers
	}
	return normalized, nil
}
