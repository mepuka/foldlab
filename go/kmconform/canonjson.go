package kmconform

// Estate canonical JSON.
//
// RFC 8785 (JCS) is the reference for member ordering, string escaping, and
// structure serialization, with ONE documented deviation, for numbers.
//
//   - Objects: members sorted lexicographically by key. Every key is ASCII,
//     so code-unit order is byte order and Go's string comparison is exactly
//     the required order. No whitespace anywhere.
//   - Strings: JCS escaping exactly — backslash, double quote, and the
//     two-char escapes \b \f \n \r \t; every other control character as
//     \u00XX in lowercase hex; nothing else escaped. Every byte is ASCII.
//   - Numbers (THE DEVIATION, tighter than JCS): every number is an
//     unbounded non-negative integer serialized as minimal decimal — no
//     exponent, no fraction, no leading zeros, no minus. JCS's double-based
//     number serialization is NOT used, because encoding vectors carry Nats
//     that can exceed 2^53 and a binary64 round trip would silently round
//     one. Integers are parsed at arbitrary precision (math/big); a
//     fraction, an exponent, or a minus sign is refused, never coerced.
//   - File: UTF-8 (thus ASCII), one record per line, LF after every record
//     including the last.
//
// This is deliberately NOT foldlab/canonical. That package is the RFC 8785
// seam for the substrate's chain identity, and its numbers are binary64 by
// the spec it implements. Sharing one encoder across both would mean either
// rounding a kernel Nat or breaking a frozen digest wall; the two number
// domains are different, so the two encoders are.

import (
	"errors"
	"fmt"
	"math/big"
	"sort"
	"strings"
)

// maxJSONDepth bounds recursion on adversarial input. The corpus nests three
// deep at its worst; the bound exists so a hostile line cannot exhaust the
// stack, not to express a grammar rule.
const maxJSONDepth = 256

// JSONKind is the tag of an estate canonical JSON value. There is no float
// kind: the number domain is the unbounded non-negative integers.
type JSONKind uint8

const (
	JSONNull JSONKind = iota
	JSONBool
	JSONInteger
	JSONString
	JSONArray
	JSONObject
)

func (k JSONKind) String() string {
	switch k {
	case JSONNull:
		return "null"
	case JSONBool:
		return "bool"
	case JSONInteger:
		return "integer"
	case JSONString:
		return "string"
	case JSONArray:
		return "array"
	case JSONObject:
		return "object"
	default:
		return fmt.Sprintf("JSONKind(%d)", uint8(k))
	}
}

// JSONValue is one estate canonical JSON value. The zero value is null.
//
// An object's members are held sorted by name, so the in-memory form is
// already in canonical order and serialization never re-sorts. That is what
// makes the both-ways law cheap to state: a parse followed by an emit is the
// identity on canonical bytes.
type JSONValue struct {
	kind    JSONKind
	boolean bool
	integer *big.Int
	text    string
	items   []JSONValue
	members []JSONMember
}

// JSONMember is one object member.
type JSONMember struct {
	Name  string
	Value JSONValue
}

// NullValue is the JSON null.
func NullValue() JSONValue { return JSONValue{kind: JSONNull} }

// BoolValue is a JSON boolean.
func BoolValue(value bool) JSONValue { return JSONValue{kind: JSONBool, boolean: value} }

// IntValue is a JSON integer. A nil or negative argument is refused at
// serialization time rather than silently repaired.
func IntValue(value *big.Int) JSONValue {
	if value == nil {
		return JSONValue{kind: JSONInteger, integer: nil}
	}
	return JSONValue{kind: JSONInteger, integer: new(big.Int).Set(value)}
}

// UintValue is a JSON integer from a Go unsigned width.
func UintValue(value uint64) JSONValue {
	return JSONValue{kind: JSONInteger, integer: new(big.Int).SetUint64(value)}
}

// StringValue is a JSON string.
func StringValue(value string) JSONValue { return JSONValue{kind: JSONString, text: value} }

// ArrayValue is a JSON array.
func ArrayValue(items ...JSONValue) JSONValue {
	copied := make([]JSONValue, len(items))
	copy(copied, items)
	return JSONValue{kind: JSONArray, items: copied}
}

// ObjectValue is a JSON object. The members are sorted into canonical order
// here, once, so no later stage has to. A duplicate member name is refused:
// two members with one name denote no value.
func ObjectValue(members ...JSONMember) (JSONValue, error) {
	copied := make([]JSONMember, len(members))
	copy(copied, members)
	sort.Slice(copied, func(left, right int) bool {
		return copied[left].Name < copied[right].Name
	})
	for index := 1; index < len(copied); index++ {
		if copied[index].Name == copied[index-1].Name {
			return JSONValue{}, fmt.Errorf("duplicate object member name %q", copied[index].Name)
		}
	}
	return JSONValue{kind: JSONObject, members: copied}, nil
}

// Kind reports the value's tag.
func (v JSONValue) Kind() JSONKind { return v.kind }

// Bool reads a boolean. The second result is false for any other kind.
func (v JSONValue) Bool() (bool, bool) { return v.boolean, v.kind == JSONBool }

// Int reads an integer. The returned value is a copy: a caller cannot reach
// back into the parsed corpus through it.
func (v JSONValue) Int() (*big.Int, bool) {
	if v.kind != JSONInteger || v.integer == nil {
		return nil, false
	}
	return new(big.Int).Set(v.integer), true
}

// Text reads a string.
func (v JSONValue) Text() (string, bool) { return v.text, v.kind == JSONString }

// Items reads an array's elements.
func (v JSONValue) Items() ([]JSONValue, bool) {
	if v.kind != JSONArray {
		return nil, false
	}
	return v.items, true
}

// Members reads an object's members, in canonical order.
func (v JSONValue) Members() ([]JSONMember, bool) {
	if v.kind != JSONObject {
		return nil, false
	}
	return v.members, true
}

// Member resolves one object member by name.
func (v JSONValue) Member(name string) (JSONValue, bool) {
	if v.kind != JSONObject {
		return JSONValue{}, false
	}
	index := sort.Search(len(v.members), func(probe int) bool {
		return v.members[probe].Name >= name
	})
	if index < len(v.members) && v.members[index].Name == name {
		return v.members[index].Value, true
	}
	return JSONValue{}, false
}

// MemberNames lists an object's member names in canonical order.
func (v JSONValue) MemberNames() []string {
	names := make([]string, 0, len(v.members))
	for _, member := range v.members {
		names = append(names, member.Name)
	}
	return names
}

// Canonical serializes the value to its estate canonical bytes.
func (v JSONValue) Canonical() ([]byte, error) {
	var out strings.Builder
	if err := v.writeCanonical(&out, 0); err != nil {
		return nil, err
	}
	return []byte(out.String()), nil
}

func (v JSONValue) writeCanonical(out *strings.Builder, depth int) error {
	if depth > maxJSONDepth {
		return fmt.Errorf("nesting exceeds %d", maxJSONDepth)
	}
	switch v.kind {
	case JSONNull:
		out.WriteString("null")
	case JSONBool:
		if v.boolean {
			out.WriteString("true")
		} else {
			out.WriteString("false")
		}
	case JSONInteger:
		if v.integer == nil {
			return errors.New("integer value is absent")
		}
		if v.integer.Sign() < 0 {
			return fmt.Errorf("integer %s is negative: the number domain is the non-negative integers", v.integer)
		}
		out.WriteString(v.integer.String())
	case JSONString:
		if err := writeCanonicalString(out, v.text); err != nil {
			return err
		}
	case JSONArray:
		out.WriteByte('[')
		for index, item := range v.items {
			if index > 0 {
				out.WriteByte(',')
			}
			if err := item.writeCanonical(out, depth+1); err != nil {
				return err
			}
		}
		out.WriteByte(']')
	case JSONObject:
		out.WriteByte('{')
		for index, member := range v.members {
			if index > 0 {
				out.WriteByte(',')
			}
			if err := writeCanonicalString(out, member.Name); err != nil {
				return err
			}
			out.WriteByte(':')
			if err := member.Value.writeCanonical(out, depth+1); err != nil {
				return err
			}
		}
		out.WriteByte('}')
	default:
		return fmt.Errorf("value is outside the canonical JSON domain: %s", v.kind)
	}
	return nil
}

const lowerHexDigits = "0123456789abcdef"

// writeCanonicalString applies JCS escaping. The corpus is ASCII by rule, so
// a non-ASCII byte is refused here rather than escaped: escaping it would
// produce a file that reads back fine and violates the rule invisibly.
func writeCanonicalString(out *strings.Builder, text string) error {
	out.WriteByte('"')
	for index := 0; index < len(text); index++ {
		character := text[index]
		switch character {
		case '"':
			out.WriteString(`\"`)
		case '\\':
			out.WriteString(`\\`)
		case '\b':
			out.WriteString(`\b`)
		case '\f':
			out.WriteString(`\f`)
		case '\n':
			out.WriteString(`\n`)
		case '\r':
			out.WriteString(`\r`)
		case '\t':
			out.WriteString(`\t`)
		default:
			switch {
			case character < 0x20:
				out.WriteString(`\u00`)
				out.WriteByte(lowerHexDigits[character>>4])
				out.WriteByte(lowerHexDigits[character&0x0f])
			case character > 0x7f:
				return fmt.Errorf("string carries the non-ASCII byte 0x%02x: the corpus is ASCII-only by rule", character)
			default:
				out.WriteByte(character)
			}
		}
	}
	out.WriteByte('"')
	return nil
}

// ParseCanonical parses one estate canonical JSON value and refuses any
// deviation from the canonical form: whitespace, unsorted or duplicated
// member names, a non-canonical escape, a non-minimal number, a sign, a
// fraction, an exponent, a non-ASCII byte, or trailing input.
//
// This is the corpus reader. It is strict on purpose: the corpus is
// canonical by rule, so anything else is a defect in whatever produced it,
// and a lenient read here would hide that defect behind a working consumer.
func ParseCanonical(data []byte) (JSONValue, error) {
	return parseWhole(data, true)
}

// ParseRelaxed parses one JSON value in the estate NUMBER domain while
// tolerating what canonicalization is allowed to fix: insignificant
// whitespace and any member order. It still refuses a fraction, an exponent,
// a minus sign, a duplicate member name, and a non-ASCII byte, because those
// are domain violations rather than formatting.
func ParseRelaxed(data []byte) (JSONValue, error) {
	return parseWhole(data, false)
}

// Canonicalize is the pair: read a value in the estate number domain, write
// its canonical bytes. On canonical input it is the identity, which is one
// half of the both-ways law.
func Canonicalize(data []byte) ([]byte, error) {
	value, err := ParseRelaxed(data)
	if err != nil {
		return nil, err
	}
	return value.Canonical()
}

func parseWhole(data []byte, strict bool) (JSONValue, error) {
	reader := &jsonReader{data: data, strict: strict}
	if !strict {
		reader.skipSpace()
	}
	value, err := reader.value(0)
	if err != nil {
		return JSONValue{}, err
	}
	if !strict {
		reader.skipSpace()
	}
	if reader.offset != len(reader.data) {
		return JSONValue{}, reader.errorf("trailing input after the JSON value")
	}
	return value, nil
}

type jsonReader struct {
	data   []byte
	offset int
	strict bool
}

func (r *jsonReader) errorf(format string, args ...any) error {
	return fmt.Errorf("offset %d: %s", r.offset, fmt.Sprintf(format, args...))
}

func (r *jsonReader) skipSpace() {
	for r.offset < len(r.data) {
		switch r.data[r.offset] {
		case ' ', '\t', '\n', '\r':
			r.offset++
		default:
			return
		}
	}
}

func (r *jsonReader) peek() (byte, bool) {
	if r.offset >= len(r.data) {
		return 0, false
	}
	return r.data[r.offset], true
}

func (r *jsonReader) expect(character byte) error {
	current, ok := r.peek()
	if !ok {
		return r.errorf("expected %q, found the end of input", string(character))
	}
	if current != character {
		return r.errorf("expected %q, found %q", string(character), string(current))
	}
	r.offset++
	return nil
}

func (r *jsonReader) literal(word string, value JSONValue) (JSONValue, error) {
	if r.offset+len(word) > len(r.data) || string(r.data[r.offset:r.offset+len(word)]) != word {
		return JSONValue{}, r.errorf("expected the literal %q", word)
	}
	r.offset += len(word)
	return value, nil
}

func (r *jsonReader) value(depth int) (JSONValue, error) {
	if depth > maxJSONDepth {
		return JSONValue{}, r.errorf("nesting exceeds %d", maxJSONDepth)
	}
	current, ok := r.peek()
	if !ok {
		return JSONValue{}, r.errorf("expected a value, found the end of input")
	}
	switch {
	case current == 'n':
		return r.literal("null", NullValue())
	case current == 't':
		return r.literal("true", BoolValue(true))
	case current == 'f':
		return r.literal("false", BoolValue(false))
	case current == '"':
		text, err := r.stringLiteral()
		if err != nil {
			return JSONValue{}, err
		}
		return StringValue(text), nil
	case current == '[':
		return r.array(depth)
	case current == '{':
		return r.object(depth)
	case current == '-':
		return JSONValue{}, r.errorf("a minus sign is not in the number domain: every number is a non-negative integer")
	case current >= '0' && current <= '9':
		return r.number()
	default:
		return JSONValue{}, r.errorf("unexpected byte %q where a value was expected", string(current))
	}
}

func (r *jsonReader) number() (JSONValue, error) {
	start := r.offset
	for r.offset < len(r.data) && r.data[r.offset] >= '0' && r.data[r.offset] <= '9' {
		r.offset++
	}
	digits := string(r.data[start:r.offset])
	if next, ok := r.peek(); ok {
		switch next {
		case '.':
			return JSONValue{}, r.errorf("a fraction is not in the number domain: every number is a non-negative integer")
		case 'e', 'E':
			return JSONValue{}, r.errorf("an exponent is not in the number domain: every number is a non-negative integer")
		}
	}
	if len(digits) > 1 && digits[0] == '0' {
		return JSONValue{}, fmt.Errorf("offset %d: %q carries a leading zero: numbers are minimal decimal", start, digits)
	}
	parsed, ok := new(big.Int).SetString(digits, 10)
	if !ok {
		return JSONValue{}, fmt.Errorf("offset %d: %q is not a decimal integer", start, digits)
	}
	return JSONValue{kind: JSONInteger, integer: parsed}, nil
}

func (r *jsonReader) stringLiteral() (string, error) {
	start := r.offset
	if err := r.expect('"'); err != nil {
		return "", err
	}
	var out strings.Builder
	for {
		current, ok := r.peek()
		if !ok {
			return "", r.errorf("string is not closed")
		}
		switch {
		case current == '"':
			r.offset++
			text := out.String()
			if r.strict {
				var reEmitted strings.Builder
				if err := writeCanonicalString(&reEmitted, text); err != nil {
					return "", err
				}
				raw := string(r.data[start:r.offset])
				if reEmitted.String() != raw {
					return "", fmt.Errorf(
						"offset %d: string %s is not canonically escaped; canonical form is %s",
						start, raw, reEmitted.String())
				}
			}
			return text, nil
		case current == '\\':
			decoded, err := r.escape()
			if err != nil {
				return "", err
			}
			out.WriteByte(decoded)
		case current < 0x20:
			return "", r.errorf("unescaped control character 0x%02x in a string", current)
		case current > 0x7f:
			return "", r.errorf("non-ASCII byte 0x%02x in a string: the corpus is ASCII-only by rule", current)
		default:
			out.WriteByte(current)
			r.offset++
		}
	}
}

func (r *jsonReader) escape() (byte, error) {
	// The caller has established that data[offset] is a backslash.
	r.offset++
	current, ok := r.peek()
	if !ok {
		return 0, r.errorf("string escape is incomplete")
	}
	r.offset++
	switch current {
	case '"':
		return '"', nil
	case '\\':
		return '\\', nil
	case '/':
		return '/', nil
	case 'b':
		return '\b', nil
	case 'f':
		return '\f', nil
	case 'n':
		return '\n', nil
	case 'r':
		return '\r', nil
	case 't':
		return '\t', nil
	case 'u':
		if r.offset+4 > len(r.data) {
			return 0, r.errorf("unicode escape is incomplete")
		}
		var unit uint32
		for index := 0; index < 4; index++ {
			nibble, ok := hexNibble(r.data[r.offset+index])
			if !ok {
				return 0, r.errorf("unicode escape carries the non-hex byte %q", string(r.data[r.offset+index]))
			}
			unit = unit*16 + uint32(nibble)
		}
		r.offset += 4
		if unit > 0x7f {
			return 0, r.errorf("unicode escape \\u%04x is outside ASCII: the corpus is ASCII-only by rule", unit)
		}
		return byte(unit), nil
	default:
		return 0, r.errorf("invalid string escape \\%s", string(current))
	}
}

func hexNibble(character byte) (byte, bool) {
	switch {
	case character >= '0' && character <= '9':
		return character - '0', true
	case character >= 'a' && character <= 'f':
		return character - 'a' + 10, true
	case character >= 'A' && character <= 'F':
		return character - 'A' + 10, true
	default:
		return 0, false
	}
}

func (r *jsonReader) array(depth int) (JSONValue, error) {
	if err := r.expect('['); err != nil {
		return JSONValue{}, err
	}
	items := make([]JSONValue, 0)
	if !r.strict {
		r.skipSpace()
	}
	if current, ok := r.peek(); ok && current == ']' {
		r.offset++
		return JSONValue{kind: JSONArray, items: items}, nil
	}
	for {
		if !r.strict {
			r.skipSpace()
		}
		item, err := r.value(depth + 1)
		if err != nil {
			return JSONValue{}, err
		}
		items = append(items, item)
		if !r.strict {
			r.skipSpace()
		}
		current, ok := r.peek()
		if !ok {
			return JSONValue{}, r.errorf("array is not closed")
		}
		switch current {
		case ',':
			r.offset++
		case ']':
			r.offset++
			return JSONValue{kind: JSONArray, items: items}, nil
		default:
			return JSONValue{}, r.errorf("expected \",\" or \"]\", found %q", string(current))
		}
	}
}

func (r *jsonReader) object(depth int) (JSONValue, error) {
	if err := r.expect('{'); err != nil {
		return JSONValue{}, err
	}
	members := make([]JSONMember, 0)
	if !r.strict {
		r.skipSpace()
	}
	if current, ok := r.peek(); ok && current == '}' {
		r.offset++
		return JSONValue{kind: JSONObject, members: members}, nil
	}
	for {
		if !r.strict {
			r.skipSpace()
		}
		nameStart := r.offset
		name, err := r.stringLiteral()
		if err != nil {
			return JSONValue{}, err
		}
		if !r.strict {
			r.skipSpace()
		}
		if err := r.expect(':'); err != nil {
			return JSONValue{}, err
		}
		if !r.strict {
			r.skipSpace()
		}
		member, err := r.value(depth + 1)
		if err != nil {
			return JSONValue{}, err
		}
		if r.strict && len(members) > 0 && members[len(members)-1].Name >= name {
			return JSONValue{}, fmt.Errorf(
				"offset %d: member %q follows %q; members are sorted lexicographically by key",
				nameStart, name, members[len(members)-1].Name)
		}
		members = append(members, JSONMember{Name: name, Value: member})
		if !r.strict {
			r.skipSpace()
		}
		current, ok := r.peek()
		if !ok {
			return JSONValue{}, r.errorf("object is not closed")
		}
		switch current {
		case ',':
			r.offset++
		case '}':
			r.offset++
			if r.strict {
				return JSONValue{kind: JSONObject, members: members}, nil
			}
			return ObjectValue(members...)
		default:
			return JSONValue{}, r.errorf("expected \",\" or \"}\", found %q", string(current))
		}
	}
}
