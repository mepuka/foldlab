/**
 * THE ATOM SEAM — a stand-in for `@effect-atom/atom`.
 *
 * `@effect-atom/atom` is NOT a dependency of this repository. Checked: absent
 * from the root manifest, from every workspace package manifest, and from
 * `bun.lock`. AGENTS.md forbids adding a TypeScript runtime dependency the task
 * does not justify, so this file mirrors the shape of that library's core —
 * `Atom.make` for a writable source, `Atom.make((get) => ...)` for a derived
 * read-only atom, and a `Registry` that holds the values and publishes changes —
 * and nothing else in the demo knows the difference.
 *
 * TO SWAP IN THE REAL LIBRARY: `bun add @effect-atom/atom`, then change the one
 * import at the top of `rosetta.ts` from `./atom.ts` to `@effect-atom/atom`.
 * The names the demo uses — `Atom.make`, `Registry.make`, `registry.get`,
 * `registry.set`, `registry.subscribe` — are the names that library exports, and
 * the demo is written against those and no others.
 *
 * What this stand-in deliberately does NOT reproduce: Effect integration
 * (`Atom.make(effect)`, `Result` / `AtomResultFn`), keep-alive and idle-GC
 * policies, atom families, and the React bindings. Derivation here is eager —
 * every derived atom the registry has been asked for is recomputed on every
 * write — rather than pull-based with dependency tracking, and the change check
 * is reference equality, so a derived atom whose carrier is rebuilt on each read
 * (an array, say) republishes on every write even when the value is equal. That
 * is enough to show a fold and its digest propagating reactively, and no more.
 */

export namespace Atom {
  /** A read-only reactive value. `_A` is a phantom carrier: never written, never read. */
  export interface Atom<A> {
    readonly read: (get: <B>(atom: Atom<B>) => B) => A
    readonly _A?: A
  }

  /** An atom that can also be written to. */
  export interface Writable<A> extends Atom<A> {
    readonly writable: true
  }

  /** `Atom.make((get) => ...)` → derived; `Atom.make(value)` → writable source. */
  export const make: {
    <A>(read: (get: <B>(atom: Atom<B>) => B) => A): Atom<A>
    <A>(initial: A): Writable<A>
  } = (<A>(input: A | ((get: <B>(atom: Atom<B>) => B) => A)) =>
    typeof input === "function"
      ? { read: input as (get: <B>(atom: Atom<B>) => B) => A }
      : { read: () => input, writable: true }) as never
}

export namespace Registry {
  export interface Registry {
    get<A>(atom: Atom.Atom<A>): A
    set<A>(atom: Atom.Writable<A>, value: A): void
    subscribe<A>(atom: Atom.Atom<A>, listener: (value: A) => void): () => void
  }

  const isWritable = <A>(atom: Atom.Atom<A>): atom is Atom.Writable<A> => "writable" in atom

  /**
   * Holds every atom's current value and republishes on write. Values live in
   * the registry, never in the atom, so an atom is a description and the
   * registry is the single place state exists — the same split
   * `@effect-atom/atom` makes, and the reason two registries over the same atoms
   * do not see each other.
   */
  export const make = (): Registry => {
    const values = new WeakMap<Atom.Atom<unknown>, unknown>()
    const listeners = new WeakMap<Atom.Atom<unknown>, Set<(value: never) => void>>()
    const derived: Array<Atom.Atom<unknown>> = []

    // A writable atom reads back what was last written to it; a derived atom
    // recomputes from whatever its own `read` asks for.
    const read = <A>(atom: Atom.Atom<A>): A =>
      isWritable(atom) && values.has(atom) ? values.get(atom) as A : atom.read(read)

    const get = <A>(atom: Atom.Atom<A>): A => {
      if (!values.has(atom)) {
        if (!isWritable(atom) && !derived.includes(atom)) derived.push(atom)
        values.set(atom, read(atom))
      }
      return values.get(atom) as A
    }

    const publish = <A>(atom: Atom.Atom<A>, value: A): void => {
      for (const listener of listeners.get(atom) ?? []) (listener as (v: A) => void)(value)
    }

    return {
      get,
      set: (atom, value) => {
        values.set(atom, value)
        publish(atom, value)
        for (const dependent of derived) {
          const next = read(dependent)
          if (!Object.is(next, values.get(dependent))) {
            values.set(dependent, next)
            publish(dependent, next)
          }
        }
      },
      subscribe: (atom, listener) => {
        get(atom)
        let set = listeners.get(atom)
        if (set === undefined) {
          set = new Set()
          listeners.set(atom, set)
        }
        set.add(listener as (value: never) => void)
        return () => void set.delete(listener as (value: never) => void)
      },
    }
  }
}
