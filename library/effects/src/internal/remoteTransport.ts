/** Internal untrusted transport seam. Never exported from the package barrel. */
import type { Channel } from "effect"
import type { ContentId } from "../cas/Node.ts"
import type { Command, Event, OpId } from "./remoteMachine.ts"

export type AttemptId = number

export type RemoteWireEvent =
  | { readonly _tag: "ResponseStarted"; readonly declared?: number }
  | { readonly _tag: "BodyChunk"; readonly bytes: Uint8Array }
  | {
    readonly _tag: "Event"
    readonly event: Event<ContentId, Uint8Array>
    readonly protocolCode?:
      | "invalidStatus"
      | "invalidHeaders"
      | "invalidFraming"
      | "truncatedBody"
      | "unexpectedBody"
      | "invalidAcknowledgement"
  }

export interface CompletionWitness {
  readonly receivedBytes: number
  readonly sentBytes: number
  readonly terminalFraming: "complete" | "truncated" | "reset"
}

export interface RemoteTransportFailure {
  readonly _tag: "RemoteTransportFailure"
  readonly code: "connectionFailed" | "connectionReset" | "timeout" | "cancelled"
  readonly completion: "knownUnprocessed" | "possiblyProcessed"
  readonly receivedBytes: number
  readonly sentBytes: number
}

/** Shell-only data intentionally absent from the semantic command carrier. */
export interface RemoteIssueOptions {
  readonly publishClosure?: ReadonlyArray<ContentId>
}

export interface RemoteCasTransport {
  /** Execute exactly one machine command for one operation attempt. */
  readonly issue: (
    opId: OpId,
    attemptId: AttemptId,
    command: Command<ContentId, Uint8Array>,
    options?: RemoteIssueOptions,
  ) => Channel.Channel<RemoteWireEvent, RemoteTransportFailure, CompletionWitness>
}
