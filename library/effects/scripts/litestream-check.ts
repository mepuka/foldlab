/**
 * The Litestream check: does a content-addressed store survive
 * replicate → restore with every Lean-computed address intact?
 *
 * The claim under test is the only one that matters for a replicated
 * CAS. Litestream replicates SQLite pages; it knows nothing about
 * content addressing. So the question is whether a database restored
 * from a replica still answers every address the Lean model computed
 * — recomputed digest, canonical re-decode, known kind — or whether
 * replication is a place where identity can silently drift.
 *
 * Two modes, driven by the shell so the litestream binary stays out of
 * the library:
 *
 *   bun scripts/litestream-check.ts seed   <db> <manifest>
 *   bun scripts/litestream-check.ts verify <db> <manifest>
 *
 * `seed` replays every Lean conformance vector into a fresh SQLite CAS
 * and refuses on the first address that does not match the model's.
 * `verify` opens a store over a DIFFERENT database file and loads each
 * recorded address through the full read law. Between them the shell
 * runs `litestream replicate -once` and `litestream restore`.
 *
 * Not part of `bun run test`: it needs an external binary at a
 * machine-specific path, so it stays an opt-in check like the other
 * scripts here. The full run, PowerShell:
 *
 *     bun scripts/litestream-check.ts seed  $W\cas.db $W\addresses.json
 *     litestream replicate -once $W\cas.db "file://$U/replica"
 *     litestream restore -o $W\restored.db -integrity-check full "file://$U/replica"
 *     bun scripts/litestream-check.ts verify $W\restored.db $W\addresses.json
 *
 * WINDOWS FILE-URL GOTCHA: litestream 0.5.12 joins a `file://` URL
 * path onto the current drive, so `file:///C:/x` becomes `C:\C:\x` and
 * fails. Strip the drive letter — `$U = ($W -replace '\\','/') -replace
 * '^C:',''` — and `file://$U/replica` resolves correctly.
 */
import { SqliteClient } from "@effect/sql-sqlite-node"
import { Effect, Layer, Schema } from "effect"
import * as KeyValueStore from "effect/unstable/persistence/KeyValueStore"
import { readFileSync, writeFileSync } from "node:fs"
import { Cas } from "../src/index.ts"

const { ConformanceVector, ContentId, Store } = Cas

/** The production composition, verbatim from `test/KvsSqlite.test.ts`:
 * the store law over the byte plane over a SQL key-value store over
 * one SQLite file. */
const layerSqliteCas = (filename: string) =>
  Cas.layerStore.pipe(
    Layer.provideMerge(Cas.layerKvsBackend),
    Layer.provide(Layer.mergeAll(
      KeyValueStore.layerSql({ table: "cas_objects" }),
      Cas.layerAddressSha256Live,
    )),
    Layer.provide(SqliteClient.layer({ filename })),
  )

const vectorsDir = "../cas/vectors"

const readJson = (file: string): unknown =>
  JSON.parse(readFileSync(`${vectorsDir}/${file}`, "utf8")) as unknown

/** The Lean-emitted vectors, through the same wire schemas the suite
 * uses — a decode failure is a red run, never a repair. */
const loadVectors = Effect.gen(function* () {
  const index = yield* Schema.decodeUnknownEffect(
    ConformanceVector.VectorIndex,
  )(readJson("index.json"))
  return yield* Effect.forEach(index.vectors, (entry) =>
    Schema.decodeUnknownEffect(ConformanceVector.ConformanceVector)(
      readJson(entry.file),
    ))
})

const seed = (database: string, manifest: string) =>
  Effect.gen(function* () {
    const vectors = yield* loadVectors
    const store = yield* Store
    const addresses: Array<string> = []

    for (const vector of vectors) {
      for (const [position, binding] of vector.word.entries()) {
        const id = yield* store.put(
          ConformanceVector.toNodeInput(binding.node),
        )
        if (id !== binding.address) {
          return yield* Effect.die(
            `${vector.name}[${position}]: admitted ${id}, model says ${binding.address}`,
          )
        }
        addresses.push(id)
      }
    }

    writeFileSync(manifest, JSON.stringify(addresses, null, 2))
    console.log(
      `seed: ${addresses.length} nodes from ${vectors.length} vectors into ${database}`,
    )
  }).pipe(Effect.provide(layerSqliteCas(database)))

const verify = (database: string, manifest: string) =>
  Effect.gen(function* () {
    const addresses = JSON.parse(
      readFileSync(manifest, "utf8"),
    ) as Array<string>
    const store = yield* Store

    // The full read law per address: bytes fetched from the restored
    // database, digest recomputed, canonical decode re-run, kind
    // checked. A page-level corruption anywhere lands here as a typed
    // refusal, never as served bytes.
    for (const address of addresses) {
      yield* store.load(ContentId.make(address))
    }

    console.log(
      `verify: ${addresses.length}/${addresses.length} addresses re-verified from ${database}`,
    )
  }).pipe(Effect.provide(layerSqliteCas(database)))

const [mode, database, manifest] = process.argv.slice(2)

if (mode === undefined || database === undefined || manifest === undefined) {
  console.error(
    "usage: bun scripts/litestream-check.ts <seed|verify> <db> <manifest>",
  )
  process.exit(2)
}

const program = mode === "seed"
  ? seed(database, manifest)
  : mode === "verify"
    ? verify(database, manifest)
    : Effect.die(`unknown mode: ${mode}`)

await Effect.runPromise(program).catch((error: unknown) => {
  console.error(`litestream check FAILED in ${mode}:`)
  console.error(error)
  process.exit(1)
})
