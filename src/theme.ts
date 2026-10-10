import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Anton";

const latin = { subsets: ["latin" as const] };
// Instrument Serif: use with fontStyle "italic" for the whisper voice, "normal" for upright
export const serif = loadSerif("italic", latin).fontFamily;
loadSerif("normal", latin);
export const serifUp = serif;
export const mono = loadMono("normal", {
  weights: ["400", "500", "700"],
  ...latin,
}).fontFamily;
export const sans = loadSans("normal", {
  weights: ["400", "500", "600", "700"],
  ...latin,
}).fontFamily;
export const display = loadDisplay("normal", latin).fontFamily;

export const C = {
  bg: "#050605",
  panel: "#0d0f0d",
  panel2: "#131613",
  line: "rgba(233,230,223,0.10)",
  line2: "rgba(233,230,223,0.18)",
  bone: "#e9e6df",
  dim: "#7c807a",
  faint: "#3a3e39",
  acid: "#c6ff3d", // the AI
  acidDim: "rgba(198,255,61,0.16)",
  red: "#ff3b2f", // terminate / breach
  redDim: "rgba(255,59,47,0.14)",
};

export const W = 1920;
export const H = 1080;
export const FPS = 30;
