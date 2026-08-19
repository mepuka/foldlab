package main

import (
	"context"
	"flag"
	"fmt"

	"foldlab/daemon"
)

// The status read, and the three things it will not say.
//
// It does not probe. Nothing here opens a connection to any substrate but the
// coordination one it reads the lane from, and a read that reached a server
// would be reporting what that server said about itself rather than what the
// record carries — which is a different question with a different answer and no
// audit trail.
//
// It does not say live. The fold's answers are the record's: an incarnation was
// established, and it either was or was not retired. An incarnation whose
// process died reads as established forever, and inventing a third answer is
// exactly the construction failing.
//
// It does not read a clock. The one number it reports is positional — how many
// positions the lane has taken since it last named an incarnation — and it is
// reported as a number, never compared against a tolerance and never turned
// into a verdict. A reader that wants to act on it brings its own tolerance.

func runStatus(arguments []string) error {
	flags := flag.NewFlagSet("status", flag.ExitOnError)
	coordinationURL := flags.String("coordination", "", "the substrate the lanes live on")
	store := flags.String("store", "", "report the greatest-position read for this store directory as well")
	if err := flags.Parse(arguments); err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
	defer cancel()
	lanes, err := openCoordination(ctx, *coordinationURL, "substrate-status")
	if err != nil {
		return err
	}
	defer lanes.Close()

	facts, err := daemon.ReadLane(ctx, lanes.incarnation)
	if err != nil {
		return err
	}
	standings, err := daemon.FoldIncarnations(facts)
	if err != nil {
		return err
	}
	fmt.Printf("incarnation lane: %d facts, head at position %d\n", len(facts), len(facts)-1)
	for _, standing := range standings {
		staleness, mentioned := daemon.Staleness(facts, standing.Incarnation)
		fmt.Printf(
			"incarnation=%s store=%s predecessor=%s established-at-position=%d standing=%s cause=%s staleness=%s\n",
			standing.Incarnation,
			standing.Store,
			label(standing.Predecessor),
			standing.Position,
			standing.Standing,
			label(standing.Cause),
			stalenessLabel(staleness, mentioned),
		)
	}

	if *store == "" {
		return nil
	}
	storeDigest, err := daemon.StoreDigest(*store)
	if err != nil {
		return err
	}
	greatest, err := daemon.GreatestIncarnation(standings, storeDigest)
	if err != nil {
		return err
	}
	staleness, mentioned := daemon.Staleness(facts, greatest.Incarnation)
	fmt.Printf(
		"greatest for store %s: incarnation=%s established-at-position=%d standing=%s cause=%s staleness=%s\n",
		storeDigest, greatest.Incarnation, greatest.Position, greatest.Standing,
		label(greatest.Cause), stalenessLabel(staleness, mentioned),
	)
	return nil
}

// stalenessLabel renders the positional staleness, and renders the absence of a
// reading as an absence rather than as a zero.
func stalenessLabel(staleness int, mentioned bool) string {
	if !mentioned {
		return "none"
	}
	return fmt.Sprintf("%d", staleness)
}
