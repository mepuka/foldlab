package main

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"

	"foldlab/canonical"
	"foldlab/daemon"
)

// The five arms, each with its own reason string.
//
// The reasons are constants because the controls assert on them: a control that
// reddened for the wrong reason would prove the wrong thing, so each refutation
// checks that the arm it planted against is the arm that refused.
const (
	reasonParity    = "arm i — the two languages did not render the same bytes"
	reasonPins      = "arm ii — a provenance digest does not re-derive from the pinned vendor source as installed"
	reasonCensus    = "arm iii — the declared row census disagrees with the rendered one"
	reasonClosure   = "arm iv — a rendered row carries no provenance pin, no wire shape, or no promotion note where one is owed"
	reasonFootprint = "arm v — a wire word appears as a bare string literal outside the transcription modules"
)

// spineMint is the one JSON line the spine's renderer writes.
type spineMint struct {
	Bytes  string `json:"bytes"`
	Digest string `json:"digest"`
	Counts []struct {
		Group string `json:"group"`
		Rows  int    `json:"rows"`
	} `json:"counts"`
}

func runWall(repo string, minter string) error {
	fresh, derived, err := emit(repo)
	if err != nil {
		return fmt.Errorf("%s: %w", reasonPins, err)
	}

	// Arm ii runs first because everything after it stands on the digests: a
	// committed digest table that no longer re-derives makes every later
	// comparison a comparison of the wrong bytes.
	if err := armPins(repo, fresh, derived); err != nil {
		return err
	}
	rendered, err := daemon.WireVocabularyBytes(daemon.WireDigests)
	if err != nil {
		return err
	}
	if err := armClosure(rendered); err != nil {
		return err
	}
	if err := armCensus(rendered); err != nil {
		return err
	}
	if err := armParity(repo, fresh, rendered, minter); err != nil {
		return err
	}
	hits, allowed, err := armFootprint(repo)
	if err != nil {
		return err
	}

	total := 0
	for _, group := range daemon.WireCensus {
		total += group.Rows
	}
	fmt.Printf(
		"WIRE VOCABULARY PARITY: %d rows across %d groups; %d regions re-derived from %d pinned"+
			" packages as installed; %d bytes rendered identically in both languages;"+
			" %d source files swept with %d declared allowances and %d unlawful hits\n",
		total, len(daemon.WireCensus), len(daemon.WireRegions()), 4,
		len(rendered), hits, allowed, 0,
	)
	return nil
}

// armPins re-derives every provenance digest from the pinned vendor sources as
// installed and holds the committed digest table to them.
//
// The derivation happens in the emitter, which fails outright when a pinned
// package is not installed — that failure is this arm's, and it is a FAILURE
// rather than a skip on purpose: an oracle that quietly stops reading the vendor
// is not an oracle.
func armPins(repo string, fresh emitted, derived map[string]string) error {
	for key, digest := range derived {
		committed, carried := daemon.WireDigests[key]
		if !carried {
			return fmt.Errorf("%s: the committed table carries no digest for %s", reasonPins, key)
		}
		if committed != digest {
			return fmt.Errorf(
				"%s: %s\n  committed: %s\n  installed: %s",
				reasonPins, key, committed, digest,
			)
		}
	}
	for key := range daemon.WireDigests {
		if _, cited := derived[key]; !cited {
			return fmt.Errorf(
				"%s: the committed table carries a digest for %s, which no row cites",
				reasonPins, key,
			)
		}
	}
	committed, err := os.ReadFile(pathsFor(repo).digests)
	if err != nil {
		return fmt.Errorf("%s: %w", reasonPins, err)
	}
	if !bytes.Equal(committed, fresh.digests) {
		return fmt.Errorf("%s: the committed digest table is not what a fresh emission produces", reasonPins)
	}
	fmt.Printf(
		"arm ii: %d regions re-derived from the pinned sources as installed; every digest agrees\n",
		len(derived),
	)
	return nil
}

// armClosure walks the RENDERED bytes and refuses a row that is not closed.
//
// It walks the rendering rather than the Go tables because what a reader
// obtains is the rendering: a row whose pin is dropped on the way out would pass
// a check of the tables and fail every reader.
func armClosure(rendered []byte) error {
	groups, err := renderedGroups(rendered)
	if err != nil {
		return fmt.Errorf("%s: %w", reasonClosure, err)
	}
	closed := 0
	owed := 0
	for _, group := range groups {
		for index, row := range group.rows {
			pin, ok := row["pin"].(map[string]any)
			if !ok {
				return fmt.Errorf("%s: %s row %d carries no pin at all", reasonClosure, group.name, index)
			}
			for _, field := range []string{"package", "version", "digest"} {
				value, _ := pin[field].(string)
				if value == "" {
					return fmt.Errorf(
						"%s: %s row %d carries a pin with no %s", reasonClosure, group.name, index, field,
					)
				}
			}
			shape, _ := row["wire"].(string)
			switch shape {
			case string(daemon.JournalFact), string(daemon.CommitmentRegister):
			case string(daemon.EphemeralChatter):
				note, _ := row["promotion"].(string)
				if note == "" {
					return fmt.Errorf(
						"%s: %s row %d is chatter and carries no promotion note",
						reasonClosure, group.name, index,
					)
				}
				owed++
			default:
				return fmt.Errorf(
					"%s: %s row %d carries the wire shape %q, which is not one of the three",
					reasonClosure, group.name, index, shape,
				)
			}
			closed++
		}
	}
	fmt.Printf(
		"arm iv: %d rendered rows closed — each with a pin and a wire shape; %d chatter rows carry their promotion note\n",
		closed, owed,
	)
	return nil
}

// armCensus holds the declared row count against the rendered one.
//
// The two counts come from different places on purpose: the declared count is a
// hand-written line beside the tables and the rendered count is derived by
// walking the bytes. A count derived from the same slice the rendering walked
// would agree with itself no matter what happened to the table.
func armCensus(rendered []byte) error {
	groups, err := renderedGroups(rendered)
	if err != nil {
		return fmt.Errorf("%s: %w", reasonCensus, err)
	}
	if len(groups) != len(daemon.WireCensus) {
		return fmt.Errorf(
			"%s: %d groups declared and %d rendered", reasonCensus, len(daemon.WireCensus), len(groups),
		)
	}
	for index, declared := range daemon.WireCensus {
		group := groups[index]
		if group.name != declared.Group {
			return fmt.Errorf(
				"%s: group %d is declared %q and rendered %q", reasonCensus, index, declared.Group, group.name,
			)
		}
		if len(group.rows) != declared.Rows {
			return fmt.Errorf(
				"%s: %s declares %d rows and renders %d", reasonCensus, declared.Group, declared.Rows, len(group.rows),
			)
		}
	}
	fmt.Printf("arm iii: %d groups, each declaring the row count it renders\n", len(groups))
	return nil
}

// armParity compares the two languages' renderings byte for byte, and the
// committed artifacts against a fresh emission.
//
// Two halves, because there are two ways for the two languages to stop being
// one table: the spine's module could be edited, and the spine's module could be
// STALE — emitted from a table that has since moved. The first half catches the
// edit and the second catches the staleness.
func armParity(repo string, fresh emitted, rendered []byte, minter string) error {
	if err := armParityArtifacts(repo, fresh); err != nil {
		return err
	}
	minted, err := mintSpine(minter)
	if err != nil {
		return fmt.Errorf("%s: %w", reasonParity, err)
	}
	spineBytes, err := hex.DecodeString(minted.Bytes)
	if err != nil {
		return fmt.Errorf("%s: the spine's bytes do not decode: %w", reasonParity, err)
	}
	if !bytes.Equal(spineBytes, rendered) {
		return fmt.Errorf(
			"%s\n  spine: %s\n  go:    %s", reasonParity, spineBytes, rendered,
		)
	}
	if canonical.DigestHex(rendered) != minted.Digest {
		return fmt.Errorf("%s: the two languages named different values", reasonParity)
	}
	fmt.Printf(
		"arm i: %d bytes rendered identically in both languages; digest %s\n",
		len(rendered), minted.Digest,
	)
	return nil
}

// armParityArtifacts holds the committed artifacts to a fresh emission.
//
// It takes the tree as a parameter because the control needs to run it over a
// tree whose bytes it has mutated: a comparison that cannot be shown failing on
// a changed byte is not a comparison anybody has measured.
func armParityArtifacts(repo string, fresh emitted) error {
	paths := pathsFor(repo)
	for _, pair := range []struct {
		what string
		path string
		body []byte
	}{
		{"the canonical rendering", paths.canonical, fresh.canonical},
		{"the spine's pass-through", paths.spine, fresh.spine},
	} {
		committed, err := os.ReadFile(pair.path)
		if err != nil {
			return fmt.Errorf("%s: %w", reasonParity, err)
		}
		if !bytes.Equal(committed, pair.body) {
			return fmt.Errorf(
				"%s: %s is not what a fresh emission produces (%d committed bytes, %d emitted)",
				reasonParity, pair.what, len(committed), len(pair.body),
			)
		}
	}
	return nil
}

func mintSpine(minter string) (spineMint, error) {
	command := exec.Command("bun", minter)
	command.Stderr = os.Stderr
	output, err := command.Output()
	if err != nil {
		return spineMint{}, fmt.Errorf("render the spine's side: %w", err)
	}
	minted := spineMint{}
	if err := json.Unmarshal(output, &minted); err != nil {
		return spineMint{}, fmt.Errorf("decode the spine's rendering: %w", err)
	}
	return minted, nil
}

// renderedGroup is one group as the RENDERED bytes carry it.
type renderedGroup struct {
	name string
	rows []map[string]any
}

// renderedGroups parses the rendering back, so every arm that reads it reads
// what a consumer would read rather than what the tables happen to hold.
func renderedGroups(rendered []byte) ([]renderedGroup, error) {
	decoded, err := canonical.Decode(rendered)
	if err != nil {
		return nil, err
	}
	value, ok := decoded.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("the rendering is not a value with groups")
	}
	raw, ok := value["groups"].([]any)
	if !ok {
		return nil, fmt.Errorf("the rendering carries no groups")
	}
	groups := make([]renderedGroup, 0, len(raw))
	for _, item := range raw {
		group, ok := item.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("the rendering carries a group that is not a value")
		}
		name, _ := group["group"].(string)
		rows, ok := group["rows"].([]any)
		if !ok {
			return nil, fmt.Errorf("the group %q carries no rows", name)
		}
		parsed := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			typed, ok := row.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("the group %q carries a row that is not a value", name)
			}
			parsed = append(parsed, typed)
		}
		groups = append(groups, renderedGroup{name: name, rows: parsed})
	}
	return groups, nil
}
