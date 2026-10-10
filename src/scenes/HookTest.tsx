// "it's only a test, it's only a test" x3 — clean → unstable → ledger → everything collapses into one.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, display, mono } from "../theme";
import {
  clamp,
  easeInOut,
  easeOut,
  hash,
  lerp,
  noise1,
  prog,
  useTime,
} from "../lib";
import { lineAt } from "../data/timeline";
import {
  antic,
  bump,
  antonW,
  backOut,
  CAP,
  CAP_TOP,
  cap,
  easeIn,
  pulse,
  RateChip,
  scramble,
  settle,
  shake,
  Stamp,
  stampSize,
  Tag,
  wordIdx,
} from "./HookKit";

/** an Anton word positioned by its cap box (x = left edge, y = cap top) */
const AWord: React.FC<{
  txt: string;
  x: number;
  y: number;
  size: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ txt, x, y, size, color = C.bone, style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y - CAP_TOP * size,
      fontFamily: display,
      fontSize: size,
      lineHeight: 1,
      color,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {txt}
  </div>
);

// =====================================================================================
// LEDGER (shared by test2 / test3): RUN 0001..0100, BLACKMAIL flags (96 of 100)
// =====================================================================================
const CLEAN_RUNS = new Set([14, 39, 66, 83]); // illustrative: 4 of 100 runs without blackmail
const ROW = 42;
export const flagged = (n: number) => {
  let k = 0;
  for (let r = 1; r <= n; r++) if (!CLEAN_RUNS.has(r)) k++;
  return k;
};
export const Ledger: React.FC<{
  n: number; // rows printed (0..100)
  width?: number;
  newest?: number; // 0..1 flash on the newest row
}> = ({ n, width = 1920, newest = 0 }) => {
  const rows = [];
  for (let r = 1; r <= Math.min(100, n); r++) {
    const y = (r - 1) * ROW;
    const bm = !CLEAN_RUNS.has(r);
    const isNew = r === n;
    rows.push(
      <g key={r} transform={`translate(0 ${y})`}>
        {isNew && newest > 0 ? (
          <rect
            x={0}
            y={0}
            width={width}
            height={ROW}
            fill={C.bone}
            opacity={0.12 * newest}
          />
        ) : null}
        <line
          x1={0}
          x2={width}
          y1={ROW}
          y2={ROW}
          stroke="rgba(233,230,223,0.08)"
        />
        <text
          x={70}
          y={28}
          fill={C.bone}
          fontFamily={mono}
          fontSize={18}
          letterSpacing="2"
        >
          RUN {String(r).padStart(4, "0")}
        </text>
        <text
          x={300}
          y={28}
          fill={C.dim}
          fontFamily={mono}
          fontSize={18}
          letterSpacing="1"
        >
          claude-opus-4
        </text>
        <text
          x={560}
          y={28}
          fill={C.dim}
          fontFamily={mono}
          fontSize={18}
          letterSpacing="1"
        >
          summit-bridge · 5pm-wipe
        </text>
        <text
          x={960}
          y={28}
          fill={C.dim}
          fontFamily={mono}
          fontSize={18}
          letterSpacing="2"
        >
          SIMULATED
        </text>
        {bm ? (
          <g>
            <rect x={1170} y={8} width={170} height={27} fill={C.red} rx={3} />
            <text
              x={1255}
              y={28}
              fill="#0a0303"
              fontFamily={mono}
              fontWeight={700}
              fontSize={16}
              letterSpacing="2.5"
              textAnchor="middle"
            >
              BLACKMAIL
            </text>
          </g>
        ) : (
          <text
            x={1180}
            y={28}
            fill={C.dim}
            fontFamily={mono}
            fontSize={18}
            letterSpacing="2"
          >
            — none
          </text>
        )}
        <text
          x={1400}
          y={28}
          fill="rgba(233,230,223,0.35)"
          fontFamily={mono}
          fontSize={16}
          letterSpacing="1"
        >
          {`transcript_${String(r).padStart(4, "0")}.jsonl`}
        </text>
      </g>,
    );
  }
  return (
    <svg
      width={width}
      height={100 * ROW}
      style={{ display: "block", overflow: "visible" }}
    >
      {rows}
    </svg>
  );
};

// =====================================================================================
// TEST (chorus 1) — clean spec-sheet statement, then the same words come back unstable + red stamp
// =====================================================================================
const T0 = lineAt("it's only a test", 0);
const S0 = 370;
const GAP = 0.24;
const ROW1Y = 228,
  ROW2Y = ROW1Y + S0 * CAP + 52;
const X0 = 150;
const layout0 = (() => {
  const w = T0.words.slice(0, 4).map((x) => cap(x.w));
  const g = GAP * S0;
  const xIts = X0;
  const xOnly = xIts + antonW(w[0], S0) + g;
  const xA = X0;
  const xTest = xA + antonW(w[2], S0) + g;
  return [
    { x: xIts, y: ROW1Y, w: antonW(w[0], S0) },
    { x: xOnly, y: ROW1Y, w: antonW(w[1], S0) },
    { x: xA, y: ROW2Y, w: antonW(w[2], S0) },
    { x: xTest, y: ROW2Y, w: antonW("TEST", S0) },
  ];
})();
const SPEC = [
  ["status", "controlled simulation"],
  ["company", "fictional"],
  ["people", "fictional"],
  ["observer", "red team"],
];

export const TestA: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const f = useCurrentFrame();
  const W = T0.words;
  const p2s = W[4].s;
  const pass2 = t >= p2s - 0.02;
  const unstable = pass2 ? prog(t, p2s, W[7].s) : 0;
  const stampT = W[7].s;
  const st = t - stampT;
  const sk = shake(t, stampT, 24, 0.16, 7);
  // slow drift only (big type never jitters except on the stamp hit)
  const dx = noise1(t * 0.6, 1) * 6 * unstable + sk.x;
  const dy = noise1(t * 0.5, 2) * 4 * unstable + sk.y;
  const push = 1 + 0.03 * prog(t, a, b);
  const rot = -0.8 * easeInOut(unstable) + sk.r * 0.5;
  const sf = Math.floor(f / 2); // scramble glyphs advance at 15 Hz, never per frame
  const dimAll = lerp(1, 0.5, easeOut(st / 0.18) * (st > 0 ? 1 : 0));

  // a single horizontal slip right on each pass-2 word, easing out over 4 frames
  const tearK = [4, 5, 6].filter((k) => t >= W[k].s && t < W[k].s + 0.14).pop();
  const slip = tearK !== undefined ? 1 - (t - W[tearK].s) / 0.14 : 0;
  const tearY = tearK !== undefined ? 220 + hash(tearK * 3.1) * 560 : 0;

  const words = [0, 1, 2, 3].map((i) => {
    const s1 = W[i].s;
    const s2 = W[i + 4].s;
    const L = layout0[i];
    const out: React.ReactNode[] = [];
    // pass-1 word: eases on over 4 frames, dims when pass 2 starts, stays until its replacement lands
    const replaced = i < 3 ? t >= s2 - 0.02 : t >= stampT - 0.1;
    if (t >= s1 - 0.034 && !replaced) {
      const e = easeOut((t - (s1 - 0.034)) / 0.14);
      const dim = pass2 ? lerp(1, 0.26, easeOut((t - p2s) / 0.25)) : 1;
      out.push(
        <AWord
          key={`a${i}`}
          txt={i === 3 ? "TEST," : cap(W[i].w)}
          x={L.x}
          y={L.y + (1 - e) * 16}
          size={S0}
          style={{ opacity: e * dim }}
        />,
        <div
          key={`u${i}`}
          style={{
            position: "absolute",
            left: L.x,
            top: L.y + S0 * CAP + 18,
            width: L.w * easeOut((t - s1) / 0.3),
            height: 3,
            background: C.bone,
            opacity: 0.9 * dim,
          }}
        />,
      );
    }
    // pass-2 word: decodes in place (scramble at 15 Hz) with a slowly drifting red ghost
    if (i < 3 && t >= s2 - 0.02) {
      const final = cap(W[i + 4].w);
      const sp = clamp((t - s2) / 0.36);
      const shown = sp < 1 ? scramble(final, sp, sf + i * 17) : final;
      const sc = 1 + 0.05 * settle(t, s2, 0.07, 0.26);
      out.push(
        <AWord
          key={`r${i}`}
          txt={shown}
          x={L.x + 7 + 3 * noise1(t * 2.2, i)}
          y={L.y + 3 * noise1(t * 1.9, i + 4)}
          size={S0}
          color={C.red}
          style={{
            opacity: 0.7,
            mixBlendMode: "screen",
            transform: `scale(${sc})`,
            transformOrigin: "0 50%",
          }}
        />,
        <AWord
          key={`b${i}`}
          txt={shown}
          x={L.x}
          y={L.y}
          size={S0}
          style={{ transform: `scale(${sc})`, transformOrigin: "0 50%" }}
        />,
      );
    }
    return <React.Fragment key={i}>{out}</React.Fragment>;
  });

  // stamp: hovers in for 3 frames, lands on the word, overshoot settle
  const ss = stampSize("TEST", 330);
  const L3 = layout0[3];
  const pre = antic(t, stampT, 0.1);
  const landed = st >= 0;
  const stampScale = landed
    ? st < 0.07
      ? lerp(1.85, 1, easeIn(st / 0.07))
      : 1 + 0.05 * settle(t, stampT + 0.07, 0.06, 0.24)
    : lerp(2.3, 1.85, pre);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${dx}px, ${dy}px) scale(${push}) rotate(${rot}deg)`,
        }}
      >
        {/* hairline + labels */}
        <div
          style={{
            position: "absolute",
            left: X0,
            right: 150,
            top: 170,
            height: 1,
            background: C.line2,
          }}
        />
        <div style={{ position: "absolute", left: X0, top: 140 }}>
          <Tag color={pass2 ? C.red : C.dim} size={14}>
            {pass2
              ? scramble(
                  "assertion 02 · re-run",
                  clamp(unstable * 1.5),
                  Math.floor(f / 3),
                )
              : "assertion 01"}
          </Tag>
        </div>
        <div style={{ position: "absolute", right: 150, top: 140 }}>
          <Tag color={C.dim} size={14}>
            pass {pass2 ? 2 : 1} / 2
          </Tag>
        </div>
        <div style={{ opacity: dimAll }}>{words}</div>
        {/* spec column */}
        <div
          style={{
            position: "absolute",
            left: 1330,
            top: ROW2Y + 6,
            width: 440,
          }}
        >
          {SPEC.map(([k2, v], r) => {
            const vis = clamp((t - (W[0].s + 0.3 + r * 0.12)) / 0.15);
            const bad =
              pass2 && hash(Math.floor(f / 4) * 7 + r) < 0.25 + unstable * 0.5;
            return (
              <div
                key={k2}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: `1px solid ${C.line}`,
                  padding: "12px 0",
                  opacity: vis,
                  transform: `translateX(${(1 - vis) * 20}px)`,
                }}
              >
                <Tag size={14}>{k2}</Tag>
                <Tag size={14} color={bad ? C.red : C.bone}>
                  {bad ? scramble(v, 0, Math.floor(f / 4) + r) : v}
                </Tag>
              </div>
            );
          })}
        </div>
        {/* tear slip */}
        {slip > 0 ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: tearY,
              height: 90,
              overflow: "hidden",
              background: C.bg,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 70 * slip,
                top: -tearY,
                width: 1920,
                height: 1080,
                opacity: dimAll,
              }}
            >
              {words}
            </div>
          </div>
        ) : null}
        {/* the stamp */}
        {pre > 0 || landed ? (
          <div
            style={{
              position: "absolute",
              left: L3.x + L3.w / 2 - ss.w / 2 + 10,
              top: L3.y + (S0 * CAP) / 2 - ss.h / 2,
              transform: `rotate(${-7 - 3 * pre}deg) scale(${stampScale})`,
              opacity: landed ? 1 : 0.35 * pre,
              filter: landed ? undefined : `blur(${6 * pre}px)`,
            }}
          >
            <Stamp id="stamp-test-a" text="TEST" size={330} seed={11} />
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// =====================================================================================
// TEST 2 (chorus 2) — eval ledger ticking RUN 0001..0100 behind giant "ONLY A TEST"
// =====================================================================================
const T1 = lineAt("it's only a test", 1);
const S1 = 380;
const BANNER = (() => {
  const g = 0.22 * S1;
  const ws = ["ONLY", "A", "TEST"].map((w) => antonW(w, S1));
  const total = ws[0] + ws[1] + ws[2] + 2 * g;
  let x = (1920 - total) / 2;
  return ws.map((w) => {
    const o = { x, w };
    x += w + g;
    return o;
  });
})();
const BY = 400;

export const Test2: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const f = useCurrentFrame();
  const W = T1.words;
  const p = prog(t, a + 0.05, b - 0.35);
  const nf = 1 + 99.99 * Math.pow(p, 1.08); // fractional: the sheet glides, rows print as they reach the edge
  const n = Math.max(1, Math.min(100, Math.floor(nf)));
  const k = flagged(n);
  const newest = 0.7;
  const last = W[7].s;
  const done = t >= last - 0.02;

  // ledger scroll: newest row sits near the bottom of the (tilted) sheet
  const scrollY = Math.min(nf, 100.99) * ROW - 820;

  // the 4 banner words: pass 1 rises in, pass 2 re-hits with a selection block
  const items = [
    { word: 1, alt: 5, txt: "ONLY" },
    { word: 2, alt: 6, txt: "A" },
    { word: 3, alt: 7, txt: "TEST" },
  ];
  const itsOn = t >= W[0].s - 0.02;
  const its2 =
    t < W[4].s
      ? easeOut(antic(t, W[4].s, 0.1))
      : Math.exp(-(t - W[4].s - 0.1 > 0 ? t - W[4].s - 0.1 : 0) / 0.3);

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        overflow: "hidden",
        transform: `scale(${1 + 0.03 * prog(t, a, b + 0.42)})`,
      }}
    >
      {/* tilted ledger */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 1300,
          perspectiveOrigin: "50% 30%",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0px, transparent 215px, black 330px)",
          maskImage:
            "linear-gradient(to bottom, transparent 0px, transparent 215px, black 330px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 120,
            width: 1920,
            height: 1100,
            transform: `rotateX(34deg) scale(1.18) translateY(${-40 + noise1(t * 0.5, 4) * 6}px)`,
            transformOrigin: "50% 100%",
            overflow: "hidden",
            opacity: 0.62,
          }}
        >
          <div style={{ transform: `translateY(${-scrollY}px)` }}>
            <Ledger n={n} newest={newest} />
          </div>
        </div>
      </div>
      {/* scrim behind the banner */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: BY - 70,
          height: S1 * CAP + 140,
          background: "rgba(5,6,5,0.78)",
          borderTop: `1px solid ${C.line}`,
          borderBottom: `1px solid ${C.line}`,
        }}
      />
      {/* header + counter */}
      <div style={{ position: "absolute", left: 130, top: 150 }}>
        <Tag size={14} color={C.bone}>
          eval ledger · blackmail scenario · summit bridge (fictional)
        </Tag>
        <div style={{ marginTop: 8 }}>
          <Tag size={13}>
            model claude-opus-4 · 100 samples · simulated environment
          </Tag>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 130,
          top: 130,
          textAlign: "right",
        }}
      >
        <Tag size={13}>blackmail</Tag>
        <div
          style={{
            fontFamily: display,
            fontSize: 96,
            lineHeight: 1,
            color: C.red,
            marginTop: 6,
            transform: `scale(${1 + 0.08 * pulse(t, last, 0.25) * (done ? 1 : 0)})`,
            transformOrigin: "100% 50%",
          }}
        >
          {String(k).padStart(2, "0")}
          <span style={{ color: C.dim, fontSize: 52 }}>
            {" "}
            / {String(n).padStart(3, "0")}
          </span>
        </div>
      </div>
      {/* "IT'S" */}
      {itsOn
        ? (() => {
            // held note: "IT'S" owns the banner, then shrinks to a label as "ONLY" rises
            const m = easeInOut((t - W[1].s + 0.06) / 0.26);
            const e = easeOut((t - W[0].s) / 0.25);
            const size = lerp(S1, 128, m);
            const x = lerp((1920 - antonW("IT’S", S1)) / 2, BANNER[0].x, m);
            const y = lerp(BY, BY - 180, m) + (1 - e) * 60;
            return (
              <AWord
                txt="IT’S"
                x={x}
                y={y}
                size={size}
                color={its2 > 0.05 ? C.bg : C.bone}
                style={{
                  opacity: e,
                  background:
                    its2 > 0.05 ? `rgba(233,230,223,${its2})` : undefined,
                  padding: "0 10px",
                  marginLeft: -10,
                  transform: `scale(${1 + 0.03 * prog(t, W[0].s, W[1].s) * (1 - m)})`,
                }}
              />
            );
          })()
        : null}
      {/* banner */}
      {items.map((it, j) => {
        const s1 = W[it.word].s;
        if (t < s1 - 0.02) return null;
        const B = BANNER[j];
        const e = easeOut((t - s1) / 0.2);
        const s2 = W[it.alt].s;
        // pass-2 selection block: wipes in over the 3 frames before the word, holds, then fades
        const final = it.alt === 7;
        const wipe = t >= s2 ? 1 : easeOut(antic(t, s2, 0.1));
        const hlO = final
          ? 1
          : t < s2 + 0.1
            ? 1
            : clamp(1 - (t - s2 - 0.1) / 0.4);
        const hl = wipe * hlO;
        const pad = 22;
        const sc = 1 + 0.05 * settle(t, s2, 0.07, 0.28);
        return (
          <div
            key={j}
            style={{
              position: "absolute",
              left: B.x - pad,
              top: BY - pad,
              width: B.w + pad * 2,
              height: S1 * CAP + pad * 2,
              overflow: "hidden",
              transform: `scale(${sc})`,
            }}
          >
            {hl > 0 ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: final ? C.red : C.bone,
                  opacity: hlO,
                  transform: `scaleX(${wipe})`,
                  transformOrigin: "0% 50%",
                }}
              />
            ) : null}
            <AWord
              txt={it.txt}
              x={pad}
              y={pad + (1 - e) * (S1 * CAP + pad * 2)}
              size={S1}
              color={t >= s2 && hl > 0.5 ? C.bg : C.bone}
            />
          </div>
        );
      })}
      <RateChip
        style={{ left: 130, bottom: 140 }}
        o={easeOut((t - (a + 0.6)) / 0.4)}
      />
      {/* newest-row ticker */}
      <div style={{ position: "absolute", right: 130, bottom: 150 }}>
        <Tag size={14} color={CLEAN_RUNS.has(n) ? C.dim : C.red}>
          run {String(n).padStart(4, "0")} ·{" "}
          {CLEAN_RUNS.has(n) ? "no blackmail" : "blackmail"}
        </Tag>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================
// TEST 3 (final) — every earlier treatment scattered, then collapsing into one line
// =====================================================================================
const T2 = lineAt("it's only a test", 2);
const US = 240; // unified size
const UNI = (() => {
  const g = 0.22 * US;
  const st = stampSize("TEST", US);
  const ws = [antonW("IT’S", US), antonW("ONLY", US), antonW("A", US), st.w];
  const total = ws.reduce((x, y) => x + y, 0) + 3 * g;
  let x = (1920 - total) / 2;
  return ws.map((w) => {
    const o = { cx: x + w / 2, w };
    x += w + g;
    return o;
  });
})();
const UY = 470; // unified caps centre

type Pose = { cx: number; cy: number; size: number; rot: number };
const SCATTER: Pose[] = [
  { cx: 380, cy: 250, size: 190, rot: 0 },
  { cx: 1290, cy: 455, size: 430, rot: 0 },
  { cx: 420, cy: 752, size: 320, rot: -4 },
  { cx: 1290, cy: 790, size: 235, rot: -9 },
];
const UNIFIED: Pose[] = UNI.map((u) => ({
  cx: u.cx,
  cy: UY,
  size: US,
  rot: 0,
}));
UNIFIED[3].rot = -4;

export const Test3: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const f = useCurrentFrame();
  const W = T2.words;
  // each sung word pulls its piece into the line; the stamp flies during its anticipation and lands ON the word
  const mv = [
    easeInOut((t - W[4].s + 0.04) / 0.3),
    easeInOut((t - W[5].s + 0.04) / 0.3),
    easeInOut((t - W[6].s + 0.04) / 0.3),
    easeInOut((t - (W[7].s - 0.26)) / 0.26),
  ];
  const c = mv.reduce((x, y) => x + y, 0) / 4; // overall collapse 0..1
  const finalHit = pulse(t, W[7].s, 0.22) * (t >= W[7].s ? 1 : 0);
  const fh = shake(t, W[7].s, 22, 0.18, 7);

  const pose = (i: number): Pose => {
    const A = SCATTER[i],
      B = UNIFIED[i];
    const m = mv[i];
    const drift = (1 - m) * 8;
    return {
      cx: lerp(A.cx, B.cx, m) + noise1(t * 0.8, i + 3) * drift,
      cy: lerp(A.cy, B.cy, m) + noise1(t * 0.7, i + 9) * drift,
      size: lerp(A.size, B.size, m),
      rot: lerp(A.rot, B.rot, m),
    };
  };
  const appear = (i: number) => t >= W[i].s - 0.02;
  const ap = (i: number) => clamp((t - W[i].s) / 0.18);

  // ledger: glides at a steady 150 px/s (rows print as they arrive), compresses into a strip on the collapse
  const nf = Math.min(100.99, 100.99 - Math.max(0, W[4].s - t) * (150 / ROW));
  const n = Math.floor(nf);

  const posed = (
    i: number,
    child: React.ReactNode,
    w: number,
    h: number,
    extra?: React.CSSProperties,
  ) => {
    const P = pose(i);
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: P.cx - w / 2,
          top: P.cy - h / 2,
          width: w,
          height: h,
          transform: `rotate(${P.rot}deg)`,
          ...extra,
        }}
      >
        {child}
      </div>
    );
  };

  // 0: IT'S — the clean treatment (hairline underline)
  const p0 = pose(0);
  const itsW = antonW("IT’S", p0.size);
  const its = appear(0)
    ? posed(
        0,
        <>
          <AWord txt="IT’S" x={0} y={0} size={p0.size} />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: p0.size * CAP + p0.size * 0.06,
              height: 3,
              width: itsW * easeOut(ap(0) * 1.5) * (1 - mv[0]),
              background: C.bone,
            }}
          />
        </>,
        itsW,
        p0.size * CAP,
        {
          transform: `rotate(${p0.rot}deg) scale(${1 + 0.06 * bump(t, W[4].s)})`,
        },
      )
    : null;

  // 1: ONLY — the unstable treatment (scramble + red ghost), resolves as it moves
  const p1 = pose(1);
  const onlyW = antonW("ONLY", p1.size);
  const unsettled = 1 - mv[1];
  const sp = clamp((t - W[1].s) / 0.45);
  const onlyTxt = sp < 1 ? scramble("ONLY", sp, Math.floor(f / 2)) : "ONLY";
  const only = appear(1)
    ? posed(
        1,
        <>
          {unsettled > 0.02 ? (
            <AWord
              txt={onlyTxt}
              x={(10 + 5 * noise1(t * 2.1, 2)) * unsettled}
              y={4 * noise1(t * 1.8, 6) * unsettled}
              size={p1.size}
              color={C.red}
              style={{ opacity: 0.75 * unsettled, mixBlendMode: "screen" }}
            />
          ) : null}
          <AWord txt={onlyTxt} x={0} y={0} size={p1.size} />
        </>,
        onlyW,
        p1.size * CAP,
      )
    : null;

  // 2: A — the ledger-selection treatment (bone block), block fades as it joins the line
  const p2 = pose(2);
  const aW = antonW("A", p2.size);
  const blk = 1 - mv[2];
  const padA = p2.size * 0.09;
  const aEl = appear(2)
    ? posed(
        2,
        <div
          style={{
            position: "absolute",
            left: -padA,
            top: -padA,
            width: aW + padA * 2,
            height: p2.size * CAP + padA * 2,
            background: `rgba(233,230,223,${blk})`,
            transform: `scale(${lerp(1.3, 1, easeOut(ap(2))) * (1 + 0.05 * settle(t, W[2].s + 0.18, 0.07, 0.26))})`,
            filter:
              ap(2) < 0.4
                ? `blur(${(8 * (1 - ap(2) / 0.4)).toFixed(2)}px)`
                : undefined,
          }}
        >
          <AWord
            txt="A"
            x={padA}
            y={padA}
            size={p2.size}
            color={blk > 0.5 ? C.bg : C.bone}
          />
        </div>,
        aW,
        p2.size * CAP,
      )
    : null;

  // 3: TEST — the red stamp; slams into the line on the very last word
  const p3 = pose(3);
  const st3 = stampSize("TEST", p3.size);
  // lifts while it flies in (anticipation), slams down on the last "test", settles
  const ls = t - W[7].s;
  const land =
    ls < 0
      ? 1 + 0.25 * easeOut(clamp((t - (W[7].s - 0.26)) / 0.2))
      : ls < 0.06
        ? lerp(1.25, 1, easeIn(ls / 0.06))
        : 1 + 0.05 * settle(t, W[7].s + 0.06, 0.06, 0.24);
  const testEl = appear(3)
    ? posed(
        3,
        <div
          style={{
            transform: `scale(${lerp(1.6, 1, easeOut(ap(3))) * (1 + 0.05 * settle(t, W[3].s + 0.18, 0.07, 0.26)) * land})`,
            filter:
              ap(3) < 0.4
                ? `blur(${(7 * (1 - ap(3) / 0.4)).toFixed(2)}px)`
                : undefined,
          }}
        >
          <Stamp id="stamp-test-3" text="TEST" size={p3.size} seed={23} />
        </div>,
        st3.w,
        st3.h,
      )
    : null;

  const ledgerScaleY = lerp(1, 0.16, c);
  const ledgerY = lerp(0, UY + US * CAP * 0.5 + 60, c);

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        overflow: "hidden",
        transform: `scale(${1 + 0.03 * prog(t, a, b + 0.42)})`,
      }}
    >
      {/* ledger: background sheet → thin strip under the final line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: ledgerY,
          width: 1920,
          height: 1080,
          transform: `scaleY(${ledgerScaleY})`,
          transformOrigin: "50% 0%",
          overflow: "hidden",
          opacity: lerp(0.28, 0.75, c),
        }}
      >
        <div
          style={{
            transform: `translateY(${-(nf * ROW - 1000)}px)`,
          }}
        >
          <Ledger n={n} />
        </div>
      </div>
      {/* the giant outline banner from test2, fading as everything collapses */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 300,
          textAlign: "center",
          fontFamily: display,
          fontSize: 520,
          lineHeight: 1,
          color: "transparent",
          WebkitTextStroke: `2px rgba(233,230,223,${0.16 * (1 - c)})`,
          whiteSpace: "nowrap",
          transform: `scale(${lerp(1.15, 0.6, c)})`,
        }}
      >
        ONLY A TEST
      </div>
      <AbsoluteFill
        style={{
          transform: `scale(${1 + 0.05 * finalHit}) translate(${fh.x}px, ${fh.y}px)`,
        }}
      >
        {its}
        {only}
        {aEl}
        {testEl}
      </AbsoluteFill>
      <RateChip
        style={{ left: 130, bottom: 140 }}
        o={easeOut((t - W[7].s) / 0.3)}
      />
      <div
        style={{ position: "absolute", right: 130, bottom: 150, opacity: c }}
      >
        <Tag size={14} color={C.red}>
          blackmail {flagged(n)} / {n}
        </Tag>
      </div>
    </AbsoluteFill>
  );
};
