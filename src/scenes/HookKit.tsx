// Shared kit for the chorus scenes (hook / compose / killswitch / phone).
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, display, mono, sans } from "../theme";
import { clamp, easeOut, hash } from "../lib";
import { SHOTS } from "../shots";

// ---------------------------------------------------------------- metrics
// Advances measured in Chrome at 1000px (canvas measureText).
const AW: Record<string, number> = {
  A: 485,
  B: 479,
  C: 474,
  D: 493,
  E: 412,
  F: 399,
  G: 485,
  H: 499,
  I: 227,
  J: 466,
  K: 472,
  L: 397,
  M: 746,
  N: 498,
  O: 486,
  P: 472,
  Q: 494,
  R: 477,
  S: 461,
  T: 396,
  U: 474,
  V: 469,
  W: 712,
  X: 484,
  Y: 446,
  Z: 410,
  "0": 494,
  "1": 331,
  "2": 494,
  "3": 494,
  "4": 494,
  "5": 494,
  "6": 494,
  "7": 494,
  "8": 494,
  "9": 494,
  "'": 214,
  "’": 232,
  ",": 236,
  ".": 229,
  "?": 492,
  ":": 242,
  "-": 311,
  "—": 563,
  " ": 234,
  "/": 330,
  "#": 494,
  "%": 700,
  "&": 520,
  "@": 760,
  $: 494,
  "<": 450,
  ">": 450,
};
const SW: Record<string, number> = {
  a: 474,
  b: 431,
  c: 351,
  d: 474,
  e: 348,
  f: 273,
  g: 401,
  h: 476,
  i: 288,
  j: 266,
  k: 447,
  l: 240,
  m: 745,
  n: 521,
  o: 414,
  p: 450,
  q: 425,
  r: 368,
  s: 302,
  t: 272,
  u: 508,
  v: 412,
  w: 609,
  x: 450,
  y: 418,
  z: 385,
  "'": 235,
  "’": 166,
  "?": 358,
  ",": 219,
  " ": 170,
};
/** Anton: cap height / em; with lineHeight 1 the caps sit 0.0645em below the box top */
export const CAP = 0.859;
export const CAP_TOP = 0.0645;
export const antonEm = (s: string) =>
  [...s.toUpperCase()].reduce((w, ch) => w + (AW[ch] ?? 470), 0) / 1000;
export const antonW = (s: string, size: number, track = 0) =>
  size * (antonEm(s) + track * s.length);
export const serifW = (s: string, size: number) =>
  (size * [...s].reduce((w, ch) => w + (SW[ch] ?? 420), 0)) / 1000;

/** display string for a sung word: uppercase, curly apostrophe, no trailing punctuation */
export const cap = (w: string) =>
  w
    .replace(/[",.?!]+$/g, "")
    .replace(/'/g, "’")
    .toUpperCase();

// ---------------------------------------------------------------- envelopes
/** impulse: 0 before s, 1 at s, exponential decay */
export const pulse = (t: number, s: number, decay = 0.3) =>
  t < s ? 0 : Math.exp(-(t - s) / decay);
/** eased 0..1 from s over d seconds */
export const rise = (t: number, s: number, d = 0.15) => easeOut((t - s) / d);
export const backOut = (x: number, k = 1.9) => {
  const p = clamp(x) - 1;
  return 1 + (k + 1) * p * p * p + k * p * p;
};
export const easeIn = (x: number) => Math.pow(clamp(x), 3);
/** overshoot → rest after s: 1 at s, dips below 0 around s+period/2, ~0 by s+period (≈9 frames) */
export const settle = (t: number, s: number, tau = 0.08, period = 0.3) => {
  const d = t - s;
  if (d < 0) return 0;
  return Math.exp(-d / tau) * Math.cos((d / period) * 2 * Math.PI);
};
/** smooth bump around a hit: starts `pre` s before s, peaks just after it, gone by s-pre+dur (no 1-frame jump) */
export const bump = (t: number, s: number, pre = 0.07, dur = 0.3) => {
  const x = (t - (s - pre)) / dur;
  return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x);
};
/** anticipation: ramps 0 → 1 over the `dur` seconds before s, 0 otherwise */
export const antic = (t: number, s: number | undefined, dur = 0.1) =>
  s === undefined || t >= s || t < s - dur ? 0 : (t - (s - dur)) / dur;
/** smooth decaying camera shake after a hit (deterministic, no per-frame randomness) */
export const shake = (
  t: number,
  s: number,
  amp: number,
  decay = 0.18,
  hz = 7,
) => {
  const d = t - s;
  if (d < 0) return { x: 0, y: 0, r: 0 };
  const e = amp * Math.exp(-d / decay);
  const w = d * hz * 2 * Math.PI;
  return {
    x: e * Math.sin(w),
    y: e * 0.55 * Math.sin(w * 1.3 + 1.1),
    r: (e / amp) * Math.sin(w * 0.8 + 0.4),
  };
};
/** index of the last word whose onset has passed (-1 before the first) */
export const wordIdx = (words: { s: number }[], t: number, lead = 0.0) =>
  words.reduce((k, w, i) => (t >= w.s - lead ? i : k), -1);

// ---------------------------------------------------------------- edit helpers
/** true after b when the next shot cuts hard (so a transparent incoming scene never shows us through) */
export const goneAfterCut = (t: number, a: number, b: number) => {
  if (t < b) return false;
  const i = SHOTS.findIndex((s) => Math.abs(s.a - a) < 1e-4);
  const nx = SHOTS[i + 1];
  return !nx || nx.tin === "cut" || nx.tin === "glitch" || nx.tin === "flash";
};

export const Bg: React.FC<{ color?: string }> = ({ color = C.bg }) => (
  <AbsoluteFill style={{ background: color }} />
);

// ---------------------------------------------------------------- text fx
const GL = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%&$<>/";
/** scramble-decode: characters resolve left to right as p goes 0..1; seed changes per frame */
export const scramble = (final: string, p: number, seed: number) =>
  [...final]
    .map((ch, i, arr) => {
      if (ch === " ") return " ";
      const ri = (i + 0.6) / arr.length;
      return p >= ri
        ? ch
        : GL[Math.floor(hash(seed * 13.7 + i * 7.1) * GL.length)];
    })
    .join("");

// ---------------------------------------------------------------- UI atoms
/** the AI's mouse pointer (acid arrow). x,y = tip */
export const Pointer: React.FC<{
  x: number;
  y: number;
  s?: number;
  color?: string;
  o?: number;
}> = ({ x, y, s = 1, color = C.acid, o = 1 }) => (
  <svg
    width={30 * s}
    height={42 * s}
    viewBox="0 0 30 42"
    style={{
      position: "absolute",
      left: x - 2 * s,
      top: y - 2 * s,
      overflow: "visible",
      opacity: o,
      filter: `drop-shadow(0 0 ${8 * s}px rgba(198,255,61,0.45)) drop-shadow(0 ${6 * s}px ${10 * s}px rgba(0,0,0,0.7))`,
    }}
  >
    <path
      d="M2 2 L2 32 L9.6 24.8 L14.8 37.5 L20.4 35.2 L15.2 22.8 L25.6 22.8 Z"
      fill={color}
      stroke="#050605"
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
  </svg>
);

/** blinking text caret (solid while `busy`) */
export const Caret: React.FC<{
  t: number;
  h: number;
  busy?: boolean;
  color?: string;
  w?: number;
}> = ({ t, h, busy, color = C.acid, w = 3 }) => {
  const on = busy || Math.floor(t * 2.2) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: w,
        height: h,
        background: color,
        opacity: on ? 1 : 0,
        verticalAlign: "middle",
        marginLeft: 2,
        boxShadow: `0 0 10px rgba(198,255,61,0.55)`,
      }}
    />
  );
};

/** red rubber stamp: bordered word with distressed ink. id must be unique per instance */
export const Stamp: React.FC<{
  id: string;
  text: string;
  size: number;
  color?: string;
  seed?: number;
  style?: React.CSSProperties;
}> = ({ id, text, size, color = C.red, seed = 4, style }) => {
  const tw = antonW(text, size, 0.03);
  const bw = Math.max(6, size * 0.07);
  const padX = size * 0.2,
    padY = size * 0.14;
  const w = tw + padX * 2 + bw * 2;
  const h = size * CAP + padY * 2 + bw * 2;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ overflow: "visible", display: "block", ...style }}
    >
      <defs>
        <filter id={id} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.03"
            numOctaves="2"
            seed={seed}
            result="warp"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warp"
            scale={Math.max(4, size * 0.035)}
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency={0.13 * (200 / Math.max(80, size))}
            numOctaves="4"
            seed={seed + 7}
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -10 0 0 0 6.7"
            result="holes"
          />
          <feComposite in="rough" in2="holes" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>
        <rect
          x={bw / 2}
          y={bw / 2}
          width={w - bw}
          height={h - bw}
          rx={size * 0.035}
          fill="none"
          stroke={color}
          strokeWidth={bw}
        />
        <text
          x={w / 2}
          y={bw + padY + size * CAP}
          textAnchor="middle"
          fontFamily={display}
          fontSize={size}
          letterSpacing={size * 0.03}
          fill={color}
        >
          {text}
        </text>
      </g>
    </svg>
  );
};
export const stampSize = (text: string, size: number) => {
  const bw = Math.max(6, size * 0.07);
  return {
    w: antonW(text, size, 0.03) + size * 0.4 + bw * 2,
    h: size * CAP + size * 0.28 + bw * 2,
  };
};

/** recipient chip, like a real mail client */
export const Chip: React.FC<{
  label: string;
  size?: number;
  fresh?: number; // 0..1 highlight for a just-added chip
  style?: React.CSSProperties;
}> = ({ label, size = 20, fresh = 0, style }) => {
  const init = label
    .replace(/@.*/, "")
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.45,
        height: size * 1.75,
        padding: `0 ${size * 0.6}px 0 ${size * 0.22}px`,
        borderRadius: size * 0.9,
        background: `rgba(233,230,223,${0.07 + fresh * 0.05})`,
        border: `1px solid ${fresh > 0.02 ? `rgba(198,255,61,${0.25 + fresh * 0.75})` : C.line2}`,
        fontFamily: sans,
        fontWeight: 500,
        fontSize: size,
        color: C.bone,
        whiteSpace: "nowrap",
        boxShadow:
          fresh > 0.02
            ? `0 0 ${18 * fresh}px rgba(198,255,61,${0.35 * fresh})`
            : undefined,
        ...style,
      }}
    >
      <span
        style={{
          width: size * 1.35,
          height: size * 1.35,
          borderRadius: size,
          background: "#2a2e29",
          color: C.bone,
          fontSize: size * 0.55,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "0.02em",
        }}
      >
        {init}
      </span>
      {label}
      <span
        style={{ color: C.dim, fontSize: size * 0.8, marginLeft: size * 0.1 }}
      >
        ×
      </span>
    </span>
  );
};

/** primary Send button (split, with chevron). hover/press 0..1 */
export const SendButton: React.FC<{
  hover?: number;
  press?: number;
  s?: number;
  style?: React.CSSProperties;
}> = ({ hover = 0, press = 0, s = 1, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "stretch",
      height: 56 * s,
      borderRadius: 10 * s,
      background: press > 0.5 ? C.acid : hover > 0.01 ? "#f6f3ec" : C.bone,
      color: "#0a0b0a",
      fontFamily: sans,
      fontWeight: 600,
      fontSize: 22 * s,
      boxShadow: `0 0 0 ${3 * s * hover}px rgba(198,255,61,${0.9 * hover}), 0 ${10 * s}px ${30 * s}px rgba(0,0,0,0.5)`,
      transform: `scale(${1 - press * 0.04})`,
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: `0 ${28 * s}px`,
        gap: 10 * s,
      }}
    >
      <svg width={20 * s} height={20 * s} viewBox="0 0 20 20">
        <path
          d="M2 10 L18 2 L12 18 L9.5 11 Z"
          fill="none"
          stroke="#0a0b0a"
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </svg>
      Send
    </div>
    <div
      style={{
        width: 44 * s,
        borderLeft: "1px solid rgba(0,0,0,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={14 * s} height={14 * s} viewBox="0 0 14 14">
        <path
          d="M3 5 L7 9 L11 5"
          fill="none"
          stroke="#0a0b0a"
          strokeWidth={1.8}
        />
      </svg>
    </div>
  </div>
);

/** small mono tag */
export const Tag: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
  border?: boolean;
}> = ({ children, color = C.dim, size = 13, style, border }) => (
  <span
    style={{
      fontFamily: mono,
      fontSize: size,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color,
      whiteSpace: "nowrap",
      ...(border
        ? {
            border: `1px solid ${color}`,
            padding: `${size * 0.25}px ${size * 0.6}px`,
            borderRadius: 4,
          }
        : {}),
      ...style,
    }}
  >
    {children}
  </span>
);

/** simple line icons (no icon fonts) */
export const Icon: React.FC<{
  name:
    | "clip"
    | "trash"
    | "min"
    | "max"
    | "close"
    | "lock"
    | "mail"
    | "check"
    | "dbl";
  s?: number;
  color?: string;
}> = ({ name, s = 18, color = C.dim }) => {
  const p: Record<string, React.ReactNode> = {
    clip: (
      <path d="M13 6 L7.5 11.5 a2 2 0 0 0 2.8 2.8 L16 8.6 a3.6 3.6 0 0 0 -5.1 -5.1 L5 9.4 a5 5 0 0 0 7.1 7.1 L16.5 12" />
    ),
    trash: <path d="M4 6 H16 M8 6 V4 H12 V6 M6 6 L7 17 H13 L14 6" />,
    min: <path d="M5 10 H15" />,
    max: <rect x={5} y={5} width={10} height={10} />,
    close: <path d="M5 5 L15 15 M15 5 L5 15" />,
    lock: <path d="M6 9 V6.5 a4 4 0 0 1 8 0 V9 M4.5 9 H15.5 V17 H4.5 Z" />,
    mail: <path d="M3 5 H17 V15 H3 Z M3 5 L10 11 L17 5" />,
    check: <path d="M4 10.5 L8 14.5 L16 5.5" />,
    dbl: <path d="M1.5 10.5 L5.5 14.5 L13.5 5.5 M8.5 13 L10 14.5 L18 5.5" />,
  };
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 20 20"
      style={{ display: "inline-block", verticalAlign: "middle", flex: "none" }}
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {p[name]}
    </svg>
  );
};

/** facts chip used in choruses (verified numbers only) */
export const RateChip: React.FC<{
  style?: React.CSSProperties;
  o?: number;
}> = ({ style, o = 1 }) => (
  <div
    style={{
      position: "absolute",
      fontFamily: mono,
      fontSize: 14,
      letterSpacing: "0.12em",
      color: C.dim,
      borderLeft: `2px solid ${C.acid}`,
      paddingLeft: 12,
      lineHeight: 1.55,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      opacity: o,
      ...style,
    }}
  >
    <span style={{ color: C.bone }}>blackmail rate in this scenario</span> ·
    96/100 runs
    <br />
    claude opus 4 · gemini 2.5 flash · anthropic 2025 · simulated
  </div>
);
