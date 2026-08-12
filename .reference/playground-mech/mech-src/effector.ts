/**
 * The abstract effector protocol (SPEC §6.1) as a mech System — a faithful
 * port of `go/effector/model/model.go`.
 *
 * "Faithful" is load-bearing and machine-checked: the canonical state
 * encoding here produces the SAME BYTES as the Go model's Encode, so the
 * cross-language wall test can require that both checkers agree not just on
 * verdicts but on exact state counts, transition counts, and summed FNV-1a
 * fingerprints. Two independent implementations in two languages arriving at
 * the same 64-bit fingerprint over 172,214 states is corroboration of a kind
 * neither can provide alone; a one-byte divergence in semantics moves the
 * fingerprint. Do not "improve" this file without moving the Go model in
 * lockstep — drift between the halves is a finding, not a refactor.
 *
 * See go/effector/model/model.go for the modelling decisions (why commit is
 * split, why time is a boolean, why revisions collapse to a Fresh bit); they
 * are not repeated here.
 */

import type { Invariant, System } from "./system.ts"

export const MaxOwners = 4

export type Protocol = "single-key" | "two-key"

export const TagAbsent = 0
export const TagClaim = 1
export const TagDone = 2
export type Tag = typeof TagAbsent | typeof TagClaim | typeof TagDone

export interface Register {
  readonly tag: Tag
  readonly fence: number
  readonly owner: number
  readonly live: boolean
  readonly result: number
}

export interface Pending {
  readonly active: boolean
  readonly usedFence: number
  readonly snapTag: Tag
  readonly snapFence: number
  readonly snapResult: number
  readonly fresh: boolean
}

export interface Process {
  readonly crashed: boolean
  readonly hasClaim: boolean
  readonly fence: number
  readonly pend: Pending
}

export interface State {
  readonly key1: Register
  readonly key2: Register
  readonly maxFence: number
  readonly procs: ReadonlyArray<Process>
}

export interface ModelConfig {
  readonly owners: number
  readonly protocol: Protocol
  readonly adversarialSteal: boolean
  readonly selfInterleave: boolean
  readonly allowCrash: boolean
  /** 0 = the depth bound decides (mirrors Go maxFenceCap). */
  readonly maxFence: number
}

export type ActionKind = "claim" | "expire" | "begin" | "finish" | "crash"

export interface Action {
  readonly kind: ActionKind
  readonly owner: number
}

export type OutcomeKind =
  | "none"
  | "claimed"
  | "held"
  | "committed-err"
  | "fenced"
  | "first"
  | "idempotent"

export interface Outcome {
  readonly kind: OutcomeKind
  readonly fence: number
}

const zeroRegister: Register = {
  tag: TagAbsent,
  fence: 0,
  owner: 0,
  live: false,
  result: 0,
}
const zeroPending: Pending = {
  active: false,
  usedFence: 0,
  snapTag: TagAbsent,
  snapFence: 0,
  snapResult: 0,
  fresh: false,
}
const zeroProcess: Process = {
  crashed: false,
  hasClaim: false,
  fence: 0,
  pend: zeroPending,
}

export const initial = (): State => ({
  key1: zeroRegister,
  key2: zeroRegister,
  maxFence: 0,
  procs: Array.from({ length: MaxOwners }, () => zeroProcess),
})

const ownerName = (o: number): string => String.fromCharCode(65 + o)
const resultOf = (owner: number): number => owner + 1

const terminal = (config: ModelConfig, s: State): Register => {
  if (config.protocol === "two-key") return s.key2
  if (s.key1.tag === TagDone) return s.key1
  return zeroRegister
}

export const maxFenceCap = (config: ModelConfig, depth: number): number => {
  if (config.maxFence > 0) return config.maxFence
  if (depth > 0 && depth < 255) return depth
  return 255
}

// ---------- enabled / actions (fixed order: by kind, then owner) ----------

const enabled = (
  config: ModelConfig,
  s: State,
  a: Action,
  fenceCap: number,
): boolean => {
  if (a.kind === "expire") return s.key1.tag === TagClaim && s.key1.live
  if (a.owner < 0 || a.owner >= config.owners) return false
  const p = s.procs[a.owner]!
  if (p.crashed) return false
  const blocked = p.pend.active && !config.selfInterleave
  switch (a.kind) {
    case "claim": {
      if (blocked) return false
      if (s.key1.tag === TagClaim && terminal(config, s).tag !== TagDone) {
        const steals = !s.key1.live || config.adversarialSteal
        if (steals && s.key1.fence >= fenceCap) return false
      }
      return true
    }
    case "begin":
      return p.hasClaim && !p.pend.active
    case "finish":
      return p.pend.active
    case "crash":
      return config.allowCrash
  }
}

const ACTION_KINDS: ReadonlyArray<ActionKind> = [
  "claim",
  "expire",
  "begin",
  "finish",
  "crash",
]

export const actionsOf =
  (config: ModelConfig, fenceCap: number) =>
  (s: State): ReadonlyArray<Action> => {
    const out: Array<Action> = []
    for (const kind of ACTION_KINDS) {
      if (kind === "expire") {
        const a: Action = { kind, owner: 0 }
        if (enabled(config, s, a, fenceCap)) out.push(a)
        continue
      }
      for (let o = 0; o < config.owners; o++) {
        const a: Action = { kind, owner: o }
        if (enabled(config, s, a, fenceCap)) out.push(a)
      }
    }
    return out
  }

// ---------- step ----------

interface Mutable {
  key1: Register
  key2: Register
  maxFence: number
  procs: Array<Process>
}

const thaw = (s: State): Mutable => ({
  key1: s.key1,
  key2: s.key2,
  maxFence: s.maxFence,
  procs: [...s.procs],
})

const markKey1Written = (next: Mutable): void => {
  for (let i = 0; i < next.procs.length; i++) {
    const p = next.procs[i]!
    if (p.pend.active) {
      next.procs[i] = { ...p, pend: { ...p.pend, fresh: false } }
    }
  }
}

const classify = (
  usedFence: number,
  result: number,
  doneFence: number,
  doneResult: number,
): Outcome => {
  if (doneFence !== usedFence) return { kind: "fenced", fence: 0 }
  if (doneResult === result) return { kind: "idempotent", fence: usedFence }
  return { kind: "committed-err", fence: 0 }
}

const finishSingleKey = (next: Mutable, pd: Pending, mine: number): Outcome => {
  switch (pd.snapTag) {
    case TagAbsent:
      return { kind: "fenced", fence: 0 }
    case TagDone:
      return classify(pd.usedFence, mine, pd.snapFence, pd.snapResult)
    case TagClaim:
      break
  }
  if (pd.snapFence !== pd.usedFence) return { kind: "fenced", fence: 0 }
  if (pd.fresh) {
    next.key1 = {
      tag: TagDone,
      fence: pd.usedFence,
      owner: 0,
      live: false,
      result: mine,
    }
    markKey1Written(next)
    return { kind: "first", fence: pd.usedFence }
  }
  if (next.key1.tag === TagDone) {
    return classify(pd.usedFence, mine, next.key1.fence, next.key1.result)
  }
  return { kind: "fenced", fence: 0 }
}

const finishTwoKey = (next: Mutable, pd: Pending, mine: number): Outcome => {
  if (pd.snapTag !== TagClaim || pd.snapFence !== pd.usedFence) {
    return { kind: "fenced", fence: 0 }
  }
  if (next.key2.tag === TagAbsent) {
    next.key2 = {
      tag: TagDone,
      fence: pd.usedFence,
      owner: 0,
      live: false,
      result: mine,
    }
    return { kind: "first", fence: pd.usedFence }
  }
  return classify(pd.usedFence, mine, next.key2.fence, next.key2.result)
}

const normalize = (config: ModelConfig, next: Mutable): void => {
  switch (next.key1.tag) {
    case TagAbsent:
      next.key1 = zeroRegister
      break
    case TagClaim:
      if (next.key1.result !== 0) next.key1 = { ...next.key1, result: 0 }
      break
    case TagDone:
      if (next.key1.owner !== 0 || next.key1.live) {
        next.key1 = { ...next.key1, owner: 0, live: false }
      }
      break
  }
  if (next.key2.tag !== TagDone || config.protocol !== "two-key") {
    next.key2 = zeroRegister
  } else if (next.key2.owner !== 0 || next.key2.live) {
    next.key2 = { ...next.key2, owner: 0, live: false }
  }
  for (let i = 0; i < next.procs.length; i++) {
    let p = next.procs[i]!
    if (p.crashed) {
      next.procs[i] = { ...zeroProcess, crashed: true }
      continue
    }
    if (!p.hasClaim && p.fence !== 0) p = { ...p, fence: 0 }
    if (!p.pend.active) {
      if (p.pend !== zeroPending) p = { ...p, pend: zeroPending }
      next.procs[i] = p
      continue
    }
    let pend = p.pend
    if (config.protocol === "two-key" && pend.fresh) {
      pend = { ...pend, fresh: false }
    }
    if (pend.snapTag === TagAbsent && (pend.snapFence !== 0 || pend.snapResult !== 0)) {
      pend = { ...pend, snapFence: 0, snapResult: 0 }
    } else if (pend.snapTag === TagClaim && pend.snapResult !== 0) {
      pend = { ...pend, snapResult: 0 }
    }
    next.procs[i] = pend === p.pend ? p : { ...p, pend }
  }
}

export const stepOf =
  (config: ModelConfig) =>
  (s: State, a: Action): readonly [State, Outcome] => {
    const next = thaw(s)
    let out: Outcome = { kind: "none", fence: 0 }

    switch (a.kind) {
      case "expire":
        next.key1 = { ...next.key1, live: false }
        break

      case "crash":
        next.procs[a.owner] = { ...zeroProcess, crashed: true }
        break

      case "claim": {
        const o = a.owner
        if (terminal(config, s).tag === TagDone) {
          out = { kind: "committed-err", fence: 0 }
          break
        }
        if (s.key1.tag === TagAbsent) {
          next.key1 = {
            tag: TagClaim,
            fence: 1,
            owner: resultOf(o),
            live: true,
            result: 0,
          }
          markKey1Written(next)
          if (next.maxFence < 1) next.maxFence = 1
          next.procs[o] = { ...next.procs[o]!, hasClaim: true, fence: 1 }
          out = { kind: "claimed", fence: 1 }
        } else if (s.key1.live && !config.adversarialSteal) {
          out = { kind: "held", fence: 0 }
        } else {
          const f = s.key1.fence + 1
          next.key1 = {
            tag: TagClaim,
            fence: f,
            owner: resultOf(o),
            live: true,
            result: 0,
          }
          markKey1Written(next)
          if (next.maxFence < f) next.maxFence = f
          next.procs[o] = { ...next.procs[o]!, hasClaim: true, fence: f }
          out = { kind: "claimed", fence: f }
        }
        break
      }

      case "begin": {
        const o = a.owner
        next.procs[o] = {
          ...next.procs[o]!,
          pend: {
            active: true,
            usedFence: s.procs[o]!.fence,
            snapTag: s.key1.tag,
            snapFence: s.key1.fence,
            snapResult: s.key1.result,
            fresh: true,
          },
        }
        break
      }

      case "finish": {
        const o = a.owner
        const pd = s.procs[o]!.pend
        const mine = resultOf(o)
        out =
          config.protocol === "two-key"
            ? finishTwoKey(next, pd, mine)
            : finishSingleKey(next, pd, mine)
        next.procs[o] = { ...next.procs[o]!, pend: zeroPending }
        break
      }
    }

    normalize(config, next)
    return [
      {
        key1: next.key1,
        key2: next.key2,
        maxFence: next.maxFence,
        procs: next.procs,
      },
      out,
    ]
  }

// ---------- canonical encoding: SAME BYTES as Go State.Encode ----------

/** 5 + 5 + 1 + MaxOwners*9 — must equal go/effector/model EncodedLen. */
export const EncodedLen = 5 + 5 + 1 + MaxOwners * 9

export const encodeState = (s: State): string => {
  const bytes: Array<number> = []
  const put = (v: number): void => {
    bytes.push(v & 0xff)
  }
  const putBool = (v: boolean): void => {
    put(v ? 1 : 0)
  }
  const putReg = (r: Register): void => {
    put(r.tag)
    put(r.fence)
    put(r.owner)
    put(r.result)
    putBool(r.live)
  }
  putReg(s.key1)
  putReg(s.key2)
  put(s.maxFence)
  for (const p of s.procs) {
    putBool(p.crashed)
    putBool(p.hasClaim)
    put(p.fence)
    putBool(p.pend.active)
    put(p.pend.usedFence)
    put(p.pend.snapTag)
    put(p.pend.snapFence)
    put(p.pend.snapResult)
    putBool(p.pend.fresh)
  }
  return String.fromCharCode(...bytes)
}

// ---------- description (matches the Go trace rendering closely enough
// for humans; the wall test compares action/label sequences, not prose) ----------

const tagName = (t: Tag): string =>
  t === TagClaim ? "Claim" : t === TagDone ? "Done" : "Absent"

const describeRegister = (r: Register): string => {
  switch (r.tag) {
    case TagClaim:
      return `Claim(f=${r.fence},o=${r.owner},${r.live ? "live" : "expired"})`
    case TagDone:
      return `Done(f=${r.fence},r=${r.result})`
    case TagAbsent:
      return "Absent"
  }
}

export const describeAction = (a: Action): string =>
  a.kind === "expire" ? "expire" : `${a.kind}(${ownerName(a.owner)})`

export const describeOutcome = (o: Outcome): string => {
  switch (o.kind) {
    case "claimed":
      return `claimed@f${o.fence}`
    case "first":
      return `first@f${o.fence}`
    case "idempotent":
      return `idempotent@f${o.fence}`
    case "held":
      return "ErrHeld"
    case "committed-err":
      return "ErrCommitted"
    case "fenced":
      return "ErrFenced"
    case "none":
      return "-"
  }
}

export const describeStateOf =
  (config: ModelConfig) =>
  (s: State): string => {
    const parts: Array<string> = []
    if (config.protocol === "two-key") {
      parts.push(
        `claim=${describeRegister(s.key1)} done=${describeRegister(s.key2)} maxFence=${s.maxFence}`,
      )
    } else {
      parts.push(`work=${describeRegister(s.key1)} maxFence=${s.maxFence}`)
    }
    for (let o = 0; o < config.owners; o++) {
      const p = s.procs[o]!
      if (p.crashed) {
        parts.push(`${ownerName(o)}:crashed`)
        continue
      }
      if (!p.hasClaim && !p.pend.active) continue
      let piece = `${ownerName(o)}:`
      if (p.hasClaim) piece += `holds(f=${p.fence})`
      if (p.pend.active) {
        piece += `begun(used=${p.pend.usedFence},saw=${tagName(p.pend.snapTag)}@${p.pend.snapFence})`
      }
      parts.push(piece)
    }
    return parts.join(" ")
  }

// ---------- the System ----------

export const effectorSystem = (
  config: ModelConfig,
  depth: number,
): System<State, Action, Outcome> => {
  const fenceCap = maxFenceCap(config, depth)
  return {
    init: initial(),
    actions: actionsOf(config, fenceCap),
    step: stepOf(config),
    encode: encodeState,
    describeAction,
    describeState: describeStateOf(config),
    describeLabel: describeOutcome,
  }
}

// ---------- the gate invariants, ported 1:1 ----------

export const fencingSafety: Invariant<State, Action, Outcome> = {
  name: "fencing safety (SPEC 6.3)",
  violated: (_pre, a, out, post) => {
    if (out.kind !== "first") return null
    if (out.fence === post.maxFence) return null
    return `${ownerName(a.owner)} committed at fence ${out.fence} while generation ${post.maxFence} had already linearized`
  },
}

export const uniqueTerminalOutcome = (
  config: ModelConfig,
): Invariant<State, Action, Outcome> => ({
  name: "unique terminal outcome (SPEC 6.2)",
  violated: (pre, _a, _out, post) => {
    const before = terminal(config, pre)
    if (before.tag !== TagDone) return null
    const after = terminal(config, post)
    if (
      after.tag === before.tag &&
      after.fence === before.fence &&
      after.result === before.result &&
      after.owner === before.owner &&
      after.live === before.live
    ) {
      return null
    }
    return `terminal outcome changed from ${describeRegister(before)} to ${describeRegister(after)}`
  },
})

export const terminalFenceIsMaximal = (
  config: ModelConfig,
): Invariant<State, Action, Outcome> => ({
  name: "terminal fence is maximal",
  violated: (_pre, _a, _out, post) => {
    const t = terminal(config, post)
    if (t.tag !== TagDone || t.fence === post.maxFence) return null
    return `stored outcome is at fence ${t.fence}, max generation is ${post.maxFence}`
  },
})

export const generationsAreMonotone: Invariant<State, Action, Outcome> = {
  name: "generations are monotone",
  violated: (pre, _a, _out, post) => {
    if (post.maxFence >= pre.maxFence) return null
    return `max generation fell from ${pre.maxFence} to ${post.maxFence}`
  },
}

export const defaultInvariants = (
  config: ModelConfig,
): ReadonlyArray<Invariant<State, Action, Outcome>> => [
  fencingSafety,
  uniqueTerminalOutcome(config),
  terminalFenceIsMaximal(config),
  generationsAreMonotone,
]

/** The configuration the Go gate checks (gateModel in model_test.go). */
export const gateConfig = (protocol: Protocol): ModelConfig => ({
  owners: 3,
  protocol,
  adversarialSteal: true,
  selfInterleave: false,
  allowCrash: true,
  maxFence: 0,
})
