// The single source of truth for every colour and size on the five posters.
// Components never inline a hex value.
//
// The palette is the one the sibling clips already use
// (docs/media/folding/src/theme.ts, docs/media/linearization/src/theme.ts) so
// all foldlab media reads as one family: a dark ground; the hero violet marks
// the lawful path — the committed chain, the shared answer, the landed commit,
// the stored append — and is the ONLY thing that ever glows; the amber marks
// what a walled domain refuses to admit. A refusal is a typed value carrying
// information, so amber is informative, never error-red.
//
// SIZES ARE THE POINT OF THIS FILE. A poster is authored on a 1600x900 canvas
// and read at roughly 900px wide — a GitHub README column — so every canvas
// pixel is worth 0.5625 display pixels. The previous animated cut was authored
// at 1920x1080 with dense mono data and was illegible once downscaled. The law
// that replaced it: DESIGN FOR THE DISPLAY SIZE, NOT THE CANVAS. Nothing here
// is smaller than `minLegible`, which is the canvas size of 14 display pixels.
export const DISPLAY_WIDTH = 900;
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 900;

/** Canvas px per display px. Multiply a display size by this to author it. */
export const SCALE = CANVAS_WIDTH / DISPLAY_WIDTH; // 1.777…

/** Author a size in display pixels; get canvas pixels. */
export const display = (px: number): number => Math.round(px * SCALE);

export const theme = {
  colors: {
    bg: "#08090E",
    bgAlt: "#101320",
    surface: "rgba(255,255,255,0.035)",
    surfaceStrong: "rgba(255,255,255,0.06)",
    line: "rgba(255,255,255,0.10)",
    lineFaint: "rgba(255,255,255,0.05)",
    lineStrong: "rgba(255,255,255,0.20)",

    // THE hero colour — the lawful path. The only glow on any poster.
    primary: "#7C6CFF",
    primarySoft: "rgba(124,108,255,0.42)",
    primaryDim: "rgba(124,108,255,0.16)",
    primaryFaint: "rgba(124,108,255,0.08)",
    glow: "rgba(124,108,255,0.45)",

    // Refusals: informative, not catastrophic.
    refusal: "#F5A524",
    refusalDim: "rgba(245,165,36,0.14)",
    refusalFaint: "rgba(245,165,36,0.07)",

    text: "#F2F3F7",
    textDim: "#9AA1B4",
    textFaint: "#6B7285",
  },
  fonts: {
    display: "'Space Grotesk', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
  },
  // Every size below is stated in DISPLAY pixels and converted once. The floor
  // is 14: below that the 900px preview turns to grey texture.
  type: {
    minLegible: 14,
    // The copy line is always the largest text on the poster. 33 is the size at
    // which the longest of the five lines — "the answer does not depend on
    // where it was cut", 45 characters — still sets on ONE line across the 792
    // display px of content. A wrapped copy line reads as two thoughts.
    copy: 33,
    copyMono: 26, // a copy line that is itself a program value, set in mono
    figure: 26, // a headline number or pair inside the diagram
    lead: 21,
    data: 17,
    dataStrong: 19,
    label: 14.5,
    kicker: 14.5,
    cite: 14,
  },
  layout: {
    // 5% of 1600 is 80 and of 900 is 45; both margins clear that with room.
    // Content area: 1408 x 780 canvas, i.e. 792 x 439 display pixels. Every
    // poster's layout arithmetic is done in those display numbers.
    marginX: 96,
    marginY: 60,
  },
} as const;

/** Digests are shown at 8 hex characters and an ellipsis. Never more. */
export const short = (digest: string): string => `${digest.slice(0, 8)}…`;
