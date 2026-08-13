// CLIP 2 — Cut anywhere.
//
// One history, cut at an arbitrary point. The two pieces fold independently
// from the algebra's neutral value and their partial answers combine into
// exactly the answer the uncut fold gives. Then the cut moves, and the answer
// does not.
//
// Every state and digest on screen comes from data/cut-anywhere.json, written
// by scripts/cut-anywhere.ts against packages/core: the whole fold, both cuts,
// both pairs of partials, and the combined result.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import data from "../../data/cut-anywhere.json";
import { EventChip, Label, short } from "../components/Atoms";
import { Stage } from "../components/Layers";
import { Entrance, ramp, SceneExit, useBreath, WordReveal } from "../components/Motion";
import { theme } from "../theme";

const CHIP_W = 252;
const CHIP_GAP = 16;
const CHIP_FONT = 23;
const STRIP_W = data.events.length * CHIP_W + (data.events.length - 1) * CHIP_GAP;
const STRIP_LEFT = (1920 - STRIP_W) / 2;
const GAP_OPEN = 96;

type Beat = {
  blade: number;
  left: number;
  right: number;
  combined: number;
  match: number;
};

const BEATS: ReadonlyArray<Beat> = [
  { blade: 70, left: 92, right: 100, combined: 138, match: 152 },
  { blade: 180, left: 196, right: 204, combined: 222, match: 234 },
];

const COPY_AT = 250;

/** How far the strip is split, and where. The blade only moves while closed. */
const useSplit = () => {
  const frame = useCurrentFrame();
  const open = Math.min(
    1,
    Math.max(
      0,
      ramp(frame, BEATS[0]!.blade, BEATS[0]!.blade + 16) -
        ramp(frame, 162, 174, theme.ease.in) +
        ramp(frame, BEATS[1]!.blade, BEATS[1]!.blade + 16),
    ),
  );
  const cut = frame < 174 ? 0 : 1;
  return { open, cut };
};

const StatePill: React.FC<{
  caption: string;
  state: ReadonlyArray<number>;
  digest: string;
  delay: number;
  hero?: boolean;
  big?: boolean;
}> = ({ caption, state, digest, delay, hero = false, big = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.smooth });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px) scale(${
          interpolate(p, [0, 1], [0.9, 1])
        })`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: big ? "22px 40px" : "18px 30px",
        borderRadius: 18,
        border: `1.5px solid ${hero ? theme.colors.primary : theme.colors.line}`,
        background: hero ? theme.colors.primaryDim : theme.colors.surface,
        boxShadow: hero ? `0 0 64px ${theme.colors.glow}` : "none",
      }}
    >
      <Label tone="faint" size={17}>{caption}</Label>
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontWeight: 600,
          fontSize: big ? 46 : 38,
          color: hero ? theme.colors.primary : theme.colors.text,
        }}
      >
        [{state.join(", ")}]
      </div>
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: big ? 27 : 23,
          letterSpacing: "0.04em",
          color: hero ? theme.colors.primary : theme.colors.textDim,
        }}
      >
        {short(digest, big ? 16 : 12)}
      </div>
    </div>
  );
};

export const CutAnywhere: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { open, cut } = useSplit();
  const beat = BEATS[cut]!;
  const cutData = data.cuts[cut]!;
  const shift = (open * GAP_OPEN) / 2;
  const breath = useBreath(28, 0.008);

  // Where the blade stands: the seam between the two pieces.
  const seamX = STRIP_LEFT + cutData.at * (CHIP_W + CHIP_GAP) - CHIP_GAP / 2;
  const bladeIn = ramp(frame, beat.blade, beat.blade + 14, theme.ease.inOut);

  const matchP = spring({ frame: frame - beat.match, fps, config: theme.spring.bouncy });
  const leftCentre = STRIP_LEFT + (cutData.at * (CHIP_W + CHIP_GAP)) / 2 - shift;
  const rightCentre = STRIP_LEFT + (cutData.at * (CHIP_W + CHIP_GAP) + STRIP_W) / 2 + shift;

  return (
    <Stage>
      <SceneExit>
        <AbsoluteFill>
          <Entrance
            delay={4}
            style={{ position: "absolute", top: 84, left: 0, width: "100%", textAlign: "center" }}
          >
            <Label>one history</Label>
          </Entrance>

          {/* the blade: a lawful cut, drawn where the seam is */}
          <div
            style={{
              position: "absolute",
              left: seamX - 2.5,
              top: 148,
              width: 5,
              height: 196 * bladeIn,
              borderRadius: 5,
              background:
                `linear-gradient(180deg, transparent, ${theme.colors.primary} 22%, ${theme.colors.primary} 78%, transparent)`,
              opacity: bladeIn,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: seamX - 46,
              top: 360,
              width: 92,
              textAlign: "center",
              opacity: bladeIn,
              transform: `translateY(${interpolate(bladeIn, [0, 1], [-12, 0])}px)`,
            }}
          >
            <Label tone="hero" size={19}>cut</Label>
          </div>

          {/* the strip */}
          <div style={{ position: "absolute", top: 168, left: 0, width: "100%", height: 130 }}>
            {data.events.map((e, i) => (
              <Entrance
                key={e.seq}
                delay={i * 4}
                from={-24}
                preset="snappy"
                style={{
                  position: "absolute",
                  left: STRIP_LEFT + i * (CHIP_W + CHIP_GAP) +
                    (i < cutData.at ? -shift : shift),
                  top: 0,
                }}
              >
                <EventChip
                  payload={e.payload}
                  seq={e.seq}
                  width={CHIP_W}
                  fontSize={CHIP_FONT}
                />
              </Entrance>
            ))}
          </div>

          {/* the two pieces, folded on their own */}
          <div
            style={{
              position: "absolute",
              top: 424,
              left: leftCentre - 200,
              width: 400,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <StatePill
              caption="folded alone"
              state={cutData.left.state}
              digest={cutData.left.digest}
              delay={beat.left}
            />
          </div>
          <div
            style={{
              position: "absolute",
              top: 424,
              left: rightCentre - 200,
              width: 400,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <StatePill
              caption="folded alone"
              state={cutData.right.state}
              digest={cutData.right.digest}
              delay={beat.right}
            />
          </div>

          {/* combined, beside the uncut answer */}
          <div
            style={{
              position: "absolute",
              top: 632,
              left: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 56,
            }}
          >
            <div style={{ transform: `scale(${breath})` }}>
              <StatePill
                caption="combined"
                state={cutData.combined.state}
                digest={cutData.combined.digest}
                delay={beat.combined}
                hero
                big
              />
            </div>
            <div
              style={{
                fontFamily: theme.fonts.display,
                fontWeight: 700,
                fontSize: 72,
                color: theme.colors.text,
                opacity: matchP,
                transform: `scale(${interpolate(matchP, [0, 1], [0.4, 1])})`,
              }}
            >
              =
            </div>
            <StatePill
              caption="whole"
              state={data.whole.state}
              digest={data.whole.digest}
              delay={30}
              big
            />
          </div>

          {/* the line, verbatim from packages/core/src/fold.ts */}
          <div
            style={{
              position: "absolute",
              top: 876,
              left: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
            }}
          >
            <WordReveal
              text="the answer does not depend on where it was cut"
              delay={COPY_AT}
              per={2.6}
              highlight={["answer"]}
              style={{
                fontFamily: theme.fonts.display,
                fontWeight: 700,
                fontSize: 66,
                letterSpacing: "-0.03em",
              }}
            />
            <Entrance delay={COPY_AT + 28} from={16} preset="snappy">
              <Label size={19}>packages/core/src/fold.ts</Label>
            </Entrance>
          </div>
        </AbsoluteFill>
      </SceneExit>
    </Stage>
  );
};

export const CUT_ANYWHERE_DURATION = 330;
