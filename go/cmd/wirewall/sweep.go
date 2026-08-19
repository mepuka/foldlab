package main

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"foldlab/daemon"
)

// Arm v: the footprint sweep.
//
// A vocabulary adopted by transcription is only adopted if the estate SPEAKS it
// through the table. A protocol verb, an API subject, a system event subject, a
// status event name, or a lifecycle entry point written as a bare string
// literal somewhere else is a second statement of the same word — and a second
// statement is where drift starts, because nothing holds it to the first.
//
// The sweep's vocabulary is DERIVED FROM THE TABLES rather than listed here, so
// a row appended tomorrow widens the sweep by construction and a word retired
// stops being swept for. Subject rows contribute their stable prefix — the part
// before the vendor's own wildcard or format hole — because that is the part a
// hand-written spelling would have to repeat.
//
// Two kinds of exception exist and both are DECLARED lines with stated reasons.
// A module of the transcription family is exempt wholesale: it is where the
// words live. Everything else is a per-file, per-word allowance whose reason
// says why re-sourcing that hit would make the estate worse rather than better.
// There is no silent skip: a hit that is neither exempt nor allowed fails the
// arm, and an allowance that no longer matches anything fails it too.
//
// Three bounds, stated where they bite rather than discovered later:
//
//  1. Comments are not read. A wire word in a doc comment is prose about the
//     vendor, not a second statement of the word.
//  2. One literal reports one word — the first the vocabulary matches. A
//     literal carrying two vocabulary words is still reported, under one of
//     them, and an allowance covers the word it was reported under.
//  3. The arm reads text, so it cannot tell the vendor's own discriminant from
//     an ordinary word that happens to be spelled the same. Those are declared
//     as allowances with a reason saying so, one per file and word, rather than
//     narrowed out of the vocabulary — narrowing would drop the word for every
//     file at once.

// sweptRoot is one tree the sweep reads, with the file extension it reads there.
type sweptRoot struct {
	path      string
	extension string
}

// sweptRoots is the estate's own substrate-speaking sources.
//
// The boundary is stated rather than assumed: these are the trees that hold a
// connection to the substrate or render its vocabulary. The tracer bullet's own
// protocol is not swept — its words are its own closed list, its `close` is a
// move rather than a connection status, and sweeping it would report the
// estate's own vocabulary as the vendor's. The canonicalization seam speaks no
// substrate at all.
var sweptRoots = []sweptRoot{
	{path: "packages/plait/src", extension: ".ts"},
	{path: "packages/plait/scripts", extension: ".ts"},
	{path: "packages/plait/test", extension: ".ts"},
	{path: "go", extension: ".go"},
}

// exemptPath is one path the sweep does not read, with the reason it does not.
type exemptPath struct {
	prefix string
	reason string
}

// exemptPaths are the transcription family's own modules, their tests, and the
// wall itself.
//
// These are where the words are supposed to be. Sweeping them would be
// sweeping the table for the table's own contents.
var exemptPaths = []exemptPath{
	{
		prefix: "go/daemon/wirevocabulary.go",
		reason: "the normative transcription module: this is where every wire word this sweep looks for is declared",
	},
	{
		prefix: "go/daemon/wirevocabularydigests.go",
		reason: "the transcription module's emitted provenance digests, keyed by region names that name vendor sources",
	},
	{
		prefix: "go/daemon/wirevocabulary_test.go",
		reason: "the transcription module's own test, which states the words it holds the table to",
	},
	{
		prefix: "go/cmd/wirewall",
		reason: "the wall and its executed controls: evidence machinery, which must be able to name and to plant the words it checks",
	},
	{
		prefix: "packages/plait/src/internal/wirevocabulary.ts",
		reason: "the spine's pass-through of the same table, emitted from it",
	},
	{
		prefix: "packages/plait/src/internal/statusvocabulary.ts",
		reason: "the connection machine built over the status vocabulary, and a module of the same transcription family. Its eleven rows are ABSORBED from the wire vocabulary and no longer stated there; what remains is the machine table, whose state column is named by the vendor's own transitions by construction — a state spelled from anywhere else would be a state the vendor never declared.",
	},
	{
		prefix: "packages/plait/test/process/substrate-wire-mint.ts",
		reason: "the wall's TypeScript half, which renders the table's own bytes",
	},
	{
		prefix: "packages/plait/test/WireVocabulary.test.ts",
		reason: "the transcription module's own test on the spine side",
	},
}

// allowance is one declared, reasoned exception for a hit outside the
// transcription family.
type allowance struct {
	file   string
	word   string
	reason string
}

// The reason classes an allowance is declared under.
//
// Each class is stated once, in full, and every allowance names the class it
// stands on. A class is a reason and not a category: it says why re-sourcing
// that hit would make the estate worse, and an allowance whose class does not
// actually apply to it is a defect in this list rather than a shortcut in it.
const (
	reasonOracleWrit = "The substrate writ table is the INDEPENDENT ORACLE the permission projection is checked against, and its rows are declared values whose digests session facts already cite. Re-sourcing it from the same table the projection now reads would make that check compare a value with itself, and re-spelling its bytes would rename every writ the estate has ever declared."

	reasonTestOracle = "A test states its own expectation. Where the literal is the vendor's own word, re-sourcing it from the table under test would make the assertion agree with the table by construction and delete the independent oracle the transcription is checked against; where it is one of the estate's own ordinary words that happens to spell a row's discriminant, there is nothing to re-source. Either way the line is declared here rather than skipped, and a word one of these files does not already carry still has to be declared before the arm goes green."

	reasonHomonym = "An ordinary word the estate uses for a purpose of its own — the schema library's excess-property setting, a diagnostic severity — which happens to spell one of the eleven status discriminants. The sweep matches text and cannot tell the two apart, so the line is declared rather than papered over: the estate speaks no status event here."

	reasonConnectOption = "The pinned client's own CONNECT-option name, which happens to spell the reconnect status discriminant. The connect-option roster is its own declared surface with its own provenance and is not a row of this table; reading it out of the status group would name an option after an event."
)

// allowances are every lawful hit the sweep finds, declared one by one.
//
// A lawful hit is one where re-sourcing the spelling from the table would make
// the estate WORSE — because it would collapse an independent oracle into the
// thing it checks, because the bytes are a declared value whose digest is
// already cited and respelling them would rename it, or because the literal is
// an ordinary word that is not the vendor's at all. Nothing is here because it
// was inconvenient to change.
var allowances = []allowance{
	{
		file:   "packages/plait/src/internal/writs.ts",
		word:   "$JS.API",
		reason: reasonOracleWrit,
	},
	{
		file:   "packages/plait/src/internal/writs.ts",
		word:   "$KV",
		reason: reasonOracleWrit,
	},
	{file: "go/daemon/incarnation_test.go", word: "ldm", reason: reasonTestOracle},
	{file: "go/daemon/session_test.go", word: "INFO", reason: reasonTestOracle},
	{file: "go/daemon/session_test.go", word: "PONG", reason: reasonTestOracle},
	{file: "go/journal/task19_finding_test.go", word: "$JS.API", reason: reasonTestOracle},
	{file: "go/substrate/envelope_test.go", word: "$JS.API", reason: reasonTestOracle},
	{file: "go/substrate/envelope_test.go", word: "$KV", reason: reasonTestOracle},
	{file: "go/substrate/envelope_test.go", word: "KV_", reason: reasonTestOracle},
	{file: "go/substrate/harness_test.go", word: "$KV", reason: reasonTestOracle},
	{file: "packages/plait/scripts/negative-trace.ts", word: "error", reason: reasonHomonym},
	{file: "packages/plait/src/internal/anchors.ts", word: "error", reason: reasonHomonym},
	{file: "packages/plait/src/internal/cells.ts", word: "error", reason: reasonHomonym},
	{file: "packages/plait/src/internal/lanereads.ts", word: "error", reason: reasonHomonym},
	{file: "packages/plait/src/internal/permissions.ts", word: "error", reason: reasonHomonym},
	{file: "packages/plait/src/internal/pump.ts", word: "error", reason: reasonHomonym},
	{file: "packages/plait/src/internal/registers.ts", word: "error", reason: reasonHomonym},
	{file: "packages/plait/src/internal/substrate.ts", word: "reconnect", reason: reasonConnectOption},
	{file: "packages/plait/src/kernel/Wire.ts", word: "error", reason: reasonHomonym},
	{file: "packages/plait/src/planes/Lane.ts", word: "error", reason: reasonHomonym},
	{file: "packages/plait/test/CarrierAdminSurface.test.ts", word: "$KV", reason: reasonTestOracle},
	{file: "packages/plait/test/CarrierAdminSurface.test.ts", word: "KV_", reason: reasonTestOracle},
	{file: "packages/plait/test/CellWall.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/Heartbeat.test.ts", word: "ping", reason: reasonTestOracle},
	{file: "packages/plait/test/Heartbeat.test.ts", word: "reconnecting", reason: reasonTestOracle},
	{file: "packages/plait/test/HoldProxy.ts", word: "$KV", reason: reasonTestOracle},
	{file: "packages/plait/test/HoldProxy.ts", word: "HPUB", reason: reasonTestOracle},
	{file: "packages/plait/test/HoldProxy.ts", word: "PUB", reason: reasonTestOracle},
	{file: "packages/plait/test/HoldProxy.ts", word: "close", reason: reasonTestOracle},
	{file: "packages/plait/test/HoldProxy.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/KVWatchSemantics.test.ts", word: "disconnect", reason: reasonTestOracle},
	{file: "packages/plait/test/KVWatchSemantics.test.ts", word: "reconnect", reason: reasonTestOracle},
	{file: "packages/plait/test/MaxPayloadSemantics.test.ts", word: "+OK", reason: reasonTestOracle},
	{file: "packages/plait/test/MaxPayloadSemantics.test.ts", word: "-ERR", reason: reasonTestOracle},
	{file: "packages/plait/test/MaxPayloadSemantics.test.ts", word: "CONNECT", reason: reasonTestOracle},
	{file: "packages/plait/test/MaxPayloadSemantics.test.ts", word: "INFO", reason: reasonTestOracle},
	{file: "packages/plait/test/MaxPayloadSemantics.test.ts", word: "PUB", reason: reasonTestOracle},
	{file: "packages/plait/test/MaxPayloadSemantics.test.ts", word: "close", reason: reasonTestOracle},
	{file: "packages/plait/test/MaxPayloadSemantics.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/ObjectStoreSemantics.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/ObjectStoreSemantics.test.ts", word: "update", reason: reasonTestOracle},
	{file: "packages/plait/test/OrderedConsumerSemantics.test.ts", word: "$JS.API", reason: reasonTestOracle},
	{file: "packages/plait/test/OrderedConsumerSemantics.test.ts", word: "HPUB", reason: reasonTestOracle},
	{file: "packages/plait/test/OrderedConsumerSemantics.test.ts", word: "PUB", reason: reasonTestOracle},
	{file: "packages/plait/test/OrderedConsumerSemantics.test.ts", word: "close", reason: reasonTestOracle},
	{file: "packages/plait/test/OrderedConsumerSemantics.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/Permissions.test.ts", word: "$JS.API", reason: reasonTestOracle},
	{file: "packages/plait/test/Permissions.test.ts", word: "$KV", reason: reasonTestOracle},
	{file: "packages/plait/test/Permissions.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/RefusalNext.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/Register.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/RegisterIncarnation.test.ts", word: "$KV", reason: reasonTestOracle},
	{file: "packages/plait/test/RegisterIncarnation.test.ts", word: "KV_", reason: reasonTestOracle},
	{file: "packages/plait/test/RoundTrip.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPump.test.ts", word: "close", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPump.test.ts", word: "disconnect", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPump.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPump.test.ts", word: "ldm", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPump.test.ts", word: "ping", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPump.test.ts", word: "reconnect", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPump.test.ts", word: "reconnecting", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPump.test.ts", word: "slowConsumer", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPump.test.ts", word: "update", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPumpWall.test.ts", word: "disconnect", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPumpWall.test.ts", word: "reconnect", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPumpWall.test.ts", word: "reconnecting", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPumpWall.test.ts", word: "slowConsumer", reason: reasonTestOracle},
	{file: "packages/plait/test/StatusPumpWall.test.ts", word: "staleConnection", reason: reasonTestOracle},
	{file: "packages/plait/test/SubstrateIncarnation.test.ts", word: "ldm", reason: reasonTestOracle},
	{file: "packages/plait/test/SubstrateSession.test.ts", word: "$JS.API", reason: reasonTestOracle},
	{file: "packages/plait/test/SubstrateSession.test.ts", word: "ldm", reason: reasonTestOracle},
	{file: "packages/plait/test/SubstrateSession.test.ts", word: "reconnect", reason: reasonTestOracle},
	{file: "packages/plait/test/Wall.test.ts", word: "error", reason: reasonTestOracle},
	{file: "packages/plait/test/process/publisher.ts", word: "error", reason: reasonTestOracle},
}

// footprintHit is one unlawful occurrence.
type footprintHit struct {
	file string
	line int
	word string
	text string
}

var (
	goString       = regexp.MustCompile("\"((?:[^\"\\\\\\n]|\\\\.)*)\"|`([^`\\n]*)`")
	tsString       = regexp.MustCompile("\"((?:[^\"\\\\\\n]|\\\\.)*)\"|'((?:[^'\\\\\\n]|\\\\.)*)'|`([^`\\n]*)`")
	wildcardHole   = regexp.MustCompile(`[*>%]`)
	identifierWord = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9]*$`)
)

func isIdentifierByte(character byte) bool {
	switch {
	case character >= 'A' && character <= 'Z':
		return true
	case character >= 'a' && character <= 'z':
		return true
	case character >= '0' && character <= '9':
		return true
	default:
		return character == '_'
	}
}

// sweepVocabulary is the word list, derived from the five tables.
type sweepVocabulary struct {
	verbs    []string
	prefixes []string
	exact    []string
}

func buildVocabulary() sweepVocabulary {
	vocabulary := sweepVocabulary{}
	for _, row := range daemon.ProtocolVerbs {
		vocabulary.verbs = append(vocabulary.verbs, row.Word)
	}
	prefixes := map[string]bool{}
	addPrefix := func(subject string) {
		if subject == "" {
			return
		}
		cut := wildcardHole.FindStringIndex(subject)
		stable := subject
		if cut != nil {
			stable = subject[:cut[0]]
		}
		if stable == "" {
			return
		}
		prefixes[stable] = true
	}
	for _, row := range daemon.APISubjects {
		addPrefix(row.Subject)
		addPrefix(row.Template)
	}
	for _, row := range daemon.SystemSubjects {
		addPrefix(row.Subject)
	}
	// Only the SHORTEST prefixes are kept: a longer one that starts with a
	// kept one would find nothing the kept one did not, and reporting a hit
	// twice would make an allowance need two lines to cover one occurrence.
	kept := make([]string, 0, len(prefixes))
	for prefix := range prefixes {
		kept = append(kept, prefix)
	}
	sort.Strings(kept)
	for _, prefix := range kept {
		shadowed := false
		for _, already := range vocabulary.prefixes {
			if strings.HasPrefix(prefix, already) {
				shadowed = true
				break
			}
		}
		if !shadowed {
			vocabulary.prefixes = append(vocabulary.prefixes, prefix)
		}
	}
	for _, row := range daemon.StatusEvents {
		vocabulary.exact = append(vocabulary.exact, row.Type)
	}
	for _, row := range daemon.LifecycleEntries {
		segments := strings.Split(row.Entry, ".")
		last := segments[len(segments)-1]
		if identifierWord.MatchString(last) {
			vocabulary.exact = append(vocabulary.exact, last)
		}
	}
	return vocabulary
}

// wordIn returns the vocabulary word one string literal carries, or "".
//
// A subject prefix matches only where a subject would START — at the beginning
// of the literal or after a character no identifier carries. A prefix found in
// the middle of a longer word is a coincidence of spelling and not a subject:
// the estate's own key-value coordinates end in the same two letters a bucket
// prefix begins with, and reporting those would be reporting the alphabet.
func (v sweepVocabulary) wordIn(literal string) string {
	for _, prefix := range v.prefixes {
		at := 0
		for {
			offset := strings.Index(literal[at:], prefix)
			if offset < 0 {
				break
			}
			start := at + offset
			if start == 0 || !isIdentifierByte(literal[start-1]) {
				return prefix
			}
			at = start + 1
		}
	}
	for _, verb := range v.verbs {
		if literal == verb ||
			strings.HasPrefix(literal, verb+" ") ||
			strings.HasPrefix(literal, verb+`\r\n`) {
			return verb
		}
	}
	for _, word := range v.exact {
		if literal == word {
			return word
		}
	}
	return ""
}

func armFootprint(repo string) (int, int, error) {
	hits, used, err := sweep(repo, sweptRoots)
	if err != nil {
		return 0, 0, fmt.Errorf("%s: %w", reasonFootprint, err)
	}
	if len(hits) != 0 {
		report := &strings.Builder{}
		fmt.Fprintf(report, "%s\n", reasonFootprint)
		for _, hit := range hits {
			fmt.Fprintf(report, "  %s:%d carries %q as %q\n", hit.file, hit.line, hit.word, hit.text)
		}
		return 0, 0, fmt.Errorf("%s", report.String())
	}
	unused := make([]string, 0)
	for index, allowed := range allowances {
		if !used[index] {
			unused = append(unused, fmt.Sprintf("%s / %s", allowed.file, allowed.word))
		}
	}
	if len(unused) != 0 {
		return 0, 0, fmt.Errorf(
			"%s: these allowances match nothing and are therefore claims nobody checks: %s",
			reasonFootprint, strings.Join(unused, ", "),
		)
	}
	swept, err := countSwept(repo, sweptRoots)
	if err != nil {
		return 0, 0, err
	}
	fmt.Printf(
		"arm v: %d source files swept for %d verbs, %d subject families and %d names;"+
			" %d exempt transcription paths, %d declared allowances, 0 unlawful hits\n",
		swept, len(daemon.ProtocolVerbs), len(buildVocabulary().prefixes),
		len(buildVocabulary().exact), len(exemptPaths), len(allowances),
	)
	return swept, len(allowances), nil
}

// sweep reads every file under the roots and reports the unlawful hits.
//
// The extra roots parameter is what the arm-v control uses: it plants one bare
// literal in a tree of its own and sweeps it, so the control refutes the arm
// without editing a file the estate ships.
func sweep(repo string, roots []sweptRoot) ([]footprintHit, map[int]bool, error) {
	vocabulary := buildVocabulary()
	hits := make([]footprintHit, 0)
	used := map[int]bool{}
	for _, root := range roots {
		base := filepath.Join(repo, filepath.FromSlash(root.path))
		if _, err := os.Stat(base); err != nil {
			return nil, nil, fmt.Errorf("the swept root %s is not there: %w", root.path, err)
		}
		err := filepath.WalkDir(base, func(path string, entry fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if entry.IsDir() {
				if entry.Name() == "node_modules" || entry.Name() == "dist" {
					return fs.SkipDir
				}
				return nil
			}
			if filepath.Ext(path) != root.extension {
				return nil
			}
			relative, err := filepath.Rel(repo, path)
			if err != nil {
				return err
			}
			slashed := filepath.ToSlash(relative)
			for _, exempt := range exemptPaths {
				if strings.HasPrefix(slashed, exempt.prefix) {
					return nil
				}
			}
			found, err := sweepFile(path, slashed, root.extension, vocabulary)
			if err != nil {
				return err
			}
			for _, hit := range found {
				allowed := false
				for index, allowance := range allowances {
					if allowance.file == hit.file && allowance.word == hit.word {
						used[index] = true
						allowed = true
						break
					}
				}
				if !allowed {
					hits = append(hits, hit)
				}
			}
			return nil
		})
		if err != nil {
			return nil, nil, err
		}
	}
	sort.Slice(hits, func(left, right int) bool {
		if hits[left].file != hits[right].file {
			return hits[left].file < hits[right].file
		}
		return hits[left].line < hits[right].line
	})
	return hits, used, nil
}

// blankComments replaces every comment with spaces, keeping line structure.
//
// Comments are not swept, and the reason is not convenience: a wire word inside
// a doc comment is PROSE ABOUT the vendor, which is what a transcription's
// neighbours are supposed to write. What the arm looks for is a second
// STATEMENT of a word — a literal the program itself carries — and a comment
// carries nothing at run time.
//
// The blanking walks the source rather than matching a pattern, because a
// comment marker inside a string literal is not a comment and a quote inside a
// comment is not a string: a regular expression that ignored the difference
// would blind the sweep from the first URL it met.
func blankComments(source string, extension string) string {
	// The extension rides along because the blanking is language-aware BY
	// CONTRACT even though the two languages it reads happen to agree on
	// comment and string syntax today. A third language joining the swept roots
	// would change this function rather than surprise it.
	_ = extension
	out := []byte(source)
	length := len(out)
	index := 0
	blank := func(from int, to int) {
		for at := from; at < to; at++ {
			if out[at] != '\n' {
				out[at] = ' '
			}
		}
	}
	for index < length {
		switch {
		case out[index] == '/' && index+1 < length && out[index+1] == '/':
			end := index
			for end < length && out[end] != '\n' {
				end++
			}
			blank(index, end)
			index = end
		case out[index] == '/' && index+1 < length && out[index+1] == '*':
			end := index + 2
			for end+1 < length && !(out[end] == '*' && out[end+1] == '/') {
				end++
			}
			if end+1 < length {
				end += 2
			} else {
				end = length
			}
			blank(index, end)
			index = end
		case out[index] == '"' || out[index] == '\'' || out[index] == '`':
			quote := out[index]
			index++
			for index < length {
				if out[index] == '\\' && quote != '`' {
					index += 2
					continue
				}
				if out[index] == quote {
					index++
					break
				}
				if out[index] == '\n' && quote != '`' {
					break
				}
				index++
			}
		default:
			index++
		}
	}
	return string(out)
}

func sweepFile(
	path string,
	name string,
	extension string,
	vocabulary sweepVocabulary,
) ([]footprintHit, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	pattern := tsString
	if extension == ".go" {
		pattern = goString
	}
	hits := make([]footprintHit, 0)
	for index, line := range strings.Split(blankComments(string(raw), extension), "\n") {
		for _, match := range pattern.FindAllStringSubmatch(line, -1) {
			literal := ""
			for _, capture := range match[1:] {
				if capture != "" {
					literal = capture
					break
				}
			}
			if literal == "" {
				continue
			}
			word := vocabulary.wordIn(literal)
			if word == "" {
				continue
			}
			hits = append(hits, footprintHit{file: name, line: index + 1, word: word, text: literal})
		}
	}
	return hits, nil
}

func countSwept(repo string, roots []sweptRoot) (int, error) {
	count := 0
	for _, root := range roots {
		base := filepath.Join(repo, filepath.FromSlash(root.path))
		err := filepath.WalkDir(base, func(path string, entry fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if entry.IsDir() {
				if entry.Name() == "node_modules" || entry.Name() == "dist" {
					return fs.SkipDir
				}
				return nil
			}
			if filepath.Ext(path) == root.extension {
				count++
			}
			return nil
		})
		if err != nil {
			return 0, err
		}
	}
	return count, nil
}
