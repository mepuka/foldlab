package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"foldlab/daemon"
)

// The four committed refutations, one per arm that can be planted against.
//
// A prover that cannot fail proves nothing. Each control plants exactly the
// defect its arm exists to catch, runs the arm, and FAILS THE BATTERY when the
// arm stays green — and each checks that the arm which refused is the arm it
// planted against, because a control that reddens for the wrong reason proves
// the wrong thing.
//
// Nothing here edits a file the estate ships. The byte mutation happens in a
// temporary copy, the missing pin and the wrong digest happen in values built
// for the control, and the planted literal lives in a tree the control creates
// and removes.

type control struct {
	name  string
	plant string
	arm   string
	run   func(repo string) error
}

func runControls(repo string) error {
	controls := []control{
		{
			name:  "mutated table byte",
			plant: "one byte of the committed canonical rendering flipped in a temporary copy",
			arm:   reasonParity,
			run:   controlMutatedByte,
		},
		{
			name:  "row with its pin removed",
			plant: "one region's digest dropped, so the rows citing it render an empty pin",
			arm:   reasonClosure,
			run:   controlMissingPin,
		},
		{
			name:  "planted bare wire-word literal",
			plant: "a source file outside the transcription family carrying a wire word as a bare literal",
			arm:   reasonFootprint,
			run:   controlPlantedLiteral,
		},
		{
			name:  "row with an edited-wrong provenance digest",
			plant: "one re-derived digest edited, as a table typed from memory would be",
			arm:   reasonPins,
			run:   controlWrongDigest,
		},
	}
	for _, executed := range controls {
		err := executed.run(repo)
		if err == nil {
			return fmt.Errorf(
				"CONTROL STAYED GREEN — %s: planted %s and the wall admitted it. An arm that cannot fail proves nothing",
				executed.name, executed.plant,
			)
		}
		if !strings.Contains(err.Error(), executed.arm) {
			return fmt.Errorf(
				"CONTROL REFUTED ON THE WRONG ARM — %s: planted %s and expected %q, got: %v",
				executed.name, executed.plant, executed.arm, err,
			)
		}
		fmt.Printf("control %q refuted: %s\n", executed.name, firstLine(err.Error()))
	}
	fmt.Printf("WIRE VOCABULARY CONTROLS: %d planted defects, %d refuted, each on its own arm\n",
		len(controls), len(controls))
	return nil
}

func firstLine(text string) string {
	if cut := strings.IndexByte(text, '\n'); cut >= 0 {
		return text[:cut]
	}
	return text
}

// controlMutatedByte flips one byte of the committed rendering in a temporary
// copy of the tree and re-runs the artifact comparison.
func controlMutatedByte(repo string) error {
	fresh, _, err := emit(repo)
	if err != nil {
		return err
	}
	temporary, err := os.MkdirTemp("", "wirewall-control-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(temporary)

	paths := pathsFor(temporary)
	for _, directory := range []string{
		filepath.Dir(paths.digests),
		filepath.Dir(paths.spine),
	} {
		if err := os.MkdirAll(directory, 0o755); err != nil {
			return err
		}
	}
	mutated := append([]byte{}, fresh.canonical...)
	if len(mutated) < 2 {
		return fmt.Errorf("the rendering is too small to mutate")
	}
	// The flipped byte is inside the rendering rather than at its edge, so the
	// mutation is a changed table and not a changed file length.
	mutated[len(mutated)/2] ^= 0x20
	if err := os.WriteFile(paths.digests, fresh.digests, 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(paths.canonical, mutated, 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(paths.spine, fresh.spine, 0o644); err != nil {
		return err
	}
	return armParityArtifacts(temporary, fresh)
}

// controlMissingPin renders the vocabulary with one region's digest dropped and
// runs the closure arm over the result.
func controlMissingPin(repo string) error {
	_, derived, err := emit(repo)
	if err != nil {
		return err
	}
	holed := map[string]string{}
	for key, digest := range derived {
		holed[key] = digest
	}
	regions := daemon.WireRegions()
	if len(regions) == 0 {
		return fmt.Errorf("the tables cite no region to drop")
	}
	delete(holed, regions[0].Key())
	rendered, err := daemon.WireVocabularyBytes(holed)
	if err != nil {
		return err
	}
	return armClosure(rendered)
}

// controlPlantedLiteral sweeps a tree of its own carrying one bare wire word.
//
// The planted file is a source file of the shape the sweep reads, in a tree the
// control creates, so the refutation is executed against the real detector
// rather than against a description of it.
func controlPlantedLiteral(repo string) error {
	temporary, err := os.MkdirTemp("", "wirewall-plant-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(temporary)

	planted := filepath.Join(temporary, "packages", "plait", "src", "internal")
	if err := os.MkdirAll(planted, 0o755); err != nil {
		return err
	}
	// The planted word is taken from the table, so a table that stopped
	// carrying it would stop planting it too.
	word := daemon.APISubjects[2].Subject
	body := fmt.Sprintf("export const planted = %q\n", word)
	if err := os.WriteFile(filepath.Join(planted, "planted.ts"), []byte(body), 0o644); err != nil {
		return err
	}
	hits, _, err := sweep(temporary, []sweptRoot{{path: "packages/plait/src", extension: ".ts"}})
	if err != nil {
		return err
	}
	if len(hits) == 0 {
		return nil
	}
	return fmt.Errorf(
		"%s\n  %s:%d carries %q as %q",
		reasonFootprint, hits[0].file, hits[0].line, hits[0].word, hits[0].text,
	)
}

// controlWrongDigest edits one re-derived digest and runs the pin arm.
func controlWrongDigest(repo string) error {
	fresh, derived, err := emit(repo)
	if err != nil {
		return err
	}
	edited := map[string]string{}
	for key, digest := range derived {
		edited[key] = digest
	}
	regions := daemon.WireRegions()
	if len(regions) == 0 {
		return fmt.Errorf("the tables cite no region to edit")
	}
	key := regions[0].Key()
	// One hexadecimal character changed: the shape of a digest typed from
	// memory rather than derived, which is exactly what the arm exists to catch.
	original := edited[key]
	if original == "" {
		return fmt.Errorf("the region %s carries no digest to edit", key)
	}
	swapped := "a"
	if strings.HasPrefix(original, "a") {
		swapped = "b"
	}
	edited[key] = swapped + original[1:]
	return armPins(repo, fresh, edited)
}
