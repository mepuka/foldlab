// A refusal is a value, drawn as a picture instead of tabulated as a readout.
//
// The idea in civilian terms: a malformed thing turns up at the door and is not
// let in. What comes back is not a slammed door and not a stack trace — it is a
// small warm card that shows the exact thing that was wrong beside the exact
// thing that would work. Follow the card and you get in. The card is the point:
// it is handed to you, it is legible, and it is worth something.
//
// Nothing on this canvas is a value in the machine sense. The card carries two
// drawings, not two strings, because the moment it carries a field name it
// becomes a screenshot of an error and stops being a picture of an idea.
//
// The composition is one anticlockwise loop: in along the top, stopped at the
// wall, handed down and back onto the card, out along the bottom of the card
// and up through the one opening. The wall runs nearly the full height of the
// frame in two pieces with clear ground between them, because a solid slab with
// a bright patch painted on it reads as a slab, and the opening has to read as
// somewhere you could actually go.
import React from "react";

import { BrokenChip, SoundChip } from "../components/Glyphs";
import { ArrowHead, Burst } from "../components/Marks";
import { Headline, Label, Motto, Wordmark } from "../components/Type";
import { CANVAS_HEIGHT, CANVAS_WIDTH, theme } from "../theme";

const c = theme.colors;

// ---------------------------------------------------------------------------

// The wall runs off the top and bottom of the frame. A wall that ends inside
// the picture is a pillar, and you can walk around a pillar.
const WALL = { x0: 880, x1: 972 };
const WALL_TOP = { y0: -40, y1: 500 };
const WALL_BOTTOM = { y0: 590, y1: 940 };
/** The one way through, and the only thing on this canvas that glows. */
const WAY_IN = { y0: WALL_TOP.y1, y1: WALL_BOTTOM.y0 };
const WAY_IN_Y = (WAY_IN.y0 + WAY_IN.y1) / 2;

const ARRIVE = { x: 826, y: 300 };

const CARD = { x0: 300, x1: 760, y0: 500, y1: 772 };
const CARD_ROW_Y = 668;
const BROKE_X = 412;
const WORKS_X = 648;

const SEAL = { x0: 1150, x1: 1302 };
const SEAL_CX = (SEAL.x0 + SEAL.x1) / 2;

const FOOTER_Y = 852;

export const RefusalIsAValue: React.FC<{ wordless?: boolean }> = ({ wordless = false }) => (
  <svg
    width={CANVAS_WIDTH}
    height={CANVAS_HEIGHT}
    viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Stated in USER SPACE. A horizontal line has a bounding box of zero
          height, and a gradient in bounding-box units on a degenerate box
          paints nothing — the lane vanishes silently and the poster ships with
          its arrival missing. */}
      <linearGradient
        id="rv-lane"
        gradientUnits="userSpaceOnUse"
        x1={0}
        y1={0}
        x2={ARRIVE.x - 48}
        y2={0}
      >
        <stop offset="0" stopColor={c.amber} stopOpacity={0} />
        <stop offset="0.45" stopColor={c.amber} stopOpacity={0.55} />
        <stop offset="1" stopColor={c.amber} stopOpacity={0.9} />
      </linearGradient>
      <radialGradient id="rv-violetWash">
        <stop offset="0" stopColor={c.primary} stopOpacity={0.16} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0} />
      </radialGradient>
      <radialGradient id="rv-amberWash">
        <stop offset="0" stopColor={c.amber} stopOpacity={0.12} />
        <stop offset="1" stopColor={c.amber} stopOpacity={0} />
      </radialGradient>
      <filter id="rv-glow" x="-70%" y="-90%" width="240%" height="280%">
        <feGaussianBlur stdDeviation="15" result="b" />
        <feColorMatrix
          in="b"
          type="matrix"
          values="0 0 0 0 0.486  0 0 0 0 0.424  0 0 0 0 1  0 0 0 0.5 0"
        />
      </filter>
    </defs>

    <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={c.bg} />
    <ellipse cx={1160} cy={WAY_IN_Y} rx={520} ry={300} fill="url(#rv-violetWash)" />
    <ellipse cx={540} cy={CARD_ROW_Y - 40} rx={460} ry={320} fill="url(#rv-amberWash)" />

    {/* ---------------------------------------------------------------- words */}
    {!wordless && (
      <>
        <Headline y={140}>Turned away.</Headline>
        <Headline y={208}>Handed a way in.</Headline>
        <Motto y={FOOTER_Y}>both what was wrong and a legal next step</Motto>
        <Wordmark />
      </>
    )}

    {/* ------------------------------------------------------------- the wall */}
    {/* The opening is laid before the wall pieces so its halo sits UNDER their
        edges: a halo drawn on top of the jambs turns the wall into fog. */}
    <rect
      x={WALL.x0 - 8}
      y={WAY_IN.y0}
      width={WALL.x1 - WALL.x0 + 16}
      height={WAY_IN.y1 - WAY_IN.y0}
      rx={14}
      fill={c.primary}
      filter="url(#rv-glow)"
    />
    <rect
      x={WALL.x0 - 8}
      y={WAY_IN.y0 + 8}
      width={WALL.x1 - WALL.x0 + 16}
      height={WAY_IN.y1 - WAY_IN.y0 - 16}
      rx={12}
      fill={c.primaryDim}
    />
    {[WALL_TOP, WALL_BOTTOM].map((piece) => (
      <rect
        key={piece.y0}
        x={WALL.x0}
        y={piece.y0}
        width={WALL.x1 - WALL.x0}
        height={piece.y1 - piece.y0}
        rx={18}
        fill={c.bgLift}
        stroke={c.primaryEdge}
        strokeWidth={2.5}
      />
    ))}

    {/* ------------------------------------------------ the malformed arrival */}
    <line
      x1={0}
      y1={ARRIVE.y}
      x2={ARRIVE.x - 48}
      y2={ARRIVE.y}
      stroke="url(#rv-lane)"
      strokeWidth={5}
    />
    <BrokenChip x={ARRIVE.x} y={ARRIVE.y} size={76} />
    <Burst x={WALL.x0 - 12} y={ARRIVE.y} angle={180} color={c.amber} size={26} />

    {/* --------------------------------------------------- the card, handed back */}
    <path
      d={`M ${WALL.x0 - 22} ${ARRIVE.y + 54} C ${WALL.x0 - 40} ${ARRIVE.y + 128} 800 ${
        CARD.y0 - 118
      } 716 ${CARD.y0 - 46}`}
      fill="none"
      stroke={c.amber}
      strokeWidth={4}
      strokeOpacity={0.85}
      strokeDasharray="13 11"
      strokeLinecap="round"
    />
    <ArrowHead x={706} y={CARD.y0 - 8} angle={112} color={c.amber} size={14} />

    <rect
      x={CARD.x0}
      y={CARD.y0}
      width={CARD.x1 - CARD.x0}
      height={CARD.y1 - CARD.y0}
      rx={26}
      fill={c.bgLift}
      stroke={c.amberEdge}
      strokeWidth={2.5}
    />
    {/* A warm rule across the head of the card: this is a note with a heading,
        not a dialog box. */}
    <rect x={CARD.x0 + 30} y={CARD.y0 + 28} width={120} height={7} rx={3.5} fill={c.amber} />

    <BrokenChip x={BROKE_X} y={CARD_ROW_Y} size={76} />
    <line
      x1={BROKE_X + 62}
      y1={CARD_ROW_Y}
      x2={WORKS_X - 74}
      y2={CARD_ROW_Y}
      stroke={c.amber}
      strokeWidth={4}
      strokeOpacity={0.9}
      strokeLinecap="round"
    />
    <ArrowHead x={WORKS_X - 58} y={CARD_ROW_Y} angle={0} color={c.amber} size={14} />
    <SoundChip x={WORKS_X} y={CARD_ROW_Y} size={76} />

    {/* --------------------------------------------------- follow it, and get in */}
    <path
      d={`M ${CARD.x1 + 6} ${CARD.y1 - 52} C ${CARD.x1 + 96} ${CARD.y1 - 58} ${
        WALL.x0 - 34
      } ${WAY_IN_Y + 88} ${WALL.x0 - 8} ${WAY_IN_Y}`}
      fill="none"
      stroke={c.primary}
      strokeWidth={6}
      strokeOpacity={0.9}
      strokeLinecap="round"
    />
    <line
      x1={WALL.x1 - 6}
      y1={WAY_IN_Y}
      x2={SEAL.x0 - 10}
      y2={WAY_IN_Y}
      stroke={c.primary}
      strokeWidth={6}
      strokeOpacity={0.9}
      strokeLinecap="round"
    />
    <rect
      x={SEAL.x0}
      y={WAY_IN_Y - 44}
      width={SEAL.x1 - SEAL.x0}
      height={88}
      rx={16}
      fill={c.bgLift}
      stroke={c.primaryEdge}
      strokeWidth={2.5}
    />
    <SoundChip x={SEAL_CX} y={WAY_IN_Y} size={52} solid />

    {/* --------------------------------------------------------------- labels */}
    {!wordless && (
      <>
        <Label x={theme.layout.marginX} y={262}>
          <tspan fill={c.amber}>arrives malformed</tspan>
        </Label>
        <Label x={790} y={372} anchor="end">
          not admitted
        </Label>
        <Label x={BROKE_X} y={CARD.y0 + 100} anchor="middle">
          <tspan fill={c.amber}>what broke</tspan>
        </Label>
        <Label x={WORKS_X} y={CARD.y0 + 100} anchor="middle">
          <tspan fill={c.primary}>what works</tspan>
        </Label>
        <Label x={SEAL_CX} y={WAY_IN_Y - 76} anchor="middle">
          <tspan fill={c.primary}>the fix gets in</tspan>
        </Label>
      </>
    )}
  </svg>
);
