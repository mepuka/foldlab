package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"go/format"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"foldlab/canonical"
	"foldlab/daemon"
)

// The emitter: three committed artifacts, all derived from the one normative
// table and from the pinned vendor sources, and none of them a second reading
// of anything.
//
//  1. The digest table — one entry per region the tables cite, each the sha256
//     of that region's bytes as the pinned package ships them. It is derived
//     rather than typed because a hundred hand-copied digests are a hundred
//     chances to copy one wrong, and because a vendor that MOVED is exactly
//     what a re-derivation catches and a hand-copy hides.
//  2. The canonical rendering — the whole vocabulary as one value's canonical
//     bytes, committed so that a regeneration diffs against bytes rather than
//     against a memory.
//  3. The spine's table — a direct pass-through of the same rendering into
//     TypeScript. It is EMITTED and never read a second time from the vendor,
//     because a second reading is a second transcription and two transcriptions
//     sharing a mistake agree perfectly.

// emitPaths are the three committed artifacts, relative to the repository root.
type emitPaths struct {
	digests   string
	canonical string
	spine     string
}

func pathsFor(repo string) emitPaths {
	return emitPaths{
		digests:   filepath.Join(repo, "go", "daemon", "wirevocabularydigests.go"),
		canonical: filepath.Join(repo, "go", "daemon", "wirevocabulary.canonical.json"),
		spine:     filepath.Join(repo, "packages", "plait", "src", "internal", "wirevocabulary.ts"),
	}
}

// emitted is one fresh emission of all three artifacts, in memory.
type emitted struct {
	digests   []byte
	canonical []byte
	spine     []byte
}

func emit(repo string) (emitted, map[string]string, error) {
	roots, err := resolveVendorRoots(repo)
	if err != nil {
		return emitted{}, nil, err
	}
	digests, err := roots.digestRegions()
	if err != nil {
		return emitted{}, nil, err
	}
	rendered, err := daemon.WireVocabularyBytes(digests)
	if err != nil {
		return emitted{}, nil, err
	}
	source, err := renderDigestSource(digests)
	if err != nil {
		return emitted{}, nil, err
	}
	return emitted{
		digests:   source,
		canonical: append(append([]byte{}, rendered...), '\n'),
		spine:     renderSpineSource(digests),
	}, digests, nil
}

func (e emitted) write(paths emitPaths) error {
	for _, pair := range []struct {
		path string
		body []byte
	}{
		{paths.digests, e.digests},
		{paths.canonical, e.canonical},
		{paths.spine, e.spine},
	} {
		if err := os.WriteFile(pair.path, pair.body, 0o644); err != nil {
			return err
		}
	}
	return nil
}

const digestHeader = `package daemon

// The wire vocabulary's provenance digests, derived rather than typed.
//
// One entry per source region the five transcription tables cite, each the
// sha256 of that region's bytes as the pinned vendor package ships them. The
// table is EMITTED from the installed sources and committed, so that a fresh
// emission diffs against committed bytes: a vendor whose declaration moved, a
// row whose region was mistyped, and a checkout installing a different version
// all show up as a diff rather than as a table that quietly still renders.
//
// Nothing here is hand-maintained. A hand edit is overwritten by the next
// emission and refused by the wall in between.

// WireDigests is every cited region's digest, keyed by the region's own name.
var WireDigests = map[string]string{
`

func renderDigestSource(digests map[string]string) ([]byte, error) {
	keys := daemon.WireDigestKeys()
	body := &bytes.Buffer{}
	body.WriteString(digestHeader)
	for _, key := range keys {
		body.WriteString("\t")
		body.Write(quoteSource(key))
		body.WriteString(": \"")
		body.WriteString(digests[key])
		body.WriteString("\",\n")
	}
	body.WriteString("}\n")
	return format.Source(body.Bytes())
}

const spineHeader = `/**
 * Plane: internal — private adapters, housed flat.
 * Seam: truth — the vocabulary every sentence speaks.
 *
 * @module
 */

/**
 * The wire vocabulary, passed through from its normative home.
 *
 * **This module is emitted, not written.** Its rows are the substrate daemon's
 * own transcription tables rendered canonically and carried across the language
 * boundary unchanged: same rows, same order, same spelling. It reads no vendor
 * source of its own, because a second reading would be a second transcription,
 * and two transcriptions sharing a mistake agree perfectly. The parity wall
 * compares the two renderings byte for byte and re-derives every row's
 * provenance digest from the pinned vendor sources as installed, so what the
 * two languages agree on is anchored outside both of them.
 *
 * Hand edits do not survive: the next emission overwrites them, and until then
 * the wall refuses a file whose bytes differ from a fresh emission.
 *
 * **What a row carries.** Its wire word as the pinned vendor states it; the
 * shape of what the word carries; the provenance pin — vendor package, version,
 * and the digest of the exact source region transcribed; the estate's
 * classification of the row under the three wire shapes; and, on every row
 * classified as chatter, the promotion note saying what such a message may
 * accelerate and what it may never decide.
 *
 * **Rows the estate never reaches are still rows.** A word the pinned vendor
 * declares and this posture never speaks is carried and marked
 * declared-but-unused. Omission is how a table starts lying.
 *
 * Staged debt, stated rather than absorbed: this vocabulary is hand-carried
 * transcription owing the corpus's substrate-vocabulary emitter group, which
 * the emitter does not yet mint. It is transcription with provenance until that
 * group exists, never a twin of one.
 */

/** Which way a wire word travels. */
export type WireDirection = "client-to-server" | "server-to-client" | "either"

/** The estate's classification of a row under the three wire shapes. */
export type WireShape = "journal-fact" | "commitment-register" | "ephemeral-chatter"

/** Whether the estate speaks or hears a row at its current posture. */
export type WireUse = "spoken" | "declared-but-unused"

/** One row's provenance: the pinned package, its version, and the region digest. */
export interface WirePin {
  readonly package: string
  readonly version: string
  readonly digest: string
}

/** One transcribed payload field of one status event. */
export interface WireStatusField {
  readonly name: string
  readonly sort: string
  readonly optional: boolean
}
`

// renderSpineSource emits the spine's pass-through module.
//
// The five groups are emitted as five named values and the whole vocabulary is
// COMPOSED from them rather than restated, so the rendered value is a function
// of the five tables in this language exactly as it is in the other.
func renderSpineSource(digests map[string]string) []byte {
	body := &bytes.Buffer{}
	body.WriteString(spineHeader)

	value := daemon.WireVocabularyValue(digests)
	groups := value["groups"].([]any)
	names := []struct {
		constant string
		doc      string
	}{
		{"WIRE_PROTOCOL_VERBS", "Every word the core protocol carries, in the pinned sources' own order."},
		{"WIRE_API_SUBJECTS", "The JetStream API and key-value subject surface, transcribed whole."},
		{"WIRE_SYSTEM_SUBJECTS", "The system-account event subject surface, transcribed in full."},
		{"WIRE_STATUS_EVENTS", "The client status event vocabulary, in the pinned client's declaration order."},
		{"WIRE_LIFECYCLE_ENTRIES", "The substrate's lifecycle surface, with each signature as the pinned source states it."},
	}
	// Each group's rows are followed by an index into THAT ARRAY, keyed by the
	// vendor's own identifier for the declaration. The index holds references
	// rather than copies, so it is a way into the table and never a second
	// statement of it — and a consumer reaching a row by the vendor's
	// identifier never has to spell the row's own wire word to find it, which
	// is exactly the second statement the footprint sweep refuses.
	indexKeys := []string{"declaration", "declaration", "declaration", "declaration", "entry"}
	indexNames := []string{
		"WIRE_VERB_BY_DECLARATION",
		"WIRE_API_SUBJECT_BY_DECLARATION",
		"WIRE_SYSTEM_SUBJECT_BY_DECLARATION",
		"WIRE_STATUS_BY_DECLARATION",
		"WIRE_LIFECYCLE_BY_ENTRY",
	}
	labels := make([]string, 0, len(groups))
	for index, raw := range groups {
		group := raw.(map[string]any)
		labels = append(labels, group["group"].(string))
		rows := group["rows"].([]any)
		fmt.Fprintf(body, "\n/** %s */\nexport const %s = ", names[index].doc, names[index].constant)
		writeTSValue(body, group["rows"], 0)
		body.WriteString(" as const\n")

		fmt.Fprintf(
			body,
			"\n/** The same rows, reached by the vendor's own identifier rather than by their wire word. */\nexport const %s = {\n",
			indexNames[index],
		)
		for position, row := range rows {
			key := row.(map[string]any)[indexKeys[index]].(string)
			body.WriteString("  ")
			body.Write(quoteSource(key))
			fmt.Fprintf(body, ": %s[%d],\n", names[index].constant, position)
		}
		body.WriteString("} as const\n")
	}

	body.WriteString("\n/**\n * The whole vocabulary as one value, composed from the five tables above.\n *\n")
	body.WriteString(" * The composition is what the parity wall renders and compares: a second\n")
	body.WriteString(" * statement of the rows here would be a twin of the five tables rather than\n")
	body.WriteString(" * a rendering of them.\n */\nexport const WIRE_VOCABULARY = {\n")
	fmt.Fprintf(body, "  v: %d,\n", 0)
	body.WriteString("  kind: \"substrate-wire-vocabulary\",\n  groups: [\n")
	for index, label := range labels {
		fmt.Fprintf(body, "    { group: %q, rows: %s },\n", label, names[index].constant)
	}
	body.WriteString("  ],\n} as const\n")
	return body.Bytes()
}

// quoteSource writes one string as a source literal both languages read the
// same way.
//
// The encoder's HTML escaping is off: a transcribed shape carrying an angle
// bracket is a shape a reader has to be able to read, and an escape sequence
// standing in for a bracket would make the emitted table harder to check
// against the vendor than the vendor is to read.
func quoteSource(value string) []byte {
	buffer := &bytes.Buffer{}
	encoder := json.NewEncoder(buffer)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		panic(err)
	}
	return bytes.TrimRight(buffer.Bytes(), "\n")
}

// writeTSValue writes one canonical value as TypeScript source.
//
// Object keys are written in the same sorted order the canonical rendering uses,
// so reading the emitted module and reading the canonical bytes put a reader at
// the same place in the table.
func writeTSValue(out *bytes.Buffer, value any, depth int) {
	pad := strings.Repeat("  ", depth+1)
	closePad := strings.Repeat("  ", depth)
	switch typed := value.(type) {
	case []any:
		if len(typed) == 0 {
			out.WriteString("[]")
			return
		}
		out.WriteString("[\n")
		for _, item := range typed {
			out.WriteString(pad)
			writeTSValue(out, item, depth+1)
			out.WriteString(",\n")
		}
		out.WriteString(closePad)
		out.WriteString("]")
	case map[string]any:
		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		out.WriteString("{\n")
		for _, key := range keys {
			out.WriteString(pad)
			out.WriteString(key)
			out.WriteString(": ")
			writeTSValue(out, typed[key], depth+1)
			out.WriteString(",\n")
		}
		out.WriteString(closePad)
		out.WriteString("}")
	case string:
		out.Write(quoteSource(typed))
	case bool:
		if typed {
			out.WriteString("true")
		} else {
			out.WriteString("false")
		}
	case float64:
		encoded, err := canonical.CanonicalizeValue(typed)
		if err != nil {
			panic(err)
		}
		out.Write(encoded)
	default:
		panic(fmt.Sprintf("the rendering carries a sort the emitter has no spelling for: %T", value))
	}
}
