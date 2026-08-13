// CLIP 3 — Refusal is a value.
//
// A source repeats a sequence coordinate. It reaches the fold's entry point
// and comes back not as a crash and not as a silent last-write-wins collapse,
// but as a typed value that names the source, the coordinate, and both indexes
// that claimed it.
//
// The tag, the four fields, and the message string come from
// data/refusal-is-a-value.json: the message is the exact output of
// go/stream/stream.go MergeDuplicateSequence.Error(), and the fields are
// asserted identical on the TypeScript side before the file is written.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import data from "../../data/refusal-is-a-value.json";
import { EventChip, Label } from "../components/Atoms";
import { Stage } from "../components/Layers";
import { Entrance, ramp, SceneExit, useBreath, WordReveal } from "../components/Motion";
import { theme } from "../theme";

const DUPLICATE_AT = 3;
const CARD_AT = 46;
const MESSAGE_AT = 88;
const COPY_AT = 124;

const fields: ReadonlyArray<readonly [string, string]> = [
  ["source", `"${data.fields.source}"`],
  ["seq", String(data.fields.seq)],
  ["firstIndex", String(data.fields.firstIndex)],
  ["duplicateIndex", String(data.fields.duplicateIndex)],
];

const Field: React.FC<{ name: string; value: string; delay: number }> = (
  { name, value, delay },
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.snappy });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 20,
        opacity: p,
        transform: `translateX(${interpolate(p, [0, 1], [-22, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: 27,
          color: theme.colors.textDim,
          width: 280,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: theme.fonts.mono,
          fontWeight: 600,
          fontSize: 30,
          color: theme.colors.refusal,
        }}
      >
        {value}
      </div>
    </div>
  );
};

export const RefusalIsAValue: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardP = spring({ frame: frame - CARD_AT, fps, config: theme.spring.smooth });
  const messageP = ramp(frame, MESSAGE_AT, MESSAGE_AT + 20);
  const flagged = frame >= 26;
  const breath = useBreath(26, 0.007);

  return (
    <Stage>
      <SceneExit>
        <AbsoluteFill>
          <Entrance
            delay={2}
            style={{ position: "absolute", top: 78, left: 0, width: "100%", textAlign: "center" }}
          >
            <Label>one source</Label>
          </Entrance>

          <div
            style={{
              position: "absolute",
              top: 136,
              left: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              gap: 20,
            }}
          >
            {data.payloads.map((payload, i) => (
              <Entrance key={i} delay={i * 4} from={-22} preset="snappy">
                <EventChip
                  payload={payload}
                  seq={i === DUPLICATE_AT ? data.fields.seq : i}
                  state={i === DUPLICATE_AT && flagged ? "refusal" : "idle"}
                  style={i === DUPLICATE_AT && flagged
                    ? { transform: `scale(${breath})` }
                    : undefined}
                />
              </Entrance>
            ))}
          </div>

          {/* the walled entry point the payload reaches */}
          <Entrance
            delay={30}
            style={{ position: "absolute", top: 306, left: 0, width: "100%" }}
          >
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  padding: "14px 44px",
                  borderRadius: 12,
                  border: `1.5px solid ${theme.colors.primary}`,
                  background: theme.colors.primaryDim,
                  fontFamily: theme.fonts.mono,
                  fontWeight: 600,
                  fontSize: 32,
                  color: theme.colors.primary,
                  // The glow hands off to the refusal card: one glowing thing per frame.
                  boxShadow: `0 0 ${48 * (1 - ramp(frame, CARD_AT, CARD_AT + 18))}px ${theme.colors.glow}`,
                }}
              >
                applyMerge
              </div>
            </div>
          </Entrance>

          {/* the refusal, drawn as what it is: a value with fields */}
          <div
            style={{
              position: "absolute",
              top: 388,
              left: 0,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              opacity: cardP,
              transform: `translateY(${interpolate(cardP, [0, 1], [40, 0])}px) scale(${
                interpolate(cardP, [0, 1], [0.93, 1])
              })`,
            }}
          >
            <div
              style={{
                width: 1100,
                borderRadius: 22,
                border: `1.5px solid ${theme.colors.refusal}`,
                background: theme.colors.refusalDim,
                padding: "24px 44px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontWeight: 600,
                  fontSize: 36,
                  color: theme.colors.refusal,
                  letterSpacing: "-0.01em",
                }}
              >
                {data.tag}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fields.map(([name, value], i) => (
                  <Field key={name} name={name} value={value} delay={CARD_AT + 10 + i * 4} />
                ))}
              </div>
            </div>
          </div>

          {/* the message, exactly as the code formats it */}
          <div
            style={{
              position: "absolute",
              top: 742,
              left: 0,
              width: "100%",
              textAlign: "center",
              opacity: messageP,
              transform: `translateY(${interpolate(messageP, [0, 1], [22, 0])}px)`,
            }}
          >
            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 28,
                color: theme.colors.textDim,
              }}
            >
              {data.message}
            </div>
          </div>

          {/* the line, verbatim from go/stream/stream.go */}
          <div
            style={{
              position: "absolute",
              top: 814,
              left: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
            }}
          >
            <WordReveal
              text="last-write-wins is not a lawful resolution"
              delay={COPY_AT}
              per={3}
              highlight={["lawful"]}
              style={{
                fontFamily: theme.fonts.display,
                fontWeight: 700,
                fontSize: 66,
                letterSpacing: "-0.03em",
              }}
            />
            <Entrance delay={COPY_AT + 24} from={16} preset="snappy">
              <Label size={19}>go/stream/stream.go</Label>
            </Entrance>
          </div>
        </AbsoluteFill>
      </SceneExit>
    </Stage>
  );
};

export const REFUSAL_DURATION = 210;
