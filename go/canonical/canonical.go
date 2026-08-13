package canonical

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"sort"
	"strconv"
	"unicode/utf16"
	"unicode/utf8"
)

const Genesis = "0000000000000000000000000000000000000000000000000000000000000000"

const maxJSONDepth = 256

type ChainEntry struct {
	Seq     int
	Prev    string
	Payload string
}

func Canonicalize(jsonBytes []byte) ([]byte, error) {
	value, err := Decode(jsonBytes)
	if err != nil {
		return nil, err
	}
	return CanonicalizeValue(value)
}

// CanonicalizeValue serializes a programmatic JSON-domain value according to
// RFC 8785. Values outside nil/bool/float64/string/[]any/map[string]any refuse.
func CanonicalizeValue(value any) ([]byte, error) {
	var output bytes.Buffer
	if err := appendCanonical(&output, value); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

// Decode applies the I-JSON constraints that make one byte stream denote at
// most one value: valid UTF-8/Unicode, unique member names, finite binary64
// numbers, bounded nesting, and no trailing second value.
func Decode(jsonBytes []byte) (any, error) {
	if !utf8.Valid(jsonBytes) {
		return nil, errors.New("input is not valid UTF-8")
	}
	if err := validateJSONStringEscapes(jsonBytes); err != nil {
		return nil, err
	}
	decoder := json.NewDecoder(bytes.NewReader(jsonBytes))
	decoder.UseNumber()
	value, err := decodeJSONValue(decoder, 0)
	if err != nil {
		return nil, err
	}
	if _, err := decoder.Token(); err == nil {
		return nil, errors.New("trailing data after the JSON value")
	} else if !errors.Is(err, io.EOF) {
		return nil, err
	}
	return value, nil
}

func decodeJSONValue(decoder *json.Decoder, depth int) (any, error) {
	token, err := decoder.Token()
	if err != nil {
		return nil, err
	}
	switch token := token.(type) {
	case nil, bool, string:
		return token, nil
	case json.Number:
		value, err := strconv.ParseFloat(string(token), 64)
		if err != nil || math.IsInf(value, 0) || math.IsNaN(value) {
			return nil, errors.New("number is not finite in IEEE 754 binary64")
		}
		return value, nil
	case json.Delim:
		if depth >= maxJSONDepth {
			return nil, fmt.Errorf("nesting exceeds %d", maxJSONDepth)
		}
		switch token {
		case '[':
			values := make([]any, 0)
			for decoder.More() {
				value, err := decodeJSONValue(decoder, depth+1)
				if err != nil {
					return nil, err
				}
				values = append(values, value)
			}
			closing, err := decoder.Token()
			if err != nil {
				return nil, err
			}
			if closing != json.Delim(']') {
				return nil, errors.New("array is not closed")
			}
			return values, nil
		case '{':
			value := make(map[string]any)
			for decoder.More() {
				nameToken, err := decoder.Token()
				if err != nil {
					return nil, err
				}
				name, ok := nameToken.(string)
				if !ok {
					return nil, errors.New("object member name is not a string")
				}
				if _, duplicate := value[name]; duplicate {
					return nil, errors.New("duplicate object member name")
				}
				member, err := decodeJSONValue(decoder, depth+1)
				if err != nil {
					return nil, err
				}
				value[name] = member
			}
			closing, err := decoder.Token()
			if err != nil {
				return nil, err
			}
			if closing != json.Delim('}') {
				return nil, errors.New("object is not closed")
			}
			return value, nil
		default:
			return nil, errors.New("unexpected closing delimiter")
		}
	default:
		return nil, errors.New("value is outside the JSON domain")
	}
}

func validateJSONStringEscapes(input []byte) error {
	inString := false
	for index := 0; index < len(input); index++ {
		character := input[index]
		if !inString {
			if character == '"' {
				inString = true
			}
			continue
		}
		switch character {
		case '"':
			inString = false
		case '\\':
			if index+1 >= len(input) {
				return errors.New("incomplete string escape")
			}
			escape := input[index+1]
			if escape != 'u' {
				if !bytes.ContainsRune([]byte(`"\\/bfnrt`), rune(escape)) {
					return errors.New("invalid string escape")
				}
				index++
				continue
			}
			high, ok := parseHexUnit(input, index+2)
			if !ok {
				return errors.New("invalid Unicode escape")
			}
			if high >= 0xd800 && high <= 0xdbff {
				if index+12 > len(input) || input[index+6] != '\\' || input[index+7] != 'u' {
					return errors.New("lone high surrogate escape")
				}
				low, ok := parseHexUnit(input, index+8)
				if !ok || low < 0xdc00 || low > 0xdfff {
					return errors.New("high surrogate is not followed by a low surrogate")
				}
				index += 11
				continue
			}
			if high >= 0xdc00 && high <= 0xdfff {
				return errors.New("lone low surrogate escape")
			}
			index += 5
		default:
			if character < 0x20 {
				return errors.New("unescaped control character in string")
			}
		}
	}
	return nil
}

func parseHexUnit(input []byte, offset int) (uint16, bool) {
	if offset+4 > len(input) {
		return 0, false
	}
	var value uint16
	for index := offset; index < offset+4; index++ {
		character := input[index]
		var nibble byte
		switch {
		case character >= '0' && character <= '9':
			nibble = character - '0'
		case character >= 'A' && character <= 'F':
			nibble = character - 'A' + 10
		case character >= 'a' && character <= 'f':
			nibble = character - 'a' + 10
		default:
			return 0, false
		}
		value = value*16 + uint16(nibble)
	}
	return value, true
}

func DigestHex(input []byte) string {
	digest := sha256.Sum256(input)
	return hex.EncodeToString(digest[:])
}

func EntryDigest(entry ChainEntry) string {
	var encoded bytes.Buffer
	encoded.WriteString(`{"payload":`)
	appendJSONString(&encoded, entry.Payload)
	encoded.WriteString(`,"prev":`)
	appendJSONString(&encoded, entry.Prev)
	encoded.WriteString(`,"seq":`)
	encoded.WriteString(strconv.Itoa(entry.Seq))
	encoded.WriteByte('}')
	return DigestHex(encoded.Bytes())
}

func BuildChain(payloads []string) (entryDigests []string, head string) {
	entryDigests = make([]string, len(payloads))
	head = Genesis
	for seq, payload := range payloads {
		digest := EntryDigest(ChainEntry{
			Seq:     seq,
			Prev:    head,
			Payload: payload,
		})
		entryDigests[seq] = digest
		head = digest
	}
	return entryDigests, head
}

func appendCanonical(output *bytes.Buffer, value any) error {
	switch value := value.(type) {
	case nil:
		output.WriteString("null")
	case bool:
		if value {
			output.WriteString("true")
		} else {
			output.WriteString("false")
		}
	case float64:
		if math.IsNaN(value) || math.IsInf(value, 0) {
			return errors.New("number is not finite")
		}
		if value == 0 {
			output.WriteByte('0')
			return nil
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			return err
		}
		output.Write(encoded)
	case string:
		if !utf8.ValidString(value) {
			return errors.New("string is not valid Unicode")
		}
		appendJSONString(output, value)
	case []any:
		output.WriteByte('[')
		for index, item := range value {
			if index > 0 {
				output.WriteByte(',')
			}
			if err := appendCanonical(output, item); err != nil {
				return err
			}
		}
		output.WriteByte(']')
	case map[string]any:
		keys := make([]string, 0, len(value))
		for key := range value {
			if !utf8.ValidString(key) {
				return errors.New("object member name is not valid Unicode")
			}
			keys = append(keys, key)
		}
		sort.Slice(keys, func(i, j int) bool {
			return utf16Less(keys[i], keys[j])
		})

		output.WriteByte('{')
		for index, key := range keys {
			if index > 0 {
				output.WriteByte(',')
			}
			appendJSONString(output, key)
			output.WriteByte(':')
			if err := appendCanonical(output, value[key]); err != nil {
				return err
			}
		}
		output.WriteByte('}')
	default:
		return errors.New("value is outside the canonical JSON domain")
	}
	return nil
}

func appendJSONString(output *bytes.Buffer, value string) {
	const hexDigits = "0123456789abcdef"

	output.WriteByte('"')
	for _, character := range value {
		switch character {
		case '"':
			output.WriteString(`\"`)
		case '\\':
			output.WriteString(`\\`)
		case '\b':
			output.WriteString(`\b`)
		case '\f':
			output.WriteString(`\f`)
		case '\n':
			output.WriteString(`\n`)
		case '\r':
			output.WriteString(`\r`)
		case '\t':
			output.WriteString(`\t`)
		default:
			if character < 0x20 {
				output.WriteString(`\u00`)
				output.WriteByte(hexDigits[byte(character)>>4])
				output.WriteByte(hexDigits[byte(character)&0x0f])
			} else {
				output.WriteRune(character)
			}
		}
	}
	output.WriteByte('"')
}

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
