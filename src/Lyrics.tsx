// Word-synced lyric typography. Style comes from the shot the line starts in.
// Lines hand off smoothly: the outgoing line drifts up and fades while the next one's words arrive.
import React from "react";
import { AbsoluteFill } from "remotion";
import { LINES, type Line } from "./data/timeline";
import { SHOTS } from "./shots";
import { C, mono, serif } from "./theme";
import { clamp, easeInOut, easeOut, useTime } from "./lib";

const HOLD = 0.55; // seconds a line lingers after its last word
const HANDOFF = 0.2; // seconds the previous line takes to leave when a new one starts (6 frames: no pop, no stacking)

type Mode = "whisper" | "center" | "robot" | "none";

const modeFor = (l: Line): Mode => {
  const probe = l.start + 0.3; // a line that starts a hair before a cut belongs to the next shot
  const s = SHOTS.find((x) => probe >= x.a && probe < x.b);
  if (s?.lyric === "none") return "none"; // the scene draws this line itself
  if (l.voice === "robot") return "robot";
  return s?.lyric ?? "whisper";
};

const WordSpan: React.FC<{
  w: string;
  s: number;
  t: number;
  color: string;
}> = ({ w, s, t, color }) => {
  const p = clamp((t - s + 0.04) / 0.24);
  const e = easeOut(p);
  return (
    <span
      style={{
        display: "inline-block",
        opacity: e,
        transform: `translateY(${(1 - e) * 18}px)`,
        filter: p < 1 ? `blur(${(1 - e) * 8}px)` : undefined,
        color,
        marginRight: "0.26em",
      }}
    >
      {w}
    </span>
  );
};

const LyricLine: React.FC<{
  line: Line;
  mode: Mode;
  t: number;
  fade: number;
  lift: number;
}> = ({ line, mode, t, fade, lift }) => {
  // natural end-of-line fade (after HOLD) combined with the hand-off fade
  const out = clamp((line.end + HOLD - t) / 0.3) * fade;
  if (out <= 0.001) return null;
  const words = line.words.map((w, i) => (
    <WordSpan
      key={i}
      w={w.w}
      s={w.s}
      t={t}
      color={mode === "robot" ? C.red : C.bone}
    />
  ));
  const move = {
    opacity: out,
    transform: `translateY(${-lift}px)`,
    filter: lift > 0.5 ? `blur(${lift / 6}px)` : undefined,
  };
  if (mode === "robot") {
    return (
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 150,
          ...move,
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 30,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: C.dim, marginRight: 18 }}>system ·</span>
          {words}
        </div>
      </AbsoluteFill>
    );
  }
  if (mode === "center") {
    return (
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", ...move }}
      >
        <div
          style={{
            fontFamily: serif,
            fontStyle: "italic",
            fontSize: 112,
            lineHeight: 1.05,
            color: C.bone,
            textAlign: "center",
            maxWidth: 1500,
            textShadow: "0 6px 40px rgba(0,0,0,0.8)",
          }}
        >
          {words}
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-start",
        padding: "0 0 150px 130px",
        ...move,
      }}
    >
      <div
        style={{
          fontFamily: serif,
          fontStyle: "italic",
          fontSize: 70,
          lineHeight: 1.1,
          color: C.bone,
          maxWidth: 1250,
          textShadow: "0 4px 30px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)",
        }}
      >
        {words}
      </div>
    </AbsoluteFill>
  );
};

export const Lyrics: React.FC = () => {
  const t = useTime();
  const active = LINES.filter((l) => t >= l.start - 0.05 && t <= l.end + HOLD);
  if (!active.length) return null;
  const line = active[active.length - 1];
  const prev = active.length > 1 ? active[active.length - 2] : undefined;
  const nodes: React.ReactNode[] = [];
  if (prev) {
    const mPrev = modeFor(prev);
    const k = easeInOut(clamp((t - line.start + 0.05) / HANDOFF));
    if (mPrev !== "none")
      nodes.push(
        <LyricLine
          key="prev"
          line={prev}
          mode={mPrev}
          t={t}
          fade={1 - k}
          lift={k * 40}
        />,
      );
  }
  const mode = modeFor(line);
  if (mode !== "none")
    nodes.push(
      <LyricLine key="cur" line={line} mode={mode} t={t} fade={1} lift={0} />,
    );
  return <>{nodes}</>;
};
