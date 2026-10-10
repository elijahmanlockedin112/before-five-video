"""Audio analysis, run inside Blender (uses its bundled aud + numpy).

blender -b --factory-startup -P mv_analyze.py -- <audio> <out.json> [fps]

Writes per-video-frame envelopes (kick / snare / hat / rms / mid / onset), the beat grid,
downbeats, and a per-bar table, plus <out>.png (band energy over time) for eyeballing.
"""
import sys, json, math
import numpy as np
import aud

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[0], argv[1]
FPS = float(argv[2]) if len(argv) > 2 else 24.0

snd = aud.Sound(SRC)
rate, chans = int(snd.specs[0]), int(snd.specs[1])
x = np.asarray(snd.data(), dtype=np.float32)
if x.ndim == 2:
    x = x.mean(axis=1)
dur = len(x) / rate
print(f"[analyze] {SRC}: {dur:.2f}s @ {rate} Hz, {chans} ch")

# ---------------------------------------------------------------- STFT
HOP, WIN = 512, 2048
win = np.hanning(WIN).astype(np.float32)
nfr = 1 + (len(x) - WIN) // HOP
idx = np.arange(WIN)[None, :] + HOP * np.arange(nfr)[:, None]
spec = np.abs(np.fft.rfft(x[idx] * win, axis=1)).astype(np.float32)
freqs = np.fft.rfftfreq(WIN, 1 / rate)
ft = (np.arange(nfr) * HOP + WIN / 2) / rate  # frame centre times
ofps = rate / HOP

def band(lo, hi):
    m = (freqs >= lo) & (freqs < hi)
    return spec[:, m]

def flux(b):
    lb = np.log1p(b * 20)
    d = np.diff(lb, axis=0, prepend=lb[:1])
    return np.maximum(d, 0).sum(axis=1)

def norm(v, pct=99.0):
    hi = np.percentile(v, pct) + 1e-9
    return np.clip(v / hi, 0, 1)

low_e = band(30, 150).sum(axis=1)
mid_e = band(300, 3400).sum(axis=1)
high_e = band(6000, 16000).sum(axis=1)
kick_f = norm(flux(band(30, 150)))
snare_f = norm(flux(band(1500, 5000)))
hat_f = norm(flux(band(7000, 16000)))
onset = norm(flux(spec))
rms_fr = np.sqrt((x[idx] ** 2).mean(axis=1))

# ---------------------------------------------------------------- tempo + beats (Ellis DP)
oe = onset - np.convolve(onset, np.ones(int(ofps)) / int(ofps), mode="same")
oe = np.maximum(oe, 0)
ac = np.correlate(oe, oe, mode="full")[len(oe) - 1:]
lags = np.arange(len(ac))
bpm_of = 60 * ofps / np.maximum(lags, 1)
w = np.exp(-0.5 * (np.log2(bpm_of / 120.0) / 0.9) ** 2)
valid = (bpm_of > 60) & (bpm_of < 200)
score = np.where(valid, ac * w, 0)
lag0 = int(np.argmax(score))
# refine with parabolic interp
if 1 <= lag0 < len(score) - 1:
    a, b, c = score[lag0 - 1:lag0 + 2]
    lagf = lag0 + 0.5 * (a - c) / (a - 2 * b + c + 1e-12)
else:
    lagf = float(lag0)
tempo = 60 * ofps / lagf
period = lagf
print(f"[analyze] tempo estimate {tempo:.2f} BPM")

alpha = 400.0
N = len(oe)
D = oe.astype(np.float64).copy()
back = np.full(N, -1, dtype=np.int64)
lo_l, hi_l = int(round(period * 0.5)), int(round(period * 2.0))
for t in range(N):
    s, e = t - hi_l, t - lo_l
    if e <= 0:
        continue
    s = max(s, 0)
    prev = np.arange(s, e)
    pen = -alpha * (np.log((t - prev) / period)) ** 2
    cand = D[prev] + pen
    k = int(np.argmax(cand))
    if cand[k] > 0:
        D[t] = oe[t] + cand[k]
        back[t] = prev[k]
# pick end in last period
tail = np.arange(max(0, N - int(period * 2)), N)
t = int(tail[np.argmax(D[tail])])
beats = []
while t >= 0:
    beats.append(t)
    t = int(back[t])
beats = np.array(beats[::-1])
beat_t = ft[beats]
print(f"[analyze] {len(beat_t)} beats, first {beat_t[:4].round(2).tolist()}")

# downbeat phase: kick on 1, snare on 2/4 (metal back-beat)
def at(v, frames):
    return v[np.clip(frames, 0, len(v) - 1)]
best, best_ph = -1e9, 0
for ph in range(4):
    sel = np.arange(ph, len(beats), 4)
    s2 = np.concatenate([np.arange(ph + 1, len(beats), 4), np.arange(ph + 3, len(beats), 4)])
    sc = at(kick_f, beats[sel]).mean() + at(snare_f, beats[s2]).mean() - 0.5 * at(snare_f, beats[sel]).mean()
    if sc > best:
        best, best_ph = sc, ph
down_t = beat_t[best_ph::4]

# ---------------------------------------------------------------- envelopes at video frames
nv = int(math.ceil(dur * FPS))
vt = np.arange(nv) / FPS

def env(v, attack=1.0, release=0.80):
    """peak-follow at analysis rate, then sample at video frames (max within frame)."""
    o = np.zeros_like(v)
    p = 0.0
    for i, s in enumerate(v):
        p = s if s > p else p * release
        o[i] = p
    res = np.zeros(nv)
    for i in range(nv):
        a = int(vt[i] * ofps)
        b = max(a + 1, int((vt[i] + 1 / FPS) * ofps))
        res[i] = o[a:b].max() if a < len(o) else 0
    return res

def smooth_at(v, sec):
    k = max(1, int(sec * ofps))
    sm = np.convolve(v, np.ones(k) / k, mode="same")
    return np.interp(vt, ft, sm)

kick_v = env(kick_f, release=0.86)
snare_v = env(snare_f, release=0.84)
hat_v = env(hat_f, release=0.7)
onset_v = env(onset, release=0.8)
rms_v = smooth_at(rms_fr, 0.25)
rms_v = rms_v / (np.percentile(rms_v, 99) + 1e-9)
mid_v = smooth_at(mid_e, 0.06)
mid_v = norm(mid_v)
loud_slow = smooth_at(rms_fr, 2.0)
loud_slow = loud_slow / (loud_slow.max() + 1e-9)

# ---------------------------------------------------------------- per-bar table
bars = []
for i, t0 in enumerate(down_t):
    t1 = down_t[i + 1] if i + 1 < len(down_t) else dur
    m = (ft >= t0) & (ft < t1)
    if not m.any():
        continue
    cen = (spec[m] * freqs).sum() / (spec[m].sum() + 1e-9)
    bars.append(dict(i=i, t=round(float(t0), 3), rms=round(float(rms_fr[m].mean()), 4),
                     low=round(float(low_e[m].mean()), 2), mid=round(float(mid_e[m].mean()), 2),
                     high=round(float(high_e[m].mean()), 2), cen=round(float(cen), 0),
                     kick=round(float(kick_f[m].mean()), 3), snare=round(float(snare_f[m].mean()), 3)))

res = dict(src=SRC, duration=dur, fps=FPS, tempo=tempo, beats=beat_t.round(4).tolist(),
           downbeats=down_t.round(4).tolist(), downbeat_phase=best_ph, bars=bars,
           frames=dict(kick=kick_v.round(4).tolist(), snare=snare_v.round(4).tolist(),
                       hat=hat_v.round(4).tolist(), onset=onset_v.round(4).tolist(),
                       rms=rms_v.round(4).tolist(), mid=mid_v.round(4).tolist(),
                       loud=loud_slow.round(4).tolist()))
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(res, f)
print(f"[analyze] wrote {OUT}: {nv} frames, {len(bars)} bars")
rmax = max(b["rms"] for b in bars)
for b in bars:
    bar = "#" * int(40 * b["rms"] / rmax)
    print(f"  bar {b['i']:3d} {b['t']:7.2f}s rms {b['rms']:.3f} cen {int(b['cen']):5d} kick {b['kick']:.2f} sn {b['snare']:.2f} {bar}")

# ---------------------------------------------------------------- PNG overview
try:
    import bpy
    W, H = 1800, 360
    img = np.zeros((H, W, 4), dtype=np.float32); img[..., 3] = 1
    rows = [(low_e, (1, .35, .1)), (mid_e, (.9, .85, .3)), (high_e, (.3, .7, 1)), (rms_fr, (1, 1, 1))]
    rh = H // len(rows)
    for r, (v, col) in enumerate(rows):
        vv = np.interp(np.linspace(0, dur, W), ft, v)
        vv = vv / (np.percentile(vv, 99.5) + 1e-9)
        for xpx in range(W):
            hgt = int(min(1, vv[xpx]) * (rh - 4))
            y0 = (len(rows) - 1 - r) * rh
            img[y0:y0 + hgt, xpx, :3] = col
    for s in range(0, int(dur) + 1, 10):  # 10 s ticks
        xp = int(s / dur * (W - 1))
        img[:, xp, :3] = 0.35 if s % 30 else 0.8
    im = bpy.data.images.new("ana", W, H, alpha=True)
    im.pixels.foreach_set(img.ravel())
    im.filepath_raw = OUT.replace(".json", ".png")
    im.file_format = "PNG"
    im.save()
    print("[analyze] png", im.filepath_raw)
except Exception as e:
    print("[analyze] png skipped:", e)
