package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"time"

	"foldlab/daemon"
)

// retirementPoll is how often `down` reads the lane forward while it waits for
// the retirement the disposition asked for. Pacing is carriage.
const retirementPoll = 250 * time.Millisecond

func runDown(arguments []string) error {
	flags := flag.NewFlagSet("down", flag.ExitOnError)
	coordinationURL := flags.String("coordination", "", "the substrate the register and the lanes live on")
	store := flags.String("store", "", "the store directory whose current incarnation is being disposed")
	hardStop := flags.Bool("stop", false, "stop without draining; the default drains first")
	wait := flags.Duration("wait", 90*time.Second, "how long to watch the lane for the retirement")
	if err := flags.Parse(arguments); err != nil {
		return err
	}
	if *store == "" {
		return errors.New("the store directory is required: it names which incarnation chain is being disposed")
	}
	cause := causeOf(*hardStop)

	storeDigest, err := daemon.StoreDigest(*store)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
	defer cancel()
	lanes, err := openCoordination(ctx, *coordinationURL, "substrate-down")
	if err != nil {
		return err
	}
	defer lanes.Close()

	// Which incarnation is being disposed is a FOLD over the record and never a
	// probe: nothing here reaches a server, and nothing here reads silence as an
	// answer. What the greatest-position read returns is the incarnation the
	// record has current for this store directory, and a tie refuses rather than
	// picking, because choosing between two would make a read a decision.
	facts, err := daemon.ReadLane(ctx, lanes.incarnation)
	if err != nil {
		return err
	}
	standings, err := daemon.FoldIncarnations(facts)
	if err != nil {
		return err
	}
	greatest, err := daemon.GreatestIncarnation(standings, storeDigest)
	if err != nil {
		return err
	}
	if greatest.Standing == daemon.StandingRetired {
		return fmt.Errorf(
			"the record already retired the current incarnation %s with cause %q, so there is no disposition to make",
			greatest.Incarnation, greatest.Cause,
		)
	}
	fmt.Printf("current: incarnation=%s established at position %d, unretired\n",
		greatest.Incarnation, greatest.Position)

	disposition, err := daemon.DispositionFact(greatest.Incarnation, cause)
	if err != nil {
		return err
	}
	position, digest, err := daemon.Land(ctx, lanes.incarnation, disposition)
	if err != nil {
		return err
	}
	fmt.Printf("disposition: position=%d digest=%s cause=%s\n", position, digest, cause)

	// The disposition is landed and it is true whatever happens next. Watching
	// for the retirement is a courtesy to the party at this terminal and is
	// reported as what it is: a bounded read of the lane, whose empty answer
	// says the retirement has not landed by the position this read reached —
	// never that the incarnation is or is not running.
	retired, found, err := watchForRetirement(lanes, greatest.Incarnation, *wait)
	if err != nil {
		return err
	}
	if !found {
		fmt.Printf(
			"DISPOSED: incarnation=%s cause=%s — no retirement has landed within the watched window\n",
			greatest.Incarnation, cause,
		)
		return nil
	}
	fmt.Printf("RETIRED: incarnation=%s cause=%s position=%d\n",
		greatest.Incarnation, retired.Cause, retired.Position)
	return nil
}

// retirement is one retirement the watch found.
type retirement struct {
	Position int
	Cause    string
}

// watchForRetirement reads the incarnation lane forward until it carries a
// retirement for one incarnation, or until the watched window closes.
func watchForRetirement(
	lanes *coordination,
	incarnation string,
	window time.Duration,
) (retirement, bool, error) {
	deadline := time.Now().Add(window)
	for {
		ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
		facts, err := daemon.ReadLane(ctx, lanes.incarnation)
		cancel()
		if err != nil {
			return retirement{}, false, err
		}
		for position, fact := range facts {
			if kind, _ := fact["kind"].(string); kind != "substrate-incarnation-retired" {
				continue
			}
			if named, _ := fact["incarnation"].(string); named != incarnation {
				continue
			}
			cause, _ := fact["cause"].(string)
			return retirement{Position: position, Cause: cause}, true, nil
		}
		if !time.Now().Before(deadline) {
			return retirement{}, false, nil
		}
		time.Sleep(retirementPoll)
	}
}
