// Cut anywhere, drawn as a picture instead of tabulated as a readout.
//
// The idea in civilian terms: a run of things happened, in order. Snip that run
// at any point you like, work out each piece on its own, then put the two
// pieces together. What you get is the same thing you would have got if you had
// never snipped it at all — and the poster proves that by building it both ways
// on one baseline, side by side, so the eye can compare the two results without
// being told they match.
//
// Nothing on this canvas is a value. There are no digests and no counts. The
// number of shapes and the size of the pieces are drawing decisions, not data,
// which is why the cut sits off-centre: a cut in the middle reads as THE place
// to cut, and the whole claim is that there is no such place. The faint ticks
// at the other gaps are what carry the word "anywhere" without spending a
// label on it.
//
// The composition is two columns landing on one shelf. The left column is the
// long way round — stream, cut, two pieces, assembly — and the right column is
// the short way, one stream falling straight into its answer. They meet inside
// a single housing across the bottom, because the equality is the subject and
// an equality drawn as two separate objects is just two objects.
import React from "react";

import { SoundChip } from "../components/Glyphs";
import { ArrowHead } from "../components/Marks";
import { Headline, Label, Motto, Wordmark } from "../components/Type";
import { CANVAS_HEIGHT, CANVAS_WIDTH, theme } from "../theme";

const c = theme.colors;

// ---------------------------------------------------------------------------
// One composition, so its numbers live together. Canvas pixels on 1600x900.
// ---------------------------------------------------------------------------

const STREAM_Y = 350;
const CHIP = 54;
const PITCH = 76;
const RUN = 6;

/** Where the snip falls: after the second shape. Off-centre on purpose. */
const CUT_INDEX = 2;
/** The two halves stand off from the cut, so the snip has visibly separated them. */
const STANDOFF = 19;

const LEFT_CX = 470;
const RIGHT_CX = 1210;

const runX = (cx: number, i: number): number => cx - ((RUN - 1) * PITCH) / 2 + i * PITCH;
const cutX = (cx: number): number => runX(cx, CUT_INDEX) - PITCH / 2;
const offset = (i: number): number => (i < CUT_INDEX ? -STANDOFF : STANDOFF);

const CUT_X = cutX(LEFT_CX);

// The two halves, each folded on its own. The left half's answer is the pair
// that ends up on top; the right half's answer is the row it stands on. They
// are drawn at different heights so that "one goes on top of the other" is
// already true before the assembly lines are drawn.
const PIECE = 50;
const TOP_PIECE = { x: 392, y: 486 };
const BASE_PIECE = { x: 656, y: 552 };

// The shelf. Both answers stand on it at the same size, in the same posture.
const BLOCK = 62;
const SHELF_BASE_Y = 742;
const SHELF_TOP_Y = SHELF_BASE_Y - BLOCK;
const HOUSE = { y0: 626, y1: 800, x0: 290, x1: 1350 };

const EQ_X = 820;

const FOOTER_Y = 852;

/** One answer: three blocks on the ground with two closed up on top of them. */
const Structure: React.FC<{ cx: number }> = ({ cx }) => (
  <g>
    {[-1, 0, 1].map((k) => (
      <SoundChip key={k} x={cx + k * BLOCK} y={SHELF_BASE_Y} size={BLOCK} solid />
    ))}
    {[-0.5, 0.5].map((k) => (
      <SoundChip key={k} x={cx + k * BLOCK} y={SHELF_TOP_Y} size={BLOCK} solid />
    ))}
  </g>
);

export const CutAnywhere: React.FC<{ wordless?: boolean }> = ({ wordless = false }) => (
  <svg
    width={CANVAS_WIDTH}
    height={CANVAS_HEIGHT}
    viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Both streams fade in from off-canvas on the left: things were already
          happening before the frame started.

          These are stated in USER SPACE, not in the object's bounding box. A
          horizontal line has a bounding box of zero height, and a gradient in
          bounding-box units on a degenerate box paints nothing at all — the
          lane simply vanishes, silently, and the poster ships with its stream
          missing. */}
      <linearGradient
        id="ca-laneLeft"
        gradientUnits="userSpaceOnUse"
        x1={0}
        y1={0}
        x2={228}
        y2={0}
      >
        <stop offset="0" stopColor={c.primary} stopOpacity={0} />
        <stop offset="0.55" stopColor={c.primary} stopOpacity={0.55} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0.85} />
      </linearGradient>
      <linearGradient
        id="ca-laneRight"
        gradientUnits="userSpaceOnUse"
        x1={860}
        y1={0}
        x2={1119}
        y2={0}
      >
        <stop offset="0" stopColor={c.primary} stopOpacity={0} />
        <stop offset="0.55" stopColor={c.primary} stopOpacity={0.55} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0.85} />
      </linearGradient>
      <radialGradient id="ca-violetWash">
        <stop offset="0" stopColor={c.primary} stopOpacity={0.15} />
        <stop offset="1" stopColor={c.primary} stopOpacity={0} />
      </radialGradient>
      <radialGradient id="ca-amberWash">
        <stop offset="0" stopColor={c.amber} stopOpacity={0.09} />
        <stop offset="1" stopColor={c.amber} stopOpacity={0} />
      </radialGradient>
      <filter id="ca-glow" x="-30%" y="-70%" width="160%" height="240%">
        <feGaussianBlur stdDeviation="12" result="b" />
        <feColorMatrix
          in="b"
          type="matrix"
          values="0 0 0 0 0.486  0 0 0 0 0.424  0 0 0 0 1  0 0 0 0.42 0"
        />
      </filter>
    </defs>

    <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={c.bg} />
    <ellipse cx={EQ_X} cy={712} rx={760} ry={280} fill="url(#ca-violetWash)" />
    <ellipse cx={CUT_X} cy={STREAM_Y} rx={260} ry={180} fill="url(#ca-amberWash)" />

    {/* ---------------------------------------------------------------- words */}
    {!wordless && (
      <>
        <Headline y={140}>Cut it anywhere.</Headline>
        <Headline y={208}>The answer is the same.</Headline>
        <Motto y={FOOTER_Y}>the answer does not depend on where it was cut</Motto>
        <Wordmark />
      </>
    )}

    {/* ------------------------------------------------- the shelf, laid first */}
    {/* The housing is the only thing that glows, and it holds BOTH answers, so
        the claim being made is the equality rather than either structure. */}
    <rect
      x={HOUSE.x0}
      y={HOUSE.y0}
      width={HOUSE.x1 - HOUSE.x0}
      height={HOUSE.y1 - HOUSE.y0}
      rx={30}
      fill={c.primary}
      filter="url(#ca-glow)"
    />
    <rect
      x={HOUSE.x0}
      y={HOUSE.y0}
      width={HOUSE.x1 - HOUSE.x0}
      height={HOUSE.y1 - HOUSE.y0}
      rx={30}
      fill={c.primaryGhost}
      stroke={c.primaryDim}
      strokeWidth={2}
    />

    {/* ------------------------------------------------ the long way: the cut */}
    <line
      x1={0}
      y1={STREAM_Y}
      x2={runX(LEFT_CX, 0) - STANDOFF - CHIP / 2 - 6}
      y2={STREAM_Y}
      stroke="url(#ca-laneLeft)"
      strokeWidth={5}
    />
    {/* The gaps that were NOT taken. Four faint ticks are cheaper than a
        sentence explaining that the cut point was arbitrary. */}
    {Array.from({ length: RUN - 1 }, (_, i) => i + 1)
      .filter((i) => i !== CUT_INDEX)
      .map((i) => (
        <line
          key={i}
          x1={runX(LEFT_CX, i) - PITCH / 2 + offset(i)}
          y1={STREAM_Y - 58}
          x2={runX(LEFT_CX, i) - PITCH / 2 + offset(i)}
          y2={STREAM_Y + 58}
          stroke={c.textFaint}
          strokeWidth={2.5}
          strokeOpacity={0.75}
          strokeDasharray="7 9"
        />
      ))}
    {Array.from({ length: RUN }, (_, i) => (
      <SoundChip key={i} x={runX(LEFT_CX, i) + offset(i)} y={STREAM_Y} size={CHIP} />
    ))}
    <line
      x1={CUT_X}
      y1={STREAM_Y - 58}
      x2={CUT_X}
      y2={STREAM_Y + 58}
      stroke={c.amber}
      strokeWidth={4.5}
      strokeOpacity={0.95}
      strokeLinecap="round"
    />

    {/* ------------------------------------- each half, folded on its own */}
    <path
      d={`M 299 ${STREAM_Y + 44} C 320 ${STREAM_Y + 96} 348 ${TOP_PIECE.y - 76} ${
        TOP_PIECE.x
      } ${TOP_PIECE.y - 62}`}
      fill="none"
      stroke={c.primary}
      strokeWidth={5}
      strokeOpacity={0.7}
      strokeLinecap="round"
    />
    <ArrowHead x={TOP_PIECE.x} y={TOP_PIECE.y - 46} angle={78} color={c.primary} size={13} />
    <path
      d={`M 565 ${STREAM_Y + 44} C 600 ${STREAM_Y + 114} 634 ${BASE_PIECE.y - 130} ${
        BASE_PIECE.x
      } ${BASE_PIECE.y - 62}`}
      fill="none"
      stroke={c.primary}
      strokeWidth={5}
      strokeOpacity={0.7}
      strokeLinecap="round"
    />
    <ArrowHead x={BASE_PIECE.x} y={BASE_PIECE.y - 46} angle={82} color={c.primary} size={13} />

    {[-0.5, 0.5].map((k) => (
      <SoundChip key={k} x={TOP_PIECE.x + k * PIECE} y={TOP_PIECE.y} size={PIECE} solid />
    ))}
    {[-1, 0, 1].map((k) => (
      <SoundChip key={k} x={BASE_PIECE.x + k * PIECE} y={BASE_PIECE.y} size={PIECE} solid />
    ))}

    {/* ------------------------------------------------ the two pieces, joined */}
    {/* Both assembly runs arrive from ABOVE the shelf and stop clear of the
        blocks. A head that lands on top of a block reads as the block being
        struck rather than as the block being placed. */}
    <path
      d={`M ${TOP_PIECE.x} ${TOP_PIECE.y + 36} C ${TOP_PIECE.x + 8} ${TOP_PIECE.y + 74} 400 566 402 592`}
      fill="none"
      stroke={c.primary}
      strokeWidth={5}
      strokeOpacity={0.7}
      strokeLinecap="round"
    />
    <ArrowHead x={403} y={608} angle={94} color={c.primary} size={13} />
    <path
      d={`M ${BASE_PIECE.x} ${BASE_PIECE.y + 36} C ${BASE_PIECE.x - 6} ${
        BASE_PIECE.y + 84
      } 620 640 578 654`}
      fill="none"
      stroke={c.primary}
      strokeWidth={5}
      strokeOpacity={0.7}
      strokeLinecap="round"
    />
    <ArrowHead x={562} y={659} angle={162} color={c.primary} size={13} />

    {/* ------------------------------------------ the short way: never cut */}
    <line
      x1={860}
      y1={STREAM_Y}
      x2={runX(RIGHT_CX, 0) - CHIP / 2 - 8}
      y2={STREAM_Y}
      stroke="url(#ca-laneRight)"
      strokeWidth={5}
    />
    {Array.from({ length: RUN }, (_, i) => (
      <SoundChip key={i} x={runX(RIGHT_CX, i)} y={STREAM_Y} size={CHIP} />
    ))}
    <line
      x1={RIGHT_CX}
      y1={STREAM_Y + 40}
      x2={RIGHT_CX}
      y2={SHELF_TOP_Y - 62}
      stroke={c.primary}
      strokeWidth={5}
      strokeOpacity={0.7}
      strokeLinecap="round"
    />
    <ArrowHead x={RIGHT_CX} y={SHELF_TOP_Y - 46} angle={90} color={c.primary} size={13} />

    {/* ------------------------------------------------------- the two answers */}
    <Structure cx={LEFT_CX} />
    <Structure cx={RIGHT_CX} />
    {[684, 732].map((y) => (
      <rect key={y} x={EQ_X - 56} y={y} width={112} height={17} rx={8.5} fill={c.primary} />
    ))}

    {/* --------------------------------------------------------------- labels */}
    {!wordless && (
      <>
        <Label x={CUT_X} y={STREAM_Y - 78} anchor="middle">
          <tspan fill={c.amber}>cut here — or at any gap</tspan>
        </Label>
        <Label x={320} y={498} anchor="end">
          each half folds
        </Label>
        <Label x={RIGHT_CX} y={STREAM_Y - 78} anchor="middle">
          never cut
        </Label>
        <Label x={EQ_X} y={HOUSE.y0 - 22} anchor="middle">
          <tspan fill={c.primary}>same answer</tspan>
        </Label>
      </>
    )}
  </svg>
);
