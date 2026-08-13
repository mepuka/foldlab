// Two marks the flagship did not need and the siblings do.
//
// The flagship never points at anything: its paths simply arrive, and arrival
// is the whole event. Three of the siblings have to show a shape being SENT
// somewhere — a half sent to its own fold, a repair sent back through the gate,
// a loser sent to the next cell — and a bare stroke that stops in mid-air reads
// as a stroke that was cut off rather than as a direction.
//
// So: an arrowhead, and an impact. Both are solid fills in the family colours,
// with no outline of their own, so they read as part of the line they finish
// rather than as a third kind of object on the canvas.
import React from "react";

/** The head that finishes a line. `angle` is degrees, 0 = pointing right. */
export const ArrowHead: React.FC<{
  x: number;
  y: number;
  angle: number;
  color: string;
  size?: number;
}> = ({ x, y, angle, color, size = 15 }) => (
  <path
    d={`M ${size} 0 L ${-size * 0.72} ${size * 0.74} L ${-size * 0.72} ${-size * 0.74} Z`}
    fill={color}
    transform={`translate(${x} ${y}) rotate(${angle})`}
  />
);

/**
 * The moment something is stopped by something else. Short ticks fanned back
 * along the direction of travel: a shape that merely touches a surface reads as
 * a shape resting on it, and the whole point is that it was refused entry.
 */
export const Burst: React.FC<{
  x: number;
  y: number;
  /** Degrees, the direction the ticks fan back TOWARD (the way it came from). */
  angle: number;
  color: string;
  size?: number;
  spread?: number;
}> = ({ x, y, angle, color, size = 22, spread = 54 }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle})`} stroke={color} strokeLinecap="round">
    {[-1, -0.5, 0, 0.5, 1].map((k) => {
      const a = (k * spread * Math.PI) / 180;
      const near = size * 0.42;
      const far = size * (1 - Math.abs(k) * 0.3);
      return (
        <line
          key={k}
          x1={Math.cos(a) * near}
          y1={Math.sin(a) * near}
          x2={Math.cos(a) * (near + far)}
          y2={Math.sin(a) * (near + far)}
          strokeWidth={4}
          strokeOpacity={0.9}
        />
      );
    })}
  </g>
);
