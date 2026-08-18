import { Kvm } from "@nats-io/kv"
import { connect } from "@nats-io/transport-node"

import { REGISTER_BUCKET } from "../src/planes/Register.js"

/**
 * NEGATIVE BUILD VARIANT — never import outside the named control test.
 *
 * The register's real commit path (read the entry, append with revision
 * CAS) with exactly one line deleted: the fencing-token comparison
 * `presented !== entry.revision`. The mutant therefore lands any outcome
 * under whatever stale token its caller presents, using the CURRENT
 * revision for the CAS — the write mechanics stay identical to
 * `internal/registers.ts`; only the guard is gone. The wall's
 * `zombie-stale-commit` vector kills this variant: the corpus verdict is
 * `refused`, the mutant lands, and the divergence plus the landed zombie in
 * the bucket's own history is the committed kill evidence.
 */
export const commitWithoutTokenGuard = async (
  url: string,
  work: string,
  presentedToken: number,
  outcome: string,
): Promise<{ readonly token: number; readonly value: string }> => {
  const connection = await connect({ servers: url, name: "stale-token-mutant" })
  try {
    const bucket = await new Kvm(connection).open(REGISTER_BUCKET)
    const entry = await bucket.get(work)
    if (entry === null) throw new Error("mutant commit requires a present register")
    const stored = JSON.parse(entry.string()) as {
      readonly holder: string
      readonly outcome: null | { readonly token: number; readonly value: string }
    }
    if (stored.outcome !== null) throw new Error("mutant commit requires an absent outcome")
    // DELETED GUARD: if (presentedToken !== entry.revision) refuse stale token
    const landed = { token: presentedToken, value: outcome }
    await bucket.update(
      work,
      new TextEncoder().encode(JSON.stringify({ holder: stored.holder, outcome: landed })),
      entry.revision,
    )
    return landed
  } finally {
    await connection.close()
  }
}
