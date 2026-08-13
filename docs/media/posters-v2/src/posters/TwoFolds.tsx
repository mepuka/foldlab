// Two folds, drawn as a picture instead of tabulated as a readout.
//
// The idea in civilian terms: a stream of events arrives; one path stamps every
// one of them into a permanent sealed record, in order, including the one that
// makes no sense; the other path admits only the ones that mean something and
// builds the current picture out of those. The broken one hops over the
// structure without touching it and keeps going — and a dotted line ties it
// back up to its cell in the record, because it was never lost, only skipped.
//
// Nothing on this canvas is a value. There are no digests, no sequence numbers,
// no counts, so there is nothing here that needs a provenance trace. The five
// shapes and the position of the broken one match the shape of the committed
// fixture (five events, the fourth declined) because the drawing should not
// contradict the thing it depicts — but no number from it is rendered.
//
// The composition is a fan: the stream enters left on the line that bisects the
// two destinations, so the fork throws one path up and one path down by equal
// amounts. The headline holds the top-left corner and the motto holds the
// bottom-left, which frames the drawing and stops the left half from reading as
// an accident. One vertical — the column through the declined event's cell, its
// hop, and the structure it hops over — is where the whole idea concentrates.
import React from "react";

import { BrokenChip, SoundChip } from "../components/Glyphs";
import { CANVAS_HEIGHT, CANVAS_WIDTH, display, theme } from "../theme";

const c = theme.colors;
const t = theme.type;

// ---------------------------------------------------------------------------
// The layout is one composition, so its numbers live together rather than being
// scattered through the markup. Everything is canvas pixels on 1600x900.
// ---------------------------------------------------------------------------

const RAIL_Y = 372; // centre line of the sealed record
const RAIL_H = 88;
const CELL_W = 152;
const CELL_PITCH = 182;
const RAIL_X0 = 600;
const CELLS = 5;
const DECLINED = 3; // 0-based: the fourth of five

const cellCentre = (i: number): number => RAIL_X0 + i * CELL_PITCH + CELL_W / 2;

/** The vertical the whole idea hangs from: one cell, one hop, one dotted tie. */
const AXIS_X = cellCentre(DECLINED);

const PLINTH_Y = 796; // the ground the current picture stands on
const BLOCK = 82;
// The blocks touch. A stack with air between its pieces reads as four objects
// that happen to be near each other; a stack with none reads as one thing that
// was built.
const BASE_Y = PLINTH_Y - 8 - BLOCK / 2; // centre of the base row
const TOP_Y = BASE_Y - BLOCK; // centre of the block on top
const STRUCTURE_TOP = TOP_Y - BLOCK / 2;

const APEX_Y = 540; // where the declined event is caught, mid-hop

// The stream enters on the line that bisects rail and structure, so the fork is
// even-handed: neither path looks like the afterthought.
const LANE_Y = Math.round((RAIL_Y + (STRUCTURE_TOP + PLINTH_Y) / 2) / 2);
const FORK_X = 520;

const ENTRY_CHIP = 58;
const entryCentre = (i: number): number => 128 + i * 76;

// One baseline carries the motto on the left and the structure's caption on the
// right. Two runs of type at the same height read as a designed footer; two runs
// forty pixels apart read as a collision that nobody caught.
const FOOTER_Y = 852;

// ---------------------------------------------------------------------------

const Label: React.FC<{
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

const Headline: React.FC<{ y: number; children: string }> = ({ y, children }) => (
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

export const TwoFolds: React.FC = () => (
  <svg
    width={CANVAS_WIDTH}
    height={CANVAS_HEIGHT}
    viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* The stream fades in from off-canvas: events were arriving before this. */}
      <linearGradient id="lane" x1="0" x2="1">
        <stop offset="0" stopColor={c.primary} stopOpacity={0} />
        <stop offset="0.3" stopColor={c.primary} stopOpacity={0.5} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0.9} />
      </linearGradient>
      {/* And the declined one keeps going after the frame ends. */}
      <linearGradient id="hop" x1="0" x2="1">
        <stop offset="0" stopColor={c.amber} stopOpacity={0.85} />
        <stop offset="0.7" stopColor={c.amber} stopOpacity={0.85} />
        <stop offset="1" stopColor={c.amber} stopOpacity={0} />
      </linearGradient>
      <radialGradient id="violetWash">
        <stop offset="0" stopColor={c.primary} stopOpacity={0.15} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0} />
      </radialGradient>
      <radialGradient id="amberWash">
        <stop offset="0" stopColor={c.amber} stopOpacity={0.12} />
        <stop offset="1" stopColor={c.amber} stopOpacity={0} />
      </radialGradient>
      <radialGradient id="footing">
        <stop offset="0" stopColor={c.primary} stopOpacity={0.3} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0} />
      </radialGradient>
      {/* The hopping event rides its own trajectory, so the trajectory has to
          stop at the shape and resume past it — a dashed line running straight
          through the middle of the thing it carries reads as two overlaid
          drawings rather than one moving object. */}
      <mask id="apexGap">
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="white" />
        <circle cx={AXIS_X} cy={APEX_Y} r={46} fill="black" />
      </mask>
      <filter id="glow" x="-30%" y="-70%" width="160%" height="240%">
        <feGaussianBlur stdDeviation="12" result="b" />
        <feColorMatrix
          in="b"
          type="matrix"
          values="0 0 0 0 0.486  0 0 0 0 0.424  0 0 0 0 1  0 0 0 0.42 0"
        />
      </filter>
    </defs>

    <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={c.bg} />
    <ellipse cx={1050} cy={RAIL_Y} rx={760} ry={300} fill="url(#violetWash)" />
    <ellipse cx={AXIS_X} cy={APEX_Y + 60} rx={380} ry={260} fill="url(#amberWash)" />

    {/* ---------------------------------------------------------------- words */}
    <Headline y={140}>Nothing is lost.</Headline>
    <Headline y={208}>Not everything counts.</Headline>
    <text
      x={theme.layout.marginX}
      y={FOOTER_Y}
      fill={c.textDim}
      fontFamily={theme.fonts.display}
      fontWeight={500}
      fontSize={display(t.motto)}
      letterSpacing={0.6}
    >
      the chain remembers what the fold forgives
    </text>
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

    {/* The record's housing is laid down first so the ribbon that feeds it can
        be drawn running INTO it. Drawn the other way round, the translucent
        housing washes the ribbon out exactly where the connection has to read. */}
    <rect
      x={RAIL_X0 - 24}
      y={RAIL_Y - RAIL_H / 2 - 22}
      width={(CELLS - 1) * CELL_PITCH + CELL_W + 48}
      height={RAIL_H + 44}
      rx={28}
      fill={c.primary}
      filter="url(#glow)"
    />
    <rect
      x={RAIL_X0 - 24}
      y={RAIL_Y - RAIL_H / 2 - 22}
      width={(CELLS - 1) * CELL_PITCH + CELL_W + 48}
      height={RAIL_H + 44}
      rx={28}
      fill={c.primaryGhost}
      stroke={c.primaryDim}
      strokeWidth={2}
    />

    {/* ---------------------------------------------------- the two ribbons */}
    <path
      d={`M ${FORK_X + 12} ${LANE_Y - 14} C ${FORK_X + 64} ${LANE_Y - 24} ${FORK_X + 70} ${RAIL_Y} ${RAIL_X0} ${RAIL_Y}`}
      fill="none"
      stroke={c.primary}
      strokeWidth={7}
      strokeOpacity={0.85}
      strokeLinecap="round"
    />
    <path
      d={`M ${FORK_X + 12} ${LANE_Y + 14} C ${FORK_X + 74} ${LANE_Y + 26} ${FORK_X + 92} ${PLINTH_Y - 8} ${FORK_X + 190} ${PLINTH_Y}`}
      fill="none"
      stroke={c.primary}
      strokeWidth={7}
      strokeOpacity={0.85}
      strokeLinecap="round"
    />
    <line
      x1={FORK_X + 184}
      y1={PLINTH_Y}
      x2={AXIS_X + 240}
      y2={PLINTH_Y}
      stroke={c.primary}
      strokeWidth={7}
      strokeOpacity={0.85}
      strokeLinecap="round"
    />

    {/* ------------------------------------------------------- the stream in */}
    <line x1={0} y1={LANE_Y} x2={FORK_X - 30} y2={LANE_Y} stroke="url(#lane)" strokeWidth={5} />
    {Array.from({ length: CELLS }, (_, i) =>
      i === DECLINED ? (
        <BrokenChip key={i} x={entryCentre(i)} y={LANE_Y} size={ENTRY_CHIP} />
      ) : (
        <SoundChip key={i} x={entryCentre(i)} y={LANE_Y} size={ENTRY_CHIP} />
      ),
    )}
    <line
      x1={entryCentre(DECLINED)}
      y1={LANE_Y - 40}
      x2={entryCentre(DECLINED)}
      y2={LANE_Y - 62}
      stroke={c.amber}
      strokeOpacity={0.8}
      strokeWidth={2.5}
    />
    <Label x={entryCentre(DECLINED)} y={LANE_Y - 76} anchor="middle">
      <tspan fill={c.amber}>one makes no sense</tspan>
    </Label>

    {/* ------------------------------------------------------------ the fork */}
    <path
      d={`M ${FORK_X} ${LANE_Y - 32} L ${FORK_X + 29} ${LANE_Y} L ${FORK_X} ${LANE_Y + 32} L ${
        FORK_X - 29
      } ${LANE_Y} Z`}
      fill={c.primaryDim}
      stroke={c.primary}
      strokeWidth={3}
    />

    {/* --------------------------------------------------- the sealed record */}
    {Array.from({ length: CELLS - 1 }, (_, i) => {
      const x = RAIL_X0 + i * CELL_PITCH + CELL_W;
      return (
        <g key={`link-${i}`}>
          <rect x={x} y={RAIL_Y - 6} width={CELL_PITCH - CELL_W} height={12} fill={c.primaryDim} />
          <circle cx={x + (CELL_PITCH - CELL_W) / 2} cy={RAIL_Y} r={9} fill={c.primary} />
        </g>
      );
    })}
    {Array.from({ length: CELLS }, (_, i) => {
      const off = i === DECLINED;
      const x = RAIL_X0 + i * CELL_PITCH;
      return (
        <g key={`cell-${i}`}>
          <rect
            x={x}
            y={RAIL_Y - RAIL_H / 2}
            width={CELL_W}
            height={RAIL_H}
            rx={16}
            fill={c.bgLift}
            stroke={off ? c.amberEdge : c.primaryEdge}
            strokeWidth={2.5}
          />
          {off ? (
            <BrokenChip x={x + CELL_W / 2} y={RAIL_Y} size={48} />
          ) : (
            <SoundChip x={x + CELL_W / 2} y={RAIL_Y} size={48} />
          )}
        </g>
      );
    })}
    <Label x={RAIL_X0 - 24} y={RAIL_Y - RAIL_H / 2 - 46}>
      <tspan fill={c.primary}>kept</tspan>
      <tspan> — everything that arrived, in order</tspan>
    </Label>

    {/* Two still in transit on the ground, drawn in the outline the stream uses
        rather than the solid the stack uses. Without them the stack is just a
        stack that happens to sit near a line; with them the line visibly
        delivers, and the one that hops has something to hop away FROM. */}
    <SoundChip x={866} y={PLINTH_Y - 33} size={58} />
    <SoundChip x={956} y={PLINTH_Y - 33} size={58} />

    {/* -------------------------------------------------- the current picture */}
    <ellipse cx={AXIS_X} cy={PLINTH_Y} rx={250} ry={80} fill="url(#footing)" />
    <rect
      x={AXIS_X - 1.9 * BLOCK}
      y={PLINTH_Y - 6}
      width={3.8 * BLOCK}
      height={16}
      rx={8}
      fill={c.primary}
      opacity={0.85}
    />
    {[-1, 0, 1].map((k) => (
      <SoundChip key={k} x={AXIS_X + k * BLOCK} y={BASE_Y} size={BLOCK} solid />
    ))}
    <SoundChip x={AXIS_X} y={TOP_Y} size={BLOCK} solid />
    <Label x={AXIS_X} y={FOOTER_Y} anchor="middle">
      <tspan fill={c.primary}>counted</tspan>
      <tspan> — only what makes sense</tspan>
    </Label>

    {/* ------------------------------------------- the one that hops the wall */}
    <path
      d={`M 1010 ${PLINTH_Y - 8} C 1092 ${PLINTH_Y - 82} 1130 ${APEX_Y + 30} ${AXIS_X} ${APEX_Y}
          C ${AXIS_X + 102} ${APEX_Y - 4} 1372 ${APEX_Y + 92} 1452 ${APEX_Y + 158}
          L 1580 ${APEX_Y + 238}`}
      fill="none"
      stroke="url(#hop)"
      strokeWidth={4.5}
      strokeDasharray="15 13"
      strokeLinecap="round"
      mask="url(#apexGap)"
    />
    <BrokenChip x={AXIS_X} y={APEX_Y} size={62} />

    {/* ---------------------------------------- the tie between the two fates */}
    <line
      x1={AXIS_X}
      y1={RAIL_Y + RAIL_H / 2 + 12}
      x2={AXIS_X}
      y2={APEX_Y - 42}
      stroke={c.amber}
      strokeWidth={3}
      strokeOpacity={0.9}
      strokeDasharray="7 9"
      strokeLinecap="round"
    />
    <Label x={AXIS_X - 28} y={468} anchor="end">
      <tspan fill={c.amber}>skipped, never lost</tspan>
    </Label>
  </svg>
);
