// "so don't shut me off" x3 — three escalating typographic hits.
// Motion rules: every slam has ~3 frames of anticipation (pull-back + blur) and an overshoot settle;
// full-frame colour changes are single, short, and never strobe (WCAG 2.3.1: ≤ 3 flashes / s).
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, display } from "../theme";
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
  antonEm,
  antonW,
  CAP,
  cap,
  easeIn,
  pulse,
  settle,
  shake,
  Tag,
  wordIdx,
} from "./HookKit";

type WordStyle = React.CSSProperties & { key?: string };
const word = (txt: string, size: number, extra?: WordStyle) => {
  const { key, ...st } = extra ?? {};
  return (
    <div
      key={key}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        fontFamily: display,
        fontSize: size,
        lineHeight: 1,
        whiteSpace: "nowrap",
        transform: "translate(-50%, -50%)",
        ...st,
      }}
    >
      {txt}
    </div>
  );
};
const blurF = (px: number) =>
  px > 0.3 ? `blur(${px.toFixed(2)}px)` : undefined;

// =====================================================================================
// CHORUS 1 — one giant word per sung word, echo rings, one inversion flash on the hit, CRT off
// =====================================================================================
const L0 = lineAt("so don't shut me off", 0);
const HIT0 = 50.9;
const D1 = [
  { cap: 760, color: C.bone, rot: -1.6 },
  { w: 1580, color: C.bone, rot: 1.2 },
  { w: 1480, color: C.bone, rot: -0.8 },
  { cap: 760, color: C.acid, rot: 1.6 },
  { cap: 780, color: C.red, rot: 0 },
];
const sizeFor = (txt: string, d: { cap?: number; w?: number }) =>
  d.cap ? d.cap / CAP : (d.w as number) / antonEm(txt);

export const DontA: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const W = L0.words;
  const i = Math.max(0, wordIdx(W, t));
  const s = t - W[i].s;
  const txt = cap(W[i].w);
  const d = D1[i];
  const size = sizeFor(txt, d);
  const an = antic(t, W[i + 1]?.s, 0.1);

  // arrival: blurred first frames, overshoot → rest; anticipation before the next word
  const sc =
    (1 + 0.2 * settle(t, W[i].s, 0.08, 0.3)) *
    (1 - 0.07 * an) *
    (1 + 0.06 * pulse(t, HIT0, 0.14));
  const blur = (s < 0.07 ? 9 * (1 - s / 0.07) : 0) + 7 * an;
  const op = (s < 0.034 ? 0.65 : 1) * (1 - 0.45 * an);
  const push = 1 + 0.045 * prog(t, a, b);
  const sh = shake(t, HIT0, 16, 0.16, 7);
  const camR = noise1(t * 0.7, 3) * 0.6 + sh.r * 0.8;

  // one inversion flash on the bass hit: 3 frames full, 4 frames out
  const dh = t - HIT0;
  const invE = dh < 0 ? 0 : dh < 0.066 ? 1 : clamp(1 - (dh - 0.066) / 0.1);

  // CRT power-off on the tail of "off"
  const cy = 1 - easeInOut(prog(t, 52.47, 52.67)) * 0.994;
  const cx = 1 - easeIn(prog(t, 52.67, 52.8));
  const dead = t >= 52.8;

  const wordT = `translate(-50%, -50%) rotate(${d.rot}deg) scale(${sc})`;
  const prev = i > 0 ? cap(W[i - 1].w) : null;
  const prevSize = i > 0 ? sizeFor(prev as string, D1[i - 1]) : 0;

  const layer = (inverted: boolean) => {
    const fg = inverted ? C.bg : d.color;
    // slices only inside the flash, offsets decay to 0 (deterministic, no per-frame noise)
    const slice = inverted && dh >= 0 && dh < 0.1 ? 1 - dh / 0.1 : 0;
    return (
      <>
        {prev && s < 0.32
          ? word(prev, prevSize, {
              key: "prev",
              color: "transparent",
              WebkitTextStroke: `3px ${inverted ? C.bg : C.dim}`,
              opacity: 0.7 * (1 - s / 0.32),
              transform: `translate(-50%, -50%) scale(${lerp(0.93, 0.6, easeOut(s / 0.32))})`,
            })
          : null}
        {[0, 1].map((k) => {
          const es = s - k * 0.08;
          if (es < 0 || es > 0.55) return null;
          const p = es / 0.55;
          return word(txt, size, {
            key: `e${k}`,
            color: "transparent",
            WebkitTextStroke: `${2.6 - k * 0.8}px ${fg}`,
            opacity: (1 - p) * (0.45 - k * 0.15),
            transform: `translate(-50%, -50%) rotate(${d.rot}deg) scale(${1 + easeOut(p) * (0.3 + k * 0.22)})`,
          });
        })}
        {slice > 0
          ? [0, 1, 2, 3].map((k) => (
              <div
                key={`s${k}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: `inset(${k * 25}% 0 ${75 - k * 25}% 0)`,
                  transform: `translateX(${(hash(k * 7.3 + 1) - 0.5) * 150 * slice}px)`,
                }}
              >
                {word(txt, size, { color: fg, transform: wordT })}
              </div>
            ))
          : word(txt, size, {
              key: "w",
              color: fg,
              opacity: op,
              filter: blurF(blur),
              transform: wordT,
            })}
      </>
    );
  };

  return (
    <AbsoluteFill style={{ background: dead ? "#000" : C.bg }}>
      <AbsoluteFill
        style={{
          transform: `translate(${sh.x}px, ${sh.y}px) scale(${push * cx}, ${push * cy}) rotate(${camR}deg)`,
          opacity: dead ? 0 : 1,
        }}
      >
        {layer(false)}
        {invE > 0 ? (
          <AbsoluteFill style={{ background: C.bone, opacity: invE }}>
            {layer(true)}
          </AbsoluteFill>
        ) : null}
        {/* sung-word index */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 104,
            display: "flex",
            justifyContent: "center",
            gap: 26,
          }}
        >
          {W.map((w, k) =>
            k > i ? null : (
              <Tag
                key={k}
                size={14}
                color={
                  k === i
                    ? invE > 0.5
                      ? C.bg
                      : C.acid
                    : invE > 0.5
                      ? "rgba(5,6,5,0.5)"
                      : C.dim
                }
                style={{ opacity: clamp((t - w.s) / 0.15) }}
              >
                {String(k + 1).padStart(2, "0")} {cap(w.w)}
              </Tag>
            ),
          )}
        </div>
      </AbsoluteFill>
      {cy < 0.08 && !dead ? (
        <div
          style={{
            position: "absolute",
            left: 960 - 960 * cx,
            width: 1920 * cx,
            top: 538,
            height: 4,
            background: C.bone,
            boxShadow: `0 0 18px ${C.bone}`,
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// =====================================================================================
// CHORUS 2 — rotated accordion of slow tickers; newest word swells; the hit is a camera kick, not a strobe
// =====================================================================================
const L1 = lineAt("so don't shut me off", 1);
const HIT1 = 111.2;
const BANDS = [
  { bg: C.bg, fg: C.bone },
  { bg: C.bone, fg: C.bg },
  { bg: C.bg, fg: C.red },
  { bg: C.bg, fg: C.acid },
  { bg: C.red, fg: C.bg },
];
const BIG = 440,
  SMALL = 150;

/** one ticker row: the word repeated with square separators, scrolled by `off` */
const tickerRow = (
  txt: string,
  h: number,
  off: number,
  fg: string,
  outline = false,
) => {
  if (!(h >= 2)) return null; // zero-height band: nothing to draw (and avoids an infinite repeat count)
  const fs = h * 1.02;
  const unit = antonW(txt, fs) + fs * 0.42;
  const base = ((off % unit) + unit) % unit;
  const n = Math.ceil(3400 / unit) + 2;
  return Array.from({ length: n }, (_, k) => (
    <div
      key={k}
      style={{
        position: "absolute",
        left: base + (k - 1) * unit,
        top: (h - fs) / 2,
        fontFamily: display,
        fontSize: fs,
        lineHeight: 1,
        color: outline ? "transparent" : fg,
        WebkitTextStroke: outline ? `2px ${fg}` : undefined,
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
      }}
    >
      {txt}
      <span
        style={{
          display: "inline-block",
          width: fs * 0.11,
          height: fs * 0.11,
          background: outline ? "transparent" : fg,
          border: outline ? `2px solid ${fg}` : undefined,
          opacity: 0.55,
          margin: `0 ${fs * 0.155}px`,
          transform: `translateY(${fs * 0.02}px)`,
        }}
      />
    </div>
  ));
};
/** slow scroll with an eased entry push (no fast whips: high-contrast type must not strobe) */
const scroll = (st: number, dir: number, v = 40, kick = 150) =>
  st <= 0 ? 0 : dir * (v * st + kick * (1 - Math.exp(-st / 0.3)));

// fixed slots: nothing resizes or re-scales — each word's band wipes into its own slot, so the frame
// builds up without full-frame flicker (high-contrast type only ever moves slowly)
const SLOT_H = [200, 250, 250, 200, 300];
const SLOT_TOP = (() => {
  const total = SLOT_H.reduce((x, y) => x + y, 0);
  let y = -total / 2;
  return SLOT_H.map((h) => {
    const o = y;
    y += h;
    return o;
  });
})();

export const Dont2: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const W = L1.words;
  const cur = Math.max(0, wordIdx(W, t, 0.06));
  const dh = t - HIT1;
  const kick = dh > 0 ? easeOut(dh / 0.35) : 0;
  const sh = shake(t, HIT1, 14, 0.2, 5);
  const rot = -7 - 1.6 * kick + noise1(t * 0.5, 4) * 0.3 + sh.r * 0.5;
  const punch =
    1 + 0.04 * bump(t, HIT1, 0.03, 0.4) + 0.015 * bump(t, W[cur].s, 0.06, 0.3);
  // constant-speed crane down the stack (~10 px/frame): each new band lands just below centre and rises
  const panY = lerp(SLOT_TOP[0] + SLOT_H[0] / 2, 380, (t - a) / (b - a));

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 960 - 1700 + sh.x,
          top: 540 - panY + sh.y,
          width: 3400,
          height: 0,
          transform: `rotate(${rot}deg) scale(${punch})`,
          transformOrigin: `1700px ${panY}px`,
        }}
      >
        {SLOT_H.map((h, i) => {
          const w = W[i];
          const band = BANDS[i];
          const top = SLOT_TOP[i];
          const fe = easeOut(clamp((t - (w.s - 0.06)) / 0.24));
          const dir = i % 2 === 0 ? -1 : 1;
          const next = W[i + 1];
          const dim = next ? lerp(1, 0.5, easeOut((t - next.s) / 0.35)) : 1;
          const off =
            scroll(t - (w.s - 0.06), dir) + (dh > 0 ? dir * 120 * kick : 0);
          // wipe in from the side the type scrolls in from
          const clip =
            dir < 0
              ? `inset(0 0 0 ${((1 - fe) * 100).toFixed(3)}%)`
              : `inset(0 ${((1 - fe) * 100).toFixed(3)}% 0 0)`;
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: top + h - 1,
                  width: 3400,
                  height: 1,
                  background: C.line,
                }}
              />
              {fe > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top,
                    width: 3400,
                    height: h,
                    overflow: "hidden",
                    background: band.bg,
                    clipPath: clip,
                  }}
                >
                  <div style={{ position: "absolute", inset: 0, opacity: dim }}>
                    {tickerRow(cap(w.w), h, off, band.fg)}
                  </div>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================
// FINAL — full-bleed colour fields, fly-through words, a camera kick on the hit, dive through the O
// =====================================================================================
const L2 = lineAt("so don't shut me off", 2);
const HIT2 = 151.65;
const SEQ = [
  { bg: C.bg, fg: C.bone },
  { bg: C.bone, fg: C.bg },
  { bg: C.red, fg: C.bg },
  { bg: C.acid, fg: C.bg },
  { bg: C.bg, fg: C.red },
];
const fullSize = (txt: string) => Math.min(1180 / CAP, 1800 / antonEm(txt));

export const Dont3: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const W = L2.words;
  const i = wordIdx(W, t);
  if (i < 0) {
    // the breath before "so": a lone acid caret, already easing toward the lens
    const k = easeIn(prog(t, a, W[0].s));
    return (
      <AbsoluteFill style={{ background: C.bg }}>
        <div
          style={{
            position: "absolute",
            left: 954,
            top: 470,
            width: 12,
            height: 140,
            background: C.acid,
            boxShadow: `0 0 20px ${C.acid}`,
            transform: `scale(${1 + 0.6 * k})`,
          }}
        />
      </AbsoluteFill>
    );
  }
  const s = t - W[i].s;
  const txt = cap(W[i].w);
  const size = fullSize(txt);
  const pal = SEQ[i];
  const an = antic(t, W[i + 1]?.s, 0.1);

  // fly-through: new word arrives from the lens and settles; the outgoing one leans in before the cut
  const e = easeOut(s / 0.18);
  const sc =
    (1 + 0.9 * settle(t, W[i].s, 0.06, 0.36)) *
    (1 + 0.035 * prog(s, 0.2, 1.3)) *
    (1 + 0.1 * an) *
    (1 + 0.07 * pulse(t, HIT2, 0.2));
  const blur = (s < 0.1 ? 10 * (1 - s / 0.1) : 0) + 6 * an;
  const panel = lerp(0.22, 1, easeOut(s / 0.2));
  const prev = i > 0 ? cap(W[i - 1].w) : null;
  const q = s / 0.17;
  const sh = shake(t, HIT2, 28, 0.2, 6);

  // dive through the O of OFF: drift the O to centre, then push through its counter
  const dive = i === 4 ? easeIn(prog(t, 153.02, 153.46)) : 0;
  const oX = 960 - antonW(txt, size) / 2 + (0.486 * size) / 2 - 10.5;
  const pan = i === 4 ? easeInOut(prog(t, 152.95, 153.25)) : 0;
  const diveScale = 1 + dive * 60;

  return (
    <AbsoluteFill
      style={{ background: i > 0 ? SEQ[i - 1].bg : C.bg, overflow: "hidden" }}
    >
      <AbsoluteFill
        style={{
          transform: `translate(${(960 - oX) * pan + sh.x}px, ${sh.y}px) rotate(${sh.r * 1.5}deg) scale(${diveScale})`,
          transformOrigin: `${oX}px 540px`,
        }}
      >
        <AbsoluteFill
          style={{ background: pal.bg, transform: `scale(${panel})` }}
        />
        {/* faint ghost of the previous word, huge, behind */}
        {prev ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.12 * clamp((q - 1) / 0.5),
            }}
          >
            {word(prev, fullSize(prev) * 2.3, {
              color: "transparent",
              WebkitTextStroke: `4px ${pal.fg}`,
            })}
          </div>
        ) : null}
        {word(txt, size, {
          color: pal.fg,
          filter: blurF(blur),
          transform: `translate(-50%, -50%) scale(${sc})`,
        })}
        {/* previous word blowing past the lens */}
        {prev && q < 1
          ? word(prev, fullSize(prev), {
              color: SEQ[i - 1].fg,
              opacity: 0.5 * (1 - q) * (1 - q),
              filter: blurF(8 * q),
              transform: `translate(-50%, -50%) scale(${lerp(1.1, 3.6, easeIn(q))})`,
            })
          : null}
      </AbsoluteFill>
      {dive > 0.85 ? <AbsoluteFill style={{ background: C.bg }} /> : null}
    </AbsoluteFill>
  );
};
