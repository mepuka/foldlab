// The journal linearizes, drawn as a picture instead of tabulated as a readout.
//
// The idea in civilian terms: a record is being filled in, one cell at a time,
// and two things go for the same cell at once. One of them gets it. The other
// is not dropped and is not left guessing — it is told which cell it lost, so
// it takes the next one and seals there. Both are in the record. The order
// between them was settled, not negotiated.
//
// This is the sibling of the flagship, so it reuses the flagship's strip
// wholesale: the same cell size, the same pitch, the same links between cells,
// the same housing, the same glow. The strip is a brand asset, not a drawing
// decision to be re-made per poster.
//
// Nothing on this canvas is a value. There are no positions, no digests and no
// counts. The one empty cell on the right end carries "still growing" without
// spending a label on it.
//
// The composition puts the contest ABOVE the strip and the commentary BELOW it,
// so the little hop from the lost cell to the next one has clear air around it
// — that hop is the whole poster and it is four hundred pixels wide.
import React from "react";

import { SoundChip } from "../components/Glyphs";
import { ArrowHead, Burst } from "../components/Marks";
import { Headline, Label, Motto, Wordmark } from "../components/Type";
import { CANVAS_HEIGHT, CANVAS_WIDTH, theme } from "../theme";

const c = theme.colors;

// ---------------------------------------------------------------------------
// The strip is the flagship's strip. These four numbers are copied, not chosen.
// ---------------------------------------------------------------------------

const RAIL_Y = 430;
const RAIL_H = 88;
const CELL_W = 152;
const CELL_PITCH = 182;
const RAIL_X0 = 400;

/** Five cells that are filled, and one open at the end: the record is growing. */
const SEALED = 5;
const OPEN = 1;
/** The cell both claimants went for, and therefore the cell one of them lost. */
const CONTESTED = 3;

const cellX = (i: number): number => RAIL_X0 + i * CELL_PITCH;
const cellCentre = (i: number): number => cellX(i) + CELL_W / 2;

const LOST_X = cellCentre(CONTESTED);
const NEXT_X = cellCentre(CONTESTED + 1);
const TOP_Y = RAIL_Y - RAIL_H / 2;
const BOT_Y = RAIL_Y + RAIL_H / 2;

/** Caught at the top of the hop between the lost cell and the next one. */
const REAIM = { x: 1122, y: 252 };

const FOOTER_Y = 852;

export const JournalLinearizes: React.FC<{ wordless?: boolean }> = ({ wordless = false }) => (
  <svg
    width={CANVAS_WIDTH}
    height={CANVAS_HEIGHT}
    viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="jl-laneIn" x1="0" x2="1">
        <stop offset="0" stopColor={c.primary} stopOpacity={0} />
        <stop offset="0.35" stopColor={c.primary} stopOpacity={0.55} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0.9} />
      </linearGradient>
      <radialGradient id="jl-violetWash">
        <stop offset="0" stopColor={c.primary} stopOpacity={0.15} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0} />
      </radialGradient>
      <radialGradient id="jl-amberWash">
        <stop offset="0" stopColor={c.amber} stopOpacity={0.13} />
        <stop offset="1" stopColor={c.amber} stopOpacity={0} />
      </radialGradient>
      <mask id="jl-hopGap">
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="white" />
        <circle cx={REAIM.x} cy={REAIM.y} r={44} fill="black" />
      </mask>
      <filter id="jl-glow" x="-30%" y="-70%" width="160%" height="240%">
        <feGaussianBlur stdDeviation="12" result="b" />
        <feColorMatrix
          in="b"
          type="matrix"
          values="0 0 0 0 0.486  0 0 0 0 0.424  0 0 0 0 1  0 0 0 0.42 0"
        />
      </filter>
    </defs>

    <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={c.bg} />
    <ellipse cx={950} cy={RAIL_Y} rx={760} ry={300} fill="url(#jl-violetWash)" />
    <ellipse cx={REAIM.x} cy={REAIM.y + 20} rx={330} ry={220} fill="url(#jl-amberWash)" />

    {/* ---------------------------------------------------------------- words */}
    {!wordless && (
      <>
        <Headline y={140}>One at a time.</Headline>
        <Headline y={208}>Everyone still gets in.</Headline>
        <Motto y={FOOTER_Y}>append linearizes exactly once or conflicts</Motto>
        <Wordmark />
      </>
    )}

    {/* The housing is laid before the lanes that feed it, so the lanes can be
        drawn running INTO it rather than being washed out by it. */}
    <rect
      x={RAIL_X0 - 24}
      y={TOP_Y - 22}
      width={(SEALED + OPEN - 1) * CELL_PITCH + CELL_W + 48}
      height={RAIL_H + 44}
      rx={28}
      fill={c.primary}
      filter="url(#jl-glow)"
    />
    <rect
      x={RAIL_X0 - 24}
      y={TOP_Y - 22}
      width={(SEALED + OPEN - 1) * CELL_PITCH + CELL_W + 48}
      height={RAIL_H + 44}
      rx={28}
      fill={c.primaryGhost}
      stroke={c.primaryDim}
      strokeWidth={2}
    />

    {/* ------------------------------------------------ the two claimants in */}
    {/* The loser comes in high and the winner low, so the hop away from the
        lost cell has the whole top of the frame to itself. */}
    <path
      d={`M 0 268 C 320 280 660 322 ${LOST_X - 16} ${TOP_Y - 16}`}
      fill="none"
      stroke="url(#jl-laneIn)"
      strokeWidth={6}
      strokeLinecap="round"
    />
    <path
      d={`M 0 742 C 380 762 740 706 ${cellX(CONTESTED) + 22} ${BOT_Y + 18}`}
      fill="none"
      stroke="url(#jl-laneIn)"
      strokeWidth={6}
      strokeLinecap="round"
    />
    {/* The winner is the one that actually lands, so it gets a head and the
        loser does not: only one of these two arrows resolves. */}
    <ArrowHead
      x={cellX(CONTESTED) + 34}
      y={BOT_Y + 4}
      angle={-62}
      color={c.primary}
      size={14}
    />

    {/* ------------------------------------------------------------ the strip */}
    {Array.from({ length: SEALED + OPEN - 1 }, (_, i) => {
      const x = cellX(i) + CELL_W;
      const dim = i >= SEALED - 1;
      return (
        <g key={`link-${i}`}>
          <rect
            x={x}
            y={RAIL_Y - 6}
            width={CELL_PITCH - CELL_W}
            height={12}
            fill={dim ? c.primaryFaint : c.primaryDim}
          />
          <circle
            cx={x + (CELL_PITCH - CELL_W) / 2}
            cy={RAIL_Y}
            r={9}
            fill={dim ? c.primaryDim : c.primary}
          />
        </g>
      );
    })}
    {Array.from({ length: SEALED + OPEN }, (_, i) => {
      const open = i >= SEALED;
      return (
        <g key={`cell-${i}`}>
          <rect
            x={cellX(i)}
            y={TOP_Y}
            width={CELL_W}
            height={RAIL_H}
            rx={16}
            fill={c.bgLift}
            stroke={open ? c.primaryDim : c.primaryEdge}
            strokeWidth={2.5}
            strokeDasharray={open ? "12 10" : undefined}
          />
          {!open && <SoundChip x={cellCentre(i)} y={RAIL_Y} size={48} solid />}
        </g>
      );
    })}

    {/* ------------------------------------------- lost the cell, took the next */}
    <Burst x={LOST_X - 16} y={TOP_Y - 8} angle={-100} color={c.amber} size={30} />
    <path
      d={`M ${LOST_X - 4} ${TOP_Y - 30} C ${LOST_X + 34} ${REAIM.y - 4} ${REAIM.x - 62} ${
        REAIM.y - 30
      } ${REAIM.x} ${REAIM.y}
         C ${REAIM.x + 62} ${REAIM.y + 30} ${NEXT_X + 14} ${REAIM.y + 44} ${NEXT_X} ${TOP_Y - 48}`}
      fill="none"
      stroke={c.amber}
      strokeWidth={4.5}
      strokeOpacity={0.9}
      strokeDasharray="15 13"
      strokeLinecap="round"
      mask="url(#jl-hopGap)"
    />
    <ArrowHead x={NEXT_X} y={TOP_Y - 26} angle={92} color={c.amber} size={14} />
    <SoundChip x={REAIM.x} y={REAIM.y} size={58} />

    {/* --------------------------------------------------------------- labels */}
    {!wordless && (
      <>
        <Label x={theme.layout.marginX} y={470}>
          two aim at one cell
        </Label>
        <Label x={LOST_X} y={556} anchor="middle">
          <tspan fill={c.primary}>one seals</tspan>
        </Label>
        <Label x={NEXT_X} y={648} anchor="middle">
          <tspan fill={c.primary}>the other takes the next</tspan>
        </Label>
        <Label x={LOST_X - 42} y={294} anchor="end">
          <tspan fill={c.amber}>told which cell it lost</tspan>
        </Label>
      </>
    )}

    {/* Ties from the strip down to the two captions. Drawn last so they sit on
        top of the housing wash rather than under it. */}
    {!wordless && (
      <>
        <line
          x1={LOST_X}
          y1={BOT_Y + 26}
          x2={LOST_X}
          y2={534}
          stroke={c.primary}
          strokeWidth={2.5}
          strokeOpacity={0.7}
        />
        <line
          x1={NEXT_X}
          y1={BOT_Y + 26}
          x2={NEXT_X}
          y2={626}
          stroke={c.primary}
          strokeWidth={2.5}
          strokeOpacity={0.7}
        />
      </>
    )}
  </svg>
);
