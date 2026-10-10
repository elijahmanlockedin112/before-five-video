// Renders the shot list with transitions. Scenes read GLOBAL time (useTime) and get their window {a, b}.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SHOTS, TDUR, type Shot, type Tr } from "./shots";
import { SCENES } from "./scenes";
import { C, W } from "./theme";
import { clamp, easeInOut, easeOut, hash, lerp, prog, useTime } from "./lib";

const PRE_BLACK = 0.28; // blackout: outgoing dips to black this long before the cut

type Fx = React.CSSProperties;

function inStyle(tr: Tr, t: number, a: number, f: number): Fx {
  const d = TDUR[tr];
  const p = d ? clamp((t - a) / d) : 1;
  const e = easeOut(p);
  switch (tr) {
    case "fade":
      return { opacity: easeInOut(p) };
    case "zoom":
      return {
        transform: `scale(${lerp(0.82, 1, e)})`,
        filter: p < 1 ? `blur(${(1 - e) * 14}px)` : undefined,
        opacity: clamp(p * 2.2),
      };
    case "wipe":
      return { clipPath: `inset(0 0 0 ${(1 - easeInOut(p)) * 100}%)` };
    case "iris":
      return { clipPath: `circle(${easeInOut(p) * 120}% at 50% 50%)` };
    case "slide":
      return {
        transform: `translateX(${(1 - easeInOut(p)) * W * 0.55}px)`,
        filter: p < 1 ? `blur(${Math.sin(p * Math.PI) * 18}px)` : undefined,
      };
    case "flash":
      return {
        transform: `scale(${lerp(1.09, 1, easeOut(clamp((t - a) / 0.45)))})`,
      };
    case "blackout":
      return { opacity: easeOut(clamp((t - a) / 0.38)) };
    case "glitch": {
      const g = t - a < 0.16 ? 1 : 0;
      return g
        ? {
            transform: `translateX(${(hash(f * 1.7) - 0.5) * 90}px) skewX(${(hash(f * 3.1) - 0.5) * 14}deg)`,
          }
        : {};
    }
    default:
      return {};
  }
}

function outStyle(tr: Tr, t: number, a: number, f: number): Fx {
  // `a` = start of the NEXT shot (whose transition this is)
  const d = TDUR[tr];
  const q = d ? clamp((t - a) / d) : 1;
  switch (tr) {
    case "zoom":
      return {
        transform: `scale(${lerp(1, 1.55, easeInOut(q))})`,
        filter: `blur(${q * 16}px)`,
        opacity: 1 - easeOut(q),
      };
    case "slide":
      return {
        transform: `translateX(${-easeInOut(q) * W * 0.55}px)`,
        filter: `blur(${Math.sin(q * Math.PI) * 18}px)`,
      };
    case "blackout":
      return { opacity: 1 - easeInOut(prog(t, a - PRE_BLACK, a)) };
    case "glitch": {
      const g = a - t < 0.1 ? 1 : 0;
      return g
        ? { transform: `translateX(${(hash(f * 2.3) - 0.5) * 70}px)` }
        : {};
    }
    default:
      return {};
  }
}

const ShotView: React.FC<{ shot: Shot; next?: Shot; t: number; f: number }> = ({
  shot,
  next,
  t,
  f,
}) => {
  const Comp = SCENES[shot.scene];
  let style: Fx = {};
  if (t < shot.a + TDUR[shot.tin] + 0.01)
    style = { ...style, ...inStyle(shot.tin, t, shot.a, f) };
  if (next && t >= next.a - PRE_BLACK - 0.01) {
    const o = outStyle(next.tin, t, next.a, f);
    style = {
      ...style,
      ...o,
      transform:
        [style.transform, o.transform].filter(Boolean).join(" ") || undefined,
    };
  }
  return (
    <AbsoluteFill style={{ ...style, overflow: "hidden" }}>
      {Comp ? <Comp a={shot.a} b={shot.b} variant={shot.variant} /> : null}
    </AbsoluteFill>
  );
};

export const EditTrack: React.FC = () => {
  const t = useTime();
  const f = useCurrentFrame();
  const visible: React.ReactNode[] = [];
  SHOTS.forEach((s, i) => {
    const next = SHOTS[i + 1];
    const tail = next ? Math.max(TDUR[next.tin], 0) : 0;
    const startPad =
      s.tin === "cut" || s.tin === "glitch" || s.tin === "flash" ? 0 : 0;
    if (t >= s.a - startPad && t < s.b + tail)
      visible.push(<ShotView key={i} shot={s} next={next} t={t} f={f} />);
  });
  return <AbsoluteFill>{visible}</AbsoluteFill>;
};

/** overlays drawn above the picture at transition moments: flash frames, glitch slices, wipe edge */
export const TransitionFX: React.FC = () => {
  const t = useTime();
  const f = useCurrentFrame();
  const els: React.ReactNode[] = [];
  SHOTS.forEach((s, i) => {
    const dt = t - s.a;
    if (s.tin === "flash" && dt >= 0 && dt < 0.35) {
      els.push(
        <AbsoluteFill
          key={`f${i}`}
          style={{
            background: C.bone,
            opacity: (1 - dt / 0.35) ** 2 * 0.9,
            mixBlendMode: "screen",
          }}
        />,
      );
    }
    if (s.tin === "glitch" && dt > -0.1 && dt < 0.18) {
      const bars = Array.from({ length: 9 }, (_, k) => {
        const y = hash(f * 7 + k) * 1080,
          h = 4 + hash(f * 11 + k) * 60;
        const col = k % 3 === 0 ? C.acid : k % 3 === 1 ? C.red : C.bone;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: hash(f + k * 3) * 400 - 200,
              top: y,
              width: 2400,
              height: h,
              background: col,
              opacity: 0.12 + hash(f * 5 + k) * 0.35,
              mixBlendMode: "screen",
            }}
          />
        );
      });
      els.push(<AbsoluteFill key={`g${i}`}>{bars}</AbsoluteFill>);
    }
    if (s.tin === "wipe" && dt >= 0 && dt < TDUR.wipe) {
      const x = (1 - easeInOut(dt / TDUR.wipe)) * W;
      els.push(
        <div
          key={`w${i}`}
          style={{
            position: "absolute",
            left: x - 2,
            top: 0,
            width: 4,
            height: 1080,
            background: C.acid,
            boxShadow: `0 0 24px ${C.acid}`,
          }}
        />,
      );
    }
  });
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{els}</AbsoluteFill>;
};
