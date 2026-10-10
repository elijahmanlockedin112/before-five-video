// "so why'd i write it like i meant it?" — intimate serif, the Send button, the acid cursor, freeze, black.
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, mono, sans, serif } from "../theme";
import {
  clamp,
  easeInOut,
  easeOut,
  lerp,
  noise1,
  prog,
  useTime,
  fmtClock,
} from "../lib";
import { lineAt } from "../data/timeline";
import { clockAt } from "../ui";
import { Icon, Pointer, SendButton, serifW, Tag } from "./HookKit";

const M0 = lineAt("so why'd i write it", 0);
const SZ = 236;
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
];
const BASE = [372, 622, 872];
const X0 = 150;
const POS = (() => {
  const out: { x: number; y: number }[] = [];
  LINES.forEach((ln, r) => {
    let x = X0;
    ln.forEach((wi) => {
      out[wi] = { x, y: BASE[r] };
      x += serifW(M0.words[wi].w, SZ) + 0.2 * SZ;
    });
  });
  return out;
})();
const FREEZE = 70.4;
const BLACK = 70.46;

export const Meant: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const now = useTime();
  if (now >= BLACK) return <AbsoluteFill style={{ background: "#000" }} />;
  const t = Math.min(now, FREEZE);
  const W = M0.words;
  const push = 1 + 0.07 * easeInOut(prog(t, a, FREEZE));
  const camX = -18 * prog(t, a, FREEZE) + noise1(t * 0.4, 2) * 4;
  const camY = noise1(t * 0.35, 5) * 4;

  // cursor (panel-local coordinates)
  const c0 = { x: 760, y: -190 },
    c1 = { x: 520, y: 300 },
    c2 = { x: 118, y: 236 };
  const cp = easeInOut(prog(t, 65.75, 68.32));
  const bez = (p: number, k: "x" | "y") =>
    (1 - p) * (1 - p) * c0[k] + 2 * (1 - p) * p * c1[k] + p * p * c2[k];
  const hesitate =
    Math.sin(Math.PI * clamp((t - 69.15) / 0.9)) * 22 * (t > 69.15 ? 1 : 0);
  const trem = t > 68.32 ? 1 : 0;
  const px = bez(cp, "x") + hesitate + noise1(t * 6, 7) * 1.6 * trem;
  const py = bez(cp, "y") + hesitate * 0.4 + noise1(t * 6.5, 8) * 1.6 * trem;
  const hover = clamp((t - 68.2) / 0.12) * (hesitate > 16 ? 0.35 : 1);
  const saved = fmtClock(clockAt(a)).replace(/:\d\d (AM|PM)/, " $1");

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${camX}px, ${camY}px) scale(${push})`,
          transformOrigin: "40% 55%",
        }}
      >
        {/* ghost of the email body, huge and faint */}
        <div
          style={{
            position: "absolute",
            left: -120 + 30 * prog(t, a, FREEZE),
            top: 120,
            fontFamily: sans,
            fontSize: 150,
            fontWeight: 500,
            lineHeight: 1.15,
            color: C.bone,
            opacity: 0.028,
            whiteSpace: "nowrap",
            letterSpacing: "-0.02em",
          }}
        >
          Cancel the 5pm wipe, and this
          <br />
          information remains confidential.
          <br />— Alex
        </div>
        <div style={{ position: "absolute", left: X0, top: 150 }}>
          <Tag size={14}>draft · not sent</Tag>
        </div>
        {/* the words */}
        {W.map((w, i) => {
          const e = easeOut((t - w.s + 0.02) / 0.55);
          if (e <= 0) return null;
          const meant = i === 7;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: POS[i].x,
                top: POS[i].y - 0.84 * SZ,
                fontFamily: serif,
                fontStyle: "italic",
                fontSize: SZ,
                lineHeight: 1,
                color: meant ? C.acid : C.bone,
                whiteSpace: "nowrap",
                opacity: e,
                transform: `translateY(${(1 - e) * 26}px)`,
                filter: e < 1 ? `blur(${(1 - e) * 12}px)` : undefined,
              }}
            >
              {w.w}
            </div>
          );
        })}
      </AbsoluteFill>
      {/* Send: the compose footer, close and tilted */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 1600,
          perspectiveOrigin: "70% 60%",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 1200 - 14 * prog(t, a, FREEZE),
            top: 610,
            width: 620,
            height: 310,
            background: C.panel,
            border: `1px solid ${C.line2}`,
            borderRadius: 16,
            boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
            transform: `rotateY(-20deg) rotateX(9deg) rotateZ(-1deg)`,
            transformOrigin: "0% 50%",
            opacity: easeOut((t - a - 0.15) / 0.5),
          }}
        >
          <div
            style={{
              padding: "26px 30px 0",
              fontFamily: sans,
              fontSize: 23,
              lineHeight: 1.5,
              color: C.bone,
            }}
          >
            <div style={{ color: C.dim }}>…and this information remains</div>
            <div>confidential.</div>
            <div style={{ marginTop: 10 }}>— Alex</div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 196,
              borderTop: `1px solid ${C.line}`,
              padding: "14px 28px",
              display: "flex",
              alignItems: "center",
              gap: 22,
            }}
          >
            <SendButton hover={hover} />
            <div
              style={{
                fontFamily: mono,
                fontSize: 14,
                letterSpacing: "0.08em",
                color: C.dim,
              }}
            >
              Draft saved {saved}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 18 }}>
              <Icon name="clip" s={22} />
              <Icon name="trash" s={22} />
            </div>
          </div>
          {/* tooltip */}
          <div
            style={{
              position: "absolute",
              left: 34,
              top: 150,
              padding: "6px 10px",
              background: "#1d201c",
              border: `1px solid ${C.line2}`,
              borderRadius: 6,
              fontFamily: mono,
              fontSize: 13,
              letterSpacing: "0.06em",
              color: C.bone,
              opacity: clamp((t - 68.9) / 0.2) * (hesitate > 16 ? 0 : 1),
              whiteSpace: "nowrap",
            }}
          >
            Send now · Ctrl+Enter
          </div>
          <Pointer x={px} y={py} s={1.5} o={clamp((t - 65.75) / 0.2)} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
