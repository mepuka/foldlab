// POSTER 5 — the journal linearizes.
//
// Two handles open on the same genesis cursor and both propose position 0. The
// create-only CAS lets exactly one of them store: W lands "a", and L is refused
// at the position by NAME — ErrConflict tells it which position was taken, not
// merely that something went wrong. L resyncs onto the verified tail and chains
// at the next position. One chain, no fork at any sequence number.
//
// Every position, head and error string is read from
// docs/media/linearization/data/journal-trace.json, recorded by
// `go run ./cmd/lineartrace`.
import React from "react";

import trace from "../../../linearization/data/journal-trace.json";
import { Card, Kicker, Mono, Poster, Rule } from "../components/Poster";
import { display, short, theme } from "../theme";

const px = (n: number) => `${n}px`;

interface Event {
  readonly t_ms: number;
  readonly actor: string;
  readonly op: string;
  readonly outcome: string;
  readonly note: string;
  readonly position: number;
  readonly head?: string;
  readonly payload?: string;
  readonly err_kind?: string;
  readonly err_text?: string;
}

const at = (i: number) => trace.events[i] as Event;

const GENESIS = at(0);
const WIN = at(2); // W append "a" -> stored at 0
const LOSE = at(3); // L append "b" -> ErrConflict at 0
const RESYNC = at(4);
const CHAIN = at(5); // L append "c" -> stored at 1
const READ = at(6);

const COL = { t: display(40), actor: display(28), op: display(150) } as const;
const GAP = display(12);

const Cell: React.FC<{ w: number; children: React.ReactNode }> = ({ w, children }) => (
  <div style={{ width: w, flexShrink: 0 }}>{children}</div>
);

const Step: React.FC<{ e: Event; detail: string; tone?: "refusal" | "plain" }> = ({
  e,
  detail,
  tone = "plain",
}) => {
  const refused = tone === "refusal";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: px(GAP),
        background: refused ? theme.colors.refusalFaint : "transparent",
        borderLeft: `${px(display(2.5))} solid ${refused ? theme.colors.refusal : "transparent"}`,
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
          {e.actor === "stream" ? "▪" : e.actor}
        </Mono>
      </Cell>
      <Cell w={COL.op}>
        <Mono
          size={theme.type.dataStrong}
          color={refused ? theme.colors.refusal : theme.colors.text}
          weight={700}
        >
          {e.payload && e.op === "append" ? `${e.op} "${e.payload}" @${e.position}` : e.op}
        </Mono>
      </Cell>
      <Mono
        size={theme.type.data}
        color={refused ? theme.colors.refusal : theme.colors.textDim}
        weight={refused ? 700 : 500}
      >
        {detail}
      </Mono>
    </div>
  );
};

/** The chain that survives: genesis, then two positions, one head each. */
const Chain: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: px(display(10)) }}>
    <Card padX={12} padY={8} style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
      <Mono size={theme.type.label} color={theme.colors.textFaint}>
        genesis
      </Mono>
      <Mono size={theme.type.data} color={theme.colors.textDim}>
        {short(GENESIS.head ?? "")}
      </Mono>
    </Card>
    <Mono size={theme.type.lead} color={theme.colors.textFaint} weight={700}>
      →
    </Mono>
    {[WIN, CHAIN].map((e) => (
      <React.Fragment key={e.position}>
        <Card
          tone="primary"
          padX={12}
          padY={8}
          style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }}
        >
          <Mono size={theme.type.label} color={theme.colors.textFaint}>
            {`position ${e.position}`}
          </Mono>
          <Mono size={theme.type.dataStrong} color={theme.colors.text} weight={700}>
            {`"${e.payload}"`}
          </Mono>
          <Mono size={theme.type.label} color={theme.colors.primary}>
            {short(e.head ?? "")}
          </Mono>
        </Card>
        {e === WIN && (
          <Mono size={theme.type.lead} color={theme.colors.textFaint} weight={700}>
            →
          </Mono>
        )}
      </React.Fragment>
    ))}

    {/* The loser's first payload never enters the chain; it is shown beside it. */}
    <div style={{ display: "flex", alignItems: "center", paddingLeft: px(display(14)) }}>
      <Card tone="refusal" padX={12} padY={7}>
        <Mono size={theme.type.dataStrong} color={theme.colors.refusal} weight={700}>
          {`"${LOSE.payload}" bounced`}
        </Mono>
      </Card>
    </div>

    <div style={{ marginLeft: "auto" }}>
      <Card
        tone="glow"
        padX={16}
        padY={7}
        style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }}
      >
        <Mono size={theme.type.label} color={theme.colors.primary} track={1.2} upper weight={700}>
          verified
        </Mono>
        <Mono size={theme.type.dataStrong} color={theme.colors.text} weight={700}>
          {READ.payload}
        </Mono>
      </Card>
    </div>
  </div>
);

export const JournalLinearizes: React.FC = () => (
  <Poster
    kicker="foldlab · the journal linearizes"
    copy="append linearizes exactly once or conflicts"
    cite="docs/map/tickets/012-journal-model-gate.md:22"
  >
    <div style={{ display: "flex", flexDirection: "column", gap: px(display(14)) }}>
      <Mono size={theme.type.label} color={theme.colors.textDim}>
        {`stream ${trace.stream}   ·   ${trace.law}   ·   both handles propose position 0`}
      </Mono>

      <Chain />
      <Rule color={theme.colors.line} />

      <div style={{ display: "flex", flexDirection: "column", gap: px(display(3)) }}>
        <div style={{ display: "flex", gap: px(GAP), alignItems: "baseline" }}>
          <Cell w={COL.t}>
            <Kicker>t</Kicker>
          </Cell>
          <Cell w={COL.actor}>
            <Kicker>·</Kicker>
          </Cell>
          <Cell w={COL.op}>
            <Kicker>operation</Kicker>
          </Cell>
          <Kicker>outcome</Kicker>
        </div>
        <Step e={WIN} detail={`stored — head ${short(WIN.head ?? "")}, the tail advanced`} />
        <Step e={LOSE} tone="refusal" detail={`${LOSE.err_kind} — the CAS proved the position occupied`} />
        <Step e={RESYNC} detail={`cursor @${RESYNC.position} — adopted the verified tail`} />
        <Step e={CHAIN} detail={`stored — head ${short(CHAIN.head ?? "")}, chained onto the winner`} />
      </div>

      {/* The refusal names the position. Recorded verbatim; nothing elided. */}
      <Card tone="refusal" padX={16} padY={9}>
        <Mono size={theme.type.data} color={theme.colors.refusal} weight={700}>
          {LOSE.err_text}
        </Mono>
        <Mono size={theme.type.label} color={theme.colors.textDim}>
          {`   ${LOSE.err_kind}, verbatim`}
        </Mono>
      </Card>
    </div>
  </Poster>
);
