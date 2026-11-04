"""Derives the extra cast members from the extracted design-sheet cutouts.

    python3 tools/make_variants.py <characters dir>

- yasuda_old / ganemura_old : the 1990s old men — desaturated, warm-greyed, white hair
- masayo / megumi          : 아키코's friend & cousin — palette-shifted, slightly smaller, mirrored
(yasuda_army comes straight from extract_characters.py's 'yasuda_army' box, cleaned of the
neighbouring portrait's shoulder by `clean_army` below.)
"""
import sys
import colorsys
import numpy as np
from PIL import Image
from scipy import ndimage

DIR = sys.argv[1]


def load(name):
    return np.array(Image.open(f'{DIR}/{name}.png').convert('RGBA')).astype(np.float32)


def save(arr, name, scale=1.0, mirror=False):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGBA')
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if scale != 1.0:
        im = im.convert('RGBa').resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS).convert('RGBA')
    im.save(f'{DIR}/{name}.png', optimize=True)
    print(name, im.size)


def hsv_shift(arr, hue_deg, sat_mul=1.0, val_mul=1.0, protect_skin=True):
    rgb = arr[..., :3] / 255.0
    flat = rgb.reshape(-1, 3)
    out = np.empty_like(flat)
    for i, (r, g, b) in enumerate(flat):
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        skin = protect_skin and 0.02 < h < 0.11 and 0.25 < s < 0.7 and v > 0.55
        if not skin:
            h = (h + hue_deg / 360.0) % 1.0
            s = min(1.0, s * sat_mul)
            v = min(1.0, v * val_mul)
        out[i] = colorsys.hsv_to_rgb(h, s, v)
    res = arr.copy()
    res[..., :3] = out.reshape(rgb.shape) * 255
    return res


def old_man(name, whiten_hair=True):
    a = load(name)
    rgb = a[..., :3]
    lum = rgb.mean(axis=2, keepdims=True)
    # desaturate toward a warm grey: 1990s memory, and age
    rgb = lum + (rgb - lum) * 0.55
    rgb = rgb * np.array([1.04, 1.0, 0.92])
    if whiten_hair:
        h, w = a.shape[:2]
        # hair = dark pixels in the head box, above the eyes. Yasuda's hairline sits at ~6-8% of the
        # figure's height (x between 36%..82% of width); lower than that is brow/eyes/mouth, which
        # must stay dark or the face disappears.
        yy, xx = np.mgrid[0:h, 0:w]
        fy = yy / h
        inside_x = (xx > w * 0.34) & (xx < w * 0.84)
        # fade the whitening out between the bangs (~7%) and the brows (~9%) instead of cutting on a line
        fade = np.clip((0.090 - fy) / 0.022, 0.0, 1.0)
        # the temple tuft further down, kept clear of the eyes
        tuft = ((fy < 0.115) & ((xx < w * 0.50) | (xx > w * 0.76)) & inside_x).astype(np.float32)
        weight = np.maximum(fade * inside_x, tuft)
        l = rgb.mean(axis=2)
        is_hair = (l < 120) & (a[..., 3] > 60)
        is_hair = ndimage.binary_dilation(is_hair, iterations=1) & (l < 140)
        wgt = (weight * is_hair)[..., None]
        new = (150 + (l - 20) * 0.9)[..., None]
        rgb = rgb * (1 - wgt) + new * wgt
    a[..., :3] = rgb
    return a


def clean_army():
    """The sheet's uniform figure still carries a fragment of the neighbouring bust portrait."""
    a = load('yasuda_army').astype(int)
    h, w = a.shape[:2]
    lum = a[..., :3].mean(axis=2)
    yy, xx = np.mgrid[0:h, 0:w]
    blob = (xx < 0.24 * w) & (yy > 0.55 * h) & (yy < 0.92 * h) & (lum > 120)
    blob = ndimage.binary_dilation(blob, iterations=2)
    a[..., 3][blob] = 0
    alpha = a[..., 3] > 40
    labels, n = ndimage.label(alpha, structure=np.ones((3, 3)))
    sizes = ndimage.sum(alpha, labels, range(1, n + 1))
    keep = np.isin(labels, [i for i, s in enumerate(sizes, start=1) if s > 0.05 * sizes.max()])
    a[..., 3][~keep] = 0
    ys, xs = np.where(a[..., 3] > 10)
    a = a[max(0, ys.min() - 4): ys.max() + 4, max(0, xs.min() - 4): xs.max() + 4]
    save(a.astype(np.float32), 'yasuda_army')


if __name__ == '__main__':
    save(old_man('yasuda'), 'yasuda_old')
    save(old_man('ganemura', whiten_hair=False), 'ganemura_old')
    clean_army()
    # 마사요: blue-green blouse + warm skirt, younger (smaller), facing the other way
    save(hsv_shift(load('sunju'), 150, 1.1, 1.08), 'masayo', scale=0.92, mirror=True)
    # 메구미: rose skirt shifted to teal, a touch smaller still
    save(hsv_shift(load('akiko'), -80, 1.15, 1.05), 'megumi', scale=0.9, mirror=False)
