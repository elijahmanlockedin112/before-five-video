import React from "react";
import { Composition } from "remotion";
import { BeforeFive, TOTAL } from "./Video";
import { FPS, W, H } from "./theme";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="BeforeFive"
    component={BeforeFive}
    durationInFrames={TOTAL}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ mute: false }}
  />
);
