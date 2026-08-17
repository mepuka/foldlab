import type { RegisterState } from "../src/Register.js"

/** Negative build variant: deliberately drops commit's current-token guard. */
export const commitWithoutTokenGuard = (
  state: RegisterState,
  presentedToken: number,
  outcome: string,
): RegisterState => ({
  ...state,
  outcome: { token: presentedToken, value: outcome },
})
