import React from "react";
import { Composition } from "remotion";

import "./fonts";
import { RegisterLinearizes } from "./scenes/RegisterLinearizes";
import { JournalLinearizes } from "./scenes/JournalLinearizes";

const FPS = 30;
const W = 1920;
const H = 1080;

// The GIF variants are the same scenes at half the frame rate; only the encode
// differs (see package.json), so the motion never diverges between formats.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="RegisterLinearizes"
      component={RegisterLinearizes}
      durationInFrames={360}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="JournalLinearizes"
      component={JournalLinearizes}
      durationInFrames={240}
      fps={FPS}
      width={W}
      height={H}
    />
  </>
);
