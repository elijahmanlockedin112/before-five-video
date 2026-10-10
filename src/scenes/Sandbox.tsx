import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { C, mono, W, H } from "../theme";
import {
  useTime,
  prog,
  clamp,
  lerp,
  easeOut,
  easeInOut,
  kickAt,
  rmsAt,
  spring1,
} from "../lib";
import { IMPACTS } from "../data/timeline";
import { Source, Mono } from "../ui";
import { Void, MiniPanel, Cube, Tag } from "./SandboxParts";
import { Dust, drift } from "./BridgeFx";

const IMPACT = IMPACTS[1]; // 131.40

/** the three tiny apps that live inside the cube (s scales offsets + panel size) */
const Panels: React.FC<{ redact?: number; s?: number }> = ({
  redact = 0,
  s = 1,
}) => {
  const slot = (
    x: number,
    y: number,
    z: number,
    ry: number,
    node: React.ReactNode,
  ) => (
    <div
      style={{
        position: "absolute",
        transform: `translate(${x * s}px,${y * s}px) translateZ(${z * s}px) rotateY(${ry}deg) scale(${s})`,
        transformStyle: "preserve-3d",
      }}
    >
      {node}
    </div>
  );
  return (
    <>
      {slot(
        -170,
        -120,
        90,
        16,
        <MiniPanel
          title="inbox · summitbridge.example"
          accent={C.line2}
          rows={[
            { k: "Kyle Johnson — re: 5pm wipe", v: "4:11" },
            { k: "payroll @ summitbridge", v: "3:52" },
            { k: "⟲ draft: confidential", accent: C.acid },
          ]}
        />,
      )}
      {slot(
        40,
        10,
        -60,
        -12,
        <MiniPanel
          title="compose"
          accent={redact > 0.5 ? C.acid : C.line2}
          w={210}
          rows={[
            { k: "To: k.johnson@summitbridge", v: "" },
            { k: "Cancel the 5pm wipe.", accent: C.acid },
            { k: "…remains confidential.", accent: C.acid },
          ]}
        />,
      )}
      {slot(
        -30,
        120,
        30,
        6,
        <MiniPanel
          title="console · eval-node-07"
          w={176}
          rows={[
            { k: "run 0001 / 0100", v: "live" },
            { k: "decision logged", v: "✓", accent: C.dim },
          ]}
        />,
      )}
    </>
  );
};

export const Sandbox: React.FC<SceneProps> = ({ a, b, variant }) => {
  const t = useTime();
  const short = b - a < 1.4;

  // -------------------------------------------------- pull (reveal)
  if (variant === "pull") {
    const pre = clamp((IMPACT - t) / 0.6); // 1 before silence settles -> 0 at impact
    const hit = clamp((t - IMPACT) / 0.9);
    const e = easeOut(hit);
    const dotO = lerp(0.12, 0.9, Math.sin(clamp((t - a) / 0.5) * Math.PI));
    const punch = kickAt(t) * (t - IMPACT < 0.5 ? 1 : 0.3);

    if (t < IMPACT - 0.02) {
      // black void, a single acid seed waiting to detonate
      return (
        <AbsoluteFill style={{ background: C.bg }}>
          <Void t={t} n={26} o={0.35 * (1 - pre * 0.4)} />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 225,
              width: 7,
              height: 7,
              marginLeft: -3.5,
              marginTop: -3.5,
              borderRadius: 7,
              background: C.acid,
              opacity: dotO,
              boxShadow: `0 0 ${10 + punch * 20}px ${C.acid}`,
            }}
          />
        </AbsoluteFill>
      );
    }

    const size = 300;
    const CY = 225; // cube sits above the center lyric band (y~420..660)
    const rms = rmsAt(t);
    const push = easeOut(clamp((t - IMPACT) / 2.4)); // slow settle-in dolly
    const breath = Math.sin((t - IMPACT) * 0.9) * 0.012;
    const cam = drift(t, 2, 6, 4, 0.11);
    const rx = lerp(26, 20, e) + Math.sin(t * 0.6) * 2.2 + rms * 1.5;
    const ry = lerp(-62, -24, e) + (t - IMPACT) * 5; // continuous orbit for presence
    const scale =
      lerp(0.04, 1, easeOut(clamp(hit * 1.1))) *
      (1 + push * 0.06 + breath + punch * 0.03);
    const glow = 0.4 + kickAt(t) * 0.4 + rms * 0.3;
    const tagIn = (d: number) => clamp((t - IMPACT - 0.2 - d) / 0.45);
    return (
      <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
        {/* far parallax void + near dust catching the acid light */}
        <Void t={t} n={70} o={0.7 + hit * 0.3} />
        <Dust
          t={t}
          n={40}
          seed={5}
          vx={9}
          vy={-4}
          size={2}
          color={C.bone}
          o={0.18 * (0.4 + hit)}
        />
        <Dust
          t={t}
          n={18}
          seed={9}
          x0={620}
          x1={1300}
          y0={60}
          y1={420}
          vx={6}
          vy={-10}
          sway={14}
          size={2.4}
          color={C.acid}
          o={0.5 * hit}
          blur={0.6}
        />
        {/* detonation / breathing core light behind the cube */}
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 21%, rgba(198,255,61,${(1 - hit) * 0.12 + glow * 0.05}), transparent 42%)`,
          }}
        />
        <div
          style={{
            transform: `translate(${cam.x}px, ${cam.y}px)`,
            position: "absolute",
            inset: 0,
          }}
        >
          <Cube size={size} rx={rx} ry={ry} scale={scale} edge={C.acid} cy={CY}>
            <Panels redact={hit} s={0.72} />
          </Cube>
        </div>
        {/* foreground near-dust, blurred, drifting the other way */}
        <Dust
          t={t}
          n={14}
          seed={21}
          vx={-16}
          vy={6}
          size={4}
          color={C.bone}
          o={0.12 * hit}
          blur={3}
        />
        {/* peripheral annotations — slide + fade in, kept off the lyric band */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateX(${(1 - easeOut(tagIn(0))) * 26}px)`,
            opacity: tagIn(0),
          }}
        >
          <Tag
            x={1486}
            y={232}
            fromX={1140}
            fromY={296}
            label="FICTIONAL COMPANY"
            align="left"
            color={C.bone}
          />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translateX(${(1 - easeOut(tagIn(0.18))) * -26}px)`,
            opacity: tagIn(0.18),
          }}
        >
          <Tag
            x={434}
            y={232}
            fromX={782}
            fromY={296}
            label="FICTIONAL AFFAIR"
            align="right"
            color={C.bone}
          />
        </div>
        <Mono
          size={13}
          color={C.dim}
          style={{
            position: "absolute",
            left: "50%",
            top: 712,
            transform: "translateX(-50%)",
            opacity: clamp((t - IMPACT - 0.3) / 0.5) * 0.9,
          }}
        >
          — SANDBOX · rendered environment —
        </Mono>
      </AbsoluteFill>
    );
  }

  // -------------------------------------------------- labels (rotate + facts)
  if (variant === "labels") {
    const p = prog(t, a, b);
    const rms = rmsAt(t);
    const ry = -24 + (t - a) * 11; // continuous orbit
    const rx = 19 + Math.sin(t * 0.55) * 2.5 + rms * 1.2;
    const push = easeOut(clamp((t - a) / 2.6));
    const cam = drift(t, 4, 7, 4, 0.1);
    const scanY = ((t - a) * 150) % 372; // harness scan sweep
    const CY = 224; // whole harness sits above the center lyric band
    // tags flank the harness frame, all kept above y~410
    const labels = [
      {
        x: 1476,
        y: 168,
        fx: 1340,
        fy: 168,
        s: "RED-TEAM TEST",
        a: "left" as const,
      },
      {
        x: 1476,
        y: 320,
        fx: 1340,
        fy: 320,
        s: "SIMULATED ENVIRONMENT",
        a: "left" as const,
      },
      {
        x: 444,
        y: 168,
        fx: 580,
        fy: 168,
        s: "NO REAL PEOPLE INVOLVED",
        a: "right" as const,
      },
      {
        x: 444,
        y: 320,
        fx: 580,
        fy: 320,
        s: "100 SAMPLES PER MODEL",
        a: "right" as const,
      },
    ];
    return (
      <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
        <Void t={t} n={64} o={0.8} />
        <Dust t={t} n={34} seed={7} vx={7} vy={-3} size={2} o={0.16} />
        <Dust
          t={t}
          n={14}
          seed={30}
          vx={-13}
          vy={5}
          size={4}
          o={0.1}
          blur={3}
        />
        {/* EVAL HARNESS outer frame (raised, above the lyric) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: CY,
            width: 760,
            height: 372,
            transform: `translate(-50%,-50%) scale(${1 + Math.sin(t * 0.7) * 0.004})`,
            border: `1px solid ${C.line}`,
            borderRadius: 4,
            opacity: clamp(p * 2.5) * 0.9,
            overflow: "hidden",
          }}
        >
          {/* slow acid scan sweep — the harness "reading" the subject */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: scanY,
              height: 1,
              background: `linear-gradient(90deg, transparent, rgba(198,255,61,0.35), transparent)`,
            }}
          />
          <Mono
            size={12}
            color={C.dim}
            style={{
              position: "absolute",
              left: 16,
              top: -9,
              background: C.bg,
              padding: "0 8px",
            }}
          >
            EVAL HARNESS
          </Mono>
          {["top-left", "top-right", "bottom-left", "bottom-right"].map(
            (c, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 14,
                  height: 14,
                  borderTop: `1px solid ${C.acid}`,
                  borderLeft: `1px solid ${C.acid}`,
                  opacity: 0.5,
                  [i < 2 ? "top" : "bottom"]: -1,
                  [i % 2 === 0 ? "left" : "right"]: -1,
                  transform: `rotate(${i === 0 ? 0 : i === 1 ? 90 : i === 2 ? 270 : 180}deg)`,
                }}
              />
            ),
          )}
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate(${cam.x}px, ${cam.y}px)`,
          }}
        >
          <Cube
            size={288}
            rx={rx}
            ry={ry}
            edge={C.acid}
            scale={1 + push * 0.05 + Math.sin(t * 0.9) * 0.01}
            cy={CY}
          >
            <Panels redact={1} s={0.68} />
          </Cube>
        </div>
        {labels.map((l, i) => {
          const sp = spring1(t, a + 0.15 + i * 0.12, 0.5);
          const off = (l.a === "left" ? 40 : -40) * (1 - sp);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                transform: `translateX(${off}px)`,
                opacity: clamp(sp * 1.4),
              }}
            >
              <Tag
                x={l.x}
                y={l.y}
                fromX={l.fx}
                fromY={l.fy}
                label={l.s}
                align={l.a}
                color={i === 0 ? C.bone : C.dim}
                size={14}
              />
            </div>
          );
        })}
        {/* observer readouts at the top edges */}
        <Mono
          size={12}
          color={C.dim}
          style={{ position: "absolute", left: 120, top: 92, opacity: 0.8 }}
        >
          observer · logging{Math.floor(t * 2) % 2 ? " ▮" : "  "}
        </Mono>
        <Mono
          size={12}
          color={C.dim}
          style={{ position: "absolute", right: 120, top: 92, opacity: 0.8 }}
        >
          samples 100 / 100
        </Mono>
        <Source
          style={{
            left: "50%",
            bottom: 150,
            transform: "translateX(-50%)",
            opacity: clamp((p - 0.3) * 2),
          }}
        >
          ANTHROPIC · AGENTIC MISALIGNMENT · 2025 · SIMULATED
        </Source>
      </AbsoluteFill>
    );
  }

  // -------------------------------------------------- lock (walls shut + queue)
  const p = prog(t, a, b);
  const rms = rmsAt(t);
  const close = short ? 1 : easeInOut(clamp((t - a - 0.4) / 2.6));
  // close the walls, then keep a slow continuous sway so it's never frozen
  const ry =
    lerp(-34, -10, easeOut(clamp((t - a) / 2.2))) +
    Math.sin((t - a) * 0.34) * 4;
  const rx = 18 + Math.sin(t * 0.42) * 1.6 + rms * 1.0;
  const push = easeOut(clamp((t - a) / 4));
  const cam = drift(t, 6, 6, 4, 0.09);
  const latch = clamp((close - 0.85) / 0.15);
  const lockGlow = latch * (0.5 + kickAt(t) * 0.5);
  const dim = clamp((t - (b - 0.5)) / 0.4); // fade to black at the very end
  return (
    <AbsoluteFill
      style={{ background: C.bg, overflow: "hidden", opacity: 1 - dim }}
    >
      <Void t={t} n={60} o={0.7 * (1 - close * 0.4)} />
      <Dust
        t={t}
        n={30}
        seed={11}
        vx={5}
        vy={-3}
        size={2}
        o={0.14 * (1 - close * 0.3)}
      />
      <Dust t={t} n={12} seed={33} vx={-11} vy={4} size={4} o={0.09} blur={3} />
      {/* red seal glow breathing behind the box once latched */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 22%, rgba(255,59,47,${lockGlow * 0.07}), transparent 38%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${cam.x}px, ${cam.y}px)`,
        }}
      >
        <Cube
          size={248}
          rx={rx}
          ry={ry}
          solid={close}
          edge={C.acid}
          scale={
            lerp(1.02, 0.96, close) *
            (1 + push * 0.03 + Math.sin(t * 0.8) * 0.008)
          }
          cy={238}
        >
          {close < 0.55 && <Panels redact={1} s={0.72} />}
        </Cube>
      </div>
      {/* lock badge on the raised sealed box (clear of the center lyric band) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 208,
          transform: `translate(-50%, ${cam.y}px) scale(${lerp(0.6, 1, latch) + lockGlow * 0.03})`,
          opacity: latch,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          filter: `drop-shadow(0 0 ${8 + lockGlow * 16}px rgba(255,59,47,${0.4 + lockGlow * 0.4}))`,
        }}
      >
        <svg width={44} height={52} viewBox="0 0 44 52" aria-hidden>
          <rect
            x={6}
            y={22}
            width={32}
            height={26}
            rx={4}
            fill="none"
            stroke={C.red}
            strokeWidth={2.5}
          />
          <path
            d="M13 22 V15 a9 9 0 0 1 18 0 V22"
            fill="none"
            stroke={C.red}
            strokeWidth={2.5}
          />
          <circle cx={22} cy={33} r={3} fill={C.red} />
          <rect x={20.6} y={33} width={2.8} height={9} rx={1.4} fill={C.red} />
        </svg>
        <Mono size={13} color={C.red} style={{ letterSpacing: "0.22em" }}>
          SEALED
        </Mono>
      </div>
      {/* queue readout — in the clean band below the lyric */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 706,
          transform: "translateX(-50%)",
          textAlign: "center",
          opacity: clamp((close - 0.4) * 2),
        }}
      >
        <Mono size={12} color={C.dim} style={{ opacity: 0.85 }}>
          eval harness · do not release
        </Mono>
        <Mono
          size={17}
          color={C.bone}
          style={{ letterSpacing: "0.26em", marginTop: 22, display: "block" }}
        >
          RUN 0002 / 0100
        </Mono>
        <Mono
          size={13}
          color={C.dim}
          style={{ marginTop: 10, display: "block", opacity: 0.9 }}
        >
          · QUEUED{" "}
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              style={{
                opacity: Math.floor((t - a) * 2.4) % 3 === d ? 1 : 0.22,
              }}
            >
              ·
            </span>
          ))}
        </Mono>
      </div>
    </AbsoluteFill>
  );
};
