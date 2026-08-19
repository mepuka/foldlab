package main

import (
	"fmt"
	"os"

	"foldlab/daemon"
)

// The seven committed refutations of the tracking-artifact sweep.
//
// A sweep that cannot fail proves nothing. Six of these plant one artifact per
// clause, each in a refusal THE SHIPPED DOOR MINTS — the admission door takes
// its inventory as a parameter, which is the same seam the closed-channel
// admission control already stands on, so a planted repair reaches the sweep the
// way a real one would rather than as a string this file typed at the detector.
// The seventh plants the rendering this slice retired.
//
// Each control checks that the clause it planted against is the clause that
// refused, because a control that reddens for the wrong reason proves the wrong
// thing. Nothing here edits a file the estate ships: the inventory rows are
// values built for the control and the retired rendering is assembled from a
// refusal the shipped door minted.
//
// **This command PRINTS what a refusal may not RENDER, and the distinction is
// the whole ruling.** A wall's output is evidence — it is read by the party
// running the battery, on the host that ran it, beside the numbers it is
// evidence for — and evidence that hid what it planted would not be evidence. A
// refusal is a rendered surface: it travels to a party who was refused, on some
// other host, where a path resolves to nothing and a ticket number resolves to
// nobody. Root law 10 binds the second and not the first.

// trackingControl is one planted defect and the clause it must refute on.
type trackingControl struct {
	// Name is the control's own name, as the report prints it.
	Name string
	// Plant says what defect was planted, in the report's own words.
	Plant string
	// Reason is the named clause reason the refutation must carry.
	Reason string
	// Run plants the defect and runs the real sweep over the result. The
	// finding is what the sweep read, which a control wants to be non-nil; the
	// error is the apparatus breaking, which is never a refutation of anything.
	Run func(store string) (*trackingFinding, error)
}

// plantedRepair is the shape every clause control plants: one inventory row
// whose repair carries the artifact, refused by the shipped door.
//
// The row's own coordinates are ordinary and artifact-free, so the only thing
// the sweep can catch is what the note carries — which is what makes each
// control refute on exactly one clause.
func plantedRepair(row string, note string) daemon.ClosedChannel {
	return daemon.ClosedChannel{
		Row:         row,
		Option:      "port",
		Declaration: "server.Options.Port",
		Site:        "server/opts.go:401",
		Closed:      float64(0),
		Subject:     "substrate.options",
		Repair:      note,
	}
}

// sweepPlanted mints the planted row's refusal at the shipped door and runs the
// real sweep, with the real oracles, over what it rendered.
func sweepPlanted(store string, row daemon.ClosedChannel) (*trackingFinding, error) {
	declared := estateDeclared(store, probePort)
	refusal := daemon.AdmitUnder([]daemon.ClosedChannel{row}, declared)
	if refusal == nil {
		return nil, fmt.Errorf("the shipped door admitted the control's inventory, so nothing was planted")
	}
	oracles, err := storeOracles(store, []daemon.ClosedChannel{row})
	if err != nil {
		return nil, err
	}
	surfaces := []renderedRefusal{renderRefusal("the planted refusal", refusal)}
	_, finding, err := sweepRendered(surfaces, oracles)
	return finding, err
}

// controlRetiredRendering plants the rendering this slice retired: the citation
// mismatch's own refusal with the resolved and the running BYTES in it.
//
// It is the committed refutation of the defect the slice was opened for. The
// law and the repair are read off a refusal the SHIPPED door minted rather than
// retyped, so the only thing the control changes is the one thing that moved —
// what the two fields render — and the sweep is measured against the exact
// rendering that used to ship.
//
// It refutes on the store-directory oracle rather than on a path clause, which
// is why the oracles are read first: the bytes carry whatever separator the host
// uses, so a clause-based refutation would name a different clause on a
// different host and this control would be measuring the host.
func controlRetiredRendering(store string) (*trackingFinding, error) {
	running := estateDeclared(store, probePort)
	values := daemon.NewOptionsStore()
	cited, err := values.Declare(estateDeclared(store, probePort+1))
	if err != nil {
		return nil, err
	}
	if _, err := values.Declare(running); err != nil {
		return nil, err
	}
	minted := daemon.AdmitOptionsCitation(values, cited, running)
	if minted == nil {
		return nil, fmt.Errorf("the shipped door admitted a citation of a value the incarnation did not run under")
	}
	_, resolved, err := values.Resolve(cited)
	if err != nil {
		return nil, err
	}
	encoded, err := running.Bytes()
	if err != nil {
		return nil, err
	}
	retired := &daemon.Refusal{
		Kind: minted.Kind,
		Law:  minted.Law,
		Got:  fmt.Sprintf("the cited digest %s resolves to %s", cited, resolved),
		Want: fmt.Sprintf("the running value %s", encoded),
		Next: minted.Next,
	}
	oracles, err := storeOracles(store, nil)
	if err != nil {
		return nil, err
	}
	surfaces := []renderedRefusal{renderRefusal("the retired citation-mismatch rendering", retired)}
	_, finding, err := sweepRendered(surfaces, oracles)
	return finding, err
}

func trackingControls() []trackingControl {
	planted := []struct {
		name   string
		plant  string
		reason string
		row    string
		note   string
	}{
		{
			name:   "drive-lettered path in a repair",
			plant:  "a repair naming a location on one host's own drive",
			reason: reasonDriveLetter,
			row:    "a repair carrying a drive-lettered path",
			note:   `Declare the store directory at C:\foldlab\substrate and submit the value again.`,
		},
		{
			name:   "backslash-rooted path in a repair",
			plant:  "a repair naming a location rooted at the host's own separator",
			reason: reasonBackslashRun,
			row:    "a repair carrying a backslash-rooted path",
			note:   `Declare the store directory at \foldlab\substrate and submit the value again.`,
		},
		{
			name:   "dot-rooted path in a repair",
			plant:  "a repair naming a location relative to somebody's working directory",
			reason: reasonDotRoot,
			row:    "a repair carrying a dot-rooted path",
			note:   "Declare the store directory at ./substrate and submit the value again.",
		},
		{
			name:   "slash-rooted path in a repair",
			plant:  "a repair naming a location rooted at the host's own filesystem",
			reason: reasonSlashRoot,
			row:    "a repair carrying a slash-rooted path",
			note:   "Declare the store directory at /var/lib/foldlab/substrate and submit the value again.",
		},
		{
			name:   "board-ticket id in a repair",
			plant:  "a repair pointing a refused party at the estate's own bookkeeping",
			reason: reasonTicketID,
			row:    "a repair carrying a board-ticket id",
			note:   "The row is held open under the board ticket DEV-895 until the operator rules.",
		},
		{
			name:   "generation command in a repair",
			plant:  "a repair telling a refused party to run a command it cannot run",
			reason: reasonCommand,
			row:    "a repair carrying a generation command",
			note:   "Re-derive the option table with go generate and submit the value again.",
		},
	}
	controls := make([]trackingControl, 0, len(planted)+1)
	for _, defect := range planted {
		row, note := defect.row, defect.note
		controls = append(controls, trackingControl{
			Name:   defect.name,
			Plant:  defect.plant,
			Reason: defect.reason,
			Run: func(store string) (*trackingFinding, error) {
				return sweepPlanted(store, plantedRepair(row, note))
			},
		})
	}
	return append(controls, trackingControl{
		Name:   "the retired citation-mismatch rendering",
		Plant:  "the options-citation mismatch rendering the resolved and running bytes, store directory and all",
		Reason: reasonDeclaredStore,
		Run:    controlRetiredRendering,
	})
}

func runTrackingControls() error {
	store, err := os.MkdirTemp("", "foldlab-options-tracking-control-")
	if err != nil {
		return fmt.Errorf("make the control's store directory: %w", err)
	}
	defer os.RemoveAll(store)

	controls := trackingControls()
	for _, executed := range controls {
		finding, err := executed.Run(store)
		if err != nil {
			return fmt.Errorf("CONTROL COULD NOT BE PLANTED — %s: %w", executed.Name, err)
		}
		if finding == nil {
			return fmt.Errorf(
				"CONTROL STAYED GREEN — %s: planted %s and the sweep admitted it."+
					" A sweep that cannot fail proves nothing",
				executed.Name, executed.Plant,
			)
		}
		if finding.Reason != executed.Reason {
			return fmt.Errorf(
				"CONTROL REFUTED ON THE WRONG CLAUSE — %s: planted %s and expected %q, got: %v",
				executed.Name, executed.Plant, executed.Reason, finding,
			)
		}
		fmt.Printf("control %q refuted: %v\n", executed.Name, finding)
	}
	fmt.Printf(
		"\nREFUSAL TRACKING CONTROLS: %d planted defects, %d refuted, each on the clause it was"+
			" planted against; the seventh is the rendering this slice retired, refuted against the"+
			" store directory the declared value actually named\n",
		len(controls), len(controls),
	)
	return nil
}
