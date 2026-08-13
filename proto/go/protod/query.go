package protod

import (
	"bytes"
	"fmt"
	"sort"

	"foldlab/canonical"
)

type typeGetRequest struct {
	Digest string `json:"digest"`
}

type typeGetReply struct {
	OK          bool       `json:"ok"`
	Digest      string     `json:"digest"`
	Scheme      string     `json:"scheme"`
	Structure   any        `json:"structure"`
	CatalogSeq  int64      `json:"catalogSeq"`
	CatalogHead string     `json:"catalogHead"`
	Next        []NextHint `json:"next"`
}

type catalogQueryRequest struct {
	Pattern any `json:"pattern"`
}

type catalogQueryReply struct {
	OK              bool         `json:"ok"`
	Results         []catalogRow `json:"results"`
	OverCatalogHead string       `json:"overCatalogHead"`
	QueryDigest     string       `json:"queryDigest"`
	Next            []NextHint   `json:"next"`
}

// catalogRow is a certificate, not a hint: its digest is re-derivable from
// Structure, and (CatalogSeq, CatalogHead) identifies the exact catalog prefix
// that first committed it.
type catalogRow struct {
	Digest      string `json:"digest"`
	Scheme      string `json:"scheme"`
	Structure   any    `json:"structure"`
	CatalogSeq  int64  `json:"catalogSeq"`
	CatalogHead string `json:"catalogHead"`
}

func (d *Daemon) serveTypeGet(body []byte) any {
	var request typeGetRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireRequestFields(body, "digest"); refusal != nil {
		return refuse(refusal)
	}
	if !hexDigest.MatchString(request.Digest) {
		return refuse(&Refusal{
			Kind:     KindMalformed,
			Law:      "type.get addresses one catalog certificate by its structural digest",
			Path:     []string{"digest"},
			Got:      request.Digest,
			Expected: "64 lowercase hexadecimal characters",
			Example:  map[string]any{"digest": "0000000000000000000000000000000000000000000000000000000000000000"},
			Next:     []NextHint{readCatalogHint(), describeHint()},
		})
	}
	row, known := d.catalog.get(request.Digest)
	if !known {
		return refuse(&Refusal{
			Kind:     KindUnknownIdentity,
			Law:      "absence is typed: this digest has no certificate in this catalog",
			Path:     []string{"digest"},
			Got:      request.Digest,
			Expected: "a digest committed to the catalog",
			Next: []NextHint{
				{Subject: SubjectTypeCreate, Note: "create the structure first; the daemon derives its digest"},
				readCatalogHint(),
			},
		})
	}
	return typeGetReply{
		OK:          true,
		Digest:      row.Digest,
		Scheme:      row.Scheme,
		Structure:   row.Structure,
		CatalogSeq:  row.CatalogSeq,
		CatalogHead: row.CatalogHead,
		Next: []NextHint{
			{Subject: SubjectCatalogQuery, Note: "query the catalog by a partial structure pattern"},
			readCatalogHint(),
		},
	}
}

func (d *Daemon) serveCatalogQuery(body []byte) any {
	var request catalogQueryRequest
	if refusal := decodeBody(body, &request); refusal != nil {
		return refuse(refusal)
	}
	if refusal := requireRequestFields(body, "pattern"); refusal != nil {
		return refuse(refusal)
	}
	if request.Pattern == nil {
		return refuse(&Refusal{
			Kind:     KindMalformed,
			Law:      "catalog.query carries an flb.type.v0 partial in \"pattern\"",
			Path:     []string{"pattern"},
			Expected: "an flb.type.v0 partial node; holes are wildcards",
			Example:  map[string]any{"pattern": map[string]any{"k": "hole"}},
			Next:     []NextHint{describeHint()},
		})
	}
	result, walkRefusal := walkPartial(request.Pattern, []string{"pattern"})
	if walkRefusal != nil {
		return refuse(walkRefusal)
	}
	for _, ref := range result.refs {
		if !d.catalog.resolve(ref.digest) {
			return refuse(&Refusal{
				Kind:     KindUnknownRef,
				Law:      "W4/DAG: refs in a catalog query pattern resolve before the fold runs",
				Path:     ref.path,
				Got:      ref.digest,
				Expected: "a digest already committed to the catalog",
				Next: []NextHint{
					{Subject: SubjectTypeCreate, Note: "create the referenced type first, then repeat the query"},
					readCatalogHint(),
				},
			})
		}
	}

	rows, head, digest, err := d.catalog.query(request.Pattern)
	if err != nil {
		return nil
	}
	next := []NextHint{readCatalogHint(), describeHint()}
	if len(rows) > 0 {
		next = append([]NextHint{{
			Subject: SubjectTypeGet,
			Note:    "re-read any result as one independently re-derivable certificate",
			Body:    map[string]any{"digest": rows[0].Digest},
		}}, next...)
	}
	return catalogQueryReply{
		OK:              true,
		Results:         rows,
		OverCatalogHead: head,
		QueryDigest:     digest,
		Next:            next,
	}
}

func rowFromFact(fact catalogFact) catalogRow {
	return catalogRow{
		Digest:      fact.Digest,
		Scheme:      fact.Scheme,
		Structure:   fact.Structure,
		CatalogSeq:  fact.seq,
		CatalogHead: fact.head,
	}
}

func (c *catalog) get(digest string) (catalogRow, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	fact, ok := c.byDigest[digest]
	if !ok {
		return catalogRow{}, false
	}
	return rowFromFact(fact), true
}

// query folds the catalog journal into a sorted unique digest set and returns
// the corresponding certificate rows. The in-memory facts slice is rebuilt
// solely from verified journal entries at open and extended only after a
// durable catalog append, so it is exactly the journal fold state. setUnion's
// generated commutativity and idempotence laws license independence from
// arrival order and duplicate delivery.
func (c *catalog) query(pattern any) ([]catalogRow, string, string, error) {
	digest, err := catalogQueryDigest(pattern)
	if err != nil {
		return nil, "", "", err
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	head := c.journal.Head().Head
	key := digest + "\x00" + head
	if cached, ok := c.queries[key]; ok {
		return append([]catalogRow(nil), cached...), head, digest, nil
	}

	rows := make([]catalogRow, 0)
	for _, fact := range c.facts {
		if structureMatch(pattern, fact.Structure) {
			rows = append(rows, rowFromFact(fact))
		}
	}
	sort.Slice(rows, func(i, j int) bool { return rows[i].Digest < rows[j].Digest })
	c.queries[key] = append([]catalogRow(nil), rows...)
	return append([]catalogRow(nil), rows...), head, digest, nil
}

// The digest is byte-identical to
// defineFold(algebras.setUnion, steps.structureMatches(pattern)) on the TS
// side. No Go behavior is trusted as a port: the shared query fixture walls
// the two independently.
func catalogQueryDigest(pattern any) (string, error) {
	stepBytes, err := canonicalBytes(map[string]any{
		"v":       "foldlab.step.v1",
		"op":      "structureMatches",
		"pattern": pattern,
	})
	if err != nil {
		return "", fmt.Errorf("encode catalog query step: %w", err)
	}
	stepDigest := canonical.DigestHex(stepBytes)
	foldBytes, err := canonicalBytes(map[string]any{
		"v": "foldlab.fold.v1",
		"algebra": map[string]any{
			"v":         "foldlab.algebra.v1",
			"op":        "setUnion",
			"semantics": "sorted-unique-unicode-strings-utf16",
		},
		"stepDigest": stepDigest,
	})
	if err != nil {
		return "", fmt.Errorf("encode catalog query fold: %w", err)
	}
	return canonical.DigestHex(foldBytes), nil
}

func structureMatch(pattern any, candidate any) bool {
	p, ok := pattern.(map[string]any)
	if !ok {
		return false
	}
	c, ok := candidate.(map[string]any)
	if !ok {
		return false
	}
	pk, ok := p["k"].(string)
	if !ok {
		return false
	}
	if pk == "hole" {
		if !keysEqual(p, "k") {
			return false
		}
		_, refusal := walkStructure(candidate, nil)
		return refusal == nil
	}
	ck, ok := c["k"].(string)
	if !ok || pk != ck {
		return false
	}

	switch pk {
	case "string", "bool", "int", "float", "null", "opaque":
		return keysEqual(p, "k") && keysEqual(c, "k")
	case "literal":
		return keysEqual(p, "k", "value") && keysEqual(c, "k", "value") &&
			canonicalEqual(p["value"], c["value"])
	case "list":
		return keysEqual(p, "k", "of") && keysEqual(c, "k", "of") &&
			structureMatch(p["of"], c["of"])
	case "struct":
		return matchStruct(p, c)
	case "union":
		patterns, pok := p["of"].([]any)
		candidates, cok := c["of"].([]any)
		if !pok || !cok || !keysEqual(p, "k", "of") || !keysEqual(c, "k", "of") {
			return false
		}
		decided := make([]any, 0, len(patterns))
		holes := make([]any, 0, len(patterns))
		for _, member := range patterns {
			node, _ := member.(map[string]any)
			if node != nil && node["k"] == "hole" {
				holes = append(holes, member)
			} else {
				decided = append(decided, member)
			}
		}
		return matchUnordered(append(decided, holes...), candidates)
	case "brand":
		return keysEqual(p, "k", "name", "of") && keysEqual(c, "k", "name", "of") &&
			p["name"] == c["name"] && structureMatch(p["of"], c["of"])
	case "check":
		return keysEqual(p, "k", "base", "check") && keysEqual(c, "k", "base", "check") &&
			canonicalEqual(p["check"], c["check"]) && structureMatch(p["base"], c["base"])
	case "ref":
		return keysEqual(p, "k", "digest") && keysEqual(c, "k", "digest") &&
			p["digest"] == c["digest"]
	default:
		return false
	}
}

func matchStruct(pattern map[string]any, candidate map[string]any) bool {
	pf, pok := pattern["fields"].(map[string]any)
	cf, cok := candidate["fields"].(map[string]any)
	if !pok || !cok || len(pf) != len(cf) {
		return false
	}
	if _, present := pattern["optional"]; present {
		if _, candidatePresent := candidate["optional"]; !candidatePresent {
			return false
		}
	} else if _, candidatePresent := candidate["optional"]; candidatePresent {
		return false
	}
	if !canonicalEqual(pattern["optional"], candidate["optional"]) {
		return false
	}
	for name, child := range pf {
		other, present := cf[name]
		if !present || !structureMatch(child, other) {
			return false
		}
	}
	return true
}

func matchUnordered(patterns []any, candidates []any) bool {
	if len(patterns) != len(candidates) {
		return false
	}
	if len(patterns) == 0 {
		return true
	}
	for index, candidate := range candidates {
		if !structureMatch(patterns[0], candidate) {
			continue
		}
		remaining := make([]any, 0, len(candidates)-1)
		remaining = append(remaining, candidates[:index]...)
		remaining = append(remaining, candidates[index+1:]...)
		if matchUnordered(patterns[1:], remaining) {
			return true
		}
	}
	return false
}

func keysEqual(value map[string]any, expected ...string) bool {
	if len(value) != len(expected) {
		return false
	}
	for _, key := range expected {
		if _, present := value[key]; !present {
			return false
		}
	}
	return true
}

func canonicalEqual(left any, right any) bool {
	leftBytes, leftErr := canonicalBytes(left)
	rightBytes, rightErr := canonicalBytes(right)
	return leftErr == nil && rightErr == nil && bytes.Equal(leftBytes, rightBytes)
}
