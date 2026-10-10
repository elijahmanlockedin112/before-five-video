// Fake song data (96 BPM, guessed section times) so scenes can be built before the real MP3 exists.
// node tools/placeholder_data.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FPS = 30;
const BEAT = 60 / 96;
const DUR = 172;
const body = fs
  .readFileSync(path.join(ROOT, "song/gemini-prompt.md"), "utf8")
  .split("Sing these exact lyrics:")[1];

// guessed section starts (seconds)
const SEC = {
  Intro: 0,
  "Verse 1": 12,
  "Pre-Chorus": 32,
  Chorus: 42,
  "Verse 2": 62,
  "Pre-Chorus 2": 82,
  Bridge: 112,
  "Final Chorus": 137,
  Outro: 160,
};
const lines = [];
let section = null;
let chorusN = 0;
for (const raw of body.split(/\r?\n/)) {
  const s = raw.trim();
  if (!s) continue;
  if (s.startsWith("[")) {
    section = s
      .replace(/[\[\]]/g, "")
      .split(" - ")[0]
      .trim();
    if (section === "Chorus") chorusN++;
    continue;
  }
  const voice = /robotic/.test(s) ? "robot" : "vocal";
  const text = s.replace(/\([^)]*\)\s*/g, "").trim();
  lines.push({
    section: section === "Chorus" && chorusN === 2 ? "Chorus 2" : section,
    voice,
    text,
  });
}
const starts = { ...SEC, "Chorus 2": 92 };
const bySec = {};
for (const l of lines) (bySec[l.section] ??= []).push(l);
for (const [sec, ls] of Object.entries(bySec)) {
  let t = (starts[sec] ?? 0) + 1.2;
  for (const l of ls) {
    const ws = l.text.split(/\s+/);
    const dur = Math.max(2, ws.length * 0.32);
    l.start = +t.toFixed(2);
    l.end = +(t + dur).toFixed(2);
    l.words = ws.map((w, i) => ({
      w,
      s: +(t + (i * dur) / ws.length).toFixed(3),
      e: +(t + ((i + 1) * dur) / ws.length).toFixed(3),
    }));
    t += dur + 0.5;
  }
}
const n = Math.ceil(DUR * FPS);
const kick = [],
  rms = [],
  mid = [];
for (let i = 0; i < n; i++) {
  const t = i / FPS;
  const ph = (t / BEAT) % 1;
  const loudSec =
    (t >= 42 && t < 62) || (t >= 92 && t < 112) || (t >= 137 && t < 160);
  kick.push(+(Math.exp(-ph * 7) * (loudSec ? 1 : 0.35)).toFixed(3));
  rms.push(loudSec ? 0.9 : 0.4);
  mid.push(+(0.4 + 0.3 * Math.sin(t * 9)).toFixed(3));
}
const beats = [];
for (let t = 0; t < DUR; t += BEAT) beats.push(+t.toFixed(3));
fs.writeFileSync(
  path.join(ROOT, "src/data/lyrics.json"),
  JSON.stringify(lines, null, 1),
);
fs.writeFileSync(
  path.join(ROOT, "src/data/env.json"),
  JSON.stringify({
    fps: FPS,
    duration: DUR,
    beats,
    kick,
    rms,
    mid,
    placeholder: true,
  }),
);
console.log(`placeholder: ${lines.length} lines, ${n} frames`);
