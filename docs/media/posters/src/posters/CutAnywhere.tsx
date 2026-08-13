// POSTER 2 — cut the history anywhere.
//
// One six-event history, folded three ways: whole, cut at 2, cut at 4. The
// pieces are folded alone and combined, and all three routes arrive at ONE
// answer — so there is one answer card on the poster, and it is the only thing
// that glows. Three glowing cards would have said "three answers".
//
// The fold carried here is (count, payload bytes): a pair whose combine is
// associative around (0, 0), which is exactly what licenses the cut. Every
// number and digest is read from docs/media/folding/data/cut-anywhere.json.
import React from "react";

import trace from "../../../folding/data/cut-anywhere.json";
import { Card, Kicker, Mono, Poster, Rule } from "../components/Poster";
import { display, short, theme } from "../theme";

const px = (n: number) => `${n}px`;

const cut2 = trace.cuts.find((c) => c.at === 2)!;
const cut4 = trace.cuts.find((c) => c.at === 4)!;

const pair = (s: readonly number[]) => `(${s[0]}, ${s[1]})`;

const W_ROUTE = display(104);
const W_PIECES = display(390);

/** One piece of a fold: the value it carries, and the digest of that value.
 *  Two lines, not three — a third line here cost the copy its footer. */
const Piece: React.FC<{ label: string; state: readonly number[]; digest: string }> = ({
  label,
  state,
  digest,
}) => (
  <Card padX={12} padY={6} style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
    <Mono size={theme.type.label} color={theme.colors.textFaint}>
      {`${label}  ${short(digest)}`}
    </Mono>
    <Mono size={theme.type.lead} color={theme.colors.text} weight={700}>
      {pair(state)}
    </Mono>
  </Card>
);

const Op: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Mono size={theme.type.lead} color={theme.colors.textFaint} weight={700}>
    {children}
  </Mono>
);

const Route: React.FC<{ route: string; children: React.ReactNode }> = ({ route, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: px(display(16)) }}>
    <div style={{ width: W_ROUTE, flexShrink: 0 }}>
      <Mono size={theme.type.label} color={theme.colors.textDim} track={1.2} upper weight={700}>
        {route}
      </Mono>
    </div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: px(display(12)),
        width: W_PIECES,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  </div>
);

export const CutAnywhere: React.FC = () => (
  <Poster
    kicker="foldlab · fold a history in parts"
    copy="the answer does not depend on where it was cut"
    cite="packages/core/src/fold.ts:69-70"
  >
    <div style={{ display: "flex", flexDirection: "column", gap: px(display(14)) }}>
      {/* The history itself: six events, with the two cut points marked. The
          bars are 6 display px wide — 3 was invisible once downscaled. */}
      <div style={{ display: "flex", alignItems: "stretch", gap: px(display(6)) }}>
        {trace.events.map((e, i) => (
          <React.Fragment key={e.seq}>
            {(i === 2 || i === 4) && (
              <div
                style={{
                  width: px(display(6)),
                  // Without this the bar is a flex item with nothing in it: the
                  // row overflowed, everything shrank, and the two marks that
                  // ARE the poster's subject shrank to nothing at all.
                  flexShrink: 0,
                  alignSelf: "stretch",
                  // Solid, not glowing: the answer card downstream is the one
                  // glow this poster is allowed.
                  background: theme.colors.primary,
                  borderRadius: 99,
                  margin: `0 ${px(display(4))}`,
                }}
              />
            )}
            <Card
              padX={8}
              padY={6}
              style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }}
            >
              <Mono size={theme.type.label} color={theme.colors.textFaint}>
                {`${e.stream}@${e.seq}`}
              </Mono>
              <Mono size={theme.type.data} color={theme.colors.text}>
                {e.payload}
              </Mono>
            </Card>
          </React.Fragment>
        ))}
      </div>

      <Rule color={theme.colors.line} />

      <div style={{ display: "flex", alignItems: "center", gap: px(display(16)) }}>
        {/* Left: the three routes. */}
        <div style={{ display: "flex", flexDirection: "column", gap: px(display(12)) }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: px(display(16)) }}>
            <div style={{ width: W_ROUTE, flexShrink: 0 }}>
              <Kicker>route</Kicker>
            </div>
            <div style={{ width: W_PIECES, flexShrink: 0 }}>
              <Kicker>{"pieces folded alone — (count, bytes)"}</Kicker>
            </div>
          </div>
          <Route route="no cut">
            <Piece label="whole history" state={trace.whole.state} digest={trace.whole.digest} />
          </Route>
          <Route route={`cut at ${cut2.at}`}>
            <Piece label="left " state={cut2.left.state} digest={cut2.left.digest} />
            <Op>⊕</Op>
            <Piece label="right" state={cut2.right.state} digest={cut2.right.digest} />
          </Route>
          <Route route={`cut at ${cut4.at}`}>
            <Piece label="left " state={cut4.left.state} digest={cut4.left.digest} />
            <Op>⊕</Op>
            <Piece label="right" state={cut4.right.state} digest={cut4.right.digest} />
          </Route>
        </div>

        {/* The three routes converge on one answer. */}
        <div
          style={{
            width: px(display(3)),
            alignSelf: "stretch",
            marginTop: px(display(24)),
            background: theme.colors.primarySoft,
            borderRadius: 99,
          }}
        />
        <Op>=</Op>

        {/* Right: the single answer. The only glow on the poster. */}
        <Card
          tone="glow"
          padX={20}
          padY={14}
          style={{ flexDirection: "column", alignItems: "flex-start", gap: px(display(2)) }}
        >
          <Mono size={theme.type.label} color={theme.colors.primary} track={1.2} upper weight={700}>
            one answer
          </Mono>
          <Mono size={theme.type.figure} color={theme.colors.text} weight={700}>
            {pair(trace.whole.state)}
          </Mono>
          <Mono size={theme.type.dataStrong} color={theme.colors.text}>
            {short(trace.whole.digest)}
          </Mono>
        </Card>
      </div>
    </div>
  </Poster>
);
