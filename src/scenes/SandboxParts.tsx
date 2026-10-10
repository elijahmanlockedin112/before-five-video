import React from "react";
import { C, mono, sans } from "../theme";
import { hash, clamp, lerp } from "../lib";

/** a drifting void of faint dust motes — parallax depth behind the cube */
export const Void: React.FC<{ t: number; n?: number; o?: number }> = ({
  t,
  n = 70,
  o = 1,
}) => {
  const dots = Array.from({ length: n }, (_, i) => {
    const depth = hash(i * 3.3) * 0.9 + 0.1; // 0.1..1
    const bx = hash(i * 1.7) * 1920;
    const by = hash(i * 2.9) * 1080;
    const drift = (t * (6 + depth * 10)) % 1980;
    const x = ((bx - drift + 1980) % 1980) - 30;
    const y = by + Math.sin(t * 0.3 + i) * 6 * depth;
    const s = 0.6 + depth * 2.2;
    const op = (0.05 + depth * 0.22) * o;
    return (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={s}
        fill={i % 11 === 0 ? C.acid : C.bone}
        opacity={op}
      />
    );
  });
  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      {dots}
    </svg>
  );
};

/** a tiny believable software window that floats inside the cube */
export const MiniPanel: React.FC<{
  title: string;
  rows: { k: string; v?: string; accent?: string }[];
  w?: number;
  accent?: string;
  style?: React.CSSProperties;
}> = ({ title, rows, w = 196, accent = C.line2, style }) => (
  <div
    style={{
      width: w,
      background: "rgba(13,15,13,0.92)",
      border: `1px solid ${accent}`,
      borderRadius: 7,
      overflow: "hidden",
      boxShadow: "0 18px 50px rgba(0,0,0,0.6)",
      ...style,
    }}
  >
    <div
      style={{
        height: 20,
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "0 8px",
        borderBottom: `1px solid ${C.line}`,
        background: "rgba(255,255,255,0.015)",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 5,
          background: C.faint,
        }}
      />
      <span
        style={{
          fontFamily: mono,
          fontSize: 8,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.dim,
        }}
      >
        {title}
      </span>
    </div>
    <div style={{ padding: "7px 8px", display: "grid", gap: 5 }}>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              fontFamily: sans,
              fontSize: 8.5,
              color: r.accent ?? C.bone,
              opacity: 0.9,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {r.k}
          </span>
          {r.v != null && (
            <span
              style={{
                fontFamily: mono,
                fontSize: 7.5,
                color: r.accent ?? C.dim,
                whiteSpace: "nowrap",
              }}
            >
              {r.v}
            </span>
          )}
        </div>
      ))}
    </div>
  </div>
);

type Face = { tf: string; key: string };

/** a wireframe glass cube rendered in CSS 3D. children float inside (preserve-3d). */
export const Cube: React.FC<{
  size: number;
  rx: number;
  ry: number;
  rz?: number;
  solid?: number; // 0 = wireframe glass, 1 = closed opaque box
  edge?: string;
  glass?: string;
  children?: React.ReactNode;
  scale?: number;
  cy?: number; // screen-space vertical center in px (default: frame center)
}> = ({
  size: s,
  rx,
  ry,
  rz = 0,
  solid = 0,
  edge = C.acid,
  glass = "rgba(198,255,61,0.02)",
  children,
  scale = 1,
  cy,
}) => {
  const h = s / 2;
  const faces: Face[] = [
    { key: "fr", tf: `translateZ(${h}px)` },
    { key: "bk", tf: `rotateY(180deg) translateZ(${h}px)` },
    { key: "ri", tf: `rotateY(90deg) translateZ(${h}px)` },
    { key: "le", tf: `rotateY(-90deg) translateZ(${h}px)` },
    { key: "to", tf: `rotateX(90deg) translateZ(${h}px)` },
    { key: "bo", tf: `rotateX(-90deg) translateZ(${h}px)` },
  ];
  const fill = `rgba(${lerp(13, 20, solid)},${lerp(15, 22, solid)},${lerp(13, 20, solid)},${lerp(0.06, 0.92, solid)})`;
  const border = solid > 0.5 ? C.line2 : edge;
  const borderOp = lerp(0.3, 0.9, 1 - solid);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        perspective: 1500,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: cy != null ? cy : "50%",
          width: 0,
          height: 0,
          transformStyle: "preserve-3d",
          transform: `scale(${scale}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
        }}
      >
        {faces.map((f) => (
          <div
            key={f.key}
            style={{
              position: "absolute",
              width: s,
              height: s,
              left: -h,
              top: -h,
              background: solid > 0.02 ? fill : glass,
              border: `1px solid ${border}`,
              opacity: solid > 0.5 ? 1 : borderOp,
              boxShadow:
                solid > 0.5
                  ? "inset 0 0 40px rgba(0,0,0,0.5)"
                  : `inset 0 0 60px rgba(198,255,61,0.04)`,
              transform: f.tf,
              backfaceVisibility: "visible",
            }}
          />
        ))}
        {children}
      </div>
    </div>
  );
};

/** a leader line from a point near the cube out to a peripheral tag */
export const Tag: React.FC<{
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  label: string;
  o?: number;
  color?: string;
  align?: "left" | "right";
  size?: number;
}> = ({
  x,
  y,
  fromX,
  fromY,
  label,
  o = 1,
  color = C.dim,
  align = "left",
  size = 15,
}) => {
  const elbowX = align === "left" ? x - 14 : x + 14;
  return (
    <>
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0, opacity: o * 0.8 }}
        aria-hidden
      >
        <polyline
          points={`${fromX},${fromY} ${elbowX},${fromY} ${elbowX},${y} ${align === "left" ? x : x},${y}`}
          fill="none"
          stroke={color}
          strokeWidth={1}
          strokeDasharray="1 4"
          opacity={0.7}
        />
        <circle cx={fromX} cy={fromY} r={2.5} fill={color} />
      </svg>
      <div
        style={{
          position: "absolute",
          left: align === "left" ? x : undefined,
          right: align === "right" ? 1920 - x : undefined,
          top: y,
          transform: "translateY(-50%)",
          fontFamily: mono,
          fontSize: size,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color,
          opacity: o,
          whiteSpace: "nowrap",
          textAlign: align,
        }}
      >
        {label}
      </div>
    </>
  );
};
