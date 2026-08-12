/**
 * The algebraic layer over Scenario processes: Proc<S, R> is a monad, and —
 * because these are CONCURRENT processes — the laws carry more than
 * bookkeeping weight. A linearization point is a yield; `map` and `flatMap`
 * are lawful precisely because they add no yields of their own (`yield*`
 * delegation IS bind). Any combinator that smuggled in an extra yield would
 * change the schedule space itself, and the observational-equivalence check
 * in test/laws.algebra.test.ts is built to see exactly that (ML7 in
 * docs/research/mech-production-spec.md).
 */

import type { AtomicOp } from "./scenario.ts"

/** A process body over shared state S returning R. */
export type Proc<S, R> = () => Generator<AtomicOp<S>, R, unknown>

/** No yields; returns the value. The monad's unit. */
export const pure =
  <S, R>(value: R): Proc<S, R> =>
  function* () {
    return value
  }

/** Run p, transform its return. Adds no linearization points. */
export const map =
  <S, A, B>(p: Proc<S, A>, f: (a: A) => B): Proc<S, B> =>
  function* () {
    return f(yield* p())
  }

/** Run p, then the continuation. `yield*` delegation IS bind. */
export const flatMap =
  <S, A, B>(p: Proc<S, A>, f: (a: A) => Proc<S, B>): Proc<S, B> =>
  function* () {
    const a = yield* p()
    return yield* f(a)()
  }

/** Kleisli composition — pipeability for effectful process stages. */
export const andThen =
  <S, A, B, C>(
    f: (a: A) => Proc<S, B>,
    g: (b: B) => Proc<S, C>,
  ): ((a: A) => Proc<S, C>) =>
  (a) =>
    flatMap(f(a), g)

/**
 * DELIBERATELY UNLAWFUL bind, exported for the ML7 sabotage: identical to
 * flatMap except that it yields one extra no-op atomic step between p and
 * the continuation. Semantically inert on the shared state — but it is one
 * more linearization point, so a rival can now be scheduled where the
 * lawful bind admits no schedule at all. The law suite must SEE this.
 */
export const flatMapWithTick =
  <S, A, B>(p: Proc<S, A>, f: (a: A) => Proc<S, B>): Proc<S, B> =>
  function* () {
    const a = yield* p()
    yield { label: "tick", run: (shared: S) => [shared, null] as const }
    return yield* f(a)()
  }
