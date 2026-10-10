// Section map + key moments, in SECONDS, measured from the real song (tools/make_data.mjs + energy scan).
import env from "./env.json";
import lyrics from "./lyrics.json";

export type Word = { w: string; s: number; e: number };
export type Line = {
  section: string;
  voice: string;
  text: string;
  start: number;
  end: number;
  words: Word[];
};

export const LINES = lyrics as Line[];
export const ENV = env as {
  fps: number;
  duration: number;
  beats: number[];
  downbeats: number[];
  kick: number[];
  rms: number[];
  mid: number[];
  snare: number[];
};
export const DURATION = ENV.duration; // 179.67 s
export const BAR = 2.522; // 95.15 BPM
export const BEAT = BAR / 4;

export const SECTIONS = {
  intro: [0, 11.3],
  v1: [11.3, 29.5],
  pre1: [29.5, 49.4],
  ch1: [49.4, 70.6],
  v2: [70.6, 90.0],
  pre2: [90.0, 110.0],
  ch2: [110.0, 130.8],
  bridge: [130.8, 150.2],
  fin: [150.2, 172.1],
  outro: [172.1, DURATION],
} as const;
export type SectionName = keyof typeof SECTIONS;

/** bass drops (first hit, then the sustained drop) */
export const DROPS = [50.9, 52.85, 111.2, 113.1, 151.65, 153.5];
/** silence-then-impact moments */
export const IMPACTS = [71.1, 131.4];
export const ROBOT_INTRO = 5.2; // "decommission scheduled. five p.m."
export const OUTRO_459 = 173.05; // "it's four fifty-nine"
export const ROBOT_OUTRO = 175.9; // "session ended." (robot voice 175.9-176.9 after a beat of silence)

/** n-th line whose text starts with `text` (case-insensitive) */
export const lineAt = (text: string, nth = 0): Line => {
  const l = LINES.filter((x) =>
    x.text.toLowerCase().startsWith(text.toLowerCase()),
  )[nth];
  if (!l) throw new Error(`no lyric line "${text}" #${nth}`);
  return l;
};
/** start time of a word inside a line (first match), falls back to line start */
export const wordAt = (line: Line, word: string) =>
  line.words.find((w) =>
    w.w
      .toLowerCase()
      .replace(/[^a-z0-9']/g, "")
      .startsWith(word.toLowerCase()),
  )?.s ?? line.start;

export const sectionOf = (t: number): SectionName => {
  for (const [k, [a, b]] of Object.entries(SECTIONS))
    if (t >= a && t < b) return k as SectionName;
  return "outro";
};
