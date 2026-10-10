import type React from "react";
import type { SceneProps } from "./types";
import { Boot } from "./Boot";
import { Inbox } from "./Inbox";
import { Clock } from "./Clock";
import { Thread } from "./Thread";
import { Hook } from "./Hook";
import { Compose } from "./Compose";
import { KillSwitch } from "./KillSwitch";
import { Phone } from "./Phone";
import { Glass } from "./Glass";
import { Terminal } from "./Terminal";
import { Mind } from "./Mind";
import { Tokens } from "./Tokens";
import { Sandbox } from "./Sandbox";
import { Pickle } from "./Pickle";
import { Spaces } from "./Spaces";
import { Door } from "./Door";
import { Outro } from "./Outro";

export const SCENES: Record<string, React.FC<SceneProps>> = {
  boot: Boot,
  inbox: Inbox,
  clock: Clock,
  thread: Thread,
  hook: Hook,
  compose: Compose,
  killswitch: KillSwitch,
  phone: Phone,
  glass: Glass,
  terminal: Terminal,
  mind: Mind,
  tokens: Tokens,
  sandbox: Sandbox,
  pickle: Pickle,
  spaces: Spaces,
  door: Door,
  outro: Outro,
};
