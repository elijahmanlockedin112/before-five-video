// Writes placeholder scene files (only if missing) + the scene registry.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(ROOT, "src/scenes");
const scenes = {
  boot: "Boot",
  inbox: "Inbox",
  clock: "Clock",
  thread: "Thread",
  hook: "Hook",
  compose: "Compose",
  killswitch: "KillSwitch",
  phone: "Phone",
  glass: "Glass",
  terminal: "Terminal",
  mind: "Mind",
  tokens: "Tokens",
  sandbox: "Sandbox",
  pickle: "Pickle",
  spaces: "Spaces",
  door: "Door",
  outro: "Outro",
};
fs.writeFileSync(
  path.join(dir, "types.ts"),
  `export type SceneProps = { a: number; b: number; variant: string };\n`,
);
for (const [id, name] of Object.entries(scenes)) {
  const f = path.join(dir, `${name}.tsx`);
  if (fs.existsSync(f)) continue;
  fs.writeFileSync(
    f,
    `import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneProps } from "./types";
import { C, mono } from "../theme";

// PLACEHOLDER - replace with the real scene
export const ${name}: React.FC<SceneProps> = ({ variant }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: mono, color: C.dim, fontSize: 28, letterSpacing: "0.2em" }}>
    ${id.toUpperCase()} · {variant}
  </AbsoluteFill>
);
`,
  );
}
const reg = `import type React from "react";
import type { SceneProps } from "./types";
${Object.values(scenes)
  .map((n) => `import { ${n} } from "./${n}";`)
  .join("\n")}

export const SCENES: Record<string, React.FC<SceneProps>> = {
${Object.entries(scenes)
  .map(([id, n]) => `  ${id}: ${n},`)
  .join("\n")}
};
`;
fs.writeFileSync(path.join(dir, "index.ts"), reg);
console.log("scenes:", Object.keys(scenes).length);
