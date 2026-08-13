// POSTER 3 — a refusal is a value.
//
// A merge is handed a source index that repeats a sequence coordinate. Sequence
// is an identity coordinate, so last-write-wins is not a lawful resolution and
// the merge refuses. The refusal is not a thrown thing or a log line: it is a
// typed value with fields you can read — source, seq, and BOTH indexes — and
// its message is derived from those fields.
//
// The copy line here IS that message, verbatim from go/stream/stream.go:231
// (line-wrapped for the footer, otherwise character for character), so it
// is the one copy line set in mono: it is a value, not a slogan. Fields come
// from docs/media/folding/data/refusal-is-a-value.json and the Go driver's own
// recording in refusal-go.json; agreement between them is computed below rather
// than asserted.
import React from "react";

import go from "../../../folding/data/refusal-go.json";
import trace from "../../../folding/data/refusal-is-a-value.json";
import { Card, Kicker, Mono, Poster, Rule } from "../components/Poster";
import { display, theme } from "../theme";

const px = (n: number) => `${n}px`;

const FIELDS: ReadonlyArray<readonly [string, string]> = [
  ["Source", `"${trace.fields.source}"`],
  ["Seq", String(trace.fields.seq)],
  ["FirstIndex", String(trace.fields.firstIndex)],
  ["DuplicateIndex", String(trace.fields.duplicateIndex)],
];

// Agreement is DERIVED from the two committed traces, not claimed: the Go
// driver's recording and the TypeScript recording must carry the same tag, the
// same field values and the same message.
const AGREE =
  go.tag === trace.tag &&
  go.message === trace.message &&
  go.source === trace.fields.source &&
  go.seq === trace.fields.seq &&
  go.firstIndex === trace.fields.firstIndex &&
  go.duplicateIndex === trace.fields.duplicateIndex;

/** The four events handed to the merge. Two of them claim orders@1.
 *  Two lines per card, not three: the third line cost the copy its footer. */
const Input: React.FC = () => (
  <div style={{ display: "flex", alignItems: "stretch", gap: px(display(8)) }}>
    {trace.payloads.map((payload, index) => {
      // The trace names a sequence coordinate for exactly two indexes. The
      // other two carry no coordinate here rather than a guessed one.
      const clashing = index === trace.fields.firstIndex || index === trace.fields.duplicateIndex;
      return (
        <Card
          key={index}
          tone={clashing ? "refusal" : "neutral"}
          padX={12}
          padY={6}
          style={{ flexDirection: "column", alignItems: "flex-start", gap: 0 }}
        >
          <Mono size={theme.type.dataStrong} color={theme.colors.text}>
            {`${index}  ${payload}`}
          </Mono>
          <Mono
            size={theme.type.label}
            color={clashing ? theme.colors.refusal : theme.colors.textFaint}
            weight={clashing ? 700 : 500}
          >
            {clashing ? `${trace.fields.source}@${trace.fields.seq}` : "·"}
          </Mono>
        </Card>
      );
    })}
    <div style={{ display: "flex", alignItems: "center", paddingLeft: px(display(10)) }}>
      <Mono size={theme.type.label} color={theme.colors.refusal} weight={700}>
        {"one sequence,\ntwo events"}
      </Mono>
    </div>
  </div>
);

/** The refusal, printed as the struct it is. */
const TypedValue: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: px(display(8)) }}>
    <Kicker>what the merge returned</Kicker>
    <Card
      tone="refusal"
      padX={18}
      padY={10}
      style={{ flexDirection: "column", alignItems: "flex-start", gap: px(display(2)) }}
    >
      <Mono size={theme.type.lead} color={theme.colors.refusal} weight={700}>
        {`${trace.tag} {`}
      </Mono>
      {FIELDS.map(([name, value]) => (
        <div key={name} style={{ display: "flex", paddingLeft: px(display(16)) }}>
          <Mono size={theme.type.data} color={theme.colors.textDim} style={{ width: display(146) }}>
            {name}
          </Mono>
          <Mono size={theme.type.data} color={theme.colors.text} weight={700}>
            {value}
          </Mono>
        </div>
      ))}
      <Mono size={theme.type.lead} color={theme.colors.refusal} weight={700}>
        {"}"}
      </Mono>
    </Card>
  </div>
);

/** Both implementations derive the same message from the same fields. */
const Agreement: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: px(display(8)) }}>
    <Kicker color={theme.colors.primary}>independently derived</Kicker>
    <Card
      tone="glow"
      padX={18}
      padY={12}
      style={{ flexDirection: "column", alignItems: "flex-start", gap: px(display(4)) }}
    >
      <Mono size={theme.type.figure} color={theme.colors.text} weight={700}>
        {AGREE ? "go  ≡  ts" : "go  ≠  ts"}
      </Mono>
      <Mono size={theme.type.label} color={theme.colors.textDim}>
        {"same tag, same fields,\nsame message — no panic,\nno partial state"}
      </Mono>
    </Card>
  </div>
);

export const RefusalIsAValue: React.FC = () => (
  <Poster
    kicker="foldlab · the source index handed to merge"
    copy={"stream: source orders repeats sequence 1\nat event indexes 1 and 3"}
    copyMono
    copyColor={theme.colors.refusal}
    cite="go/stream/stream.go:231"
  >
    <div style={{ display: "flex", flexDirection: "column", gap: px(display(14)) }}>
      <Input />
      <Rule color={theme.colors.line} />
      <div style={{ display: "flex", gap: px(display(28)), alignItems: "flex-start" }}>
        <TypedValue />
        <Agreement />
      </div>
    </div>
  </Poster>
);
