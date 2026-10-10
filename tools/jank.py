"""Motion QA for a rendered preview: finds unintended pops, flicker and frozen stretches.
usage: <venv python> tools/jank.py build/preview_q.mp4 build/shots.json src/data/env.json [build/jank.txt]

- POP: a frame-to-frame change spike that is NOT within 0.2 s of a cut or 0.09 s of a beat/hit
  (intended hits land on beats; anything else is usually an element snapping in/out).
- FLICKER: change alternates high/low 3+ times in a row (jittering element).
- FROZEN: < 0.6% change for over 1.2 s while the music is playing (dead frame).
"""
import sys, json
from pathlib import Path
import numpy as np
import av

sys.stdout.reconfigure(encoding="utf-8")
src, shots_p, env_p = sys.argv[1], sys.argv[2], sys.argv[3]
out_p = sys.argv[4] if len(sys.argv) > 4 else None
shots = json.loads(Path(shots_p).read_text(encoding="utf-8"))
env = json.loads(Path(env_p).read_text(encoding="utf-8"))
beats = np.array(env["beats"])
fps = 30.0

frames = []
with av.open(src) as c:
    for fr in c.decode(video=0):
        g = fr.to_ndarray(format="gray").astype(np.float32)
        frames.append(g[::2, ::2])
diff = np.array([0.0] + [float(np.abs(frames[i] - frames[i - 1]).mean()) for i in range(1, len(frames))])
t = np.arange(len(diff)) / fps
cuts = np.array([s["a"] for s in shots])
rms = np.array(env["rms"])

def shot_at(x):
    for s in shots:
        if s["a"] <= x < s["b"]:
            return f'{s["scene"]}/{s["variant"]}'
    return "?"

def near(arr, x, tol):
    return arr.size and np.min(np.abs(arr - x)) <= tol

med = np.median(diff[diff > 0]) if (diff > 0).any() else 1.0
lines = [f"frames {len(diff)}  median change {med:.2f}/255"]
# pops
thr = max(6.0, med * 6)
for i in range(1, len(diff)):
    x = t[i]
    if diff[i] >= thr and not near(cuts, x, 0.2) and not near(beats, x, 0.09):
        lines.append(f"POP     {x:7.2f}s f{i:<5d} change {diff[i]:5.1f}  in {shot_at(x)}")
# flicker
for i in range(3, len(diff) - 1):
    a, b, c_, d = diff[i - 3:i + 1]
    if min(a, c_) > med * 3 and max(b, d) < min(a, c_) * 0.35 and not near(cuts, t[i], 0.3):
        lines.append(f"FLICKER {t[i]:7.2f}s f{i:<5d} in {shot_at(t[i])}")
# frozen: the animated film grain sets a noise floor, so "frozen" = barely above that floor
floor = float(np.percentile(diff[1:], 5))
lines.append(f"grain noise floor {floor:.2f}/255")
run = 0
for i in range(len(diff)):
    loud = rms[min(i, len(rms) - 1)] > 0.08
    if diff[i] < floor * 1.25 + 0.15 and loud:
        run += 1
    else:
        if run > int(1.2 * fps):
            a = (i - run) / fps
            lines.append(f"FROZEN  {a:7.2f}s-{i / fps:7.2f}s ({run / fps:.1f}s) in {shot_at(a)}")
        run = 0
# photosensitivity: count luminance flashes (a rise then fall, or fall then rise, of >= 10% of full scale in
# mean frame brightness within ~0.5 s). WCAG 2.3.1 allows no more than 3 flashes in any 1-second window.
lum = np.array([f.mean() for f in frames])
events = []  # (frame, direction) of each brightness jump >= ~8% within 1-2 frames
for i in range(1, len(lum)):
    d = max(lum[i] - lum[i - 1], lum[i] - lum[max(0, i - 2)], key=abs)
    if abs(d) >= 20.0:
        s = np.sign(d)
        if events and i - events[-1][0] <= 2 and events[-1][1] == s:
            continue
        events.append((i, s))
flashes = []
for k in range(1, len(events)):
    (i0, s0), (i1, s1) = events[k - 1], events[k]
    if s0 != s1 and i1 - i0 <= 12:
        flashes.append(i1)
if flashes:
    lines.append("flash moments: " + ", ".join(f"{f / fps:.2f}" for f in flashes))
worst = 0
for i in range(len(lum)):
    n = sum(1 for f in flashes if i <= f < i + 30)
    if n > worst:
        worst = n
    if n > 3:
        lines.append(f"FLASH>3 {i / fps:7.2f}s  {n} flashes in 1 s  in {shot_at(i / fps)}")
lines.append(f"luminance flashes total {len(flashes)}, worst 1-second window {worst} (limit 3)")
# per-shot motion energy (helps spot dull shots)
lines.append("\nper-shot mean change (low = static, high = busy):")
for s in shots:
    i0, i1 = int(s["a"] * fps), max(int(s["a"] * fps) + 1, int(s["b"] * fps))
    seg = diff[i0 + 2:i1]
    if seg.size:
        lines.append(f'  {s["a"]:7.2f}-{s["b"]:7.2f} {s["scene"] + "/" + s["variant"]:20s} {seg.mean():5.2f}  max {seg.max():5.1f}')
report = "\n".join(lines)
print(report)
if out_p:
    Path(out_p).write_text(report + "\n", encoding="utf-8")
