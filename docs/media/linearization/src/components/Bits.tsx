// The moving parts shared by both clips: an actor chip, a travelling operation
// token, the refusal card a bounced operation leaves behind, and the impact
// ring drawn where a refusal met the wall.
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { theme } from "../theme";

/** A participant: one racing handle or claimant. */
export const ActorChip: React.FC<{
  from: number;
  /** Left edge for align "left"; right edge for align "right". */
  x: number;
  y: number;
  id: string;
  role: string;
  align?: "left" | "right";
  dim?: boolean;
}> = ({ from, x, y, id, role, align = "left", dim = false }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.smooth });
  const float = Math.sin((frame - from) / 34) * 2.4;
  const slide = align === "left" ? -38 : 38;
  return (
    <div
      style={{
        position: "absolute",
        ...(align === "left" ? { left: x } : { right: width - x }),
        top: y,
        display: "flex",
        flexDirection: align === "left" ? "row" : "row-reverse",
        alignItems: "center",
        gap: 18,
        opacity: p * (dim ? theme.idleOpacity : 1),
        transform: `translate(${interpolate(p, [0, 1], [slide, 0])}px, ${float}px)
                    scale(${interpolate(p, [0, 1], [0.9, 1])})`,
      }}
    >
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 20,
          background: theme.colors.surface,
          border: `1.5px solid ${theme.colors.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: theme.fonts.display,
          fontWeight: 700,
          fontSize: 38,
          color: theme.colors.text,
          letterSpacing: "-0.02em",
        }}
      >
        {id}
      </div>
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: theme.size.dataSmall,
          letterSpacing: "0.07em",
          color: theme.colors.textDim,
          textAlign: align === "left" ? "left" : "right",
          whiteSpace: "pre-line",
          lineHeight: 1.45,
        }}
      >
        {role}
      </div>
    </div>
  );
};

export type TokenFate = "land" | "bounce";

/**
 * An operation in flight. A landing token docks at the wall and dissolves into
 * whatever it created; a bounced token is turned back at the wall, changes to
 * the refusal colour, and retreats.
 */
export const Token: React.FC<{
  from: number;
  travel: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  label: string;
  fate: TokenFate;
  vanishAt?: number;
}> = ({ from, travel, x0, y0, x1, y1, label, fate, vanishAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;

  const launch = spring({ frame: local, fps, config: theme.spring.snappy });
  const approach = interpolate(local, [0, travel], [0, 1], {
    easing: theme.ease.inOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // A refused token is turned back at the wall and settles short of it.
  const retreat = spring({
    frame: local - travel,
    fps,
    config: theme.spring.bounce,
  });
  const progress = fate === "bounce" ? approach - retreat * 0.45 : approach;

  const refused = fate === "bounce" && local >= travel;
  const color = refused ? theme.colors.refusal : theme.colors.primary;

  const vanish = vanishAt
    ? interpolate(frame, [vanishAt, vanishAt + 7], [1, 0], {
        easing: theme.ease.in,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  const x = x0 + (x1 - x0) * progress;
  const y = y0 + (y1 - y0) * progress;
  const squash = refused
    ? 1 - Math.max(0, 1 - Math.abs(local - travel) / 5) * 0.16
    : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${interpolate(
          launch,
          [0, 1],
          [0.55, 1],
        ) * squash})`,
        opacity: launch * vanish,
        padding: "11px 20px",
        borderRadius: 12,
        background: refused ? "transparent" : `${theme.colors.primary}1F`,
        border: `1.5px solid ${color}`,
        color,
        fontFamily: theme.fonts.mono,
        fontWeight: 600,
        fontSize: theme.size.dataSmall,
        letterSpacing: "0.09em",
        whiteSpace: "nowrap",
        boxShadow: refused ? "none" : `0 0 28px ${theme.colors.glow}`,
      }}
    >
      {label}
    </div>
  );
};

/** The ring drawn where a refusal met the wall. */
export const Impact: React.FC<{ at: number; x: number; y: number }> = ({
  at,
  x,
  y,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 22], [0, 1], {
    easing: theme.ease.out,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame < at) {
    return null;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 40,
        height: 40,
        marginLeft: -20,
        marginTop: -20,
        borderRadius: "50%",
        border: `2px solid ${theme.colors.refusal}`,
        opacity: (1 - p) * 0.85,
        transform: `scale(${interpolate(p, [0, 1], [0.3, 3.4])})`,
      }}
    />
  );
};

/**
 * A refusal is a typed value, so it is drawn as a record with a name and a
 * reason — informative, never alarming.
 */
export const RefusalCard: React.FC<{
  from: number;
  x: number;
  y: number;
  kind: string;
  detail: string;
  detail2?: string;
  align?: "left" | "right";
}> = ({ from, x, y, kind, detail, detail2, align = "left" }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.smooth });
  const float = Math.sin((frame - from) / 40) * 1.8;
  return (
    <div
      style={{
        position: "absolute",
        ...(align === "left" ? { left: x } : { right: width - x }),
        top: y,
        transform: `translateY(${
          interpolate(p, [0, 1], [18, 0]) + float
        }px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
        opacity: p,
        border: `1.5px solid ${theme.colors.refusalDim}`,
        borderLeft: align === "left" ? `4px solid ${theme.colors.refusal}` : undefined,
        borderRight: align === "right" ? `4px solid ${theme.colors.refusal}` : undefined,
        borderRadius: 12,
        background: `${theme.colors.refusal}0E`,
        padding: "13px 20px",
        fontFamily: theme.fonts.mono,
        textAlign: align,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          fontSize: theme.size.data,
          fontWeight: 600,
          color: theme.colors.refusal,
          letterSpacing: "0.03em",
        }}
      >
        {kind}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: theme.size.dataSmall,
          color: theme.colors.textDim,
          letterSpacing: "0.03em",
        }}
      >
        {detail}
      </div>
      {detail2 ? (
        <div
          style={{
            marginTop: 4,
            fontSize: theme.size.dataSmall,
            color: theme.colors.refusal,
            opacity: 0.82,
            letterSpacing: "0.03em",
          }}
        >
          {detail2}
        </div>
      ) : null}
    </div>
  );
};
