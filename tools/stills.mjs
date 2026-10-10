// Fast review stills: bundles once, renders many frames (half size JPEG by default).
// node tools/stills.mjs <outDir> <time-or-frame> [...]   e.g.  node tools/stills.mjs build/stills/a 12.5s 14s f600
//   "12.5s" = seconds, "f600" or "600" = frame.  --full for 1920x1080.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

//   Motion strips: "strip:12.0s:8" = 8 consecutive frames from 12.0 s (every frame), "strip:12.0s:8:2" = every 2nd frame.
//   --scale=0.25 for small strip frames.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const full = args.includes("--full");
const scaleArg = args.find((a) => a.startsWith("--scale="));
const scale = full ? 1 : scaleArg ? parseFloat(scaleArg.split("=")[1]) : 0.5;
const [outDir, ...specs] = args.filter((a) => !a.startsWith("--"));
if (!outDir || !specs.length) {
  console.error(
    "usage: node tools/stills.mjs <outDir> <12.5s|f600|strip:12.0s:8[:step]> ...",
  );
  process.exit(1);
}
fs.mkdirSync(path.resolve(ROOT, outDir), { recursive: true });
const toFrame = (s) =>
  s.endsWith("s")
    ? Math.round(parseFloat(s) * 30)
    : parseInt(s.replace(/^f/, ""), 10);
const frames = specs.flatMap((s) => {
  if (!s.startsWith("strip:")) return [toFrame(s)];
  const [, start, n, step = "1"] = s.split(":");
  const f0 = toFrame(start);
  return Array.from(
    { length: parseInt(n, 10) },
    (_, i) => f0 + i * parseInt(step, 10),
  );
});
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src/index.ts"),
  onProgress: () => {},
});
const inputProps = { mute: true };
const composition = await selectComposition({
  serveUrl,
  id: "BeforeFive",
  inputProps,
});
for (const frame of frames) {
  const output = path.resolve(
    ROOT,
    outDir,
    `t${(frame / 30).toFixed(3).padStart(7, "0")}_f${frame}.jpg`,
  );
  await renderStill({
    composition,
    serveUrl,
    output,
    frame,
    inputProps,
    scale,
    imageFormat: "jpeg",
    jpegQuality: 88,
  });
  console.log(output);
}
