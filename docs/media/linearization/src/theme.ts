// The single source of truth for every colour, easing, spring and size in
// these clips. Components never inline a hex value or an easing curve.
//
// The palette is shared with the sibling folding clips
// (docs/media/folding/src/theme.ts) so the two sets read as one family: a dark
// ground; the hero violet marks the lawful path — the granted claim, the
// climbing fence, the landed commit, the stored append — and is the ONLY thing
// that ever glows; the amber marks what the register and the journal refuse to
// admit. A refusal here is a typed value carrying information, so amber is
// informative, never error-red. Everything else is neutral, so no frame has two
// things competing to be the thing you look at.
import { Easing } from "remotion";

export const theme = {
  colors: {
    bg: "#08090E",
    bgAlt: "#101320",
    surface: "rgba(255,255,255,0.035)",
    line: "rgba(255,255,255,0.10)",
    lineFaint: "rgba(255,255,255,0.045)",

    // THE hero colour — the lawful path. The only glow in any frame.
    primary: "#7C6CFF",
    primarySoft: "rgba(124,108,255,0.42)",
    primaryDim: "rgba(124,108,255,0.16)",
    glow: "rgba(124,108,255,0.45)",

    // Refusals: informative, not catastrophic.
    refusal: "#F5A524",
    refusalDim: "rgba(245,165,36,0.14)",

    text: "#F2F3F7",
    textDim: "#9AA1B4",
    textFaint: "#5C6377",
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
    // A refused token bounces off the wall and settles.
    bounce: { damping: 9, stiffness: 210, mass: 0.8 },
  },
  size: {
    width: 1920,
    height: 1080,
    fps: 30,
    copy: 62,
    kicker: 22,
    label: 26,
    data: 24,
    dataSmall: 19,
    fence: 34,
  },
  layout: {
    marginX: 132,
    marginY: 96,
  },
  // An element that has been consumed or superseded stays legible at this
  // opacity; below ~0.6 it reads as muddy rather than spent.
  idleOpacity: 0.62,
} as const;
