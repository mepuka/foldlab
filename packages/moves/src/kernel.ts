/**
 * The E2 move calculus: a transliteration of `verify/moves/Moves/Model.lean`,
 * one named function per named def. The Lean theorems are parametric over the
 * carriers, so they license any instantiation that supplies what the model's
 * typeclass context supplies: a fixed finite hole carrier, total transitive
 * comparators for values and holders whose equality agrees with comparison,
 * and candidate sets stored canonically. Deliberately boring: no IO, no
 * caching, no cleverness — divergence from the model is the only bug class.
 */

export type Ordering = -1 | 0 | 1
export type Cmp<T> = (left: T, right: T) => Ordering

/** A holder-attributed candidate pair. The same pair twice is one candidate. */
export interface Candidate<V, H> {
  readonly value: V
  readonly holder: H
}

/** Canonically sorted and deduplicated under the candidate comparator. */
export type CandidateSet<V, H> = ReadonlyArray<Candidate<V, H>>

export type HoleState<V, H> =
  | { readonly tag: "open" }
  | { readonly tag: "filled"; readonly value: V }
  | { readonly tag: "disputed"; readonly candidates: CandidateSet<V, H> }
  | { readonly tag: "decided"; readonly value: V }

export type Move<Hole extends string, V, H> =
  | { readonly op: "fill"; readonly hole: Hole; readonly value: V; readonly holder: H }
  | {
    readonly op: "dispute"
    readonly hole: Hole
    readonly candidates: CandidateSet<V, H>
    readonly holder: H
  }
  | { readonly op: "decide"; readonly hole: Hole; readonly value: V }

/**
 * `holes` is the observable meaning fold; `evidence` is journal provenance.
 * The meaning digest is a function of `holes` alone.
 */
export interface EpistemicState<Hole extends string, V, H> {
  readonly holes: Readonly<Record<Hole, HoleState<V, H>>>
  readonly evidence: Readonly<Record<Hole, CandidateSet<V, H>>>
}

export interface Receipt<Hole extends string, V, H> {
  readonly move: Move<Hole, V, H>
  readonly admitted: boolean
}

export interface RunResult<Hole extends string, V, H> {
  readonly state: EpistemicState<Hole, V, H>
  readonly receipts: ReadonlyArray<Receipt<Hole, V, H>>
}

/**
 * A lawful resolute fence is any fixed function of the canonical pair-set
 * that returns a represented value. Every such rule inherits
 * interleaving-independence (`fence_deterministic`); soundness — choosing a
 * represented value — is the caller's one obligation, checkable with
 * `soundFence`.
 */
export interface FenceRule<V, H> {
  readonly choose: (candidates: CandidateSet<V, H>) => V
}

/** The declared finite hole carrier and the two declared total comparators. */
export interface Carrier<Hole extends string, V, H> {
  readonly holes: ReadonlyArray<Hole>
  readonly valueCmp: Cmp<V>
  readonly holderCmp: Cmp<H>
}

export interface Kernel<Hole extends string, V, H> {
  readonly carrier: Carrier<Hole, V, H>
  readonly candidateCmp: Cmp<Candidate<V, H>>
  readonly csetOfList: (items: Iterable<Candidate<V, H>>) => CandidateSet<V, H>
  readonly csetUnion: (a: CandidateSet<V, H>, b: CandidateSet<V, H>) => CandidateSet<V, H>
  readonly csetMember: (cs: CandidateSet<V, H>, c: Candidate<V, H>) => boolean
  readonly csetEq: (a: CandidateSet<V, H>, b: CandidateSet<V, H>) => boolean
  readonly valueAppears: (cs: CandidateSet<V, H>, v: V) => boolean
  readonly initial: () => EpistemicState<Hole, V, H>
  readonly put: (
    s: EpistemicState<Hole, V, H>,
    hole: Hole,
    holeState: HoleState<V, H>,
    evidence: CandidateSet<V, H>,
  ) => EpistemicState<Hole, V, H>
  readonly priorCandidates: (s: EpistemicState<Hole, V, H>, hole: Hole) => CandidateSet<V, H>
  readonly step: (s: EpistemicState<Hole, V, H>, m: Move<Hole, V, H>) => EpistemicState<Hole, V, H> | null
  readonly stepK: (s: EpistemicState<Hole, V, H>, m: Move<Hole, V, H>) => readonly [EpistemicState<Hole, V, H>, boolean]
  readonly stepTrace: (
    s: EpistemicState<Hole, V, H>,
    moves: ReadonlyArray<Move<Hole, V, H>>,
  ) => EpistemicState<Hole, V, H> | null
  readonly canonicalRepairCandidates: (
    s: EpistemicState<Hole, V, H>,
    hole: Hole,
    value: V,
    actor: H,
  ) => CandidateSet<V, H>
  readonly repair: (s: EpistemicState<Hole, V, H>, m: Move<Hole, V, H>) => EpistemicState<Hole, V, H> | null
  readonly repairK: (s: EpistemicState<Hole, V, H>, m: Move<Hole, V, H>) => readonly [EpistemicState<Hole, V, H>, boolean]
  readonly runRepair: (
    s: EpistemicState<Hole, V, H>,
    moves: ReadonlyArray<Move<Hole, V, H>>,
  ) => EpistemicState<Hole, V, H> | null
  readonly runRepairK: (
    s: EpistemicState<Hole, V, H>,
    moves: ReadonlyArray<Move<Hole, V, H>>,
  ) => RunResult<Hole, V, H>
  readonly d85Refusal: (s: EpistemicState<Hole, V, H>, m: Move<Hole, V, H>) => boolean
  readonly willAdmit: (s: EpistemicState<Hole, V, H>, m: Move<Hole, V, H>) => boolean
  readonly provenance: (s: EpistemicState<Hole, V, H>, hole: Hole) => CandidateSet<V, H>
  readonly minFenceRule: FenceRule<V, H>
  readonly pluralityFenceRule: FenceRule<V, H>
  readonly supportCount: (cs: CandidateSet<V, H>, v: V) => number
  readonly soundFence: (choose: (candidates: CandidateSet<V, H>) => V) => FenceRule<V, H>
  readonly close: (
    s: EpistemicState<Hole, V, H>,
    hole: Hole,
    rule: FenceRule<V, H>,
  ) => EpistemicState<Hole, V, H> | null
  readonly wf: (s: EpistemicState<Hole, V, H>) => boolean
  readonly meaningEq: (s: EpistemicState<Hole, V, H>, t: EpistemicState<Hole, V, H>) => boolean
  readonly stateEq: (s: EpistemicState<Hole, V, H>, t: EpistemicState<Hole, V, H>) => boolean
  readonly replay: (intents: ReadonlyArray<Move<Hole, V, H>>) => RunResult<Hole, V, H>
  readonly merge: (
    left: ReadonlyArray<Move<Hole, V, H>>,
    right: ReadonlyArray<Move<Hole, V, H>>,
  ) => EpistemicState<Hole, V, H>
}

export const makeKernel = <Hole extends string, V, H>(
  carrier: Carrier<Hole, V, H>,
): Kernel<Hole, V, H> => {
  const { holderCmp, holes, valueCmp } = carrier

  const candidateCmp: Cmp<Candidate<V, H>> = (left, right) => {
    const byValue = valueCmp(left.value, right.value)
    return byValue !== 0 ? byValue : holderCmp(left.holder, right.holder)
  }

  const valueEq = (a: V, b: V): boolean => valueCmp(a, b) === 0

  type State = EpistemicState<Hole, V, H>
  type Mv = Move<Hole, V, H>
  type CSet = CandidateSet<V, H>
  type HState = HoleState<V, H>

  const csetOfList = (items: Iterable<Candidate<V, H>>): CSet => {
    const sorted = [...items].sort(candidateCmp)
    return sorted.filter((c, i) => i === 0 || candidateCmp(sorted[i - 1]!, c) !== 0)
  }

  const csetUnion = (a: CSet, b: CSet): CSet => csetOfList([...a, ...b])

  const csetMember = (cs: CSet, c: Candidate<V, H>): boolean =>
    cs.some((x) => candidateCmp(x, c) === 0)

  const csetEq = (a: CSet, b: CSet): boolean =>
    a.length === b.length && a.every((x, i) => candidateCmp(x, b[i]!) === 0)

  const valueAppears = (cs: CSet, v: V): boolean => cs.some((c) => valueEq(c.value, v))

  const singleton = (value: V, holder: H): CSet => [{ holder, value }]

  const record = <T>(make: (hole: Hole) => T): Readonly<Record<Hole, T>> =>
    Object.fromEntries(holes.map((h) => [h, make(h)])) as Record<Hole, T>

  const initial = (): State => ({
    evidence: record<CSet>(() => []),
    holes: record<HState>(() => ({ tag: "open" })),
  })

  const put = (s: State, hole: Hole, holeState: HState, evidence: CSet): State => ({
    evidence: { ...s.evidence, [hole]: evidence } as Readonly<Record<Hole, CSet>>,
    holes: { ...s.holes, [hole]: holeState } as Readonly<Record<Hole, HState>>,
  })

  const priorCandidates = (s: State, hole: Hole): CSet => {
    const hs = s.holes[hole]
    switch (hs.tag) {
      case "open":
      case "decided":
        return []
      case "filled":
        return s.evidence[hole]
      case "disputed":
        return hs.candidates
    }
  }

  const step = (s: State, m: Mv): State | null => {
    switch (m.op) {
      case "fill": {
        const hs = s.holes[m.hole]
        switch (hs.tag) {
          case "open":
            return put(s, m.hole, { tag: "filled", value: m.value }, singleton(m.value, m.holder))
          case "filled":
            return valueEq(hs.value, m.value) ? s : null
          case "disputed":
          case "decided":
            return null
        }
      }
      case "dispute": {
        if (s.holes[m.hole].tag === "decided") return null
        if (m.candidates.length === 0) return null
        const merged = csetUnion(priorCandidates(s, m.hole), m.candidates)
        return put(s, m.hole, { candidates: merged, tag: "disputed" }, merged)
      }
      case "decide": {
        const hs = s.holes[m.hole]
        if (hs.tag !== "disputed") return null
        return valueAppears(hs.candidates, m.value)
          ? put(s, m.hole, { tag: "decided", value: m.value }, hs.candidates)
          : null
      }
    }
  }

  const stepK = (s: State, m: Mv): readonly [State, boolean] => {
    const next = step(s, m)
    return next === null ? [s, false] : [next, true]
  }

  const stepTrace = (s: State, moves: ReadonlyArray<Mv>): State | null => {
    let state = s
    for (const move of moves) {
      const next = step(state, move)
      if (next === null) return null
      state = next
    }
    return state
  }

  const canonicalRepairCandidates = (s: State, hole: Hole, value: V, actor: H): CSet =>
    csetUnion(s.evidence[hole], singleton(value, actor))

  const repair = (s: State, m: Mv): State | null => {
    if (m.op !== "fill") return step(s, m)
    const hs = s.holes[m.hole]
    switch (hs.tag) {
      case "open":
        return step(s, m)
      case "filled":
        return valueEq(hs.value, m.value)
          ? put(s, m.hole, hs, csetUnion(s.evidence[m.hole], singleton(m.value, m.holder)))
          : step(s, {
            candidates: canonicalRepairCandidates(s, m.hole, m.value, m.holder),
            hole: m.hole,
            holder: m.holder,
            op: "dispute",
          })
      case "disputed":
        return step(s, {
          candidates: csetUnion(hs.candidates, singleton(m.value, m.holder)),
          hole: m.hole,
          holder: m.holder,
          op: "dispute",
        })
      case "decided":
        return put(s, m.hole, hs, csetUnion(s.evidence[m.hole], singleton(m.value, m.holder)))
    }
  }

  const repairK = (s: State, m: Mv): readonly [State, boolean] => {
    const next = repair(s, m)
    return next === null ? [s, false] : [next, true]
  }

  const runRepair = (s: State, moves: ReadonlyArray<Mv>): State | null => {
    let state = s
    for (const move of moves) {
      const next = repair(state, move)
      if (next === null) return null
      state = next
    }
    return state
  }

  const runRepairK = (s: State, moves: ReadonlyArray<Mv>): RunResult<Hole, V, H> => {
    let state = s
    const receipts: Array<Receipt<Hole, V, H>> = []
    for (const move of moves) {
      const [next, admitted] = repairK(state, move)
      state = next
      receipts.push({ admitted, move })
    }
    return { receipts, state }
  }

  /**
   * The complete enumeration of lawful refusal: fills never refuse, an empty
   * dispute offer is refused at every state, and refusal is a function of the
   * move and the meaning fold alone — never of arrival order or evidence.
   * `spec_refusal_iff` pins this predicate to the runner, which is what makes
   * `willAdmit` a total public prediction rather than a heuristic.
   */
  const d85Refusal = (s: State, m: Mv): boolean => {
    switch (m.op) {
      case "fill":
        return false
      case "dispute":
        return s.holes[m.hole].tag === "decided" || m.candidates.length === 0
      case "decide": {
        const hs = s.holes[m.hole]
        return hs.tag === "disputed" ? !valueAppears(hs.candidates, m.value) : true
      }
    }
  }

  const willAdmit = (s: State, m: Mv): boolean => !d85Refusal(s, m)

  /**
   * Every offer ever made at the hole, holder-attributed. Completeness is
   * `runRepairK_fill_pair`: every fill in the bag lands its exact pair here.
   */
  const provenance = (s: State, hole: Hole): CSet => s.evidence[hole]

  const minBetter = (left: Candidate<V, H>, right: Candidate<V, H>): Candidate<V, H> =>
    valueCmp(left.value, right.value) === 1 ? right : left

  const minCandidate = (cs: CSet): Candidate<V, H> => cs.reduce(minBetter, cs[0]!)

  const supportCount = (cs: CSet, v: V): number =>
    cs.filter((c) => valueEq(c.value, v)).length

  const pluralityBetter = (cs: CSet) => (left: Candidate<V, H>, right: Candidate<V, H>): Candidate<V, H> => {
    const leftCount = supportCount(cs, left.value)
    const rightCount = supportCount(cs, right.value)
    if (leftCount < rightCount) return right
    if (rightCount < leftCount) return left
    return valueCmp(left.value, right.value) === 1 ? right : left
  }

  const pluralityCandidate = (cs: CSet): Candidate<V, H> => cs.reduce(pluralityBetter(cs), cs[0]!)

  const minFenceRule: FenceRule<V, H> = { choose: (cs) => minCandidate(cs).value }

  const pluralityFenceRule: FenceRule<V, H> = { choose: (cs) => pluralityCandidate(cs).value }

  const soundFence = (choose: (candidates: CSet) => V): FenceRule<V, H> => ({
    choose: (cs) => {
      const chosen = choose(cs)
      if (!valueAppears(cs, chosen)) {
        throw new Error("unsound fence: the chosen value is not represented in the candidate set")
      }
      return chosen
    },
  })

  /**
   * Seal the fence's decision at a disputed hole. Any sound rule inherits
   * schedule-freedom: the pair-set already forgot arrival order, so the
   * decision is a function of what was said, never of when it arrived.
   */
  const close = (s: State, hole: Hole, rule: FenceRule<V, H>): State | null => {
    const hs = s.holes[hole]
    if (hs.tag !== "disputed") return null
    return step(s, { hole, op: "decide", value: rule.choose(hs.candidates) })
  }

  const wf = (s: State): boolean =>
    holes.every((hole) => {
      const hs = s.holes[hole]
      const ev = s.evidence[hole]
      switch (hs.tag) {
        case "open":
          return ev.length === 0
        case "filled":
          return ev.length > 0 && ev.every((c) => valueEq(c.value, hs.value))
        case "disputed":
          return hs.candidates.length > 0 && csetEq(ev, hs.candidates)
        case "decided":
          return valueAppears(ev, hs.value)
      }
    })

  const holeStateEq = (a: HState, b: HState): boolean => {
    if (a.tag !== b.tag) return false
    switch (a.tag) {
      case "open":
        return true
      case "filled":
      case "decided":
        return valueEq(a.value, (b as { readonly value: V }).value)
      case "disputed":
        return csetEq(a.candidates, (b as { readonly candidates: CSet }).candidates)
    }
  }

  const meaningEq = (s: State, t: State): boolean =>
    holes.every((hole) => holeStateEq(s.holes[hole], t.holes[hole]))

  const stateEq = (s: State, t: State): boolean =>
    meaningEq(s, t) && holes.every((hole) => csetEq(s.evidence[hole], t.evidence[hole]))

  const replay = (intents: ReadonlyArray<Mv>): RunResult<Hole, V, H> =>
    runRepairK(initial(), intents)

  /**
   * Sync is bag union: replay the combined intents. Over fill/dispute bags
   * the terminal state is permutation-invariant (`runRepairK_perm`), so no
   * ordering metadata or vector clocks enter the merge. `decide` is the one
   * order-sensitive move and is fenced to close; merging bags that contain
   * decides forfeits the schedule-freedom guarantee.
   */
  const merge = (left: ReadonlyArray<Mv>, right: ReadonlyArray<Mv>): State =>
    replay([...left, ...right]).state

  return {
    candidateCmp,
    canonicalRepairCandidates,
    carrier,
    close,
    csetEq,
    csetMember,
    csetOfList,
    csetUnion,
    d85Refusal,
    initial,
    meaningEq,
    merge,
    minFenceRule,
    pluralityFenceRule,
    priorCandidates,
    provenance,
    put,
    repair,
    repairK,
    replay,
    runRepair,
    runRepairK,
    soundFence,
    stateEq,
    step,
    stepK,
    stepTrace,
    supportCount,
    valueAppears,
    wf,
    willAdmit,
  }
}
