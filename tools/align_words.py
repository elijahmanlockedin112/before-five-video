"""Align the known lyrics to faster-whisper word timestamps, per WORD.
usage: python tools/align_words.py build/words.json song/gemini-prompt.md build/lyrics_words.json
Output: [{section, voice, text, start, end, words:[{w, s, e, matched}]}]"""
import sys, json, re, difflib
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
words = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))["words"]
body = Path(sys.argv[2]).read_text(encoding="utf-8").split("Sing these exact lyrics:")[1]

lines, section = [], None
for raw in body.splitlines():
    s = raw.strip()
    if not s:
        continue
    if s.startswith("["):
        section = s.strip("[]").split(" - ")[0].strip()
        continue
    voice = "robot" if "robotic" in s else "vocal"
    disp = re.sub(r"\([^)]*\)\s*", "", s).strip()
    lines.append(dict(section=section, voice=voice, text=disp, words=[dict(w=w) for w in disp.split()]))


def norm(t):
    t = t.lower().replace("’", "'")
    t = re.sub(r"[^a-z0-9' ]", " ", t)
    return [w.strip("'") for w in t.split() if w.strip("'")]


# flatten lyric words (keep pointer to (line, word))
ltoks, lptr = [], []
for li, l in enumerate(lines):
    for wi, w in enumerate(l["words"]):
        for t in norm(w["w"]):
            ltoks.append(t); lptr.append((li, wi))
wtoks, wptr = [], []
for j, w in enumerate(words):
    for t in norm(w["word"]):
        wtoks.append(t); wptr.append(j)

sm = difflib.SequenceMatcher(a=ltoks, b=wtoks, autojunk=False)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        li, wi = lptr[a + k]
        ww = words[wptr[b + k]]
        lw = lines[li]["words"][wi]
        if "s" not in lw:
            lw["s"], lw["e"], lw["matched"] = ww["start"], ww["end"], True

# line spans from matched words; interpolate unmatched lines between neighbours
for l in lines:
    m = [w for w in l["words"] if "s" in w]
    l["matched"] = round(len(m) / max(1, len(l["words"])), 2)
    if m:
        l["start"], l["end"] = m[0]["s"], m[-1]["e"]
for i, l in enumerate(lines):
    if "start" in l:
        continue
    prev = next((lines[k] for k in range(i - 1, -1, -1) if "start" in lines[k]), None)
    nxt = next((lines[k] for k in range(i + 1, len(lines)) if "start" in lines[k]), None)
    a = prev["end"] + 0.1 if prev else 0.0
    b = nxt["start"] - 0.1 if nxt else a + 3
    l["start"], l["end"] = round(a, 2), round(max(a + 0.6, b), 2)

# fill unmatched words inside each line by even spacing between known anchors
for l in lines:
    ws = l["words"]
    anchors = [(-1, l["start"])] + [(i, w["s"]) for i, w in enumerate(ws) if "s" in w] + [(len(ws), l["end"])]
    for (ia, ta), (ib, tb) in zip(anchors, anchors[1:]):
        gap = ib - ia
        for k in range(ia + 1, ib):
            t = ta + (tb - ta) * (k - ia) / gap
            ws[k]["s"] = round(t, 3)
            ws[k]["matched"] = False
    for k, w in enumerate(ws):
        nxt = ws[k + 1]["s"] if k + 1 < len(ws) else l["end"]
        w.setdefault("e", round(max(w["s"] + 0.12, min(nxt, w["s"] + 0.8)), 3))

Path(sys.argv[3]).write_text(json.dumps(lines, indent=1), encoding="utf-8")
for l in lines:
    flag = "" if l["matched"] >= 0.5 else "   <-- weak"
    print(f"{l['start']:7.2f}-{l['end']:7.2f} [{(l['section'] or '')[:12]:12s}] {l['matched']:.2f} {l['text']}{flag}")
