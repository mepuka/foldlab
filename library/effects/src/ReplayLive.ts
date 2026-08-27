/** Private bridge between a record-mode service wrapper and Replay.invoke. */
import type { Effect } from "effect"
import type { AnyOperationDescription } from "./Operation.ts"

type LiveHandler<D extends AnyOperationDescription> = (
  request: D["request"]["Type"],
) => Effect.Effect<D["success"]["Type"], D["failure"]["Type"]>

const handlers = new WeakMap<object, unknown>()

export const bindLive = <D extends AnyOperationDescription>(
  operation: D,
  handler: LiveHandler<D>,
): D => {
  const bound = { ...operation }
  handlers.set(bound, handler)
  return bound
}

export const liveHandler = <D extends AnyOperationDescription>(
  operation: D,
): LiveHandler<D> | undefined => handlers.get(operation) as LiveHandler<D> | undefined
