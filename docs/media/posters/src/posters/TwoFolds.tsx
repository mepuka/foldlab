// POSTER 1 — two folds over one event stream.
//
// One column of events feeds two folds side by side. The identity fold (the
// chain) commits every event, admitted or not. The meaning fold refuses the
// malformed payload at seq 3 and FORGIVES it as a no-op, so its digest does not
// move. Five events committed, four admitted to meaning; the gap between those
// two numbers is the whole poster.
//
// Every digest, payload and count below is read from the committed trace at
// docs/media/folding/data/two-folds.json. Nothing is authored here.
import React from "react";

import trace from "../../../folding/data/two-folds.json";
import { Card, Kicker, Mono, Poster, Rule } from "../components/Poster";
import { display, short, theme } from "../theme";

const px = (n: number) => `${n}px`;

// Column widths are stated in DISPLAY pixels and must sum, with the gaps, to
// less than the 792 display px of content the 1600px canvas leaves after
// margins. Overrun does not wrap here — it walks off the right edge.
const COL = {
  seq: display(26),
  payload: display(175),
  chain: display(145),
  meaning: display(145),
  note: display(190),
} as const;

const GAP = display(20);
const ROW_GAP = display(6);

const Head: React.FC = () => (
  <div style={{ display: "flex", alignItems: "baseline", gap: px(GAP) }}>
    <div style={{ width: COL.seq + GAP + COL.payload }}>
      <Kicker>event stream</Kicker>
    </div>
    <div style={{ width: COL.chain }}>
      <Kicker color={theme.colors.primary}>identity fold</Kicker>
    </div>
    <div style={{ width: COL.meaning }}>
      <Kicker>meaning fold</Kicker>
    </div>
  </div>
);

export const TwoFolds: React.FC = () => (
  <Poster
    kicker="foldlab · one stream, two folds"
    copy="the chain remembers what meaning drops"
    cite="packages/core/src/entity.ts:68"
  >
    <div style={{ display: "flex", flexDirection: "column", gap: px(ROW_GAP) }}>
      <Head />
      <Rule color={theme.colors.line} />

      {trace.frames.map((f) => {
        const forgiven = !f.admitted;
        const last = f.seq === trace.frames.length - 1;
        return (
          <div
            key={f.seq}
            style={{
              display: "flex",
              alignItems: "center",
              gap: px(GAP),
              // The forgiven row is the only one that is tinted, so the eye
              // lands on it without any motion to help.
              background: forgiven ? theme.colors.refusalFaint : "transparent",
              borderRadius: px(display(6)),
              padding: `${px(display(3))} ${px(display(8))}`,
              margin: `0 ${px(-display(8))}`,
            }}
          >
            <div style={{ width: COL.seq }}>
              <Mono size={theme.type.data} color={theme.colors.textFaint}>
                {f.seq}
              </Mono>
            </div>
            <div style={{ width: COL.payload }}>
              <Mono
                size={theme.type.dataStrong}
                color={forgiven ? theme.colors.refusal : theme.colors.text}
                weight={forgiven ? 700 : 500}
              >
                {f.payload}
              </Mono>
            </div>

            <div style={{ width: COL.chain }}>
              <Card
                tone={last ? "glow" : "primary"}
                padX={10}
                padY={4}
                style={{ display: "inline-flex" }}
              >
                <Mono
                  size={theme.type.dataStrong}
                  color={last ? theme.colors.text : theme.colors.primary}
                  weight={last ? 700 : 500}
                >
                  {short(f.head)}
                </Mono>
              </Card>
            </div>

            <div style={{ width: COL.meaning }}>
              <Card
                tone={forgiven ? "refusal" : "neutral"}
                padX={10}
                padY={4}
                style={{ display: "inline-flex" }}
              >
                <Mono
                  size={theme.type.dataStrong}
                  color={forgiven ? theme.colors.refusal : theme.colors.textDim}
                >
                  {short(f.stateDigest)}
                </Mono>
              </Card>
            </div>

            <div style={{ width: COL.note }}>
              <Mono
                size={theme.type.label}
                color={forgiven ? theme.colors.refusal : theme.colors.textFaint}
                weight={forgiven ? 700 : 500}
              >
                {forgiven ? "forgiven · unmoved" : `carries ${f.count}`}
              </Mono>
            </div>
          </div>
        );
      })}

      <Rule color={theme.colors.line} />

      <div style={{ display: "flex", alignItems: "center", gap: px(GAP) }}>
        <div style={{ width: COL.seq + GAP + COL.payload }}>
          <Mono size={theme.type.label} color={theme.colors.textFaint} track={1.4} upper>
            events accepted
          </Mono>
        </div>
        <div style={{ width: COL.chain }}>
          <Mono size={theme.type.lead} color={theme.colors.primary} weight={700}>
            {`${trace.eventsCommitted} of 5`}
          </Mono>
        </div>
        <div style={{ width: COL.meaning }}>
          <Mono size={theme.type.lead} color={theme.colors.textDim} weight={700}>
            {`${trace.eventsAdmittedToMeaning} of 5`}
          </Mono>
        </div>
      </div>
    </div>
  </Poster>
);
