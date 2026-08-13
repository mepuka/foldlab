package protod

import (
	"context"
	"testing"
)

func TestStructureMatchCoWalk(t *testing.T) {
	pattern := map[string]any{
		"k": "struct",
		"fields": map[string]any{
			"id": map[string]any{"k": "brand", "name": "Id", "of": map[string]any{"k": "hole"}},
			"state": map[string]any{
				"k":  "union",
				"of": []any{map[string]any{"k": "literal", "value": "on"}, map[string]any{"k": "hole"}},
			},
		},
		"optional": []any{"state"},
	}
	candidate := map[string]any{
		"k": "struct",
		"fields": map[string]any{
			"id": map[string]any{"k": "brand", "name": "Id", "of": map[string]any{"k": "string"}},
			"state": map[string]any{
				"k":  "union",
				"of": []any{map[string]any{"k": "bool"}, map[string]any{"k": "literal", "value": "on"}},
			},
		},
		"optional": []any{"state"},
	}
	if !structureMatch(pattern, candidate) {
		t.Fatal("wildcard co-walk refused a matching structure")
	}
	candidate["fields"].(map[string]any)["id"] = map[string]any{
		"k": "brand", "name": "OtherId", "of": map[string]any{"k": "string"},
	}
	if structureMatch(pattern, candidate) {
		t.Fatal("co-walk ignored a decided brand name")
	}
	if structureMatch(map[string]any{"k": "hole"}, map[string]any{"k": "wat"}) {
		t.Fatal("hole wildcard admitted a value outside the decided grammar")
	}
}

func TestCatalogQueryDigestPin(t *testing.T) {
	got, err := catalogQueryDigest(map[string]any{"k": "list", "of": map[string]any{"k": "hole"}})
	if err != nil {
		t.Fatal(err)
	}
	const want = "144fdcb391bd9f07369ddd065ed4dd5337e33e32f3ea173101c4edcf2e92a103"
	if got != want {
		t.Fatalf("query digest = %s, want %s", got, want)
	}
}

func TestCatalogQueryCacheIsKeyedByDigestAndHead(t *testing.T) {
	daemon, err := Acquire(context.Background(), Options{StoreDir: t.TempDir()})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(daemon.Release)
	pattern := map[string]any{"k": "hole"}

	if _, _, refusal, err := daemon.catalog.create(
		context.Background(), map[string]any{"k": "string"}, "", "cache-test",
	); err != nil || refusal != nil {
		t.Fatalf("create first: refusal=%v err=%v", refusal, err)
	}
	first, firstHead, queryDigest, err := daemon.catalog.query(pattern)
	if err != nil {
		t.Fatal(err)
	}
	if len(daemon.catalog.queries) != 1 {
		t.Fatalf("first query stored %d keys, want 1", len(daemon.catalog.queries))
	}
	first[0].Digest = "caller-mutation"
	second, repeatedHead, repeatedDigest, err := daemon.catalog.query(pattern)
	if err != nil {
		t.Fatal(err)
	}
	if len(daemon.catalog.queries) != 1 || repeatedHead != firstHead || repeatedDigest != queryDigest {
		t.Fatalf("same immutable key missed cache: keys=%d heads=%q/%q digests=%q/%q",
			len(daemon.catalog.queries), firstHead, repeatedHead, queryDigest, repeatedDigest)
	}
	if second[0].Digest == "caller-mutation" {
		t.Fatal("caller mutated cached certificate row")
	}

	if _, _, refusal, err := daemon.catalog.create(
		context.Background(), map[string]any{"k": "bool"}, "", "cache-test",
	); err != nil || refusal != nil {
		t.Fatalf("create second: refusal=%v err=%v", refusal, err)
	}
	third, nextHead, nextDigest, err := daemon.catalog.query(pattern)
	if err != nil {
		t.Fatal(err)
	}
	if len(daemon.catalog.queries) != 2 || nextHead == firstHead || nextDigest != queryDigest || len(third) != 2 {
		t.Fatalf("new head did not create exactly one immutable cache key: keys=%d heads=%q/%q digest=%q rows=%d",
			len(daemon.catalog.queries), firstHead, nextHead, nextDigest, len(third))
	}
}
