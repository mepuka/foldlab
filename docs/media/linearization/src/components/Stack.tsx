// The five-layer stack. Bottom to top: background mesh -> content (supplied by
// the scene) -> colour grade -> grain -> vignette. No scene ever paints a flat
// background of its own.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { theme } from "../theme";

export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 58) * 46;
  const d2 = Math.cos(frame / 74) * 38;
  const d3 = Math.sin(frame / 91) * 30;
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <AbsoluteFill
        style={{
          background: `linear-gradient(165deg, ${theme.colors.bgAlt} 0%, ${theme.colors.bg} 55%, #04050A 100%)`,
        }}
      />
      {/* Faint measured grid: the ground is ruled, like a proof page. */}
      <AbsoluteFill
        style={{
          opacity: 0.5,
          backgroundImage: `linear-gradient(${theme.colors.lineFaint} 1px, transparent 1px),
                            linear-gradient(90deg, ${theme.colors.lineFaint} 1px, transparent 1px)`,
          backgroundSize: "120px 120px",
          backgroundPosition: `${d3 * 0.3}px ${d3 * 0.2}px`,
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(0,0,0,0.85), transparent 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1500,
          height: 1500,
          borderRadius: "50%",
          top: -640,
          left: -260 + d1,
          filter: "blur(70px)",
          background: `radial-gradient(circle, ${theme.colors.primary}1C, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1150,
          height: 1150,
          borderRadius: "50%",
          bottom: -520,
          right: -220 - d2,
          filter: "blur(90px)",
          background: `radial-gradient(circle, ${theme.colors.refusal}16, transparent 64%)`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Grade: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.primary,
        mixBlendMode: "soft-light",
        opacity: 0.2,
      }}
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(0,0,0,0.18), transparent 26%, transparent 70%, rgba(0,0,0,0.28))",
      }}
    />
  </AbsoluteFill>
);

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const noise = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: noise,
        backgroundSize: "220px",
        backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`,
        opacity: 0.055,
        mixBlendMode: "overlay",
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background:
        "radial-gradient(ellipse at center, transparent 54%, rgba(0,0,0,0.34) 100%)",
    }}
  />
);

/** Wraps a scene's content in the full stack and applies the scene-level exit. */
export const Stage: React.FC<{
  exitFrom: number;
  exitTo: number;
  children: React.ReactNode;
}> = ({ exitFrom, exitTo, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [exitFrom, exitTo], [1, 0], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [exitFrom, exitTo], [1, 1.035], {
    easing: theme.ease.in,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <BgMesh />
      <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
        {children}
      </AbsoluteFill>
      <Grade />
      <Grain />
      <Vignette />
    </AbsoluteFill>
  );
};
