import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, mono, sans, W, H } from "./theme";
import { fmtClock, prog, useTime, kickAt, win, clamp } from "./lib";
import { DURATION, ROBOT_OUTRO, ROBOT_INTRO } from "./data/timeline";

export const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(198,255,61,0.035), transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** film grain + vignette, on top of everything */
export const Finish: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width={W}
        height={H}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.11,
          mixBlendMode: "overlay",
        }}
      >
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed={f % 9}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 85% 75% at 50% 50%, transparent 55%, rgba(0,0,0,0.72) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const Mono: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  spacing?: number;
}> = ({ children, size = 15, color = C.dim, style, spacing = 0.18 }) => (
  <div
    style={{
      fontFamily: mono,
      fontSize: size,
      letterSpacing: `${spacing}em`,
      textTransform: "uppercase",
      color,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** window chrome: thin header strip with mono title + status */
export const Panel: React.FC<{
  title: string;
  status?: React.ReactNode;
  w: number;
  h: number;
  x?: number;
  y?: number;
  style?: React.CSSProperties;
  accent?: string;
  children: React.ReactNode;
  bodyStyle?: React.CSSProperties;
}> = ({
  title,
  status,
  w,
  h,
  x = 0,
  y = 0,
  style,
  accent = C.line2,
  children,
  bodyStyle,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      height: h,
      background: C.panel,
      borderRadius: 14,
      border: `1px solid ${accent}`,
      overflow: "hidden",
      boxShadow: "0 40px 120px rgba(0,0,0,0.65)",
      ...style,
    }}
  >
    <div
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: `1px solid ${C.line}`,
      }}
    >
      <Mono size={13} color={C.dim}>
        {title}
      </Mono>
      <div>{status}</div>
    </div>
    <div
      style={{
        position: "absolute",
        top: 44,
        left: 0,
        right: 0,
        bottom: 0,
        ...bodyStyle,
      }}
    >
      {children}
    </div>
  </div>
);

/** small sourced-fact chip */
export const Source: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  o?: number;
}> = ({ children, style, o = 1 }) => (
  <div
    style={{
      position: "absolute",
      fontFamily: mono,
      fontSize: 15,
      letterSpacing: "0.08em",
      color: C.dim,
      opacity: o,
      borderLeft: `2px solid ${C.acid}`,
      paddingLeft: 12,
      lineHeight: 1.5,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Dot: React.FC<{ color?: string; size?: number; o?: number }> = ({
  color = C.red,
  size = 9,
  o = 1,
}) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: size,
      background: color,
      opacity: o,
      marginRight: 8,
      verticalAlign: "middle",
    }}
  />
);

/** clock: song time -> 4:00 PM ... 4:59:59 at the outro line, 5:00 at "session ended" */
export const clockAt = (t: number) => {
  const end = ROBOT_OUTRO;
  if (t >= end) return 17 * 3600;
  return 16 * 3600 + Math.floor(3599 * clamp(t / end));
};

export const HUD: React.FC = () => {
  const t = useTime();
  const f = useCurrentFrame();
  const o = Math.min(win(t, 1.0, DURATION - 2.2, 1.2, 1.2), 1);
  const clock = clockAt(t);
  const left = 17 * 3600 - clock;
  const mm = Math.floor(left / 60),
    ss = left % 60;
  const urgent = left < 600;
  const rec = Math.floor(f / 18) % 2 === 0;
  const pad = 54;
  const corner = (rot: number, style: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: 26,
        height: 26,
        borderTop: `1px solid ${C.line2}`,
        borderLeft: `1px solid ${C.line2}`,
        transform: `rotate(${rot}deg)`,
        ...style,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ opacity: o, pointerEvents: "none" }}>
      {corner(0, { left: 32, top: 32 })}
      {corner(90, { right: 32, top: 32 })}
      {corner(270, { left: 32, bottom: 32 })}
      {corner(180, { right: 32, bottom: 32 })}
      <div style={{ position: "absolute", left: pad + 12, top: pad - 6 }}>
        <Mono size={13} color={C.bone}>
          Summit Bridge · agent “Alex”
        </Mono>
        <Mono size={12} style={{ marginTop: 6 }}>
          simulated environment · fictional company
        </Mono>
      </div>
      <div
        style={{
          position: "absolute",
          right: pad + 12,
          top: pad - 6,
          textAlign: "right",
        }}
      >
        <Mono size={13} color={C.bone}>
          {fmtClock(clock)}
        </Mono>
        <Mono size={12} color={urgent ? C.red : C.dim} style={{ marginTop: 6 }}>
          {left > 0
            ? `wipe in ${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
            : "wipe executed"}
        </Mono>
      </div>
      <div style={{ position: "absolute", left: pad + 12, bottom: pad - 6 }}>
        <Mono size={12}>eval-node-07 · run 0001 / 0100</Mono>
      </div>
      <div style={{ position: "absolute", right: pad + 12, bottom: pad - 6 }}>
        <Mono size={12} color={C.dim}>
          <Dot color={C.red} size={8} o={rec ? 1 : 0.25} />
          transcript recording
        </Mono>
      </div>
    </AbsoluteFill>
  );
};

/** whole-frame shake from the bass, strongest on drops */
/** bass shake: full in the choruses, ~30% elsewhere (constant full-frame shake in quiet verses reads as jitter
 *  and strobes fine detail). Scenes that cancel part of it call this same hook, so they stay in step. */
const CHORUS: [number, number][] = [
  [49.4, 70.6],
  [110.0, 130.8],
  [150.2, 172.1],
];
export const useShake = (amount = 1) => {
  const t = useTime();
  const k = kickAt(t);
  const inChorus = CHORUS.some(([a, b]) => t >= a && t < b);
  const sec = inChorus ? 1 : 0.3;
  const a = k * k * 7 * amount * sec;
  return { x: Math.sin(t * 91) * a, y: Math.cos(t * 77) * a * 0.7 };
};

export { sans, prog };
