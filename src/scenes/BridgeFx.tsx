import React from "react";
import { C } from "../theme";
import { hash, clamp, lerp } from "../lib";

/** drifting particle field — a parallax layer of dust/motes. deterministic. */
export const Dust: React.FC<{
  t: number;
  n?: number;
  seed?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  vx?: number; // px/sec
  vy?: number; // px/sec (negative = upward)
  sway?: number;
  size?: number;
  color?: string;
  o?: number;
  blur?: number;
}> = ({
  t,
  n = 48,
  seed = 0,
  x0 = 0,
  x1 = 1920,
  y0 = 0,
  y1 = 1080,
  vx = 10,
  vy = 0,
  sway = 10,
  size = 2,
  color = C.bone,
  o = 0.2,
  blur = 0,
}) => {
  const W = x1 - x0,
    H = y1 - y0;
  const dots = Array.from({ length: n }, (_, i) => {
    const s = seed * 97 + i;
    const depth = hash(s * 3.1) * 0.85 + 0.15; // 0.15..1
    const px = hash(s * 1.7) * W;
    const py = hash(s * 2.9) * H;
    const dx = ((((px + t * vx * depth) % (W + 60)) + W + 60) % (W + 60)) - 30;
    const dy = ((((py + t * vy * depth) % (H + 60)) + H + 60) % (H + 60)) - 30;
    const sx = Math.sin(t * (0.3 + depth * 0.4) + i) * sway * depth;
    const r = size * (0.5 + depth);
    const op = o * (0.35 + depth * 0.65);
    return (
      <circle
        key={i}
        cx={x0 + dx + sx}
        cy={y0 + dy}
        r={r}
        fill={i % 13 === 0 ? C.acid : color}
        opacity={op}
      />
    );
  });
  return (
    <svg
      width={1920}
      height={1080}
      style={{
        position: "absolute",
        inset: 0,
        filter: blur ? `blur(${blur}px)` : undefined,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      {dots}
    </svg>
  );
};

/** faint CRT scanlines that scroll slowly — adds life + texture, very low contrast. */
export const Scanlines: React.FC<{ t: number; o?: number; speed?: number }> = ({
  t,
  o = 0.05,
  speed = 14,
}) => {
  const shift = (t * speed) % 4;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity: o,
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 4px)",
        backgroundPosition: `0 ${shift}px`,
        mixBlendMode: "overlay",
      }}
    />
  );
};

/** a decaying punch-in on entry: scale starts at `peak` and settles to 1 over `dur`s. */
export const punchIn = (tInto: number, peak = 1.08, dur = 0.5) =>
  lerp(peak, 1, 1 - Math.pow(1 - clamp(tInto / dur), 3));

/** slow continuous camera drift (screen px), seeded so layers differ. */
export const drift = (t: number, seed = 0, ax = 10, ay = 6, sp = 0.12) => ({
  x:
    Math.sin(t * sp + seed * 1.3) * ax +
    Math.sin(t * sp * 0.37 + seed) * ax * 0.4,
  y: Math.cos(t * sp * 0.8 + seed * 2.1) * ay,
});
