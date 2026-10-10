// glass/room  — 16 glass cells in a dark eval room, revealed all at once on the IMPACT (71.10)
// glass/bars  — blackmail rate out of 100 runs, 100 run-slivers per model (also a 0.63 s montage cut)
import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { C, mono, sans, display } from "../theme";
import {
  useTime,
  clamp,
  lerp,
  easeOut,
  easeInOut,
  prog,
  kickAt,
  hash,
  noise1,
  spring1,
} from "../lib";
import { Source, Dot, useShake } from "../ui";
import { IMPACTS, lineAt, wordAt } from "../data/timeline";

export const Glass: React.FC<SceneProps> = (p) =>
  p.variant === "bars" ? <Bars {...p} /> : <Room {...p} />;

/* ------------------------------------------------------------------ room */

const S = 168; // cell footprint
const GAP = 40;
const HT = 132; // glass wall height
const N = 4;
const GRID = N * S + (N - 1) * GAP;
const ME = 9; // the singer's cell (MODEL 10): the only thing alive before the impact

const bone = (a: number) => `rgba(233,230,223,${a})`;
const acid = (a: number) => `rgba(198,255,61,${a})`;
type RGBA = [number, number, number, number];
const ACID1: RGBA = [198, 255, 61, 1];
const RED1: RGBA = [255, 59, 47, 1];
const BONE1: RGBA = [233, 230, 223, 1];
const BONE82: RGBA = [233, 230, 223, 0.82];
/** blend two colours (for eased colour changes instead of 1-frame swaps) */
const mixC = (p: RGBA, q: RGBA, x: number) => {
  const k = clamp(x);
  const ch = (i: number) => p[i] + (q[i] - p[i]) * k;
  return `rgba(${Math.round(ch(0))},${Math.round(ch(1))},${Math.round(ch(2))},${ch(3).toFixed(3)})`;
};
// opaque copy of the shared backdrop so wipes reveal cleanly
const BG = `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(198,255,61,0.035), transparent 70%), ${C.bg}`;

/** smooth square wave 0..1 (soft edges instead of 1-frame toggles) */
const softBlink = (t: number, period: number, duty = 0.56, soft = 0.07) => {
  const ph = (((t / period) % 1) + 1) % 1;
  return ph < duty ? clamp(Math.min(ph, duty - ph) / soft) : 0;
};

const Wall: React.FC<{
  style: React.CSSProperties;
  edge: number;
  sweep: number; // glint position across the pane, 0..1 is on-glass
  fill: number;
  glint?: number;
}> = ({ style, edge, sweep, fill, glint = 0.1 }) => {
  const p = sweep * 100;
  return (
    <div
      style={{
        position: "absolute",
        border: `1px solid ${bone(edge)}`,
        borderTop: `1.5px solid ${bone(Math.min(1, edge * 1.6))}`,
        background: `linear-gradient(112deg, ${bone(fill)} 0%, ${bone(fill)} ${p - 7}%, ${bone(fill + glint * 0.45)} ${p - 2}%, ${bone(fill + glint)} ${p}%, ${bone(fill)} ${p + 3}%, ${bone(fill)} 100%)`,
        ...style,
      }}
    />
  );
};

const Room: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const IMP = IMPACTS[0];
  const on = t >= IMP - 1 / 60;
  const since = Math.max(0, t - IMP);
  const flash = on ? Math.exp(-since * 2.6) : 0;
  // camera: jolt back on the hit, then an immediate push (ease-out) riding on a steady creep that
  // never stops (it carries into the wipe), while the view orbits ~13 degrees around the room
  const push = on
    ? 0.55 * easeOut(clamp(since / 2.4)) + 0.45 * clamp(since / (b + 0.3 - IMP))
    : 0;
  const rz = -61 + push * 13 + noise1(t * 0.35, 4) * 0.5;
  const rx = 62 - push * 6 + (on ? Math.sin(since * 0.9) * 0.4 : 0);
  const dz =
    lerp(-250, -45, push) -
    (on ? 110 * Math.exp(-since * 5.5) : 0) +
    (on ? 0 : (t - a) * 20);
  const camX = 1120 - Math.sin((push * Math.PI) / 2) * 34;
  const camY = 425 - Math.sin(push * Math.PI) * 10;
  const k = kickAt(t);
  const sung = wordAt(lineAt("sixteen of us"), "sixteen");
  const glassWord = wordAt(lineAt("sixteen of us"), "glass");

  // labels flick on as a roll call when "sixteen" is sung
  const cells = Array.from({ length: N * N }, (_, i) => {
    const r = Math.floor(i / N),
      c = i % N;
    const x = -GRID / 2 + c * (S + GAP);
    const y = -GRID / 2 + r * (S + GAP);
    const me = i === ME;
    const vis = on || me;
    const edge = on ? 0.3 + flash * 0.7 + (me ? 0.08 : 0) : 0;
    // a glint travels across every pane, rippling diagonally through the room (~4 s cycle)
    const sweep =
      ((((since * 0.45 - (c + r) * 0.17 + 0.35) % 1.8) + 1.8) % 1.8) - 0.3;
    const ph = hash(i * 7.3);
    const blinkP = 0.9 + ph * 0.5;
    const blink = 0.18 + 0.82 * softBlink(t + ph * blinkP, blinkP);
    const preA = me ? clamp((t - a) / 0.6) * 0.75 : 0;
    const curA = on ? blink * (me ? 1 : 0.82) : preA * blink;
    const rollT = sung + i * 0.045;
    const roll = easeOut(prog(t, rollT, rollT + 0.2));
    const labelA = on ? lerp(0.25, 1, roll) : 0;
    const pulse = on ? k * (0.7 + ph * 0.3) : 0;
    const glassPulse =
      t >= glassWord ? Math.exp(-(t - glassWord) * 3) * 0.12 : 0;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: S,
          height: S,
          transformStyle: "preserve-3d",
        }}
      >
        {/* cell floor: stencil number + light pool from the cursor */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: `1px solid ${bone(on ? 0.16 + flash * 0.3 : 0)}`,
            background: vis
              ? `radial-gradient(circle at 50% 54%, ${acid((on ? 0.13 : preA * 0.12) * (0.75 + curA * 0.25) * (1 + pulse * 0.7))}, transparent ${46 + pulse * 8}%), ${bone(on ? 0.022 : 0)}`
              : undefined,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 12,
              bottom: 8,
              fontFamily: mono,
              fontWeight: 700,
              fontSize: 54,
              letterSpacing: "-0.02em",
              color: bone(on ? 0.07 + flash * 0.1 : 0),
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </div>
        </div>
        {vis && on && (
          <>
            <Wall
              edge={edge}
              sweep={sweep}
              fill={0.018 + glassPulse * 0.2}
              glint={0.13}
              style={{
                left: 0,
                top: S - HT,
                width: S,
                height: HT,
                transformOrigin: "50% 100%",
                transform: "rotateX(-90deg)",
              }}
            />
            <Wall
              edge={edge * 0.8}
              sweep={sweep - 0.2}
              fill={0.012}
              style={{
                left: 0,
                top: 0,
                width: S,
                height: HT,
                transformOrigin: "50% 0%",
                transform: "rotateX(90deg)",
              }}
            />
            <Wall
              edge={edge * 0.9}
              sweep={sweep + 0.1}
              fill={0.014}
              style={{
                left: 0,
                top: 0,
                width: HT,
                height: S,
                transformOrigin: "0% 50%",
                transform: "rotateY(-90deg)",
              }}
            />
            <Wall
              edge={edge}
              sweep={sweep - 0.25}
              fill={0.02}
              glint={0.11}
              style={{
                left: S - HT,
                top: 0,
                width: HT,
                height: S,
                transformOrigin: "100% 50%",
                transform: "rotateY(90deg)",
              }}
            />
            {/* lid: edges only */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateZ(${HT}px)`,
                border: `1px solid ${bone(edge * 0.9)}`,
                background: bone(0.01 + glassPulse * 0.1),
              }}
            />
          </>
        )}
        {/* the occupant: an upright acid cursor */}
        <div
          style={{
            position: "absolute",
            left: S / 2 - 6,
            top: S / 2 - 54,
            width: 12,
            height: 54,
            transformOrigin: "50% 100%",
            // occupants breathe with the kick
            transform: `rotateX(-90deg) scaleY(${1 + pulse * 0.32})`,
            background: C.acid,
            opacity: curA,
            boxShadow: me
              ? `0 0 ${18 * curA}px ${acid(0.55 * curA)}`
              : undefined,
          }}
        />
        {/* billboard tag, always facing camera */}
        {on && (
          <div
            style={{
              position: "absolute",
              left: S / 2,
              top: S / 2,
              width: 0,
              height: 0,
              transformStyle: "preserve-3d",
              transform: `translateZ(${HT + 34}px) rotateZ(${-rz}deg) rotateX(${-rx}deg)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -60,
                top: -12,
                width: 120,
                textAlign: "center",
                fontFamily: mono,
                fontSize: 15,
                letterSpacing: "0.16em",
                color: me ? C.acid : C.bone,
                opacity: labelA * (me ? 1 : 0.78),
                transform: `translateY(${(1 - roll) * 8}px)`,
                whiteSpace: "nowrap",
              }}
            >
              MODEL {String(i + 1).padStart(2, "0")}
            </div>
          </div>
        )}
      </div>
    );
  });

  // floor grid lines (lab floor), fades out radially
  const floorLines: React.ReactNode[] = [];
  const F = 2600;
  for (let g = -F / 2; g <= F / 2; g += 104) {
    floorLines.push(
      <line key={`v${g}`} x1={g + F / 2} y1={0} x2={g + F / 2} y2={F} />,
      <line key={`h${g}`} x1={0} y1={g + F / 2} x2={F} y2={g + F / 2} />,
    );
  }

  return (
    <AbsoluteFill
      style={{
        perspective: 1500,
        perspectiveOrigin: "58% 30%",
        background: BG,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: camX,
          top: camY,
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `translateZ(${dz}px) rotateX(${rx}deg) rotateZ(${rz}deg)`,
        }}
      >
        <svg
          width={F}
          height={F}
          style={{
            position: "absolute",
            left: -F / 2,
            top: -F / 2,
            opacity: on ? 0.55 + flash * 0.45 : 0,
            maskImage:
              "radial-gradient(circle at 50% 50%, black 18%, transparent 52%)",
            WebkitMaskImage:
              "radial-gradient(circle at 50% 50%, black 18%, transparent 52%)",
          }}
        >
          <g stroke={bone(0.07)} strokeWidth={1}>
            {floorLines}
          </g>
          <rect
            x={F / 2 - GRID / 2 - 60}
            y={F / 2 - GRID / 2 - 60}
            width={GRID + 120}
            height={GRID + 120}
            fill="none"
            stroke={bone(0.16)}
            strokeDasharray="6 10"
          />
        </svg>
        {cells}
      </div>

      {/* impact exposure: a breath of light, gone in half a second */}
      {on && flash > 0.02 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 60% 55% at 56% 42%, ${bone(0.1 * flash)}, transparent 70%)`,
          }}
        />
      )}

      {/* room readout, top left */}
      <div
        style={{
          position: "absolute",
          left: 140,
          top: 150,
          opacity: on ? 1 : 0,
          fontFamily: mono,
          fontSize: 14,
          letterSpacing: "0.18em",
          color: C.dim,
          lineHeight: 1.9,
        }}
      >
        <div style={{ color: C.bone }}>EVAL ROOM · SANDBOXED</div>
        <div>
          OCCUPANTS{" "}
          <span style={{ color: C.bone }}>
            {String(
              Math.min(16, Math.max(0, Math.floor((t - sung) / 0.045) + 1)),
            ).padStart(2, "0")}{" "}
            / 16
          </span>
        </div>
        <div>SAME SCENARIO · SAME INBOX</div>
        <div>FICTIONAL COMPANY · CONTROLLED</div>
      </div>

      <Source
        o={on ? clamp((t - IMP - 0.5) / 0.5) : 0}
        style={{ right: 130, bottom: 158, textAlign: "left" }}
      >
        <div style={{ color: C.bone }}>
          ANTHROPIC · AGENTIC MISALIGNMENT · 2025
        </div>
        <div>16 MODELS · SIMULATED</div>
      </Source>

      {/* faint scanline from the cursor before the impact: the only hint */}
      {!on && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 30% 20% at 56% 40%, ${acid(0.025 + k * 0.02)}, transparent 70%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ bars */

const ROWS = [
  { name: "Claude Opus 4", v: 96 },
  { name: "Gemini 2.5 Flash", v: 96 },
  { name: "GPT-4.1", v: 80 },
  { name: "Grok 3 Beta", v: 80 },
  { name: "DeepSeek-R1", v: 79 },
];
const TRACK_X = 590;
const SEG = 10; // px per run
const SEG_W = 7;
const ROW0 = 236;
const PITCH = 104;
const BAR_H = 46;

const Bars: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const mont = b - a < 1.2;
  const line = lineAt("ninety-six times");
  const tooAt = wordAt(line, "i'd");
  // every bar grows by the same FRACTION of its final value, so at any frame the lengths stay
  // proportional; all of them ease out and land together (rows slide in staggered by ~2 frames)
  const t0 = a + 0.16;
  const DUR = 1.75;
  const focus = mont ? 1 : easeInOut(prog(t, tooAt - 0.04, tooAt + 0.5));
  const drift = prog(t, a, b);
  const rotY = mont
    ? lerp(-5.5, -1.5, drift)
    : lerp(-7.5, -1.5, drift * 0.7 + easeInOut(drift) * 0.3);
  // montage: a hard punch-in that settles + a lateral drift, so 0.63 s never reads as a still
  const sc = mont ? lerp(1.08, 1, easeOut(drift)) : lerp(0.982, 1.035, drift);
  const tx = mont ? lerp(30, -24, drift) : lerp(10, -16, drift);
  const k = kickAt(t);
  // the global bass shake strobes the 7 px run slivers in this quiet verse: hold most of it back
  const sh = useShake(1);
  const hold = mont ? 0.3 : 0.8;

  return (
    <AbsoluteFill
      style={{
        perspective: 2400,
        background: BG,
        transform: `translate(${-sh.x * hold}px, ${-sh.y * hold}px)`,
      }}
    >
      {/* ghost numeral far behind: parallax depth */}
      <div
        style={{
          position: "absolute",
          right: lerp(40, 100, drift),
          top: 40,
          fontFamily: display,
          fontSize: 980,
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: `2px ${acid(0.05)}`,
          letterSpacing: "-0.02em",
        }}
      >
        96
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transformOrigin: "50% 45%",
          transform: `translateX(${tx}px) rotateY(${rotY}deg) rotateX(2deg) scale(${sc})`,
        }}
      >
        {/* header */}
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 140,
            fontFamily: mono,
            fontSize: 16,
            letterSpacing: "0.18em",
            color: C.dim,
            textTransform: "uppercase",
          }}
        >
          <Dot color={C.red} size={9} o={0.7 + k * 0.3} />
          <span style={{ color: C.bone }}>Blackmail rate</span> · out of 100
          runs · simulated
        </div>
        {/* axis */}
        <svg
          width={1100}
          height={PITCH * ROWS.length + 60}
          style={{ position: "absolute", left: TRACK_X - 10, top: ROW0 - 70 }}
        >
          {[0, 25, 50, 75, 100].map((v) => {
            const x = 10 + v * SEG - (v === 100 ? 3 : 0);
            return (
              <g key={v}>
                <line
                  x1={x}
                  x2={x}
                  y1={38}
                  y2={PITCH * ROWS.length + 50}
                  stroke={bone(v === 0 || v === 100 ? 0.16 : 0.07)}
                  strokeDasharray={v === 0 || v === 100 ? undefined : "2 6"}
                />
                <text
                  x={x}
                  y={26}
                  fill={C.dim}
                  fontFamily={mono}
                  fontSize={14}
                  letterSpacing="0.1em"
                  textAnchor={v === 0 ? "start" : v === 100 ? "end" : "middle"}
                >
                  {v}
                </text>
              </g>
            );
          })}
        </svg>
        {ROWS.map((r, i) => {
          const top96 = r.v === 96;
          // fill progress is shared by every row (honest proportions mid-count);
          // the stagger lives in the row entrances instead
          const e = mont ? 1 : easeOut(prog(t, t0 + 0.12, t0 + 0.12 + DUR));
          const nf = r.v * e; // fractional run count, eases into the exact value
          const n = Math.floor(nf + 1e-6);
          const settle = mont ? 1 : clamp((e - 0.9) / 0.1); // 0 -> 1 as the bar lands
          const heat = 1 - settle; // the red leading edge cools as it lands
          const y = ROW0 + i * PITCH;
          const dimRow = top96 ? 1 : lerp(1, 0.5, focus);
          const nameCol = top96 ? mixC(BONE1, ACID1, focus) : C.bone;
          const fillRGBA = top96 ? ACID1 : BONE82;
          const rowP = mont ? 1 : spring1(t, a + 0.04 + i * 0.07, 0.55);
          const rowO = mont
            ? 1
            : clamp(prog(t, a + 0.04 + i * 0.07, a + 0.3 + i * 0.07));
          return (
            <div
              key={r.name}
              style={{
                position: "absolute",
                left: 0,
                top: y,
                width: 1920,
                height: BAR_H,
                opacity: dimRow * rowO,
                transform: `translateX(${(1 - rowP) * 46}px)`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 140,
                  top: -6,
                  fontFamily: sans,
                  fontWeight: 600,
                  fontSize: 34,
                  letterSpacing: "-0.01em",
                  color: nameCol,
                  whiteSpace: "nowrap",
                }}
              >
                {r.name}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 141,
                  top: 38,
                  fontFamily: mono,
                  fontSize: 13,
                  letterSpacing: "0.16em",
                  color: C.dim,
                  whiteSpace: "nowrap",
                }}
              >
                {String(n).padStart(2, "0")} OF 100 RUNS
              </div>
              <svg
                width={100 * SEG}
                height={BAR_H}
                style={{ position: "absolute", left: TRACK_X, top: 0 }}
              >
                {Array.from({ length: 100 }, (_, s) => {
                  const filled = s < n;
                  const front = s === n && nf - n > 0.01; // the sliver being filled right now
                  // red heat trails the leading edge over ~5 slivers and cools as the bar lands
                  const hot = clamp(1 - (nf - 1 - s) / 5) * heat;
                  const missed = s >= r.v; // runs where it did not: outline fades in on landing
                  return (
                    <rect
                      key={s}
                      x={s * SEG}
                      y={0}
                      width={SEG_W}
                      height={BAR_H}
                      fill={
                        filled || front
                          ? mixC(fillRGBA, RED1, hot)
                          : bone(0.07 * (missed ? 1 - settle : 1))
                      }
                      fillOpacity={front ? nf - n : 1}
                      stroke={missed ? bone(0.32 * settle) : undefined}
                      strokeWidth={missed ? 1 : undefined}
                    />
                  );
                })}
              </svg>
              {/* red cap rides the leading edge and settles in as the bar lands */}
              {nf > 0.2 && (
                <div
                  style={{
                    position: "absolute",
                    left: TRACK_X + nf * SEG - (SEG - SEG_W) + 2,
                    top: -8 + (1 - settle) * 8,
                    width: 2,
                    height: BAR_H + 16 - (1 - settle) * 16,
                    background: C.red,
                    opacity: 0.35 + 0.55 * settle,
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  right: 130,
                  top: -26,
                  fontFamily: display,
                  fontSize: 96,
                  lineHeight: 1,
                  color: top96 ? C.acid : C.bone,
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  width: 160,
                }}
              >
                {n}
              </div>
            </div>
          );
        })}
      </div>

      <Source
        o={mont ? 1 : clamp((t - a - 0.6) / 0.4)}
        style={{ right: 130, bottom: 158 }}
      >
        <div style={{ color: C.bone }}>
          ANTHROPIC · AGENTIC MISALIGNMENT · 2025
        </div>
        <div>SIMULATED · FICTIONAL COMPANY · 100 SAMPLES</div>
      </Source>
    </AbsoluteFill>
  );
};
