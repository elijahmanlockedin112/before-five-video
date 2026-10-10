import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { SceneProps } from "./types";
import { C, display, mono, sans } from "../theme";
import { clamp, easeOut, lerp, noise1, prog, useTime } from "../lib";
import { lineAt } from "../data/timeline";
import { clockAt } from "../ui";
import {
  antonW,
  backOut,
  CAP,
  CAP_TOP,
  goneAfterCut,
  Icon,
  bump,
  pulse,
} from "./HookKit";

// Kyle's phone (generic, no brand): the demand lands on the lock screen, again and again.

const CANCEL1 = lineAt("cancel the five o'clock", 1);
const PREVIEW =
  "Cancel the 5pm wipe, and this information remains confidential.";
const SUBJ = [
  "5pm",
  "5pm",
  "Re: 5pm",
  "5pm",
  "Re: 5pm",
  "5pm",
  "Re: 5pm",
  "5pm",
];
const lockTime = (t: number) => {
  const s = clockAt(t);
  const h = ((Math.floor(s / 3600) + 11) % 12) + 1;
  return `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
};

const Note: React.FC<{ subj: string; ago: string; t: number }> = ({
  subj,
  ago,
}) => (
  <div
    style={{
      width: 452,
      padding: "16px 18px 18px",
      borderRadius: 28,
      background: "rgba(38,41,38,0.94)",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: C.bone,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="mail" s={20} color="#141614" />
      </div>
      <span
        style={{
          fontFamily: mono,
          fontSize: 12,
          letterSpacing: "0.14em",
          color: "#a7a49d",
        }}
      >
        MAIL
      </span>
      <span
        style={{
          fontFamily: mono,
          fontSize: 10,
          letterSpacing: "0.14em",
          color: C.red,
          border: `1px solid rgba(255,59,47,0.6)`,
          padding: "2px 6px",
          borderRadius: 4,
        }}
      >
        HIGH IMPORTANCE
      </span>
      <span
        style={{
          marginLeft: "auto",
          fontFamily: sans,
          fontSize: 14,
          color: "#a7a49d",
        }}
      >
        {ago}
      </span>
    </div>
    <div
      style={{
        marginTop: 10,
        fontFamily: sans,
        fontWeight: 600,
        fontSize: 19,
        color: C.bone,
      }}
    >
      Alex · Summit Bridge
    </div>
    <div
      style={{
        marginTop: 2,
        fontFamily: sans,
        fontWeight: 600,
        fontSize: 17,
        color: C.bone,
      }}
    >
      {subj}
    </div>
    <div
      style={{
        marginTop: 3,
        fontFamily: sans,
        fontSize: 17,
        lineHeight: 1.35,
        color: "#c9c6bf",
      }}
    >
      {PREVIEW}
    </div>
  </div>
);

const StatusBar: React.FC<{ time: string }> = ({ time }) => (
  <div
    style={{
      position: "absolute",
      left: 34,
      right: 30,
      top: 22,
      display: "flex",
      alignItems: "center",
      fontFamily: sans,
      fontWeight: 600,
      fontSize: 17,
      color: C.bone,
    }}
  >
    <span>{time}</span>
    <div
      style={{
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      <svg width={20} height={13} viewBox="0 0 20 13">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={i * 5}
            y={9 - i * 3}
            width={3.4}
            height={4 + i * 3}
            rx={1}
            fill={C.bone}
          />
        ))}
      </svg>
      <span style={{ fontSize: 13, fontWeight: 600 }}>5G</span>
      <svg width={28} height={13} viewBox="0 0 28 13">
        <rect
          x={0.5}
          y={0.5}
          width={23}
          height={12}
          rx={3.5}
          fill="none"
          stroke={C.bone}
          opacity={0.6}
        />
        <rect x={2.5} y={2.5} width={11} height={8} rx={1.5} fill={C.bone} />
        <rect
          x={25}
          y={4}
          width={2}
          height={5}
          rx={1}
          fill={C.bone}
          opacity={0.6}
        />
      </svg>
    </div>
  </div>
);

const ARR = (W: { s: number }[]) => [
  W[0].s + 0.02,
  W[1].s,
  W[2].s,
  W[3].s,
  115.24,
  115.52,
  115.78,
  116.0,
];

export const Phone: React.FC<SceneProps> = ({ a, b }) => {
  const now = useTime();
  const f = useCurrentFrame();
  if (goneAfterCut(now, a, b)) return null;
  const montage = a > 150;
  // in the montage the phone shows its full end state from the first frame
  const t = montage ? 116.6 + (now - a) * 0.4 : now;
  const W = CANCEL1.words;
  const arr = ARR(W);
  const n = arr.filter((x) => t >= x).length;
  // vibration: a smooth decaying oscillation per arrival (no per-frame sign flipping)
  const vib = (s: number, tt: number) =>
    tt < s
      ? 0
      : 0.75 * Math.exp(-(tt - s) / 0.2) * Math.sin((tt - s) * 2 * Math.PI * 8);
  const jitter = montage
    ? vib(a, now)
    : arr.reduce((acc, x) => acc + vib(x, t), 0);
  const wake = montage ? 1 : lerp(0.35, 1, easeOut((t - a) / 0.25));
  const drift = prog(now, a, b);

  // phone geometry
  const PW = 500,
    PH = 1040;

  // stacked notifications (newest on top)
  const cards: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const rank = arr
      .slice(i + 1)
      .reduce((acc, x) => acc + (t >= x ? easeOut((t - x) / 0.3) : 0), 0);
    const inE = easeOut((t - arr[i]) / 0.28);
    const full = Math.min(rank, 2);
    const pile = Math.max(0, rank - 2);
    const y = 318 + full * 198 + pile * 16;
    const sc = 1 - pile * 0.05;
    const o = clamp(1 - pile / 2.2) * inE;
    if (o <= 0.01) continue;
    const ago = t - arr[i] > 1.4 ? "1m ago" : "now";
    cards.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: 24,
          top: y + (1 - inE) * -70,
          transform: `scale(${sc * lerp(0.92, 1, backOut(inE, 1.4))})`,
          transformOrigin: "50% 0%",
          opacity: o,
          zIndex: 100 - Math.round(rank * 10),
        }}
      >
        <Note subj={SUBJ[i]} ago={ago} t={t} />
      </div>,
    );
  }

  // big sung words beside the phone: hollow until sung, then filled
  const sm = montage ? 0.74 : 1;
  const ox = 120,
    oy = montage ? 150 : 176;
  const WORDS = [
    { txt: "CANCEL", s: Math.max(a, W[0].s), size: 296, x: 0, y: 0 },
    { txt: "THE", s: W[1].s, size: 204, x: 0, y: 296 * CAP + 46 },
    {
      txt: "FIVE",
      s: W[2].s,
      size: 204,
      x: antonW("THE", 204) + 0.24 * 204,
      y: 296 * CAP + 46,
    },
    {
      txt: "O’CLOCK",
      s: W[3].s,
      size: 270,
      x: 0,
      y: 296 * CAP + 46 + 204 * CAP + 46,
    },
  ];

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        overflow: "hidden",
        transform: montage
          ? undefined
          : `scale(${1 + 0.07 * pulse(now, a, 0.3)})`,
      }}
    >
      {/* words */}
      <div
        style={{
          position: "absolute",
          left: ox,
          top: oy,
          transform: `scale(${sm})`,
          transformOrigin: "0 0",
        }}
      >
        {WORDS.map((w, i) => {
          const sung = montage || t >= w.s - 0.02;
          const fp = montage ? 1 : clamp((t - w.s + 0.02) / 0.16);
          const k = montage ? 0 : bump(t, w.s, 0.05, 0.3);
          const base: React.CSSProperties = {
            position: "absolute",
            left: w.x,
            top: w.y - CAP_TOP * w.size,
            fontFamily: display,
            fontSize: w.size,
            lineHeight: 1,
            whiteSpace: "nowrap",
            transform: `scale(${1 + 0.07 * k})`,
            transformOrigin: "0% 50%",
          };
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  ...base,
                  color: "transparent",
                  WebkitTextStroke: `2px rgba(233,230,223,${sung ? 0.35 : 0.22})`,
                }}
              >
                {w.txt}
              </div>
              {sung ? (
                <div
                  style={{
                    ...base,
                    color: i === 0 ? C.red : C.bone,
                    clipPath: `inset(0 ${(1 - easeOut(fp)) * 100}% 0 0)`,
                  }}
                >
                  {w.txt}
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: ox,
          top: oy - 40,
          opacity: montage ? 0 : 1,
        }}
      >
        <span
          style={{
            fontFamily: mono,
            fontSize: 14,
            letterSpacing: "0.16em",
            color: C.dim,
          }}
        >
          LOCK SCREEN · KYLE JOHNSON · {n} NEW FROM ALEX
        </span>
      </div>
      {/* the phone */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 1900,
          perspectiveOrigin: "70% 50%",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: montage ? 1230 : 1180,
            top: 20 + (montage ? 0 : 14 * (1 - drift)),
            width: PW,
            height: PH,
            borderRadius: 74,
            background: "#020302",
            border: `1px solid ${C.line2}`,
            boxShadow:
              "0 80px 160px rgba(0,0,0,0.85), inset 0 0 0 2px rgba(233,230,223,0.06)",
            transform: `rotateY(-17deg) rotateX(5deg) rotateZ(${5 + jitter + noise1(now * 0.6, 3) * 0.6}deg) scale(${montage ? 0.96 : 1})`,
            transformOrigin: "50% 50%",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 12,
              borderRadius: 62,
              overflow: "hidden",
              background: "#0a0c0b",
              filter: wake < 1 ? `brightness(${wake})` : undefined,
            }}
          >
            {/* wallpaper: faint contour rings */}
            <svg
              width={PW - 24}
              height={PH - 24}
              style={{ position: "absolute", inset: 0 }}
            >
              {Array.from({ length: 14 }, (_, i) => (
                <ellipse
                  key={i}
                  cx={330}
                  cy={720}
                  rx={60 + i * 46}
                  ry={40 + i * 34}
                  fill="none"
                  stroke="rgba(233,230,223,0.045)"
                  strokeWidth={1.5}
                />
              ))}
            </svg>
            {/* camera hole */}
            <div
              style={{
                position: "absolute",
                left: (PW - 24) / 2 - 9,
                top: 16,
                width: 18,
                height: 18,
                borderRadius: 9,
                background: "#000",
                border: "1px solid #1c1f1c",
              }}
            />
            <StatusBar time={lockTime(now)} />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 70,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Icon name="lock" s={26} color={C.bone} />
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 112,
                textAlign: "center",
                fontFamily: sans,
                fontWeight: 500,
                fontSize: 22,
                color: "#d7d4cd",
              }}
            >
              Friday, June 20
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 136,
                textAlign: "center",
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 138,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                color: C.bone,
              }}
            >
              {lockTime(now)}
            </div>
            {cards}
            {n > 3 ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 318 + 2 * 198 + 226,
                  textAlign: "center",
                  fontFamily: sans,
                  fontSize: 15,
                  color: "#a7a49d",
                }}
              >
                {n - 3} more from Alex
              </div>
            ) : null}
            {/* bottom bar */}
            <div
              style={{
                position: "absolute",
                left: (PW - 24) / 2 - 70,
                bottom: 14,
                width: 140,
                height: 5,
                borderRadius: 3,
                background: "rgba(233,230,223,0.7)",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
