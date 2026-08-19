# Regeneration, determinism and mutation arms

Reproduce with `scratch/dev-goast/measure.sh`. Toolchain: `go version go1.26.5 darwin/arm64`.

## gofmt over the whole Go module

```
$ cd go && gofmt -l .
(nothing printed => every file in go/, generated and hand-written, is a gofmt fixed point)
```

## Two-run byte-identity and committed-versus-fresh

```
committed  5d19cc38470a130a041261f8c9361d438298aad45177034550b63dc271d30426
fresh run1 5d19cc38470a130a041261f8c9361d438298aad45177034550b63dc271d30426
fresh run2 5d19cc38470a130a041261f8c9361d438298aad45177034550b63dc271d30426
=> byte-identical on all three
```

## Mutation arms — one corpus field, measured in moved lines of Go

### One character inside one docstring

```
the emission moved on 2 lines:
-	{Name: "DeclKind", Doc: "The closed universe of declaration kinds. One brand per kind: a\ndigest is always the digest of a declaration of a known kind. "},
+	{Name: "DeclKind", Doc: "The closed universe of declaration KINDS. One brand per kind: a\ndigest is always the digest of a declaration of a known kind. "},
```

### One kind name widened by a character (schema -> schemas) — the elastic column repads

```
the emission moved on 12 lines:
-	KindSchema     DeclKind = 0
+	KindSchemas    DeclKind = 0
-	"schema",
+	"schemas",
-//foldlab:brand schema
-type SchemaDigest uint64
+//foldlab:brand schemas
+type SchemasDigest uint64
-func NewSchemaDigest(id uint64) SchemaDigest         { return SchemaDigest(id) }
+func NewSchemasDigest(id uint64) SchemasDigest       { return SchemasDigest(id) }
-	"SchemaDigest",
+	"SchemasDigest",
```

### One kind renamed with a cross-reference left dangling (lane -> vein)

```
the generator REFUSED:
REFUSED: /var/folders/_2/d22zd5lj2_v9xrps05xl2sr80000gn/T/tmp.dCVb4OxB06/packages/plait/fixtures/kernel-conformance.ndjson: type LanePartition.mk.lane: reference "Digest(lane)" has the brand argument "lane", which is neither a DeclKind constructor name nor a preceding field or param
exit status 1
```

## Corpus reach into the emission

```
generated-file lines                                     695
lines carrying a verbatim corpus scalar (len>=4)          403
further lines carrying a kmgen-minted identifier          36
corpus-reached lines                                      439 (63.2%)
generator template text alone                             256 (36.8%)
distinct corpus scalars 284; distinct minted identifiers 129
```
