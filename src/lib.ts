import { useCurrentFrame, interpolate, Easing } from "remotion";
import { FPS } from "./theme";
import { ENV } from "./data/timeline";

export const useTime = () => useCurrentFrame() / FPS;
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
/** 0..1 progress of t through [a, b] */
export const prog = (t: number, a: number, b: number) =>
  clamp((t - a) / Math.max(1e-6, b - a));
/** fade window: in over `fi` seconds after a, out over `fo` before b */
export const win = (t: number, a: number, b: number, fi = 0.3, fo = 0.3) =>
  Math.min(easeOut((t - a) / fi), easeOut((b - t) / fo));
export const spring1 = (t: number, a: number, dur = 0.5) =>
  interpolate(t, [a, a + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.6)),
  });

const at = (arr: number[], t: number) => {
  const i = Math.round(t * ENV.fps);
  return arr[Math.max(0, Math.min(arr.length - 1, i))] ?? 0;
};
export const kickAt = (t: number) => at(ENV.kick, t);
export const rmsAt = (t: number) => at(ENV.rms, t);
export const midAt = (t: number) => at(ENV.mid, t);

/** deterministic hash noise */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const noise1 = (t: number, seed = 0) => {
  const i = Math.floor(t),
    f = t - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 101), hash(i + 1 + seed * 101), u) * 2 - 1;
};

/** typed text: characters revealed linearly between a and b */
export const typed = (text: string, t: number, a: number, b: number) =>
  text.slice(0, Math.floor(prog(t, a, b) * text.length + 1e-6));

export const fmtClock = (secondsOfDay: number) => {
  const s = Math.max(0, Math.floor(secondsOfDay));
  const h24 = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
};
