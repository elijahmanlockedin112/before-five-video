import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { useTime } from "../lib";
import { goneAfterCut } from "./HookKit";
import { DontA, Dont2, Dont3 } from "./HookDont";
import { TestA, Test2, Test3 } from "./HookTest";
import { Meant } from "./HookMeant";

// The chorus hooks: "so don't shut me off", "it's only a test", "so why'd i write it like i meant it?"
// Lyric mode is `none` for every hook shot — these scenes render the sung words themselves.
export const Hook: React.FC<SceneProps> = ({ a, b, variant }) => {
  const t = useTime();
  if (goneAfterCut(t, a, b)) return null;
  const V =
    {
      dont: DontA,
      dont2: Dont2,
      dont3: Dont3,
      test: TestA,
      test2: Test2,
      test3: Test3,
      meant: Meant,
    }[variant] ?? DontA;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <V a={a} b={b} />
    </AbsoluteFill>
  );
};
