// Typography components. The copy lines are the stars: every one is verbatim
// text from the repository, and each carries its source path on screen so the
// claim is auditable from the frame alone.
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { theme } from "../theme";

export type Copy = {
  /** Verbatim text from the repository. Never paraphrased. */
  text: string;
  /** file:line the text was taken from. */
  source: string;
  /** Word index to lift into the hero colour, if any. */
  accent?: number;
};

/**
 * A verbatim copy line: words rise and fade in on a 3-frame stagger, hold, then
 * leave faster than they arrived.
 */
export const CopyLine: React.FC<{
  copy: Copy;
  from: number;
  until: number;
  x: number;
  y: number;
  width?: number;
}> = ({ copy, from, until, x, y, width = 1180 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const exitStart = until - Math.round(fps * 0.34);
  const exitOpacity = interpolate(frame, [exitStart, until], [1, 0], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitY = interpolate(frame, [exitStart, until], [0, -26], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const words = copy.text.split(" ");
  const sourceProgress = spring({
    frame: frame - from - words.length * 3 - 4,
    fps,
    config: theme.spring.smooth,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        opacity: exitOpacity,
        transform: `translateY(${exitY}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          columnGap: 20,
          rowGap: 6,
          fontFamily: theme.fonts.display,
          fontWeight: 700,
          fontSize: theme.size.copy,
          lineHeight: 1.06,
          letterSpacing: "-0.03em",
          color: theme.colors.text,
        }}
      >
        {words.map((word, i) => {
          const p = spring({
            frame: frame - from - i * 3,
            fps,
            config: theme.spring.snappy,
          });
          const isAccent = copy.accent === i;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: p,
                color: isAccent ? theme.colors.primary : theme.colors.text,
                transform: `translateY(${interpolate(p, [0, 1], [34, 0])}px)
                            scale(${interpolate(p, [0, 1], [0.96, 1])})`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 20,
          fontFamily: theme.fonts.mono,
          fontWeight: 400,
          fontSize: 18,
          letterSpacing: "0.04em",
          color: theme.colors.textFaint,
          opacity: sourceProgress * 0.95,
          transform: `translateX(${interpolate(sourceProgress, [0, 1], [-14, 0])}px)`,
        }}
      >
        {copy.source}
      </div>
    </div>
  );
};

/** Small mono metadata, e.g. the bucket key or the stream name. */
export const Kicker: React.FC<{
  from: number;
  /** Left edge for align "left"; right edge for align "right". */
  x: number;
  y: number;
  label: string;
  value: string;
  align?: "left" | "right";
}> = ({ from, x, y, label, value, align = "left" }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: theme.spring.smooth });
  return (
    <div
      style={{
        position: "absolute",
        ...(align === "left" ? { left: x } : { right: width - x }),
        top: y,
        display: "flex",
        flexDirection: align === "left" ? "row" : "row-reverse",
        alignItems: "center",
        gap: 14,
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [-16, 0])}px)`,
        fontFamily: theme.fonts.mono,
        fontSize: theme.size.kicker,
        letterSpacing: "0.06em",
      }}
    >
      <span
        style={{
          color: theme.colors.bg,
          background: theme.colors.textDim,
          padding: "4px 12px",
          borderRadius: 6,
          fontWeight: 600,
          fontSize: 17,
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </span>
      <span style={{ color: theme.colors.textDim }}>{value}</span>
    </div>
  );
};
