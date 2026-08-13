// The register linearizes, drawn as a picture instead of tabulated as a readout.
//
// The idea in civilian terms: two equally good claimants go for one place. One
// of them gets there, takes it, and the bar comes up behind it. The other one
// arrives a moment later, finds the bar above its head, bounces off the
// underside and drops away. The bar never comes back down — that is the whole
// safety property, and it is why the two shapes are drawn IDENTICAL. Nothing
// was wrong with the loser. It was just late.
//
// Nothing on this canvas is a value. There are no fence numbers and no
// revisions. The old height is drawn as a dashed ghost with an arrow up to the
// live bar, which is the only way to show a monotone quantity in a still frame
// without printing two numbers and asking the reader to compare them.
//
// The composition hangs off one horizontal. Everything admitted is above the
// bar; everything refused is below it. The two ratchet posts exist so the bar
// reads as a mechanism with a direction rather than as a line someone drew.
import React from "react";

import { SoundChip } from "../components/Glyphs";
import { ArrowHead, Burst } from "../components/Marks";
import { Headline, Label, Motto, Wordmark } from "../components/Type";
import { CANVAS_HEIGHT, CANVAS_WIDTH, theme } from "../theme";

const c = theme.colors;

// ---------------------------------------------------------------------------

// The bar runs nearly the full width of the frame. A short bar reads as an
// object in a scene; a bar that leaves on both sides reads as a condition of
// the world, which is what a fence height is.
const BAR = { x0: 240, x1: 1400, y0: 488, y1: 512 };
/** Two heights it has already left behind. Three rungs make a ratchet. */
const GHOSTS = [604, 700];
const POST_X = [268, 1372];
const POST = { y0: 440, y1: 762, w: 26 };

const CELL = { x0: 900, x1: 1080, y1: BAR.y0 };
const CELL_H = 100;
const CELL_CX = (CELL.x0 + CELL.x1) / 2;
const CELL_CY = CELL.y1 - CELL_H / 2;

/** Where the late claimant meets the underside of the bar: right below the slot. */
const STRIKE = { x: 990, y: BAR.y1 + 10 };
/**
 * Caught mid-fall, on the curve, so the fall reads as motion and not as rest —
 * and squarely BETWEEN the two ghost bars, because a shape resting on one of
 * them reads as a shape that landed on the old fence.
 */
const FALLING = { x: 1101, y: 660 };

const CLIMB_X = 380;
const FOOTER_Y = 852;

export const RegisterLinearizes: React.FC<{ wordless?: boolean }> = ({ wordless = false }) => (
  <svg
    width={CANVAS_WIDTH}
    height={CANVAS_HEIGHT}
    viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="rl-lane" x1="0" x2="1">
        <stop offset="0" stopColor={c.primary} stopOpacity={0} />
        <stop offset="0.35" stopColor={c.primary} stopOpacity={0.55} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0.9} />
      </linearGradient>
      {/* The loser keeps falling after the frame ends. */}
      <linearGradient id="rl-fall" x1="0" x2="0.6" y1="0" y2="1">
        <stop offset="0" stopColor={c.amber} stopOpacity={0.9} />
        <stop offset="0.65" stopColor={c.amber} stopOpacity={0.85} />
        <stop offset="1" stopColor={c.amber} stopOpacity={0} />
      </linearGradient>
      <radialGradient id="rl-violetWash">
        <stop offset="0" stopColor={c.primary} stopOpacity={0.16} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0} />
      </radialGradient>
      <radialGradient id="rl-amberWash">
        <stop offset="0" stopColor={c.amber} stopOpacity={0.12} />
        <stop offset="1" stopColor={c.amber} stopOpacity={0} />
      </radialGradient>
      {/* The falling shape rides its own trajectory, so the trajectory stops at
          the shape and resumes past it. */}
      <mask id="rl-fallGap">
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="white" />
        <circle cx={FALLING.x} cy={FALLING.y} r={50} fill="black" />
      </mask>
      <filter id="rl-glow" x="-20%" y="-400%" width="140%" height="900%">
        <feGaussianBlur stdDeviation="13" result="b" />
        <feColorMatrix
          in="b"
          type="matrix"
          values="0 0 0 0 0.486  0 0 0 0 0.424  0 0 0 0 1  0 0 0 0.5 0"
        />
      </filter>
    </defs>

    <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={c.bg} />
    <ellipse cx={CELL_CX} cy={BAR.y0} rx={760} ry={290} fill="url(#rl-violetWash)" />
    <ellipse cx={FALLING.x} cy={FALLING.y + 40} rx={340} ry={250} fill="url(#rl-amberWash)" />

    {/* ---------------------------------------------------------------- words */}
    {!wordless && (
      <>
        <Headline y={140}>One gets in.</Headline>
        <Headline y={208}>The bar rises behind it.</Headline>
        <Motto y={FOOTER_Y}>no commit lands below the highest fence</Motto>
        <Wordmark />
      </>
    )}

    {/* ----------------------------------------------------- the ratchet track */}
    {POST_X.map((x) => (
      <g key={x}>
        <rect
          x={x - POST.w / 2}
          y={POST.y0}
          width={POST.w}
          height={POST.y1 - POST.y0}
          rx={7}
          fill={c.primaryFaint}
          stroke={c.primaryEdge}
          strokeWidth={2}
        />
        {[500, ...GHOSTS.map((y) => y + 8)].map((y) => (
          <line
            key={y}
            x1={x - POST.w / 2 - 11}
            y1={y}
            x2={x + POST.w / 2 + 11}
            y2={y}
            stroke={y === 500 ? c.primary : c.primaryDim}
            strokeWidth={y === 500 ? 4 : 3}
            strokeLinecap="round"
          />
        ))}
      </g>
    ))}

    {/* Where the bar used to be, twice over. Drawn hollow and fading downward:
        they are memories, not barriers, and the older one is the fainter. */}
    {GHOSTS.map((y, i) => (
      <rect
        key={y}
        x={BAR.x0}
        y={y}
        width={BAR.x1 - BAR.x0}
        height={16}
        rx={8}
        fill="none"
        stroke={i === 0 ? c.primaryDim : c.primaryFaint}
        strokeWidth={2.5}
        strokeDasharray="14 12"
      />
    ))}
    <line
      x1={CLIMB_X}
      y1={GHOSTS[1] + 8}
      x2={CLIMB_X}
      y2={BAR.y1 + 20}
      stroke={c.primary}
      strokeWidth={4}
      strokeOpacity={0.85}
      strokeLinecap="round"
    />
    <ArrowHead x={CLIMB_X} y={BAR.y1 + 20} angle={-90} color={c.primary} size={14} />

    {/* --------------------------------------- the winner, arriving from above */}
    <path
      d={`M 0 252 C 280 250 600 320 ${CELL.x0 - 4} 426`}
      fill="none"
      stroke="url(#rl-lane)"
      strokeWidth={6}
      strokeLinecap="round"
    />

    {/* ---------------------------------------- the late one, from underneath */}
    {/* The approach stays above the footer baseline the whole way across, so
        the motto is read as type rather than as something the line crosses. */}
    <path
      d={`M 0 756 C 300 786 640 780 ${STRIKE.x} ${STRIKE.y + 14}`}
      fill="none"
      stroke="url(#rl-lane)"
      strokeWidth={6}
      strokeLinecap="round"
    />
    <path
      d={`M ${STRIKE.x} ${STRIKE.y} C 1050 574 1110 654 1146 748 L 1210 890`}
      fill="none"
      stroke="url(#rl-fall)"
      strokeWidth={4.5}
      strokeDasharray="15 13"
      strokeLinecap="round"
      mask="url(#rl-fallGap)"
    />
    <SoundChip x={FALLING.x} y={FALLING.y} size={68} />

    {/* ------------------------------------------------------------- the bar */}
    <rect
      x={BAR.x0}
      y={BAR.y0}
      width={BAR.x1 - BAR.x0}
      height={BAR.y1 - BAR.y0}
      rx={12}
      fill={c.primary}
      filter="url(#rl-glow)"
    />
    <rect
      x={BAR.x0}
      y={BAR.y0}
      width={BAR.x1 - BAR.x0}
      height={BAR.y1 - BAR.y0}
      rx={12}
      fill={c.primary}
    />
    <Burst x={STRIKE.x} y={STRIKE.y + 2} angle={90} color={c.amber} size={24} />

    {/* --------------------------------------------- the slot, taken and sealed */}
    <rect
      x={CELL.x0}
      y={CELL.y1 - CELL_H}
      width={CELL.x1 - CELL.x0}
      height={CELL_H}
      rx={16}
      fill={c.bgLift}
      stroke={c.primaryEdge}
      strokeWidth={2.5}
    />
    <SoundChip x={CELL_CX} y={CELL_CY} size={72} solid />

    {/* --------------------------------------------------------------- labels */}
    {!wordless && (
      <>
        <Label x={theme.layout.marginX} y={412}>
          two claim one slot
        </Label>
        <Label x={CELL_CX} y={CELL.y1 - CELL_H - 26} anchor="middle">
          <tspan fill={c.primary}>one lands and seals</tspan>
        </Label>
        <Label x={CLIMB_X + 30} y={570}>
          <tspan fill={c.primary}>the bar only climbs</tspan>
        </Label>
        <Label x={1132} y={570}>
          <tspan fill={c.amber}>the late one bounces</tspan>
        </Label>
      </>
    )}
  </svg>
);
