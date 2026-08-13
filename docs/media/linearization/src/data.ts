// The clips are driven by traces the real code emitted. Nothing on screen is
// authored by hand: fences, revisions, positions, digests, refusal names and
// refusal reasons all come from these two files.
//
// Regenerate with:  cd go && go run ./cmd/lineartrace -out ../docs/media/linearization/data
import registerTrace from "../data/register-trace.json";
import journalTrace from "../data/journal-trace.json";

export type TraceEvent = {
  t_ms: number;
  actor: string;
  op: string;
  outcome: string;
  fence?: number;
  revision?: number;
  position?: number;
  head?: string;
  payload?: string;
  result?: string;
  first?: boolean;
  err_kind?: string;
  err_text?: string;
  note?: string;
};

export type Trace = {
  clip: string;
  source: string;
  law: string;
  key?: string;
  stream?: string;
  actors: { id: string; label: string }[];
  events: TraceEvent[];
  recorded_by: string;
};

const register = registerTrace as Trace;
const journal = journalTrace as Trace;

const find = (t: Trace, pred: (e: TraceEvent) => boolean): TraceEvent => {
  const hit = t.events.find(pred);
  if (!hit) {
    throw new Error(`${t.clip}: the trace has no matching event`);
  }
  return hit;
};

/** First 10 hex characters — enough to identify, short enough to read. */
export const shortHex = (hex: string): string => `${hex.slice(0, 10)}…`;

/** The sentinel's own message: the detail the code appends is stripped back off. */
const sentinelText = (text: string): string =>
  text.split(": ")[0].replace(/ at position \d+$/, "");

/** A verbatim fragment of the runtime error, or "" when absent. */
const fragment = (text: string, re: RegExp): string => {
  const m = re.exec(text);
  return m ? m[0] : "";
};

// ------------------------------------------------------------ the register --

export const registerScript = (() => {
  const claims = register.events.filter((e) => e.op === "claim");
  const granted = claims.find((e) => e.outcome === "granted");
  const refusedClaim = claims.find((e) => e.outcome === "refused");
  if (!granted || !refusedClaim) {
    throw new Error("register trace: the claim race is missing a side");
  }
  const lapse = find(register, (e) => e.op === "lease-lapse");
  const steal = find(register, (e) => e.op === "steal");
  const fenced = find(
    register,
    (e) => e.op === "commit" && e.outcome === "refused",
  );
  const landed = find(
    register,
    (e) => e.op === "commit" && e.outcome === "landed",
  );
  const lookup = find(register, (e) => e.op === "lookup");

  const key = register.key ?? "";
  const [prefix, digest] = key.split(".");

  return {
    trace: register,
    keyLabel: `${prefix}.${shortHex(digest ?? "")}`,
    granted,
    refusedClaim,
    lapse,
    steal,
    fenced,
    landed,
    lookup,
    refusedClaimCard: {
      kind: refusedClaim.err_kind ?? "",
      detail: sentinelText(refusedClaim.err_text ?? ""),
      detail2: `at revision ${refusedClaim.revision}`,
    },
    fencedCard: {
      kind: fenced.err_kind ?? "",
      detail: sentinelText(fenced.err_text ?? ""),
      detail2: fragment(fenced.err_text ?? "", /has fence \d+, not \d+/),
    },
    /** Fence rungs in the order the register issued them, lowest first. */
    rungs: [
      { fence: granted.fence ?? 0, owner: granted.actor, revision: granted.revision ?? 0 },
      { fence: steal.fence ?? 0, owner: steal.actor, revision: steal.revision ?? 0 },
    ],
  };
})();

// ------------------------------------------------------------- the journal --

export const journalScript = (() => {
  const opens = journal.events.filter((e) => e.op === "open");
  const appends = journal.events.filter((e) => e.op === "append");
  const stored = appends.filter((e) => e.outcome === "stored");
  const conflict = find(
    journal,
    (e) => e.op === "append" && e.outcome === "conflict",
  );
  const resync = find(journal, (e) => e.op === "resync");
  const verified = find(journal, (e) => e.op === "read");
  if (stored.length < 2) {
    throw new Error("journal trace: expected a winning and a recovering append");
  }

  return {
    trace: journal,
    genesis: opens[0]?.head ?? "",
    /** The position both handles proposed when they opened. */
    openPosition: opens[0]?.position ?? -1,
    winner: stored[0],
    conflict,
    resync,
    recovery: stored[1],
    verified,
    conflictCard: {
      kind: conflict.err_kind ?? "",
      detail: sentinelText(conflict.err_text ?? ""),
      detail2: fragment(conflict.err_text ?? "", /at position \d+/),
    },
    chain: JSON.parse(verified.payload ?? "[]") as string[],
  };
})();
