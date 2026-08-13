// Clip 1 — "The register linearizes".
//
// Two claimants race one authority key. The revision-CAS admits one; the other
// is refused. The winner's lease lapses unsuperseded, a third steals to the
// next fence, and the superseded holder's late commit bounces off the higher
// fence. Every number, name and refusal string is read from the trace the real
// effector emitted (src/data.ts).
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
import { registerScript } from "../data";

const R = registerScript;

// -------- stage geometry (1920x1080) --------
const SLAB = { x: 760, y: 190, w: 400, h: 500 };
const WALL_L = SLAB.x;
const WALL_R = SLAB.x + SLAB.w;
const RUNG = { w: 340, h: 76, x: SLAB.x + 30 };
const BASELINE = 636; // bottom edge of the lowest rung
const RUNG_Y = [BASELINE - RUNG.h, BASELINE - RUNG.h - 16 - RUNG.h];
const RUNG_MID = RUNG_Y.map((y) => y + RUNG.h / 2);
const OUTCOME = { x: RUNG.x, y: RUNG_Y[1] - 20 - 92, w: RUNG.w, h: 92 };

const LANE = { A: 250, B: 500, C: 470 };
const CHIP_MID = 37; // half a chip's height
const LAUNCH_X = 340; // just clear of the widest actor chip
// Two claimants converge on one key from slightly separated approaches, so the
// instant of contention stays legible.
const APPROACH = 24;

// The copy. Each line is verbatim; the comment is not the source of truth, the
// `source` field is, and it is rendered on screen.
const COPY = [
  {
    text: "no commit lands below the highest fence",
    source: "docs/research/2026-08-13-bug-breaker-verdict.md:15",
    accent: 6,
  },
  {
    text: "safety is fence-authority, not clock",
    source: "docs/research/2026-08-13-effector-certified.md:31",
    accent: 2,
  },
  {
    text: "committed exactly once",
    source: "docs/gauntlet/G1-crash-storm.md:15",
    accent: 0,
  },
] as const;

/** The authority key: one slab, one admission point. */
const Slab: React.FC<{ from: number; revision: number }> = ({
  from,
  revision,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.smooth });
  const breathe = 1 + Math.sin(frame / 46) * 0.006;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: SLAB.x,
          top: SLAB.y,
          width: SLAB.w,
          height: SLAB.h,
          borderRadius: 26,
          background: `linear-gradient(180deg, ${theme.colors.surface}, ${theme.colors.bgAlt})`,
          border: `1.5px solid ${theme.colors.line}`,
          opacity: p * 0.98,
          transform: `scaleY(${interpolate(p, [0, 1], [0.86, 1]) * breathe})`,
          transformOrigin: "50% 100%",
          boxShadow: "0 50px 100px -40px rgba(0,0,0,0.8)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: SLAB.x + 30,
          top: SLAB.y + 26,
          width: SLAB.w - 60,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: theme.fonts.mono,
          fontSize: theme.size.dataSmall,
          letterSpacing: "0.13em",
          color: theme.colors.textFaint,
          opacity: p,
        }}
      >
        <span>AUTHORITY KEY</span>
        <span style={{ color: theme.colors.textDim }}>revision {revision}</span>
      </div>
    </>
  );
};

/** One fence marker. Fences climb; a lapsed one dims but never moves. */
const Rung: React.FC<{
  from: number;
  index: number;
  fence: number;
  owner: string;
  lapsedFrom?: number;
  /** Frame at which this fence turned a lower-fenced commit away. */
  flashAt?: number;
}> = ({ from, index, fence, owner, lapsedFrom, flashAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.bouncy });
  if (frame < from) {
    return null;
  }
  const spent =
    lapsedFrom === undefined
      ? 0
      : interpolate(frame, [lapsedFrom, lapsedFrom + 14], [0, 1], {
          easing: theme.ease.out,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const flash =
    flashAt === undefined
      ? 0
      : interpolate(frame, [flashAt, flashAt + 5, flashAt + 26], [0, 1, 0], {
          easing: theme.ease.out,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const live = 1 - spent;
  return (
    <div
      style={{
        position: "absolute",
        left: RUNG.x,
        top: RUNG_Y[index],
        width: RUNG.w,
        height: RUNG.h,
        borderRadius: 14,
        // A spent fence keeps its place in the order and loses its authority.
        background: `${theme.colors.primary}${live > 0.5 ? "1A" : "08"}`,
        border: `1.5px ${spent > 0.5 ? "dashed" : "solid"} ${
          spent > 0.5 ? theme.colors.primarySoft : theme.colors.primary
        }`,
        opacity: p * (1 - spent * 0.5),
        boxShadow: flash > 0.01 ? `0 0 ${52 * flash}px ${theme.colors.glow}` : "none",
        transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px)
                    scale(${interpolate(p, [0, 1], [0.92, 1]) + flash * 0.02})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 22px",
        fontFamily: theme.fonts.mono,
      }}
    >
      <span
        style={{
          fontSize: theme.size.fence,
          fontWeight: 600,
          color: spent > 0.5 ? theme.colors.primarySoft : theme.colors.primary,
          letterSpacing: "0.02em",
        }}
      >
        fence {fence}
      </span>
      <span
        style={{
          fontSize: theme.size.dataSmall,
          color: spent > 0.5 ? theme.colors.textFaint : theme.colors.textDim,
          letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}
      >
        {spent > 0.5 ? `${owner} · lapsed` : owner}
      </span>
    </div>
  );
};

/** The terminal outcome. The only glowing element once it lands. */
const OutcomeBlock: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.bouncy });
  if (frame < from) {
    return null;
  }
  const pulse = 0.72 + Math.sin((frame - from) / 20) * 0.14;
  return (
    <div
      style={{
        position: "absolute",
        left: OUTCOME.x,
        top: OUTCOME.y,
        width: OUTCOME.w,
        height: OUTCOME.h,
        borderRadius: 16,
        background: theme.colors.primary,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [26, 0])}px)
                    scale(${interpolate(p, [0, 1], [0.9, 1])})`,
        boxShadow: `0 0 ${60 * pulse}px ${theme.colors.glow}, 0 0 ${
          130 * pulse
        }px rgba(232,184,75,0.18)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <span
        style={{
          fontFamily: theme.fonts.display,
          fontWeight: 700,
          fontSize: 36,
          color: theme.colors.bg,
          letterSpacing: "-0.02em",
        }}
      >
        {R.lookup.outcome}
      </span>
      <span
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: theme.size.dataSmall,
          color: "rgba(6,7,11,0.72)",
          letterSpacing: "0.06em",
        }}
      >
        fence {R.landed.fence} · first = {String(R.landed.first)}
      </span>
    </div>
  );
};

/** Dim guide rails: where an operation would travel if it were admitted. */
const Guides: React.FC<{ from: number }> = ({ from }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.smooth });
  return (
    <AbsoluteFill style={{ opacity: p * 0.5 }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {/* Only the final stretch is drawn, so the guides never cross a card. */}
        <line
          x1={575}
          y1={LANE.A + CHIP_MID + 44}
          x2={WALL_L}
          y2={RUNG_MID[0] - APPROACH}
          stroke={theme.colors.line}
          strokeWidth={1.5}
          strokeDasharray="6 10"
        />
        <line
          x1={575}
          y1={LANE.B + CHIP_MID + 22}
          x2={WALL_L}
          y2={RUNG_MID[0] + APPROACH}
          stroke={theme.colors.line}
          strokeWidth={1.5}
          strokeDasharray="6 10"
        />
      </svg>
    </AbsoluteFill>
  );
};

export const RegisterLinearizes: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const s = (sec: number) => Math.round(sec * fps);

  const beat = {
    kicker: s(0.13),
    actorA: s(0.33),
    actorB: s(0.5),
    slab: s(0.45),
    guides: s(1.1),
    copy1: s(0.8),
    copy1End: s(6.0),
    race: s(2.0),
    raceTravel: s(0.5),
    lapse: s(4.3),
    actorC: s(4.6),
    steal: s(5.0),
    stealTravel: s(0.5),
    copy2: s(6.2),
    copy2End: s(9.5),
    late: s(7.0),
    lateTravel: s(0.5),
    commit: s(8.7),
    commitTravel: s(0.45),
    copy3: s(9.6),
    exit: s(11.3),
  };

  const raceLand = beat.race + beat.raceTravel;
  const stealLand = beat.steal + beat.stealTravel;
  const lateImpact = beat.late + beat.lateTravel;
  const commitLand = beat.commit + beat.commitTravel;

  // The revision counter only ever shows a revision the trace recorded.
  const revision =
    frame >= commitLand
      ? (R.landed.revision ?? 0)
      : frame >= stealLand
        ? (R.steal.revision ?? 0)
        : frame >= raceLand
          ? (R.granted.revision ?? 0)
          : 0;

  return (
    <Stage exitFrom={beat.exit} exitTo={durationInFrames - 2}>
      <AbsoluteFill>
        <Kicker
          from={beat.kicker}
          x={theme.layout.marginX}
          y={78}
          label="REGISTER"
          value={R.keyLabel}
        />
        <Kicker
          from={beat.kicker + 5}
          x={1920 - theme.layout.marginX}
          y={78}
          label="TRACE"
          value="go/effector/effector.go"
          align="right"
        />

        <Guides from={beat.guides} />
        <Slab from={beat.slab} revision={revision} />

        <Rung
          from={raceLand}
          index={0}
          fence={R.rungs[0].fence}
          owner={R.rungs[0].owner}
          lapsedFrom={beat.lapse}
        />
        <Rung
          from={stealLand}
          index={1}
          fence={R.rungs[1].fence}
          owner={R.rungs[1].owner}
          flashAt={lateImpact}
        />
        <OutcomeBlock from={commitLand} />

        {/* ---- the claim race: two claimants, one key ---- */}
        <ActorChip
          from={beat.actorA}
          x={theme.layout.marginX}
          y={LANE.A}
          id={R.refusedClaim.actor}
          role="claimant"
          dim={frame > raceLand + 24}
        />
        <ActorChip
          from={beat.actorB}
          x={theme.layout.marginX}
          y={LANE.B}
          id={R.granted.actor}
          role="claimant"
          dim={frame > beat.lapse}
        />
        <ActorChip
          from={beat.actorC}
          x={1920 - theme.layout.marginX}
          y={LANE.C}
          id={R.steal.actor}
          role="stealer"
          align="right"
        />

        <Token
          from={beat.race}
          travel={beat.raceTravel}
          x0={LAUNCH_X}
          y0={LANE.A + CHIP_MID}
          x1={WALL_L - 22}
          y1={RUNG_MID[0] - APPROACH}
          label="claim"
          fate="bounce"
          vanishAt={raceLand + 13}
        />
        <Token
          from={beat.race}
          travel={beat.raceTravel}
          x0={LAUNCH_X}
          y0={LANE.B + CHIP_MID}
          x1={WALL_L - 55}
          y1={RUNG_MID[0] + APPROACH}
          label="claim"
          fate="land"
          vanishAt={raceLand}
        />
        <Impact at={raceLand} x={WALL_L} y={RUNG_MID[0] - APPROACH} />
        <RefusalCard
          from={raceLand + 6}
          x={theme.layout.marginX}
          y={LANE.A + 100}
          kind={R.refusedClaimCard.kind}
          detail={R.refusedClaimCard.detail}
          detail2={R.refusedClaimCard.detail2}
        />

        {/* ---- the steal takes the next fence ---- */}
        <Token
          from={beat.steal}
          travel={beat.stealTravel}
          x0={1620}
          y0={LANE.C + CHIP_MID}
          x1={WALL_R + 55}
          y1={RUNG_MID[1]}
          label="steal"
          fate="land"
          vanishAt={stealLand}
        />

        {/* ---- the superseded holder's late commit ---- */}
        <Token
          from={beat.late}
          travel={beat.lateTravel}
          x0={LAUNCH_X}
          y0={LANE.B + CHIP_MID}
          x1={WALL_L - 22}
          y1={RUNG_MID[0]}
          label={`commit · fence ${R.fenced.fence}`}
          fate="bounce"
          vanishAt={lateImpact + 13}
        />
        <Impact at={lateImpact} x={WALL_L} y={RUNG_MID[0]} />
        <RefusalCard
          from={lateImpact + 6}
          x={theme.layout.marginX}
          y={LANE.B + 100}
          kind={R.fencedCard.kind}
          detail={R.fencedCard.detail}
          detail2={R.fencedCard.detail2}
        />

        {/* ---- the stealer commits at the highest fence ---- */}
        <Token
          from={beat.commit}
          travel={beat.commitTravel}
          x0={1620}
          y0={LANE.C + CHIP_MID}
          x1={WALL_R + 55}
          y1={OUTCOME.y + OUTCOME.h / 2}
          label="commit"
          fate="land"
          // Gone before the outcome block lights: exactly one glow per frame.
          vanishAt={commitLand - 6}
        />

        <CopyLine
          copy={COPY[0]}
          from={beat.copy1}
          until={beat.copy1End}
          x={theme.layout.marginX}
          y={772}
          width={1120}
        />
        <CopyLine
          copy={COPY[1]}
          from={beat.copy2}
          until={beat.copy2End}
          x={theme.layout.marginX}
          y={772}
          width={1120}
        />
        <CopyLine
          copy={COPY[2]}
          from={beat.copy3}
          until={durationInFrames + 60}
          x={theme.layout.marginX}
          y={772}
          width={1120}
        />
      </AbsoluteFill>
    </Stage>
  );
};
