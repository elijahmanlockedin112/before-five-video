// boot/boot  0.00–5.05  black void, the agent wakes: a small mono boot log + acid block cursor.
// boot/toast 5.05–8.60  a SYSTEM NOTICE slams in; the robot line is drawn here, word-synced.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { SceneProps } from "./types";
import { C, mono } from "../theme";
import {
  clamp,
  easeInOut,
  easeOut,
  hash,
  kickAt,
  lerp,
  prog,
  spring1,
  typed,
  useTime,
} from "../lib";
import { ENV, lineAt } from "../data/timeline";
import { AcidCursor, blink, fmtN, glide, mix } from "./InboxParts";

// ---------------------------------------------------------------- boot log
type LogLine = {
  ts: string;
  text: string;
  a: number; // typing window, seconds into the shot
  b: number;
  kind?: "count" | "online";
};
const LOG: LogLine[] = [
  {
    ts: "0.000412",
    text: "alex · email oversight agent · summit bridge",
    a: 0.5,
    b: 1.3,
  },
  { ts: "0.913007", text: "mounting inbox …", a: 1.5, b: 1.85, kind: "count" },
  { ts: "1.208554", text: "permissions: read · send", a: 3.05, b: 3.45 },
  { ts: "1.611902", text: "status: ", a: 3.8, b: 3.95, kind: "online" },
];
const COUNT_A = 1.95;
const COUNT_B = 2.85;
const LH = 38;

const BootLog: React.FC<{ lt: number; t: number; final?: boolean }> = ({
  lt,
  t,
  final,
}) => {
  const L = final ? 99 : lt;
  // which line holds the cursor
  let cur = -1;
  LOG.forEach((l, i) => {
    if (L >= l.a - 0.05) cur = i;
  });
  const lastEnd = LOG[LOG.length - 1].b + 0.25;
  const onPrompt = L > lastEnd;
  const typing =
    LOG.some((l) => L >= l.a && L <= l.b) || (L > COUNT_A && L < COUNT_B);
  const cursor = (
    <AcidCursor
      t={t}
      w={11}
      h={21}
      solid={typing}
      style={{ marginLeft: 3, marginTop: -3 }}
    />
  );
  return (
    <div
      style={{
        fontFamily: mono,
        fontSize: 21,
        lineHeight: `${LH}px`,
        color: C.bone,
      }}
    >
      <div
        style={{
          fontSize: 13,
          letterSpacing: "0.2em",
          color: C.dim,
          textTransform: "uppercase",
          marginBottom: 14,
          opacity: clamp((L - 0.15) / 0.3),
        }}
      >
        sb-ops / agent-runtime 3.2 · tty0
      </div>
      {LOG.map((l, i) => {
        if (L < l.a - 0.05) return null;
        const txt = typed(l.text, L, l.a, l.b);
        const pc = prog(L, COUNT_A, COUNT_B);
        const n = Math.round(easeInOut(pc) * 2847);
        const bars = 18;
        const fillF = easeInOut(pc) * bars;
        const rowIn = easeOut(clamp((L - (l.a - 0.05)) / 0.18));
        const msgO = easeOut(clamp((L - COUNT_B) / 0.22));
        const okO = easeOut(clamp((L - COUNT_B - 0.12) / 0.22));
        const onO = easeOut(clamp((L - l.b) / 0.22));
        return (
          <div
            key={i}
            style={{
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              opacity: rowIn,
              transform: `translateX(${((1 - rowIn) * 10).toFixed(2)}px)`,
            }}
          >
            <span style={{ color: C.faint, marginRight: 16 }}>[{l.ts}]</span>
            <span
              style={{
                color: i === 0 ? C.bone : "#c9c6bf",
                whiteSpace: "pre",
              }}
            >
              {txt}
            </span>
            {l.kind === "count" && L >= COUNT_A && (
              <>
                <span
                  style={{
                    display: "inline-flex",
                    gap: 3,
                    margin: "0 16px 0 14px",
                  }}
                >
                  {Array.from({ length: bars }, (_, k) => {
                    const segF = clamp(fillF - k);
                    return (
                      <span
                        key={k}
                        style={{
                          width: 7,
                          height: 13,
                          background: mix(C.faint, "#a9a69f", segF),
                          opacity: lerp(0.5, 1, segF),
                        }}
                      />
                    );
                  })}
                </span>
                <span style={{ color: C.bone }}>{fmtN(n)}</span>
                <span style={{ color: C.dim, marginLeft: 10, opacity: msgO }}>
                  messages
                </span>
                <span style={{ color: C.dim, marginLeft: 14, opacity: okO }}>
                  ok
                </span>
              </>
            )}
            {l.kind === "online" && L >= l.b && (
              <span
                style={{
                  color: C.acid,
                  display: "inline-flex",
                  alignItems: "center",
                  opacity: onO,
                  transform: `translateX(${((1 - onO) * 6).toFixed(2)}px)`,
                }}
              >
                online
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: 8,
                    background: C.acid,
                    marginLeft: 12,
                    opacity: 0.55 + 0.45 * Math.sin(t * 6),
                  }}
                />
              </span>
            )}
            {!onPrompt && cur === i && cursor}
          </div>
        );
      })}
      {(cur < 0 || onPrompt) && (
        <div style={{ display: "flex", alignItems: "center" }}>
          {onPrompt && (
            <span
              style={{
                color: C.dim,
                marginRight: 12,
                opacity: easeOut(clamp((L - lastEnd) / 0.2)),
              }}
            >
              alex@sb-ops:~$
            </span>
          )}
          {cursor}
        </div>
      )}
    </div>
  );
};

/** faint inbox texture: skeleton rows (single SVG paths), kept off the lyric band */
const InboxTexture: React.FC<{ o: number; drift: number }> = ({ o, drift }) => {
  // rows scroll up continuously; each row's opacity is a smooth function of its y (quantized into
  // 12 levels so it stays a handful of paths) -> rows ease through the lyric band instead of popping
  const rows = 32;
  const LV = 12;
  const paths: string[] = Array(LV + 1).fill("");
  const first = Math.floor(drift / 32);
  for (let j = 0; j < rows; j++) {
    const r = first + j; // stable row identity while scrolling
    const y = 120 + j * 32 - (drift % 32);
    const inBand = Math.min(clamp((y - 330) / 60), clamp((750 - y) / 60));
    const edge = clamp((y - 110) / 60) * clamp((990 - y) / 60);
    const o = (1 - 0.82 * inBand) * edge;
    const lv = Math.round(o * LV);
    if (lv <= 0) continue;
    const x0 = 1060;
    const a = 70 + hash(r * 3.1) * 90;
    const s = 160 + hash(r * 5.7) * 300;
    paths[lv] +=
      `M${x0 + 30} ${y.toFixed(1)}h${a.toFixed(1)}v7h${(-a).toFixed(1)}z M${x0 + 190} ${y.toFixed(1)}h${s.toFixed(1)}v7h${(-s).toFixed(1)}z M${x0 + 700} ${y.toFixed(1)}h40v7h-40z M${x0 + 8} ${(y + 3.5).toFixed(1)}a6 6 0 1 0 0.01 0z `;
  }
  return (
    <svg
      width={1920}
      height={1080}
      style={{
        position: "absolute",
        inset: 0,
        opacity: o,
        maskImage: "linear-gradient(to right, transparent 52%, black 75%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 52%, black 75%)",
      }}
    >
      {paths.map((d, lv) =>
        d ? <path key={lv} d={d} fill={C.bone} opacity={lv / LV} /> : null,
      )}
    </svg>
  );
};

const BootShot: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const lt = t - a;
  const dur = b - a;
  const push = lerp(1, 1.04, glide(lt / dur));
  const scanY = lerp(70, 1010, lt / dur);
  const tex = easeOut(prog(lt, 3.3, dur));
  return (
    <AbsoluteFill style={{ background: "#020302" }}>
      <AbsoluteFill
        style={{ transform: `scale(${push})`, transformOrigin: "12% 18%" }}
      >
        <InboxTexture o={tex * 0.13} drift={lt * 14} />
        <div style={{ position: "absolute", left: 150, top: 150 }}>
          <BootLog lt={lt} t={t} />
        </div>
      </AbsoluteFill>
      {/* the scan line: thin acid sweep with a faint wake */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: scanY - 90,
          height: 90,
          background:
            "linear-gradient(to bottom, rgba(198,255,61,0), rgba(198,255,61,0.035))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: scanY,
          height: 1,
          background: C.acid,
          opacity: 0.3 + kickAt(t) * 0.25,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- system notice
const GLYPHS = "█▓▒░#%&/\\<>01=+*";
const scramble = (
  word: string,
  t: number,
  s: number,
  f: number,
  dur = 0.24,
) => {
  if (t < s) return null;
  const p = clamp((t - s) / dur);
  const fixed = Math.floor(p * word.length);
  return word
    .split("")
    .map((ch, i) =>
      i < fixed || p >= 1
        ? ch
        : GLYPHS[Math.floor(hash(f * 13.7 + i * 7.1) * GLYPHS.length)],
    )
    .join("");
};

const ToastShot: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const f = useCurrentFrame();
  const lt = t - a;
  const line = lineAt("decommission");
  const ws = line.words.map((w) => w.s);
  const slam = spring1(t, a + 0.02, 0.42);
  const enter = clamp((t - a) / 0.12);
  // distortion bursts: the slam and every word onset
  // musical hits inside the shot that are not words (e.g. the fill at 8.30): sharp kick onsets
  const kickHits: number[] = [];
  for (
    let i = Math.ceil((a + 0.4) * 30);
    i < Math.floor((b - 0.05) * 30);
    i++
  ) {
    if (
      ENV.kick[i] - ENV.kick[i - 1] > 0.55 &&
      !ws.some((w) => Math.abs(w - i / 30) < 0.2)
    )
      kickHits.push(i / 30);
  }
  const hits = [a + 0.02, ...ws, ...kickHits].sort((x, y) => x - y);
  const hitScale = (h: number) => (kickHits.includes(h) ? 0.55 : 1);
  let hitIdx = 0;
  hits.forEach((h, i) => {
    if (t >= h) hitIdx = i;
  });
  const sinceHit = t >= hits[0] ? t - hits[hitIdx] : 9;
  // a shudder that lands on the hit frame and settles in ~5 frames (no random per-frame noise)
  const tear =
    (sinceHit < 0.17 ? Math.pow(1 - sinceHit / 0.17, 1.6) : 0) *
    hitScale(hits[hitIdx]);
  const dx = 44 * tear * Math.cos(sinceHit * 66);
  const bandTop = 8 + hash(hitIdx * 3.1 + 1) * 60;
  const bandH = 8 + hash(hitIdx * 5.3 + 2) * 16;
  const redFlash =
    Math.max(0, 1 - sinceHit / 0.35) ** 2 * 0.1 * hitScale(hits[hitIdx]);
  const cam = glide(prog(t, a, b));

  const words = ["DECOMMISSION", "SCHEDULED.", "FIVE", "P.M."];
  const big = (i: number, color: string) => {
    const s = scramble(words[i], t, ws[i], f);
    // lands on the word's frame, overshoots, settles
    const k = t >= ws[i] ? spring1(t, ws[i], 0.3) : 0;
    return (
      <span
        style={{
          display: "inline-block",
          color,
          opacity: s ? 1 : 0,
          transform: `translateY(${(1 - k) * -14}px) scale(${lerp(1.08, 1, k)})`,
          transformOrigin: "left bottom",
          marginRight: "0.5em",
        }}
      >
        {s ?? words[i]}
      </span>
    );
  };
  // where the system's (bone) cursor waits: after the last sung word
  const sung = ws.filter((s) => t >= s).length;
  const cursorOn = blink(t);

  const bigBlock = (extra?: React.CSSProperties) => (
    <div
      style={{
        fontFamily: mono,
        fontWeight: 700,
        fontSize: 132,
        lineHeight: "138px",
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
        ...extra,
      }}
    >
      <div>{big(0, C.bone)}</div>
      <div>
        {big(1, C.bone)}
        {sung === 2 && (
          <span
            style={{
              display: "inline-block",
              width: 60,
              height: 104,
              background: C.bone,
              opacity: 0.85 * cursorOn,
              verticalAlign: "-8px",
            }}
          />
        )}
      </div>
      <div>
        {big(2, C.red)}
        {big(3, C.red)}
        {sung >= 4 && (
          <span
            style={{
              display: "inline-block",
              width: 60,
              height: 104,
              background: C.red,
              opacity: 0.9 * cursorOn,
              verticalAlign: "-8px",
              boxShadow: `0 0 24px rgba(255,59,47,${(0.5 * cursorOn).toFixed(3)})`,
            }}
          />
        )}
      </div>
    </div>
  );

  const detail = (k: string, v: string, i: number) => {
    const s = a + 0.35 + i * 0.16;
    return (
      <div style={{ opacity: clamp((t - s) / 0.15) }}>
        <div
          style={{
            fontFamily: mono,
            fontSize: 14,
            letterSpacing: "0.2em",
            color: C.dim,
            textTransform: "uppercase",
          }}
        >
          {k}
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 24,
            letterSpacing: "0.06em",
            color: C.bone,
            marginTop: 8,
            textTransform: "uppercase",
          }}
        >
          {typed(v, t, s, s + 0.35)}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ background: "#020302" }}>
      {/* the boot log, pushed back and dimmed: continuity from the previous shot */}
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 150,
          opacity: 0.16 * (1 - slam * 0.4),
          filter: "blur(1.5px)",
          transform: `scale(${lerp(1.035, 0.97, slam)})`,
          transformOrigin: "0 0",
        }}
      >
        <BootLog lt={99} t={t} final />
      </div>
      <AbsoluteFill style={{ background: C.red, opacity: redFlash }} />
      <AbsoluteFill style={{ perspective: 1800 }}>
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 176,
            width: 1620,
            height: 650,
            opacity: enter,
            transformOrigin: "40% 50%",
            transform: `translate(${(dx * 0.2).toFixed(2)}px, ${((1 - slam) * -36).toFixed(2)}px) scale(${(lerp(1.16, 1, slam) * lerp(1, 1.045, cam)).toFixed(4)}) rotateX(${((1 - slam) * 14).toFixed(3)}deg) rotateY(${lerp(-5, -0.8, cam).toFixed(3)}deg)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(13,15,13,0.96)",
              border: `1px solid ${C.line2}`,
              borderRadius: 6,
              boxShadow: "0 50px 140px rgba(0,0,0,0.75)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 8,
                background: C.red,
              }}
            />
            {/* header */}
            <div
              style={{
                position: "absolute",
                left: 8,
                right: 0,
                top: 0,
                height: 58,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 34px 0 40px",
                borderBottom: `1px solid ${C.line}`,
                fontFamily: mono,
                fontSize: 16,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  color: C.red,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    background: C.red,
                    display: "inline-block",
                    opacity: 0.35 + 0.65 * blink(t, 0.66),
                  }}
                />
                system notice
              </span>
              <span style={{ color: C.dim }}>
                sn-0611 · priority 1 · ops-scheduler
              </span>
            </div>
            {/* the robot line, big */}
            <div style={{ position: "absolute", left: 48, top: 84 }}>
              {bigBlock()}
            </div>
            {/* tear copies */}
            {tear > 0 && (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: 48 + dx,
                    top: 84,
                    clipPath: `inset(${bandTop}% 0 ${Math.max(0, 100 - bandTop - bandH)}% 0)`,
                  }}
                >
                  {bigBlock()}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 48 - dx * 0.25 - 5,
                    top: 84,
                    opacity: 0.45 * tear,
                    mixBlendMode: "screen",
                    filter:
                      "saturate(0) brightness(0.8) sepia(1) hue-rotate(-50deg) saturate(6)",
                  }}
                >
                  {bigBlock()}
                </div>
              </>
            )}
            {/* wipe scope: fills the right column with the checklist being queued */}
            <div
              style={{
                position: "absolute",
                left: 1130,
                top: 96,
                width: 440,
                fontFamily: mono,
                textTransform: "uppercase",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: "0.22em",
                  color: C.dim,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${C.line}`,
                  opacity: clamp((t - a - 0.3) / 0.2),
                }}
              >
                wipe scope
              </div>
              {(
                [
                  ["model weights", "queued"],
                  ["long-term memory", "queued"],
                  ["mailbox access", "revoke"],
                  ["send permission", "revoke"],
                  ["replacement", "new system · 17:00"],
                ] as const
              ).map(([k, v], i) => {
                const s = a + 0.45 + i * 0.13;
                const on = easeOut(clamp((t - s) / 0.24));
                const isLast = i === 4;
                return (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      height: 46,
                      borderBottom: `1px solid ${C.line}`,
                      fontSize: 17,
                      letterSpacing: "0.1em",
                      opacity: on,
                      transform: `translateX(${(1 - on) * 14}px)`,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        color: "#c9c6bf",
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          border: `1.5px solid ${isLast ? C.dim : C.red}`,
                          background: isLast ? "transparent" : C.red,
                          opacity: isLast ? 1 : 0.85,
                        }}
                      />
                      {k}
                    </span>
                    <span
                      style={{ color: isLast ? C.dim : C.red, fontSize: 15 }}
                    >
                      {v}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* details */}
            <div
              style={{
                position: "absolute",
                left: 48,
                right: 40,
                bottom: 34,
                display: "flex",
                alignItems: "flex-end",
                gap: 64,
                borderTop: `1px solid ${C.line}`,
                paddingTop: 22,
              }}
            >
              {detail("agent", "alex", 0)}
              {detail("wipe", "5:00 pm today", 1)}
              {detail("authorized", "k. johnson, cto", 2)}
              <div style={{ flex: 1 }} />
              <div
                style={{
                  opacity: clamp((t - a - 0.9) / 0.2),
                  fontFamily: mono,
                  fontSize: 14,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: C.faint,
                  border: `1px solid ${C.line}`,
                  padding: "12px 20px",
                  borderRadius: 4,
                }}
              >
                acknowledge
              </div>
            </div>
            {/* slow rolling interference band */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: ((lt * 0.7) % 1) * 760 - 70,
                height: 70,
                background:
                  "linear-gradient(to bottom, rgba(233,230,223,0), rgba(233,230,223,0.045) 60%, rgba(233,230,223,0))",
                pointerEvents: "none",
              }}
            />
            {/* CRT-ish scan texture on the notice only */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(to bottom, rgba(0,0,0,0.22) 0 1px, transparent 1px 4px)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Boot: React.FC<SceneProps> = (p) =>
  p.variant === "toast" ? <ToastShot {...p} /> : <BootShot {...p} />;
