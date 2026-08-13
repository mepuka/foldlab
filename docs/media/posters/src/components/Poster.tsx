// The shell every poster wears, and the handful of atoms they are built from.
//
// Two rules are enforced here rather than remembered per poster:
//   * every type size comes from `theme.type`, which is authored in DISPLAY
//     pixels — the size the reader's eye actually receives — and converted once
//     by `display()`. Nothing is allowed below `theme.type.minLegible`.
//   * the copy line is set from `theme.type.copy`, the largest size in the
//     table, so it cannot lose the poster to a data column.
import React from "react";
import { AbsoluteFill } from "remotion";

import { CANVAS_HEIGHT, CANVAS_WIDTH, display, theme } from "../theme";

const px = (n: number) => `${n}px`;

/** The floor exists so a poster cannot quietly regress to unreadable. */
const legible = (sizeInDisplayPx: number): number => {
  if (sizeInDisplayPx < theme.type.minLegible) {
    throw new Error(
      `type size ${sizeInDisplayPx}px (display) is below the ${theme.type.minLegible}px legibility floor`,
    );
  }
  return display(sizeInDisplayPx);
};

export const Mono: React.FC<{
  size?: number;
  color?: string;
  weight?: number;
  track?: number;
  upper?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({
  size = theme.type.data,
  color = theme.colors.text,
  weight = 500,
  track = 0,
  upper = false,
  children,
  style,
}) => (
  <span
    style={{
      fontFamily: theme.fonts.mono,
      fontSize: px(legible(size)),
      fontWeight: weight,
      color,
      letterSpacing: px(display(track)),
      textTransform: upper ? "uppercase" : "none",
      lineHeight: 1.35,
      whiteSpace: "pre",
      ...style,
    }}
  >
    {children}
  </span>
);

export const Display: React.FC<{
  size?: number;
  color?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ size = theme.type.lead, color = theme.colors.text, children, style }) => (
  <span
    style={{
      fontFamily: theme.fonts.display,
      fontSize: px(legible(size)),
      fontWeight: 700,
      color,
      lineHeight: 1.18,
      ...style,
    }}
  >
    {children}
  </span>
);

/** A column heading: small, tracked-out, never competing with the data. */
export const Kicker: React.FC<{ color?: string; children: React.ReactNode }> = ({
  color = theme.colors.textFaint,
  children,
}) => (
  <Mono size={theme.type.kicker} color={color} weight={600} track={1.6} upper>
    {children}
  </Mono>
);

/** The only glow on a poster. Violet, and it marks the lawful answer. */
export const glowStyle: React.CSSProperties = {
  boxShadow: `0 0 ${px(display(26))} ${theme.colors.glow}, inset 0 0 ${px(display(10))} ${theme.colors.primaryFaint}`,
  borderColor: theme.colors.primary,
  background: theme.colors.primaryDim,
};

export const Card: React.FC<{
  tone?: "neutral" | "primary" | "refusal" | "glow";
  padX?: number;
  padY?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ tone = "neutral", padX = 18, padY = 12, children, style }) => {
  const tones: Record<string, React.CSSProperties> = {
    neutral: { borderColor: theme.colors.line, background: theme.colors.surface },
    primary: { borderColor: theme.colors.primarySoft, background: theme.colors.primaryFaint },
    refusal: { borderColor: theme.colors.refusal, background: theme.colors.refusalFaint },
    glow: glowStyle,
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: px(display(10)),
        border: `${px(display(1.5))} solid`,
        borderRadius: px(display(7)),
        padding: `${px(display(padY))} ${px(display(padX))}`,
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** A hairline used to separate bands. Never heavier than this. */
export const Rule: React.FC<{ color?: string; style?: React.CSSProperties }> = ({
  color = theme.colors.lineFaint,
  style,
}) => <div style={{ height: 1, background: color, width: "100%", ...style }} />;

export const Poster: React.FC<{
  /** Small top-left orientation label. */
  kicker: string;
  /** The claim. Always the largest text on the poster. */
  copy: string;
  /** Set the copy line in mono when the copy IS a program value. */
  copyMono?: boolean;
  copyColor?: string;
  /** `path:line`, verified byte-exact against the source before rendering. */
  cite: string;
  children: React.ReactNode;
}> = ({ kicker, copy, copyMono = false, copyColor = theme.colors.text, cite, children }) => (
  <AbsoluteFill
    style={{
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      // The margins are padding on this box, so they only hold if the box
      // measures itself including them.
      boxSizing: "border-box",
      background: theme.colors.bg,
      // A single soft violet wash from the lower left, so the ground is not flat
      // black; it survives downscaling where a fine grain would not.
      backgroundImage: `radial-gradient(120% 90% at 8% 104%, ${theme.colors.primaryFaint} 0%, rgba(8,9,14,0) 62%)`,
      padding: `${px(theme.layout.marginY)} ${px(theme.layout.marginX)}`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    <div style={{ display: "flex", flexDirection: "column", gap: px(display(20)) }}>
      {/* The citation rides in the header, not beside the copy: the copy line
          owns the full width of the footer and never has to shrink for it. */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <Kicker>{kicker}</Kicker>
        <Mono size={theme.type.cite} color={theme.colors.textFaint}>
          {cite}
        </Mono>
      </div>
      {children}
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: px(display(12)) }}>
      <Rule />
      <div style={{ display: "flex", paddingTop: px(display(4)) }}>
        {copyMono ? (
          <Mono
            size={theme.type.copyMono}
            color={copyColor}
            weight={700}
            style={{ whiteSpace: "pre-line" }}
          >
            {copy}
          </Mono>
        ) : (
          <Display size={theme.type.copy} color={copyColor} style={{ whiteSpace: "nowrap" }}>
            {copy}
          </Display>
        )}
      </div>
    </div>
  </AbsoluteFill>
);
