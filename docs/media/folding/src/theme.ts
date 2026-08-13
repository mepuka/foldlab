// The single source of truth for these clips: colors, easings, springs, type.
// Nothing below inlines a hex value or an easing curve.
//
// Three colors do all the work. The dark ground is the substrate; the hero
// violet marks the lawful path — the chain, the fold, the answer — and is the
// only thing that ever glows; the amber marks what the walled domain will not
// admit, in clip one as a forgiven no-op and in clip three as a typed refusal.
// Everything else is neutral, so a frame never has two things competing to be
// the thing you look at.
import { Easing } from "remotion";

export const theme = {
  colors: {
    bg: "#08090E",
    bgAlt: "#101320",
    surface: "rgba(255,255,255,0.035)",
    line: "rgba(255,255,255,0.10)",
    lineStrong: "rgba(255,255,255,0.20)",
    primary: "#7C6CFF",
    primarySoft: "rgba(124,108,255,0.42)",
    primaryDim: "rgba(124,108,255,0.16)",
    refusal: "#F5A524",
    refusalDim: "rgba(245,165,36,0.14)",
    text: "#F2F3F7",
    textDim: "#9AA1B4",
    textFaint: "#5C6377",
    glow: "rgba(124,108,255,0.45)",
  },
  fonts: {
    display: "'Space Grotesk', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  // Linear is forbidden. Entrances use `out`, sustained moves `inOut`, exits `in`.
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
  },
  size: { width: 1920, height: 1080, fps: 30 },
} as const;
