package canonical

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"math"
	"sort"
	"strconv"
	"unicode/utf16"
)

const Genesis = "0000000000000000000000000000000000000000000000000000000000000000"

type ChainEntry struct {
	Seq     int
	Prev    string
	Payload string
}

func Canonicalize(jsonBytes []byte) ([]byte, error) {
	var value any
	if err := json.Unmarshal(jsonBytes, &value); err != nil {
		return nil, err
	}

	var output bytes.Buffer
	if err := appendCanonical(&output, value); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
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
		if value == 0 && math.Signbit(value) {
			return errors.New("negative zero is outside the canonical domain")
		}
		encoded, err := json.Marshal(value)
		if err != nil {
			return err
		}
		output.Write(encoded)
	case string:
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
