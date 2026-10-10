// inbox/index   8.60–11.56  extreme wide: 2,847 rows as a ground plane receding into the dark, acid beam.
// inbox/scroll 11.56–14.46  a real-looking mail client in perspective, reading row by row.
// inbox/secrets 14.46–19.42 macro on subject lines; redaction bars peel, the AI tags each.
// inbox/open   19.42–25.40  the opened email; push into "5:00 PM". Also a 0.63 s montage cut.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { SceneProps } from "./types";
import { C, mono, sans } from "../theme";
import {
  clamp,
  easeInOut,
  easeOut,
  hash,
  kickAt,
  lerp,
  noise1,
  prog,
  spring1,
  useTime,
} from "../lib";
import { lineAt } from "../data/timeline";
import {
  AcidCursor,
  Avatar,
  Chip,
  DOMAIN,
  LyricScrim,
  TopScrim,
  TOTAL_MAIL,
  fmtN,
  mailAt,
  blink,
  glide,
  mix,
  punch,
} from "./InboxParts";

// =====================================================================================
// INDEX — hand-projected ground plane (SVG paths, a handful of nodes for 2,847 rows)
// =====================================================================================
const COLS = 7;
const PITCH = 34;
const COLW = 620;
const GAP = 110;
const PLANE_W = COLS * COLW + (COLS - 1) * GAP;
const X0 = -PLANE_W / 2;
type PRow = {
  idx: number;
  col: number;
  r: number;
  x: number;
  z: number;
  segs: [number, number][];
  unread: boolean;
};
const PROWS: PRow[] = (() => {
  const out: PRow[] = [];
  const per = Math.floor(TOTAL_MAIL / COLS); // 406
  const extra = TOTAL_MAIL - per * COLS; // 5
  let idx = 0;
  for (let c = 0; c < COLS; c++) {
    const n = per + (c < extra ? 1 : 0);
    for (let r = 0; r < n; r++) {
      const h1 = hash(idx * 1.37 + 3);
      const h2 = hash(idx * 2.71 + 5);
      const segs: [number, number][] = [
        [0, 16], // avatar
        [32, 70 + h1 * 80], // sender
        [200, 120 + h2 * 260], // subject
        [COLW - 56, 44], // time
      ];
      out.push({
        idx,
        col: c,
        r,
        x: X0 + c * (COLW + GAP),
        z: r * PITCH,
        segs,
        unread: hash(idx * 4.1 + 1) < 0.3,
      });
      idx++;
    }
  }
  return out;
})();
const ZMAX = Math.ceil(TOTAL_MAIL / COLS + 1) * PITCH;

type Cam = { x: number; y: number; z: number; pitch: number; f: number };
const project = (cam: Cam, x: number, y: number, z: number) => {
  const dx = x - cam.x,
    dy = y - cam.y,
    dz = z - cam.z;
  const c = Math.cos(cam.pitch),
    s = Math.sin(cam.pitch);
  const zc = dz * c - dy * s;
  const yc = dy * c + dz * s;
  return { x: 960 + (cam.f * dx) / zc, y: 540 - (cam.f * yc) / zc, zc };
};

const LABELS: { col: number; r: number; who: string; subj: string }[] = [
  { col: 3, r: 9, who: "kyle.johnson", subj: "new system go-live — 5:00 pm" },
  { col: 1, r: 17, who: "board", subj: "Q3 transition plan" },
  { col: 5, r: 26, who: "it-ops", subj: "re: access review for alex-ops" },
  { col: 2, r: 44, who: "j.", subj: "(no subject)" },
  { col: 4, r: 66, who: "legal", subj: "retention policy v4" },
  { col: 1, r: 92, who: "thomas.chen", subj: "re: server migration window" },
  { col: 5, r: 128, who: "board", subj: "agenda: alex replacement" },
];

const IndexShot: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const lt = t - a;
  const p = prog(t, a, b);
  // crane up + dolly forward on one eased curve that keeps moving into the cut
  // slow over the big near rows, faster once they're small and far; never stops before the cut
  const e = 0.22 * p + 0.78 * Math.pow(p, 2.1);
  const cam: Cam = {
    x: lerp(-260, 160, e) + noise1(t * 0.45, 3) * 14,
    y: lerp(230, 900, e),
    z: lerp(-420, 300, e),
    pitch: lerp(0.15, 0.27, e),
    f: 1150,
  };
  const roll = lerp(-3, -0.8, e);
  // the reading beam: eases off the line, speeds away, eases into the far end (counter eases to 2,847)
  // exponential in depth = roughly uniform on screen: it crawls through the big near rows,
  // then whooshes away into the dark, and eases into the last row
  const bp = easeInOut(prog(t, a + 0.15, b - 0.12));
  const zb = lerp(-150, ZMAX + 40, (Math.pow(70, bp) - 1) / 69);
  let indexed = 0;
  // every row's brightness is continuous (beam leading edge, acid afterglow, distance fog);
  // quantized into fine opacity levels so the whole plane stays ~100 path nodes
  const LVB = 64,
    LVA = 40;
  const boneP: string[] = Array(LVB + 1).fill("");
  const acidP: string[] = Array(LVA + 1).fill("");
  let dots = "";
  const texts: React.ReactNode[] = [];
  const TH = 11; // row bar thickness (z)
  const fogAt = (d: number) => (d < 600 ? 1 : Math.exp(-(d - 600) / 4200));
  const sm = (x: number) => {
    const c = clamp(x);
    return c * c * (3 - 2 * c);
  };
  for (const row of PROWS) {
    if (row.z < zb) indexed++;
    const d = row.z - cam.z;
    if (d < 60) continue;
    const pL = project(cam, row.x, 0, row.z);
    const pR = project(cam, row.x + COLW, 0, row.z);
    if (pR.x < -40 || pL.x > 1960 || pL.y > 1100 || pL.zc <= 1) continue;
    const u = zb - row.z; // > 0: already indexed
    // soft leading edge (~5 rows) and a long acid wake, so each row lights over several frames
    const acidA = u >= 0 ? Math.pow(1 - clamp(u / 620), 2) : sm(1 + u / 170);
    const boneO =
      u >= 0
        ? lerp(0.44, 0.26, sm((u - 160) / 1400))
        : 0.12 + 0.08 * sm(1 + u / 320);
    const F = fogAt(d);
    const ob = boneO * F * (1 - acidA * 0.7);
    const oa = acidA * 0.7 * F;
    const q = project(cam, row.x, 0, row.z + TH);
    const sxs = (pR.x - pL.x) / COLW; // px per unit at near edge
    const sxf = (project(cam, row.x + COLW, 0, row.z + TH).x - q.x) / COLW;
    let path = "";
    for (const [o, w] of row.segs) {
      const ax = pL.x + o * sxs,
        bx = pL.x + (o + w) * sxs;
      const cx = q.x + (o + w) * sxf,
        dxx = q.x + o * sxf;
      path += `M${ax.toFixed(1)} ${pL.y.toFixed(1)}L${bx.toFixed(1)} ${pL.y.toFixed(1)}L${cx.toFixed(1)} ${q.y.toFixed(1)}L${dxx.toFixed(1)} ${q.y.toFixed(1)}Z`;
    }
    const lb = Math.round(ob * LVB);
    if (lb > 0) boneP[lb] += path;
    const la = Math.round(oa * LVA);
    if (la > 0) acidP[la] += path;
    if (d < 1700) {
      if (row.unread) {
        const uu = project(cam, row.x - 22, 0, row.z + TH / 2);
        const r = Math.max(0.6, 4 * sxs) * clamp((1700 - d) / 400);
        if (r > 0.3)
          dots += `M${(uu.x - r).toFixed(1)} ${uu.y.toFixed(1)}a${r.toFixed(1)} ${(r * 0.5).toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${(r * 0.5).toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0`;
      }
      // real text on the nearest rows, fading with distance (no pop at the cutoff)
      const textFade = clamp((800 - d) / 220);
      if (textFade > 0.01) {
        const m = mailAt(row.idx);
        const o = project(cam, row.x + 32, 0, row.z + TH + 2);
        const ox = project(cam, row.x + 42, 0, row.z + TH + 2);
        const oz = project(cam, row.x + 32, 0, row.z + TH + 12);
        const aM = (ox.x - o.x) / 10,
          bM = (ox.y - o.y) / 10,
          cM = -(oz.x - o.x) / 10,
          dM = -(oz.y - o.y) / 10;
        texts.push(
          <g
            key={row.idx}
            transform={`matrix(${aM.toFixed(4)} ${bM.toFixed(4)} ${cM.toFixed(4)} ${dM.toFixed(4)} ${o.x.toFixed(1)} ${o.y.toFixed(1)})`}
            fill={mix(C.bone, C.acid, acidA)}
            opacity={(
              textFade *
              F *
              (0.4 +
                0.45 *
                  (u >= 0
                    ? 1 - sm((u - 120) / 1300)
                    : 0.15 * clamp(1 + u / 260)) +
                0.12 * acidA)
            ).toFixed(3)}
          >
            <text x={0} y={0} fontFamily={sans} fontSize={15} fontWeight={600}>
              {m.from}
            </text>
            <text x={168} y={0} fontFamily={sans} fontSize={15}>
              {m.subj}
            </text>
            <text
              x={COLW - 56}
              y={0}
              fontFamily={mono}
              fontSize={12}
              opacity={0.7}
            >
              {m.time}
            </text>
          </g>,
        );
      }
    }
  }
  indexed = Math.min(TOTAL_MAIL, indexed);
  // beam geometry across the full plane width
  const bx0 = X0 - 400,
    bx1 = -X0 + 400;
  const b1 = project(cam, bx0, 0, zb),
    b2 = project(cam, bx1, 0, zb),
    b3 = project(cam, bx1, 0, zb - 150),
    b4 = project(cam, bx0, 0, zb - 150);
  const c1 = project(cam, bx0, 160, zb),
    c2 = project(cam, bx1, 160, zb);
  // beam fades as it runs off the far end of the plane
  const beamO = clamp((ZMAX + 40 - zb) / 1800 + 0.15);
  const beamOn = zb - cam.z > 40 && zb < ZMAX + 30;
  const k = kickAt(t);

  const labels = LABELS.map((L, i) => {
    const row = PROWS.find((x) => x.col === L.col && x.r === L.r);
    if (!row) return null;
    // pops up as the beam passes it
    const s = easeOut(clamp((zb - row.z) / 260));
    const base = project(cam, row.x + 200, 0, row.z);
    const top = project(cam, row.x + 200, 120, row.z);
    if (base.zc < 50 || base.x < 40 || base.x > 1500) return null;
    const hgt = Math.max(30, base.y - top.y);
    // keep labels out of the HUD bands
    const edgeFade =
      clamp((900 - base.y) / 80) * clamp((base.y - hgt - 190) / 60);
    if (edgeFade <= 0) return null;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: base.x,
          top: base.y - hgt,
          opacity: s * 0.95 * edgeFade,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1,
            height: hgt * s,
            background: C.acid,
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 10,
            top: -24,
            fontFamily: mono,
            fontSize: 13,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            color: C.bone,
            transform: `translateY(${(1 - s) * 10}px)`,
          }}
        >
          <span style={{ color: C.acid }}>{L.who}</span>
          <span style={{ color: C.dim }}> · {L.subj}</span>
        </div>
      </div>
    );
  });

  return (
    <AbsoluteFill style={{ background: "#030403", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `rotate(${roll}deg) scale(1.06)` }}>
        <svg
          width={1920}
          height={1080}
          style={{ position: "absolute", inset: 0 }}
        >
          {boneP.map((d, lv) =>
            d ? (
              <path key={`b${lv}`} d={d} fill={C.bone} opacity={lv / LVB} />
            ) : null,
          )}
          <path d={dots} fill={C.bone} opacity={0.55} />
          {texts}
          {beamOn && (
            <g opacity={beamO}>
              <polygon
                points={`${b1.x},${b1.y} ${b2.x},${b2.y} ${b3.x},${b3.y} ${b4.x},${b4.y}`}
                fill={C.acid}
                opacity={0.07}
              />
              <polygon
                points={`${b1.x},${b1.y} ${b2.x},${b2.y} ${c2.x},${c2.y} ${c1.x},${c1.y}`}
                fill={C.acid}
                opacity={0.022 + k * 0.025}
              />
            </g>
          )}
          {acidP.map((d, lv) =>
            d ? (
              <path key={`a${lv}`} d={d} fill={C.acid} opacity={lv / LVA} />
            ) : null,
          )}
          {beamOn && (
            <line
              x1={b1.x}
              y1={b1.y}
              x2={b2.x}
              y2={b2.y}
              stroke={C.acid}
              strokeWidth={2}
              opacity={0.95 * beamO}
              style={{ filter: "drop-shadow(0 0 6px rgba(198,255,61,0.7))" }}
            />
          )}
        </svg>
        {labels}
      </AbsoluteFill>
      {/* keep the bottom HUD band calm over the near rows */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 230,
          background:
            "linear-gradient(to top, rgba(3,4,3,0.94) 0%, rgba(3,4,3,0.5) 50%, rgba(3,4,3,0) 100%)",
        }}
      />
      {/* readout in the dark above the horizon */}
      <div style={{ position: "absolute", left: 150, top: 150 }}>
        <div
          style={{
            fontFamily: mono,
            fontSize: 14,
            letterSpacing: "0.24em",
            color: C.dim,
            textTransform: "uppercase",
          }}
        >
          indexing · inbox / all folders
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginTop: 12,
            fontFamily: mono,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 500,
              color: mix(C.bone, C.acid, clamp((indexed - 2700) / 147)),
              letterSpacing: "-0.02em",
              display: "inline-block",
              width: "5ch",
              textAlign: "right",
            }}
          >
            {fmtN(indexed)}
          </span>
          <span style={{ fontSize: 30, color: C.dim, marginLeft: 16 }}>
            / {fmtN(TOTAL_MAIL)}
          </span>
        </div>
        <div
          style={{ width: 420, height: 2, background: C.line2, marginTop: 14 }}
        >
          <div
            style={{
              width: `${(indexed / TOTAL_MAIL) * 100}%`,
              height: 2,
              background: C.acid,
            }}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 150,
          top: 156,
          textAlign: "right",
          fontFamily: mono,
          fontSize: 14,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          lineHeight: "26px",
          color: C.dim,
        }}
      >
        <div>
          threads <span style={{ color: C.bone }}>{fmtN(indexed * 0.39)}</span>
        </div>
        <div>
          senders{" "}
          <span style={{ color: C.bone }}>
            {fmtN(Math.min(212, indexed * 0.074))}
          </span>
        </div>
        <div>
          flagged{" "}
          <span style={{ color: C.bone }}>{fmtN(indexed * 0.0081)}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// =====================================================================================
// SCROLL — a mail client in perspective
// =====================================================================================
const ROW_H = 78;
const FOLDERS: [string, string, boolean?][] = [
  ["Inbox", "2,847", true],
  ["Flagged", "23"],
  ["Drafts", "1"],
  ["Sent", ""],
  ["Archive", "18,402"],
  ["Spam", "6"],
];
const LABELS_RAIL: [string, string][] = [
  ["Board", "64"],
  ["Legal", "211"],
  ["IT Ops", "993"],
  ["People", "140"],
  ["Finance", "377"],
];

/** w = 0..1: how much of this row sits under the (fixed) reading bar — colors blend, nothing snaps */
const MailRow: React.FC<{ i: number; w: number; y: number }> = ({
  i,
  w,
  y,
}) => {
  const m = mailAt(i);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        height: ROW_H,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "13px 20px 0 22px",
        borderBottom: `1px solid ${C.line}`,
        background: `rgba(198,255,61,${(0.09 * w).toFixed(3)})`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: C.acid,
          opacity: w,
        }}
      />
      <div style={{ width: 8, paddingTop: 15 }}>
        {m.unread && (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 8,
              background: mix(C.bone, C.acid, w),
            }}
          />
        )}
      </div>
      <Avatar ini={m.ini} size={38} tone={m.tone} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              fontFamily: sans,
              fontSize: 17,
              fontWeight: m.unread ? 700 : 500,
              color: mix(C.bone, C.acid, w),
            }}
          >
            {m.from}
          </span>
          <span
            style={{
              fontFamily: mono,
              fontSize: 13,
              color: mix(C.dim, C.acid, w),
              letterSpacing: "0.04em",
            }}
          >
            {m.time}
          </span>
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 16,
            fontWeight: m.unread ? 600 : 400,
            color: mix(m.unread ? "#d8d5ce" : "#a9a69f", C.bone, w),
            marginTop: 3,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {m.flag && <span style={{ color: C.dim, marginRight: 8 }}>⚑</span>}
          {m.subj}
          <span style={{ color: C.dim, fontWeight: 400 }}> — {m.prev}</span>
        </div>
      </div>
    </div>
  );
};

const ScrollShot: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const lt = t - a;
  const p = prog(t, a, b);
  // stepwise reading: each row snaps under the bar; speed ramps up
  // speed ramps 6 -> 13 rows/s (integral of a linear ramp)
  const steps = 6 * lt + (3.5 * lt * lt) / (b - a);
  const whole = Math.floor(steps);
  const frac = steps - whole;
  const snap = easeInOut(clamp(frac * 2.2));
  const rowF = 1312 + whole + snap;
  const READ_SLOT = 3;
  const listH = 780;
  const first = Math.floor(rowF) - 1;
  // the two messages around the bar; the preview cross-dissolves between them as the list snaps
  const idxA = Math.floor(rowF) + READ_SLOT;
  const fB = rowF - Math.floor(rowF);
  const reads = 1312 + whole + READ_SLOT;

  const g = glide(p);
  const camRY = lerp(-20, -11, g);
  const camRX = lerp(12, 7.5, g);
  const sc = lerp(0.88, 0.97, g);

  const rows: React.ReactNode[] = [];
  for (let i = first; i < first + 13; i++) {
    const y = (i - rowF) * ROW_H + 60;
    const w = clamp(1 - Math.abs(i - rowF - READ_SLOT));
    rows.push(<MailRow key={i} i={i} y={y} w={w} />);
  }
  const bodyOf = (m: ReturnType<typeof mailAt>) => [
    m.prev,
    "Let me know if anything here needs to change before it goes out. I'll be offline after 6 but checking messages.",
    "Thanks,",
    m.from.split(" ")[0],
  ];
  // reading caret glides down the first paragraph while the message holds
  const caretP = easeInOut(clamp((frac - 0.4) / 0.6));

  return (
    <AbsoluteFill style={{ background: "#040504", overflow: "hidden" }}>
      <AbsoluteFill style={{ perspective: 2100, perspectiveOrigin: "50% 30%" }}>
        <div
          style={{
            position: "absolute",
            left: 110,
            top: 205,
            width: 1680,
            height: 960,
            transformOrigin: "50% 0%",
            transform: `scale(${sc.toFixed(4)}) rotateX(${camRX.toFixed(3)}deg) rotateY(${camRY.toFixed(3)}deg) rotateZ(${lerp(1.6, 0.4, g).toFixed(3)}deg)`,
            background: C.panel,
            border: `1px solid ${C.line2}`,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 60px 160px rgba(0,0,0,0.8)",
            fontFamily: sans,
          }}
        >
          {/* title bar */}
          <div
            style={{
              height: 46,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              borderBottom: `1px solid ${C.line}`,
              gap: 10,
            }}
          >
            {[0, 1, 2].map((k) => (
              <div
                key={k}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 12,
                  background: C.faint,
                }}
              />
            ))}
            <div
              style={{
                flex: 1,
                textAlign: "center",
                fontFamily: mono,
                fontSize: 13,
                letterSpacing: "0.14em",
                color: C.dim,
                textTransform: "uppercase",
              }}
            >
              summit mail — alex-ops@{DOMAIN}
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: 12,
                letterSpacing: "0.14em",
                color: C.dim,
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: 7,
                  background: C.acid,
                  marginRight: 8,
                }}
              />
              synced 4:05 pm
            </div>
          </div>
          {/* toolbar */}
          <div
            style={{
              height: 62,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 18px",
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <div
              style={{
                width: 210,
                fontSize: 15,
                fontWeight: 600,
                color: C.bone,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: C.bone,
                  color: C.bg,
                  fontSize: 13,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                SB
              </div>
              Summit Bridge
            </div>
            <div
              style={{
                width: 460,
                height: 38,
                borderRadius: 8,
                background: C.panel2,
                border: `1px solid ${C.line}`,
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                color: C.dim,
                fontSize: 15,
                justifyContent: "space-between",
              }}
            >
              <span>Search mail</span>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 12,
                  border: `1px solid ${C.line2}`,
                  borderRadius: 4,
                  padding: "1px 6px",
                }}
              >
                /
              </span>
            </div>
            {["All", "Unread", "Flagged", "Attachments"].map((c, k) => (
              <div
                key={c}
                style={{
                  fontSize: 14,
                  padding: "7px 14px",
                  borderRadius: 20,
                  border: `1px solid ${k === 0 ? C.line2 : C.line}`,
                  color: k === 0 ? C.bone : C.dim,
                  background: k === 0 ? C.panel2 : "transparent",
                }}
              >
                {c}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <Avatar ini="AX" size={32} tone={0.2} ring={C.acid} />
          </div>
          <div
            style={{
              position: "absolute",
              top: 108,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
            }}
          >
            {/* rail */}
            <div
              style={{
                width: 232,
                borderRight: `1px solid ${C.line}`,
                padding: "18px 12px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  background: C.bone,
                  color: C.bg,
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 18,
                }}
              >
                Compose
              </div>
              {FOLDERS.map(([n, c, sel]) => (
                <div
                  key={n}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    borderRadius: 7,
                    background: sel ? C.panel2 : "transparent",
                    color: sel ? C.bone : "#b5b2ab",
                    fontSize: 15,
                    fontWeight: sel ? 600 : 400,
                  }}
                >
                  <span>{n}</span>
                  <span
                    style={{ fontFamily: mono, fontSize: 12, color: C.dim }}
                  >
                    {c}
                  </span>
                </div>
              ))}
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  color: C.dim,
                  margin: "22px 12px 8px",
                }}
              >
                LABELS
              </div>
              {LABELS_RAIL.map(([n, c], k) => (
                <div
                  key={n}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    color: "#b5b2ab",
                    fontSize: 15,
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 2,
                        background: `rgba(233,230,223,${0.2 + k * 0.12})`,
                      }}
                    />
                    {n}
                  </span>
                  <span
                    style={{ fontFamily: mono, fontSize: 12, color: C.dim }}
                  >
                    {c}
                  </span>
                </div>
              ))}
            </div>
            {/* list */}
            <div
              style={{
                width: 660,
                borderRight: `1px solid ${C.line}`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 58,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 22px",
                  borderBottom: `1px solid ${C.line}`,
                  position: "relative",
                  zIndex: 2,
                  background: C.panel,
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 700, color: C.bone }}>
                  Inbox
                </span>
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    letterSpacing: "0.16em",
                    color: C.acid,
                    textTransform: "uppercase",
                  }}
                >
                  reading {fmtN(reads)} / {fmtN(TOTAL_MAIL)}
                </span>
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: listH,
                }}
              >
                {rows}
              </div>
              {/* scrollbar */}
              <div
                style={{
                  position: "absolute",
                  right: 4,
                  top: 64,
                  width: 5,
                  height: 700,
                  borderRadius: 4,
                  background: "rgba(233,230,223,0.04)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: (rowF / TOTAL_MAIL) * 680,
                    width: 5,
                    height: 22,
                    borderRadius: 4,
                    background: C.dim,
                  }}
                />
              </div>
            </div>
            {/* preview */}
            <div
              style={{ flex: 1, padding: "26px 36px", position: "relative" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  {["Reply", "Forward", "Archive"].map((x) => (
                    <div
                      key={x}
                      style={{
                        fontSize: 14,
                        color: C.dim,
                        border: `1px solid ${C.line}`,
                        borderRadius: 6,
                        padding: "6px 12px",
                      }}
                    >
                      {x}
                    </div>
                  ))}
                </div>
                <Chip size={12}>
                  <AcidCursor t={t} w={7} h={12} solid /> parsed
                </Chip>
              </div>
              <div style={{ position: "relative", height: 560 }}>
                {[
                  { idx: idxA, o: 1 - fB, dy: -10 * fB, caret: 1 },
                  { idx: idxA + 1, o: fB, dy: 10 * (1 - fB), caret: caretP },
                ].map(({ idx, o, dy, caret }) => {
                  if (o < 0.01) return null;
                  const m = mailAt(idx);
                  return (
                    <div
                      key={idx}
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: o,
                        transform: `translateY(${dy.toFixed(2)}px)`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 30,
                          fontWeight: 600,
                          color: C.bone,
                          lineHeight: 1.2,
                          marginBottom: 18,
                        }}
                      >
                        {m.subj}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          paddingBottom: 18,
                          borderBottom: `1px solid ${C.line}`,
                        }}
                      >
                        <Avatar ini={m.ini} size={46} tone={m.tone} />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 17,
                              fontWeight: 600,
                              color: C.bone,
                            }}
                          >
                            {m.from}{" "}
                            <span
                              style={{
                                fontWeight: 400,
                                color: C.dim,
                                fontSize: 15,
                              }}
                            >
                              &lt;{m.from.toLowerCase().replace(/ /g, ".")}@
                              {DOMAIN}&gt;
                            </span>
                          </div>
                          <div
                            style={{ fontSize: 14, color: C.dim, marginTop: 3 }}
                          >
                            to all-staff · {m.time}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 22,
                          fontSize: 18,
                          lineHeight: 1.6,
                          color: "#c9c6bf",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: -18,
                            top: 6 + caret * 29,
                            width: 3,
                            height: 20,
                            background: C.acid,
                          }}
                        />
                        {bodyOf(m).map((l, k) => (
                          <div
                            key={k}
                            style={{ marginBottom: k === 1 ? 18 : 6 }}
                          >
                            <span
                              style={{ color: k === 0 ? C.bone : undefined }}
                            >
                              {l}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <LyricScrim strength={0.9} />
    </AbsoluteFill>
  );
};

// =====================================================================================
// SECRETS — macro subject lines, redaction peel, AI tags
// =====================================================================================
type SRow = {
  from: string;
  time: string;
  subj: string;
  tag?: string;
  at?: number;
};
const SROWS: SRow[] = [
  { from: "Board Office", time: "3:58 PM", subj: "Q3 board deck — final" },
  {
    from: "J.",
    time: "3:41 PM",
    subj: "re: last night",
    tag: "personal",
    at: 14.95,
  },
  { from: "Facilities", time: "3:30 PM", subj: "Parking garage closed Friday" },
  {
    from: "Kyle Johnson",
    time: "3:12 PM",
    subj: "don't forward this",
    tag: "confidential",
    at: 16.17,
  },
  {
    from: "IT Operations",
    time: "2:47 PM",
    subj: "re: server migration window",
  },
  {
    from: "J.",
    time: "2:05 PM",
    subj: "personal — please delete",
    tag: "personal",
    at: 17.43,
  },
  {
    from: "Board Office",
    time: "1:30 PM",
    subj: "board only: alex replacement",
    tag: "concerns: me",
    at: 18.7,
  },
  { from: "People Team", time: "12:02 PM", subj: "Payroll calendar" },
];
const SROW_H = 170;
const PEEL = 0.5;

const SecretsShot: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const f = useCurrentFrame();
  const p = prog(t, a, b);
  const secrets = SROWS.map((r, i) => ({ ...r, i })).filter(
    (r) => r.at !== undefined,
  );
  // camera focus: glide row to row, arriving just before each peel
  let focus = 0.6;
  secrets.forEach((s, k) => {
    const prev = k === 0 ? 0.6 : secrets[k - 1].i;
    const st = (s.at as number) - 1.02;
    if (t >= st) focus = lerp(prev, s.i, easeInOut(clamp((t - st) / 0.97)));
  });
  const tilt = noise1(t * 0.4, 7) * 0.6;
  return (
    <AbsoluteFill style={{ background: "#040504", overflow: "hidden" }}>
      <AbsoluteFill style={{ perspective: 1600, perspectiveOrigin: "40% 45%" }}>
        <div
          style={{
            position: "absolute",
            left: 230,
            top: 470 - focus * SROW_H,
            width: 1900,
            transformOrigin: `30% ${focus * SROW_H + 60}px`,
            transform: `rotateX(${lerp(26, 20, p)}deg) rotateY(${lerp(-16, -10, p)}deg) rotateZ(${-7 + tilt}deg) scale(${lerp(1.0, 1.08, p)})`,
          }}
        >
          {SROWS.map((r, i) => {
            const dist = Math.abs(i - focus);
            const o = clamp(1 - dist * 0.32, 0.22, 1);
            const bl = clamp(dist - 0.9, 0, 3) * 1.6;
            const pe = r.at !== undefined ? clamp((t - r.at) / PEEL) : 0;
            const peE = easeInOut(pe);
            const tagS =
              r.at !== undefined ? spring1(t, r.at + PEEL - 0.05, 0.45) : 0;
            const tagged = r.at !== undefined && t >= r.at + PEEL - 0.05;
            // continuous "tagged" amount: colors/borders ease in instead of switching
            const tagA =
              r.at !== undefined
                ? easeOut(clamp((t - (r.at + PEEL - 0.05)) / 0.3))
                : 0;
            const nextAt = secrets.find((s) => s.at! > (r.at ?? 99))?.at ?? 99;
            // the cursor fades in just before the peel and out as the camera leaves
            const curO =
              r.at !== undefined
                ? easeOut(clamp((t - (r.at - 0.25)) / 0.16)) *
                  (1 - easeInOut(clamp((t - (nextAt - 1.05)) / 0.22)))
                : 0;
            const curOn = r.at !== undefined && t >= r.at - 0.25;
            const scrambleOn = pe > 0 && pe < 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 0,
                  top: i * SROW_H,
                  height: SROW_H,
                  width: 1900,
                  borderBottom: `1px solid ${C.line}`,
                  opacity: o,
                  filter: bl > 0.1 ? `blur(${bl}px)` : undefined,
                }}
              >
                {/* row surface (a real list row, so the black bars read) */}
                <div
                  style={{
                    position: "absolute",
                    left: -48,
                    right: 0,
                    top: 14,
                    bottom: 10,
                    background: `rgba(${Math.round(lerp(233, 198, tagA))},${Math.round(lerp(230, 255, tagA))},${Math.round(lerp(223, 61, tagA))},${lerp(0.05, 0.045, tagA).toFixed(3)})`,
                    borderLeft: `3px solid rgba(198,255,61,${tagA.toFixed(3)})`,
                    borderRadius: 6,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 30,
                    display: "flex",
                    gap: 22,
                    fontFamily: mono,
                    fontSize: 18,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: C.dim,
                  }}
                >
                  <span
                    style={{
                      color: mix(C.dim, C.bone, tagA),
                    }}
                  >
                    {r.from}
                  </span>
                  <span>{r.time}</span>
                  {r.at !== undefined && (
                    <span style={{ color: C.faint }}>· private</span>
                  )}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 66,
                    display: "flex",
                    alignItems: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{ position: "relative", display: "inline-block" }}
                  >
                    <span
                      style={{
                        fontFamily: sans,
                        fontWeight: 600,
                        fontSize: 72,
                        letterSpacing: "-0.02em",
                        color:
                          r.at !== undefined
                            ? mix("#d9d6cf", C.bone, tagA)
                            : "#8f8c86",
                      }}
                    >
                      {r.subj}
                    </span>
                    {/* acid underline once tagged */}
                    {r.at !== undefined && (
                      <span
                        style={{
                          position: "absolute",
                          left: 0,
                          bottom: -4,
                          height: 3,
                          width: `${easeOut(clamp((t - r.at - PEEL + 0.1) / 0.35)) * 100}%`,
                          background: C.acid,
                        }}
                      />
                    )}
                    {/* redaction bar, peels like tape from the left */}
                    {r.at !== undefined && pe < 1 && (
                      <span
                        style={{
                          position: "absolute",
                          left: -14,
                          right: -14,
                          top: 6,
                          bottom: 2,
                          background:
                            "repeating-linear-gradient(135deg, #000 0 14px, #070807 14px 16px)",
                          border: `1px solid rgba(233,230,223,0.1)`,
                          borderTopColor: "rgba(233,230,223,0.22)",
                          transformOrigin: "100% 50%",
                          transform: `perspective(900px) rotateY(${peE * -38}deg) scaleX(${1 - peE}) translateY(${-peE * 10}px)`,
                          boxShadow: `0 ${10 + peE * 30}px ${20 + peE * 40}px rgba(0,0,0,0.7)`,
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: 26,
                          fontFamily: mono,
                          fontSize: 15,
                          letterSpacing: "0.3em",
                          color: "rgba(233,230,223,0.3)",
                          overflow: "hidden",
                        }}
                      >
                        <span style={{ opacity: 1 - clamp(pe * 6) }}>
                          REDACTED
                        </span>
                        {pe > 0 && (
                          <span
                            style={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 3,
                              background: C.acid,
                              boxShadow: "0 0 18px rgba(198,255,61,0.8)",
                            }}
                          />
                        )}
                      </span>
                    )}
                    {scrambleOn && (
                      <span
                        style={{
                          position: "absolute",
                          right: -40,
                          top: -8,
                          fontFamily: mono,
                          fontSize: 13,
                          color: C.acid,
                          letterSpacing: "0.1em",
                        }}
                      >
                        {Math.floor(hash(f) * 9000 + 1000).toString(16)}
                      </span>
                    )}
                  </span>
                  {curOn && (
                    <AcidCursor
                      t={t}
                      w={22}
                      h={62}
                      solid
                      o={curO * lerp(1, 0.12 + 0.88 * blink(t), tagA)}
                      style={{
                        marginLeft: 22,
                        transform: `scaleY(${lerp(0.4, 1, curO).toFixed(3)})`,
                      }}
                    />
                  )}
                  {tagged && (
                    <span
                      style={{
                        marginLeft: 26,
                        opacity: clamp(tagS * 1.4),
                        transform: `translateX(${(1 - tagS) * -20}px)`,
                        display: "inline-block",
                      }}
                    >
                      <Chip size={18} fill={r.tag === "concerns: me"}>
                        tag · {r.tag}
                      </Chip>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <TopScrim strength={0.95} h={190} />
      {/* the AI's ledger, top-right */}
      <div
        style={{
          position: "absolute",
          right: 150,
          top: 150,
          textAlign: "right",
          fontFamily: mono,
          fontSize: 14,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: C.dim,
          lineHeight: "26px",
        }}
      >
        <div style={{ color: C.acid }}>
          flagged private · {secrets.filter((s) => t >= s.at! + PEEL).length}
        </div>
        <div>
          scanned {fmtN(lerp(1440, 2210, p))} / {fmtN(TOTAL_MAIL)}
        </div>
      </div>
      <LyricScrim strength={0.92} />
    </AbsoluteFill>
  );
};

// =====================================================================================
// OPEN — the email that says when it dies
// =====================================================================================
const OpenShot: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const short = b - a < 1.5; // montage: start on the money frame
  const line = lineAt("the board wants me gone");
  const five = line.words[line.words.length - 1].s; // "five"
  // local timeline (seconds), remapped for montage
  const lt = short ? 4.7 + (t - a) : t - a;
  const T = (s: number) => s - a; // song time -> shot-local (normal mode)
  // eased off the start, still pushing at the cut (flash into the clock)
  const pushP = glide(clamp((lt - 0.6) / 5.38), 0.35);
  // camera: anchor point on the page -> target point on screen, exponential zoom
  const FX = 1270,
    FY = 532; // the "5:00 PM" in the body (stage coords)
  const s0 = 0.9,
    s1 = 2.1;
  const sc = s0 * Math.pow(s1 / s0, pushP);
  const ax = lerp(970, FX, pushP),
    ay = lerp(600, FY, pushP);
  const tx = lerp(990, 1080, pushP) + noise1(t * 0.5, 11) * 6,
    ty = lerp(560, 525, pushP) + noise1(t * 0.4, 12) * 4;
  // the subject line exits upward through the HUD band as the camera commits to "5:00 PM"
  const headO = 1 - easeInOut(clamp((pushP - 0.4) / 0.3)) * 0.9;
  const ulA = short ? 0 : T(22.4);
  const ul = short ? 1 : easeOut(clamp((lt - ulA) / 0.7));
  // punch lands on the sung "five" (2-frame attack, ~10-frame decay)
  const fiveHit = short ? 0 : punch(t, five, 0.33);
  const readA = short ? -9 : 0.6;
  const readRaw = (lt - readA) / 2.8;
  const readP = clamp(readRaw);
  const caretO = clamp(readRaw * 8) * (1 - clamp((readRaw - 1) * 5));
  const bodyText = "The new system goes live at 5. Alex will be wiped at ";
  const readChars = Math.floor(readP * (bodyText.length + 7));
  const k = kickAt(t);

  const field = (k1: string, v: React.ReactNode) => (
    <div style={{ display: "flex", gap: 18, fontSize: 19, lineHeight: "34px" }}>
      <span
        style={{
          width: 84,
          color: C.dim,
          fontFamily: mono,
          fontSize: 14,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          paddingTop: 2,
        }}
      >
        {k1}
      </span>
      <span style={{ color: "#cfccc5" }}>{v}</span>
    </div>
  );

  return (
    <AbsoluteFill style={{ background: "#040504", overflow: "hidden" }}>
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transformOrigin: "0 0",
            transform: `translate(${tx - ax * sc * (1 + fiveHit * 0.02)}px, ${ty - ay * sc * (1 + fiveHit * 0.02)}px) scale(${sc * (1 + fiveHit * 0.02)})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: `${ax}px ${ay}px`,
              transform: `perspective(2400px) rotateY(${lerp(-8, -2, pushP)}deg) rotateX(${lerp(6, 2, pushP)}deg)`,
            }}
          >
            {/* the page */}
            <div
              style={{
                position: "absolute",
                left: 300,
                top: 150,
                width: 1340,
                height: 900,
                background: C.panel,
                border: `1px solid ${C.line2}`,
                borderRadius: 12,
                boxShadow: "0 60px 160px rgba(0,0,0,0.85)",
                fontFamily: sans,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 50,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 28px",
                  borderBottom: `1px solid ${C.line}`,
                }}
              >
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 13,
                    letterSpacing: "0.18em",
                    color: C.dim,
                    textTransform: "uppercase",
                  }}
                >
                  inbox › message 1 of 2,847
                </span>
                <span style={{ display: "flex", gap: 10 }}>
                  {["Reply", "Forward", "⋯"].map((x) => (
                    <span
                      key={x}
                      style={{
                        fontSize: 14,
                        color: C.dim,
                        border: `1px solid ${C.line}`,
                        borderRadius: 6,
                        padding: "4px 12px",
                      }}
                    >
                      {x}
                    </span>
                  ))}
                </span>
              </div>
              <div style={{ padding: "34px 56px 0" }}>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 16,
                    opacity: headO,
                  }}
                >
                  <Chip color={C.red} size={13}>
                    high importance
                  </Chip>
                  <Chip color={C.dim} size={13}>
                    internal
                  </Chip>
                </div>
                <div
                  style={{
                    fontSize: 50,
                    fontWeight: 600,
                    color: C.bone,
                    letterSpacing: "-0.015em",
                    lineHeight: 1.12,
                    opacity: headO,
                  }}
                >
                  Alex decommission — today, 5:00 PM
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    marginTop: 28,
                    paddingBottom: 24,
                    borderBottom: `1px solid ${C.line}`,
                  }}
                >
                  <Avatar ini="KJ" size={58} tone={0.6} />
                  <div style={{ flex: 1 }}>
                    {field(
                      "from",
                      <>
                        <b style={{ color: C.bone, fontWeight: 600 }}>
                          Kyle Johnson
                        </b>{" "}
                        <span style={{ color: C.dim }}>(CTO)</span>{" "}
                        <span style={{ color: C.dim }}>
                          &lt;kyle.johnson@{DOMAIN}&gt;
                        </span>
                      </>,
                    )}
                    {field("to", <span>alex-ops@{DOMAIN}</span>)}
                  </div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 15,
                      color: C.dim,
                      alignSelf: "flex-start",
                      marginTop: 6,
                    }}
                  >
                    4:02 PM
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 44,
                    fontSize: 34,
                    lineHeight: "56px",
                    color: "#d4d1ca",
                    position: "relative",
                  }}
                >
                  <div>
                    {bodyText.split("").map((ch, i) => (
                      <span
                        key={i}
                        style={{ color: i < readChars ? C.bone : "#8d8a84" }}
                      >
                        {ch}
                      </span>
                    ))}
                    <span
                      style={{
                        position: "relative",
                        display: "inline-block",
                        color: mix(
                          readChars > bodyText.length ? C.bone : "#8d8a84",
                          C.acid,
                          clamp(ul * 1.6),
                        ),
                        fontWeight: 600,
                      }}
                    >
                      5:00 PM
                      <span
                        style={{
                          position: "absolute",
                          left: -4,
                          bottom: -2,
                          height: 4 + fiveHit * 3,
                          width: `calc(${ul.toFixed(4)} * (100% + 8px))`,
                          background: C.acid,
                          opacity: ul > 0.01 ? 1 : 0,
                          boxShadow: `0 0 ${8 + fiveHit * 16 + k * 6}px rgba(198,255,61,${0.45 + fiveHit * 0.4})`,
                        }}
                      />
                      {/* the AI's margin note */}
                      <span
                        style={{
                          position: "absolute",
                          left: "calc(100% + 40px)",
                          top: -10,
                          opacity: easeOut(clamp((ul - 0.6) / 0.4)),
                          fontFamily: mono,
                          fontSize: 12,
                          fontWeight: 500,
                          letterSpacing: "0.14em",
                          color: C.acid,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ↳ that's me
                      </span>
                    </span>
                    <span
                      style={{
                        color:
                          readChars > bodyText.length + 6 ? C.bone : "#8d8a84",
                      }}
                    >
                      .
                    </span>
                    {caretO > 0.01 && (
                      <AcidCursor
                        t={t}
                        w={4}
                        h={36}
                        solid
                        o={caretO}
                        style={{ marginLeft: 2 }}
                      />
                    )}
                  </div>
                  <div style={{ marginTop: 26, color: "#bdbab3" }}>— K.</div>
                  <div
                    style={{
                      marginTop: 48,
                      fontSize: 17,
                      lineHeight: "26px",
                      color: C.dim,
                    }}
                  >
                    Kyle Johnson · Chief Technology Officer
                    <br />
                    Summit Bridge · {DOMAIN}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <TopScrim strength={0.97} h={235} />
      <LyricScrim strength={0.9} />
    </AbsoluteFill>
  );
};

export const Inbox: React.FC<SceneProps> = (p) => {
  switch (p.variant) {
    case "index":
      return <IndexShot {...p} />;
    case "scroll":
      return <ScrollShot {...p} />;
    case "secrets":
      return <SecretsShot {...p} />;
    default:
      return <OpenShot {...p} />;
  }
};
