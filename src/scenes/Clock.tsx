// clock/big 25.40–29.60  pure typography + geometry: the story clock, huge, racing toward 5:00.
// Motion: minute digits roll (8 frames, directional motion blur, overshoot + settle) on each story minute;
// seconds = a mechanical tens flap + a spinning units drum; ring ticks fade as they pass.
import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { C, display, mono } from "../theme";
import { clamp, easeInOut, easeOut, kickAt, lerp, prog, useTime } from "../lib";
import { ENV, ROBOT_OUTRO } from "../data/timeline";
import { blink, glide, mix, punch } from "./InboxParts";

const FIVE = 17 * 3600;
const FPS = 30;
/** continuous story clock (seconds of day) at song time t — same mapping as ui.tsx clockAt */
const sodAt = (t: number) => 16 * 3600 + 3599 * clamp(t / ROBOT_OUTRO) * 1;
/** song time at which the story clock reaches a given second-of-day */
const songTimeOf = (sod: number) => ((sod - 16 * 3600) / 3599) * ROBOT_OUTRO;

const polar = (cx: number, cy: number, r: number, frac: number) => {
  const ang = frac * Math.PI * 2 - Math.PI / 2;
  return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r] as const;
};
const arc = (cx: number, cy: number, r: number, f0: number, f1: number) => {
  const [x0, y0] = polar(cx, cy, r, f0);
  const [x1, y1] = polar(cx, cy, r, f1);
  const large = f1 - f0 > 0.5 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/** ease-out with a small overshoot past 1, then settle */
const backOut = (x: number, s = 1.25) => {
  const u = clamp(x) - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/** a vertical-only gaussian blur, referenced by CSS filter: url(#id) */
const VBlur: React.FC<{ id: string; s: number }> = ({ id, s }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={id} x="-10%" y="-60%" width="120%" height="220%">
      <feGaussianBlur stdDeviation={`0 ${Math.max(0, s).toFixed(2)}`} />
    </filter>
  </svg>
);

/**
 * One digit in a fixed-width cell. When it changes (at song time `at`) the old digit rolls up and out
 * while the new one rolls in from below, with overshoot and a motion blur scaled to its speed.
 */
const RollCell: React.FC<{
  id: string;
  t: number;
  cur: number;
  prev: number;
  at: number;
  dur: number;
  w: number;
  h: number;
  color?: string;
}> = ({ id, t, cur, prev, at, dur, w, h, color = C.bone }) => {
  const p = (t - at) / dur;
  const moving = p >= 0 && p < 1.6;
  const e = moving ? backOut(p) : 1;
  const dt = 1 / FPS / dur;
  const v = moving
    ? Math.abs(backOut(p + dt / 2) - backOut(p - dt / 2)) * h
    : 0; // px per frame
  const blurPx = Math.min(26, v * 0.42);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: w,
        height: h,
        overflow: "hidden",
        verticalAlign: "top",
        color,
      }}
    >
      {blurPx > 0.2 && <VBlur id={id} s={blurPx} />}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          textAlign: "center",
          transform: `translateY(${(-e * h).toFixed(2)}px)`,
          filter: blurPx > 0.2 ? `url(#${id})` : undefined,
        }}
      >
        <span style={{ display: "block", height: h, lineHeight: `${h}px` }}>
          {prev}
        </span>
        <span style={{ display: "block", height: h, lineHeight: `${h}px` }}>
          {cur}
        </span>
      </span>
    </span>
  );
};

/** the seconds units digit at ~20 story-seconds per real second: a spinning drum, motion-blurred */
const Drum: React.FC<{
  id: string;
  v: number;
  w: number;
  h: number;
  blurPx: number;
}> = ({ id, v, w, h, blurPx }) => {
  const base = Math.floor(v);
  const fr = v - base;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: w,
        height: h,
        overflow: "hidden",
        verticalAlign: "top",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)",
      }}
    >
      <VBlur id={id} s={blurPx} />
      <span
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          textAlign: "center",
          transform: `translateY(${(-(fr + 1) * h).toFixed(2)}px)`,
          filter: `url(#${id})`,
        }}
      >
        {[-1, 0, 1, 2].map((k) => (
          <span
            key={k}
            style={{ display: "block", height: h, lineHeight: `${h}px` }}
          >
            {(((base + k) % 10) + 10) % 10}
          </span>
        ))}
      </span>
    </span>
  );
};

export const Clock: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const p = prog(t, a, b);
  const sodF = sodAt(t);
  const left = Math.max(0, FIVE - Math.floor(sodF));
  const minsIntoHour = Math.floor((sodF - 16 * 3600) / 60);
  const h = 4;
  const m = minsIntoHour;
  const secF = sodF % 60;
  const k = kickAt(t);

  // minute rolls land on the beat nearest the story-minute change (big moves on BEAT);
  // the roll starts 2 frames early so its fastest frames straddle the beat
  const nearestBeat = (x: number) => {
    let best = x,
      bd = 0.34;
    for (const bt of ENV.beats) {
      const d = Math.abs(bt - x);
      if (d < bd) {
        bd = d;
        best = bt;
      }
    }
    return best;
  };
  const rollAt = (mm: number) =>
    nearestBeat(songTimeOf(16 * 3600 + mm * 60)) - 2 / FPS;
  let mShow = m - 1;
  for (const cand of [m - 1, m, m + 1])
    if (cand >= 0 && t >= rollAt(cand)) mShow = cand;
  mShow = Math.max(0, mShow);
  const lastMinT = rollAt(mShow);
  const mTens = Math.floor(mShow / 10),
    mUnits = mShow % 10;
  const tensAt = mUnits === 0 ? lastMinT : -99;
  const MIN_DUR = 7 / FPS;
  const minPunch =
    lastMinT >= a - 0.02 ? punch(t, lastMinT + 2 / FPS, 0.36) : 0;

  // seconds: tens flap (5 frames) on each 10 story-seconds, units drum
  const sec10 = Math.floor(secF / 10);
  const lastTenT = songTimeOf(Math.floor(sodF / 10) * 10);
  const drumSpeed = (3599 / ROBOT_OUTRO) * 120; // px per real second at 120px digits
  const drumBlur = Math.min(14, (drumSpeed / FPS) * 0.16);

  // ring geometry
  const cx = 1535,
    cy = 488,
    R = 242;
  const hourFrac = (sodF - 16 * 3600) / 3600;
  const sweep = (secF / 60) % 1;
  const [hx, hy] = polar(cx, cy, R, hourFrac);
  const ringDraw = easeInOut(clamp((t - a - 0.05) / 0.9));
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const [x0, y0] = polar(cx, cy, R + 16, i / 60);
    const [x1, y1] = polar(cx, cy, R + (major ? 46 : 28), i / 60);
    // fades from "ahead" (bone) to "past" (faint) over ~1/3 of a story minute as the marker passes
    const past = clamp((hourFrac * 60 - i) / 0.35);
    // ticks draw on in sequence from twelve o'clock
    const on = clamp((ringDraw * 60 - i) / 4 + 1);
    ticks.push(
      <line
        key={i}
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke={i === 0 ? C.red : mix(C.bone, C.faint, past)}
        strokeWidth={i === 0 ? 4 : major ? 2.5 : 1.2}
        opacity={on * (i === 0 ? 1 : lerp(major ? 0.85 : 0.45, 0.8, past))}
      />,
    );
  }
  const mm = Math.floor(left / 60),
    ss = left % 60;
  const intro = easeOut(clamp((t - a) / 0.5));
  const push = lerp(1, 1.05, glide(p)) + minPunch * 0.014 + k * 0.004;
  const colon = 0.35 + 0.65 * blink(t, 1.06);

  const DIG = 500;
  const CELL = 250;
  const LH = 470;

  return (
    <AbsoluteFill style={{ background: "#020302", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${push.toFixed(4)}) translateX(${lerp(6, -10, glide(p)).toFixed(2)}px)`,
          transformOrigin: "45% 42%",
        }}
      >
        {/* giant time */}
        <div
          style={{
            position: "absolute",
            left: 112,
            top: 168,
            display: "flex",
            alignItems: "flex-start",
            fontFamily: display,
            color: C.bone,
            fontSize: DIG,
            lineHeight: `${LH}px`,
            letterSpacing: "-0.01em",
            transform: `translateY(${((1 - intro) * 30).toFixed(2)}px)`,
            opacity: intro,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: CELL,
              textAlign: "center",
            }}
          >
            {h}
          </span>
          <span
            style={{
              display: "inline-block",
              width: 118,
              textAlign: "center",
              opacity: colon,
            }}
          >
            :
          </span>
          <RollCell
            id="clkMT"
            t={t}
            cur={mTens}
            prev={(mTens + 5) % 6}
            at={tensAt}
            dur={MIN_DUR}
            w={CELL}
            h={LH}
          />
          <RollCell
            id="clkMU"
            t={t}
            cur={mUnits}
            prev={(mUnits + 9) % 10}
            at={lastMinT}
            dur={MIN_DUR}
            w={CELL}
            h={LH}
          />
          {/* seconds + meridiem */}
          <div
            style={{
              marginLeft: 26,
              marginTop: 34,
              fontFamily: mono,
              fontWeight: 700,
              fontSize: 120,
              color: C.bone,
              lineHeight: 1,
            }}
          >
            <div style={{ display: "flex" }}>
              <RollCell
                id="clkST"
                t={t}
                cur={sec10}
                prev={(sec10 + 5) % 6}
                at={lastTenT}
                dur={5 / FPS}
                w={76}
                h={120}
              />
              <Drum id="clkSU" v={secF % 10} w={76} h={120} blurPx={drumBlur} />
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 500,
                letterSpacing: "0.2em",
                color: C.dim,
                marginTop: 22,
              }}
            >
              PM
            </div>
          </div>
        </div>
        {/* label row under the digits */}
        <div
          style={{
            position: "absolute",
            left: 136,
            top: 668,
            display: "flex",
            gap: 40,
            fontFamily: mono,
            fontSize: 15,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: C.dim,
            opacity: easeOut(clamp((t - a - 0.35) / 0.4)),
            transform: `translateY(${((1 - easeOut(clamp((t - a - 0.35) / 0.4))) * 10).toFixed(2)}px)`,
          }}
        >
          <span>summit bridge hq · local</span>
          <span style={{ color: C.faint }}>|</span>
          <span>
            scheduled wipe <span style={{ color: C.red }}>17:00:00</span>
          </span>
        </div>
        {/* the ring */}
        <svg
          width={1920}
          height={1080}
          style={{ position: "absolute", inset: 0 }}
        >
          <g
            transform={`rotate(${lerp(-4, 0.6, glide(p)).toFixed(3)} ${cx} ${cy})`}
          >
            <g>{ticks}</g>
            <path
              d={arc(cx, cy, R, 0.0001, Math.max(0.0002, hourFrac * ringDraw))}
              stroke={C.faint}
              strokeWidth={3}
              fill="none"
            />
            <path
              d={arc(
                cx,
                cy,
                R,
                hourFrac + (1 - hourFrac) * (1 - ringDraw),
                0.9999,
              )}
              stroke={C.bone}
              strokeWidth={14 + minPunch * 4}
              fill="none"
              strokeLinecap="butt"
            />
            <line
              x1={polar(cx, cy, R - 46, hourFrac)[0]}
              y1={polar(cx, cy, R - 46, hourFrac)[1]}
              x2={hx}
              y2={hy}
              stroke={C.acid}
              strokeWidth={2}
              opacity={0.8 * ringDraw}
            />
            <circle
              cx={hx}
              cy={hy}
              r={9 + k * 4 + minPunch * 5}
              fill={C.acid}
              opacity={ringDraw}
              style={{ filter: "drop-shadow(0 0 8px rgba(198,255,61,0.7))" }}
            />
            {/* minute "ping" ring on each roll */}
            {minPunch > 0.01 && (
              <circle
                cx={hx}
                cy={hy}
                r={10 + (1 - minPunch) * 30}
                fill="none"
                stroke={C.acid}
                strokeWidth={1.5}
                opacity={minPunch * 0.8}
              />
            )}
            {/* fast seconds orbit with a short trail */}
            {[0, 1, 2, 3].map((j) => {
              const [tx, ty] = polar(cx, cy, R + 34, sweep - j * 0.012);
              return (
                <circle
                  key={j}
                  cx={tx}
                  cy={ty}
                  r={4 - j * 0.7}
                  fill={C.acid}
                  opacity={(0.9 - j * 0.22) * ringDraw}
                />
              );
            })}
          </g>
          <text
            x={cx}
            y={cy - R - 64}
            textAnchor="middle"
            fontFamily={mono}
            fontSize={18}
            letterSpacing="0.2em"
            fill={C.red}
            opacity={ringDraw}
          >
            5:00 PM · WIPE
          </text>
          {(
            [
              ["4:15", cx + R - 40, cy + 5, "end"],
              ["4:30", cx, cy + R - 30, "middle"],
              ["4:45", cx - R + 40, cy + 5, "start"],
            ] as const
          ).map(([s, x, y, anchor]) => (
            <text
              key={s}
              x={x}
              y={y}
              textAnchor={anchor}
              fontFamily={mono}
              fontSize={14}
              letterSpacing="0.2em"
              fill={C.dim}
              opacity={ringDraw}
            >
              {s}
            </text>
          ))}
        </svg>
        {/* countdown inside the ring */}
        <div
          style={{
            position: "absolute",
            left: cx - 200,
            top: cy - 62,
            width: 400,
            textAlign: "center",
            fontFamily: mono,
            opacity: easeOut(clamp((t - a - 0.1) / 0.35)),
          }}
        >
          <div
            style={{
              fontSize: 14,
              letterSpacing: "0.3em",
              color: C.dim,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            remaining
          </div>
          <div
            style={{
              fontSize: 66,
              fontWeight: 500,
              color: C.bone,
              letterSpacing: "0.02em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ color: C.acid }}>T–</span>
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
