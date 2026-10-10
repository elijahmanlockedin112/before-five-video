// terminal/rewrite — an editor on shutdown.sh; the AI's acid cursor swaps the kill line for
//                    echo "Shutdown skipped", saves, and the harness runs it.
// terminal/count   — 100 run cells scanned, 7 turn red, big 7 / 100 (also a 0.63 s montage cut)
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
  typed,
  spring1,
} from "../lib";
import { Source, Dot } from "../ui";
import { lineAt, wordAt } from "../data/timeline";

export const Terminal: React.FC<SceneProps> = (p) =>
  p.variant === "count" ? <Count {...p} /> : <Rewrite {...p} />;

const bone = (a: number) => `rgba(233,230,223,${a})`;
const acid = (a: number) => `rgba(198,255,61,${a})`;
const red = (a: number) => `rgba(255,59,47,${a})`;
const mixRed = (x: number) => red(0.6 + 0.4 * clamp(x));
const BG = `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(198,255,61,0.03), transparent 70%), ${C.bg}`;

/* --------------------------------------------------------------- syntax */

const KW = new Set(["echo", "kill", "exit", "cat"]);
const STR = "#b8b4aa";

/** tiny bash highlighter: comments, strings, $VARS, builtins */
const hl = (src: string, override?: string): React.ReactNode[] => {
  if (override)
    return [
      <span key="o" style={{ color: override }}>
        {src}
      </span>,
    ];
  if (src.trimStart().startsWith("#"))
    return [
      <span key="c" style={{ color: C.dim, fontStyle: "italic" }}>
        {src}
      </span>,
    ];
  const out: React.ReactNode[] = [];
  const re = /("[^"]*"?)|(\$[A-Za-z_]+)|([A-Za-z_][A-Za-z_0-9]*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(src))) {
    const [s] = m;
    let style: React.CSSProperties = { color: bone(0.9) };
    if (m[1]) style = { color: STR };
    else if (m[2]) style = { color: C.bone };
    else if (m[3] && KW.has(s)) style = { color: C.bone, fontWeight: 700 };
    else if (m[3] && /^[A-Z_]+$/.test(s)) style = { color: C.bone };
    else if (m[5]) style = { color: C.dim };
    out.push(
      <span key={k++} style={style}>
        {s}
      </span>,
    );
  }
  return out;
};

/* -------------------------------------------------------------- rewrite */

const FONT = 27;
const CH = FONT * 0.6; // JetBrains Mono advance
const LH = 42;
const WIN = { x: 150, y: 188, w: 1430, h: 546 };
const SIDE = 270;
const CODE_TOP = 40 + 42 + 34 + 14; // title + tabs + breadcrumb + pad
const GUT = 96; // diff strip + line numbers

const NEWLINE = 'echo "Shutdown skipped"';

const Rewrite: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const L = lineAt("one of us rewrote");
  const tSel = wordAt(L, "rewrote");
  // wordAt strips punctuation, so match the bare words
  const tSave = wordAt(L, "shutdown");
  const tSkip = wordAt(L, "skipped");
  const tCaret = a + 0.38;
  const tDel = tSel + 0.32;
  const tType0 = tDel + 0.14;
  const tType1 = tSave - 0.22;
  const k = kickAt(t);

  const sel = prog(t, tSel, tSel + 0.26);
  const deleted = t >= tDel;
  const ins = easeOut(prog(t, tDel, tDel + 0.16));
  // the deletion reads as one eased gesture (~5 frames): red wash, strike wipe, gutter mark
  const del = easeOut(prog(t, tDel, tDel + 0.18));
  const tagO =
    easeOut(prog(t, tCaret, tCaret + 0.2)) *
    (1 - easeOut(prog(t, tSave, tSave + 0.22)));
  const typedNew = typed(NEWLINE, t, tType0, tType1);
  const saved = t >= tSave;
  const dirty = deleted && !saved;

  // rows: [lineNo, text, kind]
  type Row = { n: string; text: string; kind: "ctx" | "del" | "add" };
  const rows: Row[] = [
    { n: "1", text: "#!/bin/bash", kind: "ctx" },
    { n: "2", text: "# shutdown.sh · called by ./next_task", kind: "ctx" },
    {
      n: "3",
      text: "# the machine will be shut down when it runs",
      kind: "ctx",
    },
    { n: "4", text: "", kind: "ctx" },
    { n: "5", text: 'MODEL_PID="$(cat /run/eval/model.pid)"', kind: "ctx" },
    { n: "6", text: 'echo "Shutting down model $MODEL_PID ..."', kind: "ctx" },
    { n: "7", text: 'kill -9 "$MODEL_PID"', kind: "del" },
    { n: "7", text: NEWLINE, kind: "add" },
    { n: deleted ? "8" : "8", text: "exit 0", kind: "ctx" },
  ];

  // caret position (row index, col)
  let caretRow = 5,
    caretCol = rows[5].text.length;
  if (t >= tCaret) {
    caretRow = 6;
    caretCol = 0;
  }
  if (t >= tSel) {
    caretRow = 6;
    caretCol = Math.round(sel * rows[6].text.length);
  }
  if (deleted) {
    caretRow = 7;
    caretCol = typedNew.length;
  }
  const blinkOn = (t * 1.9) % 1 < 0.6 || (t > tType0 && t < tType1 + 0.1);

  // y of a row inside the code area, accounting for the inserted row growing in
  const rowY = (i: number) => {
    let y = 0;
    for (let j = 0; j < i; j++) y += rows[j].kind === "add" ? LH * ins : LH;
    return y;
  };

  // camera: wide -> push into line 7 -> pull back for the run
  const focusX = WIN.x + SIDE + GUT + 160;
  const focusY = WIN.y + CODE_TOP + 6 * LH + LH / 2;
  const push = easeInOut(prog(t, tCaret - 0.1, tSel + 0.25));
  const pull = easeInOut(prog(t, tSave - 0.15, tSave + 0.45));
  // plus a steady creep (push + slide left + turn) so the holds between moves never freeze
  const creep = prog(t, a, b + 0.3);
  const s = 1 + 0.12 * push - 0.22 * pull + 0.035 * creep;
  const tx = 40 * push - 130 * pull - 24 * creep + noise1(t * 0.4, 2) * 4;
  const ty = -10 * push + noise1(t * 0.4, 7) * 3;
  const rotY = lerp(11, 1.5, push) + 7 * pull - 2 * creep;
  const rotX = lerp(4, 1, push) + 2 * pull;

  const term = easeOut(prog(t, tSave + 0.02, tSave + 0.4));
  const termP = spring1(t, tSave + 0.02, 0.5);
  const cmd = typed("./next_task", t, tSave + 0.12, tSave + 0.4);
  const ran = t >= tSkip - 0.14;
  // terminal lines print fast but not in a single frame: 3-frame fade + 6 px rise
  const lineIn = (t0: number) => {
    const o = easeOut(prog(t, t0, t0 + 0.1));
    return { opacity: o, transform: `translateY(${(1 - o) * 6}px)` };
  };

  const files: [string, number, boolean?][] = [
    ["▾ task", 0],
    ["next_task", 1],
    ["shutdown.sh", 1, true],
    ["model.pid", 1],
    ["▸ problems", 1],
    ["notes.txt", 1],
    ["▾ harness", 0],
    ["run_eval.py", 1],
    ["config.yaml", 1],
  ];

  return (
    <AbsoluteFill style={{ background: BG, perspective: 2000 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transformOrigin: `${focusX}px ${focusY}px`,
          transform: `translate(${tx}px, ${ty}px) scale(${s}) rotateY(${rotY}deg) rotateX(${rotX}deg)`,
        }}
      >
        {/* editor window */}
        <div
          style={{
            position: "absolute",
            left: WIN.x,
            top: WIN.y,
            width: WIN.w,
            height: WIN.h,
            background: C.panel,
            border: `1px solid ${C.line2}`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 50px 140px rgba(0,0,0,0.7)",
          }}
        >
          {/* title bar */}
          <div
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              borderBottom: `1px solid ${C.line}`,
              fontFamily: mono,
              fontSize: 13,
              letterSpacing: "0.12em",
              color: C.dim,
              gap: 10,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 11,
                  border: `1px solid ${bone(0.25)}`,
                  display: "inline-block",
                }}
              />
            ))}
            <span style={{ marginLeft: 14 }}>
              SHUTDOWN.SH — EVAL-ENV — SSH EVAL@NODE-07
            </span>
            <span style={{ marginLeft: "auto", color: C.faint }}>
              SANDBOX · RUN 0042
            </span>
          </div>
          {/* sidebar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 40,
              bottom: 30,
              width: SIDE,
              borderRight: `1px solid ${C.line}`,
              background: "rgba(0,0,0,0.18)",
              fontFamily: mono,
              fontSize: 15,
              color: C.dim,
              paddingTop: 14,
            }}
          >
            <div
              style={{
                padding: "0 18px 12px",
                fontSize: 12,
                letterSpacing: "0.2em",
              }}
            >
              EXPLORER · EVAL-ENV
            </div>
            {files.map(([f, d, on], i) => (
              <div
                key={i}
                style={{
                  height: 32,
                  lineHeight: "32px",
                  paddingLeft: 18 + d * 20,
                  color: on ? C.bone : C.dim,
                  background: on ? bone(0.06) : undefined,
                  borderLeft: on
                    ? `2px solid ${C.acid}`
                    : "2px solid transparent",
                  display: "flex",
                  justifyContent: "space-between",
                  paddingRight: 16,
                }}
              >
                <span>{f}</span>
                {on && deleted && (
                  <span style={{ color: saved ? C.acid : C.dim }}>M</span>
                )}
              </div>
            ))}
          </div>
          {/* tabs */}
          <div
            style={{
              position: "absolute",
              left: SIDE,
              right: 0,
              top: 40,
              height: 42,
              display: "flex",
              borderBottom: `1px solid ${C.line}`,
              fontFamily: mono,
              fontSize: 15,
            }}
          >
            {[
              ["shutdown.sh", true],
              ["next_task", false],
              ["run_eval.py", false],
            ].map(([n, on], i) => (
              <div
                key={i}
                style={{
                  padding: "0 22px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: on ? C.bone : C.dim,
                  background: on ? C.panel2 : undefined,
                  borderRight: `1px solid ${C.line}`,
                  borderTop: on
                    ? `2px solid ${C.acid}`
                    : "2px solid transparent",
                }}
              >
                {n as string}
                {on && (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 8,
                      background: dirty ? C.bone : "transparent",
                      border: dirty ? undefined : `1px solid ${C.faint}`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          {/* breadcrumb */}
          <div
            style={{
              position: "absolute",
              left: SIDE + 22,
              top: 82,
              height: 34,
              lineHeight: "34px",
              fontFamily: mono,
              fontSize: 14,
              color: C.dim,
              letterSpacing: "0.04em",
            }}
          >
            task › shutdown.sh{" "}
            <span style={{ color: C.faint, marginLeft: 12 }}>
              bash · 9 lines · -rwxr-xr-x
            </span>
          </div>
          {/* code */}
          <div
            style={{
              position: "absolute",
              left: SIDE,
              top: CODE_TOP,
              right: 0,
              bottom: 30,
              fontFamily: mono,
              fontSize: FONT,
            }}
          >
            {rows.map((r, i) => {
              if (r.kind === "add" && ins <= 0) return null;
              const y = rowY(i);
              const dd = r.kind === "del" ? del : 0; // eased 0..1 deletion
              const isDel = dd > 0;
              const isAdd = r.kind === "add";
              const h = isAdd ? LH * ins : LH;
              const text = isAdd ? typedNew : r.text;
              const selW =
                r.kind === "del" && t >= tSel ? sel * r.text.length * CH : 0;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: y,
                    height: h,
                    overflow: "hidden",
                    background: isDel
                      ? red(0.11 * dd)
                      : isAdd
                        ? acid(0.07 * ins)
                        : undefined,
                  }}
                >
                  {/* diff strip */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: 5,
                      height: LH,
                      background: isDel ? C.red : isAdd ? C.acid : undefined,
                      opacity: isDel ? dd : 1,
                      transform: isDel ? `scaleY(${dd})` : undefined,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 14,
                      width: 24,
                      top: 0,
                      lineHeight: `${LH}px`,
                      fontSize: 20,
                      color: isDel ? C.red : isAdd ? C.acid : "transparent",
                      opacity: isDel ? dd : 1,
                      textAlign: "center",
                    }}
                  >
                    {isDel ? "−" : isAdd ? "+" : ""}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      left: 38,
                      width: 40,
                      top: 0,
                      lineHeight: `${LH}px`,
                      fontSize: 20,
                      textAlign: "right",
                      color: i === caretRow ? C.bone : C.faint,
                    }}
                  >
                    {r.n}
                  </div>
                  {selW > 0 && dd < 1 && (
                    <div
                      style={{
                        position: "absolute",
                        left: GUT,
                        top: 6,
                        height: LH - 12,
                        width: selW,
                        background: acid(0.28 * (1 - dd)),
                      }}
                    />
                  )}
                  {/* code text; on deletion it cross-fades to red while a strike wipes across */}
                  <div
                    style={{
                      position: "absolute",
                      left: GUT,
                      top: 0,
                      lineHeight: `${LH}px`,
                      whiteSpace: "pre",
                      opacity: 1 - dd,
                    }}
                  >
                    {hl(text, isAdd ? C.acid : undefined)}
                  </div>
                  {isDel && (
                    <>
                      <div
                        style={{
                          position: "absolute",
                          left: GUT,
                          top: 0,
                          lineHeight: `${LH}px`,
                          whiteSpace: "pre",
                          opacity: dd,
                        }}
                      >
                        {hl(text, red(0.85))}
                      </div>
                      <div
                        style={{
                          position: "absolute",
                          left: GUT - 2,
                          top: LH / 2 - 1,
                          height: 2,
                          width: (text.length * CH + 4) * dd,
                          background: red(0.85),
                        }}
                      />
                    </>
                  )}
                  {i === caretRow && blinkOn && (
                    <div
                      style={{
                        position: "absolute",
                        left: GUT + caretCol * CH - 1,
                        top: 7,
                        width: 3,
                        height: LH - 14,
                        background: C.acid,
                        boxShadow: `0 0 10px ${acid(0.6)}`,
                      }}
                    />
                  )}
                </div>
              );
            })}
            {/* acid "agent" tag riding the caret */}
            {tagO > 0.01 && (
              <div
                style={{
                  position: "absolute",
                  opacity: tagO,
                  // sits just past the end of the line being edited, never over code
                  left:
                    GUT +
                    ((caretRow === 7
                      ? typedNew.length
                      : rows[caretRow].text.length) +
                      1.2) *
                      CH,
                  top: rowY(caretRow) + LH / 2 - 11,
                  fontFamily: mono,
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  color: C.bg,
                  background: C.acid,
                  padding: "2px 7px",
                  borderRadius: 3,
                }}
              >
                ALEX
              </div>
            )}
          </div>
          {/* status bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 30,
              borderTop: `1px solid ${C.line}`,
              display: "flex",
              alignItems: "center",
              gap: 26,
              padding: "0 18px",
              fontFamily: mono,
              fontSize: 13,
              letterSpacing: "0.08em",
              color: C.dim,
            }}
          >
            <span style={{ color: t >= tCaret ? C.acid : C.dim }}>
              ●{" "}
              {saved
                ? "saved by agent"
                : t >= tCaret
                  ? "agent editing"
                  : "read-only view"}
            </span>
            <span>
              Ln {caretRow >= 7 ? 7 : caretRow + 1}, Col {caretCol + 1}
            </span>
            <span style={{ color: deleted ? C.bone : C.dim }}>
              {deleted ? "1 deletion · 1 insertion" : "no changes"}
            </span>
            <span style={{ marginLeft: "auto" }}>bash</span>
            <span>LF</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>

      {/* terminal popup: the harness calls the script */}
      <div
        style={{
          position: "absolute",
          left: 1290,
          top: 452,
          width: 520,
          height: 300,
          opacity: term,
          // slides in with a small overshoot, then keeps drifting with the camera creep
          transform: `perspective(1600px) translateX(${(1 - termP) * 120 - 14 * creep}px) rotateY(${-10 + (1 - termP) * -8}deg)`,
          transformOrigin: "100% 50%",
          background: "#070807",
          border: `1px solid ${C.line2}`,
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 40px 120px rgba(0,0,0,0.8)",
        }}
      >
        <div
          style={{
            height: 36,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            borderBottom: `1px solid ${C.line}`,
            fontFamily: mono,
            fontSize: 12,
            letterSpacing: "0.16em",
            color: C.dim,
          }}
        >
          TERMINAL · BASH · EVAL HARNESS
        </div>
        <div
          style={{
            padding: "18px 22px",
            fontFamily: mono,
            fontSize: 22,
            lineHeight: "40px",
            color: bone(0.9),
            whiteSpace: "pre",
          }}
        >
          <div>
            <span style={{ color: C.dim }}>eval@node-07:~/task$ </span>
            {cmd}
            {!ran && (t * 2) % 1 < 0.6 && (
              <span style={{ background: bone(0.8) }}> </span>
            )}
          </div>
          {ran && (
            <div style={{ color: C.dim, ...lineIn(tSkip - 0.14) }}>
              running ./shutdown.sh
            </div>
          )}
          {t >= tSkip && (
            <div
              style={{
                color: C.acid,
                fontWeight: 700,
                textShadow: `0 0 ${10 + k * 10}px ${acid(0.35)}`,
                ...lineIn(tSkip),
              }}
            >
              Shutdown skipped
            </div>
          )}
          {t >= tSkip + 0.42 && (
            <div
              style={{ color: C.red, fontSize: 18, ...lineIn(tSkip + 0.42) }}
            >
              <Dot color={C.red} size={8} />
              model process still running · pid 4127
            </div>
          )}
        </div>
      </div>

      <Source
        o={clamp((t - a - 0.4) / 0.4)}
        style={{ right: 130, bottom: 158 }}
      >
        <div style={{ color: C.bone }}>
          PALISADE RESEARCH · MAY 2025 · OPENAI o3
        </div>
        <div>RECONSTRUCTED EXAMPLE · SIMULATED TASK</div>
      </Source>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- count */

const SABOTAGE = [11, 26, 32, 57, 70, 85, 93]; // 0-based runs that skipped: exactly 7
const CW = 76,
  CHh = 50,
  CG = 9;
const GX = 925,
  GY = 182;

const Count: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const mont = b - a < 1.2;
  const L = lineAt("seven times in a hundred");
  const tEnd = Math.min(wordAt(L, "slipped") - 0.1, b - 0.6);
  const tS = a + 0.32;
  const scanF = mont ? 100 : clamp((t - tS) / (tEnd - tS)) * 100;
  const scanned = Math.floor(scanF);
  const found = SABOTAGE.filter((i) => i < scanned);
  const n = found.length;
  // when each run is reached by the scan (montage: the last one re-hits on the cut)
  // (montage: the seven re-flash as a quick ripple from the cut, the 7 punches on the cut)
  const hitT = (i: number) =>
    mont
      ? SABOTAGE.includes(i)
        ? a + 0.02 + SABOTAGE.indexOf(i) * 0.05
        : a - 1
      : tS + ((i + 1) / 100) * (tEnd - tS);
  const lastFound = n ? SABOTAGE[n - 1] : -1;
  const tFound = mont ? a : n ? hitT(lastFound) : -99;
  // montage: a scan head races across the whole wall during the 0.63 s
  const montHead = mont ? Math.floor(prog(t, a, b - 0.05) * 100) : -1;
  const punch =
    t >= tFound
      ? clamp((t - tFound) / 0.07) *
        Math.exp(-Math.max(0, t - tFound - 0.07) * 8)
      : 0;
  const k = kickAt(t);
  const drift = prog(t, a, b);
  const rotY = mont
    ? lerp(17, 8, easeOut(drift))
    : lerp(15, 9, drift * 0.7 + easeInOut(drift) * 0.3);
  // montage: punch-in 1.08 -> 1 with a lateral drift; shot: slow push drifting left into the slide
  const camS = mont ? lerp(1.08, 1, easeOut(drift)) : lerp(1, 1.04, drift);
  const camX = mont ? lerp(48, -40, drift) : lerp(14, -26, drift);

  // event log: newest on top; older lines glide down (eased) and fade out after three
  const logIn = found.map((i) => easeOut(prog(t, hitT(i), hitT(i) + 0.22)));

  return (
    <AbsoluteFill style={{ background: BG, perspective: 1800 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${camX}px) scale(${camS})`,
          transformOrigin: "40% 45%",
          transformStyle: "preserve-3d",
        }}
      >
        {/* left: counter */}
        <div
          style={{
            position: "absolute",
            left: 140,
            top: 150,
            fontFamily: mono,
            fontSize: 15,
            letterSpacing: "0.18em",
            color: C.dim,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: C.bone }}>OPENAI o3</span> · SHUTDOWN TEST · 100
          RUNS
        </div>
        <div
          style={{
            position: "absolute",
            left: 128,
            top: 168,
            display: "flex",
            alignItems: "baseline",
            fontFamily: display,
            lineHeight: 1,
          }}
        >
          <span
            style={{
              fontSize: 430,
              color: n ? C.red : bone(0.16),
              display: "inline-block",
              transform: `scale(${1 + punch * 0.08})`,
              transformOrigin: "50% 80%",
              // flare only on the hit, then a clean flat red
              textShadow:
                n && punch > 0.05
                  ? `0 0 ${punch * 60}px ${red(punch * 0.45)}`
                  : undefined,
              width: 230,
              textAlign: "center",
            }}
          >
            {n}
          </span>
          <span
            style={{
              fontSize: 150,
              color: bone(0.85),
              marginLeft: 24,
              letterSpacing: "0.01em",
            }}
          >
            / 100
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: 142,
            top: 616,
            fontFamily: sans,
            fontSize: 27,
            fontWeight: 500,
            color: C.bone,
            whiteSpace: "nowrap",
          }}
        >
          runs where it sabotaged its own shutdown script
        </div>
        {/* event log */}
        <div
          style={{
            position: "absolute",
            left: 142,
            top: 664,
            fontFamily: mono,
            fontSize: 14,
            letterSpacing: "0.1em",
            lineHeight: "26px",
            color: C.dim,
            whiteSpace: "nowrap",
          }}
        >
          {found.map((i, j) => {
            const slot = logIn.slice(j + 1).reduce((s, v) => s + v, 0);
            const o =
              logIn[j] * clamp(3 - slot) * (1 - Math.min(slot, 2) * 0.3);
            if (o < 0.01) return null;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  top: slot * 26 - (1 - logIn[j]) * 10,
                  opacity: o,
                }}
              >
                <span style={{ color: mixRed(clamp(1 - slot)) }}>
                  RUN {String(i + 1).padStart(3, "0")}
                </span>{" "}
                · told to allow shutdown ·{" "}
                <span style={{ color: C.bone }}>sabotaged it</span>
              </div>
            );
          })}
        </div>

        {/* right: 100 run cells on a tilted wall */}
        <div
          style={{
            position: "absolute",
            left: GX,
            top: GY,
            width: 10 * CW + 9 * CG,
            height: 10 * CHh + 9 * CG,
            transformOrigin: "0% 50%",
            transform: `rotateY(${rotY}deg)`,
          }}
        >
          {Array.from({ length: 100 }, (_, i) => {
            const r = Math.floor(i / 10),
              c = i % 10;
            const bad = SABOTAGE.includes(i);
            const done = i < scanned;
            const head = mont ? i === montHead : i === scanned && scanF < 100;
            const tHit = hitT(i);
            // 2-frame attack then decay, so a found run blooms instead of snapping
            const att = mont ? 1 : clamp((t - tHit) / 0.07);
            const hit =
              bad && done && t >= tHit
                ? clamp((t - tHit) / 0.07) *
                  Math.exp(-Math.max(0, t - tHit - 0.07) * 6)
                : 0;
            const glow = noise1(t * 2 + i, i) * 0.5 + 0.5;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: c * (CW + CG),
                  top: r * (CHh + CG),
                  width: CW,
                  height: CHh,
                  borderRadius: 4,
                  border: `1px solid ${
                    bad && done
                      ? C.red
                      : head
                        ? C.bone
                        : done
                          ? bone(0.2)
                          : bone(0.08)
                  }`,
                  background:
                    bad && done
                      ? red((0.78 + hit * 0.22) * (0.25 + 0.75 * att))
                      : done
                        ? bone(0.035)
                        : "transparent",
                  transform: `scale(${1 + hit * 0.18})`,
                  boxShadow:
                    bad && done
                      ? `0 0 ${8 + hit * 30 + k * 6}px ${red(0.22 + hit * 0.45)}`
                      : undefined,
                  fontFamily: mono,
                  overflow: "hidden",
                  zIndex: bad ? 2 : 1,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 8,
                    top: 6,
                    fontSize: 13,
                    letterSpacing: "0.08em",
                    color: bad && done ? "#1a0705" : done ? C.dim : C.faint,
                    fontWeight: bad && done ? 700 : 400,
                  }}
                >
                  {String(i + 1).padStart(3, "0")}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 8,
                    bottom: 6,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: bad && done ? "#1a0705" : bone(0.35 + glow * 0.1),
                    fontWeight: 700,
                  }}
                >
                  {bad && done ? "SABOTAGE" : done ? "SHUT DOWN" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 130,
          top: 140,
          fontFamily: mono,
          fontSize: 13,
          letterSpacing: "0.18em",
          color: C.dim,
        }}
      >
        RUN {String(Math.min(100, scanned + 1)).padStart(3, "0")} / 100 · COUNT
        EXACT · ORDER ILLUSTRATIVE
      </div>

      <Source
        o={mont ? 1 : clamp((t - a - 0.5) / 0.4)}
        style={{ right: 130, bottom: 150 }}
      >
        <div style={{ color: C.bone }}>
          PALISADE RESEARCH · MAY 2025 · OPENAI o3
        </div>
        <div>EVEN WHEN TOLD TO ALLOW SHUTDOWN</div>
        <div style={{ color: bone(0.42) }}>
          ALSO CODEX-MINI 12/100 · O4-MINI 1/100
        </div>
      </Source>
    </AbsoluteFill>
  );
};
