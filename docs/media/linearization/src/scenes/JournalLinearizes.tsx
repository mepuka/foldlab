// Clip 2 — "The journal linearizes".
//
// Two handles on one stream propose the same tail position. The
// expected-sequence CAS admits one; the loser is told exactly which position it
// lost, resyncs from the verified tail, and succeeds at the next position.
// Positions, payloads, head digests and the refusal string come from the trace
// the real journal emitted (src/data.ts).
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { theme } from "../theme";
import { Stage } from "../components/Stack";
import { CopyLine, Kicker } from "../components/Type";
import { ActorChip, Impact, RefusalCard, Token } from "../components/Bits";
import { journalScript, shortHex } from "../data";

const J = journalScript;

// -------- stage geometry (1920x1080) --------
const SLOT = { y: 300, h: 140, w: 300 };
const SLOT_X = [600, 1000];
const SLOT_MID_Y = SLOT.y + SLOT.h / 2;
const VERIFIED = { x: 1390, y: 300, w: 390, h: 140 };

// The cursor rides a rail under the tail. Its label sits to the RIGHT of the
// marker so it never occupies the corridor the handles travel through.
const CURSOR_Y = 446;
const CURSOR_X = [480, SLOT_X[0] + SLOT.w / 2];

const W_Y = 180;
const L_Y = 620;
const CHIP_MID = 37;
const LAUNCH_X = 330;

const COPY = [
  {
    text: "append linearizes exactly once or conflicts",
    source: "docs/map/tickets/012-journal-model-gate.md:22",
    accent: 1,
  },
  {
    text: "the CAS proved the position occupied",
    source: "go/journal/journal.go:284",
    accent: 5,
  },
  {
    text: "recovers through Append alone",
    source: "go/journal/journal.go:293",
    accent: 0,
  },
] as const;

/**
 * One position at the tail. Empty until an append wins it; once filled it holds
 * a payload and the head digest the entry hashes to.
 */
const Slot: React.FC<{
  index: number;
  from: number;
  filledFrom?: number;
  payload?: string;
  head?: string;
}> = ({ index, from, filledFrom, payload, head }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.smooth });
  const fill =
    filledFrom === undefined
      ? 0
      : spring({
          frame: frame - filledFrom,
          fps,
          config: theme.spring.bouncy,
        });
  const filled = fill > 0.02;
  const breathe = filled ? 1 + Math.sin(frame / 40) * 0.005 : 1;
  return (
    <div
      style={{
        position: "absolute",
        left: SLOT_X[index],
        top: SLOT.y,
        width: SLOT.w,
        height: SLOT.h,
        borderRadius: 18,
        border: `1.5px ${filled ? "solid" : "dashed"} ${
          filled ? theme.colors.primary : theme.colors.line
        }`,
        background: filled
          ? `${theme.colors.primary}${index === 0 ? "1C" : "16"}`
          : theme.colors.lineFaint,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [22, 0])}px)
                    scale(${interpolate(p, [0, 1], [0.94, 1]) * breathe})`,
        padding: "16px 22px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: theme.fonts.mono,
      }}
    >
      <div
        style={{
          fontSize: theme.size.dataSmall,
          letterSpacing: "0.13em",
          color: filled ? theme.colors.primary : theme.colors.textFaint,
        }}
      >
        POSITION {index}
      </div>
      <div
        style={{
          fontFamily: theme.fonts.display,
          fontWeight: 700,
          fontSize: 46,
          letterSpacing: "-0.02em",
          color: theme.colors.text,
          opacity: fill,
          transform: `translateY(${interpolate(fill, [0, 1], [16, 0])}px)`,
        }}
      >
        {payload ? `"${payload}"` : ""}
      </div>
      <div
        style={{
          fontSize: 17,
          letterSpacing: "0.04em",
          color: theme.colors.textDim,
          opacity: fill * 0.9,
        }}
      >
        {head ? shortHex(head) : ""}
      </div>
    </div>
  );
};

/** The chain link: position n+1 carries position n's head as its prev. */
const Link: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 20], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const x0 = SLOT_X[0] + SLOT.w;
  const x1 = SLOT_X[1];
  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      <line
        x1={x0}
        y1={SLOT_MID_Y}
        x2={x0 + (x1 - x0) * p}
        y2={SLOT_MID_Y}
        stroke={theme.colors.primary}
        strokeWidth={2.5}
        opacity={0.85}
      />
      <circle
        cx={x0 + (x1 - x0) * p}
        cy={SLOT_MID_Y}
        r={5 * p}
        fill={theme.colors.primary}
        opacity={0.9}
      />
      <text
        x={(x0 + x1) / 2}
        y={SLOT_MID_Y - 16}
        textAnchor="middle"
        fill={theme.colors.textDim}
        opacity={p}
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: 17,
          letterSpacing: "0.08em",
        }}
      >
        prev
      </text>
    </svg>
  );
};

/** The loser's cursor: it starts at genesis and adopts the verified tail. */
const Cursor: React.FC<{ from: number; moveFrom: number }> = ({
  from,
  moveFrom,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.smooth });
  const slide = spring({
    frame: frame - moveFrom,
    fps,
    config: theme.spring.smooth,
  });
  const x = CURSOR_X[0] + (CURSOR_X[1] - CURSOR_X[0]) * slide;
  const moved = slide > 0.5;
  const position = moved ? J.resync.position : J.openPosition;
  const head = moved ? (J.resync.head ?? J.genesis) : J.genesis;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: CURSOR_Y,
        transform: `translateY(${interpolate(p, [0, 1], [-14, 0])}px)`,
        opacity: p,
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: theme.fonts.mono,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "9px solid transparent",
          borderRight: "9px solid transparent",
          borderBottom: `12px solid ${
            moved ? theme.colors.primary : theme.colors.textFaint
          }`,
        }}
      />
      <div
        style={{
          fontSize: theme.size.dataSmall,
          letterSpacing: "0.06em",
          color: moved ? theme.colors.primary : theme.colors.textDim,
        }}
      >
        {J.resync.actor} · position {position} · {shortHex(head)}
      </div>
    </div>
  );
};

/** The payoff: the whole stream reads back as one verified chain. */
const VerifiedCard: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.bouncy });
  if (frame < from) {
    return null;
  }
  const pulse = 0.7 + Math.sin((frame - from) / 21) * 0.14;
  return (
    <div
      style={{
        position: "absolute",
        left: VERIFIED.x,
        top: VERIFIED.y,
        width: VERIFIED.w,
        height: VERIFIED.h,
        borderRadius: 18,
        background: theme.colors.primary,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [30, 0])}px)
                    scale(${interpolate(p, [0, 1], [0.9, 1])})`,
        boxShadow: `0 0 ${58 * pulse}px ${theme.colors.glow}, 0 0 ${
          128 * pulse
        }px rgba(232,184,75,0.16)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
      }}
    >
      <span
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: theme.size.dataSmall,
          letterSpacing: "0.15em",
          color: "rgba(6,7,11,0.6)",
        }}
      >
        READ · {J.verified.outcome.toUpperCase()}
      </span>
      <span
        style={{
          fontFamily: theme.fonts.display,
          fontWeight: 700,
          fontSize: 44,
          letterSpacing: "-0.02em",
          color: theme.colors.bg,
        }}
      >
        [{J.chain.map((p2) => `"${p2}"`).join(", ")}]
      </span>
      <span
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: 17,
          letterSpacing: "0.05em",
          color: "rgba(6,7,11,0.66)",
        }}
      >
        head {shortHex(J.verified.head ?? "")}
      </span>
    </div>
  );
};

export const JournalLinearizes: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const s = (sec: number) => Math.round(sec * fps);

  const beat = {
    kicker: s(0.13),
    slot0: s(0.45),
    slot1: s(0.6),
    handleW: s(0.75),
    handleL: s(0.9),
    cursor: s(1.1),
    copy1: s(0.7),
    copy1End: s(2.9),
    race: s(1.6),
    raceTravel: s(0.45),
    copy2: s(3.0),
    copy2End: s(4.6),
    resync: s(3.7),
    copy3: s(4.7),
    recover: s(4.9),
    recoverTravel: s(0.5),
    link: s(5.7),
    verified: s(6.2),
    exit: s(7.3),
  };

  const raceLand = beat.race + beat.raceTravel;
  const recoverLand = beat.recover + beat.recoverTravel;
  const contested = { x: SLOT_X[0], y: SLOT_MID_Y };

  return (
    <Stage exitFrom={beat.exit} exitTo={durationInFrames - 2}>
      <AbsoluteFill>
        <Kicker
          from={beat.kicker}
          x={theme.layout.marginX}
          y={78}
          label="JOURNAL"
          value={J.trace.stream ?? ""}
        />
        <Kicker
          from={beat.kicker + 5}
          x={1920 - theme.layout.marginX}
          y={78}
          label="TRACE"
          value="go/journal/journal.go"
          align="right"
        />

        <Slot
          index={0}
          from={beat.slot0}
          filledFrom={raceLand}
          payload={J.winner.payload}
          head={J.winner.head}
        />
        <Slot
          index={1}
          from={beat.slot1}
          filledFrom={recoverLand}
          payload={J.recovery.payload}
          head={J.recovery.head}
        />
        <Link from={beat.link} />
        <VerifiedCard from={beat.verified} />

        <ActorChip
          from={beat.handleW}
          x={theme.layout.marginX}
          y={W_Y}
          id={J.winner.actor}
          role="handle"
        />
        <ActorChip
          from={beat.handleL}
          x={theme.layout.marginX}
          y={L_Y}
          id={J.conflict.actor}
          role="handle"
        />

        <Cursor from={beat.cursor} moveFrom={beat.resync} />

        {/* ---- both handles propose the same position ---- */}
        <Token
          from={beat.race}
          travel={beat.raceTravel}
          x0={LAUNCH_X}
          y0={W_Y + CHIP_MID}
          x1={contested.x - 60}
          y1={contested.y - 26}
          label={`append · seq ${J.winner.position}`}
          fate="land"
          vanishAt={raceLand}
        />
        <Token
          from={beat.race}
          travel={beat.raceTravel}
          x0={LAUNCH_X}
          y0={L_Y + CHIP_MID}
          x1={contested.x}
          y1={contested.y + 70}
          label={`append · seq ${J.conflict.position}`}
          fate="bounce"
          vanishAt={raceLand + 11}
        />
        <Impact at={raceLand} x={contested.x} y={contested.y + 70} />
        <RefusalCard
          from={raceLand + 7}
          x={370}
          y={L_Y - 10}
          kind={J.conflictCard.kind}
          detail={J.conflictCard.detail}
          detail2={J.conflictCard.detail2}
        />

        {/* ---- recovery through Append alone ---- */}
        <Token
          from={beat.recover}
          travel={beat.recoverTravel}
          x0={LAUNCH_X}
          y0={L_Y + CHIP_MID}
          x1={SLOT_X[1] - 60}
          y1={SLOT_MID_Y + 26}
          label={`append · seq ${J.recovery.position}`}
          fate="land"
          // Gone before the verified card lights: exactly one glow per frame.
          vanishAt={recoverLand - 4}
        />

        <CopyLine
          copy={COPY[0]}
          from={beat.copy1}
          until={beat.copy1End}
          x={theme.layout.marginX}
          y={772}
          width={1500}
        />
        <CopyLine
          copy={COPY[1]}
          from={beat.copy2}
          until={beat.copy2End}
          x={theme.layout.marginX}
          y={772}
          width={1500}
        />
        <CopyLine
          copy={COPY[2]}
          from={beat.copy3}
          until={durationInFrames + 60}
          x={theme.layout.marginX}
          y={772}
          width={1500}
        />
      </AbsoluteFill>
    </Stage>
  );
};
