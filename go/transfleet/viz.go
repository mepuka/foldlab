package transfleet

import (
	"fmt"
	"html"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"foldlab/gauntlet"
)

var workerColors = []string{
	"#2563eb",
	"#dc2626",
	"#16a34a",
	"#9333ea",
	"#ea580c",
	"#0891b2",
	"#ca8a04",
	"#db2777",
}

// RenderSVG has one input—the exported bundle—and derives every mark
// from its manifest and journal files.
func RenderSVG(bundle string) error {
	if _, err := gauntlet.VerifyTransposition(bundle, gauntlet.RGA); err != nil {
		return fmt.Errorf("refuse SVG source bundle: %w", err)
	}
	manifestBytes, err := os.ReadFile(filepath.Join(bundle, "manifest.json"))
	if err != nil {
		return err
	}
	var manifest Manifest
	if err := strictDecode(manifestBytes, &manifest); err != nil {
		return err
	}
	lines, err := readLines(filepath.Join(bundle, "journal.ndjson"))
	if err != nil {
		return err
	}
	states := make(map[State]Payload, len(lines))
	workers := make(map[string]bool)
	for position, line := range lines {
		var wire journalWire
		if err := strictDecode(line, &wire); err != nil {
			return fmt.Errorf("decode SVG journal line %d: %w", position, err)
		}
		payload, _, err := decodePayload(wire.Payload, manifest.Salt)
		if err != nil {
			return err
		}
		states[payload.State] = payload
		workers[payload.Worker] = true
	}
	orderedStates := make([]State, 0, len(states))
	for state := range states {
		orderedStates = append(orderedStates, state)
	}
	sort.Slice(orderedStates, func(i, j int) bool {
		if orderedStates[i].Y != orderedStates[j].Y {
			return orderedStates[i].Y < orderedStates[j].Y
		}
		return orderedStates[i].X < orderedStates[j].X
	})

	workerList := make([]string, 0, len(workers))
	for worker := range workers {
		workerList = append(workerList, worker)
	}
	sort.Strings(workerList)
	colors := make(map[string]string, len(workerList))
	for index, worker := range workerList {
		colors[worker] = workerColors[index%len(workerColors)]
	}

	const (
		margin     = 42
		spacing    = 17
		legendSize = 190
	)
	gridSize := manifest.N * spacing
	width := margin*2 + gridSize + legendSize
	height := margin*2 + gridSize
	point := func(state State) (int, int) {
		return margin + state.X*spacing, margin + (manifest.N-state.Y)*spacing
	}

	var svg strings.Builder
	fmt.Fprintf(
		&svg,
		`<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">`,
		width,
		height,
		width,
		height,
	)
	svg.WriteString(`<rect width="100%" height="100%" fill="#fafafa"/>`)
	svg.WriteString(`<g stroke="#d1d5db" stroke-width="1">`)
	for _, state := range orderedStates {
		x, y := point(state)
		if state.X > 0 {
			px, py := point(State{X: state.X - 1, Y: state.Y})
			fmt.Fprintf(&svg, `<line x1="%d" y1="%d" x2="%d" y2="%d"/>`, px, py, x, y)
		}
		if state.Y > 0 {
			px, py := point(State{X: state.X, Y: state.Y - 1})
			fmt.Fprintf(&svg, `<line x1="%d" y1="%d" x2="%d" y2="%d"/>`, px, py, x, y)
		}
	}
	svg.WriteString(`</g><g stroke="#111827" stroke-width="0.65">`)
	for _, state := range orderedStates {
		payload := states[state]
		x, y := point(state)
		fmt.Fprintf(
			&svg,
			`<circle cx="%d" cy="%d" r="5" fill="%s"><title>(%d,%d) %s</title></circle>`,
			x,
			y,
			colors[payload.Worker],
			state.X,
			state.Y,
			html.EscapeString(payload.Worker),
		)
	}
	svg.WriteString(`</g>`)
	legendX := margin + gridSize + 32
	fmt.Fprintf(
		&svg,
		`<text x="%d" y="%d" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="#111827">L(%d) expansions</text>`,
		legendX,
		margin,
		manifest.N,
	)
	for index, worker := range workerList {
		y := margin + 30 + index*25
		fmt.Fprintf(&svg, `<rect x="%d" y="%d" width="14" height="14" rx="2" fill="%s"/>`, legendX, y-11, colors[worker])
		fmt.Fprintf(
			&svg,
			`<text x="%d" y="%d" font-family="system-ui,sans-serif" font-size="13" fill="#374151">%s</text>`,
			legendX+22,
			y,
			html.EscapeString(worker),
		)
	}
	svg.WriteString(`</svg>`)
	return os.WriteFile(filepath.Join(bundle, "viz", "lattice.svg"), []byte(svg.String()), 0o644)
}
