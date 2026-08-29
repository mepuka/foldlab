## Unison SQLite codebase store — schema map

Repo HEAD: `84b95a6` (2026-08-19). All paths absolute.

---

### 1. Schema files and current version

**Base schema (v3 baseline):** `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\sql\create.sql` — 329 lines, header comment `-- v3 codebase schema` (line 1).

**Incremental migrations:** `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\sql\001-…` through `022-hash-history-comments-cleanup.sql` (23 files total in that `sql/` dir).

**Current schema version = 26**, at `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\U\Codebase\Sqlite\Queries.hs:467-468`:
```haskell
currentSchemaVersion :: SchemaVersion
currentSchemaVersion = 26
```

**How SQL is embedded:** each `.sql` file is compiled in via Template Haskell `embedProjectStringFile` — e.g. `Queries.hs:470-472` (`runCreateSql` → `sql/create.sql`), and one wrapper per migration file at `Queries.hs:474-564`. The files are listed as `extra-source-files` in `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\unison-codebase-sqlite.cabal:13-35`.

**Version table:** `schema_version(version INTEGER NOT NULL)` — `sql\create.sql:3-5`. Read/write at `Queries.hs:566-572` (`schemaVersion`), `Queries.hs:582-589` (`expectSchemaVersion`), `Queries.hs:591-597` (`setSchemaVersion`).

**Fresh-codebase creation** does *not* replay migrations 1→26; it runs `create.sql` then a hand-maintained list of migration scripts and stamps the version directly: `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\parser-typechecker\src\Unison\Codebase\SqliteCodebase\Operations.hs:68-104` (`createSchema`, with `INSERT INTO schema_version (version) VALUES (:currentSchemaVersion)` at lines 100-104).

**Migration ladder:** `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\parser-typechecker\src\Unison\Codebase\SqliteCodebase\Migrations.hs:48-113` — `Map SchemaVersion (Connection -> IO ())`, keys 2..26. The `sqlMigration` helper (lines 105-113) asserts `expectSchemaVersion (ver - 1)`, runs the script, then `setSchemaVersion ver`.

---

### 2. hash → definition (the four-level indirection)

Tables, all in `sql\create.sql`:

| Table | Lines | Key columns |
|---|---|---|
| `hash` | 8-13 | `id INTEGER PRIMARY KEY`, `base32 TEXT NOT NULL` |
| `text` | 28-31 | `id INTEGER PRIMARY KEY`, `text TEXT UNIQUE NOT NULL` |
| `hash_object` | 43-49 | `hash_id` (PK, FK→`hash(id)`), `object_id` (FK→`object(id)`), `hash_version INTEGER NOT NULL` |
| `object` | 75-80 | `id INTEGER PRIMARY KEY`, `primary_hash_id` (FK→`hash(id)`), `type_id` (FK→`object_type_description(id)`), `bytes BLOB NOT NULL` |
| `object_type_description` | 55-64 | seeded `(0,"Term Component") (1,"Decl Component") (2,"Namespace") (3,"Patch")` |

Indexes: `hash_base32` unique on `hash(base32 COLLATE NOCASE)` (line 14) — the `COLLATE NOCASE` is there specifically to make `LIKE 'a1b2c3%'` prefix-scan use a covering index (comment at lines 15-26). `hash_object_object_id` (line 51), `object_hash_id` unique on `object(primary_hash_id)` (line 82), `object_type_id` (line 84).

**The chain** — base32 hash text → `hash.id` → `object.id` → `object.bytes`:

- Primary path (only the object's *primary* hash): `Queries.hs:913-921` `expectObjectIdForHash32` does `SELECT object.id FROM object JOIN hash ON object.primary_hash_id = hash.id WHERE hash.base32 = :hash COLLATE NOCASE`.
- Any-hash path (goes through `hash_object`): `Queries.hs:972-978` `loadObjectIdForAnyHashIdSql` = `SELECT object_id FROM hash_object WHERE hash_id = :h`; callers `loadObjectIdForAnyHash`/`loadObjectIdForAnyHashId`/`expectObjectIdForAnyHashId` at `Queries.hs:960-970`.
- Bytes fetch: `Queries.hs:786-793` (`expectObject`, `SELECT bytes FROM object`), `Queries.hs:867-875` (`expectObjectWithType`), `Queries.hs:877-884` (`expectObjectWithHashIdAndType`).
- Reverse (object → display hash): `Queries.hs:998-1005` `expectPrimaryHash32ByObjectId`.

**Why `object_id` rather than `hash_id` internally** — `sql\create.sql:66-74`: using object ids proves the referenced object actually exists in the DB, whereas a hash id only proves the hash is present.

**The `text` table is a fifth level of interning.** Object blobs don't store text inline; each blob carries a `LocalIds` header mapping object-local indices to database `text.id` / `object.id`. See `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\U\Codebase\Sqlite\LocalIds.hs:14-18`:
```haskell
data LocalIds' t h = LocalIds
  { textLookup :: Vector t,
    defnLookup :: Vector h
  }
```
There is a fully worked example of the whole `text`/`hash`/`hash_object`/`object` chain for a two-term component in a comment block at `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\U\Codebase\Sqlite\Term\Format.hs:53-100`.

Write path: `Queries.hs:764-784` `saveObject` (`INSERT INTO object (primary_hash_id, type_id, bytes)`), `Queries.hs:705-731` `saveText`, `Queries.hs:608-632` `saveHash`.

Related index tables (all object-id based, `sql\create.sql`): `find_type_index` (159-184), `find_type_mentions_index` (186-206), `dependents_index` (209-232). Sync staging tables live in `sql\001-temp-entity-tables.sql`: `temp_entity_type_description` (line 1), `temp_entity` (line 24), `temp_entity_missing_dependency` (line 56).

---

### 3. name → hash

**Names live inside the hashed namespace object, not in an index.** A `Namespace` object (`object.type_id = 2`) deserializes to a `BranchFormat` whose `LocalBranch` is keyed by name segment:

`C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\U\Codebase\Sqlite\Branch\Full.hs:44-50`:
```haskell
data Branch' t h p c = Branch
  { terms :: !(Map t (Map (Referent'' t h) (MetadataSetFormat' t h))),
    types :: !(Map t (Map (TypeReference' t h) (MetadataSetFormat' t h))),
    patches :: !(Map t p),
    children :: !(Map t c)
  }
```
with `type DbBranch = Branch' TextId ObjectId PatchObjectId (BranchObjectId, CausalHashId)` (line 37) — so the map key `t` is a `text.id`. `Branch\Format.hs:34` states plainly that `BranchFormat'` "is a deserialized namespace object (`object.bytes`)", and it has two constructors `Full` / `Diff` (lines 42-45), so a namespace object may be stored as a delta against another `BranchObjectId`.

**History spine:**
- `causal(self_hash_id PK FK→hash(id), value_hash_id FK→hash(id))` — `sql\create.sql:89-92`, index `causal_value_hash_id` at line 94. Comment at 86-88: it references *hash* ids, not object ids, so you can drop values and keep the spine.
- `causal_parent(causal_id, parent_id)` — `sql\create.sql:103-107` `WITHOUT ROWID`, indexes at 108-109.
- `causal_metadata` — `sql\create.sql:113-118`, marked `-- Currently unused.` (line 112).
- Causal value hash → namespace object: `Queries.hs:931-940` `expectBranchHashIdForHash32` joins `object → hash_object → hash` filtering `object.type_id = 2`.

**There is no `branch_object` table.** Grep across `codebase2\codebase-sqlite\sql` returns no such name; `BranchObjectId` is a Haskell newtype over `ObjectId` (`U\Codebase\Sqlite\DbId.hs`), i.e. a tagged pointer into `object`.

**`namespace_root` is legacy.** Declared at `sql\create.sql:97-99` (`causal_id INTEGER PRIMARY KEY … REFERENCES causal(self_hash_id)`), comment "We expect exactly 1 row". Repo-wide grep finds it referenced **only** in migration modules — `MigrateSchema1To2.hs:161,166-168`, `MigrateSchema3To4.hs:109`, `MigrateSchema16To17.hs:209,246` — and nowhere in `Queries.hs`. Since v17 the root is per-project-branch: `project_branch` gains `causal_hash_id` in `sql\014-add-project-branch-causal-hash-id.sql:2` (`ALTER TABLE project_branch ADD COLUMN causal_hash_id INTEGER NOT NULL`); base project tables are `project`, `project_branch`, `project_branch_parent`, `project_branch_remote_mapping`, `remote_project`, `remote_project_branch` in `sql\005-project-tables.sql`.

**The derived name index (`name_lookups` family) is present but appears dormant at HEAD.**

Declared in `sql\create.sql`:
- `name_lookups(root_branch_hash_id INTEGER PRIMARY KEY REFERENCES hash(id) ON DELETE CASCADE)` — lines 236-238, comment "This table allows us to look up which branch hashes have a name lookup."
- `scoped_term_name_lookup` — lines 240-272: `root_branch_hash_id`, `reversed_name`, `last_name_segment`, `namespace`, `referent_builtin`, `referent_component_hash`, `referent_component_index`, `referent_constructor_index`, `referent_constructor_type`. Indexes at 281, 284, 288.
- `scoped_type_name_lookup` — lines 291-310: same shape with `reference_builtin`, `reference_component_hash`, `reference_component_index`. Indexes at 319, 323, 328.
- Recreated with the root hash in the PK by `sql\004-fix-scoped-name-lookup-tables.sql` (tables at lines 16-48 and 68-89; the `ON DELETE CASCADE` FK now targets `name_lookups(root_branch_hash_id)`).
- `name_lookup_mounts(parent_root_branch_hash_id, mounted_root_branch_hash_id, mount_path, reversed_mount_path)` — `sql\007-add-name-lookup-mounts.sql:5-36`, lets one index mount another at a path (e.g. `lib.base.`).

Design notes worth quoting: `reversed_name` is stored reversed with a trailing `'.'` (`map.List.base.`) so a single prefix-GLOB serves suffix search (`create.sql:243-252`); `namespace` carries a trailing `'.'` so `base.*` matches `base.List` but not `base1`, avoiding an `OR` that would defeat the query planner (`create.sql:259-265`).

⚠️ **Evidence of dormancy:** grep for `scoped_term_name_lookup` across the whole repo matches only 4 files — the two SQL files above plus `MigrateSchema7To8.hs` (which originally created them, lines 22-133) and `MigrateSchema11To12.hs` (which *empties* them: `DELETE FROM scoped_term_name_lookup` line 45, `DELETE FROM scoped_type_name_lookup` line 49, `DELETE FROM name_lookups` line 53, plus `DROP TABLE IF EXISTS term_name_lookup` / `type_name_lookup` at lines 29/33). Grep for `reversed_name` / `last_name_segment` matches the same set. **No file under `Queries.hs` or any runtime module reads or writes these tables at this commit.** This is an inference from absence of grep matches — I did not find a commit or comment explicitly deprecating them, so treat "dormant" as strongly indicated rather than documented.

So: **names are canonically inside the hashed namespace object**; `scoped_*_name_lookup` is a *derived*, per-root-branch-hash denormalized index (a cache), which the current tree still creates but does not populate.

---

### 4. Serialization format vs. hashing tokenization — **CONFIRMED: two different formats, different packages**

**Storage serialization:** `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\U\Codebase\Sqlite\Serialization.hs` (1156 lines). It is a hand-rolled tag-byte + varint binary codec over `Data.Bytes.Get` / `Data.Bytes.Put` (imports at lines 55-59). Example — the ABT encoder at `Serialization.hs:110-119`:
```haskell
ABT.Var v   -> putWord8 0 *> putVarRef env v
ABT.Tm f    -> putWord8 1 *> putF go f
ABT.Abs v body -> putWord8 2 *> putVar v *> go body
ABT.Cycle body -> putWord8 3 *> go body
```
It serializes `TermFormat.TermFormat` / `BranchFormat` etc. — types that use **database-local ids** (`LocalTextId`, `LocalDefnId`) resolved through the per-object `LocalIds` header. Decoders and their target columns are catalogued in `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\U\Codebase\Sqlite\Decode.hs:1-35`, grouped by `-- * @object.bytes@`, `-- * @temp_entity.blob@`, `-- * @watch_result.result@`. Low-level helpers: `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\util-serialization\U\Util\Serialization.hs`.

**Hashing tokenization:** `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\unison-hashing-v2\src\Unison\Hashing\V2\Tokenizable.hs` — a *separate package*. Values are converted to `[Token]` where `data Token = Tag !Word8 | Bytes !ByteString | Int !Int64 | Text !Text | Double !Double | Hashed !Hash | Nat !Word64` (lines 39-46), then folded into a **SHA3-512** context (`accumulate`, lines 121-129), always prefixed by `hashingVersion = Tag 2` (lines 28-37). Sibling modules `Unison\Hashing\V2\{Term,Type,Branch,Causal,DataDeclaration,Patch,Reference,Referent,NameSegment,ABT,Kind,Pattern,TermEdit,TypeEdit}.hs` hold the per-type instances. These operate on full `Reference`s — **no local-id indirection**.

**The seam between them** is the `HashHandle` record: `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\U\Codebase\Sqlite\HashHandle.hs:71-104` — a dictionary of hashing functions (`hashBranch`, `hashCausal`, `hashBranchFormatFull`, `verifyTermFormatHash`, …) injected into the SQLite layer so `codebase-sqlite` never depends on the hashing package. The V2 implementation lives in a third package: `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite-hashing-v2\src\U\Codebase\Sqlite\V2\HashHandle.hs`, with the format-bridging conversions in `…\src\Unison\Hashing\V2\Convert2.hs`.

Practical consequence: you cannot rehash a definition from `object.bytes` alone — you must deserialize, resolve `LocalIds` against the `text` and `object` tables, convert to the hashing-v2 types, then tokenize.

---

### 5. `hash_version` semantics and the `hash_object` table

`sql\create.sql:33-49` — the design comment says `hash_object` "is a layer of indirection that allows multiple hashes to be associated to the same object. For example, if the hashing algorithm for the object is changed." The author explicitly leaves the uniqueness question open: "I could imagine a `UNIQUE (object_id, hash_version)` constraint or a `UNIQUE (hash_id, hash_version)` constraint, or both, but I'm not sure if that will cause trouble later?" — **neither constraint was added.** Only `hash_id` is the PK (line 46), so many hashes → one object, never the reverse.

Semantics of the column:

- **Write:** every object saved today is stamped version **2**, hardcoded — `Queries.hs:778`:
  ```haskell
  saveHashObject h oId 2 -- todo: remove this from here, and add it to other relevant places once there are v1 and v2 hashes
  ```
  (inside `saveObject`, `Queries.hs:770-784`). Insert helper: `Queries.hs:755-762` `saveHashObject :: HashId -> ObjectId -> HashVersion -> Transaction ()`.
- The `2` corresponds to `hashingVersion = Tag 2` in `Tokenizable.hs:36-37` — i.e. `hash_version` names *which hashing function produced this base32*, and the comment there (lines 28-35) explains why bumping it must change *all* hashes: otherwise simple values keep identical base32 across versions and collide in the `hash` table.
- **Read:** `Queries.hs:1014-1020` `hashIdWithVersionForObject` → `SELECT hash_id, hash_version FROM hash_object WHERE object_id = :oId`. `Queries.hs:1007-1012` `expectHashIdsForObject` returns primary-hash-first, then the rest.
- **Cleanup of v1:** `Queries.hs:2271-2277` `removeHashObjectsByHashingVersion` deletes `WHERE hash_version = :hashVersion`; wired in as the schema-3 migration at `Migrations.hs:75` (`sqlMigration 3 (Q.removeHashObjectsByHashingVersion (HashVersion 1))`), with a 14-line comment at `Migrations.hs:60-74` explaining that stale v1 hash objects caused one v1 hash to map to two distinct v2 objects across codebases and crash sync.
- **Rehash bookkeeping:** `Queries.hs` `recordObjectRehash old new` rewrites `hash_object` rows in place to point at the new object (declaration + comment immediately after line 1020).
- Type: `newtype HashVersion = HashVersion Word64` — `C:\Users\kokok\Dev\foldlab\.reference\clones\unison\codebase2\codebase-sqlite\U\Codebase\Sqlite\DbId.hs:10`.

Net: `hash_object` is currently degenerate — one row per object, all `hash_version = 2`, duplicating `object.primary_hash_id`. It exists to make a future hash-algorithm migration non-destructive; `object.primary_hash_id` is the one chosen for display (`sql\create.sql:72-74`).