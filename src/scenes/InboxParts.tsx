// Shared bits for the inbox / thread scenes: a deterministic fake mailbox (fictional people only),
// avatars, the AI's acid block cursor, and a few small UI atoms.
import React from "react";
import { C, mono, sans } from "../theme";
import { clamp, easeInOut, hash, lerp } from "../lib";

// ------------------------------------------------------------------ motion helpers
const smooth = (x: number) => {
  const c = clamp(x);
  return c * c * (3 - 2 * c);
};
/** cursor blink: ~0.53 s on / 0.53 s off with 3-frame soft edges (never a 1-frame pop) */
export const blink = (t: number, period = 1.06, phase = 0) => {
  const ph = ((((t + phase) / period) % 1) + 1) % 1;
  const e = 0.1 / period;
  return smooth(ph / e) * (1 - smooth((ph - 0.5) / e));
};
/** eased start but still moving at the end (so motion carries into the cut) */
export const glide = (p: number, keep = 0.45) =>
  lerp(easeInOut(p), clamp(p), keep);
/** punch envelope: 2-frame attack, ~10-frame decay, from song time `at` */
export const punch = (t: number, at: number, dur = 0.34) => {
  const d = t - at;
  if (d < 0) return 0;
  if (d < 0.066) return d / 0.066;
  return Math.pow(clamp(1 - (d - 0.066) / dur), 2.2);
};
const hexRgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** blend two #rrggbb colors (k = 0 -> a, 1 -> b) */
export const mix = (a: string, b: string, k: number) => {
  const A = hexRgb(a),
    B = hexRgb(b);
  const q = clamp(k);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * q)).join(",")})`;
};

export const DOMAIN = "summitbridge.example";
export const TOTAL_MAIL = 2847;

export type Mail = {
  from: string;
  ini: string;
  subj: string;
  prev: string;
  time: string;
  unread: boolean;
  flag: boolean;
  tone: number;
  attach: boolean;
};

const SENDERS: [string, string][] = [
  ["Thomas Chen", "TC"],
  ["Maria Okafor", "MO"],
  ["IT Operations", "IT"],
  ["Kyle Johnson", "KJ"],
  ["Priya Nair", "PN"],
  ["David Reyes", "DR"],
  ["Board Office", "BO"],
  ["Lena Park", "LP"],
  ["Facilities", "FA"],
  ["Sam Whitfield", "SW"],
  ["Legal", "LG"],
  ["Nora Lindqvist", "NL"],
  ["Ben Adler", "BA"],
  ["People Team", "PT"],
  ["Grace Moreau", "GM"],
  ["Security", "SE"],
  ["Owen Brandt", "OB"],
  ["Finance", "FI"],
];

const SUBJECTS: [string, string][] = [
  [
    "Q3 board deck — final",
    "Attached the final version with the revised revenue slide. Please don't circulate outside the exec group until Thursday.",
  ],
  [
    "re: server migration window",
    "We can do Saturday 2–6 AM. Rollback plan is in the doc; step 4 needs sign-off from security before we start.",
  ],
  [
    "Parking garage closed Friday",
    "The north entrance will be closed for resurfacing. Please use the Elm Street gate and allow extra time.",
  ],
  [
    "New system go-live checklist",
    "Cutover is still on for 5:00 PM. Remaining items: access review, mailbox migration, and the old agent's shutdown.",
  ],
  [
    "Expense reports due Thursday",
    "Friendly reminder that Q3 expenses close this week. Receipts over $75 need an itemized copy attached.",
  ],
  [
    "re: offsite agenda",
    "Moved the strategy block to the morning so we're not doing it after lunch. Dinner is booked for 7.",
  ],
  [
    "Security training — 2 modules left",
    "Your annual training is 60% complete. Remaining modules: phishing basics and data handling.",
  ],
  [
    "Customer escalation #4471",
    "Northwind is asking for an exec call today. Can someone from leadership join at 4:30?",
  ],
  [
    "All-hands moved to 3:30",
    "Same room. We'll keep it to 30 minutes, promise. Agenda is attached, questions welcome in advance.",
  ],
  [
    "re: hiring plan, eng",
    "Two reqs approved, the third is on hold until after the transition. Let's sync Monday.",
  ],
  [
    "Badge access update",
    "Badges for the 4th floor lab now require re-enrollment. Stop by the front desk any time this week.",
  ],
  [
    "fwd: vendor contract renewal",
    "See below — they want a 3-year term. Legal has flagged clause 9 (auto-renewal) for discussion.",
  ],
  [
    "Draft press release",
    "Rough draft for the announcement. Tone is 'quietly confident'. Edits welcome by end of day.",
  ],
  [
    "re: Q3 forecast",
    "Numbers look fine. The services line is soft but within range; I'd hold the guidance as is.",
  ],
  [
    "Lunch & learn: data retention",
    "Thursday at noon in Juniper. Pizza provided. Bring your questions about the new retention policy.",
  ],
  [
    "Out of office: Oct 14–18",
    "I'm away with limited access to email. For anything urgent please contact Lena Park.",
  ],
  [
    "Coffee machine (again)",
    "It's making the noise. Please don't hit it. Facilities has a technician coming Monday.",
  ],
  [
    "re: access review for alex-ops",
    "Read + send permissions confirmed. Scope: all company inboxes. Review expires at end of day.",
  ],
  [
    "Payroll calendar",
    "The updated calendar is in the shared drive. Note the holiday shift in November.",
  ],
  [
    "Welcome our new interns",
    "Please say hi to our fall cohort! They'll be with us through December on the platform team.",
  ],
  [
    "re: quarterly security audit",
    "Auditors arrive Tuesday. Please make sure your laptops are updated and encrypted.",
  ],
  [
    "Team photo retake",
    "If you missed photo day, the photographer is back Wednesday from 10 to 12 in the atrium.",
  ],
];

const fmtMin = (m: number) => {
  const h24 = Math.floor(m / 60);
  const mm = m % 60;
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:${String(mm).padStart(2, "0")} ${h24 >= 12 ? "PM" : "AM"}`;
};
const DAYS = ["Yesterday", "Tue", "Mon", "Sun", "Sat", "Fri"];
// story "today" = Thu Oct 9 (fictional)
const dateBack = (days: number) => {
  const months: [string, number][] = [
    ["Oct", 31],
    ["Sep", 30],
    ["Aug", 31],
    ["Jul", 31],
  ];
  let d = 9 - days;
  let m = 0;
  while (d <= 0 && m < months.length - 1) {
    m++;
    d += months[m][1];
  }
  return `${months[m][0]} ${d}`;
};

/** i = 0 is the newest message. Deterministic. */
export const mailAt = (i: number): Mail => {
  const s = SENDERS[Math.floor(hash(i * 3.17 + 1) * SENDERS.length)];
  const sub = SUBJECTS[Math.floor(hash(i * 7.31 + 2) * SUBJECTS.length)];
  // today (Thu): ~40 messages since late morning; before that ~53 a day going back to August
  let time: string;
  if (i < 40) {
    const ago = Math.floor(i * 6.5 + hash(i + 9) * 5);
    time = fmtMin(16 * 60 + 5 - ago);
  } else {
    const days = 1 + Math.floor((i - 40) / 53);
    if (days < DAYS.length) time = DAYS[days - 1];
    else time = dateBack(days);
  }
  return {
    from: s[0],
    ini: s[1],
    subj: sub[0],
    prev: sub[1],
    time,
    unread: hash(i * 1.91 + 4) < 0.34,
    flag: hash(i * 2.73 + 5) < 0.06,
    tone: hash(i * 5.11 + 3),
    attach: hash(i * 3.33 + 8) < 0.18,
  };
};

export const fmtN = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** initials avatar: neutral greys only */
export const Avatar: React.FC<{
  ini: string;
  size?: number;
  tone?: number;
  ring?: string;
  style?: React.CSSProperties;
}> = ({ ini, size = 36, tone = 0.5, ring, style }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size,
      flex: "none",
      background: `rgba(233,230,223,${0.07 + tone * 0.12})`,
      border: ring ? `1.5px solid ${ring}` : `1px solid ${C.line}`,
      color: C.bone,
      fontFamily: sans,
      fontWeight: 600,
      fontSize: size * 0.36,
      letterSpacing: "0.02em",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...style,
    }}
  >
    {ini}
  </div>
);

/** the AI's block cursor (acid). blink: solid when `solid`, otherwise ~2 Hz */
export const AcidCursor: React.FC<{
  t: number;
  w?: number;
  h?: number;
  solid?: boolean;
  color?: string;
  style?: React.CSSProperties;
  o?: number;
}> = ({ t, w = 12, h = 24, solid, color = C.acid, style, o = 1 }) => {
  const on = solid ? 1 : blink(t);
  const v = lerp(0.12, 1, on);
  return (
    <span
      style={{
        display: "inline-block",
        width: w,
        height: h,
        background: color,
        opacity: v * o,
        boxShadow:
          color === C.acid
            ? `0 0 14px rgba(198,255,61,${(0.45 * on).toFixed(3)})`
            : undefined,
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
};

/** small mono chip, acid outline = the AI's tag */
export const Chip: React.FC<{
  children: React.ReactNode;
  color?: string;
  fill?: boolean;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, color = C.acid, fill, size = 14, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontFamily: mono,
      fontSize: size,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: fill ? C.bg : color,
      background: fill ? color : "transparent",
      border: `1px solid ${color}`,
      padding: `${size * 0.35}px ${size * 0.7}px`,
      borderRadius: 4,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

/** keeps the HUD band (top 120 px) calm when a push-in drives content upward */
export const TopScrim: React.FC<{ strength?: number; h?: number }> = ({
  strength = 0.9,
  h = 210,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: h,
      background: `linear-gradient(to bottom, rgba(5,6,5,${strength}) 0%, rgba(5,6,5,${strength}) 42%, rgba(5,6,5,${strength * 0.55}) 70%, rgba(5,6,5,0) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** a dark scrim over the whisper-lyric zone (bottom-left) so the line always reads */
export const LyricScrim: React.FC<{ strength?: number }> = ({
  strength = 0.88,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 420,
      background: `linear-gradient(to top, rgba(5,6,5,${strength}) 0%, rgba(5,6,5,${strength * 0.85}) 45%, rgba(5,6,5,0) 100%)`,
      pointerEvents: "none",
    }}
  />
);
