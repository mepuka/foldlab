package main

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"

	"foldlab/canonical"
	"foldlab/daemon"
)

// The incarnation vocabulary's byte-parity comparison across the language
// boundary.
//
// The Go side of this vocabulary is a TRANSCRIPTION of the spine's, and a
// transcription is honest only if something compares the bytes. The reference is
// the spine: every value below is minted on both sides from the same
// coordinates, and a divergence is a defect on this side rather than a reason to
// move the reference.
//
// The coordinates are chosen here and handed over, so neither side can declare a
// value the other did not. Both a chain head and a successor are minted, because
// the predecessor is the one field whose null is a shape rather than a value —
// twinned tables agree on values far more easily than they agree on absences.

// parityCase is one set of coordinates both languages declare from.
type parityCase struct {
	label       string
	dir         string
	options     string
	predecessor string
	session     string
	server      string
	cause       string
}

// Two digests that are not each other, spelled out rather than derived, so the
// comparison cannot pass by both sides deriving the same wrong thing.
const (
	parityOptions     = "7ab1e5f0cafe32100123456789abcdef0123456789abcdef0123456789abcdef"
	parityPredecessor = "a0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd0"
	paritySession     = "50123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde"
)

func runParity(minter string) error {
	cases := []parityCase{
		{
			label:       "chain head",
			dir:         "/var/lib/foldlab/substrate",
			options:     parityOptions,
			predecessor: "",
			session:     paritySession,
			server:      "foldlab-substrate",
			cause:       daemon.CauseDrained,
		},
		{
			label:       "successor",
			dir:         "/var/lib/foldlab/substrate",
			options:     parityOptions,
			predecessor: parityPredecessor,
			session:     paritySession,
			server:      "foldlab-substrate",
			cause:       daemon.CauseStopped,
		},
	}

	compared := 0
	for _, row := range cases {
		reference, err := mintReference(minter, row)
		if err != nil {
			return err
		}

		storeDigest, err := daemon.StoreDigest(row.dir)
		if err != nil {
			return err
		}
		value := daemon.SubstrateIncarnation{
			Store: storeDigest, Options: row.options, Predecessor: row.predecessor,
		}
		digest, err := daemon.IncarnationName(value)
		if err != nil {
			return err
		}
		round, err := daemon.RoundKey(storeDigest, row.predecessor)
		if err != nil {
			return err
		}
		retired, err := daemon.RetiredIncarnationFact(digest, row.cause)
		if err != nil {
			return err
		}
		near := map[string]map[string]any{
			"store":       daemon.StoreValue(row.dir),
			"incarnation": daemon.IncarnationValue(value),
			"established": daemon.EstablishedIncarnationFact(digest, value),
			"lame-duck":   daemon.LameDuckFact(digest, row.session, row.server),
			"retired":     retired,
		}

		if reference.Round != round {
			return fmt.Errorf("%s: the two languages named different rounds\n  spine: %s\n  go:    %s",
				row.label, reference.Round, round)
		}
		fmt.Printf("%s round key: %s (equal)\n", row.label, round)
		for _, name := range []string{"store", "incarnation", "established", "lame-duck", "retired"} {
			bytes, err := canonical.CanonicalizeValue(near[name])
			if err != nil {
				return err
			}
			far, minted := reference.Values[name]
			if !minted {
				return fmt.Errorf("%s: the spine minted no %s", row.label, name)
			}
			if string(bytes) != decodeHex(far.Bytes) {
				return fmt.Errorf(
					"%s: the two languages folded different bytes for %s\n  spine: %s\n  go:    %s",
					row.label, name, decodeHex(far.Bytes), bytes,
				)
			}
			if canonical.DigestHex(bytes) != far.Digest {
				return fmt.Errorf("%s: the two languages named different %s values", row.label, name)
			}
			fmt.Printf("%s %s: %s\n", row.label, name, bytes)
			compared++
		}
	}
	fmt.Printf(
		"INCARNATION VOCABULARY PARITY: %d cases, %d declared values, every one byte-equal across the language boundary\n",
		len(cases), compared,
	)
	return nil
}

// referenceMint is the one JSON line the spine's minter writes.
type referenceMint struct {
	Round  string `json:"round"`
	Values map[string]struct {
		Bytes  string `json:"bytes"`
		Digest string `json:"digest"`
	} `json:"values"`
}

func mintReference(minter string, row parityCase) (referenceMint, error) {
	command := exec.Command(
		"bun", minter, row.dir, row.options, row.predecessor, row.session, row.server, row.cause,
	)
	command.Stderr = os.Stderr
	output, err := command.Output()
	if err != nil {
		return referenceMint{}, fmt.Errorf("mint the spine's reference values: %w", err)
	}
	minted := referenceMint{}
	if err := json.Unmarshal(output, &minted); err != nil {
		return referenceMint{}, fmt.Errorf("decode the spine's reference values: %w", err)
	}
	return minted, nil
}

// decodeHex reads back the hexadecimal the spine wrote its canonical bytes as,
// so the comparison is over bytes rather than over two encodings of them.
func decodeHex(encoded string) string {
	if len(encoded)%2 != 0 {
		return ""
	}
	decoded := make([]byte, 0, len(encoded)/2)
	for index := 0; index < len(encoded); index += 2 {
		high, low := hexNibble(encoded[index]), hexNibble(encoded[index+1])
		if high < 0 || low < 0 {
			return ""
		}
		decoded = append(decoded, byte(high<<4|low))
	}
	return string(decoded)
}

func hexNibble(character byte) int {
	switch {
	case character >= '0' && character <= '9':
		return int(character - '0')
	case character >= 'a' && character <= 'f':
		return int(character-'a') + 10
	default:
		return -1
	}
}
