// Real song data for Remotion: build/analysis.json (30 fps) + build/lyrics_words.json -> src/data/*.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ana = JSON.parse(
  fs.readFileSync(path.join(ROOT, "build/analysis.json"), "utf8"),
);
const lines = JSON.parse(
  fs.readFileSync(path.join(ROOT, "build/lyrics_words.json"), "utf8"),
);

// hand corrections from the energy scan (whisper misses quiet/robot words)
const fix = {
  "it's four fifty-nine": [173.05, 174.85],
  "decommission scheduled. five p.m.": [5.2, 8.4],
  "session ended.": [175.9, 176.9], // silence 175.0-175.8, robot voice 175.9-176.9
};
// lines whose first word whisper placed in the silence before an impact: [text, real first-word time]
const firstWord = { "fictional company. fictional affair.": 131.4 };
let chorus = 0;
for (const l of lines) {
  if (l.section === "Chorus") {
    if (l.text.startsWith("so don")) chorus++;
    if (chorus === 2) l.section = "Chorus 2";
  }
  const f = fix[l.text];
  if (f) {
    const [a, b] = f;
    l.start = a;
    l.end = b;
    l.words = l.words.map((w, i) => ({
      ...w,
      s: +(a + ((b - a) * i) / l.words.length).toFixed(3),
      e: +(a + ((b - a) * (i + 1)) / l.words.length).toFixed(3),
    }));
  }
  const fw = firstWord[l.text];
  if (fw) {
    l.start = fw;
    l.words[0] = {
      ...l.words[0],
      s: fw,
      e: Math.max(fw + 0.2, l.words[1]?.s ?? fw + 0.4),
    };
  }
  l.words = l.words.map(({ w, s, e }) => ({ w, s, e }));
  delete l.matched;
}
const r = (arr) => arr.map((v) => +v.toFixed(3));
fs.writeFileSync(
  path.join(ROOT, "src/data/lyrics.json"),
  JSON.stringify(lines, null, 1),
);
fs.writeFileSync(
  path.join(ROOT, "src/data/env.json"),
  JSON.stringify({
    fps: ana.fps,
    duration: +ana.duration.toFixed(3),
    beats: ana.beats,
    downbeats: ana.downbeats,
    kick: r(ana.frames.kick),
    rms: r(ana.frames.rms),
    mid: r(ana.frames.mid),
    snare: r(ana.frames.snare),
  }),
);
console.log(
  `lyrics ${lines.length} lines, env ${ana.frames.kick.length} frames @ ${ana.fps} fps, ${ana.duration.toFixed(2)} s`,
);
