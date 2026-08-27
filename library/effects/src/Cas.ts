/** Namespace facade for typed CAS projections and remote adapters. */
import { Context, Crypto, Effect, Layer } from "effect"
import * as HttpClient from "effect/unstable/http/HttpClient"
import { CasRemoteConfig } from "./cas/Remote.ts"
import { CasStore, makeSha256Address } from "./cas/Store.ts"
import { CasTransfer } from "./cas/Transfer.ts"
import { makeRemoteAdapter } from "./internal/remote.ts"
import { makeRemoteHttp } from "./internal/remoteHttp.ts"

export { value } from "./cas/Value.ts"
export { service } from "./cas/Service.ts"
export * as Transfer from "./cas/Transfer.ts"

/**
 * Build the remote store and transfer views once over one shared adapter.
 * HttpClient and platform Crypto remain visible layer requirements.
 */
export const layerRemote = (
  config: CasRemoteConfig,
): Layer.Layer<
  CasStore | CasTransfer,
  never,
  HttpClient.HttpClient | Crypto.Crypto
> => Layer.effectContext(Effect.gen(function* () {
  const transport = yield* makeRemoteHttp(config)
  const address = yield* makeSha256Address
  const adapter = yield* makeRemoteAdapter(config, transport, address)
  return Context.empty().pipe(
    Context.add(CasStore, adapter.store),
    Context.add(CasTransfer, adapter.transfer),
  )
}))
