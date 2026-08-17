import { createServer, connect as netConnect, type Socket } from "node:net"

export interface HoldProxy {
  readonly url: string
  /** Arms the tap: the next matching bucket publish is withheld. */
  readonly arm: () => void
  /** The barrier that resolves once one matching publish is withheld. */
  readonly captured: () => Promise<void>
  /** Forwards the withheld publish, and everything queued behind it, in order. */
  readonly release: () => void
  /**
   * Drops the withheld publish permanently and forwards everything queued
   * behind it. The connection stays open, so the caller's write request never
   * receives its acknowledgement and fails transport-class, while the same
   * connection's subsequent reads still reach the server.
   */
  readonly discard: () => void
  readonly stop: () => Promise<void>
}

/** The command-line prefixes that address one KV bucket's subject space. */
export const bucketPublishPrefixes = (bucket: string): ReadonlyArray<string> => [
  `PUB $KV.${bucket}.`,
  `HPUB $KV.${bucket}.`,
]

export interface InterposingProxy {
  readonly url: string
  /** How many matching bucket publishes have been interposed on so far. */
  readonly interceptions: () => number
  readonly stop: () => Promise<void>
}

const parsePublishLength = (line: string): number => {
  const bytes = Number(line.slice(line.lastIndexOf(" ") + 1))
  if (!Number.isSafeInteger(bytes)) throw new Error(`unparseable publish frame: ${line}`)
  return bytes
}

/**
 * A frame-aligned tap that interposes on EVERY matching bucket publish rather
 * than withholding one.
 *
 * Each time a publish addressed into the named bucket's subject space is
 * parsed out of the client stream, the tap holds it, awaits `onPublish`, and
 * only then forwards it. That makes a whole contention SCHEDULE deterministic:
 * a caller can land a rival revision inside the hook, so the forwarded append
 * is guaranteed to be presenting a stale revision by the time the server sees
 * it — once per attempt, for as many attempts as the retry bound allows.
 *
 * Matching is on the command line prefix only. Reads are direct-get requests
 * on `$JS.API.DIRECT.GET.*`, so they pass straight through and the hook fires
 * exactly once per CAS attempt.
 */
export const startInterposingProxy = async (
  upstreamUrl: string,
  publishPrefixes: ReadonlyArray<string>,
  onPublish: (index: number) => Promise<void>,
): Promise<InterposingProxy> => {
  const target = new URL(upstreamUrl)
  const sockets = new Set<Socket>()
  let intercepted = 0

  const server = createServer((client) => {
    const upstream = netConnect(Number(target.port), target.hostname)
    sockets.add(client)
    sockets.add(upstream)
    let pending = Buffer.alloc(0)
    let pumping = false

    const pump = async (): Promise<void> => {
      // Re-entrancy guard: bytes that arrive while the hook is awaited simply
      // accumulate in `pending`, and this loop picks them up when it resumes.
      if (pumping) return
      pumping = true
      try {
        while (true) {
          const eol = pending.indexOf("\r\n")
          if (eol === -1) return
          const line = pending.subarray(0, eol).toString("latin1")
          let frameEnd = eol + 2
          if (line.startsWith("PUB ") || line.startsWith("HPUB ")) {
            frameEnd = eol + 2 + parsePublishLength(line) + 2
            if (pending.length < frameEnd) return
          }
          const frame = Buffer.from(pending.subarray(0, frameEnd))
          pending = pending.subarray(frameEnd)
          if (publishPrefixes.some((prefix) => line.startsWith(prefix))) {
            intercepted += 1
            await onPublish(intercepted)
          }
          upstream.write(frame)
        }
      } finally {
        pumping = false
      }
    }

    upstream.on("data", (chunk) => {
      client.write(chunk)
    })
    client.on("data", (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk])
      void pump()
    })

    const drop = (): void => {
      client.destroy()
      upstream.destroy()
    }
    client.on("close", drop)
    client.on("error", drop)
    upstream.on("close", drop)
    upstream.on("error", drop)
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (address === null || typeof address === "string") {
    throw new Error("interposing proxy did not bind a TCP port")
  }
  return {
    url: `nats://127.0.0.1:${address.port}`,
    interceptions: () => intercepted,
    stop: () => new Promise((resolve) => {
      for (const socket of sockets) socket.destroy()
      server.close(() => resolve())
    }),
  }
}

/**
 * A frame-aligned TCP tap between one NATS client and the live server.
 *
 * The client-to-server stream is parsed into complete protocol commands — line
 * commands, and PUB/HPUB with their declared byte counts — so the tap can
 * withhold exactly one in-flight KV write. After `arm()`, the first publish
 * command addressed into the named bucket's subject space is held at the proxy
 * instead of forwarded. Matching is on the command line prefix only, never on
 * payload bytes: the direct-get API embeds the same bucket subject inside its
 * own request. The hold is a deterministic barrier — a caller lands a
 * conflicting revision over a second connection, awaits its acknowledgement,
 * and only then releases the held CAS append. Server-to-client bytes always
 * pass through untouched.
 *
 * Every register and cell operation re-reads before it CASes, so no sequential
 * out-of-band mutation can reach a failed append: the conflict window exists
 * only between one operation's read and its write, and a barrier-ordered hold
 * is the one deterministic way through it against the real substrate.
 */
export const startHoldProxy = async (
  upstreamUrl: string,
  publishPrefixes: ReadonlyArray<string>,
): Promise<HoldProxy> => {
  const target = new URL(upstreamUrl)
  const sockets = new Set<Socket>()
  let armed = false
  let holding = false
  let released = false
  let onCapture: (() => void) | undefined
  let captureBarrier: Promise<void> | undefined
  let heldUpstream: Socket | undefined
  let held: Array<Buffer> = []

  const server = createServer((client) => {
    const upstream = netConnect(Number(target.port), target.hostname)
    sockets.add(client)
    sockets.add(upstream)
    let pending = Buffer.alloc(0)

    upstream.on("data", (chunk) => {
      client.write(chunk)
    })
    client.on("data", (chunk: Buffer) => {
      if (released) {
        upstream.write(chunk)
        return
      }
      if (holding) {
        held.push(Buffer.from(chunk))
        return
      }
      pending = Buffer.concat([pending, chunk])
      while (true) {
        const eol = pending.indexOf("\r\n")
        if (eol === -1) return
        const line = pending.subarray(0, eol).toString("latin1")
        let frameEnd = eol + 2
        if (line.startsWith("PUB ") || line.startsWith("HPUB ")) {
          const bytes = Number(line.slice(line.lastIndexOf(" ") + 1))
          if (!Number.isSafeInteger(bytes)) throw new Error(`unparseable publish frame: ${line}`)
          frameEnd = eol + 2 + bytes + 2
          if (pending.length < frameEnd) return
        }
        const frame = Buffer.from(pending.subarray(0, frameEnd))
        pending = pending.subarray(frameEnd)
        if (armed && publishPrefixes.some((prefix) => line.startsWith(prefix))) {
          holding = true
          heldUpstream = upstream
          held = pending.length > 0 ? [frame, Buffer.from(pending)] : [frame]
          pending = Buffer.alloc(0)
          onCapture?.()
          return
        }
        upstream.write(frame)
      }
    })

    const drop = (): void => {
      client.destroy()
      upstream.destroy()
    }
    client.on("close", drop)
    client.on("error", drop)
    upstream.on("close", drop)
    upstream.on("error", drop)
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (address === null || typeof address === "string") {
    throw new Error("hold proxy did not bind a TCP port")
  }
  return {
    url: `nats://127.0.0.1:${address.port}`,
    arm: () => {
      captureBarrier = new Promise((resolve) => {
        onCapture = resolve
      })
      armed = true
    },
    captured: () => {
      if (captureBarrier === undefined) throw new Error("captured() before arm()")
      return captureBarrier
    },
    release: () => {
      const upstream = heldUpstream
      if (upstream === undefined) throw new Error("release before a bucket publish was captured")
      released = true
      holding = false
      for (const part of held) upstream.write(part)
      held = []
    },
    discard: () => {
      const upstream = heldUpstream
      if (upstream === undefined) throw new Error("discard before a bucket publish was captured")
      released = true
      holding = false
      // held[0] is the captured publish frame; everything after it is traffic
      // that merely queued behind the barrier and must still be delivered.
      for (const part of held.slice(1)) upstream.write(part)
      held = []
    },
    stop: () => new Promise((resolve) => {
      for (const socket of sockets) socket.destroy()
      server.close(() => resolve())
    }),
  }
}
