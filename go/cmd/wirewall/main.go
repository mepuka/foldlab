// Command wirewall is the wire vocabulary's parity wall and its executed
// controls.
//
// Five arms, each failing on its own named reason, and four committed
// refutations beside them — one per arm that can be planted against. A prover
// that cannot fail proves nothing, so each control plants exactly the defect
// its arm exists to catch, runs the arm, and FAILS THE BATTERY if the arm stays
// green.
//
// The arms:
//
//	i    parity   — the two languages render the same bytes, and the committed
//	                artifacts are what a fresh emission produces.
//	ii   pins     — every row's provenance digest re-derives from the pinned
//	                vendor source as installed; a missing pinned source fails.
//	iii  census   — the declared row count equals the rendered one, the two
//	                counts derived from different places.
//	iv   closure  — every rendered row carries a provenance pin and a wire
//	                shape, and every chatter row carries its promotion note.
//	v    footprint— no wire word appears as a bare string literal in the
//	                estate's own sources outside the transcription modules.
package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
)

func main() {
	repo := flag.String(
		"repo",
		filepath.Join(".."),
		"the repository root, relative to this binary's working directory",
	)
	minter := flag.String(
		"minter",
		filepath.Join("..", "packages", "plait", "test", "process", "substrate-wire-mint.ts"),
		"the TypeScript process that renders the spine's side of the parity comparison",
	)
	doEmit := flag.Bool(
		"emit",
		false,
		"re-emit the three committed artifacts from the normative table and the pinned sources",
	)
	controls := flag.Bool(
		"controls",
		false,
		"run the four committed refutations, each of which must refute on its own arm's reason",
	)
	flag.Parse()

	var err error
	switch {
	case *doEmit:
		err = runEmit(*repo)
	case *controls:
		err = runControls(*repo)
	default:
		err = runWall(*repo, *minter)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func runEmit(repo string) error {
	fresh, _, err := emit(repo)
	if err != nil {
		return err
	}
	if err := fresh.write(pathsFor(repo)); err != nil {
		return err
	}
	fmt.Println("emitted: the digest table, the canonical rendering, and the spine's pass-through")
	return nil
}
