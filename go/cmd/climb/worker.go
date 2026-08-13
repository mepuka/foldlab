// R2 worker — the verified climb (docs/gauntlet/R2-verified-climb.md).
// The worker is a deterministic replay engine: every run replays the
// whole climb from generation 0, serving recorded facts out of the
// journal-backed register and buying only what is missing, so a hard
// kill at any point resumes with zero re-buys. Receipts are journaled
// and synced BEFORE their results are consumed; caps are enforced in
// code before every call.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"foldlab/canonical"
)

const (
	model       = "claude-haiku-4-5-20251001"
	runSeed     = "r2-002"
	kPopulation = 6
	kSurvivors  = 2
	generations = 4
	lSteps      = 4
	fleetSize   = 4

	capMaxCalls  = 3000
	capMaxOutTok = 20000
	capSpendNano = 15_000_000_000 // $15.00, the operator cap

	priceInNano   = 1000 // haiku: $1 / MTok input
	priceOutNano  = 5000 // haiku: $5 / MTok output
	worstCaseNano = int64(capMaxOutTok) * priceOutNano

	pinnedCorpusSHA = "8ce15a57d0d8a6b8bba1efb7f04ceeb64358a8d2e8227c6651d90af8c9fae5f2"
	placeholder     = "{{INPUT}}"
)

var holdoutPerTier = map[string]int{"aime_2026": 12, "hmmt_feb_2026": 6, "hmmt_nov_2025": 9}

type question struct {
	Answer  string `json:"answer"`
	ID      string `json:"id"`
	Problem string `json:"problem"`
	Source  string `json:"source"`
}

type stepSpec struct {
	Model    string          `json:"model"`
	Params   json.RawMessage `json:"params"`
	Template string          `json:"template"`
}

// stepParams is the harness's reading of the opaque params bytes. The
// record only ever hashes them; interpretation lives here.
type stepParams struct {
	MaxTokens      int `json:"max_tokens"`
	ThinkingBudget int `json:"thinking_budget"`
}

type fact struct {
	result string
	inTok  int64
	outTok int64
}

type mutRec struct{ parent, via string }

// ---------- the fenced register over the journal ----------

type engine struct {
	mu       sync.Mutex
	facts    map[string]fact
	inflight map[string]chan struct{}
	claimed  map[string]bool
	fence    uint64
	journal  *os.File
	ledger   *os.File
	head     string
	nextSeq  int
	calls    int
	spend    int64
	failed   error

	outputs string
	fake    bool
	client  *http.Client
	key     string
	ctx     context.Context
}

func openEngine(bundle string, fake bool) (*engine, map[string]mutRec, [][]string, error) {
	e := &engine{
		facts:    make(map[string]fact),
		inflight: make(map[string]chan struct{}),
		claimed:  make(map[string]bool),
		head:     canonical.Genesis,
		outputs:  filepath.Join(bundle, "outputs"),
		fake:     fake,
		ctx:      context.Background(),
	}
	if err := os.MkdirAll(e.outputs, 0o755); err != nil {
		return nil, nil, nil, err
	}

	// The journal is the recovery mechanism: reload receipts, mutation
	// facts, and selections, rewalking the chain from genesis.
	mutations := make(map[string]mutRec)
	var selections [][]string
	var receiptOrder []string
	journalPath := filepath.Join(bundle, "journal.ndjson")
	if data, err := os.ReadFile(journalPath); err == nil {
		for _, line := range bytes.Split(data, []byte("\n")) {
			line = bytes.TrimSuffix(line, []byte("\r"))
			if len(bytes.TrimSpace(line)) == 0 {
				continue
			}
			var wire struct {
				Payload string `json:"payload"`
				Prev    string `json:"prev"`
				Seq     int64  `json:"seq"`
			}
			if err := json.Unmarshal(line, &wire); err != nil {
				return nil, nil, nil, fmt.Errorf("corrupt journal at seq %d: %w", e.nextSeq, err)
			}
			if wire.Prev != e.head {
				return nil, nil, nil, fmt.Errorf("journal chain broken at seq %d", wire.Seq)
			}
			digest, err := canonical.EntryDigest(canonical.ChainEntry{Seq: wire.Seq, Prev: wire.Prev, Payload: wire.Payload})
			if err != nil {
				return nil, nil, nil, fmt.Errorf("corrupt journal at seq %d: %w", wire.Seq, err)
			}
			e.head = digest
			if wire.Seq < 0 || uint64(wire.Seq) >= uint64(^uint(0)>>1) {
				return nil, nil, nil, fmt.Errorf("journal seq %d exceeds platform index range", wire.Seq)
			}
			e.nextSeq = int(wire.Seq) + 1
			var peek struct {
				Kind string `json:"kind"`
			}
			if err := json.Unmarshal([]byte(wire.Payload), &peek); err != nil {
				return nil, nil, nil, err
			}
			switch peek.Kind {
			case "receipt":
				var r struct {
					Digest       string `json:"digest"`
					InputTokens  int64  `json:"input_tokens"`
					OutputTokens int64  `json:"output_tokens"`
					Result       string `json:"result"`
				}
				if err := json.Unmarshal([]byte(wire.Payload), &r); err != nil {
					return nil, nil, nil, err
				}
				e.facts[r.Digest] = fact{r.Result, r.InputTokens, r.OutputTokens}
				e.calls++
				e.spend += r.InputTokens*priceInNano + r.OutputTokens*priceOutNano
				receiptOrder = append(receiptOrder, r.Digest)
			case "mutation":
				var m struct {
					Child  string `json:"child"`
					Parent string `json:"parent"`
					Via    string `json:"via"`
				}
				if err := json.Unmarshal([]byte(wire.Payload), &m); err != nil {
					return nil, nil, nil, err
				}
				mutations[m.Child] = mutRec{m.Parent, m.Via}
			case "selection":
				var s struct {
					Generation int      `json:"generation"`
					Survivors  []string `json:"survivors"`
				}
				if err := json.Unmarshal([]byte(wire.Payload), &s); err != nil {
					return nil, nil, nil, err
				}
				if s.Generation != len(selections) {
					return nil, nil, nil, fmt.Errorf("journal selection generation %d out of order", s.Generation)
				}
				selections = append(selections, s.Survivors)
			default:
				return nil, nil, nil, fmt.Errorf("journal entry of unknown kind %q", peek.Kind)
			}
		}
	}

	journal, err := os.OpenFile(journalPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return nil, nil, nil, err
	}
	e.journal = journal
	ledgerPath := filepath.Join(bundle, "ledger.ndjson")
	if data, err := os.ReadFile(ledgerPath); err == nil {
		for _, line := range bytes.Split(data, []byte("\n")) {
			if len(bytes.TrimSpace(line)) == 0 {
				continue
			}
			var claim struct {
				Digest string `json:"digest"`
			}
			if err := json.Unmarshal(line, &claim); err != nil {
				return nil, nil, nil, fmt.Errorf("corrupt ledger: %w", err)
			}
			e.claimed[claim.Digest] = true
			e.fence++
		}
	}
	ledger, err := os.OpenFile(ledgerPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		journal.Close()
		return nil, nil, nil, err
	}
	e.ledger = ledger

	// A kill can land between a receipt and its claim; the resuming
	// process owns the orphan so the ledger stays one claim per receipt.
	for _, work := range receiptOrder {
		if !e.claimed[work] {
			if err := e.appendClaim(work, "w1"); err != nil {
				e.close()
				return nil, nil, nil, err
			}
		}
	}
	return e, mutations, selections, nil
}

func (e *engine) close() {
	if e.journal != nil {
		e.journal.Close()
	}
	if e.ledger != nil {
		e.ledger.Close()
	}
}

// journalAppend chains and syncs one typed fact. Caller holds e.mu.
func (e *engine) journalAppend(payload map[string]any) error {
	p, err := canonicalJSON(payload)
	if err != nil {
		return err
	}
	wire, err := canonicalJSON(map[string]any{"payload": string(p), "prev": e.head, "seq": e.nextSeq})
	if err != nil {
		return err
	}
	if _, err := e.journal.Write(append(wire, '\n')); err != nil {
		return err
	}
	if err := e.journal.Sync(); err != nil {
		return err
	}
	digest, err := canonical.EntryDigest(canonical.ChainEntry{Seq: int64(e.nextSeq), Prev: e.head, Payload: string(p)})
	if err != nil {
		return err
	}
	e.head = digest
	e.nextSeq++
	return nil
}

// appendClaim exports the fence token as CL5 evidence. Caller holds
// e.mu (or is single-threaded startup).
func (e *engine) appendClaim(work, owner string) error {
	e.fence++
	line, err := canonicalJSON(map[string]any{
		"at": time.Now().UnixMilli(), "digest": work, "fence": e.fence,
		"nonce": fmt.Sprintf("%s-%d", owner, e.fence), "owner": owner,
	})
	if err != nil {
		return err
	}
	if _, err := e.ledger.Write(append(line, '\n')); err != nil {
		return err
	}
	if err := e.ledger.Sync(); err != nil {
		return err
	}
	e.claimed[work] = true
	return nil
}

// ensure returns the output text for a work digest, buying it at most
// once fleet-wide: lookup-before-claim (the RG-A discipline), output
// persisted and receipt journaled before any consumer sees the result.
func (e *engine) ensure(work, owner, prompt string, p stepParams) (string, error) {
	for {
		e.mu.Lock()
		if e.failed != nil {
			err := e.failed
			e.mu.Unlock()
			return "", err
		}
		if _, ok := e.facts[work]; ok {
			e.mu.Unlock()
			data, err := os.ReadFile(filepath.Join(e.outputs, work+".txt"))
			if err != nil {
				return "", fmt.Errorf("output missing for recorded fact %s: %w", work, err)
			}
			return string(data), nil
		}
		if ch, ok := e.inflight[work]; ok {
			e.mu.Unlock()
			<-ch
			continue
		}
		// Caps are laws, enforced BEFORE the call — fail closed. In-flight
		// work reserves both a call and its maximum output-token spend.
		reserved := len(e.inflight)
		if e.calls+reserved >= capMaxCalls {
			err := fmt.Errorf("cap reached: %d completed + %d reserved calls — stopping, bundle is partial", e.calls, reserved)
			e.failed = err
			e.mu.Unlock()
			return "", err
		}
		reservedSpend := int64(reserved) * worstCaseNano
		if e.spend+reservedSpend >= capSpendNano {
			err := fmt.Errorf("spend cap reached: %d spent + %d reserved nano-usd — stopping, bundle is partial", e.spend, reservedSpend)
			e.failed = err
			e.mu.Unlock()
			return "", err
		}
		ch := make(chan struct{})
		e.inflight[work] = ch
		e.mu.Unlock()

		text, inTok, outTok, stop, err := e.call(prompt, p)

		e.mu.Lock()
		if err == nil {
			err = os.WriteFile(filepath.Join(e.outputs, work+".txt"), []byte(text), 0o644)
		}
		if err == nil {
			err = e.journalAppend(map[string]any{
				"digest": work, "input_tokens": inTok, "kind": "receipt", "model": model,
				"output_tokens": outTok, "result": canonical.DigestHex([]byte(text)), "stop": stop,
			})
		}
		if err == nil {
			err = e.appendClaim(work, owner)
		}
		if err != nil {
			if e.failed == nil {
				e.failed = err
			}
			delete(e.inflight, work)
			close(ch)
			e.mu.Unlock()
			return "", err
		}
		e.calls++
		e.spend += inTok*priceInNano + outTok*priceOutNano
		e.facts[work] = fact{canonical.DigestHex([]byte(text)), inTok, outTok}
		if e.calls%25 == 0 {
			fmt.Printf("worker: %d receipts, $%.4f\n", e.calls, float64(e.spend)/1e9)
		}
		delete(e.inflight, work)
		close(ch)
		e.mu.Unlock()
		return text, nil
	}
}

// ---------- the climb ----------

type climb struct {
	e         *engine
	bundle    string
	corpusSHA string
	devQs     []question
	holdQs    []question

	specs      map[string][]stepSpec
	stepD      map[string][]string
	candOrder  []string
	mutations  map[string]mutRec
	selections [][]string

	planMu    sync.Mutex
	planRows  [][]byte
	finalWork map[string]string
}

func worker(bundle string, fake bool) error {
	raw, qs, err := loadCorpus(bundle, fake)
	if err != nil {
		return err
	}
	devQs, holdQs, err := deriveSplit(qs)
	if err != nil {
		return err
	}
	e, mutations, selections, err := openEngine(bundle, fake)
	if err != nil {
		return err
	}
	defer e.close()
	if !fake {
		key, err := loadKey()
		if err != nil {
			return err // fail closed; the error never contains the key
		}
		e.key = key
		// High-thinking calls run minutes; short timeouts turn into
		// billed-but-unrecorded retry cycles (calibration lesson).
		e.client = &http.Client{Timeout: 600 * time.Second}
	}

	c := &climb{
		e: e, bundle: bundle, corpusSHA: canonical.DigestHex(raw),
		devQs: devQs, holdQs: holdQs,
		specs: make(map[string][]stepSpec), stepD: make(map[string][]string),
		mutations: mutations, selections: selections,
		finalWork: make(map[string]string),
	}
	seed := seedSteps()
	seedD, err := c.addCandidate(seed)
	if err != nil {
		return err
	}
	fmt.Printf("worker: seed %s dev=%d holdout=%d resume_facts=%d\n",
		seedD[:12], len(devQs), len(holdQs), e.calls)

	// Generation 0: the seed alone, then its trivial selection.
	if err := c.evalPopulation([]string{seedD}, 0, "dev", devQs); err != nil {
		return err
	}
	seedDev, err := c.score(seedD, devQs)
	if err != nil {
		return err
	}
	if err := c.ensureSelection(0, []string{seedD}); err != nil {
		return err
	}
	fmt.Printf("gen 0: seed dev %d/%d\n", seedDev, len(devQs))

	survivors := []string{seedD}
	scores := map[string]int{seedD: seedDev}
	for g := 1; g <= generations; g++ {
		children, err := c.proposeChildren(g, survivors, scores)
		if err != nil {
			return err
		}
		pop := append(append([]string(nil), survivors...), children...)
		if err := c.evalPopulation(pop, g, "dev", devQs); err != nil {
			return err
		}
		type ranked struct {
			cand  string
			score int
		}
		ranking := make([]ranked, 0, len(pop))
		scores = make(map[string]int, len(pop))
		for _, cand := range pop {
			s, err := c.score(cand, devQs)
			if err != nil {
				return err
			}
			ranking = append(ranking, ranked{cand, s})
			scores[cand] = s
		}
		// The selection law the verifier re-runs: top-k by (score desc,
		// digest asc).
		sort.Slice(ranking, func(i, j int) bool {
			if ranking[i].score != ranking[j].score {
				return ranking[i].score > ranking[j].score
			}
			return ranking[i].cand < ranking[j].cand
		})
		survivors = make([]string, kSurvivors)
		for i := range survivors {
			survivors[i] = ranking[i].cand
		}
		if err := c.ensureSelection(g, survivors); err != nil {
			return err
		}
		fmt.Printf("gen %d: best %d/%d (%s), runner-up %d/%d (%s)\n",
			g, ranking[0].score, len(devQs), ranking[0].cand[:12],
			ranking[1].score, len(devQs), ranking[1].cand[:12])
	}

	// The holdout law: exactly {seed, winner}, bought only after the
	// final selection fact is on the chain.
	winner := survivors[0]
	holdoutCands := []string{seedD}
	if winner != seedD {
		holdoutCands = append(holdoutCands, winner)
	} else {
		fmt.Println("worker: winner IS the seed — the bundle will refuse, as it should")
	}
	if err := c.evalPopulation(holdoutCands, generations, "holdout", holdQs); err != nil {
		return err
	}
	seedHold, err := c.score(seedD, holdQs)
	if err != nil {
		return err
	}
	winHold, err := c.score(winner, holdQs)
	if err != nil {
		return err
	}
	finalDev := scores[winner]

	if err := c.writeBundle(); err != nil {
		return err
	}
	fmt.Printf("WORKER DONE receipts=%d spend=$%.4f dev %d->%d holdout %d->%d winner=%s\n",
		e.calls, float64(e.spend)/1e9, seedDev, finalDev, seedHold, winHold, winner[:12])
	return nil
}

func (c *climb) addCandidate(steps []stepSpec) (string, error) {
	digest, err := digestOf(map[string]any{"steps": steps})
	if err != nil {
		return "", err
	}
	if _, dup := c.specs[digest]; dup {
		return "", fmt.Errorf("duplicate candidate %s", digest)
	}
	stepDs := make([]string, len(steps))
	for i, s := range steps {
		d, err := digestOf(s)
		if err != nil {
			return "", err
		}
		stepDs[i] = d
	}
	c.specs[digest] = steps
	c.stepD[digest] = stepDs
	c.candOrder = append(c.candOrder, digest)
	return digest, nil
}

func (c *climb) ensureSelection(gen int, survivors []string) error {
	if gen < len(c.selections) {
		got := c.selections[gen]
		if len(got) != len(survivors) {
			return fmt.Errorf("replay disagrees with journaled selection at generation %d", gen)
		}
		for i := range got {
			if got[i] != survivors[i] {
				return fmt.Errorf("replay disagrees with journaled selection at generation %d", gen)
			}
		}
		return nil
	}
	c.e.mu.Lock()
	defer c.e.mu.Unlock()
	if err := c.e.journalAppend(map[string]any{
		"generation": gen, "kind": "selection", "survivors": survivors,
	}); err != nil {
		return err
	}
	c.selections = append(c.selections, survivors)
	return nil
}

func (c *climb) ensureMutation(child, parent, via string) error {
	if rec, ok := c.mutations[child]; ok {
		if rec.parent != parent || rec.via != via {
			return fmt.Errorf("replay disagrees with journaled mutation for %s", child)
		}
		return nil
	}
	c.e.mu.Lock()
	defer c.e.mu.Unlock()
	if err := c.e.journalAppend(map[string]any{
		"child": child, "kind": "mutation", "parent": parent, "via": via,
	}); err != nil {
		return err
	}
	c.mutations[child] = mutRec{parent, via}
	return nil
}

// ---------- evaluation: the racing fleet ----------

type evalTask struct {
	cand  string
	split string
	q     question
}

func (c *climb) evalPopulation(pop []string, gen int, split string, qs []question) error {
	tasks := make(chan evalTask)
	done := make(chan struct{})
	var once sync.Once
	var firstErr error
	fail := func(err error) {
		once.Do(func() {
			firstErr = err
			close(done)
		})
	}
	var wg sync.WaitGroup
	for i := 0; i < fleetSize; i++ {
		owner := fmt.Sprintf("w%d", i+1)
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range tasks {
				if err := c.pipeline(owner, t.cand, gen, t.split, t.q); err != nil {
					fail(err)
					return
				}
			}
		}()
	}
	go func() {
		defer close(tasks)
		for _, cand := range pop {
			for _, q := range qs {
				select {
				case tasks <- evalTask{cand, split, q}:
				case <-done:
					return
				}
			}
		}
	}()
	wg.Wait()
	return firstErr
}

func (c *climb) pipeline(owner, cand string, gen int, split string, q question) error {
	steps := c.specs[cand]
	stepDs := c.stepD[cand]
	prevText, prevResult := "", ""
	for s := 0; s < lSteps; s++ {
		var inputs []string
		if s == 0 {
			q0, err := digestOf(map[string]any{"question": q.ID, "seed": runSeed})
			if err != nil {
				return err
			}
			inputs = []string{q0}
		} else {
			inputs = []string{prevResult}
		}
		work, err := digestOf(map[string]any{"inputs": inputs, "step": stepDs[s]})
		if err != nil {
			return err
		}
		fill := q.Problem
		if s > 0 {
			fill = prevText
		}
		var p stepParams
		if err := json.Unmarshal(steps[s].Params, &p); err != nil {
			return err
		}
		text, err := c.e.ensure(work, owner, strings.Replace(steps[s].Template, placeholder, fill, 1), p)
		if err != nil {
			return err
		}
		row, err := canonicalJSON(map[string]any{
			"candidate": cand, "generation": gen, "inputs": inputs,
			"question": q.ID, "split": split, "step": s, "work": work,
		})
		if err != nil {
			return err
		}
		c.planMu.Lock()
		c.planRows = append(c.planRows, row)
		if s == lSteps-1 {
			c.finalWork[cand+"/"+q.ID] = work
		}
		c.planMu.Unlock()
		prevText = text
		c.e.mu.Lock()
		prevResult = c.e.facts[work].result
		c.e.mu.Unlock()
	}
	return nil
}

func (c *climb) score(cand string, qs []question) (int, error) {
	correct := 0
	for _, q := range qs {
		c.planMu.Lock()
		work := c.finalWork[cand+"/"+q.ID]
		c.planMu.Unlock()
		if work == "" {
			return 0, fmt.Errorf("no final work recorded for %s on %s", cand[:12], q.ID)
		}
		data, err := os.ReadFile(filepath.Join(c.e.outputs, work+".txt"))
		if err != nil {
			return 0, err
		}
		if normalize(string(data)) == q.Answer {
			correct++
		}
	}
	return correct, nil
}

// ---------- mutations: LLM-proposed, receipted, repaired ----------

// stepSchedule biases mutations toward late steps: the cone a child
// re-buys runs from its mutated step to the end, and the reuse floor
// (3.0x) is priced on these cones.
func stepSchedule(gen int) []int {
	if gen == 1 {
		return []int{2, 3, 3, 2, 3}
	}
	return []int{2, 3, 3, 3}
}

func (c *climb) proposeChildren(gen int, parents []string, scores map[string]int) ([]string, error) {
	need := kPopulation - len(parents)
	sched := stepSchedule(gen)
	children := make([]string, 0, need)
	for n := 0; n < need; n++ {
		parent := parents[n%len(parents)]
		target := sched[n]
		via, err := digestOf(map[string]any{
			"attempt": n, "generation": gen, "kind": "mutation-proposal", "seed": runSeed,
		})
		if err != nil {
			return nil, err
		}
		prompt := proposalPrompt(c.specs[parent], target, scores[parent], gen, n)
		text, err := c.e.ensure(via, "mutator", prompt, stepParams{MaxTokens: 1200})
		if err != nil {
			return nil, err
		}
		steps, err := c.deriveChild(parent, target, text)
		if err != nil {
			return nil, err
		}
		child, err := c.addCandidate(steps)
		if err != nil {
			return nil, err
		}
		if err := c.ensureMutation(child, parent, via); err != nil {
			return nil, err
		}
		children = append(children, child)
	}
	return children, nil
}

type proposal struct {
	Template string `json:"template"`
	Params   struct {
		MaxTokens      int `json:"max_tokens"`
		ThinkingBudget int `json:"thinking_budget"`
	} `json:"params"`
}

func parseProposal(text string) (proposal, bool) {
	var p proposal
	i := strings.Index(text, "{")
	j := strings.LastIndex(text, "}")
	if i < 0 || j <= i {
		return p, false
	}
	if err := json.Unmarshal([]byte(text[i:j+1]), &p); err != nil {
		return p, false
	}
	if strings.Count(p.Template, placeholder) != 1 || len(p.Template) > 4000 {
		return p, false
	}
	// Bounds tighter than the manifest cap: a maximal cone at the cap
	// could trip the spend law mid-run and waste the budget on a
	// partial bundle. 6000 thinking is the calibration ceiling probe.
	// Thinking must leave >= 2000 visible tokens — attempt 2's winner
	// ran 5000 thinking inside 6000 max_tokens, squeezing the working.
	mt, tb := p.Params.MaxTokens, p.Params.ThinkingBudget
	if mt < 256 || mt > 12000 {
		return p, false
	}
	if tb != 0 && (tb < 1024 || tb > 6000 || mt-tb < 2000) {
		return p, false
	}
	return p, true
}

// deriveChild turns a proposal receipt into exactly one fresh child:
// an unusable or duplicate proposal is repaired by deterministic
// params bumps at the target step, so every proposal receipt is
// demanded by a mutation fact and the replay stays deterministic.
func (c *climb) deriveChild(parent string, target int, text string) ([]stepSpec, error) {
	base := c.specs[parent]
	if prop, ok := parseProposal(text); ok {
		params, err := makeParams(prop.Params.MaxTokens, prop.Params.ThinkingBudget)
		if err != nil {
			return nil, err
		}
		cand := append([]stepSpec(nil), base...)
		cand[target] = stepSpec{Model: model, Params: params, Template: prop.Template}
		digest, err := digestOf(map[string]any{"steps": cand})
		if err != nil {
			return nil, err
		}
		if _, seen := c.specs[digest]; !seen {
			return cand, nil
		}
	}
	var p stepParams
	if err := json.Unmarshal(base[target].Params, &p); err != nil {
		return nil, err
	}
	mt, tb := p.MaxTokens, p.ThinkingBudget
	for k := 0; k < 4096; k++ {
		mt += 64
		if mt > capMaxOutTok {
			mt = 256
		}
		if tb >= mt {
			tb = 0
		}
		params, err := makeParams(mt, tb)
		if err != nil {
			return nil, err
		}
		cand := append([]stepSpec(nil), base...)
		cand[target] = stepSpec{Model: model, Params: params, Template: base[target].Template}
		digest, err := digestOf(map[string]any{"steps": cand})
		if err != nil {
			return nil, err
		}
		if _, seen := c.specs[digest]; !seen {
			return cand, nil
		}
	}
	return nil, errors.New("could not derive a unique child")
}

func proposalPrompt(steps []stepSpec, target, devScore, gen, n int) string {
	var b strings.Builder
	fmt.Fprintf(&b, "You are mutating one step of a %d-step LLM pipeline that solves competition math problems (AIME/HMMT, exact integer answers) running on %s.\n\n", lSteps, model)
	fmt.Fprintf(&b, "Generation %d, proposal %d. The candidate you are mutating currently scores %d/40 on the dev set.\n\nCurrent pipeline:\n", gen, n, devScore)
	for i, s := range steps {
		fmt.Fprintf(&b, "Step %d params=%s template:\n<<<%s>>>\n\n", i, s.Params, s.Template)
	}
	fmt.Fprintf(&b, "Propose ONE improved replacement for step %d only. You may rewrite its template, change its params, or both.\n", target)
	b.WriteString(`Rules:
- The template MUST contain the placeholder {{INPUT}} exactly once. At step 0 it receives the problem statement; at later steps it receives the previous step's raw output.
- The pipeline is scored by extracting the LAST integer of the final step's output and comparing exact-match, so the pipeline must end with a bare integer.
- params.max_tokens: integer in [256, 12000]. params.thinking_budget: 0 (off) or an integer in [1024, 6000]; when thinking is on, max_tokens must exceed thinking_budget by at least 2000 so the visible working is never squeezed out. Enabling thinking makes the model reason privately before answering — more accurate on hard math, more expensive.
- Measured on this benchmark: the largest gains come from a large thinking budget (5000-6000) on the solving step with max_tokens comfortably above it (e.g. thinking 6000, max_tokens 9000), and from making the final step extraction-proof (it must end with ONLY the bare integer). Prefer robust, general improvements over clever wording.

Reply with ONLY a JSON object, no prose:
{"template":"...","params":{"max_tokens":N,"thinking_budget":M}}`)
	return b.String()
}

// ---------- corpus, split, seed ----------

func loadCorpus(bundle string, fake bool) ([]byte, []question, error) {
	path := filepath.Join(bundle, "corpus.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		if !fake {
			return nil, nil, fmt.Errorf("corpus.json missing — run `climb fetch %s` first: %w", bundle, err)
		}
		raw, err = fakeCorpus()
		if err != nil {
			return nil, nil, err
		}
		if err := os.WriteFile(path, raw, 0o644); err != nil {
			return nil, nil, err
		}
	}
	if !fake && canonical.DigestHex(raw) != pinnedCorpusSHA {
		return nil, nil, fmt.Errorf("corpus digest %s != pinned %s — refusing", canonical.DigestHex(raw), pinnedCorpusSHA)
	}
	var qs []question
	if err := json.Unmarshal(raw, &qs); err != nil {
		return nil, nil, err
	}
	return raw, qs, nil
}

// deriveSplit mirrors the verifier: per tier, order ids by
// H({id, seed}); the first holdout_per_tier[source] are holdout.
func deriveSplit(qs []question) (dev, hold []question, err error) {
	tiers := make(map[string][]question)
	for _, q := range qs {
		tiers[q.Source] = append(tiers[q.Source], q)
	}
	holdSet := make(map[string]bool)
	for source, tier := range tiers {
		n, ok := holdoutPerTier[source]
		if !ok {
			return nil, nil, fmt.Errorf("unknown corpus tier %q", source)
		}
		type ranked struct{ key, id string }
		rankedIDs := make([]ranked, 0, len(tier))
		for _, q := range tier {
			key, err := digestOf(map[string]any{"id": q.ID, "seed": runSeed})
			if err != nil {
				return nil, nil, err
			}
			rankedIDs = append(rankedIDs, ranked{key, q.ID})
		}
		sort.Slice(rankedIDs, func(i, j int) bool { return rankedIDs[i].key < rankedIDs[j].key })
		for i := 0; i < n; i++ {
			holdSet[rankedIDs[i].id] = true
		}
	}
	for _, q := range qs {
		if holdSet[q.ID] {
			hold = append(hold, q)
		} else {
			dev = append(dev, q)
		}
	}
	return dev, hold, nil
}

func seedSteps() []stepSpec {
	templates := []string{
		"Read this competition math problem. List every given quantity and condition, and state precisely what is being asked.\n\nProblem: " + placeholder,
		"Write a short numbered plan for solving the problem based on this analysis:\n" + placeholder,
		"Carry out the plan step by step, showing all work, and finish with the final answer:\n" + placeholder,
		"From the working above, state ONLY the final answer as a single integer, with no words, units, or punctuation:\n" + placeholder,
	}
	steps := make([]stepSpec, lSteps)
	for i, t := range templates {
		params, err := makeParams(1600, 0)
		if err != nil {
			panic(err) // literal input; unreachable
		}
		steps[i] = stepSpec{Model: model, Params: params, Template: t}
	}
	return steps
}

// ---------- bundle export ----------

func (c *climb) writeBundle() error {
	plan := bytes.Join(c.planRows, []byte("\n"))
	if err := os.WriteFile(filepath.Join(c.bundle, "plan.ndjson"), append(plan, '\n'), 0o644); err != nil {
		return err
	}
	var candLines [][]byte
	for _, d := range c.candOrder {
		row, err := canonicalJSON(map[string]any{"digest": d, "steps": c.specs[d]})
		if err != nil {
			return err
		}
		candLines = append(candLines, row)
	}
	cands := bytes.Join(candLines, []byte("\n"))
	if err := os.WriteFile(filepath.Join(c.bundle, "candidates.ndjson"), append(cands, '\n'), 0o644); err != nil {
		return err
	}
	man, err := canonicalJSON(map[string]any{
		"caps": map[string]any{
			"max_calls": capMaxCalls, "max_output_tokens": capMaxOutTok,
			"max_spend_usd_nano": capSpendNano,
		},
		"corpus_sha256":    c.corpusSHA,
		"generations":      generations,
		"holdout_per_tier": holdoutPerTier,
		"k_population":     kPopulation,
		"k_survivors":      kSurvivors,
		"l":                lSteps,
		"model":            model,
		"prices": map[string]any{
			"input_nano_per_token": priceInNano, "output_nano_per_token": priceOutNano,
		},
		"seed":           runSeed,
		"seed_candidate": c.candOrder[0],
	})
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(c.bundle, "manifest.json"), man, 0o644)
}

// ---------- canonical helpers ----------

func canonicalJSON(v any) ([]byte, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	return canonical.Canonicalize(raw)
}

func digestOf(v any) (string, error) {
	encoded, err := canonicalJSON(v)
	if err != nil {
		return "", err
	}
	return canonical.DigestHex(encoded), nil
}

func makeParams(maxTokens, thinkingBudget int) (json.RawMessage, error) {
	return canonicalJSON(map[string]any{
		"max_tokens": maxTokens, "thinking_budget": thinkingBudget,
	})
}

// normalize mirrors the frozen acceptor in go/gauntlet/climb.go — the
// verifier's copy is the law; this one only predicts it.
var (
	bareIntRe = regexp.MustCompile(`^-?\d+$`)
	anyIntRe  = regexp.MustCompile(`-?\d+`)
)

func normalize(text string) string {
	s := strings.TrimSpace(text)
	s = strings.ReplaceAll(s, "$", "")
	s = strings.ReplaceAll(s, ",", "")
	s = strings.TrimSuffix(strings.TrimSpace(s), ".")
	s = strings.TrimSpace(s)
	if bareIntRe.MatchString(s) {
		return s
	}
	all := anyIntRe.FindAllString(s, -1)
	if len(all) == 0 {
		return ""
	}
	return all[len(all)-1]
}
