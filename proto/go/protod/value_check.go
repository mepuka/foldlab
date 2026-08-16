package protod

import (
	"bytes"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strings"
	"unicode/utf16"
)

func (d *Daemon) checkCatalogedValue(typeDigest string, value any, path []string) *Refusal {
	fact, known := d.catalog.resolveFact(typeDigest)
	if !known || !isTypeFactScheme(fact.Scheme) {
		return &Refusal{
			Kind: KindUnknownRef,
			Law:  "protocol fills type-check only against a cataloged flb.type.v0 structure",
			Path: []string{"hole", "type"}, Got: typeDigest,
			Expected: "a digest cataloged under an owned or attested type scheme",
			Next:     []NextHint{readCatalogHint()},
		}
	}
	return d.checkValue(fact.Structure, value, path)
}

func (d *Daemon) checkValue(structure, value any, path []string) *Refusal {
	node, ok := structure.(map[string]any)
	if !ok {
		return valueRefusal(path, value, "a value admitted by the hole's cataloged type")
	}
	kind, _ := node["k"].(string)
	switch kind {
	case "opaque":
		return nil
	case "string":
		if _, ok := value.(string); ok {
			return nil
		}
	case "bool":
		if _, ok := value.(bool); ok {
			return nil
		}
	case "int":
		if number, ok := value.(float64); ok && math.Trunc(number) == number && math.Abs(number) <= 9007199254740991 {
			return nil
		}
	case "float":
		if _, ok := value.(float64); ok {
			return nil
		}
	case "null":
		if value == nil {
			return nil
		}
	case "literal":
		left, leftErr := canonicalBytes(value)
		right, rightErr := canonicalBytes(node["value"])
		if leftErr == nil && rightErr == nil && bytes.Equal(left, right) {
			return nil
		}
	case "list":
		items, ok := value.([]any)
		if !ok {
			break
		}
		for index, item := range items {
			if refusal := d.checkValue(node["of"], item, append(path, fmt.Sprint(index))); refusal != nil {
				return refusal
			}
		}
		return nil
	case "struct":
		object, ok := value.(map[string]any)
		if !ok {
			break
		}
		fields, _ := node["fields"].(map[string]any)
		optional := map[string]bool{}
		if optionalValues, ok := node["optional"].([]any); ok {
			for _, item := range optionalValues {
				if name, ok := item.(string); ok {
					optional[name] = true
				}
			}
		}
		names := make([]string, 0, len(fields))
		for name := range fields {
			names = append(names, name)
		}
		sort.Slice(names, func(i, j int) bool { return utf16Less(names[i], names[j]) })
		for _, name := range names {
			field := fields[name]
			item, present := object[name]
			if !present {
				if optional[name] {
					continue
				}
				return valueRefusal(append(path, name), nil, "a required field")
			}
			if refusal := d.checkValue(field, item, append(path, name)); refusal != nil {
				return refusal
			}
		}
		if extra := unknownKeysInIdentityOrder(object, names...); len(extra) > 0 {
			return valueRefusal(append(path, extra[0]), object[extra[0]], "no undeclared fields")
		}
		return nil
	case "union":
		members, _ := node["of"].([]any)
		for _, member := range members {
			if d.checkValue(member, value, path) == nil {
				return nil
			}
		}
	case "brand":
		return d.checkValue(node["of"], value, path)
	case "ref":
		digest, _ := node["digest"].(string)
		return d.checkCatalogedValue(digest, value, path)
	case "check":
		if refusal := d.checkValue(node["base"], value, path); refusal != nil {
			return refusal
		}
		check, _ := node["check"].(map[string]any)
		name, _ := check["name"].(string)
		args, _ := check["args"].(map[string]any)
		if checkValuePredicate(name, args, value) {
			return nil
		}
		return valueRefusal(path, value, map[string]any{"check": name, "args": args})
	}
	return valueRefusal(path, value, map[string]any{"type": cloneJSON(structure)})
}

func checkValuePredicate(name string, args map[string]any, value any) bool {
	switch name {
	case "minLength", "maxLength":
		text, ok := value.(string)
		if !ok {
			return false
		}
		argName := "min"
		if name == "maxLength" {
			argName = "max"
		}
		bound, ok := numericArg(args, argName)
		if !ok {
			return false
		}
		length := float64(len(utf16.Encode([]rune(text))))
		if name == "minLength" {
			return length >= bound
		}
		return length <= bound
	case "pattern":
		text, ok := value.(string)
		source, sourceOK := args["source"].(string)
		flags, flagsOK := args["flags"].(string)
		if !flagsOK {
			flags = ""
		}
		prefix := ""
		for _, flag := range flags {
			if !strings.ContainsRune("dgimsuy", flag) {
				return false
			}
			if strings.ContainsRune("ims", flag) && !strings.ContainsRune(prefix, flag) {
				prefix += string(flag)
			}
		}
		if prefix != "" {
			source = "(?" + prefix + ")" + source
		}
		pattern, err := regexp.Compile(source)
		return ok && sourceOK && err == nil && pattern.MatchString(text)
	case "min", "greaterThan", "max", "lessThan":
		number, ok := value.(float64)
		argName := map[string]string{
			"min": "min", "greaterThan": "exclusiveMin", "max": "max", "lessThan": "exclusiveMax",
		}[name]
		bound, boundOK := numericArg(args, argName)
		if !ok || !boundOK {
			return false
		}
		switch name {
		case "min":
			return number >= bound
		case "greaterThan":
			return number > bound
		case "max":
			return number <= bound
		default:
			return number < bound
		}
	default:
		return false
	}
}

func numericArg(args map[string]any, names ...string) (float64, bool) {
	for _, name := range names {
		if value, ok := args[name].(float64); ok {
			return value, true
		}
	}
	return 0, false
}

func valueRefusal(path []string, got, expected any) *Refusal {
	return &Refusal{
		Kind: KindInvalidStructure,
		Law:  "a protocol fill value must conform to the hole's cataloged flb.type.v0 structure",
		Path: frozenPath(path), Got: got, Expected: expected,
		Next: []NextHint{{Subject: SubjectProtocolSessionState, Note: "read the session and submit a conforming value to a hole this session still admits"}, describeHint()},
	}
}
