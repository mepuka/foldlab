// The five-layer stack every scene sits in: background mesh, then content,
// then the grade, then grain and vignette on top. Also the fonts, loaded from
// public/ so a render never depends on a font CDN being reachable.
import React from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { theme } from "../theme";

export const Fonts: React.FC = () => (
  <style>{`
    @font-face {
      font-family: 'Space Grotesk';
      src: url('${staticFile("fonts/space-grotesk-latin-700-normal.woff2")}') format('woff2');
      font-weight: 700; font-style: normal; font-display: block;
    }
    @font-face {
      font-family: 'Space Grotesk';
      src: url('${staticFile("fonts/space-grotesk-latin-500-normal.woff2")}') format('woff2');
      font-weight: 500; font-style: normal; font-display: block;
    }
    @font-face {
      font-family: 'JetBrains Mono';
      src: url('${staticFile("fonts/jetbrains-mono-latin-400-normal.woff2")}') format('woff2');
      font-weight: 400; font-style: normal; font-display: block;
    }
    @font-face {
      font-family: 'JetBrains Mono';
      src: url('${staticFile("fonts/jetbrains-mono-latin-600-normal.woff2")}') format('woff2');
      font-weight: 600; font-style: normal; font-display: block;
    }
  `}</style>
);

export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 55) * 50;
  const d2 = Math.cos(frame / 70) * 40;
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <div
        style={{
          position: "absolute",
          width: 1500,
          height: 1500,
          borderRadius: "50%",
          top: -700,
          left: -380 + d1,
          filter: "blur(60px)",
          background: `radial-gradient(circle, ${theme.colors.primary}26, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          borderRadius: "50%",
          bottom: -520,
          right: -300 - d2,
          filter: "blur(80px)",
          background: `radial-gradient(circle, ${theme.colors.primary}18, transparent 66%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            `linear-gradient(${theme.colors.line} 1px, transparent 1px), linear-gradient(90deg, ${theme.colors.line} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          opacity: 0.12,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 78%)",
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
          "linear-gradient(180deg, rgba(0,0,0,0.12), transparent 26%, transparent 74%, rgba(0,0,0,0.22))",
      }}
    />
  </AbsoluteFill>
);

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const noise =
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;
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
        "radial-gradient(ellipse at center, transparent 54%, rgba(0,0,0,0.30) 100%)",
    }}
  />
);

/** Wraps a scene's content in the full stack, in order. */
export const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
    <Fonts />
    <BgMesh />
    <AbsoluteFill>{children}</AbsoluteFill>
    <Grade />
    <Grain />
    <Vignette />
  </AbsoluteFill>
);
