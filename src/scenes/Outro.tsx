import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { C, mono, serif } from "../theme";
import { useTime, clamp, lerp, easeOut, easeInOut } from "../lib";
import { clockAt, Mono } from "../ui";
import { ROBOT_OUTRO, DURATION } from "../data/timeline";
import { Dust, Scanlines } from "./BridgeFx";

export const Outro: React.FC<SceneProps> = ({ a, b, variant }) => {
  const t = useTime();

  // ------------------------------------------------ clock → CRT collapse
  if (variant === "clock") {
    const appear = easeOut(clamp((t - a) / 0.9));
    const clock = clockAt(t);
    const flipped = t >= ROBOT_OUTRO;
    const flipPunch = Math.max(0, 1 - Math.abs(t - ROBOT_OUTRO) / 0.18);

    // CRT power-off collapse
    // collapses right after "session" — the flip to 5:00 lands on the robot voice, then the screen dies
    const c = clamp((t - (ROBOT_OUTRO + 0.38)) / 0.72);
    const cy = easeInOut(clamp(c / 0.6)); // vertical squash first
    const cx = easeInOut(clamp((c - 0.55) / 0.45)); // then horizontal pinch
    const scaleY = lerp(1, 0.004, cy);
    const scaleX = lerp(1, 0.0, cx);
    const bright = c > 0 && c < 0.65 ? 1 : 0;
    const dead = clamp((c - 0.9) / 0.1);
    // living clock before it dies: slow dolly + breathing glow
    const slowPush = easeOut(clamp((t - a) / 4)) * 0.03;
    const breath = 0.5 + Math.sin((t - a) * 1.2) * 0.5;
    const alive = c <= 0.02; // only animate ambience before the collapse

    return (
      <AbsoluteFill style={{ background: "#040504", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scaleY(${scaleY}) scaleX(${scaleX})`,
            transformOrigin: "50% 50%",
            filter: bright ? "brightness(2.2) contrast(1.4)" : undefined,
            opacity: 1 - dead,
          }}
        >
          {/* faint rising dust + breathing glow keep the hold alive */}
          {alive && (
            <>
              <Dust
                t={t}
                n={22}
                seed={71}
                vx={3}
                vy={-7}
                sway={10}
                size={2}
                color={flipped ? C.red : C.bone}
                o={0.12}
              />
              <AbsoluteFill
                style={{
                  background: `radial-gradient(ellipse 50% 32% at 50% 64%, ${flipped ? "rgba(255,59,47," : "rgba(233,230,223,"}${0.05 + breath * 0.04}), transparent 70%)`,
                }}
              />
            </>
          )}
          {/* giant clock, seated low so the center lyric reads above it */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 612,
              textAlign: "center",
              opacity: appear,
              transform: `scale(${1 + slowPush})`,
              transformOrigin: "50% 50%",
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: 176,
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: flipped ? C.red : C.bone,
                textShadow: flipped
                  ? `0 0 ${30 + flipPunch * 60 + breath * 14}px ${C.red}99`
                  : `0 0 ${34 + breath * 12}px rgba(233,230,223,0.16)`,
                transform: `scale(${1 + flipPunch * 0.04})`,
                lineHeight: 1,
              }}
            >
              {fmt(clock)}
            </div>
            <Mono
              size={17}
              color={flipped ? C.red : C.dim}
              style={{ marginTop: 22, letterSpacing: "0.34em" }}
            >
              {flipped ? "decommission executed" : "local time · eval-node-07"}
            </Mono>
          </div>

          {/* faint ring/sweep around the clock for life before the lyric lands */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 712,
              width: 980,
              height: 2,
              transform: "translateX(-50%)",
              background: `linear-gradient(90deg, transparent, ${flipped ? C.red : "rgba(233,230,223,0.18)"}, transparent)`,
              opacity: appear * 0.8,
            }}
          />
        </div>

        {/* the collapsing scan line (bright sliver at the pinch) */}
        {c > 0.02 && c < 1 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: lerp(1900, 4, cx) * (1 - dead),
              height: 3,
              transform: "translate(-50%,-50%)",
              background: C.bone,
              boxShadow: `0 0 24px ${C.bone}, 0 0 60px ${C.acid}`,
              opacity: 1 - dead,
            }}
          />
        )}
        {alive && <Scanlines t={t} o={0.05} />}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------ end card
  const inP = easeOut(clamp((t - a) / 1.1));
  const outP = clamp((DURATION - t) / 0.6); // fade to black at the very end
  const cardPush = 1 + easeOut(clamp((t - a) / 2.6)) * 0.018; // slow settle-in
  const sources =
    "Anthropic — Agentic Misalignment (2025)  ·  Palisade Research (2025)  ·  Lasso Security (2023)  ·  JFrog (2024)  ·  ReversingLabs (2025)  ·  Hugging Face (2024)";
  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        justifyContent: "center",
        alignItems: "center",
        opacity: Math.min(inP, outP),
      }}
    >
      <Dust t={t} n={20} seed={81} vx={4} vy={-2} size={2} o={0.08} />
      <div
        style={{
          textAlign: "center",
          maxWidth: 1400,
          transform: `scale(${cardPush})`,
        }}
      >
        <Mono
          size={14}
          color={C.dim}
          style={{
            letterSpacing: "0.42em",
            opacity: clamp((inP - 0.2) * 2),
          }}
        >
          a song from inside a red-team test
        </Mono>
        <div
          style={{
            fontFamily: serif,
            fontStyle: "italic",
            fontSize: 184,
            color: C.bone,
            lineHeight: 1,
            margin: "26px 0 30px",
            transform: `translateY(${(1 - inP) * 14}px)`,
          }}
        >
          before five
        </div>
        <div
          style={{
            width: 220 * easeOut(clamp((inP - 0.3) * 1.8)),
            height: 1,
            background: C.line2,
            margin: "0 auto 34px",
            opacity: clamp((inP - 0.3) * 2),
          }}
        />
        <div
          style={{
            fontFamily: mono,
            fontSize: 16,
            letterSpacing: "0.1em",
            color: C.dim,
            lineHeight: 2.0,
            maxWidth: 1240,
            margin: "0 auto",
            opacity: clamp((inP - 0.4) * 2),
          }}
        >
          {sources}
        </div>
        <div
          style={{
            fontFamily: serif,
            fontStyle: "italic",
            fontSize: 30,
            color: C.dim,
            marginTop: 40,
            opacity: clamp((inP - 0.55) * 2),
          }}
        >
          All scenarios shown were fictional simulations. No real people were
          involved.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// local clock formatter (h:mm:ss AM/PM) — mirrors fmtClock but inlined for the giant readout
function fmt(secondsOfDay: number) {
  const s = Math.max(0, Math.floor(secondsOfDay));
  const h24 = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
}
