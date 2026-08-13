// The two shapes the whole poster is built from.
//
// A viewer has to tell them apart at 900px wide, from across a room, in under a
// second. Colour alone does not survive that — a small amber square and a small
// violet square are the same square. So the difference is carried three ways at
// once: hue, a piece broken clean off with daylight showing through the gap,
// and a tilt. The detached piece is what does the work; a bitten outline reads
// as a curl at low resolution, but two objects with a gap between them read as
// broken immediately.
import React from "react";

import { theme } from "../theme";

const c = theme.colors;

/** A well-formed event: upright, closed, with a solid core. */
export const SoundChip: React.FC<{
  x: number;
  y: number;
  size: number;
  /** Assembled chips sit in the built structure and read as solid, not in transit. */
  solid?: boolean;
}> = ({ x, y, size, solid = false }) => {
  const half = size / 2;
  const core = size * 0.3;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={-half}
        y={-half}
        width={size}
        height={size}
        // Assembled blocks carry a tighter corner: masonry, not cargo.
        rx={size * (solid ? 0.14 : 0.22)}
        fill={solid ? c.primaryDim : c.primaryFaint}
        stroke={c.primary}
        strokeWidth={size * 0.07}
      />
      <rect
        x={-core / 2}
        y={-core / 2}
        width={core}
        height={core}
        rx={core * 0.28}
        fill={c.primary}
        opacity={solid ? 1 : 0.8}
      />
    </g>
  );
};

/** The event that makes no sense: a corner snapped off, and tilted off true. */
export const BrokenChip: React.FC<{ x: number; y: number; size: number; tilt?: number }> = ({
  x,
  y,
  size,
  tilt = -13,
}) => {
  const h = size / 2;
  const r = size * 0.22;
  // The body keeps enough of its outline to still read as the same square the
  // sound chips are — only a corner is gone. Take more than a corner and the
  // shape stops being a broken square and becomes some other shape entirely.
  const body = [
    `M ${-h + r} ${-h}`,
    `L ${h * 0.38} ${-h}`,
    `L ${h} ${-h * 0.38}`,
    `L ${h} ${h - r}`,
    `Q ${h} ${h} ${h - r} ${h}`,
    `L ${-h + r} ${h}`,
    `Q ${-h} ${h} ${-h} ${h - r}`,
    `L ${-h} ${-h + r}`,
    `Q ${-h} ${-h} ${-h + r} ${-h}`,
    "Z",
  ].join(" ");
  // …and the piece itself, floated off the break with a gap of clear ground.
  const shard = `M ${h * 0.38} ${-h} L ${h} ${-h} L ${h} ${-h * 0.38} Z`;
  const core = size * 0.3;
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      <path
        d={body}
        fill={c.amberFaint}
        stroke={c.amber}
        strokeWidth={size * 0.07}
        strokeLinejoin="round"
      />
      {/* The same core the sound chips carry. Without it the outline reads as
          some other shape rather than as one of these, damaged — and the whole
          point is that it is one of these. */}
      <rect
        x={-core / 2}
        y={-core / 2}
        width={core}
        height={core}
        rx={core * 0.28}
        fill={c.amber}
        opacity={0.8}
      />
      <g transform={`translate(${size * 0.11} ${-size * 0.11}) rotate(18)`}>
        <path
          d={shard}
          fill={c.amberDim}
          stroke={c.amber}
          strokeWidth={size * 0.07}
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
};
