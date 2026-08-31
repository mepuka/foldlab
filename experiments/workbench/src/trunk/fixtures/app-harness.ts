/**
 * THE BREAKER'S HARNESS for S3b — contract packet
 * `.staging/frontend-trunk/packets/S3B-TRUNK-APP.md`.
 *
 * Written by the breaker, read-only to the implementer, beside S3a's
 * `harness.ts` (which the S3b battery also reuses for fixtures, `forAll`
 * and `expectValid`). Nothing here imports `src/trunk/app.ts` or
 * `src/trunk/view.ts` — the modules under contract — so the harness
 * stays loadable while they do not exist, and
 * `fixtures/app-harness.test.ts` proves its devices today.
 *
 * Three device families live here:
 *
 *   - VNODE WALKERS over the shape foldkit's scene renderer actually
 *     produces (pinned by the harness-validation file): `sel`,
 *     `data.attrs` (string values; `data-testid` included),
 *     `data.class` (record of booleans), `data.ns`, `children`, `text`.
 *     The battery asserts through these rather than through private
 *     framework internals.
 *   - the STUB HTTP SERVER for the seam battery: a real `node:http`
 *     listener on an ephemeral port that records every request (method,
 *     url, headers) and answers from a caller-supplied table. The seam
 *     laws are exercised against real sockets, not mocked fetch.
 *   - small comparison helpers (`quadOf`, `linesOfCanonical`) that turn
 *     the engine's `canonicalRects` bytes and the rendered rect
 *     attributes into the same comparable form, so the golden law is a
 *     list equality with readable failures.
 */
import { createServer, type IncomingMessage, type Server } from "node:http"

// ------------------------------------------------------------ vnode shape

/** The structural face of a rendered VNode — what the scene renderer
 * hands to `tap` steps. Kept structural so the harness compiles without
 * naming foldkit internals. */
export interface VNodeShape {
  readonly sel?: string | undefined
  readonly text?: string | undefined
  readonly data?:
    | {
        readonly attrs?: Readonly<Record<string, string | number | boolean>> | undefined
        readonly class?: Readonly<Record<string, boolean>> | undefined
        readonly style?: Readonly<Record<string, string>> | undefined
        readonly on?: Readonly<Record<string, unknown>> | undefined
        readonly ns?: string | undefined
      }
    | undefined
  readonly children?: ReadonlyArray<VNodeShape | string> | undefined
}

const isNode = (child: VNodeShape | string | undefined): child is VNodeShape =>
  typeof child === "object" && child !== null

/** Every VNode in the tree, depth-first, the root included. */
export const allNodes = (root: VNodeShape): ReadonlyArray<VNodeShape> => {
  const out: Array<VNodeShape> = []
  const walk = (node: VNodeShape): void => {
    out.push(node)
    for (const child of node.children ?? []) if (isNode(child)) walk(child)
  }
  walk(root)
  return out
}

/** The attrs record of a node, empty when it declares none. */
export const attrsOf = (node: VNodeShape): Readonly<Record<string, string | number | boolean>> =>
  node.data?.attrs ?? {}

/** The inline style record of a node, empty when it declares none. */
export const styleOf = (node: VNodeShape): Readonly<Record<string, string>> =>
  node.data?.style ?? {}

/** The class names switched ON at a node, sorted. */
export const classesOf = (node: VNodeShape): ReadonlyArray<string> =>
  Object.entries(node.data?.class ?? {})
    .filter(([, on]) => on)
    .map(([name]) => name)
    .toSorted()

/** The first node carrying data-testid=id, or null. */
export const byTestId = (root: VNodeShape, id: string): VNodeShape | null =>
  allNodes(root).find((node) => attrsOf(node)["data-testid"] === id) ?? null

/** Every node with the given sel (tag), in tree order. */
export const bySel = (root: VNodeShape, sel: string): ReadonlyArray<VNodeShape> =>
  allNodes(root).filter((node) => node.sel === sel)

/** All text reachable under a node, concatenated with single spaces. */
export const textOf = (node: VNodeShape): string => {
  const out: Array<string> = []
  const walk = (current: VNodeShape): void => {
    if (typeof current.text === "string") out.push(current.text)
    for (const child of current.children ?? []) {
      if (typeof child === "string") out.push(child)
      else walk(child)
    }
  }
  walk(node)
  return out.join(" ").replaceAll(/\s+/gu, " ").trim()
}

/** The x/y/width/height attribute quadruple of a rect node, as the
 * STRINGS the register carries — the golden law compares strings, so no
 * number formatting can hide in the comparison. */
export const quadOf = (rect: VNodeShape): readonly [string, string, string, string] => {
  const attrs = attrsOf(rect)
  return [String(attrs["x"]), String(attrs["y"]), String(attrs["width"]), String(attrs["height"])]
}

/** canonicalRects bytes → the same quadruples, header dropped. Works for
 * both S and T lines: fields 1..4 after the tag are x y w h. */
export const linesOfCanonical = (
  canonical: string,
): ReadonlyArray<readonly [string, string, string, string]> =>
  canonical
    .split("\n")
    .filter((line) => line.startsWith("S ") || line.startsWith("T "))
    .map((line) => {
      const fields = line.split(" ")
      return [fields[1] ?? "", fields[2] ?? "", fields[3] ?? "", fields[4] ?? ""] as const
    })

// ------------------------------------------------------------ stub server

export interface RecordedRequest {
  readonly method: string
  readonly url: string
  readonly headers: Readonly<Record<string, string | Array<string> | undefined>>
}

export interface StubAnswer {
  readonly status: number
  readonly body: string
  readonly contentType?: string
}

export interface Stub {
  readonly base: string
  readonly requests: ReadonlyArray<RecordedRequest>
  readonly close: () => Promise<void>
}

/** A real HTTP listener on 127.0.0.1:0. `answer` maps each incoming
 * request to a response; every request is recorded for the battery's
 * door-grammar assertions. */
export const startStub = (
  answer: (request: RecordedRequest) => StubAnswer,
): Promise<Stub> =>
  new Promise((resolve, reject) => {
    const requests: Array<RecordedRequest> = []
    const server: Server = createServer((incoming: IncomingMessage, response) => {
      const recorded: RecordedRequest = {
        method: incoming.method ?? "",
        url: incoming.url ?? "",
        headers: incoming.headers,
      }
      requests.push(recorded)
      const out = answer(recorded)
      response.writeHead(out.status, {
        "content-type": out.contentType ?? "application/json",
        "access-control-allow-origin": "*",
      })
      response.end(out.body)
    })
    server.on("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (address === null || typeof address === "string") {
        reject(new Error("the stub did not bind a TCP port"))
        return
      }
      resolve({
        base: `http://127.0.0.1:${String(address.port)}`,
        requests,
        close: () =>
          new Promise<void>((done, fail) => {
            server.close((error) => (error === undefined ? done() : fail(error)))
          }),
      })
    })
  })

/** A base URL nothing listens on — the Unreachable arm's witness. The
 * port is bound once, closed, and answered to nobody. */
export const deadBase = async (): Promise<string> => {
  const stub = await startStub(() => ({ status: 200, body: "{}" }))
  const { base } = stub
  await stub.close()
  return base
}
