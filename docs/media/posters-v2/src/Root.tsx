import React from "react";
import { Still } from "remotion";

import "./fonts";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./theme";
import { TwoFolds } from "./posters/TwoFolds";

// A Still, not a composition: there is no timeline here and nothing moves. The
// canvas is 1600x900 because the poster is read at 900px wide and 1600 is a
// clean 16:9 that downscales to it without resampling artefacts on hairlines.
export const RemotionRoot: React.FC = () => (
  <Still id="two-folds-v2" component={TwoFolds} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
);
