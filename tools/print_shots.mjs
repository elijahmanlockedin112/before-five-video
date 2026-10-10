// Prints the shot list with exact times + the lyric lines inside each shot.
// npx esbuild src/shots.ts --bundle --platform=node --format=esm --outfile=build/shots.mjs --loader:.json=json && node tools/print_shots.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { SHOTS } = await import(
  pathToFileURL(path.join(ROOT, "build/shots.mjs")).href
);
const lines = JSON.parse(
  fs.readFileSync(path.join(ROOT, "src/data/lyrics.json"), "utf8"),
);
const rows = [];
for (const s of SHOTS) {
  const ls = lines
    .filter((l) => l.start >= s.a - 0.05 && l.start < s.b)
    .map((l) => `"${l.text}" @${l.start.toFixed(2)}`);
  rows.push(
    `${s.a.toFixed(2).padStart(7)}-${s.b.toFixed(2).padStart(7)}  f${String(Math.round(s.a * 30)).padStart(4)}-${String(Math.round(s.b * 30)).padStart(4)}  ${s.scene.padEnd(10)} ${s.variant.padEnd(8)} in:${s.tin.padEnd(8)} lyr:${s.lyric.padEnd(7)} ${ls.join(" | ")}`,
  );
}
const out = rows.join("\n");
fs.writeFileSync(path.join(ROOT, "build/shots.txt"), out + "\n");
console.log(out);
