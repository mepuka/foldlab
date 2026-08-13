// POSTER 4 — the register linearizes.
//
// Two claimants reach for one key. A single revision-CAS admits one of them and
// hands out a fence; when B's lease lapses, C steals and the fence CLIMBS. B is
// still alive and still holding fence 1, and its commit is bounced — not
// because the lease expired (Commit never inspects expiry) but because 1 is
// below the highest fence. One terminal outcome remains, and it is the one that
// came first.
//
// Every t_ms, fence, revision, error kind and error string is read from
// docs/media/linearization/data/register-trace.json, recorded by
// `go run ./cmd/lineartrace`.
import React from "react";

import trace from "../../../linearization/data/register-trace.json";
import { Card, Kicker, Mono, Poster, Rule } from "../components/Poster";
import { display, short, theme } from "../theme";

const px = (n: number) => `${n}px`;

// The trace is a heterogeneous log; one shape covers every row the poster reads.
interface Event {
  readonly t_ms: number;
  readonly actor: string;
  readonly op: string;
  readonly outcome: string;
  readonly note: string;
  readonly fence?: number;
  readonly revision?: number;
  readonly first?: boolean;
  readonly err_kind?: string;
  readonly err_text?: string;
}

const at = (i: number) => trace.events[i] as Event;

const DIGEST = trace.key.slice("work.".length);

// Actor A's ErrHeld is a third strand and would cost a row without adding to
// the fence claim, so the poster follows the two claimants only.
const ROWS = [at(1), at(2), at(3), at(4), at(5), at(6)];

const FENCED = at(4);

// Widths in display px. The five fixed columns plus their gaps take 352, which
// leaves 440 for the outcome — the number every outcome phrase is written to.
const COL = {
  t: display(44),
  actor: display(30),
  // "lease-lapse" is 11 mono characters at 19px — 126 display px. The column
  // has to hold the longest operation name, not the average one.
  op: display(130),
  fence: display(64),
  rev: display(50),
} as const;

const GAP = display(10);

// The recorded notes run to 56 characters, which is 570 display px of mono —
// well past the 440 the outcome column has. These are the short forms; the one
// recorded note that carries the law is quoted in full in the band below.
const OUTCOME: Record<string, string> = {
  "1-B-claim": "granted — one claimant admitted",
  "201-B-lease-lapse": "lapsed — the fence did not move",
  "201-C-steal": "granted — a CAS steal, the fence climbs",
  "202-B-commit": "ErrFenced — commit at fence 1, below 2",
  "202-register-lookup": "committed — one terminal outcome",
};

const Cell: React.FC<{ w: number; children: React.ReactNode }> = ({ w, children }) => (
  <div style={{ width: w, flexShrink: 0 }}>{children}</div>
);

const Header: React.FC = () => (
  <div style={{ display: "flex", alignItems: "baseline", gap: px(GAP) }}>
    <Cell w={COL.t}>
      <Kicker>t</Kicker>
    </Cell>
    <Cell w={COL.actor}>
      <Kicker>·</Kicker>
    </Cell>
    <Cell w={COL.op}>
      <Kicker>operation</Kicker>
    </Cell>
    <Cell w={COL.fence}>
      <Kicker color={theme.colors.primary}>fence</Kicker>
    </Cell>
    <Cell w={COL.rev}>
      <Kicker>rev</Kicker>
    </Cell>
    <Kicker>outcome</Kicker>
  </div>
);

const Row: React.FC<{ e: Event }> = ({ e }) => {
  const refused = e.outcome === "refused";
  const landed = e.outcome === "landed";
  const terminal = e.op === "lookup";
  const tone = refused ? theme.colors.refusal : landed ? theme.colors.primary : theme.colors.text;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: px(GAP),
        background: refused ? theme.colors.refusalFaint : "transparent",
        borderLeft: `${px(display(2.5))} solid ${
          refused ? theme.colors.refusal : landed ? theme.colors.primary : "transparent"
        }`,
        borderRadius: px(display(5)),
        padding: `${px(display(2))} ${px(display(8))}`,
        margin: `0 ${px(-display(8))}`,
      }}
    >
      <Cell w={COL.t}>
        <Mono size={theme.type.label} color={theme.colors.textFaint}>
          {`${e.t_ms}ms`}
        </Mono>
      </Cell>
      <Cell w={COL.actor}>
        <Mono size={theme.type.dataStrong} color={theme.colors.textDim} weight={700}>
          {e.actor === "register" ? "▪" : e.actor}
        </Mono>
      </Cell>
      <Cell w={COL.op}>
        <Mono size={theme.type.dataStrong} color={theme.colors.text} weight={terminal ? 500 : 700}>
          {e.op}
        </Mono>
      </Cell>
      <Cell w={COL.fence}>
        <Mono
          size={theme.type.dataStrong}
          color={refused ? theme.colors.refusal : theme.colors.primary}
          weight={700}
        >
          {e.fence === undefined ? "—" : String(e.fence)}
        </Mono>
      </Cell>
      <Cell w={COL.rev}>
        <Mono size={theme.type.data} color={theme.colors.textDim}>
          {e.revision === undefined ? "—" : String(e.revision)}
        </Mono>
      </Cell>
      {landed ? (
        <Card tone="glow" padX={12} padY={4}>
          <Mono size={theme.type.dataStrong} color={theme.colors.text} weight={700}>
            {`landed · first = ${String(e.first)}`}
          </Mono>
        </Card>
      ) : (
        <Mono size={theme.type.data} color={tone} weight={refused ? 700 : 500}>
          {OUTCOME[`${e.t_ms}-${e.actor}-${e.op}`] ?? e.outcome}
        </Mono>
      )}
    </div>
  );
};

export const RegisterLinearizes: React.FC = () => (
  <Poster
    kicker="foldlab · the register linearizes"
    copy="no commit lands below the highest fence"
    cite="docs/research/2026-08-13-bug-breaker-verdict.md:15"
  >
    <div style={{ display: "flex", flexDirection: "column", gap: px(display(12)) }}>
      <Mono size={theme.type.label} color={theme.colors.textDim}>
        {`key work.${short(DIGEST)}   ·   ${trace.law}`}
      </Mono>

      <Header />
      <Rule color={theme.colors.line} />

      <div style={{ display: "flex", flexDirection: "column", gap: px(display(3)) }}>
        {ROWS.map((e, i) => (
          <Row key={`${e.t_ms}-${e.actor}-${e.op}-${i}`} e={e} />
        ))}
      </div>

      <Card
        tone="refusal"
        padX={16}
        padY={9}
        style={{ flexDirection: "column", alignItems: "flex-start", gap: px(display(2)) }}
      >
        {/* The recorded string, with only the 64-char digest shortened. The
            substitution is mechanical, so the sentence stays the one Go emits. */}
        <Mono size={theme.type.data} color={theme.colors.refusal} weight={700}>
          {(FENCED.err_text ?? "").replace(DIGEST, short(DIGEST))}
        </Mono>
        <Mono size={theme.type.label} color={theme.colors.textDim}>
          {FENCED.note}
        </Mono>
      </Card>
    </div>
  </Poster>
);
