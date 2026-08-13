package catalogr4

import (
	"fmt"
	"math"
	"sort"
)

type createFact struct {
	Created bool
	Digest  string
}

type refusalFact struct {
	Kind string
}

func decodeCreateFact(reply map[string]any) (createFact, error) {
	if err := requireExactKeys(reply,
		"catalogHead", "catalogSeq", "created", "digest", "next", "ok", "scheme"); err != nil {
		return createFact{}, err
	}
	if err := requireBoolValue(reply, "ok", true); err != nil {
		return createFact{}, err
	}
	created, err := requireBool(reply, "created")
	if err != nil {
		return createFact{}, err
	}
	digest, err := requireString(reply, "digest")
	if err != nil {
		return createFact{}, err
	}
	scheme, err := requireString(reply, "scheme")
	if err != nil {
		return createFact{}, err
	}
	if scheme != "flb.type.v1" {
		return createFact{}, fmt.Errorf("field %q = %q, want %q", "scheme", scheme, "flb.type.v1")
	}
	if _, err := requireInteger(reply, "catalogSeq"); err != nil {
		return createFact{}, err
	}
	if _, err := requireString(reply, "catalogHead"); err != nil {
		return createFact{}, err
	}
	if err := requireHints(reply, "next"); err != nil {
		return createFact{}, err
	}
	return createFact{Created: created, Digest: digest}, nil
}

func decodeAdmitFact(reply map[string]any, journal string) error {
	if err := requireExactKeys(reply,
		"admitted", "head", "journal", "next", "note", "ok", "seq"); err != nil {
		return err
	}
	if err := requireBoolValue(reply, "ok", true); err != nil {
		return err
	}
	if err := requireBoolValue(reply, "admitted", true); err != nil {
		return err
	}
	gotJournal, err := requireString(reply, "journal")
	if err != nil {
		return err
	}
	if gotJournal != journal {
		return fmt.Errorf("field %q = %q, want %q", "journal", gotJournal, journal)
	}
	if _, err := requireInteger(reply, "seq"); err != nil {
		return err
	}
	if _, err := requireString(reply, "head"); err != nil {
		return err
	}
	if _, err := requireString(reply, "note"); err != nil {
		return err
	}
	return requireHints(reply, "next")
}

func decodeRefusalFact(reply map[string]any) (refusalFact, error) {
	if err := requireExactKeys(reply, "ok", "refusal"); err != nil {
		return refusalFact{}, err
	}
	if err := requireBoolValue(reply, "ok", false); err != nil {
		return refusalFact{}, err
	}
	refusal, ok := reply["refusal"].(map[string]any)
	if !ok {
		return refusalFact{}, fmt.Errorf("field %q is %T, want object", "refusal", reply["refusal"])
	}
	if err := requireAllowedKeys(refusal,
		[]string{"kind", "law", "local", "next"},
		[]string{"example", "expected", "got", "path"}); err != nil {
		return refusalFact{}, fmt.Errorf("field %q: %w", "refusal", err)
	}
	kind, err := requireString(refusal, "kind")
	if err != nil {
		return refusalFact{}, fmt.Errorf("field %q: %w", "refusal", err)
	}
	if _, err := requireString(refusal, "law"); err != nil {
		return refusalFact{}, fmt.Errorf("field %q: %w", "refusal", err)
	}
	if err := requireBoolValue(refusal, "local", false); err != nil {
		return refusalFact{}, fmt.Errorf("field %q: %w", "refusal", err)
	}
	if err := requireHints(refusal, "next"); err != nil {
		return refusalFact{}, fmt.Errorf("field %q: %w", "refusal", err)
	}
	if rawPath, exists := refusal["path"]; exists {
		path, ok := rawPath.([]any)
		if !ok {
			return refusalFact{}, fmt.Errorf("field %q.path is %T, want array", "refusal", rawPath)
		}
		for index, item := range path {
			if _, ok := item.(string); !ok {
				return refusalFact{}, fmt.Errorf("field %q.path[%d] is %T, want string", "refusal", index, item)
			}
		}
	}
	return refusalFact{Kind: kind}, nil
}

func requireExactKeys(value map[string]any, expected ...string) error {
	return requireAllowedKeys(value, expected, nil)
}

func requireAllowedKeys(value map[string]any, required, optional []string) error {
	allowed := make(map[string]bool, len(required)+len(optional))
	for _, key := range required {
		allowed[key] = true
		if _, ok := value[key]; !ok {
			return fmt.Errorf("missing field %q", key)
		}
	}
	for _, key := range optional {
		allowed[key] = true
	}
	var extras []string
	for key := range value {
		if !allowed[key] {
			extras = append(extras, key)
		}
	}
	if len(extras) > 0 {
		sort.Strings(extras)
		return fmt.Errorf("unexpected fields %v", extras)
	}
	return nil
}

func requireBool(value map[string]any, field string) (bool, error) {
	raw, exists := value[field]
	if !exists {
		return false, fmt.Errorf("missing field %q", field)
	}
	got, ok := raw.(bool)
	if !ok {
		return false, fmt.Errorf("field %q is %T, want boolean", field, raw)
	}
	return got, nil
}

func requireBoolValue(value map[string]any, field string, expected bool) error {
	got, err := requireBool(value, field)
	if err != nil {
		return err
	}
	if got != expected {
		return fmt.Errorf("field %q = %t, want %t", field, got, expected)
	}
	return nil
}

func requireString(value map[string]any, field string) (string, error) {
	raw, exists := value[field]
	if !exists {
		return "", fmt.Errorf("missing field %q", field)
	}
	got, ok := raw.(string)
	if !ok {
		return "", fmt.Errorf("field %q is %T, want string", field, raw)
	}
	return got, nil
}

func requireInteger(value map[string]any, field string) (int64, error) {
	raw, exists := value[field]
	if !exists {
		return 0, fmt.Errorf("missing field %q", field)
	}
	got, ok := raw.(float64)
	if !ok || math.Trunc(got) != got || got < 0 {
		return 0, fmt.Errorf("field %q is %v (%T), want a non-negative integer", field, raw, raw)
	}
	return int64(got), nil
}

func requireHints(value map[string]any, field string) error {
	raw, exists := value[field]
	if !exists {
		return fmt.Errorf("missing field %q", field)
	}
	hints, ok := raw.([]any)
	if !ok {
		return fmt.Errorf("field %q is %T, want array", field, raw)
	}
	for index, rawHint := range hints {
		hint, ok := rawHint.(map[string]any)
		if !ok {
			return fmt.Errorf("field %q[%d] is %T, want object", field, index, rawHint)
		}
		if err := requireAllowedKeys(hint, []string{"note", "subject"}, []string{"body"}); err != nil {
			return fmt.Errorf("field %q[%d]: %w", field, index, err)
		}
		if _, err := requireString(hint, "subject"); err != nil {
			return fmt.Errorf("field %q[%d]: %w", field, index, err)
		}
		if _, err := requireString(hint, "note"); err != nil {
			return fmt.Errorf("field %q[%d]: %w", field, index, err)
		}
	}
	return nil
}
