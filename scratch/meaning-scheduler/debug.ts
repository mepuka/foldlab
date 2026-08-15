import { Effect } from "effect"
import type * as Scheduler from "effect/Scheduler"

const tasks: Array<() => void> = []
const scheduler = {
  executionMode: "sync",
  shouldYield: (fiber: { currentOpCount: number }) => fiber.currentOpCount >= 3,
  makeDispatcher: () => ({
    scheduleTask: (task: () => void, _p: number) => {
      tasks.push(task)
    },
    flush: () => {},
  }),
} as unknown as Scheduler.Scheduler

let n = 0
const program = Effect.gen(function* () {
  yield* Effect.sync(() => n++)
  yield* Effect.yieldNow
  yield* Effect.sync(() => n++)
  return n
})

const fiber = Effect.runFork(program, { scheduler })
let steps = 0
while (tasks.length > 0 && steps < 50) {
  tasks.shift()!()
  steps++
}
console.log({ steps, n, queue: tasks.length, exit: fiber.pollUnsafe() })
