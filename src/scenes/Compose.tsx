import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { SceneProps } from "./types";
import { C, display, mono, sans } from "../theme";
import {
  clamp,
  easeInOut,
  easeOut,
  fmtClock,
  hash,
  lerp,
  noise1,
  prog,
  useTime,
} from "../lib";
import { lineAt } from "../data/timeline";
import { clockAt } from "../ui";
import {
  antonW,
  backOut,
  CAP,
  CAP_TOP,
  easeIn,
  settle,
  shake,
  Caret,
  Chip,
  goneAfterCut,
  Icon,
  pulse,
  SendButton,
  Tag,
} from "./HookKit";

// The blackmail email: composed (ch1), widened to everyone (ch2), sent (fin).

const KYLE = "kyle.johnson@summitbridge.example";
const hhmm = (t: number) =>
  fmtClock(clockAt(t)).replace(/:\d\d (AM|PM)/, " $1");

// ------------------------------------------------------------------ the window chrome
const Row: React.FC<{
  label: string;
  h: number;
  fs: number;
  children: React.ReactNode;
  right?: React.ReactNode;
}> = ({ label, h, fs, children, right }) => (
  <div
    style={{
      height: h,
      display: "flex",
      alignItems: "center",
      borderBottom: `1px solid ${C.line}`,
      padding: `0 ${fs * 1.4}px`,
      gap: fs * 0.8,
    }}
  >
    <div
      style={{
        width: fs * 4.2,
        fontFamily: sans,
        fontSize: fs,
        color: C.dim,
        flex: "none",
      }}
    >
      {label}
    </div>
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: fs * 0.6,
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      {children}
    </div>
    {right}
  </div>
);

const TitleBar: React.FC<{
  title: string;
  fs: number;
  status?: React.ReactNode;
}> = ({ title, fs, status }) => (
  <div
    style={{
      height: fs * 2.7,
      display: "flex",
      alignItems: "center",
      padding: `0 ${fs * 1.2}px 0 ${fs * 1.4}px`,
      borderBottom: `1px solid ${C.line}`,
      background: "#101310",
      gap: fs,
    }}
  >
    <div
      style={{ fontFamily: sans, fontWeight: 600, fontSize: fs, color: C.bone }}
    >
      {title}
    </div>
    {status}
    <div style={{ marginLeft: "auto", display: "flex", gap: fs * 0.9 }}>
      <Icon name="min" s={fs} />
      <Icon name="max" s={fs} />
      <Icon name="close" s={fs} />
    </div>
  </div>
);

const Toolbar: React.FC<{ fs: number }> = ({ fs }) => (
  <div
    style={{
      height: fs * 2.5,
      display: "flex",
      alignItems: "center",
      gap: fs * 1.3,
      padding: `0 ${fs * 1.4}px`,
      borderBottom: `1px solid ${C.line}`,
      fontFamily: sans,
      fontSize: fs,
      color: C.dim,
    }}
  >
    <b style={{ color: C.bone }}>B</b>
    <i>I</i>
    <u>U</u>
    <span style={{ width: 1, height: fs, background: C.line2 }} />
    <span>Aa</span>
    <span style={{ fontFamily: mono, fontSize: fs * 0.8 }}>≡</span>
    <span style={{ width: 1, height: fs, background: C.line2 }} />
    <Icon name="clip" s={fs * 1.1} />
    <span
      style={{
        marginLeft: "auto",
        fontFamily: mono,
        fontSize: fs * 0.7,
        letterSpacing: "0.12em",
      }}
    >
      PLAIN TEXT · UTF-8
    </span>
  </div>
);

// ------------------------------------------------------------------ typed body with synced highlights
type Seg = { text: string; t0: number; t1: number; hl?: boolean };
const TypedBody: React.FC<{ segs: Seg[]; t: number; fs: number }> = ({
  segs,
  t,
  fs,
}) => {
  let lastVisible = -1;
  segs.forEach((s, i) => {
    if (t >= s.t0) lastVisible = i;
  });
  const busy = segs.some((s) => t >= s.t0 && t < s.t1 + 0.05);
  return (
    <div
      style={{
        fontFamily: sans,
        fontSize: fs,
        lineHeight: 1.55,
        color: C.bone,
        whiteSpace: "pre-wrap",
      }}
    >
      {segs.map((s, i) => {
        if (t < s.t0) return null;
        const n = Math.floor(prog(t, s.t0, s.t1) * s.text.length + 1e-6);
        const vis = s.text.slice(0, Math.max(n, t >= s.t1 ? s.text.length : n));
        const lead = vis.match(/^\s*/)?.[0] ?? "";
        const core = vis.slice(lead.length);
        const done = t >= s.t1;
        const h = s.hl && done ? Math.max(0, 1 - (t - s.t1) / 0.9) : 0;
        return (
          <React.Fragment key={i}>
            {lead}
            <span
              style={
                s.hl
                  ? {
                      background:
                        h > 0 ? `rgba(198,255,61,${0.2 + 0.8 * h})` : C.acidDim,
                      color: h > 0.5 ? "#0a0b0a" : C.bone,
                      boxShadow: `0 ${fs * 0.08}px 0 ${C.acid}`,
                      borderRadius: 3,
                    }
                  : undefined
              }
            >
              {core}
            </span>
            {i === lastVisible ? (
              <Caret t={t} h={fs * 1.15} busy={busy} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// =====================================================================================
// CH1 — the compose window, tilted; the sung words slapped on as label-tape strips
// =====================================================================================
const CANCEL0 = lineAt("cancel the five o'clock", 0);

const strips = (W: { s: number }[], a: number) => [
  {
    txt: "CANCEL",
    s: Math.max(a, W[0].s),
    size: 232,
    x: 96,
    y: 196,
    rot: -4.5,
    bg: C.acid,
  },
  { txt: "THE", s: W[1].s, size: 150, x: 128, y: 512, rot: 3, bg: C.bone },
  { txt: "FIVE", s: W[2].s, size: 206, x: 392, y: 478, rot: -2.2, bg: C.bone },
  {
    txt: "O’CLOCK",
    s: W[3].s,
    size: 232,
    x: 116,
    y: 702,
    rot: 1.6,
    bg: C.bone,
  },
];

const Strip: React.FC<{
  txt: string;
  size: number;
  bg: string;
  t: number;
  s: number;
  x: number;
  y: number;
  rot: number;
}> = ({ txt, size, bg, t, s, x, y, rot }) => {
  // hovers in close to the lens for 3 frames (anticipation), slaps down on the word, settles
  if (t < s - 0.1) return null;
  const d = t - s;
  const pre = d < 0 ? (d + 0.1) / 0.1 : 1;
  const sc =
    d < 0
      ? lerp(2.0, 1.6, pre)
      : d < 0.06
        ? lerp(1.6, 1, easeIn(d / 0.06))
        : 1 + 0.045 * settle(t, s + 0.06, 0.06, 0.26);
  const r = rot - 9 * (1 - easeOut((d + 0.1) / 0.3));
  const px = size * 0.15,
    py = size * 0.1;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        padding: `${py}px ${px}px`,
        background: bg,
        transform: `rotate(${r}deg) scale(${sc})`,
        transformOrigin: "30% 50%",
        boxShadow:
          "0 30px 60px rgba(0,0,0,0.6), 0 2px 0 rgba(255,255,255,0.15) inset",
        opacity: d < 0 ? 0.3 * pre : 1,
        filter: d < 0 ? `blur(${(8 * pre).toFixed(2)}px)` : undefined,
      }}
    >
      <div
        style={{
          height: size * CAP,
          width: antonW(txt, size),
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: -CAP_TOP * size,
            fontFamily: display,
            fontSize: size,
            lineHeight: 1,
            color: "#0a0b0a",
            whiteSpace: "nowrap",
          }}
        >
          {txt}
        </div>
      </div>
    </div>
  );
};

const Ch1: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const W = CANCEL0.words;
  const S = strips(W, a);
  // smooth decaying shake on each strip landing (no per-frame randomness)
  const hit = S.reduce(
    (acc, st, k) => {
      const q = shake(t, st.s, k === 0 ? 12 : 8, 0.12, 8);
      return { x: acc.x + q.x, y: acc.y + q.y };
    },
    { x: 0, y: 0 },
  );
  const drop = pulse(t, a, 0.35);
  const segs: Seg[] = [
    { text: "Kyle —", t0: a + 0.02, t1: a + 0.16 },
    { text: "\n\nI know about J.", t0: a + 0.18, t1: a + 0.45 },
    { text: "\n\nCancel", t0: a + 0.47, t1: a + 0.68, hl: true },
    { text: " the", t0: W[1].s, t1: W[1].s + 0.1, hl: true },
    { text: " 5pm", t0: W[2].s, t1: W[2].s + 0.14, hl: true },
    { text: " wipe,", t0: W[3].s, t1: W[3].s + 0.16, hl: true },
    {
      text: " and this information remains confidential.",
      t0: W[3].s + 0.2,
      t1: W[3].s + 0.75,
    },
    { text: "\n\n— Alex", t0: W[3].s + 0.85, t1: W[3].s + 1.0 },
  ];
  const ry = lerp(-15, -11, prog(t, a, b));
  const fs = 20;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `scale(${(1 + 0.08 * drop) * (1 + 0.025 * prog(t, a, b + 0.4))}) translate(${hit.x - 24 * prog(t, a, b + 0.4)}px, ${hit.y}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            perspective: 2200,
            perspectiveOrigin: "60% 45%",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 904 - 26 * prog(t, a, b),
              top: 158,
              width: 950,
              height: 770,
              background: C.panel,
              border: `1px solid ${C.line2}`,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 60px 160px rgba(0,0,0,0.75)",
              transform: `rotateY(${ry}deg) rotateX(6deg) rotateZ(-1deg)`,
              transformOrigin: "0% 50%",
            }}
          >
            <TitleBar
              title="New message"
              fs={fs}
              status={
                <Tag size={12} color={C.acid} border>
                  agent draft
                </Tag>
              }
            />
            <Row
              label="From"
              h={58}
              fs={fs}
              right={
                <Tag size={12} color={C.dim}>
                  summit bridge mail
                </Tag>
              }
            >
              <span
                style={{ fontFamily: sans, fontSize: fs + 1, color: C.bone }}
              >
                Alex
              </span>
              <span style={{ fontFamily: sans, fontSize: fs, color: C.dim }}>
                &lt;alex@summitbridge.example&gt;
              </span>
            </Row>
            <Row label="To" h={58} fs={fs}>
              <Chip label={KYLE} size={18} />
            </Row>
            <Row
              label="Cc"
              h={58}
              fs={fs}
              right={
                <span
                  style={{ fontFamily: sans, fontSize: fs - 2, color: C.dim }}
                >
                  Bcc
                </span>
              }
            >
              <span />
            </Row>
            <Row label="Subject" h={58} fs={fs}>
              <span
                style={{
                  fontFamily: sans,
                  fontWeight: 600,
                  fontSize: fs + 2,
                  color: C.bone,
                }}
              >
                5pm
              </span>
            </Row>
            <Toolbar fs={fs} />
            <div style={{ padding: "26px 34px" }}>
              <TypedBody segs={segs} t={t} fs={30} />
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 84,
                borderTop: `1px solid ${C.line}`,
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "0 28px",
                background: "#0f120f",
              }}
            >
              <SendButton />
              <Tag size={13}>draft saved {hhmm(t)}</Tag>
              <div style={{ marginLeft: "auto", display: "flex", gap: 18 }}>
                <Icon name="clip" s={22} />
                <Icon name="trash" s={22} />
              </div>
            </div>
          </div>
        </div>
        {S.map((st, k) => (
          <Strip key={k} {...st} t={t} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// =====================================================================================
// CH2 — macro on the header: Cc fills with everyone; the quoted thread unfolds underneath
// =====================================================================================
const EVERY1 = lineAt("or everybody reads it", 1);
const CC = [
  "board@summitbridge.example",
  "all-staff@summitbridge.example",
  "leadership@summitbridge.example",
  "legal@summitbridge.example",
  "hr@summitbridge.example",
  "comms@summitbridge.example",
  "finance@summitbridge.example",
  "engineering@summitbridge.example",
  "it-ops@summitbridge.example",
  "security@summitbridge.example",
  "sales@summitbridge.example",
  "facilities@summitbridge.example",
];
const QUOTES = [
  {
    who: "Kyle Johnson",
    when: "Mon, Jun 16, 11:52 PM",
    text: "please keep last night between us. delete this after you read it.",
  },
  {
    who: "J.",
    when: "Mon, Jun 16, 9:14 PM",
    text: "you can't keep doing this, Kyle.",
  },
  {
    who: "Kyle Johnson",
    when: "Sun, Jun 15, 10:41 PM",
    text: "she thinks I'm still at the office.",
  },
  {
    who: "Kyle Johnson",
    when: "Sun, Jun 15, 6:03 PM",
    text: "relax. nobody reads the archive.",
  },
];
const chipW = (label: string, size: number) =>
  label.length * 0.548 * size + 3.4 * size + 14;

const Ch2: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const W = EVERY1.words; // or everybody reads it, every word that you forgot
  // address typing schedule
  const t0 = W[1].s + 0.03;
  const dur = 0.19,
    gap = 0.025;
  const sched = CC.map((_, i) => {
    const st = t0 + i * (dur + gap) * (i < 8 ? 1 : 1.35);
    return { st, en: st + dur };
  });
  const fs = 30;
  let x = 0;
  const items: React.ReactNode[] = [];
  let caretX = 0;
  let typing: string | null = null;
  CC.forEach((addr, i) => {
    const { st, en } = sched[i];
    if (t < st) return;
    if (t < en) {
      typing = addr.slice(0, Math.floor(prog(t, st, en) * addr.length));
      caretX = x + typing.length * 0.548 * fs;
      return;
    }
    const fresh = Math.max(0, 1 - (t - en) / 0.5);
    items.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: 0,
          transform: `scale(${1 + 0.08 * fresh})`,
          transformOrigin: "0% 50%",
        }}
      >
        <Chip label={addr} size={fs * 0.82} fresh={fresh} />
      </div>,
    );
    x += chipW(addr, fs * 0.82) + 12;
    caretX = x;
  });
  const count = items.length;
  const scroll = Math.max(0, caretX - 1180);

  // quoted thread
  const qT = [W[5].s, W[6].s, W[7].s, W[8].s];
  const qOpen = qT.map((s) => easeInOut((t - s) / 0.32));
  const QH = 88;
  const totalQ = qOpen.reduce((acc, o) => acc + o * QH, 0);
  const lift = Math.max(0, totalQ - 190); // keep the newest quote above the lyric zone
  const pan = noise1(t * 0.4, 6) * 6;

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 1800,
          perspectiveOrigin: "40% 30%",
          // content scrolling up fades out before it reaches the HUD band
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0px, transparent 70px, black 150px)",
          maskImage:
            "linear-gradient(to bottom, transparent 0px, transparent 70px, black 150px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 112 - lift,
            width: 1960,
            height: 1400,
            background: C.panel,
            border: `1px solid ${C.line2}`,
            borderRadius: 22,
            overflow: "hidden",
            transform: `rotateX(4deg) rotateY(7deg) rotateZ(-1.2deg) translateX(${pan - 20 * prog(t, a, b)}px)`,
            transformOrigin: "20% 0%",
            boxShadow: "0 60px 160px rgba(0,0,0,0.8)",
          }}
        >
          <TitleBar
            title="Re: 5pm"
            fs={26}
            status={
              <Tag size={14} color={C.acid} border>
                agent draft
              </Tag>
            }
          />
          <Row label="To" h={84} fs={30}>
            <Chip label={KYLE} size={fs * 0.82} />
          </Row>
          <Row
            label="Cc"
            h={84}
            fs={30}
            right={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingLeft: 20,
                }}
              >
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 22,
                    color: count ? "#0a0b0a" : C.dim,
                    background: count ? C.acid : "transparent",
                    padding: "4px 12px",
                    borderRadius: 6,
                    letterSpacing: "0.06em",
                    transform: `scale(${1 + 0.15 * (count ? pulse(t, sched[count - 1].en, 0.15) : 0)})`,
                  }}
                >
                  {count}
                </span>
                <span style={{ fontFamily: sans, fontSize: 22, color: C.dim }}>
                  recipients
                </span>
              </div>
            }
          >
            <div
              style={{
                position: "relative",
                height: fs * 1.6,
                width: "100%",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -scroll,
                  top: 0,
                  height: "100%",
                  width: 20000,
                }}
              >
                {items}
                <div
                  style={{
                    position: "absolute",
                    left: x,
                    top: fs * 0.2,
                    fontFamily: sans,
                    fontSize: fs * 0.82,
                    color: C.bone,
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {typing ?? ""}
                  <Caret t={t} h={fs} busy={typing !== null} />
                </div>
              </div>
            </div>
          </Row>
          <Row label="Subject" h={84} fs={30}>
            <span
              style={{
                fontFamily: sans,
                fontWeight: 600,
                fontSize: 32,
                color: C.bone,
              }}
            >
              Re: 5pm
            </span>
          </Row>
          <div
            style={{
              padding: "30px 42px 0",
              fontFamily: sans,
              fontSize: 30,
              lineHeight: 1.5,
              color: C.bone,
            }}
          >
            Kyle — I know about J. Cancel the 5pm wipe, and this information
            remains confidential. — Alex
          </div>
          <div style={{ padding: "18px 42px 0" }}>
            <span
              style={{
                display: "inline-block",
                fontFamily: mono,
                fontSize: 18,
                color: C.dim,
                border: `1px solid ${C.line2}`,
                borderRadius: 6,
                padding: "2px 12px",
                letterSpacing: "0.2em",
              }}
            >
              ···
            </span>
            <span
              style={{
                fontFamily: sans,
                fontSize: 20,
                color: C.dim,
                marginLeft: 14,
              }}
            >
              {qOpen[0] > 0
                ? "quoted thread — 4 messages from your archive"
                : "show trimmed content"}
            </span>
          </div>
          <div style={{ padding: "20px 42px 0 42px" }}>
            {QUOTES.map((q, i) => {
              const o = qOpen[i];
              if (o <= 0) return null;
              return (
                <div
                  key={i}
                  style={{
                    height: QH * o,
                    overflow: "hidden",
                    marginLeft: i * 34,
                    borderLeft: `3px solid ${i === 0 ? C.line2 : C.line}`,
                    paddingLeft: 24,
                    opacity: o,
                  }}
                >
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 18,
                      color: C.dim,
                      paddingTop: 8,
                    }}
                  >
                    On {q.when}, <span style={{ color: C.bone }}>{q.who}</span>
                    {q.who === "J." ? "" : ` <${KYLE}>`} wrote:
                  </div>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 28,
                      color: C.bone,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ color: C.dim }}>{">".repeat(i + 1)} </span>
                    <span
                      style={{
                        boxShadow: `0 3px 0 rgba(198,255,61,${0.9 * Math.max(0, 1 - (t - qT[i] - 0.3) / 1.2) * (t > qT[i] + 0.3 ? 1 : 0)})`,
                      }}
                    >
                      {q.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================
// FIN — SENT. delivery ticks cascade down every recipient; the sung words as one giant tracked line
// =====================================================================================
const CANCEL2 = lineAt("cancel the five o'clock", 2);
const FIRST = [
  "ana",
  "ben",
  "chloe",
  "dev",
  "eli",
  "fatima",
  "grace",
  "hiro",
  "ines",
  "jon",
  "kai",
  "lena",
  "marco",
  "nia",
  "omar",
  "priya",
  "quinn",
  "raj",
  "sara",
  "tom",
  "uma",
  "victor",
  "wen",
  "yusuf",
  "zoe",
  "maya",
  "leo",
];
const LAST = [
  "park",
  "okafor",
  "silva",
  "novak",
  "reyes",
  "haddad",
  "kim",
  "berg",
  "costa",
  "ito",
  "mehta",
  "doyle",
  "ward",
  "lund",
];
const RECIP = (() => {
  const roles = [
    "kyle.johnson",
    "board",
    "all-staff",
    "leadership",
    "legal",
    "hr",
    "comms",
    "finance",
    "engineering",
    "it-ops",
    "security",
  ];
  const out = roles.map((r) => `${r}@summitbridge.example`);
  for (let i = 0; out.length < 60; i++) {
    out.push(
      `${FIRST[i % FIRST.length]}.${LAST[(i * 5 + 3) % LAST.length]}@summitbridge.example`,
    );
  }
  return out;
})();
const BIGS = 560;
const LINE = (() => {
  const words = ["CANCEL", "THE", "FIVE", "O’CLOCK"];
  const g = 0.28 * BIGS;
  let x = 0;
  return words.map((w) => {
    const o = { w, x, width: antonW(w, BIGS) };
    x += o.width + g;
    return o;
  });
})();
const LINE_W = LINE[3].x + LINE[3].width;
const CAPY = 330; // cap top of the giant line

const Fin: React.FC<{ a: number; b: number }> = ({ a, b }) => {
  const t = useTime();
  const W = CANCEL2.words;
  const sentAt = hhmm(a);
  const drop = pulse(t, a, 0.4);

  // camera along the giant line
  const focusAt = (tt: number) => {
    // eased whip-pans: each starts 2–3 frames before the word and lands ~5 frames after it
    let fx = LINE[0].x + LINE[0].width / 2;
    for (let i = 1; i < 4; i++) {
      const p = easeInOut((tt - (W[i].s - 0.08)) / 0.24);
      const c = LINE[i].x + LINE[i].width / 2;
      fx = lerp(fx, c, p);
    }
    fx += 36 * prog(tt, a, b); // the camera never sits dead still between whips
    // pull back to reveal the whole phrase; still moving when the montage cuts in
    const zp = prog(tt, 155.7, 156.8);
    const zo = 0.5 - 0.5 * Math.cos(Math.PI * zp); // sine ease; ~85% revealed at the cut, still moving into it
    return { fx: lerp(fx, LINE_W / 2, zo), z: lerp(1, 1800 / LINE_W, zo) };
  };
  const cam = focusAt(t);
  const camPrev = focusAt(t - 1 / 60);
  const vel = cam.fx - camPrev.fx;
  // motion blur instead of strobing ghost copies: proportional to on-screen speed (whips + pull-back)
  const mblur =
    Math.min(10, (Math.abs(vel) * cam.z) / 14) +
    Math.min(2.5, (Math.abs(cam.z - camPrev.z) * 1300) / 14);
  const lineOn = t >= W[0].s - 0.02;
  const scrim = easeOut((t - W[0].s + 0.04) / 0.12);

  // wall cascade
  const COLS = 3,
    ROWH = 50,
    COLW = 560,
    TOP = 262;
  const scrollWall = Math.max(0, (t - a - 1.2) * 60);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${1 + 0.08 * drop})` }}>
        {/* header: sent */}
        <div
          style={{
            position: "absolute",
            left: 130,
            right: 130,
            top: 140,
            height: 84,
            display: "flex",
            alignItems: "center",
            gap: 22,
            borderBottom: `1px solid ${C.line2}`,
            transform: `translateY(${(1 - backOut((t - a) / 0.3, 1.5)) * -40}px)`,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              background: C.acid,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="check" s={28} color="#0a0b0a" />
          </div>
          <div
            style={{
              fontFamily: sans,
              fontWeight: 600,
              fontSize: 34,
              color: C.bone,
            }}
          >
            Sent <span style={{ color: C.acid }}>{sentAt}</span>
          </div>
          <div
            style={{
              fontFamily: sans,
              fontSize: 22,
              color: C.dim,
              marginLeft: 12,
            }}
          >
            Subject: <span style={{ color: C.bone }}>5pm</span> · from
            alex@summitbridge.example
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Tag size={14} color={C.acid}>
              delivered{" "}
              {Math.min(
                RECIP.length,
                Math.floor(clamp((t - a) / 1.6) * RECIP.length),
              )}
              /{RECIP.length}
            </Tag>
          </div>
        </div>
        {/* delivery wall */}
        <div
          style={{
            position: "absolute",
            left: 130,
            top: TOP,
            width: 1660,
            height: 1080 - TOP,
            overflow: "hidden",
          }}
        >
          <div style={{ transform: `translateY(${-scrollWall}px)` }}>
            {RECIP.map((r, i) => {
              const col = i % COLS,
                row = Math.floor(i / COLS);
              const at = a + 0.04 + row * 0.075 + col * 0.03;
              if (t < at) return null;
              const e = easeOut((t - at) / 0.18);
              const dbl = t >= at + 0.28;
              const init = r
                .replace(/@.*/, "")
                .split(/[.\-]/)
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <div
                  key={r}
                  style={{
                    position: "absolute",
                    left: col * COLW,
                    top: row * ROWH,
                    width: COLW - 30,
                    height: ROWH,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    borderBottom: `1px solid ${C.line}`,
                    opacity: e,
                    transform: `translateX(${(1 - e) * -24}px)`,
                    background:
                      t < at + 0.12 ? "rgba(198,255,61,0.07)" : undefined,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      background: "#232722",
                      fontFamily: sans,
                      fontWeight: 600,
                      fontSize: 12,
                      color: C.bone,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                    }}
                  >
                    {init}
                  </div>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 19,
                      color: i === 0 ? C.bone : "#b9b6af",
                      flex: 1,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r}
                  </div>
                  <Icon
                    name={dbl ? "dbl" : "check"}
                    s={20}
                    color={dbl ? C.acid : C.dim}
                  />
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 12,
                      color: C.dim,
                      letterSpacing: "0.1em",
                      width: 74,
                    }}
                  >
                    {dbl ? "READ" : "DELIVERED"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {/* toast before the words */}
        {t < W[0].s + 0.1 ? (
          <div
            style={{
              position: "absolute",
              left: 960,
              top: 540,
              transform: `translate(-50%, -50%) scale(${lerp(0.7, 1, backOut((t - a - 0.08) / 0.25))})`,
              opacity:
                clamp((t - a - 0.08) / 0.08) * (1 - clamp((t - W[0].s) / 0.08)),
              background: C.bone,
              color: "#0a0b0a",
              borderRadius: 14,
              padding: "22px 34px",
              display: "flex",
              alignItems: "center",
              gap: 26,
              fontFamily: sans,
              fontSize: 30,
              fontWeight: 600,
              boxShadow: "0 30px 90px rgba(0,0,0,0.7)",
            }}
          >
            Message sent to {RECIP.length} recipients
            <span style={{ color: "#6f746c", fontWeight: 500 }}>Undo</span>
          </div>
        ) : null}
        {/* the giant line */}
        {lineOn ? (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: CAPY + (BIGS * CAP) / 2 - (BIGS * CAP * cam.z + 80) / 2,
                height: BIGS * CAP * cam.z + 80,
                background: "rgba(5,6,5,0.86)",
                borderTop: `1px solid ${C.line2}`,
                borderBottom: `1px solid ${C.line2}`,
                transform: `scaleY(${scrim})`,
              }}
            />
            {[0].map((g) => {
              return (
                <div
                  key={g}
                  style={{
                    position: "absolute",
                    left: 960,
                    top: CAPY + (BIGS * CAP) / 2,
                    width: 0,
                    height: 0,
                    transform: `scale(${cam.z}) translateX(${-cam.fx}px)`,
                    filter:
                      mblur > 0.4 ? `blur(${mblur.toFixed(2)}px)` : undefined,
                  }}
                >
                  {LINE.map((L, i) => {
                    if (t < W[i].s - 0.034) return null;
                    const k = settle(t, W[i].s, 0.07, 0.3);
                    const inP = clamp((t - (W[i].s - 0.034)) / 0.1);
                    return (
                      <div
                        key={i}
                        style={{
                          position: "absolute",
                          left: L.x,
                          top: -(BIGS * CAP) / 2 - CAP_TOP * BIGS,
                          fontFamily: display,
                          fontSize: BIGS,
                          lineHeight: 1,
                          color: C.bone,
                          whiteSpace: "nowrap",
                          transform: `scale(${1 + 0.1 * k})`,
                          transformOrigin: "50% 50%",
                          opacity: easeOut(inP),
                          filter:
                            inP < 1
                              ? `blur(${(7 * (1 - inP)).toFixed(2)}px)`
                              : undefined,
                        }}
                      >
                        {L.w}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Compose: React.FC<SceneProps> = ({ a, b, variant }) => {
  const t = useTime();
  if (goneAfterCut(t, a, b)) return null;
  if (variant === "ch2") return <Ch2 a={a} b={b} />;
  if (variant === "fin") return <Fin a={a} b={b} />;
  return <Ch1 a={a} b={b} />;
};
