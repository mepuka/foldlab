/**
 * The handlers — programs over the store's services, never a new
 * operation (the same law `bin/cli/commands.ts` is written under).
 * Every semantic step goes through the library's doors: `Cas.Store`
 * for admission, `Cas.Loader` for reads, `Cas.RootStore` for
 * publication, and the described vector codec for the node document.
 *
 * Where a tool and a shell verb name the same act they perform the
 * same act. `cas_put` is `cas put` with the ruled input register the
 * shell verb still owes (the node document, so a node with links can
 * be spelled at all); `cas_publish_root` loads before publishing
 * exactly as `cas publish` does, so an address that will not load is
 * never published; `cas_list_roots` sorts as `cas ls` sorts, because a
 * listing an agent diffs must not depend on a backend's enumeration
 * order.
 *
 * Every step is logged. The store is content-addressed, so the log
 * line an agent reads afterwards names the address that came back —
 * which is the whole outcome of the call, not a description of it.
 */
import { Effect } from "effect"
import { Cas } from "../../src/index.ts"
import { casErrorMessage, toBinding } from "../cli/render.ts"
import { casToolkit, Refused } from "./tools.ts"

/** A store refusal in the tools' register: the library's clause tag,
 * and the CLI's own rendering of it as the detail. */
const refuse = (error: Cas.Error): Refused =>
  new Refused({ clause: error._tag, detail: casErrorMessage(error) })

/** The naming plane fails on its own channel — a roots registry that
 * could not answer is not a verdict about content, so it never wears
 * an admission clause. */
const refuseBackend = (error: Cas.BackendFailure): Refused =>
  new Refused({
    clause: error._tag,
    detail: `the store could not answer: ${error.reason}`,
  })

/** A refusal that is the document's, not the store's: an instruction
 * naming an answer that has not been given yet. The document's
 * references are answer INDICES, so this is the one thing a
 * well-formed instruction list can still get wrong. */
const unresolved = (instruction: number, source: number, answered: number): Refused =>
  new Refused({
    clause: "mcp/UnresolvedAnswer",
    detail:
      `refused: instruction ${instruction} names answer ${source}, but only ${answered} ${
        answered === 1 ? "answer precedes" : "answers precede"
      } it — a reference names an EARLIER answer by index`,
  })

/** The one `ServePolicy` number that means the same thing on every
 * transport: a cap on the payload of a node this host will admit.
 * `bin/mcp/server.ts` documents why the rest of the policy does not
 * reach here. */
export interface NodeLimits {
  readonly maxNodeBytes: number
}

/** The cap, refused by the host rather than by the store — the store
 * law has no size clause, so this refusal is honestly the policy's and
 * says so. */
const tooLarge = (bytes: number, limit: number): Refused =>
  new Refused({
    clause: "mcp/NodeTooLarge",
    detail:
      `refused: a ${bytes}-byte payload exceeds this store's maxNodeBytes of ${limit} — the cap is the store's serve policy, in its config.json`,
  })

const withinLimit = (
  payload: Uint8Array,
  limits: NodeLimits,
): Effect.Effect<void, Refused> =>
  payload.length > limits.maxNodeBytes
    ? Effect.fail(tooLarge(payload.length, limits.maxNodeBytes))
    : Effect.void

/**
 * The whole handler table. `Toolkit.toLayer` turns it into the
 * handlers the MCP registration asks for; the store services stay
 * ordinary requirements, satisfied once at the composition where every
 * other host choice is made. The limits arrive as an argument rather
 * than a service, because they are one number read from one config
 * file at one composition — nothing below needs a seam for them.
 */
export const layerHandlers = (limits: NodeLimits) =>
  casToolkit.toLayer(casToolkit.of({
  cas_put: (node) =>
    Effect.gen(function* () {
      const store = yield* Cas.Store
      yield* withinLimit(node.payload, limits)
      const address = yield* store.put(Cas.ConformanceVector.toNodeInput(node)).pipe(
        Effect.mapError(refuse),
      )
      yield* Effect.logInfo("admitted").pipe(
        Effect.annotateLogs({
          address,
          tag: node.tag,
          version: node.version,
          payloadBytes: node.payload.length,
          refs: node.refs.length,
        }),
      )
      return { address }
    }).pipe(Effect.annotateLogs({ tool: "cas_put" })),

  cas_load: ({ address }) =>
    Effect.gen(function* () {
      const loader = yield* Cas.Loader
      const node = yield* loader.load(address).pipe(Effect.mapError(refuse))
      yield* Effect.logInfo("loaded").pipe(
        Effect.annotateLogs({
          address,
          tag: node.kind.tag,
          version: node.kind.version,
          payloadBytes: node.payload.length,
          refs: node.refs.length,
        }),
      )
      // The reply is the ONE node document — the same projection
      // `cas show --json` renders, so the two surfaces cannot drift.
      return toBinding(address, node).node
    }).pipe(Effect.annotateLogs({ tool: "cas_load" })),

  cas_run: ({ instructions }) =>
    Effect.gen(function* () {
      const store = yield* Cas.Store
      // The word, in admission order. A self-contained program starts
      // from the empty word: the document carries every instruction it
      // depends on, and an index that reaches past what has been
      // answered is refused rather than resolved against store state.
      const word: Array<Cas.ContentId> = []
      for (const [index, instruction] of instructions.entries()) {
        const refs: Array<Cas.Reference> = []
        for (const reference of instruction.refs) {
          const answered = word[reference.source]
          if (answered === undefined) {
            return yield* unresolved(index, reference.source, word.length)
          }
          refs.push({ id: answered, expectedTag: reference.expectedTag })
        }
        yield* withinLimit(instruction.payloadHex, limits)
        const address = yield* store.put(Cas.NodeInput.make({
          kind: { version: instruction.version, tag: instruction.tag },
          payload: instruction.payloadHex,
          refs,
        })).pipe(Effect.mapError(refuse))
        word.push(address)
        yield* Effect.logDebug("instruction admitted").pipe(
          Effect.annotateLogs({ instruction: index, address }),
        )
      }
      yield* Effect.logInfo("ran").pipe(
        Effect.annotateLogs({ instructions: instructions.length, word: word.join(",") }),
      )
      return { word: word.map((address) => ({ address })) }
    }).pipe(Effect.annotateLogs({ tool: "cas_run" })),

  cas_publish_root: ({ address }) =>
    Effect.gen(function* () {
      const loader = yield* Cas.Loader
      // Load before publishing, fail-closed — publication claims an
      // address is an entry point, so an address that will not load is
      // refused here instead of becoming a root `cas ls` has to report
      // as broken.
      const node = yield* loader.load(address).pipe(Effect.mapError(refuse))
      const roots = yield* Cas.RootStore
      yield* roots.publish(address).pipe(Effect.mapError(refuseBackend))
      yield* Effect.logInfo("published").pipe(
        Effect.annotateLogs({ address, tag: node.kind.tag }),
      )
      return {}
    }).pipe(Effect.annotateLogs({ tool: "cas_publish_root" })),

  cas_list_roots: () =>
    Effect.gen(function* () {
      const roots = yield* Cas.RootStore
      const published = yield* roots.list.pipe(Effect.mapError(refuseBackend))
      // The seam leaves order unspecified; the reply does not, for the
      // same reason `cas ls` sorts.
      const sorted = published.toSorted()
      yield* Effect.logInfo("listed roots").pipe(
        Effect.annotateLogs({ roots: sorted.length }),
      )
      return { roots: sorted }
    }).pipe(Effect.annotateLogs({ tool: "cas_list_roots" })),
  }))
