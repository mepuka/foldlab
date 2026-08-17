import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { join, resolve } from "node:path"

import { JetStreamApiCodes, JetStreamApiError } from "@nats-io/jetstream"
import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"
import { Effect, Result, Schema } from "effect"

import { commitWithoutTokenGuard } from "../negative-controls/stale-token-mutant.js"
import {
  REGISTER_BUCKET,
  REGISTER_HISTORY,
  Registers,
  hold,
  type RegisterService,
  type RegisterState,
} from "../src/Register.js"
import { structuralRefusal } from "../src/Refusal.js"
import {
  buildServerBinary,
  startNatsServer,
  waitForFile,
  type NatsHarness,
  type NatsServerBinary,
} from "./NatsHarness.js"

const Outcome = Schema.Struct({ token: Schema.Number, value: Schema.String })
const State = Schema.Struct({
  token: Schema.Number,
  holder: Schema.NullOr(Schema.String),
  outcome: Schema.NullOr(Outcome),
})
const Action = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("grant"), holder: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("renew"), token: Schema.Number }),
  Schema.Struct({
    kind: Schema.Literal("commit"),
    token: Schema.Number,
    outcome: Schema.String,
  }),
  Schema.Struct({ kind: Schema.Literal("expire-steal"), holder: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("observe") }),
])
type Action = typeof Action.Type
const TraceState = Schema.Struct({
  fields: State,
  index: Schema.Number,
  transition: Schema.Union([Schema.Literal("after_init"), Action]),
})
const Row = Schema.Struct({
  id: Schema.String,
  trace: Schema.Struct({ states: Schema.Array(TraceState), theory: Schema.String }),
  attempt: Action,
  verdict: Schema.Literals(["accepted", "refused"]),
  law: Schema.String,
  observed: State,
})
type Row = typeof Row.Type
const Header = Schema.Struct({ provenance: Schema.String, rows: Schema.Number })

const fixture = resolve(import.meta.dir, "../fixtures/register-traces.ndjson")
const mutantTrace = resolve(import.meta.dir, "../negative-controls/stale-token-mutant.trace.json")
let built: NatsServerBinary

const loadCorpus = async (): Promise<ReadonlyArray<Row>> => {
  const lines = (await Bun.file(fixture).text()).trimEnd().split("\n")
  const header = Schema.decodeUnknownSync(Header)(JSON.parse(lines[0]!), {
    onExcessProperty: "error",
  })
  expect(header.provenance).toBe(
    "lake exe fabric_veil_export --write-corpus packages/plait/fixtures/register-traces.ndjson",
  )
  const rows = lines.slice(1).map((line) => Schema.decodeUnknownSync(Row)(JSON.parse(line), {
    onExcessProperty: "error",
  }))
  expect(rows).toHaveLength(header.rows)
  expect(rows).toHaveLength(15)
  return rows
}

const invoke = (
  registers: RegisterService,
  work: string,
  action: Action,
): Effect.Effect<RegisterState, import("../src/Refusal.js").Refusal> => {
  switch (action.kind) {
    case "grant": return registers.grant(work, action.holder)
    case "renew": return registers.renew(work, action.token)
    case "commit": return registers.commit(work, action.token, action.outcome)
    case "expire-steal": return registers.expireSteal(work, action.holder)
    case "observe": return registers.observe(work)
  }
}

const work = "0123456789abcdef"

/**
 * Envelope note (seam rule 4): KV revisions are bucket-global and never
 * per-key consecutive, so the numeric equality between the runtime token and
 * the model's 1,2,3... counter below is an artifact of this wall's envelope —
 * a fresh server per row whose only writes are this one key's. A wall with
 * interleaved writers must assert order-isomorphism, not numeric equality.
 */
const runRow = (row: Row) => Effect.gen(function* () {
  const registers = yield* Registers
  for (const step of row.trace.states.slice(1)) {
    if (step.transition === "after_init") throw new Error("after_init may only be the first state")
    const state = yield* invoke(registers, work, step.transition)
    expect(state).toEqual(step.fields)
  }

  const attempted = yield* Effect.result(invoke(registers, work, row.attempt))
  expect(Result.isSuccess(attempted)).toBe(row.verdict === "accepted")
  if (Result.isSuccess(attempted)) {
    expect(attempted.success).toEqual(row.observed)
  } else {
    expect(attempted.failure.law).toBe(row.law)
    expect(yield* registers.observe(work)).toEqual(row.observed)
  }
})

/** Audits shape and retained history; never mutates bucket lifecycle. */
const audit = async (url: string): Promise<void> => {
  const connection = await connect({ servers: url })
  try {
    const bucket = await new Kvm(connection).open(REGISTER_BUCKET)
    const status = await bucket.status()
    expect(status.history).toBe(REGISTER_HISTORY)
    expect(status.ttl).toBe(0)
    expect(status.max_bytes).toBe(-1)
    expect(status.replicas).toBe(1)
    const history = await bucket.history({ key: work })
    let landed = 0
    for await (const entry of history) {
      const value = entry.json<{ readonly outcome: null | { readonly value: string } }>()
      if (value.outcome !== null) {
        landed++
        expect(value.outcome.value).not.toBe("zombie")
      }
    }
    expect(landed).toBeLessThanOrEqual(1)
  } finally {
    await connection.close()
  }
}

/**
 * Row isolation is one fresh server (fresh backing-stream incarnation) per
 * row — the Go wall's shape. Never bucket destroy+recreate: lifecycle
 * mutation resets the revision order, which is the exact fixed-incarnation
 * edge (seam rule 7) the register's claims exclude, and rebuilding isolation
 * on it is what made this wall nondeterministic in round 1.
 */
const withServer = async <A>(use: (harness: NatsHarness) => Promise<A>): Promise<A> => {
  const harness = await startNatsServer(built.binary)
  try {
    return await use(harness)
  } finally {
    await harness.stop()
  }
}

beforeAll(async () => {
  built = await buildServerBinary()
})

afterAll(async () => {
  await built.cleanup()
})

describe("Veil register replay wall", () => {
  test("TS equals all 15 model verdicts and observed states with zero skips", async () => {
    const rows = await loadCorpus()
    let replayed = 0
    for (const row of rows) {
      await withServer(async (harness) => {
        await Effect.runPromise(runRow(row).pipe(
          Effect.provide(Registers.layer({ servers: harness.url })),
          Effect.scoped,
        ))
        await audit(harness.url)
      })
      replayed++
    }
    expect(replayed).toBe(15)
  }, 180_000)

  test("the substrate refuses duplicate create and stale update with the frozen classification", async () => {
    await withServer(async (harness) => {
      const connection = await connect({ servers: harness.url })
      try {
        const bucket = await new Kvm(connection).create(REGISTER_BUCKET, {
          history: REGISTER_HISTORY,
          replicas: 1,
          ttl: 0,
          max_bytes: -1,
        })
        const first = await bucket.create("probe", "one")
        // DEV-704 seam rule 2: duplicate create and stale update are both
        // JetStreamApiError{status: 400, code: 10071}, distinguished only by
        // operation context — assert the exact frozen shape, not "some error".
        const duplicate = await bucket.create("probe", "two").then(() => null, (cause: unknown) => cause)
        expect(duplicate).toBeInstanceOf(JetStreamApiError)
        expect((duplicate as JetStreamApiError).status).toBe(400)
        expect((duplicate as JetStreamApiError).code).toBe(JetStreamApiCodes.StreamWrongLastSequence)
        const second = await bucket.update("probe", "two", first)
        expect(second).toBeGreaterThan(first)
        const stale = await bucket.update("probe", "zombie", first).then(() => null, (cause: unknown) => cause)
        expect(stale).toBeInstanceOf(JetStreamApiError)
        expect((stale as JetStreamApiError).status).toBe(400)
        expect((stale as JetStreamApiError).code).toBe(JetStreamApiCodes.StreamWrongLastSequence)
      } finally {
        await connection.close()
      }
    })
  }, 60_000)

  test("the real commit path minus its token guard is killed by zombie-stale-commit on the live bucket", async () => {
    const rows = await loadCorpus()
    const row = rows.find(({ id }) => id === "zombie-stale-commit")
    expect(row).toBeDefined()
    expect(row!.verdict).toBe("refused")
    await withServer(async (harness) => {
      const layer = Registers.layer({ servers: harness.url })
      // Drive the row's prefix through the REAL register service.
      await Effect.runPromise(Effect.gen(function* () {
        const registers = yield* Registers
        for (const step of row!.trace.states.slice(1)) {
          if (step.transition === "after_init") throw new Error("after_init may only be the first state")
          yield* invoke(registers, work, step.transition)
        }
      }).pipe(Effect.provide(layer), Effect.scoped))

      // The mutant register (commit with the fencing guard deleted) ACCEPTS
      // the attempt the model refuses, against the live bucket.
      const landed = await commitWithoutTokenGuard(harness.url, work, 1, "zombie")

      const observedAfterMutant = await Effect.runPromise(Effect.gen(function* () {
        const registers = yield* Registers
        return yield* registers.observe(work)
      }).pipe(Effect.provide(layer), Effect.scoped))

      // Kill evidence: the wall's own audit law — never a zombie landing in
      // retained history — fails on the mutant's bucket.
      const connection = await connect({ servers: harness.url })
      let zombieLandings = 0
      try {
        const bucket = await new Kvm(connection).open(REGISTER_BUCKET)
        const history = await bucket.history({ key: work })
        for await (const entry of history) {
          const value = entry.json<{ readonly outcome: null | { readonly value: string } }>()
          if (value.outcome !== null && value.outcome.value === "zombie") zombieLandings++
        }
      } finally {
        await connection.close()
      }
      expect(zombieLandings).toBe(1)

      // The executed refutation trace, byte-compared with the committed one.
      const record = {
        control: "runtime-stale-token-mutant",
        corpusRow: row!.id,
        corpusVerdict: row!.verdict,
        mutantVerdict: "accepted",
        landed,
        observedAfterMutant,
        zombieLandingsInHistory: zombieLandings,
        violatedLaw: row!.law,
      }
      expect(record).toEqual(JSON.parse(await Bun.file(mutantTrace).text()))
    })
  }, 60_000)

  test("heartbeat lease loss interrupts the scoped holder fiber", async () => {
    const lost = structuralRefusal({
      kind: "stale-register-token",
      law: "renew requires the current fencing token",
      path: ["token"],
      got: 1,
      expected: 2,
      next: [],
    })
    let renewals = 0
    const fixtureService: RegisterService = {
      grant: () => Effect.succeed({ token: 1, holder: "holder", outcome: null }),
      renew: () => {
        renewals++
        return Effect.fail(lost)
      },
      commit: () => Effect.die("unused"),
      expireSteal: () => Effect.die("unused"),
      observe: () => Effect.die("unused"),
    }
    const result = await Effect.runPromise(Effect.result(
      hold("work", "holder", () => Effect.never, "1 millis").pipe(
        Effect.provide(Registers.testLayer(fixtureService)),
        Effect.scoped,
      ),
    ))
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) expect(result.failure.law).toBe(lost.law)
    expect(renewals).toBe(1)
  })

  test("a killed TS holder is stolen by Go and its TS zombie is fenced", async () => {
    const schedule = Schema.decodeUnknownSync(Schema.Struct({
      corpusRow: Schema.String,
      steps: Schema.Array(Schema.String),
    }))(JSON.parse(await Bun.file(resolve(import.meta.dir, "../fixtures/crash-steal-schedule.json")).text()))
    const modelRow = (await loadCorpus()).find(({ id }) => id === schedule.corpusRow)
    expect(modelRow?.id).toBe("zombie-stale-commit")
    expect(schedule.steps).toHaveLength(5)

    await withServer(async (harness) => {
      const crashWork = "fedcba9876543210"
      const readyPath = join(harness.directory, "register-holder.json")
      const zombiePath = join(harness.directory, "register-zombie.json")
      const holder = Bun.spawn({
        cmd: ["bun", "run", "./test/process/register-holder.ts", harness.url, crashWork, readyPath],
        cwd: resolve(import.meta.dir, ".."),
        stdout: "pipe",
        stderr: "pipe",
      })
      await waitForFile(readyPath)
      const ready = Schema.decodeUnknownSync(Schema.Struct({ token: Schema.Number }))(
        JSON.parse(await Bun.file(readyPath).text()),
      )
      holder.kill()
      await holder.exited

      const goRoot = resolve(import.meta.dir, "../../../go")
      const steal = Bun.spawn({
        cmd: ["go", "run", "./cmd/registerwall", harness.url, "steal", crashWork, "go-contender"],
        cwd: goRoot,
        stdout: "pipe",
        stderr: "pipe",
      })
      const stolenText = steal.stdout instanceof ReadableStream
        ? await new Response(steal.stdout).text()
        : ""
      const stealError = steal.stderr instanceof ReadableStream
        ? await new Response(steal.stderr).text()
        : ""
      expect(await steal.exited, stealError).toBe(0)
      const stolen = Schema.decodeUnknownSync(State)(JSON.parse(stolenText))
      expect(stolen.token).toBeGreaterThan(ready.token)
      expect(stolen.holder).toBe("go-contender")

      const zombie = Bun.spawn({
        cmd: [
          "bun", "run", "./test/process/register-zombie.ts",
          harness.url, crashWork, String(ready.token), zombiePath,
        ],
        cwd: resolve(import.meta.dir, ".."),
        stdout: "pipe",
        stderr: "pipe",
      })
      await waitForFile(zombiePath)
      const zombieError = zombie.stderr instanceof ReadableStream
        ? await new Response(zombie.stderr).text()
        : ""
      expect(await zombie.exited, zombieError).toBe(0)
      const refusal = Schema.decodeUnknownSync(Schema.Struct({
        kind: Schema.String,
        law: Schema.String,
      }))(JSON.parse(await Bun.file(zombiePath).text()))
      expect(refusal.kind).toBe("stale-register-token")
      expect(refusal.law).toBe("no stale token ever lands")

      const winner = Bun.spawn({
        cmd: [
          "go", "run", "./cmd/registerwall", harness.url, "commit",
          crashWork, String(stolen.token), "winner",
        ],
        cwd: goRoot,
        stdout: "pipe",
        stderr: "pipe",
      })
      const winnerText = winner.stdout instanceof ReadableStream
        ? await new Response(winner.stdout).text()
        : ""
      const winnerError = winner.stderr instanceof ReadableStream
        ? await new Response(winner.stderr).text()
        : ""
      expect(await winner.exited, winnerError).toBe(0)
      const landed = Schema.decodeUnknownSync(State)(JSON.parse(winnerText))
      expect(landed.outcome).toEqual({ token: stolen.token, value: "winner" })
    })
  }, 180_000)
})
