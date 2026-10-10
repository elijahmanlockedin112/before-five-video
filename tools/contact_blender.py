"""Tile PNG stills into labelled contact sheets (run inside Blender for its image IO + numpy).
blender -b --factory-startup -P contact.py -- <dir> <out_prefix> [cols] [per_sheet]"""
import sys
from pathlib import Path
import numpy as np
import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
src, prefix = Path(argv[0]).resolve(), str(Path(argv[1]).resolve())
cols = int(argv[2]) if len(argv) > 2 else 4
per = int(argv[3]) if len(argv) > 3 else 20
files = sorted(list(src.glob("still_*.png")) + list(src.glob("t*.jpg")) + list(src.glob("mp4_*.png")))
TW, TH = 480, 270


def load(p):
    im = bpy.data.images.load(str(p))
    w, h = im.size
    a = np.empty(w * h * 4, dtype=np.float32)
    im.pixels.foreach_get(a)
    a = a.reshape(h, w, 4)
    bpy.data.images.remove(im)
    ys = (np.arange(TH) * h / TH).astype(int)
    xs = (np.arange(TW) * w / TW).astype(int)
    return a[ys][:, xs]


for s in range(0, len(files), per):
    chunk = files[s:s + per]
    rows = (len(chunk) + cols - 1) // cols
    sheet = np.zeros((rows * (TH + 4), cols * (TW + 4), 4), dtype=np.float32)
    sheet[..., 3] = 1
    for k, p in enumerate(chunk):
        r, c = divmod(k, cols)
        y0 = (rows - 1 - r) * (TH + 4)   # blender images are bottom-up
        x0 = c * (TW + 4)
        sheet[y0:y0 + TH, x0:x0 + TW] = load(p)
    H, W = sheet.shape[:2]
    im = bpy.data.images.new("sheet", W, H, alpha=True)
    im.pixels.foreach_set(sheet.ravel())
    out = f"{prefix}_{s // per + 1}.png"
    im.filepath_raw = out
    im.file_format = "PNG"
    im.save()
    print("[contact]", out, [p.stem.replace("still_", "") for p in chunk])
