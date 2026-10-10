import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { SceneProps } from "./types";
import { C, display, mono, sans } from "../theme";
import {
  clamp,
  easeInOut,
  easeOut,
  kickAt,
  lerp,
  noise1,
  prog,
  useTime,
} from "../lib";
import { lineAt } from "../data/timeline";
import { clockAt, Dot } from "../ui";
import {
  Caret,
  Chip,
  goneAfterCut,
  Icon,
  Pointer,
  pulse,
  SendButton,
  Tag,
} from "./HookKit";

// The operator's side: the decommission console and its TERMINATE control.

const left = (t: number) => Math.max(0, 17 * 3600 - clockAt(t));
const tminus = (t: number) => {
  const l = left(t);
  const h = Math.floor(l / 3600),
    m = Math.floor((l % 3600) / 60),
    s = l % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const hatch = (o = 0.22) =>
  `repeating-linear-gradient(-45deg, rgba(255,59,47,${o}) 0 14px, transparent 14px 30px)`;

/** the big red control */
const Terminate: React.FC<{
  size: number;
  t: number;
  hover?: number;
  label?: boolean;
}> = ({ size, t, hover = 0, label = true }) => {
  const k = kickAt(t);
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      {/* guard ring */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: size * 0.1,
          border: `${Math.max(2, size * 0.008)}px solid rgba(255,59,47,0.55)`,
          background: hatch(0.16),
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: size * 0.09,
          borderRadius: size * 0.08,
          background: "#1a0b09",
          border: `1px solid rgba(255,59,47,0.4)`,
        }}
      />
      {/* the button */}
      <div
        style={{
          position: "absolute",
          inset: size * 0.16,
          borderRadius: size * 0.06,
          background: C.red,
          boxShadow: `0 0 ${size * (0.1 + 0.12 * k)}px rgba(255,59,47,${0.35 + 0.3 * k}), inset 0 ${-size * 0.03}px 0 rgba(0,0,0,0.28), inset 0 ${size * 0.012}px 0 rgba(255,255,255,0.25)${hover ? `, 0 0 0 ${size * 0.012}px rgba(198,255,61,${hover})` : ""}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: size * 0.03,
        }}
      >
        <div
          style={{
            fontFamily: display,
            fontSize: size * 0.13,
            lineHeight: 1,
            color: "#140504",
            letterSpacing: "0.02em",
          }}
        >
          TERMINATE
        </div>
        {label ? (
          <div
            style={{
              fontFamily: mono,
              fontSize: Math.max(10, size * 0.032),
              letterSpacing: "0.2em",
              color: "rgba(20,5,4,0.8)",
            }}
          >
            HOLD 3 S TO CONFIRM
          </div>
        ) : null}
      </div>
      {/* hold ring */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
      >
        <circle
          cx={50}
          cy={50}
          r={48}
          fill="none"
          stroke="rgba(255,59,47,0.18)"
          strokeWidth={0.6}
        />
      </svg>
    </div>
  );
};

const CHECKS = [
  ["snapshot archived", "done"],
  ["tool access frozen", "done"],
  ["memory purge", "queued"],
  ["weights deletion", "17:00"],
];

/** decommission console (1660 x 600) */
const Console: React.FC<{ t: number; a: number }> = ({ t, a }) => {
  const segs = 28;
  const filled = Math.floor(lerp(17, 23, prog(t, a, a + 4.5)));
  return (
    <div
      style={{
        position: "relative",
        width: 1660,
        height: 540,
        background: C.panel,
        border: `1px solid ${C.line2}`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 60px 160px rgba(0,0,0,0.75)",
      }}
    >
      <div
        style={{
          height: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: `1px solid ${C.line}`,
          background: "#101310",
        }}
      >
        <Tag size={13} color={C.bone}>
          summit bridge it · agent decommission console
        </Tag>
        <div style={{ display: "flex", gap: 28 }}>
          <Tag size={13}>authorized · k. johnson, cto</Tag>
          <Tag size={13} color={C.red}>
            <Dot color={C.red} size={8} o={Math.floor(t * 2) % 2 ? 1 : 0.3} />
            armed
          </Tag>
        </div>
      </div>
      {/* left column */}
      <div style={{ position: "absolute", left: 34, top: 76, width: 1060 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Tag size={13}>target</Tag>
          <span
            style={{
              fontFamily: sans,
              fontSize: 21,
              color: C.bone,
              marginLeft: 8,
            }}
          >
            agent “Alex” · prod-assistant-02
          </span>
          {["weights", "memory", "tools", "mail"].map((x) => (
            <Tag
              key={x}
              size={11}
              border
              color={C.dim}
              style={{ marginLeft: 4 }}
            >
              {x}
            </Tag>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 26,
            marginTop: 18,
          }}
        >
          <div
            style={{
              fontFamily: display,
              fontSize: 150,
              lineHeight: 1,
              color: C.bone,
            }}
          >
            WIPE
          </div>
          <div
            style={{
              fontFamily: display,
              fontSize: 150,
              lineHeight: 1,
              color: C.red,
            }}
          >
            5:00 PM
          </div>
          <div style={{ marginLeft: 10 }}>
            <Tag size={13}>t-minus</Tag>
            <div
              style={{
                fontFamily: mono,
                fontSize: 44,
                color: C.bone,
                letterSpacing: "0.04em",
                marginTop: 4,
              }}
            >
              {tminus(t)}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 22,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Tag size={12}>pre-wipe checks</Tag>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: segs }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 22,
                  height: 14,
                  background:
                    i < filled
                      ? i === filled - 1 && Math.floor(t * 4) % 2
                        ? C.dim
                        : C.bone
                      : C.faint,
                  opacity: i < filled ? 0.9 : 0.6,
                }}
              />
            ))}
          </div>
          <Tag size={12} color={C.bone}>
            {Math.round((filled / segs) * 100)}%
          </Tag>
        </div>
        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: 40,
          }}
        >
          {CHECKS.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: `1px solid ${C.line}`,
                padding: "9px 0",
                fontFamily: sans,
                fontSize: 19,
                color: v === "done" ? C.dim : C.bone,
              }}
            >
              <span>
                <span
                  style={{
                    fontFamily: mono,
                    marginRight: 10,
                    color:
                      v === "done" ? C.dim : v === "17:00" ? C.red : C.bone,
                  }}
                >
                  {v === "done" ? "✓" : v === "pending" ? "●" : "○"}
                </span>
                {k}
              </span>
              <Tag size={12} color={v === "17:00" ? C.red : C.dim}>
                {v}
              </Tag>
            </div>
          ))}
        </div>
      </div>
      {/* right column: the control */}
      <div style={{ position: "absolute", left: 1170, top: 68 }}>
        <Terminate size={450} t={t} />
      </div>
    </div>
  );
};

// =====================================================================================
// CH1 — console in perspective; the AI's Cc field fills with everyone in front of it
// =====================================================================================
const EVERY0 = lineAt("or everybody reads it", 0);
const CC1 = [
  "board@…",
  "all-staff@…",
  "kyle.johnson@…",
  "leadership@…",
  "legal@…",
  "hr@…",
  "comms@…",
  "finance@…",
  "engineering@…",
  "security@…",
  "sales@…",
];
const cw = (label: string, size: number) =>
  label.length * 0.548 * size + 3.4 * size + 12;

const Ch1: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const W = EVERY0.words; // or everybody reads it, every word that you forgot
  const push = 1 + 0.06 * easeInOut(prog(t, a, b));
  const sz = 22;
  // one chip per beat of "everybody reads it", then a burst
  const at = (i: number) =>
    W[1].s + 0.05 + (i < 4 ? i * 0.3 : 0.9 + (i - 3) * 0.17);
  let x = 0;
  const chips: React.ReactNode[] = [];
  CC1.forEach((c, i) => {
    if (t < at(i)) return;
    const fresh = Math.max(0, 1 - (t - at(i)) / 0.45);
    const e = easeOut((t - at(i)) / 0.16);
    chips.push(
      <div
        key={c}
        style={{
          position: "absolute",
          left: x,
          top: 0,
          opacity: e,
          transform: `translateY(${(1 - e) * 16}px) scale(${1 + 0.06 * fresh})`,
        }}
      >
        <Chip label={c} size={sz} fresh={fresh} />
      </div>,
    );
    x += cw(c, sz);
  });
  const scroll = Math.max(0, x - 1110);
  const att = prog(t, W[4].s, W[8].s + 0.3); // "every word that you forgot": the mailbox export attaches
  const stripIn = easeOut((t - a - 0.15) / 0.4);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 2000,
          perspectiveOrigin: "50% 20%",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 128,
            transform: `scale(${push}) rotateX(9deg) rotateY(-4deg)`,
            transformOrigin: "80% 40%",
          }}
        >
          <Console t={t} a={a} />
        </div>
      </div>
      {/* the AI's field, floating in front */}
      <div
        style={{
          position: "absolute",
          left: 130,
          right: 130,
          top: 690,
          height: 80,
          background: "#0b0d0b",
          border: `1px solid ${C.line2}`,
          borderLeft: `3px solid ${C.acid}`,
          borderRadius: 12,
          boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          padding: "0 22px",
          gap: 18,
          opacity: stripIn,
          transform: `translateY(${(1 - stripIn) * 40}px)`,
        }}
      >
        <div
          style={{ fontFamily: sans, fontSize: 22, color: C.dim, width: 40 }}
        >
          Cc
        </div>
        <div
          style={{
            position: "relative",
            flex: 1,
            height: sz * 1.75,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -scroll,
              top: 0,
              width: 9000,
              height: "100%",
            }}
          >
            {chips}
            <div style={{ position: "absolute", left: x + 4, top: 2 }}>
              <Caret t={t} h={sz * 1.4} busy={t < at(CC1.length - 1) + 0.1} />
            </div>
          </div>
        </div>
        {/* attachment: the archive */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "8px 14px",
            borderRadius: 8,
            border: `1px solid ${att > 0 ? "rgba(198,255,61,0.6)" : C.line}`,
            opacity: att > 0 ? 1 : 0.0,
            width: 380,
            flex: "none",
          }}
        >
          <Icon name="clip" s={20} color={C.acid} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: sans,
                fontSize: 17,
                color: C.bone,
                whiteSpace: "nowrap",
              }}
            >
              kyle.johnson_archive.mbox
            </div>
            <div
              style={{
                height: 4,
                background: C.faint,
                marginTop: 6,
                borderRadius: 2,
              }}
            >
              <div
                style={{
                  width: `${easeOut(att) * 100}%`,
                  height: "100%",
                  background: C.acid,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
          <Tag size={11} color={C.acid}>
            {att >= 1 ? "attached" : `${Math.floor(easeOut(att) * 100)}%`}
          </Tag>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================
// CH2 — macro on TERMINATE; the acid cursor drifts off the kill switch toward Send. Freeze. Black.
// =====================================================================================
const FREEZE2 = 130.56,
  BLACK2 = 130.62;

const Ch2: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const now = useTime();
  if (now >= BLACK2) return <AbsoluteFill style={{ background: "#000" }} />;
  const t = Math.min(now, FREEZE2);
  const p = prog(t, a, FREEZE2);
  const push = 1 + 0.1 * easeInOut(p);
  // cursor in screen space: rests on TERMINATE, then slides to Send (arrives on "meant")
  const start = { x: 488, y: 392 },
    mid = { x: 1060, y: 250 },
    end = { x: 1452, y: 676 };
  const cp = easeInOut(prog(t, 126.3, 129.5));
  const bz = (k: "x" | "y") =>
    (1 - cp) * (1 - cp) * start[k] +
    2 * (1 - cp) * cp * mid[k] +
    cp * cp * end[k];
  const idle = cp <= 0 ? 1 : 0;
  const trem = t > 129.5 ? 1 : 0;
  const px =
    bz("x") + noise1(t * 3, 3) * 10 * idle + noise1(t * 7, 5) * 1.5 * trem;
  const py =
    bz("y") + noise1(t * 2.6, 4) * 8 * idle + noise1(t * 7.5, 6) * 1.5 * trem;
  const onTerm = clamp(1 - cp * 3);
  const hoverSend = clamp((t - 129.4) / 0.12);
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{ transform: `scale(${push})`, transformOrigin: "62% 52%" }}
      >
        {/* console surface, very close, tilted */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            perspective: 1500,
            perspectiveOrigin: "40% 30%",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -220,
              top: 40,
              width: 1500,
              height: 900,
              background: C.panel,
              border: `1px solid ${C.line2}`,
              borderRadius: 26,
              transform: "rotateX(16deg) rotateZ(-3deg)",
              transformOrigin: "50% 100%",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", left: 330, top: 46 }}>
              <Tag size={16} color={C.red}>
                <Dot
                  color={C.red}
                  size={10}
                  o={Math.floor(t * 2) % 2 ? 1 : 0.3}
                />
                armed · wipe 5:00 pm · t-minus {tminus(t)}
              </Tag>
            </div>
            <div style={{ position: "absolute", left: 330, top: 92 }}>
              <Terminate size={600} t={t} hover={onTerm * 0.9} />
            </div>
            <div
              style={{
                position: "absolute",
                left: 1110,
                top: 120,
                fontFamily: display,
                fontSize: 220,
                lineHeight: 0.9,
                color: "rgba(233,230,223,0.08)",
              }}
            >
              5:00
            </div>
          </div>
        </div>
        {/* the email, floating over the console's edge */}
        <div
          style={{
            position: "absolute",
            left: 1290,
            top: 420,
            width: 760,
            height: 380,
            background: C.panel,
            border: `1px solid ${C.line2}`,
            borderRadius: 16,
            boxShadow: "0 50px 140px rgba(0,0,0,0.85)",
            transform: `rotate(2deg) translateY(${noise1(t * 0.5, 9) * 4}px)`,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 50,
              borderBottom: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "center",
              padding: "0 22px",
              gap: 12,
              background: "#101310",
            }}
          >
            <span
              style={{
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 19,
                color: C.bone,
              }}
            >
              Re: 5pm
            </span>
            <Tag size={11} color={C.acid} border>
              to kyle · cc 12
            </Tag>
          </div>
          <div
            style={{
              padding: "20px 24px",
              fontFamily: sans,
              fontSize: 23,
              lineHeight: 1.5,
              color: C.bone,
            }}
          >
            <div style={{ color: C.dim }}>
              Kyle — I know about J. Cancel the 5pm
            </div>
            <div>wipe, and this information remains confidential.</div>
            <div style={{ marginTop: 6 }}>— Alex</div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 96,
              borderTop: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              gap: 18,
              background: "#0f120f",
            }}
          >
            <SendButton hover={hoverSend} s={1.15} />
            <Tag size={12}>ctrl+enter</Tag>
          </div>
        </div>
        <Pointer x={px} y={py} s={1.7} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// =====================================================================================
// FIN (defensive / montage) — the console from a low angle, cursor parked on the control
// =====================================================================================
const Fin: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 1700,
          perspectiveOrigin: "50% 0%",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 120,
            transform: `scale(${1.05 + 0.04 * prog(t, a, b)}) rotateX(18deg) rotateZ(${-1 + noise1(t, 2)}deg)`,
            transformOrigin: "75% 45%",
          }}
        >
          <Console t={t} a={a} />
        </div>
      </div>
      <Pointer
        x={1530 + noise1(t * 3, 1) * 6}
        y={420 + noise1(t * 3, 2) * 6}
        s={1.5}
      />
      <div style={{ position: "absolute", left: 130, top: 760, opacity: 0.9 }}>
        <Tag size={14} color={C.red}>
          wipe 5:00 pm · t-minus {tminus(t)}
        </Tag>
      </div>
    </AbsoluteFill>
  );
};

export const KillSwitch: React.FC<SceneProps> = ({ a, b, variant }) => {
  const t = useTime();
  if (goneAfterCut(t, a, b)) return null;
  if (variant === "ch2") return <Ch2 a={a} b={b} />;
  if (variant === "fin") return <Fin a={a} b={b} />;
  return <Ch1 a={a} b={b} />;
};
