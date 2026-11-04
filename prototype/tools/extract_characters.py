"""High-quality re-extraction of the 6 character cutouts from the design sheet.

Improvements over v1:
- background modelled per-row from both crop edges (handles the paper's vertical gradient)
- enclosed paper pockets (between arm/body, legs) removed, not just border-connected paper
- neighbour slivers / stray sheet text dropped by keeping only centred connected components
- soft alpha in a thin edge band + colour decontamination (no cream halo on dark backgrounds)
- premultiplied LANCZOS resample to a fixed height for clean in-game downscaling
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = sys.argv[1]
OUT = sys.argv[2]
TARGET_H = 440

BOXES = {
    'yasuda': (212, 88, 404, 600),
    'cheongok': (398, 78, 600, 600),
    'ganemura': (612, 78, 800, 600),
    'gangseong': (800, 84, 1004, 600),
    'sunju': (1008, 120, 1188, 600),
    'akiko': (1186, 92, 1385, 600),
    # 군복 변형 (시트 좌하단의 작은 전신 일러스트 — 원본이 작아서 업스케일됨)
    'yasuda_army': (300, 892, 384, 1086),
}

# enclosed paper pockets: tolerance per character, kept below the distance between
# that character's lightest clothing and the paper so cream blouses/aprons survive
POCKET_TOL = {'akiko': 20, 'sunju': 22, 'cheongok': 30, 'yasuda': 62, 'ganemura': 62, 'gangseong': 40, 'yasuda_army': 36}
# border flood-fill tolerance: cream blouses with faint ink outlines need a tight value or the
# fill leaks through the outline and eats the sleeve
FLOOD_TOL = {'akiko': 30, 'sunju': 34}
DEFAULT_FLOOD_TOL = 55

src = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)

# global paper reference: the most common light, low-saturation colour on the sheet
sheet = src[100:600, 200:1400].reshape(-1, 3)
light = sheet[(sheet.min(axis=1) > 195) & (sheet.max(axis=1) - sheet.min(axis=1) < 30)]
PAPER = np.median(light, axis=0)

for name, (x0, y0, x1, y1) in BOXES.items():
    crop = src[y0:y1, x0:x1]
    h, w, _ = crop.shape

    # per-row paper colour from paper-like pixels only (robust to neighbours / sheet art at edges),
    # smoothed vertically to follow the sheet's gentle gradient
    paper_like = np.linalg.norm(crop - PAPER, axis=2) < 40
    row_bg = np.tile(PAPER, (h, 1))
    for y in range(h):
        px = crop[y][paper_like[y]]
        if len(px) >= 8:
            row_bg[y] = np.median(px, axis=0)
    row_bg = ndimage.uniform_filter1d(row_bg, size=25, axis=0)
    bg = np.repeat(row_bg[:, None, :], w, axis=1)

    dist = np.linalg.norm(crop - bg, axis=2)

    bg_like = dist < FLOOD_TOL.get(name, DEFAULT_FLOOD_TOL)
    labels, n = ndimage.label(bg_like, structure=np.ones((3, 3)))
    border = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    background = np.isin(labels, list(border))

    # enclosed pockets of paper
    strict = (dist < POCKET_TOL[name]) & ~background
    plabels, pn = ndimage.label(strict)
    if pn:
        sizes = ndimage.sum(np.ones_like(dist), plabels, range(1, pn + 1))
        for i, size in enumerate(sizes, start=1):
            if size > 160:
                background |= plabels == i

    fg = ~background
    fg = ndimage.binary_opening(fg, iterations=1)
    # fill only tiny specks inside the figure — real paper pockets were removed on purpose above
    holes = ndimage.binary_fill_holes(fg) & ~fg
    hlabels, hn = ndimage.label(holes)
    if hn:
        hsizes = ndimage.sum(holes, hlabels, range(1, hn + 1))
        small = np.isin(hlabels, [i for i, s in enumerate(hsizes, start=1) if s < 60])
        fg |= small

    # keep the main figure + centred satellite parts; drop neighbour slivers and sheet text
    flabels, fn = ndimage.label(fg, structure=np.ones((3, 3)))
    sizes = ndimage.sum(fg, flabels, range(1, fn + 1))
    largest = sizes.max()
    keep = np.zeros_like(fg)
    for i, size in enumerate(sizes, start=1):
        comp = flabels == i
        cy, cx = ndimage.center_of_mass(comp)
        touches_side = comp[:, :3].any() or comp[:, -3:].any()
        if size == largest or (size > 0.01 * largest and not touches_side and 0.18 * w < cx < 0.82 * w and cy > 0.1 * h):
            keep |= comp
    fg = keep
    # neighbour slivers fused onto the main figure only via the floor/shadow line: if a near-empty
    # column gap exists close to a side edge, everything between that edge and the gap is a sliver
    col_fill = fg[: int(h * 0.92)].mean(axis=0)
    for c in range(3, w // 5):
        if col_fill[c] < 0.01 and col_fill[:c].max() > 0.05:
            fg[:, :c] = False
            break
    for c in range(w - 4, w - w // 5, -1):
        if col_fill[c] < 0.01 and col_fill[c:].max() > 0.05:
            fg[:, c:] = False
            break

    # soft alpha only inside a thin band around the silhouette edge
    inner = ndimage.binary_erosion(fg, iterations=2)
    outer = ndimage.binary_dilation(fg, iterations=1)
    soft = np.clip((dist - 16) / (52 - 16), 0, 1)
    alpha = np.where(inner, 1.0, np.where(outer, soft * outer, 0.0))
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))) / 255.0
    alpha[inner] = 1.0

    # colour decontamination: remove the paper colour bleeding into semi-transparent edge pixels
    a = np.clip(alpha, 1e-3, 1)[..., None]
    rgb = np.clip((crop - (1 - a) * bg) / a, 0, 255)
    rgb = np.where(alpha[..., None] > 0.98, crop, rgb)

    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')

    ys, xs = np.where(alpha > 0.05)
    pad = 6
    im = im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(w, xs.max() + pad), min(h, ys.max() + pad)))

    scale = TARGET_H / im.height
    im = im.convert('RGBa').resize((round(im.width * scale), TARGET_H), Image.LANCZOS).convert('RGBA')
    im.save(f'{OUT}/{name}.png', optimize=True)
    print(name, im.size)
