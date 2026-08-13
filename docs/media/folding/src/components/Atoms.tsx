// The small pieces the three scenes share: an event chip, a digest pill, a
// lane heading, a section label. Kept here so the clips read as one family.
import React from "react";
import { theme } from "../theme";

export const Label: React.FC<{
  children: React.ReactNode;
  tone?: "dim" | "faint" | "hero" | "refusal";
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, tone = "dim", size = 22, style }) => (
  <div
    style={{
      fontFamily: theme.fonts.mono,
      fontWeight: 400,
      fontSize: size,
      letterSpacing: "0.22em",
      textTransform: "uppercase",
      color: tone === "hero"
        ? theme.colors.primary
        : tone === "refusal"
        ? theme.colors.refusal
        : tone === "faint"
        ? theme.colors.textFaint
        : theme.colors.textDim,
      ...style,
    }}
  >
    {children}
  </div>
);

/** One event, drawn as its payload bytes. */
export const EventChip: React.FC<{
  payload: string;
  seq?: number;
  state?: "idle" | "hero" | "refusal";
  width?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}> = ({ payload, seq, state = "idle", width, fontSize = 27, style }) => {
  const edge = state === "hero"
    ? theme.colors.primary
    : state === "refusal"
    ? theme.colors.refusal
    : theme.colors.line;
  const fill = state === "hero"
    ? theme.colors.primaryDim
    : state === "refusal"
    ? theme.colors.refusalDim
    : theme.colors.surface;
  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "16px 22px",
        borderRadius: 14,
        border: `1.5px solid ${edge}`,
        background: fill,
        fontFamily: theme.fonts.mono,
        // No glow here: the glow belongs to the one answer a frame is about.
        ...style,
      }}
    >
      {seq === undefined ? null : (
        <div style={{ fontSize: 17, color: theme.colors.textFaint, letterSpacing: "0.08em" }}>
          seq {seq}
        </div>
      )}
      <div
        style={{
          fontSize,
          fontWeight: 600,
          color: state === "refusal" ? theme.colors.refusal : theme.colors.text,
          whiteSpace: "nowrap",
        }}
      >
        {payload}
      </div>
    </div>
  );
};

/** A digest, shortened to the prefix a viewer can actually compare. */
export const short = (digest: string, n = 12): string => `${digest.slice(0, n)}…`;

export const DigestPill: React.FC<{
  digest: string;
  caption?: string;
  hero?: boolean;
  chars?: number;
  size?: number;
  style?: React.CSSProperties;
}> = ({ digest, caption, hero = false, chars = 12, size = 30, style }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 10,
      padding: "16px 30px",
      borderRadius: 16,
      border: `1.5px solid ${hero ? theme.colors.primary : theme.colors.line}`,
      background: hero ? theme.colors.primaryDim : theme.colors.surface,
      boxShadow: hero ? `0 0 56px ${theme.colors.glow}` : "none",
      ...style,
    }}
  >
    {caption === undefined ? null : <Label tone="faint" size={17}>{caption}</Label>}
    <div
      style={{
        fontFamily: theme.fonts.mono,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "0.02em",
        color: hero ? theme.colors.primary : theme.colors.text,
      }}
    >
      {short(digest, chars)}
    </div>
  </div>
);

export const Heading: React.FC<{
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 46, style }) => (
  <div
    style={{
      fontFamily: theme.fonts.display,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "-0.03em",
      lineHeight: 1.05,
      color: theme.colors.text,
      ...style,
    }}
  >
    {children}
  </div>
);
