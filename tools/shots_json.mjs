// Writes build/shots.json from the bundled shot list (run after: npx esbuild src/shots.ts --bundle --platform=node --format=esm --outfile=build/shots.mjs --loader:.json=json)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { SHOTS } = await import(
  pathToFileURL(path.join(ROOT, "build/shots.mjs")).href
);
fs.writeFileSync(path.join(ROOT, "build/shots.json"), JSON.stringify(SHOTS));
console.log("shots", SHOTS.length);
