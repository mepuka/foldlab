import { Crypto, Effect, Encoding, Schema } from "effect"

export class HashingError extends Schema.TaggedError<HashingError>()(
  "HashingError",
  {
    cause: Schema.Defect(),
  },
) {}

const encoder = new TextEncoder()

export const sha256 = Effect.fn("sha256")(
  function*(text: string): Effect.fn.Return<string, HashingError, Crypto.Crypto> {
    const crypto = yield* Crypto.Crypto
    const bytes = yield* crypto.digest("SHA-256", encoder.encode(text)).pipe(
      Effect.mapError((cause) => new HashingError({ cause })),
    )
    return Encoding.encodeHex(bytes).toLowerCase()
  },
)
