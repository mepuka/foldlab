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
// canvas is 1600x900 because the posters are read at 900px wide and 1600 is a
// clean 16:9 that downscales to it without resampling artefacts on hairlines.
export const RemotionRoot: React.FC = () => (
  <>
    <Still id="two-folds" component={TwoFolds} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
    <Still id="cut-anywhere" component={CutAnywhere} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
    <Still
      id="refusal-is-a-value"
      component={RefusalIsAValue}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
    />
    <Still
      id="register-linearizes"
      component={RegisterLinearizes}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
    />
    <Still
      id="journal-linearizes"
      component={JournalLinearizes}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
    />
  </>
);
