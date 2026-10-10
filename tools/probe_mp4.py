"""Inspect an MP4 (streams, duration, audio level) and dump frames at given times to PNG.
usage: tools/.venv/Scripts/python.exe tools/probe_mp4.py out/x.mp4 outdir t1 t2 ..."""
import sys
from pathlib import Path
import av
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
src, outdir = sys.argv[1], Path(sys.argv[2])
times = [float(t) for t in sys.argv[3:]]
outdir.mkdir(parents=True, exist_ok=True)
with av.open(src) as c:
    print("container", c.format.name, "duration", round(c.duration / 1e6, 2), "s")
    for s in c.streams:
        if s.type == "video":
            print("video", s.codec_context.name, s.codec_context.width, "x", s.codec_context.height,
                  "fps", float(s.average_rate), "pix", s.codec_context.pix_fmt, "frames", s.frames)
        elif s.type == "audio":
            print("audio", s.codec_context.name, s.codec_context.sample_rate, "Hz", s.codec_context.channels if hasattr(s.codec_context, "channels") else s.codec_context.layout.name)
with av.open(src) as c:
    pk = []
    for fr in c.decode(audio=0):
        a = fr.to_ndarray().astype(np.float32)
        pk.append(float(np.sqrt((a ** 2).mean())))
    pk = np.array(pk)
    print("audio rms first/mid/last packets:", pk[:3].round(4).tolist(), pk[len(pk) // 2].round(4), pk[-3:].round(4).tolist())
with av.open(src) as c:
    vs = c.streams.video[0]
    want = sorted(times)
    for fr in c.decode(video=0):
        t = float(fr.pts * vs.time_base)
        while want and t >= want[0] - 1e-3:
            p = outdir / f"mp4_{want[0]:07.2f}.png"
            fr.to_image().save(p)
            print("frame", round(t, 3), "->", p.name, "mean", round(float(np.asarray(fr.to_image()).mean()), 1))
            want.pop(0)
        if not want:
            break
