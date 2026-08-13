// CLIP 1 — Two folds.
//
// One stream of event bytes is consumed once, by two folds at the same time.
// The identity fold extends a hash chain on every event, byte-exact. The
// meaning fold accumulates state and forgives a payload outside its walled
// domain as a no-op. The fourth event is such a payload: watch the chain
// digest move and the state digest hold still.
//
// Every head and digest on screen comes from data/two-folds.json, written by
// scripts/two-folds.ts against packages/core.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import data from "../../data/two-folds.json";
import { DigestPill, EventChip, Label, short } from "../components/Atoms";
import { Stage } from "../components/Layers";
import { Entrance, ramp, SceneExit, useBreath, WordReveal } from "../components/Motion";
import { theme } from "../theme";

const BEAT_START = 36;
const BEAT_GAP = 36;
const COPY_AT = 244;

const frames = data.frames;
const beatOf = (i: number) => BEAT_START + i * BEAT_GAP;

/** Which beat each key first reached the state on, so rows enter with their fact. */
const keyArrival = new Map<string, number>();
frames.forEach((f, i) => {
  for (const [key] of f.entries) if (!keyArrival.has(key)) keyArrival.set(key, i);
});

const LANE_WIDTH = 720;
const LANE_LEFT = 150;
const LANE_RIGHT = 1050;

const Panel: React.FC<{
  x: number;
  children: React.ReactNode;
  accent: string;
}> = ({ x, children, accent }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 296,
      width: LANE_WIDTH,
      height: 392,
      borderRadius: 22,
      border: `1.5px solid ${accent}`,
      background: theme.colors.surface,
      padding: "26px 30px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);

const ChainRow: React.FC<{ index: number; head: string; beat: number }> = (
  { index, head, beat },
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - beat, fps, config: theme.spring.snappy });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-26, 0])}px) scale(${
          interpolate(p, [0, 1], [0.96, 1])
        })`,
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 12,
          background: theme.colors.primary,
        }}
      />
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: 25,
          color: theme.colors.textFaint,
          width: 78,
        }}
      >
        {index}
      </div>
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontWeight: 600,
          fontSize: 27,
          color: theme.colors.text,
        }}
      >
        {short(head, 16)}
      </div>
    </div>
  );
};

const StateRow: React.FC<{ k: string; v: string; beat: number }> = ({ k, v, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - beat, fps, config: theme.spring.snappy });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-26, 0])}px) scale(${
          interpolate(p, [0, 1], [0.96, 1])
        })`,
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: theme.colors.textDim,
        }}
      />
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontWeight: 600,
          fontSize: 27,
          color: theme.colors.text,
        }}
      >
        {k}
      </div>
      <div style={{ fontFamily: theme.fonts.mono, fontSize: 27, color: theme.colors.textFaint }}>
        =
      </div>
      <div
        style={{ fontFamily: theme.fonts.mono, fontSize: 27, color: theme.colors.textDim }}
      >
        {v}
      </div>
    </div>
  );
};

export const TwoFolds: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const beatsDone = frames.reduce((n, _, i) => (frame >= beatOf(i) ? i + 1 : n), 0);
  const current = beatsDone === 0 ? undefined : frames[beatsDone - 1];
  const head = current?.head ?? data.seed;
  const stateDigest = current?.stateDigest ?? data.emptyStateDigest;

  // The forgiven beat: the one event the meaning fold drops.
  const forgivenIndex = frames.findIndex((f) => !f.admitted);
  const forgivenBeat = beatOf(forgivenIndex);
  // Clears before the next event lands, so the amber never outlives its cause.
  const forgiven = ramp(frame, forgivenBeat, forgivenBeat + 10) *
    (1 - ramp(frame, forgivenBeat + 20, forgivenBeat + 32, theme.ease.in));

  // Chain pulses on every beat; meaning pulses only when it admitted the event.
  const lastBeat = beatsDone === 0 ? -999 : beatOf(beatsDone - 1);
  const pulse = (on: boolean) =>
    on
      ? interpolate(spring({ frame: frame - lastBeat, fps, config: theme.spring.bouncy }), [
        0,
        1,
      ], [1.05, 1])
      : 1;

  const breath = useBreath(26, 0.008);

  return (
    <Stage>
      <SceneExit>
        <AbsoluteFill>
          {/* the stream, laid out once across the top */}
          <div
            style={{
              position: "absolute",
              top: 112,
              left: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              gap: 20,
            }}
          >
            {frames.map((f, i) => {
              const live = frame >= beatOf(i);
              const state = !f.admitted && live ? "refusal" : live ? "hero" : "idle";
              return (
                <Entrance key={f.seq} delay={i * 4} from={-26} preset="snappy">
                  <EventChip
                    payload={f.payload}
                    seq={f.seq}
                    state={state}
                    style={{
                      transform: `scale(${live ? 1 : 0.96})`,
                      opacity: live ? 1 : 0.62,
                    }}
                  />
                </Entrance>
              );
            })}
          </div>

          {/* lane headings */}
          <Entrance delay={12} style={{ position: "absolute", left: LANE_LEFT, top: 244 }}>
            <Label>identity fold</Label>
          </Entrance>
          <Entrance delay={18} style={{ position: "absolute", left: LANE_RIGHT, top: 244 }}>
            <Label>meaning fold</Label>
          </Entrance>

          <Entrance delay={12}>
            <Panel x={LANE_LEFT} accent={theme.colors.primarySoft}>
              {frames.slice(0, beatsDone).map((f, i) => (
                <ChainRow key={f.seq} index={f.seq} head={f.head} beat={beatOf(i)} />
              ))}
            </Panel>
          </Entrance>

          <Entrance delay={18}>
            <Panel x={LANE_RIGHT} accent={theme.colors.line}>
              {(current?.entries ?? []).map(([k, v]) => (
                <StateRow key={k} k={k} v={v} beat={beatOf(keyArrival.get(k) ?? 0)} />
              ))}
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: forgiven,
                  transform: `translateY(${interpolate(forgiven, [0, 1], [14, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: theme.colors.refusal,
                  }}
                />
                <div
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontWeight: 600,
                    fontSize: 27,
                    color: theme.colors.refusal,
                  }}
                >
                  {frames[forgivenIndex]?.payload} — no-op
                </div>
              </div>
            </Panel>
          </Entrance>

          {/* the two answers, updating live */}
          <Entrance
            delay={26}
            style={{ position: "absolute", left: LANE_LEFT, top: 724, width: LANE_WIDTH }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <DigestPill
                digest={head}
                caption="chain head"
                hero
                chars={16}
                style={{ transform: `scale(${pulse(true) * breath})` }}
              />
            </div>
          </Entrance>
          <Entrance
            delay={32}
            style={{ position: "absolute", left: LANE_RIGHT, top: 724, width: LANE_WIDTH }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <DigestPill
                digest={stateDigest}
                caption="state digest"
                chars={16}
                style={{
                  transform: `scale(${pulse(current?.admitted !== false)})`,
                  borderColor: forgiven > 0.3 ? theme.colors.refusal : theme.colors.line,
                }}
              />
            </div>
          </Entrance>

          {/* the line, verbatim from packages/core/src/entity.ts */}
          <div
            style={{
              position: "absolute",
              top: 868,
              left: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <WordReveal
              text="the chain remembers what meaning drops"
              delay={COPY_AT}
              per={3}
              highlight={["chain"]}
              style={{
                fontFamily: theme.fonts.display,
                fontWeight: 700,
                fontSize: 70,
                letterSpacing: "-0.03em",
              }}
            />
            <Entrance delay={COPY_AT + 26} from={16} preset="snappy">
              <Label size={19}>packages/core/src/entity.ts</Label>
            </Entrance>
          </div>
        </AbsoluteFill>
      </SceneExit>
    </Stage>
  );
};

export const TWO_FOLDS_DURATION = 360;
