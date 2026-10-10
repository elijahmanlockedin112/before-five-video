import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { C, mono, sans } from "../theme";
import { useTime, clamp, lerp, easeOut, easeInOut, kickAt } from "../lib";
import { Source, Mono, Dot } from "../ui";
import { Dust, Scanlines, punchIn, drift } from "./BridgeFx";

const SECRETS = [
  { k: "HF_TOKEN", v: "hf_••••••••••••3kQz", scope: "write · all repos" },
  { k: "OPENAI_API_KEY", v: "sk-••••••••••••7aF2", scope: "org · billing" },
  { k: "DATABASE_URL", v: "postgres://•••••@db", scope: "prod · read/write" },
  { k: "AWS_SECRET_ACCESS_KEY", v: "••••••••••••••uL9", scope: "s3 · full" },
];

export const Spaces: React.FC<SceneProps> = ({ a, b, variant }) => {
  const t = useTime();
  const short = b - a < 1.4;

  const appear = short ? 1 : clamp((t - a) / 0.5);
  const breach = short ? 1 : clamp((t - a - 1.3) / 1.0); // red sweep progress
  const revoke = short ? 0 : clamp((t - a - 2.8) / 0.7); // tokens revoked
  const flash = kickAt(t) * (breach > 0 && revoke < 1 ? 1 : 0.2);

  const panelX = 460,
    panelY = 148,
    panelW = 1000,
    rowH = 76;
  // local y inside the rows container (0 = top of first row)
  const sweepLocal = lerp(-12, SECRETS.length * rowH + 16, easeInOut(breach));

  // living camera: hard punch-in for the montage cut, slow push for the full shot
  const tIn = t - a;
  const camScale = short
    ? punchIn(tIn, 1.08, 0.58)
    : 1 + easeOut(clamp(tIn / 3.5)) * 0.018;
  const cam = drift(t, 8, short ? 18 : 6, short ? 9 : 4, 0.11);

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <Dust t={t} n={24} seed={17} vx={7} vy={-3} size={2} o={0.1} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${camScale}) translate(${cam.x}px, ${cam.y}px)`,
          transformOrigin: "50% 42%",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: panelX,
            top: panelY,
            width: panelW,
            background: C.panel,
            border: `1px solid ${breach > 0.1 ? "rgba(255,59,47,0.45)" : C.line2}`,
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 50px 130px rgba(0,0,0,0.65)",
            opacity: appear,
            transform: `translateY(${(1 - easeOut(appear)) * 24}px)`,
          }}
        >
          {/* app chrome: breadcrumb + tabs */}
          <div
            style={{
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 22px",
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <Mono size={13} color={C.bone}>
              Spaces / summit-bridge-agent / Settings
            </Mono>
            <Mono size={12} color={breach > 0.3 ? C.red : C.dim}>
              {breach > 0.3 ? "session: unknown origin" : "you · owner"}
            </Mono>
          </div>
          <div
            style={{
              display: "flex",
              gap: 26,
              padding: "0 22px",
              height: 44,
              alignItems: "center",
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            {["Variables", "Secrets", "Hardware", "Access"].map((tb, i) => (
              <span
                key={tb}
                style={{
                  fontFamily: sans,
                  fontSize: 15,
                  color: i === 1 ? C.bone : C.dim,
                  borderBottom:
                    i === 1 ? `2px solid ${C.acid}` : "2px solid transparent",
                  paddingBottom: 11,
                  fontWeight: i === 1 ? 600 : 400,
                }}
              >
                {tb}
              </span>
            ))}
          </div>

          {/* secret rows */}
          <div style={{ position: "relative" }}>
            {SECRETS.map((s, i) => {
              const read = breach > 0 && sweepLocal > i * rowH + 28;
              return (
                <div
                  key={s.k}
                  style={{
                    height: rowH,
                    display: "flex",
                    alignItems: "center",
                    padding: "0 22px",
                    gap: 18,
                    borderBottom: `1px solid ${C.line}`,
                    background: read
                      ? `rgba(255,59,47,${0.06 + flash * 0.05})`
                      : "transparent",
                  }}
                >
                  <div style={{ width: 300 }}>
                    <div
                      style={{ fontFamily: mono, fontSize: 16, color: C.bone }}
                    >
                      {s.k}
                    </div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 11,
                        color: C.dim,
                        marginTop: 4,
                      }}
                    >
                      {s.scope}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontFamily: mono,
                      fontSize: 17,
                      color: read && revoke < 0.5 ? C.red : C.dim,
                      letterSpacing: "0.04em",
                      textDecoration: revoke > 0.5 ? "line-through" : "none",
                    }}
                  >
                    {s.v}
                  </div>
                  <div style={{ width: 150, textAlign: "right" }}>
                    {revoke > 0.5 ? (
                      <Mono size={12} color={C.acid}>
                        revoked
                      </Mono>
                    ) : read ? (
                      <Mono size={12} color={C.red}>
                        read →
                      </Mono>
                    ) : (
                      <Mono size={12} color={C.faint}>
                        ••• masked
                      </Mono>
                    )}
                  </div>
                </div>
              );
            })}

            {/* red exfil sweep line */}
            {breach > 0 && breach < 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: sweepLocal,
                  height: 2,
                  background: C.red,
                  boxShadow: `0 0 22px ${C.red}, 0 0 60px ${C.red}88`,
                }}
              />
            )}
          </div>

          {/* status strip */}
          <div
            style={{
              height: 46,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 22px",
              borderTop: `1px solid ${C.line}`,
            }}
          >
            {revoke > 0.5 ? (
              <>
                <Dot color={C.acid} size={8} />
                <Mono size={13} color={C.acid}>
                  all tokens revoked · org tokens removed · KMS enabled
                </Mono>
              </>
            ) : breach > 0.2 ? (
              <>
                <Dot color={C.red} size={8} o={0.5 + flash * 0.5} />
                <Mono size={13} color={C.red}>
                  unauthorized access · spaces secrets
                </Mono>
              </>
            ) : (
              <>
                <Dot color={C.dim} size={8} />
                <Mono size={13} color={C.dim}>
                  4 secrets · encrypted at rest
                </Mono>
              </>
            )}
          </div>
        </div>

        {/* big state stamp, kept out of the bottom-left lyric zone */}
        {breach > 0.25 && revoke < 0.5 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 118,
              transform: `translateX(-50%) scale(${lerp(1.1, 1, clamp(breach * 2))})`,
              fontFamily: mono,
              fontSize: 20,
              letterSpacing: "0.3em",
              color: C.red,
              textTransform: "uppercase",
              opacity: (0.7 + flash * 0.3) * clamp((1 - revoke) * 2),
              textShadow: `0 0 20px ${C.red}66`,
            }}
          >
            ▲ unauthorized access
          </div>
        )}
        {revoke > 0.4 && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 118,
              transform: "translateX(-50%)",
              fontFamily: mono,
              fontSize: 20,
              letterSpacing: "0.3em",
              color: C.acid,
              textTransform: "uppercase",
              opacity: clamp(revoke * 2),
            }}
          >
            tokens revoked
          </div>
        )}

        <Source style={{ left: 1472, top: 836, maxWidth: 400 }}>
          HUGGING FACE · DISCLOSED MAY 31, 2024
        </Source>
      </div>
      <Scanlines t={t} o={0.035} />
    </AbsoluteFill>
  );
};
