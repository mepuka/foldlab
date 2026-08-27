import type { Effect, Scope } from "effect"

export interface PeerCapabilities {
  readonly profile: "cas-http/0"
  readonly supportsUpload: boolean
}

export interface PeerObservation {
  readonly requests: number
  readonly gets: number
  readonly puts: number
  readonly bodyBytesWritten: number
  readonly bodyBytesReceived: number
  readonly openSockets: number
}

export interface PeerEndpoint {
  readonly authority: string
  readonly observe: () => PeerObservation
}

export interface ScenarioRealization {
  readonly nodes?: ReadonlyMap<string, Uint8Array>
  readonly fault?: string
  readonly body?: Uint8Array
  readonly declared?: number
}

/**
 * Test-side seam reserved for the later LeanServer binding.
 * TODO(LeanServer peer): bind the adopted server here in its own slice.
 */
export interface ConformancePeer {
  readonly name: string
  readonly capabilities: PeerCapabilities
  readonly serve: (
    realization: ScenarioRealization,
  ) => Effect.Effect<PeerEndpoint, never, Scope.Scope>
}
