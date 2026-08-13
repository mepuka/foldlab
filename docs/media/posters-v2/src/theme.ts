// Colour and size for a poster that is a PICTURE, not a readout.
//
// The palette is the family palette the sibling clips already use: a near-black
// ground; violet marks the lawful, kept path and is the only thing that glows;
// amber marks the event a walled domain declines to admit — informative, warm,
// never error-red.
//
// The v1 poster failed twice for the same underlying reason. Round one was
// illegible at display size; round two was legible and meaningless — a table of
// hashes that only speaks to someone who already knows the system. So two laws
// govern this file:
//
//   DESIGN FOR THE DISPLAY SIZE. A poster is authored on 1600x900 and read at
//   about 900px wide, so every canvas pixel is worth 0.5625 display pixels.
//   Nothing is authored below `minLegible`.
//
//   WORDS ARE A CAPTION, NOT THE CONTENT. There is one headline, one motto and
//   at most five short labels. If the drawing needs a sixth label, the drawing
//   is wrong. There is no mono face here at all, because nothing on this poster
//   is a machine value.
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
    bgLift: "#0C0E16",

    // THE hero colour — the lawful path: what is kept and what is built.
    primary: "#7C6CFF",
    primaryEdge: "rgba(124,108,255,0.55)",
    primaryDim: "rgba(124,108,255,0.22)",
    primaryFaint: "rgba(124,108,255,0.10)",
    primaryGhost: "rgba(124,108,255,0.05)",

    // The one event the meaning declines. Informative, not catastrophic.
    amber: "#F5A524",
    amberEdge: "rgba(245,165,36,0.60)",
    amberDim: "rgba(245,165,36,0.20)",
    amberFaint: "rgba(245,165,36,0.09)",

    text: "#F2F3F7",
    textDim: "#9AA1B4",
    textFaint: "#5F6678",
  },
  fonts: {
    display: "'Space Grotesk', system-ui, sans-serif",
  },
  // Sizes are stated in DISPLAY pixels and converted once. The floor is 14:
  // below that the 900px preview turns text into grey texture.
  type: {
    minLegible: 14,
    // The headline sets on two short lines, because the sentence is a
    // call and response and the line break is what makes that visible.
    // 36 is the largest size at which two lines plus the motto still clear
    // the top of the drawing by a full band of empty space.
    headline: 36,
    motto: 19,
    label: 15,
  },
  layout: {
    marginX: 96,
    marginY: 72,
  },
} as const;
