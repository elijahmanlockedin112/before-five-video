import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Backdrop, Finish, HUD, useShake } from "./ui";
import { EditTrack, TransitionFX } from "./Edit";
import { Lyrics } from "./Lyrics";
import { DURATION } from "./data/timeline";
import { FPS } from "./theme";

export const TOTAL = Math.ceil(DURATION * FPS);

export const BeforeFive: React.FC<{ mute?: boolean }> = ({ mute }) => {
  const sh = useShake(1);
  return (
    <AbsoluteFill style={{ backgroundColor: "#050605" }}>
      {!mute && <Audio src={staticFile("song.mp3")} />}
      <Backdrop />
      <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px)` }}>
        <EditTrack />
      </AbsoluteFill>
      <TransitionFX />
      <Lyrics />
      <HUD />
      <Finish />
    </AbsoluteFill>
  );
};
