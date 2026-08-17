// RQ-7 reference reproduction. Own-authored; not a foldlab gate, not a
// model of foldlab's wire semantics. A deliberately tiny stand-in for a
// D-d-shaped kernel, used only to make the certificate's *shape*
// concrete and checkable.
//
// D-d properties this stand-in reproduces:
//   * stateless   — step(stateBytes, opBytes) -> {state, receipt}; the
//                   host owns all state and passes it in every call
//   * total       — every input byte string returns a typed payload;
//                   no throw escapes step()
//   * self-identifying — exports MODEL_VERSION and BUILD_IDENTITY
//
// The canonical encoder below is NOT RFC 8785. It is a two-line
// stand-in (sorted keys, integers and strings only) so that this
// reproduction has one deterministic byte encoding without dragging in
// the number problem that RQ-9 owns.

export const MODEL_VERSION = "rq7-toy/1";
// Stands in for D-d's "model-source digest stamped at generation time".
export const BUILD_IDENTITY = "model-src:0000000000000000000000000000000000000000000000000000000000000000";

export function canonical(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new TypeError("non-integer");
    return String(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  throw new TypeError("unencodable");
}

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: true });

function refusal(kind) {
  return { ok: false, refusal: kind };
}

// The whole point of "total by refusal": this function returns for every
// input byte string, including garbage. Nothing below may throw out.
export function step(stateBytes, opBytes) {
  let state, op;
  try {
    state = JSON.parse(dec.decode(stateBytes));
    op = JSON.parse(dec.decode(opBytes));
  } catch {
    return { state: stateBytes, receipt: refusal("malformed") };
  }
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    return { state: stateBytes, receipt: refusal("malformed-state") };
  }
  if (op === null || typeof op !== "object" || Array.isArray(op)) {
    return { state: stateBytes, receipt: refusal("malformed-op") };
  }
  const holes = state.holes && typeof state.holes === "object" ? state.holes : null;
  if (holes === null || typeof state.closed !== "boolean") {
    return { state: stateBytes, receipt: refusal("malformed-state") };
  }
  if (state.closed) return { state: stateBytes, receipt: refusal("closed") };

  let next;
  switch (op.kind) {
    case "fill": {
      if (typeof op.hole !== "string" || typeof op.value !== "string") {
        return { state: stateBytes, receipt: refusal("malformed-op") };
      }
      const prior = holes[op.hole];
      if (prior === undefined) next = { ...state, holes: { ...holes, [op.hole]: op.value } };
      else if (prior === op.value) return { state: stateBytes, receipt: { ok: true, effect: "repeat" } };
      else return { state: stateBytes, receipt: refusal("conflict") };
      return { state: enc.encode(canonical(next)), receipt: { ok: true, effect: "filled" } };
    }
    case "close": {
      next = { ...state, closed: true };
      return { state: enc.encode(canonical(next)), receipt: { ok: true, effect: "closed" } };
    }
    default:
      return { state: stateBytes, receipt: refusal("unknown-op") };
  }
}
