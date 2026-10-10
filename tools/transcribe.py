"""Word-level timestamps for the song with faster-whisper (local, CPU).
usage: tools/.venv/Scripts/python.exe tools/transcribe.py song/its_just_math.mp3 build/words.json [model]"""
import sys, json, time
from pathlib import Path
import truststore  # Norton/Avast TLS interception: trust the Windows cert store (verification stays on)
truststore.inject_into_ssl()
from faster_whisper import WhisperModel

sys.stdout.reconfigure(encoding="utf-8")
src, out = sys.argv[1], sys.argv[2]
model_name = sys.argv[3] if len(sys.argv) > 3 else "large-v3-turbo"
prompt_file = Path(__file__).resolve().parent.parent / "song" / "gemini-prompt.md"
body = prompt_file.read_text(encoding="utf-8").split("Sing these exact lyrics:")[1]
lyrics = [l.strip() for l in body.splitlines() if l.strip() and not l.startswith("[")]
hint = " ".join(lyrics)[:800]

def decode_16k(path):
    """faster-whisper's own decoder passes a kwarg newer PyAV dropped; decode here instead."""
    import av, numpy as np
    chunks = []
    with av.open(path) as c:
        rs = av.AudioResampler(format="flt", layout="mono", rate=16000)
        for fr in c.decode(audio=0):
            for o in rs.resample(fr):
                chunks.append(o.to_ndarray().reshape(-1))
        for o in rs.resample(None):
            chunks.append(o.to_ndarray().reshape(-1))
    return np.concatenate(chunks).astype(np.float32)


t0 = time.time()
model = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=8)
segs, info = model.transcribe(decode_16k(src), language="en", word_timestamps=True, vad_filter=False,
                              condition_on_previous_text=False, initial_prompt=hint,
                              beam_size=5, temperature=0.0)
words, lines = [], []
for s in segs:
    lines.append(dict(start=round(s.start, 2), end=round(s.end, 2), text=s.text.strip()))
    print(f"{s.start:7.2f}-{s.end:7.2f}  {s.text.strip()}")
    for w in s.words or []:
        words.append(dict(start=round(w.start, 3), end=round(w.end, 3), word=w.word.strip(), p=round(w.probability, 3)))
Path(out).write_text(json.dumps(dict(model=model_name, segments=lines, words=words), indent=1), encoding="utf-8")
print(f"[transcribe] {len(words)} words in {time.time() - t0:.0f}s -> {out}")
