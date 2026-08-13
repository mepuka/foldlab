// The words, exactly as the flagship sets them.
//
// The flagship poster inlines these runs. The siblings share them instead,
// because a family that drifts by two pixels of letter-spacing stops being a
// family. Nothing here chooses a size: every size comes from the theme, which
// states it in DISPLAY pixels and converts once.
//
// Every sibling can be rendered wordless. That is not a stylistic variant, it
// is the instrument the flagship was judged with: cover the words and see
// whether the picture still tells the story. So the text lives behind one
// switch rather than being scattered through each composition.
import React from "react";

import { CANVAS_WIDTH, display, theme } from "../theme";

const c = theme.colors;
const t = theme.type;

/** A short caption on the drawing. At most five per poster; a sixth means the drawing is wrong. */
export const Label: React.FC<{
  x: number;
  y: number;
  anchor?: "start" | "middle" | "end";
  children: React.ReactNode;
}> = ({ x, y, anchor = "start", children }) => (
  <text
    x={x}
    y={y}
    textAnchor={anchor}
    fill={c.textDim}
    fontFamily={theme.fonts.display}
    fontWeight={500}
    fontSize={display(t.label)}
    letterSpacing={0.4}
  >
    {children}
  </text>
);

/** Plain civilian words. One sentence, broken where the sense breaks. */
export const Headline: React.FC<{ y: number; children: string }> = ({ y, children }) => (
  <text
    x={theme.layout.marginX}
    y={y}
    fill={c.text}
    fontFamily={theme.fonts.display}
    fontWeight={700}
    fontSize={display(t.headline)}
    letterSpacing={-1}
  >
    {children}
  </text>
);

/** The repo's own sentence, reproduced byte for byte, on the footer baseline. */
export const Motto: React.FC<{ y: number; children: string }> = ({ y, children }) => (
  <text
    x={theme.layout.marginX}
    y={y}
    fill={c.textDim}
    fontFamily={theme.fonts.display}
    fontWeight={500}
    fontSize={display(t.motto)}
    letterSpacing={0.6}
  >
    {children}
  </text>
);

export const Wordmark: React.FC = () => (
  <text
    x={CANVAS_WIDTH - theme.layout.marginX}
    y={132}
    textAnchor="end"
    fill={c.textFaint}
    fontFamily={theme.fonts.display}
    fontWeight={500}
    fontSize={display(t.minLegible)}
    letterSpacing={2.6}
  >
    FOLDLAB
  </text>
);
