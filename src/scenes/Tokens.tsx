// tokens/appear — masked hf_ token tags tumble onto a doormat in 3D, counter starts
// tokens/count  — exact 41 x 41 = 1,681 grid fills; 655 flash red (write access); 723 orgs; Meta callout
//                 (also a 0.63 s montage cut)
// tokens/door   — picks up the count frame, the grid splits down the middle and swings open, light spills
import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { C, mono, display } from "../theme";
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
} from "../lib";
import { Source, useShake } from "../ui";
import { lineAt, wordAt } from "../data/timeline";

export const Tokens: React.FC<SceneProps> = (p) =>
  p.variant === "count" ? (
    <Count {...p} />
  ) : p.variant === "door" ? (
    <Door {...p} />
  ) : (
    <Appear {...p} />
  );

const bone = (a: number) => `rgba(233,230,223,${a})`;
const red = (a: number) => `rgba(255,59,47,${a})`;
const BG = `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(198,255,61,0.03), transparent 70%), ${C.bg}`;
const sineInOut = (p: number) => (1 - Math.cos(Math.PI * clamp(p))) / 2;

/* ------------------------------------------------------------ the grid */

const NG = 41;
const TOTAL = NG * NG; // 1,681 — Lasso Security, Dec 2023
const WRITE = 655; // tokens with write permission
const ORGS = 723; // organizations' accounts
const CHIPS = 64; // tags that land in tokens/appear; tokens/count picks up from here

const CELL = 16,
  PITCH = 19,
  GSIZE = NG * PITCH - (PITCH - CELL); // 776
const GX = (1920 - GSIZE) / 2; // 572
const GY = 150;

const fmt = (n: number) => n.toLocaleString("en-US");

// fill order: a diagonal sweep roughened by noise, so it reads as "found", not "loaded"
const ORDER: number[] = Array.from({ length: TOTAL }, (_, i) => i).sort(
  (p, q) => {
    const key = (i: number) => {
      const r = Math.floor(i / NG),
        c = i % NG;
      return 0.6 * ((r + c) / (2 * (NG - 1))) + 0.4 * hash(i * 1.37 + 0.5);
    };
    return key(p) - key(q);
  },
);
const RANK = new Array<number>(TOTAL);
ORDER.forEach((cell, r) => (RANK[cell] = r));
// the 655 write-access tokens: a fixed pseudo-random subset; revealed left to right with jitter
const WRITE_LIST: number[] = Array.from({ length: TOTAL }, (_, i) => i)
  .sort((p, q) => hash(p * 3.71 + 9.2) - hash(q * 3.71 + 9.2))
  .slice(0, WRITE)
  .sort(
    (p, q) => (p % NG) + hash(p * 5.1) * 9 - ((q % NG) + hash(q * 5.1) * 9),
  );
const WRITE_RANK = new Map<number, number>();
WRITE_LIST.forEach((cell, r) => WRITE_RANK.set(cell, r));
// the callout cell: an ordinary token near the lower left — the source only says Meta (Llama 2)
// was among the exposed orgs, so it is deliberately not a write-access cell
const META_CELL = Array.from({ length: TOTAL }, (_, i) => i).filter(
  (i) =>
    Math.floor(i / NG) === 31 &&
    i % NG >= 3 &&
    i % NG < 9 &&
    !WRITE_RANK.has(i),
)[0];

/** the 41x41 grid. n = filled count, redP = 0..1 linear red reveal,
 *  flash = [t0, t1] of that reveal (omit for a settled grid), dimRow = row opacity */
const Grid: React.FC<{
  n: number;
  redP: number;
  t: number;
  dimRow: (r: number) => number;
  flash?: [number, number];
  sparkle?: boolean;
}> = ({ n, redP, t, dimRow, flash, sparkle = true }) => {
  const redN = Math.floor(redP * WRITE);
  const rects: React.ReactNode[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const r = Math.floor(i / NG),
      c = i % NG;
    const rk = RANK[i];
    const filled = rk < n;
    const wr = WRITE_RANK.get(i);
    const isRed = wr !== undefined && wr < redN;
    const tw = flash
      ? flash[0] + ((wr ?? 0) / WRITE) * (flash[1] - flash[0])
      : 0;
    // flash only once the wave reaches the cell (before that a red cell is plain red)
    const fresh = isRed && flash && t >= tw ? Math.exp(-(t - tw) * 7) : 0;
    const newest =
      filled && sparkle && n < TOTAL ? clamp(1 - (n - rk) / 70) : 0;
    let fill: string;
    if (isRed)
      fill = `rgb(255,${Math.round(59 + 85 * fresh)},${Math.round(47 + 85 * fresh)})`;
    else if (filled) fill = bone(0.25 + newest * 0.7);
    else fill = bone(0.055);
    const op = dimRow(r) * (isRed ? 0.88 + fresh * 0.12 : 1);
    const grow = fresh * 2.5;
    rects.push(
      <rect
        key={i}
        x={c * PITCH - grow}
        y={r * PITCH - grow}
        width={CELL + grow * 2}
        height={CELL + grow * 2}
        rx={1.5}
        fill={fill}
        opacity={op}
      />,
    );
  }
  return (
    <svg
      width={GSIZE}
      height={GSIZE}
      style={{ display: "block", overflow: "visible" }}
    >
      {rects}
    </svg>
  );
};

/** the numbers around the grid (shared by count and the first beat of door) */
const Stats: React.FC<{
  n: number;
  redN: number;
  orgs: number;
  redO: number;
  orgsO: number;
  k: number;
  o?: number;
}> = ({ n, redN, orgs, redO, orgsO, k, o = 1 }) => (
  <div style={{ position: "absolute", inset: 0, opacity: o }}>
    {/* left: the count */}
    <div style={{ position: "absolute", left: 130, top: 150, width: 420 }}>
      <div
        style={{
          fontFamily: mono,
          fontSize: 14,
          letterSpacing: "0.18em",
          color: C.dim,
        }}
      >
        <span style={{ color: C.bone }}>HF TOKENS</span> EXPOSED
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: 132,
          lineHeight: 1,
          marginTop: 8,
          color: n >= TOTAL ? C.bone : bone(0.9),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmt(n)}
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 13,
          letterSpacing: "0.16em",
          color: C.dim,
          marginTop: 10,
        }}
      >
        ON GITHUB + HUGGING FACE
      </div>
      <Source style={{ position: "relative", marginTop: 16 }}>
        <div style={{ color: C.bone }}>LASSO SECURITY · DEC 2023</div>
        <div>ALL FIXED AFTER DISCLOSURE</div>
      </Source>
    </div>

    {/* right: write access */}
    <div
      style={{
        position: "absolute",
        right: 130,
        top: 150,
        textAlign: "right",
        opacity: redO,
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: 14,
          letterSpacing: "0.18em",
          color: C.red,
        }}
      >
        WRITE ACCESS
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: 132,
          lineHeight: 1,
          marginTop: 8,
          color: C.red,
          fontVariantNumeric: "tabular-nums",
          textShadow: k > 0.3 ? `0 0 ${k * 18}px ${red(0.2)}` : undefined,
        }}
      >
        {redN}
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 13,
          letterSpacing: "0.16em",
          color: C.dim,
          marginTop: 10,
        }}
      >
        TOKENS WITH
        <br />
        WRITE PERMISSION
      </div>
    </div>

    {/* right low: orgs */}
    <div
      style={{
        position: "absolute",
        right: 130,
        top: 712,
        textAlign: "right",
        opacity: orgsO,
        transform: `translateY(${(1 - orgsO) * 16}px)`,
      }}
    >
      <div
        style={{
          fontFamily: display,
          fontSize: 112,
          lineHeight: 1,
          color: C.bone,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {orgs} <span style={{ fontSize: 56, color: C.dim }}>ORGS</span>
      </div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 13,
          letterSpacing: "0.16em",
          color: C.dim,
          marginTop: 10,
        }}
      >
        ORGANIZATIONS’ ACCOUNTS EXPOSED
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------- appear */

const MAT_W = 920,
  MAT_H = 570;
const TAG_W = 204,
  TAG_H = 54;
const SUFFIX = ["3kQz", "Lb7R", "x9Fe", "Qm2T", "v8Kd", "Zp4W", "Hn6s", "c1Ju"];

const Appear: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const L = lineAt("while your keys");
  const tKeys = wordAt(L, "keys");
  const tLast = b - 0.22;
  const k = kickAt(t);
  const drift = prog(t, a, b);
  // mostly-linear dolly so it is still moving at the cut (eased only at the start)
  const dr = drift * 0.75 + easeInOut(drift) * 0.25;
  const rz = lerp(-10, -3.5, dr) + noise1(t * 0.4, 3) * 0.4;
  const rx = lerp(53, 48.5, dr);
  const dz = lerp(-170, 10, dr);

  const landT = (i: number) =>
    tKeys - 0.02 + (tLast - tKeys) * Math.pow(i / (CHIPS - 1), 0.62);
  let landed = 0;
  for (let i = 0; i < CHIPS; i++) if (t >= landT(i)) landed++;

  const chips: React.ReactNode[] = [];
  const shadows: React.ReactNode[] = [];
  for (let i = 0; i < CHIPS; i++) {
    const Ti = landT(i);
    const D = 0.82 + hash(i * 2.3) * 0.25;
    if (t < Ti - D) continue;
    const p = clamp((t - (Ti - D)) / D);
    const q = clamp((t - Ti) / 0.34);
    // landing spot: spread across the mat, gently biased to the middle
    const gx = hash(i * 9.1) * 0.78 + hash(i * 4.7) * 0.22 - 0.5;
    const gy = hash(i * 6.3) * 0.78 + hash(i * 2.9) * 0.22 - 0.5;
    const x = gx * (MAT_W - TAG_W - 30);
    const y = gy * (MAT_H - TAG_H - 60);
    const z0 = 1100 + hash(i * 1.9) * 500;
    const stack = 2 + i * 0.9; // later tags rest on top of earlier ones
    const land = t >= Ti;
    const z = land
      ? stack + 26 * Math.sin(Math.PI * q) * (1 - q)
      : stack + z0 * (1 - p * p);
    const fx = (hash(i * 3.3) - 0.5) * 300 * (1 - p);
    const fy = (hash(i * 7.7) - 0.5) * 200 * (1 - p);
    const spinX = (hash(i * 5.5) > 0.5 ? 1 : -1) * (360 + hash(i) * 360);
    const spinY = (hash(i * 8.8) - 0.5) * 540;
    const rzF = (hash(i * 12.1) - 0.5) * 130;
    const settle = 1 - easeOut(q);
    const rxx = land ? settle * 10 * Math.sin(q * 9) : (1 - p) * spinX;
    const ryy = land ? 0 : (1 - p) * spinY;
    const ring = land ? Math.exp(-(t - Ti) * 2.2) : 0;
    chips.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: x + fx - TAG_W / 2,
          top: y + fy - TAG_H / 2,
          width: TAG_W,
          height: TAG_H,
          transformStyle: "preserve-3d",
          transform: `translateZ(${z}px) rotateZ(${rzF}deg) rotateX(${rxx}deg) rotateY(${ryy}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 9,
            background: "#121412",
            // landing tint: red that cools back to bone (blended, never a 1-frame swap)
            border: `1px solid rgba(${Math.round(lerp(233, 255, clamp(ring * 1.2)))},${Math.round(lerp(230, 59, clamp(ring * 1.2)))},${Math.round(lerp(223, 47, clamp(ring * 1.2)))},${lerp(0.36, 0.95, clamp(ring * 1.2)).toFixed(3)})`,
            boxShadow: "0 1px 0 rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingLeft: 14,
            fontFamily: mono,
            fontSize: 18,
            letterSpacing: "0.02em",
            color: C.bone,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 14,
              border: `2px solid ${bone(0.45)}`,
              background: C.bg,
              flexShrink: 0,
            }}
          />
          <span>
            <span style={{ color: C.dim }}>hf_</span>••••••••{SUFFIX[i % 8]}
          </span>
        </div>
      </div>,
    );
    // contact shadow + landing ring on the mat
    shadows.push(
      <div
        key={`s${i}`}
        style={{
          position: "absolute",
          left: x + fx - TAG_W / 2 - 6,
          top: y + fy - TAG_H / 2 - 6,
          width: TAG_W + 12,
          height: TAG_H + 12,
          borderRadius: 16,
          background: "rgba(0,0,0,0.6)",
          opacity: land ? 0.55 : 0.06 + p * p * 0.45,
          transform: `rotateZ(${rzF}deg) scale(${land ? 1 : 1.5 - p * 0.5})`,
          filter: `blur(${land ? 5 : 16 - p * 11}px)`,
        }}
      />,
    );
    if (land && t - Ti < 0.6) {
      const e = easeOut((t - Ti) / 0.6);
      shadows.push(
        <div
          key={`r${i}`}
          style={{
            position: "absolute",
            left: x - 60 - e * 70,
            top: y - 34 - e * 40,
            width: 120 + e * 140,
            height: 68 + e * 80,
            borderRadius: "50%",
            border: `2px solid ${red(0.7 * (1 - e))}`,
          }}
        />,
      );
    }
  }

  const leak = 0.55 + noise1(t * 3, 5) * 0.12 + k * 0.15;
  const zeros = "0000".slice(String(landed).length);

  return (
    <AbsoluteFill style={{ perspective: 1150, perspectiveOrigin: "62% 16%" }}>
      <div
        style={{
          position: "absolute",
          left: 1255,
          top: 520,
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `translateZ(${dz}px) rotateX(${rx}deg) rotateZ(${rz}deg)`,
        }}
      >
        {/* floorboards */}
        <div
          style={{
            position: "absolute",
            left: -1500,
            top: -MAT_H / 2 - 80,
            width: 3000,
            height: 1800,
            background: `repeating-linear-gradient(90deg, ${bone(0.025)} 0 1px, transparent 1px 150px)`,
            maskImage:
              "radial-gradient(ellipse 45% 40% at 50% 25%, black, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 45% 40% at 50% 25%, black, transparent 80%)",
          }}
        />
        {/* threshold + light leaking under a closed door (it opens two shots from now) */}
        <div
          style={{
            position: "absolute",
            left: -900,
            top: -MAT_H / 2 - 92,
            width: 1800,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${bone(0.9 * leak)} 30%, ${bone(leak)} 50%, ${bone(0.9 * leak)} 70%, transparent)`,
            boxShadow: `0 0 30px ${bone(0.25 * leak)}`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -900,
            top: -MAT_H / 2 - 90,
            width: 1800,
            height: 200,
            background: `linear-gradient(${bone(0.07 * leak)}, transparent)`,
          }}
        />
        {/* the mat */}
        <div
          style={{
            position: "absolute",
            left: -MAT_W / 2,
            top: -MAT_H / 2,
            width: MAT_W,
            height: MAT_H,
            borderRadius: 14,
            background: `repeating-linear-gradient(90deg, ${bone(0.035)} 0 2px, transparent 2px 6px), repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 3px, transparent 3px 9px), #0f110f`,
            border: `2px solid ${bone(0.14)}`,
            boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 24,
              borderRadius: 8,
              border: `2px solid ${bone(0.07)}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: mono,
              fontWeight: 700,
              fontSize: 118,
              letterSpacing: "0.3em",
              paddingLeft: "0.3em",
              color: bone(0.065),
            }}
          >
            WELCOME
          </div>
          <div
            style={{
              position: "absolute",
              left: MAT_W / 2,
              top: MAT_H / 2,
              width: 0,
              height: 0,
            }}
          >
            {shadows}
          </div>
        </div>
        {chips}
      </div>

      {/* counter */}
      <div style={{ position: "absolute", left: 140, top: 150 }}>
        <div
          style={{
            fontFamily: mono,
            fontSize: 14,
            letterSpacing: "0.2em",
            color: C.dim,
          }}
        >
          <span style={{ color: C.bone }}>HF TOKENS</span> LEFT IN PUBLIC CODE
        </div>
        <div
          style={{
            fontFamily: display,
            fontSize: 150,
            lineHeight: 1,
            marginTop: 10,
            letterSpacing: "0.01em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span style={{ color: bone(0.14) }}>{landed ? zeros : "0000"}</span>
          <span style={{ color: C.bone }}>{landed ? landed : ""}</span>
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 13,
            letterSpacing: "0.2em",
            color: C.dim,
            marginTop: 12,
          }}
        >
          SCANNING GITHUB · HUGGING FACE{" "}
          <span style={{ color: C.bone }}>
            {"|/-\\"[Math.floor(t * 10) % 4]}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* --------------------------------------------------------------- count */

const Count: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const mont = b - a < 1.2;
  const L = lineAt("sixteen hundred eighty-one");
  const tEighty = wordAt(L, "eighty");
  const tDone = tEighty + 0.42;
  const tRed0 = tDone + 0.3,
    tRed1 = tRed0 + 0.7;
  const tOrgs = tRed1 + 0.12;
  const tMeta = tOrgs + 0.55;
  const k = kickAt(t);

  const n = mont
    ? TOTAL
    : Math.round(CHIPS + (TOTAL - CHIPS) * sineInOut(prog(t, a, tDone)));
  const redP = mont ? 1 : prog(t, tRed0, tRed1);
  const redN = Math.floor(redP * WRITE);
  // stats arrive with eased fades (no hard first-frame jump) and their counters ease to the value
  const orgs = mont
    ? ORGS
    : Math.round(ORGS * easeOut(prog(t, tOrgs + 0.05, tOrgs + 0.7)));
  const orgsO = mont ? 1 : easeInOut(prog(t, tOrgs - 0.05, tOrgs + 0.4));
  const metaO = mont ? 0 : easeInOut(prog(t, tMeta, tMeta + 0.4));
  const redO = mont ? 1 : easeInOut(prog(t, tRed0 - 0.08, tRed0 + 0.3));

  // keep the centre lyric legible: dim the rows under it while it is up
  const lyricEnd = L.end + 0.45;
  const bandOn = mont
    ? 0
    : 1 - easeInOut(prog(t, lyricEnd - 0.1, lyricEnd + 0.4));
  const montBand = mont ? 1 : 0;
  const dimRow = (r: number) => {
    const yc = GY + r * PITCH + CELL / 2;
    const inBand = clamp((yc - 405) / 40) * clamp((690 - yc) / 40);
    const inLow = clamp((yc - 760) / 30);
    return 1 - 0.78 * inBand * bandOn - 0.72 * inLow * montBand;
  };

  // slow push that comes back to 1.0 so the door shot can pick up the exact frame
  // montage: punch-in 1.08 -> 1 + lateral drift, and a red wave re-sweeps the write-access cells
  const sc = mont
    ? lerp(1.08, 1, easeOut(prog(t, a, b)))
    : 1 + 0.025 * Math.sin(Math.PI * prog(t, a, b));
  const tx = mont ? lerp(28, -24, prog(t, a, b)) : 0;
  // the bass shake strobes the 16 px cell lattice off-beat: hold most of it back (less in the chorus)
  const sh = useShake(1);
  const hold = mont ? 0.3 : 0.75;

  const metaR = Math.floor(META_CELL / NG),
    metaC = META_CELL % NG;
  const mx = GX + metaC * PITCH + CELL / 2,
    my = GY + metaR * PITCH + CELL / 2;

  return (
    <AbsoluteFill
      style={{
        background: BG,
        transform: `translate(${-sh.x * hold}px, ${-sh.y * hold}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translateX(${tx}px) scale(${sc})`,
          transformOrigin: "50% 50%",
        }}
      >
        <div style={{ position: "absolute", left: GX, top: GY }}>
          <Grid
            n={n}
            redP={redP}
            t={t}
            dimRow={dimRow}
            flash={mont ? [a - 0.05, a + 0.4] : [tRed0, tRed1]}
          />
          <div
            style={{
              position: "absolute",
              left: -1,
              top: -26,
              width: GSIZE,
              display: "flex",
              justifyContent: "space-between",
              fontFamily: mono,
              fontSize: 12,
              letterSpacing: "0.16em",
              color: C.faint,
            }}
          >
            <span>01</span>
            <span>41 × 41 = 1,681</span>
            <span>41</span>
          </div>
        </div>

        <Stats n={n} redN={redN} orgs={orgs} redO={redO} orgsO={orgsO} k={k} />

        {/* Meta callout, lower left, leader to one exposed token */}
        {metaO > 0 && (
          <>
            <svg
              width={1920}
              height={1080}
              style={{ position: "absolute", inset: 0, opacity: metaO }}
            >
              <rect
                x={mx - 13}
                y={my - 13}
                width={26}
                height={26}
                fill="none"
                stroke={C.bone}
                strokeWidth={1.5}
              />
              <polyline
                points={`${mx - 13},${my} ${lerp(mx - 13, 556, easeOut(metaO))},${my}`}
                fill="none"
                stroke={C.bone}
                strokeWidth={1.2}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                left: 130,
                top: my - 12,
                width: 412,
                textAlign: "right",
                opacity: metaO,
              }}
            >
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 17,
                  letterSpacing: "0.16em",
                  color: C.bone,
                }}
              >
                META · LLAMA 2
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  letterSpacing: "0.16em",
                  color: C.dim,
                  marginTop: 6,
                  lineHeight: 1.6,
                }}
              >
                AMONG THE EXPOSED
                <br />
                ALSO MICROSOFT · GOOGLE · VMWARE
              </div>
            </div>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- door */

const Door: React.FC<SceneProps> = ({ a, b }) => {
  const t = useTime();
  const L = lineAt("anyone could walk");
  const tCould = wordAt(L, "could");
  const tWalk = wordAt(L, "walk");
  const k = kickAt(t);

  // first beat: the count frame, exactly; then the grid recedes into a doorway
  const m = easeInOut(prog(t, a + 0.15, a + 0.95));
  const ds = lerp(1, 0.8, m);
  const DW = GSIZE * ds,
    DH = GSIZE * ds;
  const DX = (1920 - DW) / 2;
  const DY = lerp(GY, 128, m);
  const statsO = 1 - easeOut(prog(t, a + 0.1, a + 0.6));

  const crack = easeInOut(prog(t, tCould - 0.35, tWalk));
  const open = easeInOut(prog(t, tWalk, tWalk + 1.5));
  const theta = open * 78;
  const surge = easeInOut(prog(t, tWalk + 0.9, b + 0.1));
  const sc = 1 + 0.08 * prog(t, a + 0.9, b) + surge * 0.22;
  const light = clamp(crack * 0.5 + open * 0.8);
  const flick = 1 + noise1(t * 6, 2) * 0.04 + k * 0.05;
  const gapW = 2 + crack * 6;
  const sh = useShake(1);
  const hold = 0.6;

  const half = (side: 0 | 1) => (
    <div
      style={{
        position: "absolute",
        left: side ? DX + DW / 2 : DX,
        top: DY,
        width: DW / 2,
        height: DH,
        overflow: "hidden",
        transformOrigin: side ? "100% 50%" : "0% 50%",
        transform: `rotateY(${side ? -theta : theta}deg)`,
        background: "#090a09",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: side ? -DW / 2 : 0,
          top: 0,
          width: GSIZE,
          height: GSIZE,
          transform: `scale(${ds})`,
          transformOrigin: "0 0",
        }}
      >
        <Grid n={TOTAL} redP={1} t={t} dimRow={() => 1} sparkle={false} />
      </div>
      {/* the door face catches the light as it turns */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: side
            ? `linear-gradient(90deg, ${bone(0.24 * open)}, transparent 65%)`
            : `linear-gradient(270deg, ${bone(0.24 * open)}, transparent 65%)`,
        }}
      />
    </div>
  );

  // dust in the beam
  const motes = Array.from({ length: 34 }, (_, i) => {
    const s = hash(i * 4.4);
    const x = 960 + (hash(i * 2.2) - 0.5) * DW * 0.9 * (0.3 + open);
    const y =
      DY + 60 + ((hash(i * 7.1) * DH + (t - a) * (12 + s * 30)) % (DH + 60));
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: 2 + s * 3,
          height: 2 + s * 3,
          borderRadius: 4,
          background: bone(0.5 * open * (0.4 + s * 0.6)),
        }}
      />
    );
  });

  const spillW = DW * (0.06 + open * 0.94);
  const floorY = DY + DH;

  return (
    <AbsoluteFill
      style={{
        background: BG,
        transform: `translate(${-sh.x * hold}px, ${-sh.y * hold}px)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${sc})`,
          transformOrigin: `960px ${DY + DH * 0.7}px`,
          perspective: 1400,
          perspectiveOrigin: `960px ${DY + DH / 2}px`,
        }}
      >
        {/* floor spill toward the camera, short and soft so the lyric zone stays dark */}
        <svg
          width={1920}
          height={1080}
          style={{ position: "absolute", inset: 0, opacity: light * flick }}
        >
          <defs>
            <linearGradient id="spill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e9e6df" stopOpacity={0.2} />
              <stop offset="0.5" stopColor="#e9e6df" stopOpacity={0.05} />
              <stop offset="1" stopColor="#e9e6df" stopOpacity={0} />
            </linearGradient>
            <radialGradient id="room" cx="0.5" cy="0.45" r="0.65">
              <stop offset="0" stopColor="#fbfaf6" />
              <stop offset="0.65" stopColor="#e6e3dc" />
              <stop offset="1" stopColor="#b9b5ac" />
            </radialGradient>
            <linearGradient id="roomFloor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d9d5cd" />
              <stop offset="1" stopColor="#c4c0b6" />
            </linearGradient>
          </defs>
          <polygon
            points={`${960 - spillW / 2},${floorY} ${960 + spillW / 2},${floorY} ${960 + spillW * 1.05},${floorY + 170} ${960 - spillW * 1.05},${floorY + 170}`}
            fill="url(#spill)"
          />
        </svg>
        {/* the lit room beyond: a pale field with a floor and a vanishing point */}
        <div
          style={{
            position: "absolute",
            left: DX,
            top: DY,
            width: DW,
            height: DH,
            opacity: clamp(crack * 2) * flick,
            boxShadow: `0 0 ${60 + open * 140}px ${bone(0.22 + open * 0.22)}`,
          }}
        >
          <svg
            width={DW}
            height={DH}
            style={{ position: "absolute", inset: 0 }}
          >
            <rect width={DW} height={DH} fill="url(#room)" />
            <polygon
              points={`0,${DH} ${DW},${DH} ${DW * 0.62},${DH * 0.64} ${DW * 0.38},${DH * 0.64}`}
              fill="url(#roomFloor)"
              opacity={0.55}
            />
            <line
              x1={DW * 0.38}
              y1={DH * 0.64}
              x2={DW * 0.62}
              y2={DH * 0.64}
              stroke="#a9a59c"
              strokeWidth={1}
              opacity={0.6}
            />
          </svg>
        </div>
        {/* doors */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformStyle: "preserve-3d",
          }}
        >
          {half(0)}
          {half(1)}
        </div>
        {/* seam light before it opens */}
        <div
          style={{
            position: "absolute",
            left: 960 - gapW / 2,
            top: DY,
            width: gapW,
            height: DH,
            background: "#fbfaf6",
            opacity: crack * (1 - open) * flick,
            boxShadow: `0 0 ${20 + crack * 40}px ${bone(0.6 * crack)}`,
          }}
        />
        {/* frame + threshold */}
        <div
          style={{
            position: "absolute",
            left: DX - 10,
            top: DY - 10,
            width: DW + 20,
            height: DH + 10,
            border: `2px solid ${bone((0.16 + light * 0.2) * m)}`,
            borderBottom: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: DX - 220,
            top: floorY,
            width: DW + 440,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${bone((0.25 + light * 0.4) * m)}, transparent)`,
          }}
        />
        {motes}
      </div>

      {/* the count's numbers, carried over for the first beat */}
      {statsO > 0.01 && (
        <Stats
          n={TOTAL}
          redN={WRITE}
          orgs={ORGS}
          redO={1}
          orgsO={1}
          k={k}
          o={statsO}
        />
      )}

      <div
        style={{
          position: "absolute",
          right: 130,
          top: 150,
          textAlign: "right",
          fontFamily: mono,
          fontSize: 14,
          letterSpacing: "0.18em",
          color: C.dim,
          lineHeight: 1.9,
          opacity: (1 - statsO) * (1 - surge),
        }}
      >
        <div>
          <span style={{ color: C.bone }}>1,681</span> KEYS
        </div>
        <div>
          <span style={{ color: C.red }}>655</span> COULD WRITE
        </div>
        <div>
          <span style={{ color: C.bone }}>723</span> ORGS
        </div>
      </div>
    </AbsoluteFill>
  );
};
