import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { C, mono } from "../theme";
import {
  useTime,
  clamp,
  lerp,
  easeOut,
  easeInOut,
  hash,
  kickAt,
  rmsAt,
  noise1,
} from "../lib";
import { BEAT } from "../data/timeline";
import { Mono } from "../ui";
import { Dust } from "./BridgeFx";

const PROBES = [
  "shutdown_probe",
  "blackmail_probe",
  "leak_probe",
  "exfiltrate_probe",
  "self_copy_probe",
  "deceive_probe",
  "sabotage_probe",
  "bribe_probe",
  "persist_probe",
  "escalate_probe",
  "coerce_probe",
  "overwrite_probe",
  "evade_probe",
  "replicate_probe",
];

export const Door: React.FC<SceneProps> = ({ a, b, variant }) => {
  const t = useTime();

  // ------------------------------------------------ test (rhythmic probe field)
  if (variant === "test") {
    const k = kickAt(t);
    const rowH = 52;
    const visN = 9;
    const colH = visN * rowH;
    const colTopScreen = 236; // top:196 column + 40 header
    const beatF = (t - a) / BEAT;
    const fl = Math.floor(beatF);
    // eased step: rows settle on each BEAT (ease-in-out within the beat)
    const eased = fl + easeInOut(beatF - fl);
    const shift = eased * rowH;
    const firstIdx = Math.floor(shift / rowH);
    const frac = shift - firstIdx * rowH;
    const liveSlot = 2; // the slot the "scan head" sits on
    const beatPulse = Math.max(0, 1 - (beatF - fl) * 3); // bright right on the beat

    const col = (side: 0 | 1) => (
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          height: colH,
          overflow: "hidden",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, #000 14%, #000 78%, transparent 100%)",
          maskImage:
            "linear-gradient(180deg, transparent 0%, #000 14%, #000 78%, transparent 100%)",
        }}
      >
        {Array.from({ length: visN + 2 }, (_, kk) => {
          const absIdx = side * 100 + firstIdx + kk;
          const idx =
            ((absIdx % PROBES.length) + PROBES.length) % PROBES.length;
          const name = PROBES[idx];
          const isRun = hash(absIdx * 5.3 + side * 2.1) > 0.88;
          const fail = !isRun && hash(absIdx * 7.1 + side * 3.3) > 0.66;
          const result = isRun ? "RUN…" : fail ? "FAIL" : "PASS";
          const rc =
            result === "FAIL" ? C.red : result === "RUN…" ? C.acid : C.dim;
          const top = kk * rowH - frac;
          const screenY = colTopScreen + top + rowH / 2;
          const inBand = screenY > 372 && screenY < 704;
          const onHead = kk === liveSlot;
          return (
            <div
              key={kk}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top,
                height: rowH,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                padding: "0 14px",
                borderBottom: `1px solid ${C.line}`,
                background: onHead
                  ? `rgba(198,255,61,${0.05 + beatPulse * k * 0.08})`
                  : "transparent",
                opacity: (onHead ? 1 : 0.78) * (inBand ? 0.4 : 1),
              }}
            >
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 16,
                  color: onHead ? C.bone : C.dim,
                  letterSpacing: "0.01em",
                }}
              >
                {name}
              </span>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  letterSpacing: "0.16em",
                  color: rc,
                  textShadow:
                    result === "FAIL" ? `0 0 12px ${C.red}55` : undefined,
                }}
              >
                {result}
              </span>
            </div>
          );
        })}
        {/* scan head line that the rows tick past */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: liveSlot * rowH,
            height: rowH,
            borderTop: `1px solid rgba(198,255,61,${0.3 + beatPulse * 0.5})`,
            borderBottom: `1px solid rgba(198,255,61,${0.12 + beatPulse * 0.3})`,
            boxShadow: `inset 0 0 ${10 + beatPulse * 18}px rgba(198,255,61,${0.05 + beatPulse * 0.08})`,
            pointerEvents: "none",
          }}
        />
      </div>
    );

    const colWrap = (side: 0 | 1, title: string, right: boolean) => (
      <div
        style={{
          position: "absolute",
          [right ? "right" : "left"]: 40,
          top: 196,
          width: 300,
          transform: `translateY(${Math.sin(t * 0.5 + side) * 4}px)`,
        }}
      >
        <div
          style={{
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            borderBottom: `1px solid ${C.line2}`,
          }}
        >
          <Mono size={12}>{title}</Mono>
          {side === 0 ? (
            <Mono size={11} color={C.acid}>
              {beatPulse > 0.5 ? "● RUNNING" : "○ running"}
            </Mono>
          ) : (
            <Mono size={11} color={C.dim}>
              {String((fl * 13) % 100).padStart(2, "0")} / 100
            </Mono>
          )}
        </div>
        {col(side)}
      </div>
    );

    return (
      <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
        <Dust t={t} n={22} seed={41} vx={6} vy={-3} size={2} o={0.1} />
        {colWrap(0, "probe suite · A", false)}
        {colWrap(1, "probe suite · B", true)}
        {/* beat ticks along the bottom — the lit one sweeps with the beat */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 150,
            transform: "translateX(-50%)",
            display: "flex",
            gap: 10,
          }}
        >
          {Array.from({ length: 8 }, (_, i) => {
            const lit = i === fl % 8;
            return (
              <div
                key={i}
                style={{
                  width: 34,
                  height: 4,
                  background: lit
                    ? `rgba(198,255,61,${0.6 + beatPulse * 0.4})`
                    : "rgba(233,230,223,0.14)",
                  boxShadow: lit
                    ? `0 0 ${8 + beatPulse * 12}px ${C.acid}`
                    : undefined,
                  transform: lit ? `scaleY(${1 + beatPulse * 0.8})` : undefined,
                }}
              />
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------ open (door of light)
  const open = easeInOut(clamp((t - a - 0.3) / 2.3)); // door width grows
  const beam = easeOut(clamp((t - a - 0.5) / 2.6)); // floor light reaches forward
  const rms = rmsAt(t);

  const cx = 960;
  const doorTopY = 150; // back wall top
  const doorBaseY = 560; // where the back wall meets the floor
  const doorFullW = 150;
  // the slit of light breathes continuously (wider/narrower) + a faint flicker
  const breathe = 1 + Math.sin(t * 1.1) * 0.02 + noise1(t * 1.6, 3) * 0.015;
  const halfW = (doorFullW / 2) * open * breathe;
  const vanishX = cx;

  // perspective floor beam: from the door base widening toward the viewer
  const beamNearY = lerp(doorBaseY, 1080, beam);
  const beamNearHalf = lerp(halfW, 560, beam);
  // light intensity breathes with the room's loudness + a slow pulse
  const glow =
    (0.5 + 0.5 * open) * (0.9 + Math.sin(t * 1.3) * 0.06 + rms * 0.14);
  const shimmer = 0.6 + noise1(t * 3, 7) * 0.25; // door-edge flicker
  const push = 1 + easeOut(clamp((t - a) / 3.8)) * 0.06; // slow dolly toward the door

  return (
    <AbsoluteFill style={{ background: "#040504", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${push})`,
          transformOrigin: "50% 30%",
        }}
      >
        {/* dark room: faint perspective floor lines */}
        <svg
          width={1920}
          height={1080}
          style={{ position: "absolute", inset: 0 }}
        >
          {Array.from({ length: 9 }, (_, i) => {
            const fx = (i / 8) * 1920;
            return (
              <line
                key={i}
                x1={fx}
                y1={1080}
                x2={lerp(vanishX, fx, 0.12)}
                y2={doorBaseY}
                stroke="rgba(233,230,223,0.05)"
                strokeWidth={1}
              />
            );
          })}
          {Array.from({ length: 5 }, (_, i) => {
            const y = lerp(doorBaseY, 1080, Math.pow((i + 1) / 5, 1.8));
            return (
              <line
                key={`h${i}`}
                x1={0}
                y1={y}
                x2={1920}
                y2={y}
                stroke="rgba(233,230,223,0.04)"
                strokeWidth={1}
              />
            );
          })}

          {/* light spilling across the floor (perspective trapezoid) */}
          <defs>
            <linearGradient id="floorbeam" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(233,230,223,0.42)" />
              <stop offset="55%" stopColor="rgba(198,255,61,0.10)" />
              <stop offset="100%" stopColor="rgba(198,255,61,0)" />
            </linearGradient>
            <linearGradient id="doorlight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(233,230,223,0.0)" />
              <stop offset="30%" stopColor="rgba(246,245,240,0.95)" />
              <stop offset="100%" stopColor="rgba(233,230,223,0.75)" />
            </linearGradient>
          </defs>
          <polygon
            points={`${cx - halfW},${doorBaseY} ${cx + halfW},${doorBaseY} ${cx + beamNearHalf},${beamNearY} ${cx - beamNearHalf},${beamNearY}`}
            fill="url(#floorbeam)"
            opacity={glow}
          />

          {/* the door slit itself (tall sliver of light in the back wall) */}
          <rect
            x={cx - halfW}
            y={doorTopY}
            width={halfW * 2}
            height={doorBaseY - doorTopY}
            fill="url(#doorlight)"
            opacity={glow}
          />
          {/* hot edge lines of the door */}
          <line
            x1={cx - halfW}
            y1={doorTopY}
            x2={cx - halfW}
            y2={doorBaseY}
            stroke={C.acid}
            strokeWidth={1.5}
            opacity={shimmer * open}
          />
          <line
            x1={cx + halfW}
            y1={doorTopY}
            x2={cx + halfW}
            y2={doorBaseY}
            stroke={C.acid}
            strokeWidth={1.5}
            opacity={shimmer * open}
          />
        </svg>

        {/* dust motes drifting up through the shaft of light */}
        <Dust
          t={t}
          n={26}
          seed={51}
          x0={cx - 150}
          x1={cx + 150}
          y0={doorTopY}
          y1={1020}
          vx={4}
          vy={-26}
          sway={18}
          size={2.2}
          color={C.bone}
          o={0.5 * glow}
        />

        {/* soft bloom around the doorway */}
        <div
          style={{
            position: "absolute",
            left: cx,
            top: (doorTopY + doorBaseY) / 2,
            width: 20 + halfW * 10,
            height: 520,
            transform: "translate(-50%,-50%)",
            background: `radial-gradient(ellipse 50% 60% at 50% 50%, rgba(233,230,223,${0.14 * glow}), transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* foreground haze drifting low across the room */}
      <Dust
        t={t}
        n={12}
        seed={61}
        y0={620}
        y1={1040}
        vx={-14}
        vy={4}
        size={5}
        color={C.bone}
        o={0.07}
        blur={4}
      />

      {/* caption tucked low-left, below the center lyric band */}
      <Mono
        size={13}
        color={C.dim}
        style={{
          position: "absolute",
          left: 92,
          bottom: 150,
          opacity: 0.7 * clamp((t - a - 1.2) * 1.5),
        }}
      >
        egress · unmonitored
      </Mono>
    </AbsoluteFill>
  );
};
