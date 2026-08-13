package protod_test

import (
	"sort"
	"strings"
	"testing"
)

func resultRows(t *testing.T, result reply) []map[string]any {
	t.Helper()
	raw, ok := result["results"].([]any)
	if !ok {
		t.Fatalf("query results are not an array: %v", result)
	}
	rows := make([]map[string]any, len(raw))
	for index, value := range raw {
		row, ok := value.(map[string]any)
		if !ok {
			t.Fatalf("query result %d is not a certificate row: %v", index, value)
		}
		rows[index] = row
	}
	return rows
}

func TestCatalogQueryFoldAndTypeGet(t *testing.T) {
	h := acquire(t)
	structures := []map[string]any{
		{"k": "string"},
		{"k": "list", "of": map[string]any{"k": "string"}},
		{"k": "list", "of": map[string]any{"k": "bool"}},
		{"k": "brand", "name": "Id", "of": map[string]any{"k": "string"}},
	}
	digests := make([]string, 0, len(structures))

	// R1 at every journal prefix: recompute the whole wildcard fold from the
	// journal and require exact equality with the returned set at its named head.
	for _, structure := range structures {
		created := h.create(structure)
		if created["ok"] != true {
			t.Fatalf("create refused: %v", created)
		}
		digests = append(digests, created["digest"].(string))
		query := h.request("flb.req.catalog.query", map[string]any{
			"pattern": map[string]any{"k": "hole"},
		})
		if query["ok"] != true {
			t.Fatalf("query refused: %v", query)
		}
		rows := resultRows(t, query)
		got := make([]string, len(rows))
		for index, row := range rows {
			got[index] = row["digest"].(string)
			if digestOf(t, row["structure"]) != got[index] {
				t.Fatalf("row %d does not re-derive: %v", index, row)
			}
		}
		want := append([]string(nil), digests...)
		sort.Strings(want)
		if strings.Join(got, ",") != strings.Join(want, ",") {
			t.Fatalf("prefix fold = %v, want %v", got, want)
		}
		read := h.request("flb.req.journal.read", map[string]any{"journal": "catalog"})
		if query["overCatalogHead"] != read["head"] {
			t.Fatalf("query names head %v, verified read names %v", query["overCatalogHead"], read["head"])
		}
	}

	query := h.request("flb.req.catalog.query", map[string]any{
		"pattern": map[string]any{"k": "list", "of": map[string]any{"k": "hole"}},
	})
	rows := resultRows(t, query)
	wantLists := []string{digests[1], digests[2]}
	sort.Strings(wantLists)
	gotLists := make([]string, len(rows))
	for index, row := range rows {
		gotLists[index] = row["digest"].(string)
	}
	if strings.Join(gotLists, ",") != strings.Join(wantLists, ",") {
		t.Fatalf("list wildcard query returned %v", rows)
	}
	for _, row := range rows {
		got := h.request("flb.req.type.get", map[string]any{"digest": row["digest"]})
		if got["ok"] != true || got["digest"] != row["digest"] || got["catalogHead"] != row["catalogHead"] {
			t.Fatalf("type.get disagrees with query certificate: get=%v row=%v", got, row)
		}
		if digestOf(t, got["structure"]) != got["digest"] {
			t.Fatalf("type.get row does not re-derive: %v", got)
		}
	}

	h.refusal(h.request("flb.req.type.get", map[string]any{"digest": strings.Repeat("f", 64)}), "unknown-identity")
	h.refusal(h.request("flb.req.type.get", map[string]any{"digest": "nope"}), "malformed")
	h.refusal(h.request("flb.req.catalog.query", map[string]any{"pattern": map[string]any{"k": "wat"}}), "invalid-structure")
	h.refusal(h.request("flb.req.catalog.query", map[string]any{
		"pattern": map[string]any{"k": "ref", "digest": strings.Repeat("f", 64)},
	}), "unknown-ref")
}
