package protod

import (
	"encoding/json"
	"fmt"
	"strconv"
)

const frontierRefLimit = 16

type fillRequest struct {
	Partial any      `json:"partial"`
	Path    []string `json:"path"`
	Subtree any      `json:"subtree"`
}

type unfillRequest struct {
	Partial any      `json:"partial"`
	Path    []string `json:"path"`
}

type frontierChoice struct {
	Kind    string `json:"kind"`
	Example any    `json:"example"`
}

type frontierEntry struct {
	Path  []string         `json:"path"`
	Legal []frontierChoice `json:"legal"`
	Refs  []string         `json:"refs"`
}

type conciergeReply struct {
	OK       bool            `json:"ok"`
	Partial  any             `json:"partial"`
	Frontier []frontierEntry `json:"frontier"`
	Next     []NextHint      `json:"next"`
}

func (d *Daemon) serveFill(body []byte) any {
	var request fillRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireRequestFields(body, "partial", "path", "subtree"); refusal != nil {
		return refuse(refusal)
	}
	if request.Partial == nil {
		return refuse(malformedConciergeField(
			"partial", request.Partial, "an flb.type.v0 partial node",
			map[string]any{"partial": map[string]any{"k": "hole"}, "path": []any{}, "subtree": map[string]any{"k": "string"}},
		))
	}

	updated, replacementRefusal := replaceTypeNode(
		request.Partial,
		request.Path,
		request.Subtree,
		true,
	)
	if replacementRefusal != nil {
		return refuse(teachFill(replacementRefusal, request))
	}
	result, walkRefusal := walkPartial(updated, []string{})
	if walkRefusal != nil {
		walkRefusal.Path = append([]string{"partial"}, walkRefusal.Path...)
		return refuse(teachFill(walkRefusal, request))
	}
	if unknown := d.firstUnknownRef(result.refs, "partial", SubjectTypeFill); unknown != nil {
		if repaired := d.teachUnknownRefRepair(unknown, updated); repaired != nil {
			return refuse(repaired)
		}
		return refuse(teachFill(unknown, request))
	}

	frontier := d.buildFrontier(result.holes)
	return conciergeReply{
		OK:       true,
		Partial:  updated,
		Frontier: frontier,
		Next:     conciergeNext(updated, frontier),
	}
}

func (d *Daemon) serveUnfill(body []byte) any {
	var request unfillRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireRequestFields(body, "partial", "path"); refusal != nil {
		return refuse(refusal)
	}
	if request.Partial == nil {
		return refuse(malformedConciergeField(
			"partial", request.Partial, "an flb.type.v0 partial node",
			map[string]any{"partial": map[string]any{"k": "string"}, "path": []any{}},
		))
	}

	updated, replacementRefusal := replaceTypeNode(
		request.Partial,
		request.Path,
		map[string]any{"k": "hole"},
		false,
	)
	if replacementRefusal != nil {
		return refuse(teachUnfill(replacementRefusal, request))
	}
	result, walkRefusal := walkPartial(updated, []string{})
	if walkRefusal != nil {
		walkRefusal.Path = append([]string{"partial"}, walkRefusal.Path...)
		return refuse(teachUnfill(walkRefusal, request))
	}
	if unknown := d.firstUnknownRef(result.refs, "partial", SubjectTypeUnfill); unknown != nil {
		if repaired := d.teachUnknownRefRepair(unknown, updated); repaired != nil {
			return refuse(repaired)
		}
		return refuse(teachUnfill(unknown, request))
	}

	frontier := d.buildFrontier(result.holes)
	return conciergeReply{
		OK:       true,
		Partial:  updated,
		Frontier: frontier,
		Next:     conciergeNext(updated, frontier),
	}
}

func (d *Daemon) buildFrontier(holes [][]string) []frontierEntry {
	refs := d.catalog.resolvableDigests(frontierRefLimit)
	legal := frontierChoices(refs)
	frontier := make([]frontierEntry, len(holes))
	for index, path := range holes {
		frontier[index] = frontierEntry{
			Path:  frozenPath(path),
			Legal: legal,
			Refs:  append([]string{}, refs...),
		}
	}
	return frontier
}

func frontierChoices(refs []string) []frontierChoice {
	hole := func() map[string]any { return map[string]any{"k": "hole"} }
	choices := []frontierChoice{
		{Kind: "string", Example: map[string]any{"k": "string"}},
		{Kind: "bool", Example: map[string]any{"k": "bool"}},
		{Kind: "int", Example: map[string]any{"k": "int"}},
		{Kind: "float", Example: map[string]any{"k": "float"}},
		{Kind: "null", Example: map[string]any{"k": "null"}},
		{Kind: "opaque", Example: map[string]any{"k": "opaque"}},
		{Kind: "literal", Example: map[string]any{"k": "literal", "value": nil}},
		{Kind: "list", Example: map[string]any{"k": "list", "of": hole()}},
		{Kind: "struct", Example: map[string]any{"k": "struct", "fields": map[string]any{}, "optional": []any{}}},
		{Kind: "union", Example: map[string]any{"k": "union", "of": []any{hole()}}},
		{Kind: "brand", Example: map[string]any{"k": "brand", "name": "Brand", "of": hole()}},
		{
			Kind: "check",
			Example: map[string]any{
				"k": "check", "base": hole(),
				"check": map[string]any{"name": "check", "args": map[string]any{}},
			},
		},
	}
	if len(refs) > 0 {
		choices = append(choices, frontierChoice{
			Kind:    "ref",
			Example: map[string]any{"k": "ref", "digest": refs[0]},
		})
	}
	return choices
}

func conciergeNext(partial any, frontier []frontierEntry) []NextHint {
	if len(frontier) == 0 {
		return []NextHint{
			{
				Subject: SubjectTypeCreate,
				Note:    "frontier is empty; finish by creating this decided type",
				Body:    map[string]any{"structure": partial},
			},
			describeHint(),
		}
	}
	first := frontier[0]
	choice := first.Legal[0]
	return []NextHint{
		{
			Subject: SubjectTypeFill,
			Note:    "fill the first remaining hole with any advertised legal example",
			Body: map[string]any{
				"partial": partial,
				"path":    first.Path,
				"subtree": choice.Example,
			},
		},
		describeHint(),
	}
}

func (d *Daemon) firstUnknownRef(refs []refUse, prefix string, subject string) *Refusal {
	for _, ref := range refs {
		if !d.catalog.resolve(ref.digest) {
			return &Refusal{
				Kind:     KindUnknownRef,
				Law:      "W4/DAG: every ref in a partial must already resolve — no forward refs, no admission on faith",
				Path:     append([]string{prefix}, ref.path...),
				Got:      ref.digest,
				Expected: "a digest already committed to the catalog",
				Next: []NextHint{
					{
						Subject: SubjectTypeCreate,
						Note:    "create the referenced type first, then retry this concierge step",
					},
					{Subject: subject, Note: "retry the same step after the ref resolves"},
					readCatalogHint(),
				},
			}
		}
	}
	return nil
}

func (d *Daemon) teachUnknownRefRepair(refusal *Refusal, partial any) *Refusal {
	candidates := d.catalog.resolvableDigests(frontierRefLimit)
	if len(candidates) == 0 || len(refusal.Path) < 2 || refusal.Path[0] != "partial" || refusal.Path[len(refusal.Path)-1] != "digest" {
		return nil
	}

	path := append([]string{}, refusal.Path[1:len(refusal.Path)-1]...)
	holed, replacementRefusal := replaceTypeNode(partial, path, map[string]any{"k": "hole"}, false)
	if replacementRefusal != nil {
		return nil
	}

	example := map[string]any{"k": "ref", "digest": candidates[0]}
	refusal.Example = example
	refusal.Next = append([]NextHint{{
		Subject: SubjectTypeFill,
		Note:    "replace the unresolved ref with this catalog-resolvable example",
		Body: map[string]any{
			"partial": holed,
			"path":    path,
			"subtree": example,
		},
	}}, refusal.Next...)
	return refusal
}

func teachFill(refusal *Refusal, request fillRequest) *Refusal {
	refusal.Next = []NextHint{
		{
			Subject: SubjectTypeFill,
			Note:    "repair the field named by the refusal and retry this stateless fill",
			Body: map[string]any{
				"partial": request.Partial,
				"path":    request.Path,
				"subtree": request.Subtree,
			},
		},
		describeHint(),
	}
	return refusal
}

func teachUnfill(refusal *Refusal, request unfillRequest) *Refusal {
	refusal.Next = []NextHint{
		{
			Subject: SubjectTypeUnfill,
			Note:    "repair the field named by the refusal and retry this stateless unfill",
			Body: map[string]any{
				"partial": request.Partial,
				"path":    request.Path,
			},
		},
		describeHint(),
	}
	return refusal
}

func replaceTypeNode(value any, path []string, replacement any, requireHole bool) (any, *Refusal) {
	if len(path) == 0 {
		if requireHole {
			node, ok := value.(map[string]any)
			if !ok || node["k"] != "hole" {
				return nil, pathRefusal(path, value, "a hole at the requested path")
			}
		}
		return cloneJSON(replacement), nil
	}

	node, ok := value.(map[string]any)
	if !ok {
		return nil, pathRefusal(path, value, "a path through flb.type.v0 child nodes")
	}
	clone := cloneMap(node)
	switch node["k"] {
	case "list", "brand":
		if path[0] != "of" {
			return nil, pathRefusal(path, path[0], []string{"of"})
		}
		child, refusal := replaceTypeNode(node["of"], path[1:], replacement, requireHole)
		if refusal != nil {
			return nil, refusal
		}
		clone["of"] = child
		return clone, nil
	case "check":
		if path[0] != "base" {
			return nil, pathRefusal(path, path[0], []string{"base"})
		}
		child, refusal := replaceTypeNode(node["base"], path[1:], replacement, requireHole)
		if refusal != nil {
			return nil, refusal
		}
		clone["base"] = child
		return clone, nil
	case "struct":
		if len(path) < 2 || path[0] != "fields" {
			return nil, pathRefusal(path, path, []string{"fields", "<field-name>"})
		}
		fields, ok := node["fields"].(map[string]any)
		if !ok {
			return nil, pathRefusal(path, node["fields"], "an object of fields")
		}
		childValue, present := fields[path[1]]
		if !present {
			return nil, pathRefusal(path, path[1], "a declared field name")
		}
		child, refusal := replaceTypeNode(childValue, path[2:], replacement, requireHole)
		if refusal != nil {
			return nil, refusal
		}
		fieldClone := cloneMap(fields)
		fieldClone[path[1]] = child
		clone["fields"] = fieldClone
		return clone, nil
	case "union":
		if len(path) < 2 || path[0] != "of" {
			return nil, pathRefusal(path, path, []string{"of", "<index>"})
		}
		members, ok := node["of"].([]any)
		if !ok {
			return nil, pathRefusal(path, node["of"], "an array of union members")
		}
		index, err := strconv.Atoi(path[1])
		if err != nil || index < 0 || index >= len(members) || strconv.Itoa(index) != path[1] {
			return nil, pathRefusal(path, path[1], fmt.Sprintf("an index from 0 to %d", len(members)-1))
		}
		child, refusal := replaceTypeNode(members[index], path[2:], replacement, requireHole)
		if refusal != nil {
			return nil, refusal
		}
		memberClone := append([]any{}, members...)
		memberClone[index] = child
		clone["of"] = memberClone
		return clone, nil
	default:
		return nil, pathRefusal(path, path, "a child path on list, struct, union, brand, or check")
	}
}

func pathRefusal(path []string, got, expected any) *Refusal {
	return &Refusal{
		Kind:     KindInvalidStructure,
		Law:      "concierge paths address type nodes through flb.type.v0 child edges; a missing node or metadata position refuses",
		Path:     append([]string{"partial"}, path...),
		Got:      got,
		Expected: expected,
		Example:  []string{"fields", "name"},
	}
}

func cloneMap(value map[string]any) map[string]any {
	clone := make(map[string]any, len(value))
	for key, item := range value {
		clone[key] = item
	}
	return clone
}

func cloneJSON(value any) any {
	raw, err := json.Marshal(value)
	if err != nil {
		return value
	}
	var clone any
	if err := json.Unmarshal(raw, &clone); err != nil {
		return value
	}
	return clone
}

func requireRequestFields(body []byte, fields ...string) *Refusal {
	var decoded map[string]json.RawMessage
	if err := json.Unmarshal(body, &decoded); err != nil {
		return nil
	}
	for _, field := range fields {
		raw, present := decoded[field]
		if !present || string(raw) == "null" && field == "path" {
			return malformedConciergeField(field, nil, "a required request field", nil)
		}
	}
	return nil
}

func malformedConciergeField(field string, got, expected, example any) *Refusal {
	return &Refusal{
		Kind:     KindMalformed,
		Law:      "concierge requests carry partial, path, and operation-specific fields in their declared shapes",
		Path:     []string{field},
		Got:      got,
		Expected: expected,
		Example:  example,
		Next:     []NextHint{describeHint()},
	}
}
