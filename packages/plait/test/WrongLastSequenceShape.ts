import type { JetStreamApiError } from "@nats-io/jetstream"

// Journal state (the reported sequence number) masked, so shape comparisons
// are about refusal kind rather than fixture state.
export const maskJournalState = (text: string): string => text.replace(/\d+/gu, "#")

// Every distinguishing-capable field `JetStreamApiError` exposes at the
// @nats-io/* 3.4.0 pin: subclass identity, name, status, code, message,
// cause, and the raw wire ApiError (spread, so a field added by a future
// release lands here and fails the pinned comparison).
export const wireShape = (refusal: JetStreamApiError) => ({
  constructor: refusal.constructor.name,
  name: refusal.name,
  status: refusal.status,
  code: refusal.code,
  message: maskJournalState(refusal.message),
  cause: refusal.cause,
  apiError: {
    ...refusal.apiError(),
    description: maskJournalState(refusal.apiError().description),
  },
})

export const pinnedWrongLastSequenceShape = {
  constructor: "JetStreamApiError",
  name: "JetStreamApiError",
  status: 400,
  code: 10071,
  message: "wrong last sequence: #",
  cause: undefined,
  apiError: { code: 400, description: "wrong last sequence: #", err_code: 10071 },
}

// The field set the wall compares, pinned as its own fact: narrowing either
// `wireShape` or the pinned shape must red, or the indistinguishability wall
// could quietly stop watching the fields it exists to watch. The committed
// field-drop mutant under negative-controls/ reds when this guard weakens.
export const distinguishingFields = [
  "apiError",
  "cause",
  "code",
  "constructor",
  "message",
  "name",
  "status",
] as const

export const apiErrorFields = ["code", "description", "err_code"] as const

export const assertDistinguishingFieldSet = (shape: Record<string, unknown>): void => {
  const keys = Object.getOwnPropertyNames(shape).sort()
  const expected: ReadonlyArray<string> = distinguishingFields
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new Error(
      `wrong-last-sequence shape compares [${keys.join(",")}], want [${expected.join(",")}]`,
    )
  }
  const apiKeys = Object.getOwnPropertyNames(shape["apiError"] ?? {}).sort()
  const expectedApi: ReadonlyArray<string> = apiErrorFields
  if (apiKeys.length !== expectedApi.length || apiKeys.some((key, index) => key !== expectedApi[index])) {
    throw new Error(
      `wrong-last-sequence wire ApiError compares [${apiKeys.join(",")}], want [${expectedApi.join(",")}]`,
    )
  }
}
