/**
 * The transcription gate's checkable half.
 *
 * The gate holds the status vocabulary this package carries to the declaration
 * the pinned client actually ships, and holds the machine built over it to two
 * properties the vocabulary ruling requires. It reads the vendor's own bytes —
 * not a copy of them, not a fixture transcribed from them — so the oracle is
 * outside this package entirely. That is the whole reason the tables are data:
 * a switch statement over eleven cases has nothing to compare against.
 *
 * Five clauses, each with its own failure line and its own planted mutation:
 *
 * 1. **Drift.** The transcribed rows are exactly the vendor's declarations, in
 *    the vendor's declaration order, with the vendor's own field names, sorts
 *    and optionality. An added, removed, renamed, reordered or re-shaped row
 *    refuses.
 * 2. **Totality.** Every declared event is placed — as a transition with a
 *    target state, or as a reading within a state. There is no default case and
 *    no unplaced event.
 * 3. **Readings are never states.** No event placed as a reading appears as a
 *    machine state, and the machine's state set is exactly the transition
 *    events. A hand-written state union standing beside the table refuses here.
 * 4. **The terminal state is reachable and absorbing.** Every state reaches the
 *    terminal one, the terminal one leaves nowhere, and every state is reachable
 *    from the unobserved position. A machine whose ordinary teardown were
 *    unreachable would be modelling the ordinary case as exceptional.
 * 5. **The pump branches on no event name.** The consumer walks rows and reads
 *    what to do off the row it matched. A per-event branch — a reaction to the
 *    lame-duck row, a hand-written dispatch — refuses.
 *
 * @module
 */
import { resolve } from "node:path"

import {
  CONNECTION_TRANSITIONS,
  STATUS_EVENTS,
  STATUS_VOCABULARY_PIN,
  type StatusEventRow,
  type StatusFieldSort,
  type TransitionRow,
} from "../src/internal/statusvocabulary.js"

/** Where the pinned client's own declaration lives, relative to the package. */
export const PIN_DECLARATION_PATH = "node_modules/@nats-io/nats-core/lib/core.d.ts"

/** Where the pinned client states its own version, relative to the package. */
export const PIN_MANIFEST_PATH = "node_modules/@nats-io/nats-core/package.json"

/** Where the one consumer lives, relative to the package. */
export const PUMP_PATH = "src/internal/statuspump.ts"

/** One clause's verdict. */
export type Clause =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string }

const ok: Clause = { ok: true }
const no = (reason: string): Clause => ({ ok: false, reason })

/** One field as the vendor declares it: its name, its TypeScript type, its optionality. */
export interface VendorField {
  readonly name: string
  readonly type: string
  readonly optional: boolean
}

/** One status event type as the vendor declares it. */
export interface VendorRow {
  readonly declaration: string
  readonly type: string
  readonly payload: ReadonlyArray<VendorField>
}

/**
 * The sort each vendor type text is transcribed as.
 *
 * The map is the transcription's only interpretive step, and it is one line per
 * shape the vendor actually declares. A vendor type absent from it refuses
 * rather than being guessed at, which is what makes a re-shaped payload a
 * failure instead of a silent re-sort.
 */
const SORT_OF_VENDOR_TYPE: { readonly [type: string]: StatusFieldSort } = {
  string: "string",
  "string[]": "string-list",
  number: "number",
  Error: "error-object",
  Subscription: "subscription",
}

/**
 * Reads the vendor's status declarations out of the bytes it ships.
 *
 * Only the region before the union is read, so the rows are the ones the vendor
 * declares as status events and the order is the order it declares them in.
 */
export const readVendorRows = (
  source: string,
): { readonly rows: ReadonlyArray<VendorRow>; readonly union: ReadonlyArray<string> } => {
  const unionAt = source.indexOf("export type Status =")
  if (unionAt < 0) throw new Error("the pinned declaration carries no status union")
  const head = source.slice(0, unionAt)
  const tail = source.slice(unionAt)
  const unionText = tail.slice(0, tail.indexOf(";"))
  const union = unionText
    .slice(unionText.indexOf("=") + 1)
    .split("|")
    .map((name) => name.trim())
    .filter((name) => name.length !== 0)

  const rows: Array<VendorRow> = []
  for (const block of head.matchAll(/export type (\w+) = \{([^}]*)\};/gu)) {
    const declaration = block[1]!
    const body = block[2]!
    let type: string | undefined
    const payload: Array<VendorField> = []
    for (const line of body.split(";")) {
      const member = line.trim()
      if (member.length === 0) continue
      const matched = /^(\w+)(\??):\s*(.+)$/u.exec(member)
      if (matched === null) throw new Error(`unreadable member in ${declaration}: ${member}`)
      const [, name, question, declared] = matched
      if (name === "type") {
        type = declared!.trim().replace(/^"|"$/gu, "")
        continue
      }
      payload.push({ name: name!, type: declared!.trim(), optional: question === "?" })
    }
    if (type === undefined) continue
    rows.push({ declaration, type, payload })
  }
  return { rows, union }
}

const fieldText = (field: VendorField): string =>
  `${field.name}${field.optional ? "?" : ""}: ${field.type}`

const transcribedText = (row: StatusEventRow): string =>
  row.payload
    .map((field) => `${field.name}${field.optional ? "?" : ""}: ${field.sort}`)
    .join(", ")

const vendorAsSorts = (row: VendorRow): string =>
  row.payload
    .map((field) => {
      const sort = SORT_OF_VENDOR_TYPE[field.type]
      if (sort === undefined) {
        throw new Error(
          `the pinned declaration carries a payload shape this transcription has no sort for: ${
            fieldText(field)
          } in ${row.declaration}`,
        )
      }
      return `${field.name}${field.optional ? "?" : ""}: ${sort}`
    })
    .join(", ")

/** Clause 1: the transcription is the vendor's declaration, row for row. */
export const checkDrift = (
  transcribed: ReadonlyArray<StatusEventRow>,
  vendor: { readonly rows: ReadonlyArray<VendorRow>; readonly union: ReadonlyArray<string> },
): Clause => {
  if (transcribed.length !== vendor.rows.length) {
    return no(
      `the transcription carries ${transcribed.length} rows and the pin declares ${vendor.rows.length}`,
    )
  }
  for (let index = 0; index < vendor.rows.length; index++) {
    const declared = vendor.rows[index]!
    const row = transcribed[index]!
    if (row.declaration !== declared.declaration) {
      return no(
        `row ${index} names declaration ${row.declaration}; the pin declares ${declared.declaration} at that position`,
      )
    }
    if (row.type !== declared.type) {
      return no(
        `${declared.declaration} carries event ${declared.type} at the pin; the transcription says ${row.type}`,
      )
    }
    const expected = vendorAsSorts(declared)
    const carried = transcribedText(row)
    if (expected !== carried) {
      return no(
        `${declared.declaration} carries [${expected}] at the pin; the transcription says [${carried}]`,
      )
    }
  }
  const declaredNames = new Set(vendor.rows.map((row) => row.declaration))
  for (const name of vendor.union) {
    if (!declaredNames.has(name)) {
      return no(`the pin's union names ${name}, which it does not declare as a status event`)
    }
  }
  if (vendor.union.length !== vendor.rows.length) {
    return no(
      `the pin's union lists ${vendor.union.length} members over ${vendor.rows.length} declarations`,
    )
  }
  return ok
}

/** Clause 2: every declared event is placed, and the machine covers the transitions. */
export const checkTotality = (
  transcribed: ReadonlyArray<StatusEventRow>,
  machine: ReadonlyArray<TransitionRow>,
): Clause => {
  const transitions = transcribed.filter((row) => row.placement === "transition")
  const observations = transcribed.filter((row) => row.placement === "observation")
  if (transitions.length + observations.length !== transcribed.length) {
    return no("a transcribed row is placed neither as a transition nor as a reading")
  }
  const placed = new Set(machine.map((row) => row.event))
  for (const row of transitions) {
    if (!placed.has(row.type)) {
      return no(`${row.type} is placed as a transition and the machine carries no row for it`)
    }
  }
  for (const row of machine) {
    if (!transcribed.some((event) => event.type === row.event)) {
      return no(`the machine carries a row for ${row.event}, which the transcription never places`)
    }
  }
  return ok
}

/** Clause 3: a reading is never a state, and the states are exactly the transitions. */
export const checkReadingsAreNotStates = (
  transcribed: ReadonlyArray<StatusEventRow>,
  machine: ReadonlyArray<TransitionRow>,
): Clause => {
  const states = new Set(machine.map((row) => row.state))
  const moved = new Set(machine.map((row) => row.event))
  for (const row of transcribed) {
    if (row.placement !== "observation") continue
    if (states.has(row.type) || moved.has(row.type)) {
      return no(`${row.type} is a reading within a state and the machine models it as a state`)
    }
  }
  const transitions = new Set(
    transcribed.filter((row) => row.placement === "transition").map((row) => row.type),
  )
  for (const state of states) {
    if (!transitions.has(state)) {
      return no(`the machine carries a state ${state} that no transcribed transition enters`)
    }
  }
  for (const row of machine) {
    if (row.state !== row.event) {
      return no(
        `the machine's row for ${row.event} enters a state named ${row.state}; a state is named by the transition that enters it`,
      )
    }
  }
  return ok
}

/** Clause 4: the terminal state is reachable from everywhere and leaves nowhere. */
export const checkTerminal = (machine: ReadonlyArray<TransitionRow>): Clause => {
  const absorbing = machine.filter((row) => row.absorbing)
  if (absorbing.length !== 1) {
    return no(`the machine declares ${absorbing.length} absorbing states; it must declare one`)
  }
  const terminal = absorbing[0]!
  for (const row of machine) {
    if (row.event !== terminal.event && row.from.includes(terminal.state)) {
      return no(`${row.event} leaves the absorbing state ${terminal.state}`)
    }
  }
  const reachable = new Set<string | null>([null])
  for (let pass = 0; pass < machine.length + 1; pass++) {
    for (const row of machine) {
      if (row.from.some((from) => reachable.has(from))) reachable.add(row.state)
    }
  }
  for (const row of machine) {
    if (!reachable.has(row.state)) {
      return no(`the machine's state ${row.state} is not reachable from an unobserved connection`)
    }
  }
  for (const row of machine) {
    if (row.state === terminal.state) continue
    if (!terminal.from.includes(row.state)) {
      return no(`the absorbing state is not reachable from ${row.state}`)
    }
  }
  if (!terminal.from.includes(null)) {
    return no("the absorbing state is not reachable from an unobserved connection")
  }
  return ok
}

/** Strips comments so a spelling named in prose is not read as a branch. */
export const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//gu, " ").replace(/^[ \t]*\/\/.*$/gmu, " ")

/** Clause 5: the one consumer branches on no event name. */
export const checkNoEventBranch = (
  transcribed: ReadonlyArray<StatusEventRow>,
  pumpSource: string,
): Clause => {
  const code = withoutComments(pumpSource)
  for (const row of transcribed) {
    if (code.includes(`"${row.type}"`) || code.includes(`'${row.type}'`)) {
      return no(
        `the consumer spells the event name ${row.type}; it must walk the transcribed rows and read what to do off the row it matched`,
      )
    }
  }
  return ok
}

/** Every clause, over one set of evidence. */
export interface VocabularyEvidence {
  readonly transcribed: ReadonlyArray<StatusEventRow>
  readonly machine: ReadonlyArray<TransitionRow>
  readonly vendor: {
    readonly rows: ReadonlyArray<VendorRow>
    readonly union: ReadonlyArray<string>
  }
  readonly pumpSource: string
  readonly pinVersion: string
}

/** Runs every clause in order and reports the first that refuses. */
export const checkVocabulary = (evidence: VocabularyEvidence): Clause => {
  if (evidence.pinVersion !== STATUS_VOCABULARY_PIN.version) {
    return no(
      `the transcription pins ${STATUS_VOCABULARY_PIN.package} at ${STATUS_VOCABULARY_PIN.version}; the installed package is ${evidence.pinVersion}`,
    )
  }
  const drift = checkDrift(evidence.transcribed, evidence.vendor)
  if (!drift.ok) return drift
  const totality = checkTotality(evidence.transcribed, evidence.machine)
  if (!totality.ok) return totality
  const readings = checkReadingsAreNotStates(evidence.transcribed, evidence.machine)
  if (!readings.ok) return readings
  const terminal = checkTerminal(evidence.machine)
  if (!terminal.ok) return terminal
  return checkNoEventBranch(evidence.transcribed, evidence.pumpSource)
}

/** Reads the evidence this package actually holds. */
export const readEvidence = async (packageRoot: string): Promise<VocabularyEvidence> => {
  const declaration = await Bun.file(resolve(packageRoot, PIN_DECLARATION_PATH)).text()
  const manifest = await Bun.file(resolve(packageRoot, PIN_MANIFEST_PATH)).json() as {
    readonly version: string
  }
  return {
    transcribed: STATUS_EVENTS,
    machine: CONNECTION_TRANSITIONS,
    vendor: readVendorRows(declaration),
    pumpSource: await Bun.file(resolve(packageRoot, PUMP_PATH)).text(),
    pinVersion: manifest.version,
  }
}
