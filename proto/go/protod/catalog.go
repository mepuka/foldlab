package protod

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"sync"

	"github.com/nats-io/nats.go/jetstream"

	"foldlab/journal"
)

// The catalog is just a journal (the same hash-chained CAS-append
// substrate) plus a resolve index rebuilt by verify-on-read. Every
// digest committed here was re-derived by this daemon from submitted
// bytes — no asserted identity, ever (W1). Same-bytes resubmission
// converges by content address (W3).

const catalogJournalName = "catalog"

type catalogFact struct {
	Digest    string `json:"digest"`
	Scheme    string `json:"scheme"`
	Structure any    `json:"structure"`
	Submitter string `json:"submitter"`
	seq       int64
}

type catalog struct {
	mu       sync.Mutex
	journal  *journal.Journal
	byDigest map[string]catalogFact
}

func openCatalog(ctx context.Context, js jetstream.JetStream) (*catalog, error) {
	opened, err := journal.Open(ctx, js, catalogJournalName)
	if err != nil {
		return nil, err
	}
	c := &catalog{journal: opened, byDigest: map[string]catalogFact{}}
	entries, _, err := opened.Read(ctx, journal.Cursor{Seq: -1, Head: genesis}, 0)
	if err != nil {
		return nil, fmt.Errorf("rebuild catalog index: %w", err)
	}
	for _, entry := range entries {
		var fact catalogFact
		if err := json.Unmarshal([]byte(entry.Payload), &fact); err != nil {
			return nil, fmt.Errorf("catalog entry %d is not a fact: %w", entry.Seq, err)
		}
		fact.seq = entry.Seq
		c.byDigest[fact.Digest] = fact
	}
	return c, nil
}

func (c *catalog) resolve(digest string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	_, known := c.byDigest[digest]
	return known
}

func (c *catalog) resolvableDigests(limit int) []string {
	c.mu.Lock()
	defer c.mu.Unlock()
	digests := make([]string, 0, len(c.byDigest))
	for digest := range c.byDigest {
		digests = append(digests, digest)
	}
	sort.Strings(digests)
	if len(digests) > limit {
		digests = digests[:limit]
	}
	return digests
}

// create canonicalizes, derives, converges or appends. The refusal
// return is data; error is reserved for substrate failure (JetStream
// down), which surfaces as a NATS-level timeout, never a domain no.
func (c *catalog) create(
	ctx context.Context,
	structure any,
	asserted string,
	submitter string,
) (fact catalogFact, created bool, refusal *Refusal, err error) {
	result, walkRefusal := walkStructure(structure, []string{"structure"})
	if walkRefusal != nil {
		return catalogFact{}, false, walkRefusal, nil
	}
	for _, ref := range result.refs {
		if !c.resolve(ref.digest) {
			return catalogFact{}, false, &Refusal{
				Kind:     KindUnknownRef,
				Law:      "W4/DAG: refs must resolve to cataloged digests — no forward refs, no cycles, no admission on faith",
				Path:     ref.path,
				Got:      ref.digest,
				Expected: "a digest already committed to the catalog",
				Next: []NextHint{
					{
						Subject: SubjectTypeCreate,
						Note:    "create the referenced type first, then resubmit this one",
					},
					readCatalogHint(),
				},
			}, nil
		}
	}

	bytes, err := canonicalBytes(structure)
	if err != nil {
		// The walk admits only decoded JSON, so the canonical domain
		// cannot be escaped here; treat failure as substrate.
		return catalogFact{}, false, nil, err
	}
	derived := activeScheme.Derive(bytes)
	if asserted != "" && asserted != derived {
		return catalogFact{}, false, &Refusal{
			Kind:     KindDigestMismatch,
			Law:      "W1: no asserted identity — every committed digest is recomputed by the daemon from submitted bytes",
			Path:     []string{"assertedDigest"},
			Got:      asserted,
			Expected: derived,
			Next: []NextHint{
				{
					Subject: SubjectTypeCreate,
					Note:    "drop assertedDigest (the daemon derives it), or assert the expected value",
				},
			},
		}, nil
	}

	// Canonical structure value: what the digest actually commits to.
	var canonicalValue any
	if err := json.Unmarshal(bytes, &canonicalValue); err != nil {
		return catalogFact{}, false, nil, err
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if existing, known := c.byDigest[derived]; known {
		return existing, false, nil, nil
	}

	fact = catalogFact{
		Digest:    derived,
		Scheme:    activeScheme.Name(),
		Structure: canonicalValue,
		Submitter: submitter,
	}
	payload, err := canonicalBytes(map[string]any{
		"digest":    fact.Digest,
		"scheme":    fact.Scheme,
		"structure": fact.Structure,
		"submitter": fact.Submitter,
	})
	if err != nil {
		return catalogFact{}, false, nil, err
	}
	entry, _, err := c.journal.Append(ctx, string(payload))
	if err != nil {
		return catalogFact{}, false, nil, err
	}
	fact.seq = entry.Seq
	c.byDigest[fact.Digest] = fact
	return fact, true, nil, nil
}

func readCatalogHint() NextHint {
	return NextHint{
		Subject: SubjectJournalRead,
		Note:    "read the catalog — it is just a journal; verify the head locally",
		Body: map[string]any{
			"journal": catalogJournalName,
			"from":    map[string]any{"seq": -1, "head": genesis},
			"max":     0,
		},
	}
}
