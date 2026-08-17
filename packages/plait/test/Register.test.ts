import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { join, resolve } from "node:path"

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
import { startNatsHarness, type NatsHarness, waitForFile } from "./NatsHarness.js"

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
let harness: NatsHarness

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
  expect(rows).toHaveLength(12)
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

const runRow = (row: Row) => Effect.gen(function* () {
  const registers = yield* Registers
  const work = "0123456789abcdef"
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

const auditAndDestroy = async (): Promise<void> => {
  const connection = await connect({ servers: harness.url })
  try {
    const bucket = await new Kvm(connection).open(REGISTER_BUCKET)
    const status = await bucket.status()
    expect(status.history).toBe(REGISTER_HISTORY)
    expect(status.ttl).toBe(0)
    expect(status.max_bytes).toBe(-1)
    expect(status.replicas).toBe(1)
    const history = await bucket.history({ key: "0123456789abcdef" })
    let landed = 0
    for await (const entry of history) {
      const value = entry.json<{ readonly outcome: null | { readonly value: string } }>()
      if (value.outcome !== null) {
        landed++
        expect(value.outcome.value).not.toBe("zombie")
      }
    }
    expect(landed).toBeLessThanOrEqual(1)
    expect(await bucket.destroy()).toBe(true)
  } finally {
    await connection.close()
  }
}

beforeAll(async () => {
  harness = await startNatsHarness()
})

afterAll(async () => {
  await harness.stop()
})

describe("Veil register replay wall", () => {
  test("TS equals all 12 model verdicts and observed states with zero skips", async () => {
    const rows = await loadCorpus()
    let replayed = 0
    for (const row of rows) {
      await Effect.runPromise(runRow(row).pipe(
        Effect.provide(Registers.layer({ servers: harness.url })),
        Effect.scoped,
      ))
      await auditAndDestroy()
      replayed++
    }
    expect(replayed).toBe(12)
  }, 120_000)

  test("the substrate refuses duplicate create and stale revision update", async () => {
    const connection = await connect({ servers: harness.url })
    try {
      const bucket = await new Kvm(connection).create(REGISTER_BUCKET, {
        history: REGISTER_HISTORY,
        replicas: 1,
        ttl: 0,
        max_bytes: -1,
      })
      const first = await bucket.create("probe", "one")
      await expect(bucket.create("probe", "two")).rejects.toBeDefined()
      const second = await bucket.update("probe", "two", first)
      expect(second).toBeGreaterThan(first)
      await expect(bucket.update("probe", "zombie", first)).rejects.toBeDefined()
      expect(await bucket.destroy()).toBe(true)
    } finally {
      await connection.close()
    }
  }, 30_000)

  test("the named stale-token mutant is killed by zombie-stale-commit", async () => {
    const row = (await loadCorpus()).find(({ id }) => id === "zombie-stale-commit")
    expect(row).toBeDefined()
    const mutant = commitWithoutTokenGuard(row!.observed, 1, "zombie")
    expect(row!.verdict).toBe("refused")
    expect(mutant).not.toEqual(row!.observed)
  })

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
    const fixture: RegisterService = {
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
        Effect.provide(Registers.testLayer(fixture)),
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

    const work = "fedcba9876543210"
    const readyPath = join(harness.directory, "register-holder.json")
    const zombiePath = join(harness.directory, "register-zombie.json")
    const holder = Bun.spawn({
      cmd: ["bun", "run", "./test/process/register-holder.ts", harness.url, work, readyPath],
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
      cmd: ["go", "run", "./cmd/registerwall", harness.url, "steal", work, "go-contender"],
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
        harness.url, work, String(ready.token), zombiePath,
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
        work, String(stolen.token), "winner",
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
  }, 120_000)
})
