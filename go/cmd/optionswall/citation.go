package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"foldlab/daemon"
	"foldlab/register"
)

const laneDeadline = 30 * time.Second

// The options-citation wall.
//
// The claim: a running incarnation cites the digest of the EXACT declared value
// it started under, and that citation round-trips — the digest resolves, and the
// bytes it resolves to are the bytes the server was constructed from.
//
// The wall runs two incarnations over ONE store directory, which is what makes
// the second half a revision rather than a fresh start: the same substrate, the
// same lane, the same register, one declared field different. The lane and the
// register live on the substrate under test rather than on a coordination
// substrate beside it, because the store directory surviving the restart is part
// of what is being measured.
//
// The revised field is the listen port. It is a wall-local coordinate and not
// one of the priced rows: nothing here rules a durability posture, a log
// posture, a server name, or a monitoring port.

// landing is one incarnation landed and its fact read back off the lane.
type landing struct {
	incarnation string
	cited       string
	position    int
}

func runCitation() error {
	store, err := os.MkdirTemp("", "foldlab-options-citation-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(store)

	values := daemon.NewOptionsStore()
	storeDigest, err := daemon.StoreDigest(store)
	if err != nil {
		return err
	}

	// The first incarnation, under V1.
	first := estateDeclared(store, -1)
	firstDigest, err := values.Declare(first)
	if err != nil {
		return err
	}
	firstBytes, err := first.Bytes()
	if err != nil {
		return err
	}
	fmt.Printf("V1 options bytes: %s\n", firstBytes)
	fmt.Printf("V1 options digest: %s\n", firstDigest)

	firstLanding, err := runIncarnation(first, firstDigest, storeDigest, "", "foldlab-options-wall-v1")
	if err != nil {
		return err
	}
	if firstLanding.cited != firstDigest {
		return fmt.Errorf(
			"the first incarnation cites %s and started under %s", firstLanding.cited, firstDigest,
		)
	}
	if refusal := daemon.AdmitOptionsCitation(values, firstLanding.cited, first); refusal != nil {
		return fmt.Errorf("the first incarnation's own citation was refused: %v", refusal)
	}
	_, resolvedFirst, err := values.Resolve(firstLanding.cited)
	if err != nil {
		return err
	}
	fmt.Printf(
		"V1 incarnation %s at position %d cites %s\n",
		firstLanding.incarnation, firstLanding.position, firstLanding.cited,
	)
	fmt.Printf("V1 citation resolves to: %s\n", resolvedFirst)
	fmt.Printf("V1 round trip: resolved bytes equal the constructed value's bytes\n\n")

	// The revision. One already-transcribed field moves — the listen port —
	// and nothing else about the value does.
	port, err := freePort()
	if err != nil {
		return err
	}
	second := first
	second.Port = port
	secondDigest, err := values.Declare(second)
	if err != nil {
		return err
	}
	secondBytes, err := second.Bytes()
	if err != nil {
		return err
	}
	if secondDigest == firstDigest {
		return errors.New("the revised value was named the same as the value it revised")
	}
	fmt.Printf("V2 options bytes: %s\n", secondBytes)
	fmt.Printf("V2 options digest: %s\n", secondDigest)

	secondLanding, err := runIncarnation(
		second, secondDigest, storeDigest, firstLanding.incarnation, "foldlab-options-wall-v2",
	)
	if err != nil {
		return err
	}
	if secondLanding.cited != secondDigest {
		return fmt.Errorf(
			"the second incarnation cites %s and started under %s", secondLanding.cited, secondDigest,
		)
	}
	if refusal := daemon.AdmitOptionsCitation(values, secondLanding.cited, second); refusal != nil {
		return fmt.Errorf("the second incarnation's own citation was refused: %v", refusal)
	}
	if secondLanding.incarnation == firstLanding.incarnation {
		return errors.New("the successor was named the same as its predecessor")
	}
	fmt.Printf(
		"V2 incarnation %s at position %d cites %s, succeeding %s\n",
		secondLanding.incarnation, secondLanding.position, secondLanding.cited,
		firstLanding.incarnation,
	)
	fmt.Printf(
		"the two citations differ: %s != %s\n\n", firstLanding.cited, secondLanding.cited,
	)

	// The negative controls. A fact citing a digest computed over a DIFFERENT
	// declared value is refused, and so is one citing a digest that resolves to
	// nothing. Both are minted through the incarnation fact machinery rather
	// than by calling the check with a bare string, so what is refused is the
	// shape a lane would actually carry.
	forged := daemon.EstablishedIncarnationFact(secondLanding.incarnation, daemon.SubstrateIncarnation{
		Store:       storeDigest,
		Options:     firstDigest,
		Predecessor: firstLanding.incarnation,
	})
	forgedCitation, ok := forged["options"].(string)
	if !ok {
		return errors.New("the forged fact carries no citation")
	}
	mismatch := daemon.AdmitOptionsCitation(values, forgedCitation, second)
	if mismatch == nil {
		return errors.New("a fact citing a digest over a different value was admitted")
	}
	if mismatch.Kind != daemon.KindCitationMismatch {
		return fmt.Errorf("a fact citing a different value refused as %q", mismatch.Kind)
	}
	fmt.Printf("== negative control: a citation over a different declared value\n")
	fmt.Printf("   reason: %s\n", mismatch.Kind)
	fmt.Printf("   law: %s\n", mismatch.Law)
	fmt.Printf("   repair at %s: %s\n", mismatch.Next[0].Subject, mismatch.Next[0].Note)

	absent := daemon.EstablishedIncarnationFact("an incarnation nobody declared", daemon.SubstrateIncarnation{
		Store:       storeDigest,
		Options:     "0000000000000000000000000000000000000000000000000000000000000000",
		Predecessor: secondLanding.incarnation,
	})
	absentCitation, ok := absent["options"].(string)
	if !ok {
		return errors.New("the unresolvable fact carries no citation")
	}
	unresolved := daemon.AdmitOptionsCitation(values, absentCitation, second)
	if unresolved == nil {
		return errors.New("a fact citing an unresolvable digest was admitted")
	}
	if unresolved.Kind != daemon.KindCitationUnresolved {
		return fmt.Errorf("a fact citing an unresolvable digest refused as %q", unresolved.Kind)
	}
	fmt.Printf("== negative control: a citation nothing resolves\n")
	fmt.Printf("   reason: %s\n", unresolved.Kind)
	fmt.Printf("   law: %s\n", unresolved.Law)
	fmt.Printf("   repair at %s: %s\n", unresolved.Next[0].Subject, unresolved.Next[0].Note)

	fmt.Printf(
		"\nOPTIONS DIGEST CITATION: two incarnations over one store directory, each citing the exact" +
			" value it started under, each citation resolved and byte-compared; a citation over another" +
			" value and a citation nothing resolves both refused with reason, law and repair\n",
	)
	return nil
}

// runIncarnation starts one substrate under one declared value, lands one
// incarnation by right of a token, and reads its established fact back off the
// lane.
//
// The fact is read back rather than remembered: what is being measured is what
// a later reader would find on the lane, and a value held in this process would
// measure this process instead.
func runIncarnation(
	declared daemon.DeclaredServerOptions,
	digest string,
	storeDigest string,
	predecessor string,
	holder string,
) (landing, error) {
	instance, err := daemon.Acquire(declared)
	if err != nil {
		return landing{}, fmt.Errorf("acquire the substrate under %s: %w", holder, err)
	}
	defer func() {
		instance.Shutdown()
		instance.WaitForShutdown()
	}()
	if instance.OptionsDigest() != digest {
		return landing{}, fmt.Errorf(
			"the acquired substrate records %s and the declared value is named %s",
			instance.OptionsDigest(), digest,
		)
	}
	instance.Start()
	if !instance.ReadyForConnections(readyWithin) {
		return landing{}, fmt.Errorf("the substrate under %s did not pass its readiness gate", holder)
	}

	connection, err := nats.Connect(instance.ClientURL(), nats.Name(holder))
	if err != nil {
		return landing{}, err
	}
	defer connection.Close()
	registers, err := register.Open(connection)
	if err != nil {
		return landing{}, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), laneDeadline)
	defer cancel()
	js, err := jetstream.New(connection)
	if err != nil {
		return landing{}, err
	}
	lane, err := daemon.OpenLane(ctx, js, daemon.IncarnationLane)
	if err != nil {
		return landing{}, err
	}

	value := daemon.SubstrateIncarnation{
		Store:       storeDigest,
		Options:     instance.OptionsDigest(),
		Predecessor: predecessor,
	}
	landed, err := daemon.DecideIncarnation(registers, value, holder)
	if err != nil {
		return landing{}, fmt.Errorf("land the incarnation for %s: %w", holder, err)
	}
	if _, _, err := daemon.Land(
		ctx, lane, daemon.EstablishedIncarnationFact(landed.Digest, value),
	); err != nil {
		return landing{}, err
	}

	facts, err := daemon.ReadLane(ctx, lane)
	if err != nil {
		return landing{}, err
	}
	return readCitation(facts, landed.Digest)
}

// readCitation finds one incarnation's establishment on a lane and reads the
// options digest it cites.
func readCitation(facts []map[string]any, incarnation string) (landing, error) {
	for position, fact := range facts {
		if fact["kind"] != "substrate-incarnation-established" {
			continue
		}
		if fact["incarnation"] != incarnation {
			continue
		}
		cited, ok := fact["options"].(string)
		if !ok {
			return landing{}, fmt.Errorf("the establishment at position %d cites no options value", position)
		}
		return landing{incarnation: incarnation, cited: cited, position: position}, nil
	}
	return landing{}, fmt.Errorf("the lane carries no establishment for %s", incarnation)
}
