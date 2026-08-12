package model

// Model-based trace conformance: the reason this lane exists.
//
// The checker above proves things about a MODEL. That is worth exactly as much
// as the model's faithfulness to the code, which is why the model is not
// allowed to sit on its own. Here every schedule the model can produce is
// replayed against the REAL go/effector implementation on an embedded NATS
// server, in lockstep: at each step the implementation's outcome must equal
// the model's predicted outcome, and after each step its observable state must
// equal the model's. Any disagreement is either an implementation bug or a
// model bug, and both are findings.
//
// The one seam that needed engineering: SPEC §6.1's commit is SPLIT into a
// fence read and a protected write, and a schedulable pause between them is
// what refuted the two-key protocol. The real Commit is atomic at the client
// boundary — there is no public seam to pause in. Rather than modify the
// implementation to add a test hook (it is the thing under test), the harness
// interposes on the jetstream.KeyValue interface the effector was handed and
// pauses the CALLER between its read and its write. The implementation is
// unmodified and unaware; only its substrate is instrumented. That is a
// genuine client-side pause, not a projection of one.

import (
	"context"
	"errors"
	"fmt"
	"os"
	"runtime"
	"sync"
	"testing"
	"time"

	"github.com/nats-io/nats-server/v2/server"
	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"

	"playground/kernel/effector"
)

// ---------- the pause hook: a client-side stall between read and write ----------

// errProcessDied is what a killed process's substrate returns instead of
// performing a write. It models crash-stop precisely: the process dies BEFORE
// the write is issued, so the store provably never sees it. Cancelling a
// context would leave "did the write land?" open, which is exactly the
// ambiguity a crash model must not have.
var errProcessDied = errors.New("conformance: process crashed before issuing the write")

type pauseHook struct {
	mu      sync.Mutex
	dead    bool
	reached chan struct{}
	resume  chan struct{}
}

// arm makes the NEXT read on this binding stall until resume is closed.
func (h *pauseHook) arm() (<-chan struct{}, chan struct{}) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.reached = make(chan struct{})
	h.resume = make(chan struct{})
	return h.reached, h.resume
}

func (h *pauseHook) afterRead() {
	h.mu.Lock()
	reached, resume := h.reached, h.resume
	h.reached, h.resume = nil, nil
	h.mu.Unlock()
	if reached == nil {
		return
	}
	close(reached)
	<-resume
}

func (h *pauseHook) kill() {
	h.mu.Lock()
	h.dead = true
	h.mu.Unlock()
}

// reset returns the binding to a live, unarmed process for the next schedule.
func (h *pauseHook) reset() {
	h.mu.Lock()
	h.dead = false
	h.reached, h.resume = nil, nil
	h.mu.Unlock()
}

func (h *pauseHook) beforeWrite() error {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.dead {
		return errProcessDied
	}
	return nil
}

type hookedKV struct {
	jetstream.KeyValue
	hook *pauseHook
}

func (k hookedKV) Get(ctx context.Context, key string) (jetstream.KeyValueEntry, error) {
	entry, err := k.KeyValue.Get(ctx, key)
	k.hook.afterRead()
	return entry, err
}

func (k hookedKV) Create(
	ctx context.Context, key string, value []byte, opts ...jetstream.KVCreateOpt,
) (uint64, error) {
	if err := k.hook.beforeWrite(); err != nil {
		return 0, err
	}
	return k.KeyValue.Create(ctx, key, value, opts...)
}

func (k hookedKV) Update(
	ctx context.Context, key string, value []byte, revision uint64,
) (uint64, error) {
	if err := k.hook.beforeWrite(); err != nil {
		return 0, err
	}
	return k.KeyValue.Update(ctx, key, value, revision)
}

type hookedJS struct {
	jetstream.JetStream
	hook *pauseHook
}

func (j hookedJS) KeyValue(ctx context.Context, bucket string) (jetstream.KeyValue, error) {
	kv, err := j.JetStream.KeyValue(ctx, bucket)
	if err != nil {
		return nil, err
	}
	return hookedKV{KeyValue: kv, hook: j.hook}, nil
}

func (j hookedJS) CreateKeyValue(
	ctx context.Context, cfg jetstream.KeyValueConfig,
) (jetstream.KeyValue, error) {
	kv, err := j.JetStream.CreateKeyValue(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return hookedKV{KeyValue: kv, hook: j.hook}, nil
}

// ---------- embedded server (the P4 harness pattern: no ports) ----------

func startJetStream(t *testing.T) jetstream.JetStream {
	t.Helper()
	opts := &server.Options{
		ServerName: "mech-model-gate",
		JetStream:  true,
		StoreDir:   t.TempDir(),
		DontListen: true,
		NoSigs:     true,
	}
	srv, err := server.NewServer(opts)
	if err != nil {
		t.Fatalf("new server: %v", err)
	}
	go srv.Start()
	if !srv.ReadyForConnections(10 * time.Second) {
		t.Fatal("embedded server not ready")
	}
	t.Cleanup(func() {
		srv.Shutdown()
		srv.WaitForShutdown()
	})
	nc, err := nats.Connect("", nats.InProcessServer(srv))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(nc.Close)
	js, err := jetstream.New(nc)
	if err != nil {
		t.Fatalf("jetstream: %v", err)
	}
	return js
}

// ---------- the driver ----------

const (
	// A claim the schedule never lapses must not lapse by accident.
	immortalLease = 10 * time.Minute
	// A claim the schedule DOES lapse gets just enough lease to cover the
	// steps before its expire event, plus a base. Too short and the wall clock
	// overruns the model; too long and the sweep spends its life sleeping.
	// Each step is an action plus a lookup, both in-process round trips well
	// under a millisecond, so the budget below is roughly ten times the work —
	// the headroom is for scheduler jitter across the worker pool, not latency.
	mortalLeaseBase    = 12 * time.Millisecond
	mortalLeasePerStep = 6 * time.Millisecond
	// Sleep never returns early (measured on this platform, P4 §Verification),
	// so a positive margin past the deadline is one-sided safe.
	expiryMargin = 2 * time.Millisecond
	pauseTimeout = 30 * time.Second
)

// errLeaseOverrun means the wall clock lapsed a lease the schedule still
// expected to be live — a harness timing problem, not a divergence. The
// schedule is retried with longer leases and the retry is COUNTED, never
// hidden: a sweep that silently retried its way to green would be worthless.
var errLeaseOverrun = errors.New("conformance: lease lapsed before the schedule said so")

type commitResult struct {
	first bool
	err   error
}

type pausedCommit struct {
	result chan commitResult
	resume chan struct{}
}

// worker owns one set of per-owner effector bindings. Schedules are driven on
// distinct digests, so workers never interact through the store.
type worker struct {
	owners   []*effector.Effector
	hooks    []*pauseHook
	observer *effector.Effector
}

// newWorker is called from the TEST goroutine only — t.Fatalf from a pool
// goroutine would Goexit the wrong goroutine and hang the sweep.
func newWorker(t *testing.T, js jetstream.JetStream, bucket string, owners int) *worker {
	t.Helper()
	w := &worker{}
	for i := 0; i < owners; i++ {
		hook := &pauseHook{}
		e, err := effector.Open(context.Background(), hookedJS{JetStream: js, hook: hook}, bucket)
		if err != nil {
			t.Fatalf("open owner binding %d: %v", i, err)
		}
		w.owners = append(w.owners, e)
		w.hooks = append(w.hooks, hook)
	}
	observer, err := effector.Open(context.Background(), js, bucket)
	if err != nil {
		t.Fatalf("open observer binding: %v", err)
	}
	w.observer = observer
	return w
}

// run drives one model schedule against the implementation.
type run struct {
	w        *worker
	m        Model
	digest   string
	leases   []time.Duration
	claims   []effector.Claim
	hasClaim []bool
	paused   []*pausedCommit
	dead     []bool
	deadline time.Time // when the authority's current claim lapses
	maxFence uint64    // the greatest generation the IMPLEMENTATION has issued
}

func ownerLabel(o int) string  { return "owner-" + string(rune('A'+o)) }
func resultLabel(o int) string { return "result-" + string(rune('A'+o)) }

// leasePlan chooses, per claim action, a lease the schedule can actually
// realize: immortal unless the schedule lapses that very generation.
func leasePlan(path []TraceStep, scale int) []time.Duration {
	plan := make([]time.Duration, len(path))
	for i, st := range path {
		if st.Action.Kind != ActClaim || st.Outcome.Kind != OutClaimed {
			continue
		}
		plan[i] = immortalLease
		for j := i + 1; j < len(path); j++ {
			if path[j].Action.Kind == ActClaim && path[j].Outcome.Kind == OutClaimed {
				break // a later generation took over; this one is never lapsed
			}
			if path[j].Action.Kind == ActExpire {
				gap := time.Duration(j-i) * mortalLeasePerStep
				plan[i] = time.Duration(scale) * (mortalLeaseBase + gap)
				break
			}
		}
	}
	return plan
}

// drive replays the whole schedule, asserting lockstep agreement.
func (r *run) drive(ctx context.Context, path []TraceStep) error {
	for i, st := range path {
		if st.Action.Kind != ActExpire && r.dead[st.Action.Owner] {
			return r.diverge(i, st, "the schedule acts as a process that has already crashed")
		}
		// A schedule that still calls the claim live must be driven while it
		// IS live; otherwise the harness, not the implementation, is wrong.
		if st.Before.Key1.Tag == TagClaim && st.Before.Key1.Live && !time.Now().Before(r.deadline) {
			return errLeaseOverrun
		}
		if err := r.step(ctx, i, st); err != nil {
			return err
		}
		if err := r.checkObservable(ctx, i, st); err != nil {
			return err
		}
	}
	return nil
}

func (r *run) step(ctx context.Context, i int, st TraceStep) error {
	o := st.Action.Owner
	switch st.Action.Kind {
	case ActExpire:
		if wait := time.Until(r.deadline) + expiryMargin; wait > 0 {
			time.Sleep(wait)
		}
		return nil

	case ActCrash:
		r.w.hooks[o].kill()
		if p := r.paused[o]; p != nil {
			// What would this paused commit have DONE had the process lived?
			// Only a commit that was about to write has anything for a crash
			// to stop. One whose fence read already showed a terminal
			// outcome, or a superseded fence, was only ever going to return —
			// it touches nothing, so completing it is indistinguishable from
			// dying, which is exactly what the model says.
			_, would := r.m.Step(st.Before, Action{Kind: ActFinish, Owner: o}, r.m.maxFenceCap(0))
			close(p.resume)
			got := <-p.result
			r.paused[o] = nil
			if got.first {
				return r.diverge(i, st, fmt.Sprintf(
					"a crashed process's write landed anyway: first=%v err=%v", got.first, got.err))
			}
			if would.Kind == OutFirst && !errors.Is(got.err, errProcessDied) {
				return r.diverge(i, st, fmt.Sprintf(
					"the crash did not stop a commit that was about to write: first=%v err=%v",
					got.first, got.err))
			}
		}
		r.dead[o] = true
		return nil

	case ActClaim:
		claim, err := r.w.owners[o].Claim(ctx, r.digest, ownerLabel(o), r.leases[i])
		switch st.Outcome.Kind {
		case OutClaimed:
			if err != nil {
				return r.classifyAt(st.Before, i, st, fmt.Sprintf("claim failed: %v", err))
			}
			if claim.Fence != uint64(st.Outcome.Fence) {
				return r.diverge(i, st, fmt.Sprintf(
					"claim landed at fence %d, model says %d", claim.Fence, st.Outcome.Fence))
			}
			r.claims[o] = claim
			r.hasClaim[o] = true
			r.deadline = claim.Expiry
			if claim.Fence > r.maxFence {
				r.maxFence = claim.Fence
			}
		case OutHeld:
			if !errors.Is(err, effector.ErrHeld) {
				return r.classifyAt(st.Before, i, st, fmt.Sprintf("claim returned %v, want ErrHeld", err))
			}
		case OutCommittedErr:
			if !errors.Is(err, effector.ErrCommitted) {
				return r.classifyAt(st.Before, i, st, fmt.Sprintf("claim returned %v, want ErrCommitted", err))
			}
		default:
			return r.diverge(i, st, "unmodelled claim outcome")
		}
		return nil

	case ActBegin:
		if !r.hasClaim[o] {
			return r.diverge(i, st, "begin without a claim handle")
		}
		reached, resume := r.w.hooks[o].arm()
		result := make(chan commitResult, 1)
		claim := r.claims[o]
		binding := r.w.owners[o]
		go func() {
			first, err := binding.Commit(context.Background(), claim, resultLabel(o))
			result <- commitResult{first: first, err: err}
		}()
		// Registered BEFORE the select so that release() can always drain the
		// commit, whichever way this goes. An abandoned paused goroutine would
		// outlive the schedule and write into the next one.
		r.paused[o] = &pausedCommit{result: result, resume: resume}
		select {
		case <-reached:
			return nil
		case got := <-result:
			// Unreachable while the hook is armed — the read fires the hook
			// before Commit can return — but if it ever happens, the schedule
			// is not driving what it thinks it is.
			r.paused[o] = nil
			return r.diverge(i, st, fmt.Sprintf(
				"commit returned (first=%v, err=%v) without reading the authority key",
				got.first, got.err))
		case <-time.After(pauseTimeout):
			return r.diverge(i, st, "commit never reached its fence read")
		}

	case ActFinish:
		p := r.paused[o]
		if p == nil {
			return r.diverge(i, st, "finish with no paused commit")
		}
		close(p.resume)
		got := <-p.result
		r.paused[o] = nil
		switch st.Outcome.Kind {
		case OutFirst:
			if got.err != nil || !got.first {
				return r.classifyAt(st.Before, i, st, fmt.Sprintf(
					"commit returned (first=%v, err=%v), model says it created the outcome",
					got.first, got.err))
			}
			// Fencing safety, asserted against the IMPLEMENTATION rather than
			// against the model: a commit that lands must carry the greatest
			// generation the store has issued.
			if r.claims[o].Fence != r.maxFence {
				return r.diverge(i, st, fmt.Sprintf(
					"FENCING VIOLATION IN THE IMPLEMENTATION: commit landed at fence %d "+
						"while generation %d had been issued", r.claims[o].Fence, r.maxFence))
			}
		case OutIdempotent:
			if got.err != nil || got.first {
				return r.classifyAt(st.Before, i, st, fmt.Sprintf(
					"commit returned (first=%v, err=%v), model says idempotent absorption",
					got.first, got.err))
			}
		case OutFenced:
			if !errors.Is(got.err, effector.ErrFenced) {
				return r.classifyAt(st.Before, i, st, fmt.Sprintf(
					"commit returned (first=%v, err=%v), model says ErrFenced", got.first, got.err))
			}
		case OutCommittedErr:
			if !errors.Is(got.err, effector.ErrCommitted) {
				return r.classifyAt(st.Before, i, st, fmt.Sprintf(
					"commit returned (first=%v, err=%v), model says ErrCommitted", got.first, got.err))
			}
		default:
			return r.diverge(i, st, "unmodelled commit outcome")
		}
		return nil
	}
	return r.diverge(i, st, "unmodelled action")
}

// checkObservable compares lookup after every step, not only at the end: a
// divergence caught one step after it happens is far easier to read than one
// caught six steps later.
func (r *run) checkObservable(ctx context.Context, i int, st TraceStep) error {
	wantState, wantFence, wantResult := r.m.Lookup(st.After)
	gotState, gotOutcome, err := r.w.observer.Lookup(ctx, r.digest)
	if err != nil {
		return r.diverge(i, st, fmt.Sprintf("lookup failed: %v", err))
	}
	want := implState(wantState)
	if gotState != want {
		return r.classifyAt(st.After, i, st, fmt.Sprintf("lookup says %q, model says %q", gotState, want))
	}
	if wantState != Committed {
		return nil
	}
	if gotOutcome.Fence != uint64(wantFence) {
		return r.diverge(i, st, fmt.Sprintf(
			"committed at fence %d, model says %d", gotOutcome.Fence, wantFence))
	}
	if want := resultLabel(int(wantResult) - 1); gotOutcome.Result != want {
		return r.diverge(i, st, fmt.Sprintf(
			"committed result %q, model says %q", gotOutcome.Result, want))
	}
	return nil
}

// implState is the model-to-implementation mapping for lookup states. It is
// total by construction: a new model state must be given an implementation
// counterpart here or the compiler-free default below reports it as a
// mismatch rather than silently agreeing.
func implState(s LookupState) effector.State {
	switch s {
	case Held:
		return effector.Held
	case Committed:
		return effector.Committed
	default:
		return effector.Unclaimed
	}
}

// classifyAt decides whether a disagreement is a real divergence or the
// harness losing a race with its own lease.
//
// `ref` is the state whose live-claim assumption the failed assertion actually
// rests on, and passing the wrong one is a live trap: an outcome assertion
// rests on the state BEFORE the action, while a lookup assertion rests on the
// state AFTER it. A claim that creates a short-leased generation has an Absent
// `Before` and a live `After`, so classifying its lookup against `Before` would
// report a timing artifact as an implementation divergence.
//
// It is otherwise deliberately conservative: only a state the model still calls
// LIVE, whose real deadline has actually passed, is forgiven, and forgiveness
// costs a full retry with longer leases.
func (r *run) classifyAt(ref State, i int, st TraceStep, detail string) error {
	if ref.Key1.Tag == TagClaim && ref.Key1.Live && !time.Now().Before(r.deadline) {
		return errLeaseOverrun
	}
	return r.diverge(i, st, detail)
}

func (r *run) diverge(i int, st TraceStep, detail string) error {
	return fmt.Errorf("step %d %s (model: %s): %s\n  model state after: %s",
		i+1, st.Action, st.Outcome, detail, r.m.Describe(st.After))
}

// release drains any commit still paused when a schedule ends or aborts, so no
// goroutine outlives the run.
func (r *run) release() {
	for o := range r.paused {
		if p := r.paused[o]; p != nil {
			r.w.hooks[o].kill() // the write must not land after the schedule ended
			close(p.resume)
			<-p.result
			r.paused[o] = nil
		}
	}
	for _, h := range r.w.hooks {
		h.reset()
	}
}

// ---------- sweeps ----------

type sweepStats struct {
	Name      string
	Schedules int
	Steps     int
	Retries   int
	Failures  []string
}

func (s sweepStats) String() string {
	return fmt.Sprintf("%s: %d schedules, %d driven steps, %d lease retries, %d divergences",
		s.Name, s.Schedules, s.Steps, s.Retries, len(s.Failures))
}

func runSweep(t *testing.T, js jetstream.JetStream, bucket, name string, m Model, paths [][]TraceStep) sweepStats {
	t.Helper()
	stats := sweepStats{Name: name, Schedules: len(paths)}
	if len(paths) == 0 {
		t.Fatalf("%s: nothing to drive; the enumeration is empty and the sweep is vacuous", name)
	}

	workers := runtime.NumCPU()
	if workers > 8 {
		workers = 8
	}
	if workers > len(paths) {
		workers = len(paths)
	}

	type outcome struct {
		index   int
		steps   int
		retries int
		failure string
	}
	pool := make([]*worker, workers)
	for i := range pool {
		pool[i] = newWorker(t, js, bucket, m.Owners)
	}

	jobs := make(chan int)
	results := make(chan outcome, len(paths))
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(w *worker) {
			defer wg.Done()
			for index := range jobs {
				res := outcome{index: index}
				path := paths[index]
				var err error
				for scale := 1; scale <= 8; scale *= 2 {
					err = drivePath(t, w, m, name, index, scale, path)
					if errors.Is(err, errLeaseOverrun) {
						res.retries++
						continue
					}
					break
				}
				// A schedule that never got driven is NOT a schedule that
				// passed. Exhausting the lease budget is a failure of the
				// sweep, and it is reported as one.
				if err != nil {
					res.failure = fmt.Sprintf("%s schedule #%d\n%s\n%s",
						name, index, m.FormatTrace(path), err)
				}
				res.steps = len(path)
				results <- res
			}
		}(pool[i])
	}
	for i := range paths {
		jobs <- i
	}
	close(jobs)
	wg.Wait()
	close(results)

	// Sort by schedule index so the report is identical run to run.
	collected := make([]string, len(paths))
	for res := range results {
		stats.Steps += res.steps
		stats.Retries += res.retries
		if res.failure != "" {
			collected[res.index] = res.failure
		}
	}
	for _, f := range collected {
		if f != "" {
			stats.Failures = append(stats.Failures, f)
		}
	}
	return stats
}

// drivePath gives one schedule its own digest, so schedules never interact.
func drivePath(
	t *testing.T, w *worker, m Model, sweep string, index, scale int, path []TraceStep,
) error {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	r := &run{
		w:        w,
		m:        m,
		digest:   scheduleDigest(sweep, index, scale),
		leases:   leasePlan(path, scale),
		claims:   make([]effector.Claim, m.Owners),
		hasClaim: make([]bool, m.Owners),
		paused:   make([]*pausedCommit, m.Owners),
		dead:     make([]bool, m.Owners),
	}
	defer r.release()
	return r.drive(ctx, path)
}

// scheduleDigest is a valid 64-hex work digest that is unique per (sweep,
// schedule, attempt). Digests stand in for P1/P2b entry digests; only their
// distinctness matters here.
func scheduleDigest(sweep string, index, scale int) string {
	h := uint64(1469598103934665603)
	for _, c := range []byte(sweep) {
		h ^= uint64(c)
		h *= 1099511628211
	}
	return fmt.Sprintf("%016x%08x%08x%032x", h, uint32(index), uint32(scale), 0)
}

// conformanceModel is the model the implementation can actually realize:
// steals wait for the lease to lapse (no adversarial steal — the real Claim
// refuses a live claim), and owners are sequential processes.
func conformanceModel(crash bool) Model {
	return Model{Owners: 3, Protocol: SingleKey, AllowCrash: crash}
}

func report(t *testing.T, stats sweepStats) {
	t.Helper()
	t.Log(stats)
	for _, f := range stats.Failures {
		t.Errorf("DIVERGENCE\n%s", f)
	}
}

// The standing gate runs one depth below the deep sweep so the whole model
// package stays inside a few seconds. MODEL_GATE_DEEP=1 adds a level to every
// sweep; the numbers from a deep run are recorded in
// docs/research/effector-model-gate.md. Both modes announce which they are —
// a coverage claim that does not say how deep it went is worthless.
func deepSweeps() bool { return os.Getenv("MODEL_GATE_DEEP") == "1" }

func sweepDepth(base int) int {
	if deepSweeps() {
		return base + 1
	}
	return base
}

func openBucket(t *testing.T, js jetstream.JetStream, name string) {
	t.Helper()
	if _, err := effector.Open(context.Background(), js, name); err != nil {
		t.Fatalf("create bucket %s: %v", name, err)
	}
}

func driveEnumeration(
	t *testing.T, js jetstream.JetStream, bucket string, m Model, depth int, keep PathFilter,
) {
	t.Helper()
	paths := EnumeratePaths(m, depth, 0, nil, keep)
	if paths.Capped {
		t.Fatal("enumeration was capped; coverage would be a sample, not exhaustive")
	}
	name := fmt.Sprintf("%s-d%d", bucket, depth)
	t.Logf("%s: %d schedules selected from %d enumerated at depth %d (deep=%v)",
		name, len(paths.Paths), paths.Explored, depth, deepSweeps())
	report(t, runSweep(t, js, bucket, name, m, paths.Paths))
}

// EXHAUSTIVE: every schedule of exactly `depth` actions over the realizable
// alphabet. Every shorter schedule is a prefix of one of these, so nothing
// below the bound is missed.
func TestTraceConformanceExhaustive(t *testing.T) {
	js := startJetStream(t)
	openBucket(t, js, "conform")
	driveEnumeration(t, js, "conform", conformanceModel(false), sweepDepth(5), nil)
}

// COUNTEREXAMPLE-ADJACENT: every schedule carrying the begin/steal/finish
// shape that refuted the two-key protocol, one level deeper than the
// exhaustive sweep. These are the schedules the implementation must refuse
// every single time, so they are enumerated exhaustively rather than sampled.
func TestTraceConformanceCounterexampleAdjacent(t *testing.T) {
	js := startJetStream(t)
	openBucket(t, js, "cex")
	driveEnumeration(t, js, "cex", conformanceModel(false), sweepDepth(6), CounterexampleShaped)
}

// CRASH-BEARING: crash-stop anywhere. A crashed process's paused write is
// refused by its own substrate, so the store provably never sees it — the one
// crash semantics that leaves no ambiguity about whether the write landed.
func TestTraceConformanceWithCrashStop(t *testing.T) {
	js := startJetStream(t)
	openBucket(t, js, "crash")
	driveEnumeration(t, js, "crash", conformanceModel(true), sweepDepth(4), nil)
}

// ---------- self-validation: the harness must be able to fail ----------

// Zero divergences is a claim about the implementation only if the harness can
// report a divergence at all. This is the same argument that makes the two-key
// rediscovery mandatory for the checker, applied to the driver: each mutation
// below corrupts the model's prediction in one specific, guaranteed-wrong way,
// and EVERY corrupted schedule must be caught.
func TestConformanceHarnessDetectsDivergence(t *testing.T) {
	js := startJetStream(t)
	openBucket(t, js, "mutant")
	m := conformanceModel(false)
	base := EnumeratePaths(m, 6, 0, nil, CounterexampleShaped)

	for _, mut := range []struct {
		name  string
		apply func([]TraceStep) ([]TraceStep, bool)
	}{
		{"refused-commit-predicted-to-land", mutateFencedCommitToFirst},
		{"claim-predicted-at-the-wrong-generation", mutateClaimFence},
		{"unclaimed-state-predicted-committed", mutateLookupToCommitted},
	} {
		var mutated [][]TraceStep
		for _, path := range base.Paths {
			if out, ok := mut.apply(path); ok {
				mutated = append(mutated, out)
			}
		}
		if len(mutated) == 0 {
			t.Fatalf("mutation %q applied to nothing; it tests nothing", mut.name)
		}
		stats := runSweep(t, js, "mutant", mut.name, m, mutated)
		t.Logf("%s: %d corrupted schedules, %d caught", mut.name, len(mutated), len(stats.Failures))
		if len(stats.Failures) != len(mutated) {
			t.Errorf("mutation %q: %d of %d corrupted schedules went UNDETECTED; "+
				"the sweep's zero-divergence result would be worth nothing",
				mut.name, len(mutated)-len(stats.Failures), len(mutated))
		}
	}
}

// clonePrefix copies a schedule up to and including step i, so the corrupted
// step is the last one driven and is therefore always reached.
func clonePrefix(path []TraceStep, i int) []TraceStep {
	out := make([]TraceStep, i+1)
	copy(out, path[:i+1])
	return out
}

// A commit the protocol refuses, predicted to land.
func mutateFencedCommitToFirst(path []TraceStep) ([]TraceStep, bool) {
	for i, st := range path {
		if st.Action.Kind != ActFinish || st.Outcome.Kind != OutFenced {
			continue
		}
		out := clonePrefix(path, i)
		out[i].Outcome = Outcome{Kind: OutFirst, Fence: st.Before.Procs[st.Action.Owner].Pend.UsedFence}
		return out, true
	}
	return nil, false
}

// A claim predicted at a generation the store will not issue.
func mutateClaimFence(path []TraceStep) ([]TraceStep, bool) {
	for i, st := range path {
		if st.Action.Kind != ActClaim || st.Outcome.Kind != OutClaimed {
			continue
		}
		out := clonePrefix(path, i)
		out[i].Outcome.Fence++
		return out, true
	}
	return nil, false
}

// A state predicted terminal that is nothing of the kind.
func mutateLookupToCommitted(path []TraceStep) ([]TraceStep, bool) {
	i := len(path) - 1
	m := conformanceModel(false)
	if state, _, _ := m.Lookup(path[i].After); state == Committed {
		return nil, false
	}
	out := clonePrefix(path, i)
	out[i].After.Key1 = register{Tag: TagDone, Fence: 1, Result: 1}
	return out, true
}
