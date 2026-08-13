// The motion primitives these clips are assembled from. Every entrance moves
// at least two properties, every exit is faster than its entrance, and nothing
// interpolates without a curve and clamps at both ends.
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

type Preset = keyof typeof theme.spring;

/** Fade + rise + scale, together. A lone fade is not an entrance. */
export const Entrance: React.FC<{
  delay?: number;
  from?: number;
  preset?: Preset;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay = 0, from = 34, preset = "smooth", style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring[preset] });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [from, 0])}px) scale(${
          interpolate(p, [0, 1], [0.94, 1])
        })`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** The scene-wide exit: one fast move applied to everything at once. */
export const SceneExit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const window = [durationInFrames - 14, durationInFrames - 2];
  const y = interpolate(frame, window, [0, -46], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const o = interpolate(frame, window, [1, 0], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s = interpolate(frame, window, [1, 0.97], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        opacity: o,
        transform: `translateY(${y}px) scale(${s})`,
      }}
    >
      {children}
    </div>
  );
};

/** Word-by-word reveal for the one copy line each clip is allowed. */
export const WordReveal: React.FC<{
  text: string;
  delay?: number;
  per?: number;
  highlight?: ReadonlyArray<string>;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, per = 3, highlight = [], style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 18,
        ...style,
      }}
    >
      {text.split(" ").map((word, i) => {
        const p = spring({
          frame: frame - delay - i * per,
          fps,
          config: theme.spring.snappy,
        });
        const hot = highlight.includes(word);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              color: hot ? theme.colors.primary : theme.colors.text,
              transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

/** Micro-motion for anything that lingers. Stillness is a choice, not an accident. */
export const useBreath = (period = 24, amount = 0.012) => {
  const frame = useCurrentFrame();
  return 1 + Math.sin(frame / period) * amount;
};

export const useFloat = (period = 30, amount = 3) => {
  const frame = useCurrentFrame();
  return Math.sin(frame / period) * amount;
};

/** A curve-eased 0→1 ramp. Never used without both clamps. */
export const ramp = (
  frame: number,
  start: number,
  end: number,
  easing = theme.ease.out,
): number =>
  interpolate(frame, [start, end], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
