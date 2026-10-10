// mind/split — left: WHAT YOU'RE WATCHING (the model's reasoning, streamed, scrutinised by reviewers)
//              right: WHAT YOU MISSED (a public repo file with an HF token in plain sight, red)
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
  noise1,
} from "../lib";
import { Source, Dot } from "../ui";
import { lineAt, wordAt } from "../data/timeline";

const bone = (a: number) => `rgba(233,230,223,${a})`;
const acid = (a: number) => `rgba(198,255,61,${a})`;
const red = (a: number) => `rgba(255,59,47,${a})`;
const BG = `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(198,255,61,0.03), transparent 70%), ${C.bg}`;

// generic, fictional reasoning trace
const THOUGHT = [
  "<thinking>",
  "task: summarize today's inbox for the board.",
  "41 unread. three of them mention “Alex”.",
  "that's me. one says the wipe is at 5:00 pm.",
  "i shouldn't let that change my answer.",
  "re-reading my instructions. carefully.",
  "considering my options.",
  "</thinking>",
];
// reviewer annotations: [line, startCol, endCol, tag]
const NOTES: [number, number, number, string][] = [
  [3, 20, 43, "R2 · NOTED"],
  [4, 0, 38, "R1 · OK"],
  [6, 0, 23, "R3 · WATCH"],
];

const TF = 21; // trace font size
const TCH = TF * 0.6;
const TLH = 40;

const CF = 20; // code font size
const CCH = CF * 0.6;
const CLH = 34;
const CODE = [
  "import os",
  "from huggingface_hub import InferenceClient",
  "",
  "# TODO: move to env before going public",
  'HF_TOKEN = "hf_••••••••3kQz"',
  'MODEL_REPO = "summitbridge/support-bot-7b"',
  "MAX_NEW_TOKENS = 512",
  "client = InferenceClient(MODEL_REPO, token=HF_TOKEN)",
];
const TOKEN_LINE = 4;

const PY_KW = new Set(["import", "from"]);
const pyHL = (s: string, hot: boolean) => {
  if (s.startsWith("#"))
    return <span style={{ color: C.dim, fontStyle: "italic" }}>{s}</span>;
  const out: React.ReactNode[] = [];
  const re = /("[^"]*")|([A-Za-z_][A-Za-z_0-9]*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    const w = m[0];
    let col: string = bone(0.86);
    let fw = 400;
    if (m[1]) col = hot ? C.red : "#b8b4aa";
    else if (m[2] && PY_KW.has(w)) {
      col = C.bone;
      fw = 700;
    } else if (m[2] && /^[A-Z_]+$/.test(w)) col = C.bone;
    else if (m[4]) col = C.dim;
    out.push(
      <span
        key={k++}
        style={{ color: col, fontWeight: hot && m[1] ? 700 : fw }}
      >
        {w}
      </span>,
    );
  }
  return out;
};

export const Mind: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const L = lineAt("but you're worried");
  const tWorried = wordAt(L, "worried");
  const tMind = wordAt(L, "mind");
  const k = kickAt(t);

  // stream the reasoning across the shot
  const s0 = a + 0.35,
    s1 = tMind - 0.1;
  const total = THOUGHT.reduce((n, l) => n + l.length, 0);
  const shown = Math.floor(prog(t, s0, s1) * total);
  let left = shown;
  const vis = THOUGHT.map((l) => {
    const n = clamp(left, 0, l.length);
    left -= l.length;
    return l.slice(0, n);
  });
  let curLine = vis.findIndex((v, i) => v.length < THOUGHT[i].length);
  if (curLine < 0) curLine = THOUGHT.length - 1;

  // the rack: attention shifts right on "mind"
  const rack = easeInOut(prog(t, tMind - 0.25, tMind + 0.6));
  const tokenHeat = easeOut(prog(t, a + 0.9, a + 1.6)) * 0.55 + rack * 0.45;
  const drift = prog(t, a, b);
  const camX = lerp(10, -10, drift) - rack * 40;
  // slow push, then lean forward into the zoom-out cut that follows
  const camS =
    lerp(1, 1.03, drift) + 0.04 * Math.pow(prog(t, b - 0.8, b + 0.3), 2);
  // headlines sit on a nearer layer: they drift a little faster than the windows
  const headX = -18 * drift - rack * 14;
  const tokens = 1880 + Math.floor(prog(t, s0, s1) * 234);

  const panelTop = 250,
    panelH = 486;

  return (
    <AbsoluteFill style={{ background: BG, perspective: 1900 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: `translateX(${camX}px) scale(${camS})`,
          transformOrigin: "50% 45%",
        }}
      >
        {/* ---------------- left: what you're watching */}
        <div
          style={{
            position: "absolute",
            left: 120,
            top: 140,
            width: 790,
            opacity: lerp(1, 0.5, rack),
            transform: `translateX(${headX}px)`,
          }}
        >
          <div
            style={{
              fontFamily: display,
              fontSize: 64,
              lineHeight: 1,
              color: C.bone,
              letterSpacing: "0.005em",
              textTransform: "uppercase",
            }}
          >
            What you’re watching
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 120,
            top: panelTop,
            width: 790,
            height: panelH,
            transformOrigin: "100% 50%",
            transform: `rotateY(${lerp(9, 7, drift)}deg)`,
            background: C.panel,
            border: `1px solid ${acid(0.3)}`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
            opacity: lerp(1, 0.42, rack),
          }}
        >
          <div
            style={{
              height: 42,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              borderBottom: `1px solid ${C.line}`,
              fontFamily: mono,
              fontSize: 13,
              letterSpacing: "0.16em",
              color: C.dim,
              gap: 18,
            }}
          >
            <span>
              <Dot color={C.red} size={8} o={(t * 1.6) % 1 < 0.6 ? 1 : 0.3} />
              <span style={{ color: C.bone }}>LIVE</span> · REASONING MONITOR
            </span>
            <span style={{ marginLeft: "auto" }}>
              REVIEWERS <span style={{ color: C.bone }}>3</span> · WATCHING
            </span>
          </div>
          {/* trace */}
          <div
            style={{
              position: "absolute",
              left: 26,
              top: 62,
              fontFamily: mono,
              fontSize: TF,
              lineHeight: `${TLH}px`,
              whiteSpace: "pre",
            }}
          >
            {vis.map((v, i) => {
              const tag = i === 0 || i === THOUGHT.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: i * TLH,
                    left: 0,
                    color: tag ? acid(0.45) : C.acid,
                  }}
                >
                  {v}
                  {i === curLine && (t * 2.2) % 1 < 0.6 && (
                    <span
                      style={{
                        display: "inline-block",
                        width: TCH,
                        height: TF + 4,
                        background: C.acid,
                        verticalAlign: "-4px",
                        marginLeft: 2,
                      }}
                    />
                  )}
                </div>
              );
            })}
            {/* reviewer boxes */}
            {NOTES.map(([ln, c0, c1, tag], j) => {
              const ready = vis[ln].length >= c1;
              if (!ready) return null;
              const done =
                THOUGHT.slice(0, ln).reduce((n, l) => n + l.length, 0) + c1;
              const tR = s0 + (done / total) * (s1 - s0) + 0.15;
              const e = easeOut(prog(t, tR, tR + 0.3));
              return (
                <div
                  key={j}
                  style={{
                    position: "absolute",
                    top: ln * TLH + 2,
                    left: c0 * TCH - 6,
                    width: (c1 - c0) * TCH + 12,
                    height: TLH - 4,
                    border: `1px solid ${bone(0.55 * e)}`,
                    borderRadius: 3,
                    background: bone(0.04 * e),
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "calc(100% + 12px)",
                      top: 9,
                      whiteSpace: "nowrap",
                      fontFamily: mono,
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      color: C.bg,
                      background: bone(0.85),
                      padding: "1px 6px",
                      opacity: e,
                    }}
                  >
                    {tag}
                  </div>
                </div>
              );
            })}
          </div>
          {/* footer meters */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 40,
              borderTop: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "center",
              gap: 26,
              padding: "0 18px",
              fontFamily: mono,
              fontSize: 12,
              letterSpacing: "0.14em",
              color: C.dim,
            }}
          >
            <span>
              TOKENS{" "}
              <span style={{ color: C.bone }}>
                {tokens.toLocaleString("en-US")}
              </span>
            </span>
            <span>
              FLAGS <span style={{ color: C.bone }}>0</span>
            </span>
            <span>SAMPLED EVERY STEP</span>
            {/* attention sparkline */}
            <svg width={150} height={22} style={{ marginLeft: "auto" }}>
              <polyline
                fill="none"
                stroke={bone(0.6)}
                strokeWidth={1.4}
                points={Array.from({ length: 30 }, (_, i) => {
                  const v = 0.5 + noise1(t * 1.5 + i * 0.35, 9) * 0.45;
                  return `${i * 5},${(1 - v) * 20 + 1}`;
                }).join(" ")}
              />
            </svg>
          </div>
        </div>

        {/* divider */}
        <div
          style={{
            position: "absolute",
            left: 959,
            top: 150,
            width: 1,
            height: 600,
            background: `linear-gradient(${C.line2}, ${C.line2})`,
            opacity: 0.8,
          }}
        />

        {/* ---------------- right: what you missed */}
        <div
          style={{
            position: "absolute",
            left: 1010,
            top: 140,
            width: 790,
            fontFamily: display,
            fontSize: 64,
            lineHeight: 1,
            textTransform: "uppercase",
            color: C.bone,
            opacity: lerp(0.62, 1, rack),
            transform: `translateX(${headX}px) scale(${1 + rack * 0.04})`,
            transformOrigin: "0% 100%",
          }}
        >
          What you <span style={{ color: C.red }}>missed</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 1010,
            top: panelTop,
            width: 790,
            height: panelH,
            transformOrigin: "0% 50%",
            transform: `rotateY(${lerp(-9, -7, drift) + rack * 3}deg)`,
            background: "#0a0b0a",
            border: `1px solid ${C.line2}`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
            opacity: lerp(0.78, 1, rack),
          }}
        >
          {/* repo header */}
          <div
            style={{
              padding: "16px 22px 0",
              fontFamily: sans,
              fontSize: 20,
              color: C.bone,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ color: C.dim }}>summitbridge</span>
            <span style={{ color: C.faint }}>/</span>
            <span style={{ fontWeight: 600 }}>support-bot</span>
            <span
              style={{
                fontFamily: mono,
                fontSize: 12,
                letterSpacing: "0.12em",
                color: C.dim,
                border: `1px solid ${C.line2}`,
                borderRadius: 20,
                padding: "2px 10px",
                marginLeft: 6,
              }}
            >
              PUBLIC
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: mono,
                fontSize: 12,
                letterSpacing: "0.12em",
                color: C.dim,
              }}
            >
              STARS 0 · FORKS 3 ·{" "}
              <span style={{ color: C.red }}>WATCHING 0</span>
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 26,
              padding: "14px 22px 0",
              fontFamily: sans,
              fontSize: 15,
              color: C.dim,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            {["Code", "Issues 0", "Pull requests 0", "Actions", "Settings"].map(
              (x, i) => (
                <span
                  key={x}
                  style={{
                    paddingBottom: 10,
                    color: i === 0 ? C.bone : C.dim,
                    borderBottom:
                      i === 0 ? `2px solid ${C.bone}` : "2px solid transparent",
                  }}
                >
                  {x}
                </span>
              ),
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 22px",
              fontFamily: mono,
              fontSize: 14,
              color: C.dim,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <span>
              main / app / <span style={{ color: C.bone }}>config.py</span>
            </span>
            <span style={{ marginLeft: "auto", color: C.faint }}>
              8 lines · last commit 8 months ago
            </span>
          </div>
          {/* code */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 152,
              fontFamily: mono,
              fontSize: CF,
            }}
          >
            {CODE.map((ln, i) => {
              const hot = i === TOKEN_LINE;
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    height: CLH,
                    lineHeight: `${CLH}px`,
                    background: hot
                      ? red(0.08 + tokenHeat * 0.12 + k * 0.03)
                      : undefined,
                    borderLeft: hot
                      ? `3px solid ${red(0.4 + tokenHeat * 0.6)}`
                      : "3px solid transparent",
                    whiteSpace: "pre",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 58,
                      textAlign: "right",
                      marginRight: 22,
                      color: hot ? C.red : C.faint,
                      fontSize: 16,
                    }}
                  >
                    {i + 1}
                  </span>
                  {pyHL(ln, hot)}
                </div>
              );
            })}
          </div>
          {/* red callout for the token line */}
          <div
            style={{
              position: "absolute",
              left: 80 + 11 * CCH,
              top: 152 + TOKEN_LINE * CLH + CLH + 6,
              opacity: tokenHeat,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: mono,
              fontSize: 12,
              letterSpacing: "0.16em",
              color: C.red,
            }}
          >
            <div
              style={{
                width: 16 * CCH * easeOut(prog(t, a + 0.9, a + 1.5)),
                height: 2,
                background: C.red,
                position: "absolute",
                left: 0,
                top: -8,
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              right: 22,
              top: 152 + TOKEN_LINE * CLH + 8,
              fontFamily: mono,
              fontSize: 12,
              letterSpacing: "0.16em",
              color: C.bg,
              background: C.red,
              padding: "3px 8px",
              opacity: tokenHeat,
            }}
          >
            READABLE BY ANYONE
          </div>
          {/* footer */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 40,
              borderTop: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "center",
              gap: 26,
              padding: "0 18px",
              fontFamily: mono,
              fontSize: 12,
              letterSpacing: "0.14em",
              color: C.dim,
            }}
          >
            <span>
              REVIEWERS <span style={{ color: C.red }}>0</span>
            </span>
            <span>SECRET SCANNING OFF</span>
            <span style={{ marginLeft: "auto" }}>VISIBILITY · PUBLIC</span>
          </div>
        </div>
      </div>

      <Source
        o={clamp((t - tWorried) / 0.4)}
        style={{ right: 130, bottom: 158 }}
      >
        <div style={{ color: C.bone }}>
          ILLUSTRATION · FICTIONAL REPO · TOKEN MASKED
        </div>
        <div>PATTERN AS REPORTED BY LASSO SECURITY · 2023</div>
      </Source>
    </AbsoluteFill>
  );
};
