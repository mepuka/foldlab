import React from "react";
import { Still } from "remotion";

import "./fonts";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./theme";
import { CutAnywhere } from "./posters/CutAnywhere";
import { JournalLinearizes } from "./posters/JournalLinearizes";
import { RefusalIsAValue } from "./posters/RefusalIsAValue";
import { RegisterLinearizes } from "./posters/RegisterLinearizes";
import { TwoFolds } from "./posters/TwoFolds";

// Stills, not compositions: there is no timeline here and nothing moves. The
// canvas is 1600x900 because the poster is read at 900px wide and 1600 is a
// clean 16:9 that downscales to it without resampling artefacts on hairlines.
//
// Every sibling registers TWICE. The second registration switches every word
// off, and that wordless frame is the instrument the flagship was judged with:
// if the picture alone does not carry the idea in five seconds, the picture is
// wrong and no caption will save it. Registering it here rather than rendering
// it by hand is what stops the wordless test from being skipped.
const SIBLINGS = [
  { id: "cut-anywhere", component: CutAnywhere },
  { id: "refusal-is-a-value", component: RefusalIsAValue },
  { id: "register-linearizes", component: RegisterLinearizes },
  { id: "journal-linearizes", component: JournalLinearizes },
] as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Still id="two-folds-v2" component={TwoFolds} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
    {SIBLINGS.map(({ id, component }) => (
      <React.Fragment key={id}>
        <Still
          id={id}
          component={component}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          defaultProps={{ wordless: false }}
        />
        <Still
          id={`${id}-wordless`}
          component={component}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          defaultProps={{ wordless: true }}
        />
      </React.Fragment>
    ))}
  </>
);
