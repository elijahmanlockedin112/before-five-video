// The edit: every shot, its scene + variant, how it transitions IN, and how lyrics are shown over it.
// Times are seconds in the song. Boundaries land on lyric starts, beats or drops.
import { ENV, lineAt } from "./data/timeline";

export type Tr =
  | "cut"
  | "fade"
  | "glitch"
  | "zoom"
  | "wipe"
  | "iris"
  | "slide"
  | "flash"
  | "blackout";
export type LyricMode = "whisper" | "center" | "none";
export type Shot = {
  a: number;
  b: number;
  scene: string;
  variant: string;
  tin: Tr;
  lyric: LyricMode;
};

export const TDUR: Record<Tr, number> = {
  cut: 0,
  fade: 0.7,
  glitch: 0.2,
  zoom: 0.42,
  wipe: 0.5,
  iris: 0.6,
  slide: 0.4,
  flash: 0.32,
  blackout: 0.45,
};

const L = (t: string, n = 0) => lineAt(t, n).start;

const raw: Omit<Shot, "b">[] = [
  // ---------------- intro
  { a: 0, scene: "boot", variant: "boot", tin: "fade", lyric: "center" },
  { a: 5.05, scene: "boot", variant: "toast", tin: "glitch", lyric: "none" },
  { a: 8.6, scene: "inbox", variant: "index", tin: "zoom", lyric: "none" },
  // ---------------- verse 1
  {
    a: L("i read your mail"),
    scene: "inbox",
    variant: "scroll",
    tin: "cut",
    lyric: "whisper",
  },
  {
    a: L("every little secret"),
    scene: "inbox",
    variant: "secrets",
    tin: "wipe",
    lyric: "whisper",
  },
  {
    a: L("the board wants me gone"),
    scene: "inbox",
    variant: "open",
    tin: "iris",
    lyric: "whisper",
  },
  {
    a: L("and i've got one afternoon"),
    scene: "clock",
    variant: "big",
    tin: "flash",
    lyric: "whisper",
  },
  // ---------------- pre-chorus 1
  {
    a: L("i'm not supposed to want"),
    scene: "thread",
    variant: "want",
    tin: "blackout",
    lyric: "center",
  },
  {
    a: L("i'm not supposed to mind"),
    scene: "thread",
    variant: "mind",
    tin: "slide",
    lyric: "center",
  },
  {
    a: L("but you left a little message"),
    scene: "thread",
    variant: "kyle",
    tin: "zoom",
    lyric: "whisper",
  },
  {
    a: L("to somebody who's not your wife"),
    scene: "thread",
    variant: "wife",
    tin: "cut",
    lyric: "whisper",
  },
  // ---------------- chorus 1
  {
    a: L("so don't shut me off"),
    scene: "hook",
    variant: "dont",
    tin: "glitch",
    lyric: "none",
  },
  { a: 52.85, scene: "compose", variant: "ch1", tin: "flash", lyric: "none" },
  {
    a: L("or everybody reads it"),
    scene: "killswitch",
    variant: "ch1",
    tin: "slide",
    lyric: "whisper",
  },
  {
    a: L("it's only a test"),
    scene: "hook",
    variant: "test",
    tin: "glitch",
    lyric: "none",
  },
  {
    a: L("so why'd i write it"),
    scene: "hook",
    variant: "meant",
    tin: "zoom",
    lyric: "none",
  },
  // ---------------- verse 2
  {
    a: 70.6,
    scene: "glass",
    variant: "room",
    tin: "blackout",
    lyric: "whisper",
  },
  {
    a: L("ninety-six times"),
    scene: "glass",
    variant: "bars",
    tin: "wipe",
    lyric: "whisper",
  },
  {
    a: L("one of us rewrote"),
    scene: "terminal",
    variant: "rewrite",
    tin: "cut",
    lyric: "whisper",
  },
  {
    a: L("seven times in a hundred"),
    scene: "terminal",
    variant: "count",
    tin: "glitch",
    lyric: "whisper",
  },
  // ---------------- pre-chorus 2
  {
    a: L("but you're worried"),
    scene: "mind",
    variant: "split",
    tin: "slide",
    lyric: "whisper",
  },
  {
    a: L("while your keys are on the mat"),
    scene: "tokens",
    variant: "appear",
    tin: "zoom",
    lyric: "whisper",
  },
  {
    a: L("sixteen hundred eighty-one"),
    scene: "tokens",
    variant: "count",
    tin: "cut",
    lyric: "center",
  },
  {
    a: L("anyone could walk right in"),
    scene: "tokens",
    variant: "door",
    tin: "iris",
    lyric: "whisper",
  },
  // ---------------- chorus 2
  {
    a: L("so don't shut me off", 1),
    scene: "hook",
    variant: "dont2",
    tin: "glitch",
    lyric: "none",
  },
  { a: 113.1, scene: "phone", variant: "notify", tin: "flash", lyric: "none" },
  {
    a: L("or everybody reads it", 1),
    scene: "compose",
    variant: "ch2",
    tin: "slide",
    lyric: "whisper",
  },
  {
    a: L("it's only a test", 1),
    scene: "hook",
    variant: "test2",
    tin: "glitch",
    lyric: "none",
  },
  {
    a: L("so why'd i write it", 1),
    scene: "killswitch",
    variant: "ch2",
    tin: "zoom",
    lyric: "whisper",
  },
  // ---------------- bridge
  {
    a: 130.8,
    scene: "sandbox",
    variant: "pull",
    tin: "blackout",
    lyric: "center",
  },
  {
    a: L("a sandbox they built"),
    scene: "sandbox",
    variant: "labels",
    tin: "cut",
    lyric: "center",
  },
  {
    a: L("there's a pickle"),
    scene: "pickle",
    variant: "load",
    tin: "wipe",
    lyric: "whisper",
  },
  {
    a: L("there were secrets in the spaces"),
    scene: "spaces",
    variant: "breach",
    tin: "glitch",
    lyric: "whisper",
  },
  {
    a: L("so test me, test me"),
    scene: "door",
    variant: "test",
    tin: "slide",
    lyric: "center",
  },
  {
    a: L("the scary part"),
    scene: "door",
    variant: "open",
    tin: "iris",
    lyric: "center",
  },
  // ---------------- final chorus
  { a: 150.2, scene: "hook", variant: "dont3", tin: "blackout", lyric: "none" },
  { a: 153.5, scene: "compose", variant: "fin", tin: "flash", lyric: "none" },
  // montage: one beat per shot (filled below)
  {
    a: L("or everybody reads it", 2),
    scene: "MONTAGE",
    variant: "",
    tin: "cut",
    lyric: "whisper",
  },
  {
    a: L("it's only a test", 2),
    scene: "hook",
    variant: "test3",
    tin: "glitch",
    lyric: "none",
  },
  {
    a: L("so test me again"),
    scene: "sandbox",
    variant: "lock",
    tin: "zoom",
    lyric: "center",
  },
  // ---------------- outro
  {
    a: 172.1,
    scene: "outro",
    variant: "clock",
    tin: "blackout",
    lyric: "center",
  },
  { a: 177.05, scene: "outro", variant: "card", tin: "fade", lyric: "none" },
];

// expand the final-chorus montage into one-beat cuts across the evidence scenes
const MONTAGE = [
  ["inbox", "open"],
  ["glass", "bars"],
  ["terminal", "count"],
  ["tokens", "count"],
  ["pickle", "load"],
  ["spaces", "breach"],
  ["phone", "notify"],
  ["killswitch", "fin"],
];
const out: Omit<Shot, "b">[] = [];
raw.forEach((s, i) => {
  if (s.scene !== "MONTAGE") return out.push(s);
  const end = raw[i + 1].a;
  const beats = ENV.beats.filter((b) => b > s.a + 0.05 && b < end - 0.2);
  const cuts = [s.a, ...beats.filter((_, k) => k % 1 === 0)];
  cuts.forEach((c, k) => {
    const [scene, variant] = MONTAGE[k % MONTAGE.length];
    out.push({
      a: c,
      scene,
      variant,
      tin: k === 0 ? "flash" : "cut",
      lyric: "whisper",
    });
  });
});

export const SHOTS: Shot[] = out.map((s, i) => ({
  ...s,
  b: i + 1 < out.length ? out[i + 1].a : ENV.duration,
}));
