import React from "react";
import { Composition } from "remotion";
import { CUT_ANYWHERE_DURATION, CutAnywhere } from "./scenes/CutAnywhere";
import { REFUSAL_DURATION, RefusalIsAValue } from "./scenes/RefusalIsAValue";
import { TWO_FOLDS_DURATION, TwoFolds } from "./scenes/TwoFolds";
import { theme } from "./theme";

const { width, height, fps } = theme.size;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="two-folds"
      component={TwoFolds}
      durationInFrames={TWO_FOLDS_DURATION}
      fps={fps}
      width={width}
      height={height}
    />
    <Composition
      id="cut-anywhere"
      component={CutAnywhere}
      durationInFrames={CUT_ANYWHERE_DURATION}
      fps={fps}
      width={width}
      height={height}
    />
    <Composition
      id="refusal-is-a-value"
      component={RefusalIsAValue}
      durationInFrames={REFUSAL_DURATION}
      fps={fps}
      width={width}
      height={height}
    />
  </>
);
