/** Streamed mechanics above the whole-node CasStore boundary. */
import { Context, Effect, Stream } from "effect"
import type { Scope } from "effect"
import type { CasError, CasNodeInput, CasReference, ContentId, NodeKind } from "./Node.ts"
import { oneShot, replayable, type CasRemoteError, type UploadSource } from "./Remote.ts"

export { oneShot, replayable, type UploadSource }

export interface PutStreamOptions {
  readonly kind: NodeKind
  readonly refs: ReadonlyArray<CasReference>
  readonly expected?: ContentId
}

export interface CasTransferShape {
  /**
   * Consume the complete source, verify its computed address on every
   * attempt, and succeed only after a verified remote acknowledgement.
   */
  readonly putStream: (
    source: UploadSource,
    options: PutStreamOptions,
  ) => Effect.Effect<ContentId, CasRemoteError | CasError>

  /**
   * Return verified bytes in the caller's Scope. R2 verifies through a
   * decoded-budget-bounded in-memory whole-object spool before emitting any
   * byte. A cold reference-carrying parent whose children are absent locally
   * fails as RemoteFailure(DanglingReference); discovery-order closure pull is
   * the documented R3 boundary. Filesystem spooling and chunk-proof early
   * emission are later slices.
   */
  readonly loadStream: (
    id: ContentId,
  ) => Effect.Effect<
    Stream.Stream<Uint8Array, CasRemoteError | CasError>,
    CasRemoteError | CasError,
    Scope.Scope
  >
}

export class CasTransfer extends Context.Service<CasTransfer, CasTransferShape>()(
  "foldlab/effect-replay/CasTransfer",
) {}

export type { CasNodeInput }
