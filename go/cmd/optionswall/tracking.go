package main

import (
	"fmt"
	"math"
	"os"
	"regexp"
	"strings"

	"foldlab/canonical"
	"foldlab/daemon"
)

// Arm v: the tracking-artifact sweep over the refusals the daemon renders.
//
// Root law 10 binds every rendered string in this estate: a rendered surface
// carries no repo-local id, no ticket number, no script invocation and no
// filesystem path, and provenance on one is a digest of the source rather than a
// location. The mechanical wall that clause landed with sweeps the spine's
// rendered documents and nothing else. A refusal is a rendered surface too — it
// is the sentence a party who was refused is handed — and this package's
// refusals were outside every wall for it, which is how the options-citation
// mismatch came to render the resolved value's BYTES, store directory and all.
//
// **The sweep is over EXECUTED refusals and never over source.** A source sweep
// would have read `the cited digest %s resolves to %s` and found nothing wrong,
// because the path did not enter through the format string: it entered through
// what was substituted into it. So every refusal below is minted through a
// shipped door, under a posture whose store directory is a real directory this
// arm makes on the host — a sweep over a path-free posture is a sweep that could
// not fail.
//
// **Two exact oracles ride beside the six pattern clauses**, because a pattern
// is a net and an oracle is a measurement. The first is the store directory the
// probe declared: the arm knows the exact path it handed the door, in the raw
// spelling and in the canonicalizer's own escaping of it, and refuses to find
// either on a rendered line. The second is the source coordinate every
// transcribed row carries — the vendor file and line a row's `Site` names, which
// rides beside the row as the parity wall's oracle input and may never reach a
// rendering. No pattern clause catches that shape, so it is checked as the value
// it is rather than as a shape it might take.
//
// Bounds, stated where they bite rather than discovered later:
//
//  1. One line reports one clause, the first that matches it. A line carrying
//     two artifacts is still reported, under one of them, which is why each
//     planted control plants exactly one artifact.
//  2. The id clause carries NO exclusion list. The spine's carries one — by
//     name, with a liveness rule — because its surfaces speak the hash
//     function's own name, which is id-shaped and is language. Nothing this
//     package renders is id-shaped, so an exclusion list here would be an empty
//     name list, which is a place for the next family to hide.
//  3. One rendered string is not reachable through the declared type and is
//     therefore not swept: the undeclared-option reading for a declared value
//     carrying no options at all, which [daemon.DeclaredServerOptions] cannot
//     produce, since its own value always carries the block. The roster walk is
//     over KINDS rather than over renderings, and over kinds it is total.

// The named reasons this arm fails under.
//
// They are constants because the controls assert on them: a control that
// reddened for the wrong reason would prove the wrong thing, so each planted
// defect checks that the clause it planted against is the clause that refused.
const (
	reasonDriveLetter  = "tracking clause i — a rendered refusal carries a drive-lettered filesystem path"
	reasonBackslashRun = "tracking clause ii — a rendered refusal carries a backslash-rooted filesystem path"
	reasonDotRoot      = "tracking clause iii — a rendered refusal carries a dot-rooted filesystem path"
	reasonSlashRoot    = "tracking clause iv — a rendered refusal carries a slash-rooted filesystem path"
	reasonTicketID     = "tracking clause v — a rendered refusal carries a board-ticket id"
	reasonCommand      = "tracking clause vi — a rendered refusal carries a generation command"

	reasonDeclaredStore = "tracking oracle i — a rendered refusal carries the store directory the declared value named"
	reasonRowSite       = "tracking oracle ii — a rendered refusal carries a transcribed row's source coordinate"

	reasonRoster = "tracking roster — a refusal kind this package mints was never rendered, so nothing swept it"
)

// trackingClause is one class of tracking artifact root law 10 refuses on a
// rendered surface.
//
// Each clause is deliberately narrow enough to name what it caught. The set is
// not "anything with a slash": what the law refuses is a REFERENCE — something a
// reader could follow to a location on somebody's host — and the four shapes one
// takes here are a drive letter, a backslash root, a dot root, and a slash root.
// The vendor's own selector paths, which this package renders by design, take
// none of them.
type trackingClause struct {
	// Clause is the class's own name, as the refusal prints it.
	Clause string
	// Pattern is the shape it refuses. It carries EXACTLY ONE capturing group,
	// holding the artifact itself: what surrounds an artifact is how the clause
	// tells it from a coincidence of spelling, and what a refusal owes a reader
	// is the artifact. The arm checks the group count rather than trusting it.
	Pattern *regexp.Regexp
	// Why is the sentence saying why that shape may not be rendered.
	Why string
	// Reason is the named reason the arm fails under, which a control asserts
	// on.
	Reason string
}

// trackingClauses are the six clauses, in the order they are read.
//
// **Order is part of the design.** The drive-lettered clause is read before the
// backslash-rooted one so a Windows path is reported as the path it is rather
// than as its own tail, and the dot-rooted clause is read before the slash-
// rooted one for the same reason. A clause reads only what no earlier clause
// claimed, which is what makes one planted artifact refute exactly one clause.
var trackingClauses = []trackingClause{
	{
		Clause: "drive-lettered filesystem path",
		// A single letter followed by a colon and a separator, where the letter
		// starts a token. The leading exclusion is what keeps a URL scheme out:
		// the `f` in a leafnode remote's `nats-leaf://` is preceded by a letter
		// and is therefore not a drive.
		Pattern: regexp.MustCompile(`(?:^|[^A-Za-z0-9_])([A-Za-z]:[\\/][^\s"]*)`),
		Why:     "a host-local drive is the most ambient coordinate there is; it names a location on one machine and nothing anywhere else",
		Reason:  reasonDriveLetter,
	},
	{
		Clause:  "backslash-rooted filesystem path",
		Pattern: regexp.MustCompile(`(?:^|[^A-Za-z0-9_])(\\[A-Za-z0-9_.-][^\s"]*)`),
		Why:     "a rooted path is a location on the host that rendered it, and a reader on any other host can follow it nowhere",
		Reason:  reasonBackslashRun,
	},
	{
		Clause: "dot-rooted filesystem path",
		// The preceding character may not be a dot either, so a sentence's own
		// full stop before a slash-rooted path is reported as the rooted path it
		// is rather than as a relative one.
		Pattern: regexp.MustCompile(`(?:^|[^A-Za-z0-9_.])(\.{1,2}[\\/][^\s"]*)`),
		Why:     "a path relative to a working directory names a location only a party standing in that directory can follow",
		Reason:  reasonDotRoot,
	},
	{
		Clause: "slash-rooted filesystem path",
		// A separator that STARTS a token. A slash inside a word is a pair of
		// words and not a path, and a slash after a colon or another slash is a
		// URL's own punctuation: an address is an identity the estate declares,
		// not a location on a host.
		Pattern: regexp.MustCompile(`(?:^|[^A-Za-z0-9_.:~@/\\-])(/[A-Za-z0-9_.-][^\s"]*)`),
		Why:     "a rooted path is a location on the host that rendered it, and a reader on any other host can follow it nowhere",
		Reason:  reasonSlashRoot,
	},
	{
		Clause: "board-ticket id",
		// The family, not one family's prefix: two to four uppercase letters, a
		// hyphen and digits is what every tracking family in this estate looks
		// like.
		Pattern: regexp.MustCompile(`(\b[A-Z]{2,4}-[0-9]+\b)`),
		Why:     "a ticket number is where tracking lives, and a refused party is owed the law and the repair rather than the estate's own bookkeeping",
		Reason:  reasonTicketID,
	},
	{
		Clause: "generation command",
		// The runner together with its verb, never the runner alone: `go` is an
		// ordinary word and a clause that refused it would be refusing English
		// to protect a law about paths.
		Pattern: regexp.MustCompile(`(\bgo\s+(?:run|test|vet|build|generate|fmt|mod)\b|\bgofmt\b|\b(?:bun|npm|pnpm|yarn|deno)\s|\b(?:check|generate|build):[a-z][a-z0-9-]*)`),
		Why:     "how an artifact is rebuilt belongs beside the artifact, not inside a refusal a party who cannot run it is handed",
		Reason:  reasonCommand,
	},
}

// forbidden is one exact string an oracle refuses to find on a rendered line.
//
// A clause is a shape and an oracle is a value. The two coordinates below have
// no shape a pattern could catch reliably — a store directory is whatever the
// host handed out, and a row's source coordinate looks like an ordinary dotted
// word with a slash in it — so they are checked as the exact strings the arm
// handed the doors and read out of the shipped tables.
type forbidden struct {
	// Text is the exact string that may not be rendered.
	Text string
	// What names the coordinate, so a refusal says which one it found.
	What string
	// Reason is the named reason the arm fails under.
	Reason string
}

// trackingFinding is one artifact the sweep found on a rendered surface.
//
// It is a VALUE beside the error channel rather than an error in it, for the
// same reason the package under test returns a typed refusal rather than an
// error: a judgment about a surface is a reading, and an error is the apparatus
// failing to take one. A nil finding is a clean surface, and every caller
// checks for nil before letting one travel as an error — which is how the
// daemon's own admission door is called.
type trackingFinding struct {
	// Reason is the named clause or oracle that refused. A control asserts on
	// it, because a control that reddened for the wrong reason would prove the
	// wrong thing.
	Reason string
	// Report names what was found, on which surface, in which field.
	Report string
}

func (f *trackingFinding) Error() string {
	return fmt.Sprintf("%s: %s", f.Reason, f.Report)
}

// renderedLine is one string a refusal hands a reader, under the field it came
// from.
type renderedLine struct {
	Field string
	Text  string
}

// renderedRefusal is one refusal as the lines a reader is handed.
//
// The surface is NAMED rather than pathed, for the reason the spine's own sweep
// states: a refusal about a surface that may carry no paths should not itself
// have to print one.
type renderedRefusal struct {
	Surface string
	Kind    string
	Lines   []renderedLine
}

// assembledField is the label the assembled one-line rendering is swept under.
//
// It is not spelled with the vendor's own word for a connection error, and the
// avoidance is deliberate rather than incidental: that word is a row of the wire
// vocabulary, and the footprint sweep reads a bare literal spelling it as a
// second statement of the vendor's word. An allowance would have been available
// and would have been dishonest — the estate declares one only where re-sourcing
// the spelling would make it worse, and here a label simply has another name.
const assembledField = "assembled sentence"

// renderRefusal reads one refusal out as every string it renders.
//
// [daemon.Refusal.Error] is read beside the four fields it is assembled from,
// and the redundancy is deliberate: that method is the rendering a caller
// receives when the refusal travels as an ordinary error, so it is a rendered
// surface of its own and an assembly that leaked something the fields did not
// would go unswept if only the fields were read.
func renderRefusal(surface string, refusal *daemon.Refusal) renderedRefusal {
	lines := []renderedLine{
		{Field: "reason", Text: refusal.Kind},
		{Field: "law", Text: refusal.Law},
		{Field: "got", Text: fmt.Sprint(refusal.Got)},
		{Field: "want", Text: fmt.Sprint(refusal.Want)},
		{Field: assembledField, Text: refusal.Error()},
	}
	for _, next := range refusal.Next {
		lines = append(lines,
			renderedLine{Field: "repair subject", Text: next.Subject},
			renderedLine{Field: "repair note", Text: next.Note},
		)
	}
	return renderedRefusal{Surface: surface, Kind: refusal.Kind, Lines: lines}
}

// sweepRendered reads every rendered line of every refusal and reports the first
// artifact it finds.
//
// The oracles are read BEFORE the clauses, so a rendered store directory is
// reported as the store directory it is rather than as whatever path shape the
// host happened to give it. That ordering is also what makes the retired
// rendering's committed refutation say the same thing on every host.
func sweepRendered(
	surfaces []renderedRefusal,
	oracles []forbidden,
) (swept int, finding *trackingFinding, err error) {
	if len(surfaces) == 0 {
		return 0, nil, fmt.Errorf("%s: no rendered refusal was swept at all", reasonRoster)
	}
	// The one-group shape is a property of every clause and is checked here
	// rather than remembered at each declaration: a clause that grew a second
	// group would report the wrong half of what it caught.
	for _, clause := range trackingClauses {
		if clause.Pattern.NumSubexp() != 1 {
			return 0, nil, fmt.Errorf(
				"the %s clause carries %d capturing groups and a clause carries exactly one",
				clause.Clause, clause.Pattern.NumSubexp(),
			)
		}
	}
	for _, surface := range surfaces {
		if len(surface.Lines) == 0 {
			return 0, nil, fmt.Errorf("%s: %s rendered no lines at all", reasonRoster, surface.Surface)
		}
		for _, line := range surface.Lines {
			swept++
			for _, oracle := range oracles {
				if oracle.Text == "" || !strings.Contains(line.Text, oracle.Text) {
					continue
				}
				return swept, &trackingFinding{
					Reason: oracle.Reason,
					Report: fmt.Sprintf(
						"%s renders %s in its %s (%q)",
						surface.Surface, oracle.What, line.Field, oracle.Text,
					),
				}, nil
			}
			for _, clause := range trackingClauses {
				found := clause.Pattern.FindStringSubmatch(line.Text)
				if found == nil {
					continue
				}
				return swept, &trackingFinding{
					Reason: clause.Reason,
					Report: fmt.Sprintf(
						"%s renders a %s in its %s (%q): %s",
						surface.Surface, clause.Clause, line.Field, found[1], clause.Why,
					),
				}, nil
			}
		}
	}
	return swept, nil, nil
}

// probePort is the setting a probe opens a closed-inventory row at.
//
// It is an arbitrary non-zero number and it is never dialled: this arm
// constructs no server, binds nothing, and needs only a setting that differs
// from the row's declared closed one so that the door refuses.
const probePort = 4223

// mismatchSurface names the one refusal the arm prints verbatim, so the mint
// and the report agree on which surface that is by construction.
const mismatchSurface = "the options-citation mismatch refusal"

// mintedRefusals mints every refusal this package renders, through the shipped
// doors, under a declared value whose store directory is the given real
// directory.
//
// Nothing here hand-builds a refusal. Every one below comes back out of a door
// the estate ships, which is what makes the sweep a sweep of what a refused
// party is handed rather than of what this file thinks that is.
func mintedRefusals(store string) ([]renderedRefusal, []daemon.ClosedChannel, error) {
	declared := estateDeclared(store, probePort)
	surfaces := make([]renderedRefusal, 0, len(daemon.ClosedChannels)+4)
	probeRows := make([]daemon.ClosedChannel, 0, 2)

	// Every inventory row on its own, because every row carries its own repair
	// and a sweep that minted one refusal would leave seven repairs unread.
	for _, channel := range daemon.ClosedChannels {
		enabling, err := enableRow(declared, channel.Row, probePort)
		if err != nil {
			return nil, nil, err
		}
		refusal := daemon.AdmitServerOptions(enabling)
		if refusal == nil {
			return nil, nil, fmt.Errorf(
				"the shipped door admitted a value enabling the %s row", channel.Row,
			)
		}
		surfaces = append(surfaces, renderRefusal(
			fmt.Sprintf("the closed-channel refusal for the %s row", channel.Row), refusal,
		))
	}

	// The two undeclared-option readings the declared type can reach. The
	// inventory is a PARAMETER of the shipped door, which is the seam the
	// admission control already uses, so both are minted by the door rather than
	// assembled here: one row reads an option the declared value does not carry,
	// and one row declares a closed setting that cannot be canonicalized.
	absent := daemon.ClosedChannel{
		Row:         "an option the declared value does not carry",
		Option:      "websocket.no_tls",
		Declaration: "server.Options.Websocket.NoTLS",
		Site:        "server/opts.go:601",
		Closed:      false,
		Subject:     "substrate.options.websocket",
		Repair:      "Declare a setting for this row before submitting the value.",
	}
	probeRows = append(probeRows, absent)
	refusal := daemon.AdmitUnder([]daemon.ClosedChannel{absent}, declared)
	if refusal == nil {
		return nil, nil, fmt.Errorf("the shipped door admitted a value missing an option the inventory reads")
	}
	surfaces = append(surfaces, renderRefusal("the undeclared-option refusal for an absent option", refusal))

	uncanonical := daemon.ClosedChannel{
		Row:         "a closed setting outside the canonical domain",
		Option:      "port",
		Declaration: "server.Options.Port",
		Site:        "server/opts.go:401",
		Closed:      math.NaN(),
		Subject:     "substrate.options",
		Repair:      "Declare a closed setting the canonicalizer can name.",
	}
	probeRows = append(probeRows, uncanonical)
	refusal = daemon.AdmitUnder([]daemon.ClosedChannel{uncanonical}, declared)
	if refusal == nil {
		return nil, nil, fmt.Errorf("the shipped door admitted a row whose closed setting does not canonicalize")
	}
	surfaces = append(surfaces, renderRefusal("the undeclared-option refusal for an uncanonicalizable setting", refusal))

	// The two citation readings, both through the shipped citation door over a
	// store the arm declared two values into.
	values := daemon.NewOptionsStore()
	running := declared
	cited, err := values.Declare(estateDeclared(store, probePort+1))
	if err != nil {
		return nil, nil, err
	}
	if _, err := values.Declare(running); err != nil {
		return nil, nil, err
	}
	refusal = daemon.AdmitOptionsCitation(values, cited, running)
	if refusal == nil {
		return nil, nil, fmt.Errorf("the shipped door admitted a citation of a value the incarnation did not run under")
	}
	surfaces = append(surfaces, renderRefusal(mismatchSurface, refusal))

	refusal = daemon.AdmitOptionsCitation(
		values,
		"0000000000000000000000000000000000000000000000000000000000000000",
		running,
	)
	if refusal == nil {
		return nil, nil, fmt.Errorf("the shipped door admitted a citation nothing resolves")
	}
	surfaces = append(surfaces, renderRefusal("the options-citation unresolved refusal", refusal))

	return surfaces, probeRows, nil
}

// storeOracles are the exact coordinates the sweep refuses to find, derived
// rather than declared.
//
// The store directory is carried in TWO spellings, and the second one is the
// whole reason this is an oracle rather than a pattern. A rendering that leaked
// the declared value did it by rendering the value's canonical bytes, and those
// bytes carry the path with the canonicalizer's own escaping applied — so on a
// host whose separator is a backslash the raw spelling appears nowhere and a
// substring check for it would find nothing. The escaping is taken FROM the one
// canonicalizer rather than reproduced here.
func storeOracles(store string, rows []daemon.ClosedChannel) ([]forbidden, error) {
	escaped, err := canonical.CanonicalizeValue(store)
	if err != nil {
		return nil, fmt.Errorf("take the canonical spelling of the store directory: %w", err)
	}
	oracles := []forbidden{{
		Text:   store,
		What:   "the store directory the declared value named",
		Reason: reasonDeclaredStore,
	}}
	if quoted := strings.Trim(string(escaped), `"`); quoted != store {
		oracles = append(oracles, forbidden{
			Text:   quoted,
			What:   "the store directory the declared value named, in the canonicalizer's own escaping",
			Reason: reasonDeclaredStore,
		})
	}
	seen := map[string]bool{}
	sites := make([]string, 0, len(daemon.ServerOptionRoster)+len(daemon.ClosedChannels)+len(rows))
	for _, option := range daemon.ServerOptionRoster {
		sites = append(sites, option.Site)
	}
	for _, channel := range daemon.ClosedChannels {
		sites = append(sites, channel.Site)
	}
	for _, row := range rows {
		sites = append(sites, row.Site)
	}
	for _, site := range sites {
		if site == "" || seen[site] {
			continue
		}
		seen[site] = true
		oracles = append(oracles, forbidden{
			Text:   site,
			What:   "a transcribed row's source coordinate",
			Reason: reasonRowSite,
		})
	}
	return oracles, nil
}

// runTracking is the arm: mint every refusal, sweep every line it renders, and
// walk the roster so a kind added without a probe reddens.
func runTracking() error {
	store, err := os.MkdirTemp("", "foldlab-options-tracking-")
	if err != nil {
		return fmt.Errorf("make the probe's store directory: %w", err)
	}
	defer os.RemoveAll(store)

	surfaces, probeRows, err := mintedRefusals(store)
	if err != nil {
		return err
	}
	oracles, err := storeOracles(store, probeRows)
	if err != nil {
		return err
	}
	swept, finding, err := sweepRendered(surfaces, oracles)
	if err != nil {
		return err
	}
	if finding != nil {
		return finding
	}
	if err := coversRoster(surfaces); err != nil {
		return err
	}

	// The evidence. The citation mismatch is printed VERBATIM because it is the
	// refusal this arm exists behind: what its two fields render is the whole
	// question, and a number without the sentence beside it would be a claim.
	for _, surface := range surfaces {
		if surface.Surface != mismatchSurface {
			continue
		}
		fmt.Printf("== %s\n", surface.Surface)
		for _, line := range surface.Lines {
			// The assembled sentence is the four fields above joined; printing
			// it here would print them twice.
			if line.Field == assembledField {
				continue
			}
			fmt.Printf("   %s: %s\n", line.Field, line.Text)
		}
		fmt.Println()
	}
	fmt.Printf(
		"swept %d rendered lines across %d refusals minted at the shipped doors, under a"+
			" declared value naming a real store directory\n",
		swept, len(surfaces),
	)
	fmt.Printf(
		"clauses: %d, exact oracles: %d (the declared store directory in %d spellings, and every"+
			" transcribed row's source coordinate)\n",
		len(trackingClauses), len(oracles), len(oracles)-countSites(oracles),
	)
	fmt.Printf(
		"\nREFUSAL TRACKING ARTIFACTS: %d refusals rendered from the shipped doors and %d lines"+
			" swept against %d clauses and %d exact coordinates; %d refusal kinds on the roster and"+
			" every one of them rendered; 0 tracking artifacts\n",
		len(surfaces), swept, len(trackingClauses), len(oracles), len(daemon.RefusalKinds),
	)
	return nil
}

// countSites is how many of the oracles are row coordinates rather than store
// spellings, so the arm's own report says which is which.
func countSites(oracles []forbidden) int {
	count := 0
	for _, oracle := range oracles {
		if oracle.Reason == reasonRowSite {
			count++
		}
	}
	return count
}

// coversRoster walks the package's declared roster of reasons and refuses a kind
// no probe rendered.
//
// This is the same discipline the package's own repair totality keeps, read from
// the other side: there, a kind added without a repair reddens; here, a kind
// added without a rendering reddens, because an unrendered kind is a kind
// nothing swept.
func coversRoster(surfaces []renderedRefusal) error {
	rendered := map[string]bool{}
	for _, surface := range surfaces {
		rendered[surface.Kind] = true
	}
	missing := make([]string, 0)
	for _, kind := range daemon.RefusalKinds {
		if !rendered[kind] {
			missing = append(missing, kind)
		}
	}
	if len(missing) != 0 {
		return fmt.Errorf("%s: %s", reasonRoster, strings.Join(missing, ", "))
	}
	for kind := range rendered {
		known := false
		for _, declared := range daemon.RefusalKinds {
			if declared == kind {
				known = true
				break
			}
		}
		if !known {
			return fmt.Errorf(
				"%s: a probe rendered %q, which the roster does not name", reasonRoster, kind,
			)
		}
	}
	return nil
}
