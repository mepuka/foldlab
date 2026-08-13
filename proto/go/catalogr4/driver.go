package catalogr4

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/nats-io/nats.go"

	"foldlab/canonical"
	"foldlab/proto/protod"
)

const (
	requestTimeout  = 20 * time.Second
	dataJournalName = "catalog_r4_data"
)

type MutationKind string

const (
	MutateCatalog MutationKind = "catalog"
	MutateMirror  MutationKind = "mirror"
	MutateData    MutationKind = "data"
	MutateResolve MutationKind = "resolve"
)

type Mutation struct {
	Step int          `json:"step"`
	Kind MutationKind `json:"kind"`
}

type ReplayOptions struct {
	Mutation Mutation
}

type Divergence struct {
	Step     int         `json:"step"`
	Action   Action      `json:"action"`
	Detail   string      `json:"detail"`
	Expected Observation `json:"expected"`
	Observed Observation `json:"observed"`
}

type ReplayResult struct {
	Steps      int         `json:"steps"`
	Divergence *Divergence `json:"divergence,omitempty"`
}

// Observation is exactly what the task permits the harness to inspect:
// authority catalog journals, data journals, and pure resolve verdicts. The
// mirror field records the explicitly documented harness substitute because
// protod has no replica role yet.
type Observation struct {
	Catalog    [R2Daemons][]int            `json:"catalog"`
	Mirror     [R2Daemons][R2Daemons][]int `json:"mirror"`
	Data       [R2Daemons][]int            `json:"data"`
	Resolvable [R2Daemons][]int            `json:"resolvable"`
}

type valueSpec struct {
	Structure any
	Digest    string
}

var r2Values = mustValueSpecs()

func mustValueSpecs() [R2Values]valueSpec {
	structures := [R2Values]any{
		map[string]any{"k": "string"},
		map[string]any{"k": "int"},
		map[string]any{"k": "list", "of": map[string]any{"k": "bool"}},
	}
	var specs [R2Values]valueSpec
	for index, structure := range structures {
		raw, err := json.Marshal(structure)
		if err != nil {
			panic(err)
		}
		encoded, err := canonical.Canonicalize(raw)
		if err != nil {
			panic(err)
		}
		specs[index] = valueSpec{Structure: structure, Digest: canonical.DigestHex(encoded)}
	}
	return specs
}

type daemonBinding struct {
	daemon *protod.Daemon
	conn   *nats.Conn
	store  string
}

type replayDriver struct {
	daemons [R2Daemons]daemonBinding
	pending [R2Creators]Action
	// A mirror advance is substituted by recreating the origin structure at
	// the destination through type.create. If that creates an entry, it is
	// known harness material and is projected out of the authority catalog.
	substituteFacts   [R2Daemons]map[int]bool
	substituteMirrors [R2Daemons][R2Daemons][]int
}

func acquireDriver(ctx context.Context) (*replayDriver, error) {
	driver := &replayDriver{}
	for index := 0; index < R2Daemons; index++ {
		driver.substituteFacts[index] = map[int]bool{}
		store, err := os.MkdirTemp("", fmt.Sprintf("foldlab-catalog-r4-d%d-", index+1))
		if err != nil {
			driver.release()
			return nil, err
		}
		daemon, err := protod.Acquire(ctx, protod.Options{StoreDir: store, Listen: "127.0.0.1:0"})
		if err != nil {
			_ = os.RemoveAll(store)
			driver.release()
			return nil, fmt.Errorf("acquire daemon %d: %w", index+1, err)
		}
		conn, err := nats.Connect(daemon.URL())
		if err != nil {
			daemon.Release()
			_ = os.RemoveAll(store)
			driver.release()
			return nil, fmt.Errorf("connect daemon %d: %w", index+1, err)
		}
		driver.daemons[index] = daemonBinding{daemon: daemon, conn: conn, store: store}
	}
	return driver, nil
}

func (d *replayDriver) release() {
	for index := len(d.daemons) - 1; index >= 0; index-- {
		binding := &d.daemons[index]
		if binding.conn != nil {
			binding.conn.Close()
			binding.conn = nil
		}
		if binding.daemon != nil {
			binding.daemon.Release()
			binding.daemon = nil
		}
		if binding.store != "" {
			_ = os.RemoveAll(binding.store)
			binding.store = ""
		}
	}
}

func (d *replayDriver) request(daemon int, subject string, body any) (map[string]any, error) {
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	reply, err := d.daemons[daemon-1].conn.Request(subject, raw, requestTimeout)
	if err != nil {
		return nil, err
	}
	var decoded map[string]any
	if err := json.Unmarshal(reply.Data, &decoded); err != nil {
		return nil, fmt.Errorf("decode reply on %s: %w", subject, err)
	}
	return decoded, nil
}

func Replay(ctx context.Context, schedule Schedule, options ReplayOptions) (ReplayResult, error) {
	trace, err := Trace(schedule)
	if err != nil {
		return ReplayResult{}, err
	}
	driver, err := acquireDriver(ctx)
	if err != nil {
		return ReplayResult{}, err
	}
	defer driver.release()

	result := ReplayResult{}
	for index, step := range trace {
		if detail, err := driver.drive(step); err != nil {
			return result, fmt.Errorf("step %d %s: %w", index+1, step.Action, err)
		} else if detail != "" {
			expected := observationFromState(step.After)
			observed, extractErr := driver.extract()
			if extractErr != nil {
				detail += "; state extraction also refused the evidence: " + extractErr.Error()
			}
			result.Steps = index + 1
			result.Divergence = &Divergence{
				Step: index, Action: step.Action, Detail: detail, Expected: expected, Observed: observed,
			}
			return result, nil
		}

		expected := observationFromState(step.After)
		if options.Mutation.Kind != "" && options.Mutation.Step == index {
			mutateObservation(&expected, options.Mutation.Kind)
		}
		observed, err := driver.extract()
		if err != nil {
			return result, fmt.Errorf("extract after step %d %s: %w", index+1, step.Action, err)
		}
		if detail := compareObservations(expected, observed); detail != "" {
			result.Steps = index + 1
			result.Divergence = &Divergence{
				Step: index, Action: step.Action, Detail: detail, Expected: expected, Observed: observed,
			}
			return result, nil
		}
		result.Steps = index + 1
	}
	return result, nil
}

func (d *replayDriver) drive(step TraceStep) (string, error) {
	action := step.Action
	switch action.Kind {
	case CreateAtomic:
		reply, err := d.create(action.Daemon, action.Value,
			fmt.Sprintf("catalog-r4-creator-%d", action.Creator))
		if err != nil {
			return "", err
		}
		if reply["ok"] != true {
			return fmt.Sprintf("CreateAtomic returned a refusal: %s", compactJSON(reply)), nil
		}
		if detail := digestReplyMismatch(reply, action.Value); detail != "" {
			return detail, nil
		}
		created, _ := reply["created"].(bool)
		wantCreated := step.Outcome.Branch == "CreateAtomic.created"
		if created != wantCreated {
			return fmt.Sprintf("modeled %s, but type.create returned created:%t for value %d",
				step.Outcome.Branch, created, action.Value), nil
		}
		return "", nil

	case CreateBegin:
		if step.Outcome.Branch == "CreateBegin.pending" {
			d.pending[action.Creator-1] = action
			return "", nil
		}
		reply, err := d.create(action.Daemon, action.Value, "catalog-r4-converged")
		if err != nil {
			return "", err
		}
		if reply["ok"] != true || reply["created"] != false {
			return fmt.Sprintf("CreateBegin convergence returned %s, want ok:true created:false", compactJSON(reply)), nil
		}
		if detail := digestReplyMismatch(reply, action.Value); detail != "" {
			return detail, nil
		}
		return "", nil

	case CreateFinish:
		pending := d.pending[action.Creator-1]
		if pending.Kind != CreateBegin {
			return "", fmt.Errorf("no staged CreateBegin for creator %d", action.Creator)
		}
		d.pending[action.Creator-1] = Action{}
		reply, err := d.create(pending.Daemon, pending.Value, fmt.Sprintf("catalog-r4-creator-%d", action.Creator))
		if err != nil {
			return "", err
		}
		if reply["ok"] != true {
			return fmt.Sprintf("CreateFinish returned a refusal: %s", compactJSON(reply)), nil
		}
		if detail := digestReplyMismatch(reply, pending.Value); detail != "" {
			return detail, nil
		}
		created, _ := reply["created"].(bool)
		wantCreated := step.Outcome.Branch == "CreateFinish.appended"
		if created != wantCreated {
			return fmt.Sprintf(
				"modeled %s, but atomic type.create returned created:%t for value %d; "+
					"the wire surface did not preserve the Begin-time absence snapshot",
				step.Outcome.Branch, created, pending.Value), nil
		}
		return "", nil

	case MirrorAdvance:
		mirror := step.After.Mirror[action.Daemon-1][action.Origin-1]
		value := mirror[len(mirror)-1].Value
		reply, err := d.create(action.Daemon, value, fmt.Sprintf("catalog-r4-mirror-of-%d", action.Origin))
		if err != nil {
			return "", err
		}
		if reply["ok"] != true {
			return fmt.Sprintf("mirror substitute was refused: %s", compactJSON(reply)), nil
		}
		if detail := digestReplyMismatch(reply, value); detail != "" {
			return detail, nil
		}
		if created, _ := reply["created"].(bool); created {
			d.substituteFacts[action.Daemon-1][value] = true
		}
		d.substituteMirrors[action.Daemon-1][action.Origin-1] = append(
			d.substituteMirrors[action.Daemon-1][action.Origin-1], value)
		return "", nil

	case Publish:
		spec := r2Values[action.Value-1]
		reply, err := d.request(action.Daemon, "flb.ing."+dataJournalName, map[string]any{
			"type":    spec.Digest,
			"payload": map[string]any{"catalogR4Value": action.Value},
		})
		if err != nil {
			return "", err
		}
		if step.Outcome.Branch == "Publish.admitted" {
			if reply["ok"] != true || reply["admitted"] != true {
				return fmt.Sprintf("model admitted publish, protod returned %s", compactJSON(reply)), nil
			}
			return "", nil
		}
		if refusalKind(reply) != "unknown-identity" {
			return fmt.Sprintf("model refused unknown identity, protod returned %s", compactJSON(reply)), nil
		}
		return "", nil
	default:
		return "", fmt.Errorf("unsupported action %s", action)
	}
}

func (d *replayDriver) create(daemon, value int, submitter string) (map[string]any, error) {
	spec := r2Values[value-1]
	return d.request(daemon, "flb.req.type.create", map[string]any{
		"structure": spec.Structure,
		"submitter": submitter,
	})
}

func observationFromState(state State) Observation {
	var observed Observation
	for daemon := 0; daemon < R2Daemons; daemon++ {
		for _, fact := range state.Catalog[daemon] {
			observed.Catalog[daemon] = append(observed.Catalog[daemon], fact.Value)
		}
		observed.Data[daemon] = append(observed.Data[daemon], state.Data[daemon]...)
		observed.Resolvable[daemon] = state.Resolvable(daemon + 1)
		for origin := 0; origin < R2Daemons; origin++ {
			for _, fact := range state.Mirror[daemon][origin] {
				observed.Mirror[daemon][origin] = append(observed.Mirror[daemon][origin], fact.Value)
			}
		}
	}
	return observed
}

func (d *replayDriver) extract() (Observation, error) {
	var observed Observation
	for daemon := 1; daemon <= R2Daemons; daemon++ {
		catalogValues, err := d.readCatalog(daemon)
		if err != nil {
			return Observation{}, err
		}
		for _, value := range catalogValues {
			if d.substituteFacts[daemon-1][value] {
				continue
			}
			observed.Catalog[daemon-1] = append(observed.Catalog[daemon-1], value)
		}
		observed.Data[daemon-1], err = d.readData(daemon)
		if err != nil {
			return Observation{}, err
		}
		observed.Resolvable[daemon-1], err = d.readResolvable(daemon)
		if err != nil {
			return Observation{}, err
		}
		for origin := 0; origin < R2Daemons; origin++ {
			observed.Mirror[daemon-1][origin] = append(
				[]int(nil), d.substituteMirrors[daemon-1][origin]...)
		}
	}
	return observed, nil
}

func (d *replayDriver) readCatalog(daemon int) ([]int, error) {
	reply, err := d.request(daemon, "flb.req.journal.read", map[string]any{"journal": "catalog"})
	if err != nil {
		return nil, err
	}
	entries, err := verifiedPayloads(reply, "catalog")
	if err != nil {
		return nil, err
	}
	values := make([]int, 0, len(entries))
	for index, payload := range entries {
		var fact struct {
			Digest    string `json:"digest"`
			Structure any    `json:"structure"`
		}
		if err := json.Unmarshal([]byte(payload), &fact); err != nil {
			return nil, fmt.Errorf("catalog entry %d is not a fact: %w", index, err)
		}
		value := valueForDigest(fact.Digest)
		if value == 0 {
			return nil, fmt.Errorf("catalog entry %d has unexpected digest %q", index, fact.Digest)
		}
		raw, err := json.Marshal(fact.Structure)
		if err != nil {
			return nil, err
		}
		encoded, err := canonical.Canonicalize(raw)
		if err != nil {
			return nil, err
		}
		if derived := canonical.DigestHex(encoded); derived != fact.Digest {
			return nil, fmt.Errorf("catalog entry %d asserts %s but its structure derives %s", index, fact.Digest, derived)
		}
		values = append(values, value)
	}
	return values, nil
}

func (d *replayDriver) readData(daemon int) ([]int, error) {
	reply, err := d.request(daemon, "flb.req.journal.read", map[string]any{"journal": dataJournalName})
	if err != nil {
		return nil, err
	}
	if refusalKind(reply) == "unknown-journal" {
		return nil, nil
	}
	entries, err := verifiedPayloads(reply, dataJournalName)
	if err != nil {
		return nil, err
	}
	values := make([]int, 0, len(entries))
	for index, payload := range entries {
		var frame struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal([]byte(payload), &frame); err != nil {
			return nil, fmt.Errorf("data entry %d is not a frame: %w", index, err)
		}
		value := valueForDigest(frame.Type)
		if value == 0 {
			return nil, fmt.Errorf("data entry %d claims unexpected digest %q", index, frame.Type)
		}
		values = append(values, value)
	}
	return values, nil
}

func (d *replayDriver) readResolvable(daemon int) ([]int, error) {
	hole := map[string]any{"k": "hole"}
	reply, err := d.request(daemon, "flb.req.type.fill", map[string]any{
		"partial": hole,
		"path":    []any{},
		"subtree": hole,
	})
	if err != nil {
		return nil, err
	}
	if reply["ok"] != true {
		return nil, fmt.Errorf("pure resolve probe refused: %s", compactJSON(reply))
	}
	frontier, ok := reply["frontier"].([]any)
	if !ok || len(frontier) != 1 {
		return nil, fmt.Errorf("resolve probe returned an unexpected frontier: %s", compactJSON(reply))
	}
	entry, ok := frontier[0].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("resolve frontier entry is not an object: %s", compactJSON(reply))
	}
	refs, ok := entry["refs"].([]any)
	if !ok {
		return nil, fmt.Errorf("resolve frontier refs are not an array: %s", compactJSON(reply))
	}
	values := make([]int, 0, len(refs))
	for _, raw := range refs {
		digest, ok := raw.(string)
		if !ok {
			return nil, fmt.Errorf("resolve digest is not a string: %v", raw)
		}
		value := valueForDigest(digest)
		if value == 0 {
			return nil, fmt.Errorf("resolve probe returned unexpected digest %q", digest)
		}
		values = append(values, value)
	}
	sort.Ints(values)
	return values, nil
}

func verifiedPayloads(reply map[string]any, journalName string) ([]string, error) {
	if reply["ok"] != true {
		return nil, fmt.Errorf("read %s was refused: %s", journalName, compactJSON(reply))
	}
	rawEntries, ok := reply["entries"].([]any)
	if !ok {
		return nil, fmt.Errorf("read %s entries are not an array", journalName)
	}
	payloads := make([]string, len(rawEntries))
	wantPrev := canonical.Genesis
	for index, raw := range rawEntries {
		entry, ok := raw.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("read %s entry %d is not an object", journalName, index)
		}
		seq, ok := entry["seq"].(float64)
		if !ok || seq != float64(index) {
			return nil, fmt.Errorf("read %s entry %d has seq %v", journalName, index, entry["seq"])
		}
		if entry["prev"] != wantPrev {
			return nil, fmt.Errorf("read %s entry %d has prev %v, want %s", journalName, index, entry["prev"], wantPrev)
		}
		payload, ok := entry["payload"].(string)
		if !ok {
			return nil, fmt.Errorf("read %s entry %d payload is not a string", journalName, index)
		}
		payloads[index] = payload
		digest, err := canonical.EntryDigest(canonical.ChainEntry{Seq: int64(index), Prev: wantPrev, Payload: payload})
		if err != nil {
			return nil, fmt.Errorf("read %s entry %d is outside the canonical domain: %w", journalName, index, err)
		}
		wantPrev = digest
	}
	if reply["head"] != wantPrev {
		return nil, fmt.Errorf("read %s claims head %v, recomputed %s", journalName, reply["head"], wantPrev)
	}
	return payloads, nil
}

func valueForDigest(digest string) int {
	for index, spec := range r2Values {
		if spec.Digest == digest {
			return index + 1
		}
	}
	return 0
}

func refusalKind(reply map[string]any) string {
	refusal, _ := reply["refusal"].(map[string]any)
	kind, _ := refusal["kind"].(string)
	return kind
}

func digestReplyMismatch(reply map[string]any, value int) string {
	want := r2Values[value-1].Digest
	got, _ := reply["digest"].(string)
	if got == want {
		return ""
	}
	return fmt.Sprintf("type.create returned digest %q for value %d, model-derived digest is %q", got, value, want)
}

func compactJSON(value any) string {
	raw, _ := json.Marshal(value)
	return string(raw)
}

func mutateObservation(observation *Observation, kind MutationKind) {
	switch kind {
	case MutateCatalog:
		observation.Catalog[0] = toggleValue(observation.Catalog[0])
	case MutateMirror:
		observation.Mirror[0][1] = toggleValue(observation.Mirror[0][1])
	case MutateData:
		observation.Data[0] = toggleValue(observation.Data[0])
	case MutateResolve:
		observation.Resolvable[0] = toggleValue(observation.Resolvable[0])
	default:
		panic(fmt.Sprintf("unknown mutation kind %q", kind))
	}
}

func toggleValue(values []int) []int {
	if len(values) > 0 {
		return append([]int(nil), values[:len(values)-1]...)
	}
	return []int{1}
}

func compareObservations(expected, observed Observation) string {
	for daemon := 0; daemon < R2Daemons; daemon++ {
		if !equalInts(expected.Catalog[daemon], observed.Catalog[daemon]) {
			return fmt.Sprintf("daemon %d catalog journal = %v, model says %v",
				daemon+1, observed.Catalog[daemon], expected.Catalog[daemon])
		}
		if !equalInts(expected.Data[daemon], observed.Data[daemon]) {
			return fmt.Sprintf("daemon %d data journal = %v, model says %v",
				daemon+1, observed.Data[daemon], expected.Data[daemon])
		}
		if !equalInts(expected.Resolvable[daemon], observed.Resolvable[daemon]) {
			return fmt.Sprintf("daemon %d resolve verdicts = %v, model says %v",
				daemon+1, observed.Resolvable[daemon], expected.Resolvable[daemon])
		}
		for origin := 0; origin < R2Daemons; origin++ {
			if !equalInts(expected.Mirror[daemon][origin], observed.Mirror[daemon][origin]) {
				return fmt.Sprintf("daemon %d mirror substitute for origin %d = %v, model says %v",
					daemon+1, origin+1, observed.Mirror[daemon][origin], expected.Mirror[daemon][origin])
			}
		}
	}
	return ""
}

func equalInts(left, right []int) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index] != right[index] {
			return false
		}
	}
	return true
}

// Minimize greedily removes actions while preserving an enabled schedule and
// a divergence. It is deterministic because removals are attempted in source
// order and every candidate gets a fresh pair of daemons.
func Minimize(ctx context.Context, schedule Schedule, options ReplayOptions) (Schedule, *Divergence, error) {
	current := append(Schedule(nil), schedule...)
	for changed := true; changed; {
		changed = false
		for index := range current {
			candidate := append(Schedule(nil), current[:index]...)
			candidate = append(candidate, current[index+1:]...)
			if _, err := Trace(candidate); err != nil {
				continue
			}
			result, err := Replay(ctx, candidate, options)
			if err != nil {
				return nil, nil, err
			}
			if result.Divergence == nil {
				continue
			}
			current = candidate
			changed = true
			break
		}
	}
	result, err := Replay(ctx, current, options)
	if err != nil {
		return nil, nil, err
	}
	return current, result.Divergence, nil
}

func FormatSchedule(schedule Schedule) string {
	parts := make([]string, len(schedule))
	for index, action := range schedule {
		parts[index] = action.String()
	}
	return strings.Join(parts, "\n")
}
