"""Cut figures out of white-background character sheets.

    python3 tools/extract_white.py <image> <out_dir> name1,name2[,...]   (figures left→right)
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
TARGET_H = 440
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
d = np.linalg.norm(im - 255, axis=2)
fg = d > 22
fg = ndimage.binary_closing(fg, iterations=2)
# split into len(names) columns at the widest empty vertical gaps
cols = fg.sum(axis=0) > 0
runs, start = [], None
for x, v in enumerate(cols):
    if v and start is None: start = x
    if not v and start is not None: runs.append([start, x]); start = None
if start is not None: runs.append([start, len(cols)])
# merge runs until we have len(names)
while len(runs) > len(names):
    gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
    i = int(np.argmin(gaps)); runs[i] = [runs[i][0], runs[i + 1][1]]; del runs[i + 1]
print(runs)
for name, (x0, x1) in zip(names, runs):
    crop = im[:, x0:x1]
    dist = d[:, x0:x1]
    solid = dist > 22
    # keep the largest blob, fill holes inside the silhouette
    lab, n = ndimage.label(ndimage.binary_closing(solid, iterations=3), structure=np.ones((3, 3)))
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    body = lab == (1 + int(np.argmax(sizes)))
    body = ndimage.binary_dilation(body, iterations=1)
    alpha = np.clip((dist - 10) / 40.0, 0, 1) * body
    # decontaminate the white fringe on semi-transparent edge pixels
    a = np.clip(alpha, 1e-3, 1)[..., None]
    rgb = np.where(alpha[..., None] < 1, np.clip((crop - 255 * (1 - a)) / a, 0, 255), crop)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    ys, xs = np.where(alpha > 0.05)
    rgba = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    img = Image.fromarray(rgba, 'RGBA')
    w = round(img.width * TARGET_H / img.height)
    img = img.convert('RGBa').resize((w, TARGET_H), Image.LANCZOS).convert('RGBA')
    img.save(f'{out}/{name}.png', optimize=True)
    print(name, img.size)
