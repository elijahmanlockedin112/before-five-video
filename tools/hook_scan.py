"""Score candidate beat positions for the shouted hooks using a vocal-band onset curve."""
import sys, json
import numpy as np
import av

sys.stdout.reconfigure(encoding="utf-8")


def decode(path, rate=22050):
    ch = []
    with av.open(path) as c:
        rs = av.AudioResampler(format="flt", layout="mono", rate=rate)
        for fr in c.decode(audio=0):
            for o in rs.resample(fr):
                ch.append(o.to_ndarray().reshape(-1))
    return np.concatenate(ch), rate


x, sr = decode(sys.argv[1])
ana = json.load(open(sys.argv[2]))
beats = np.array(ana["beats"])
HOP, WIN = 220, 1024  # 10 ms hops
n = 1 + (len(x) - WIN) // HOP
idx = np.arange(WIN)[None, :] + HOP * np.arange(n)[:, None]
S = np.abs(np.fft.rfft(x[idx] * np.hanning(WIN), axis=1))
f = np.fft.rfftfreq(WIN, 1 / sr)
band = S[:, (f > 700) & (f < 3500)]
lb = np.log1p(band * 30)
flux = np.maximum(np.diff(lb, axis=0, prepend=lb[:1]), 0).sum(1)
flux /= np.percentile(flux, 99)
t = (np.arange(n) * HOP + WIN / 2) / sr


def score(tt):
    m = (t > tt - 0.06) & (t < tt + 0.08)
    return flux[m].max() if m.any() else 0


spans = [(41.0, 44.5), (47.6, 51.0), (95.4, 98.6), (101.6, 105.0), (137.2, 140.2), (143.4, 146.6)]
if len(sys.argv) > 3:
    spans = [tuple(map(float, s.split(":"))) for s in sys.argv[3:]]
for lo, hi in spans:
    bb = beats[(beats >= lo) & (beats <= hi)]
    print(f"{lo:6.1f}: " + "  ".join(f"{b:.2f}={score(b):.2f}" for b in bb))
    # also the 8th-note offbeats
    print("        off: " + "  ".join(f"{b + 0.2:.2f}={score(b + 0.2):.2f}" for b in bb))
