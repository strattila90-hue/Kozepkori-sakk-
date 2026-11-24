#!/usr/bin/env python3
"""Az eredeti festett figurák (assets/src/*.jpg) feldolgozása játék-sprite-okká:
háttér eltávolítása, kivágás, kicsinyítés, 4 seregszínű változat (fehér, fekete, vörös, arany) -> assets/figs/*.webp"""
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageFilter

SRC = os.path.join(os.path.dirname(__file__), '..', 'assets', 'src')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'figs')
H = 340

# Talp-vonal: a forrás-kép magasságának hányada, ami alatt a talapzat van (levágjuk, a bábuk a saját lábukon járnak).
FOOT = {'K_front': .83, 'Q_front': .845, 'P_front': .775, 'B_front': .80, 'N_front': None, 'R_front': .79,
        'K_back': .815, 'Q_back': .81, 'P_back': .79, 'B_back': .82, 'N_back': None, 'R_back': .84,
        'K_side': .775, 'Q_side': .81, 'P_side': .81, 'B_side': .82, 'N_side': None, 'R_side': .80}

def bg_mask(a, bottom=True):
    near = (a[..., :3].min(axis=2) >= 240)
    bg = np.zeros_like(near)
    bg[0, :] = near[0, :]; bg[:, 0] = near[:, 0]; bg[:, -1] = near[:, -1]
    if bottom: bg[-1, :] = near[-1, :]
    while True:
        n = bg.copy()
        n[1:, :] |= bg[:-1, :]; n[:-1, :] |= bg[1:, :]; n[:, 1:] |= bg[:, :-1]; n[:, :-1] |= bg[:, 1:]
        n &= near
        if (n == bg).all(): break
        bg = n
    return bg

def cut(path, H=H, crop_y=None):
    im = Image.open(path).convert('RGB')
    if crop_y: im = im.crop((0, 0, im.width, int(im.height * crop_y)))
    a = np.array(im)
    bg = bg_mask(a, crop_y is None)
    alpha = (~bg).astype(np.uint8) * 255
    al = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.9))
    al_np = np.array(al).astype(np.float32) / 255
    # fehér peremszín eltüntetése (unpremultiply a fehérről)
    rgb = a.astype(np.float32)
    k = np.clip(al_np, 0.06, 1)[..., None]
    rgb = np.clip((rgb - 255 * (1 - k)) / k, 0, 255)
    out = np.dstack([rgb, al_np * 255]).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    bb = img.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    box = (max(0, bb[0] - 2), max(0, bb[1] - 2), min(img.width, bb[2] + 2), min(img.height, bb[3] + 2)); cut.last_box = box
    img = img.crop(box)
    w = round(img.width * H / img.height); cut.last_h = img.height
    return img.resize((w, H), Image.LANCZOS)

def rgb2hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = rgb.max(axis=-1); mn = rgb.min(axis=-1); d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = m & (mx == r); gc = m & (mx == g) & ~rc; bc = m & ~rc & ~gc
    h[rc] = ((g - b)[rc] / d[rc]) % 6
    h[gc] = (b - r)[gc] / d[gc] + 2
    h[bc] = (r - g)[bc] / d[bc] + 4
    h = h / 6.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    return h, s, mx

def hsv2rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6; f = h * 6 - np.floor(h * 6)
    p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], axis=-1)

def tint(img, army, ptype):
    if army == 'red' and ptype not in ('N', 'B'): return img
    a = np.array(img).astype(np.float32) / 255
    rgb = a[..., :3]; al = a[..., 3]
    h, s, v = rgb2hsv(rgb)
    red = (s > 0.35) & ((h < 0.045) | (h > 0.93)) & (v > 0.25)
    blue = (s > 0.30) & (h > 0.52) & (h < 0.75) & (v > 0.2)
    dark = (s < 0.45) & (v > 0.12) & (v < 0.52)   # sötét ruha (püspök)
    H2, S2, V2 = h.copy(), s.copy(), v.copy()
    if army == 'white':
        H2[red] = 0.58; S2[red] = 0.30 + 0.2 * s[red]; V2[red] = np.minimum(1, 0.72 + 0.35 * v[red])
        H2[blue] = 0.47; S2[blue] = 0.22; V2[blue] = np.minimum(1, 0.5 + 0.55 * v[blue])
        if ptype == 'B':
            w = np.clip((0.62 - v) / 0.25, 0, 1) * np.clip((v - 0.07) / 0.1, 0, 1) * (s < 0.6)
            V2 = v * (1 - w) + np.minimum(1, 0.42 + v * 1.3) * w; S2 = s * (1 - w) + 0.1 * w; H2 = np.where(w > 0, 0.1, H2)
    elif army == 'black':
        H2[red] = 0.77; S2[red] = 0.72; V2[red] = np.minimum(1, v[red] * 0.7)
        H2[blue] = 0.72; S2[blue] = 0.8; V2[blue] = np.minimum(1, v[blue] * 0.78)
    elif army == 'red' and ptype == 'B':
        w = np.clip((0.62 - v) / 0.25, 0, 1) * np.clip((v - 0.07) / 0.1, 0, 1) * (s < 0.6)
        H2 = np.where(w > 0, 0.0, H2); S2 = s * (1 - w) + 0.6 * w; V2 = v * (1 - w) + np.minimum(1, v * 1.7 + 0.1) * w
    elif army == 'gold':
        H2[red] = 0.115; S2[red] = 0.85; V2[red] = np.minimum(1, v[red] * 1.05 + 0.08)
        H2[blue] = 0.07; S2[blue] = 0.55; V2[blue] = v[blue] * 0.75
        if ptype == 'B':
            w = np.clip((0.62 - v) / 0.25, 0, 1) * np.clip((v - 0.07) / 0.1, 0, 1) * (s < 0.6)
            H2 = np.where(w > 0, 0.1, H2); S2 = s * (1 - w) + 0.6 * w; V2 = v * (1 - w) + np.minimum(1, v * 1.6 + 0.12) * w
    if ptype == 'N':
        rows = np.arange(v.shape[0])[:, None] / v.shape[0] * np.ones_like(v)
        t = np.clip((rows - 0.17) / 0.14, 0, 1); t = t * t * (3 - 2 * t)
        w = t * (s < 0.22) * (v > 0.42)
        for army_, hh, ss, vm in (('black', 0.72, 0.3, 0.42), ('red', 0.0, 0.42, 0.9), ('gold', 0.115, 0.6, 1.0)):
            if army == army_:
                H2 = np.where(w > 0.01, hh, H2); S2 = s * (1 - w) + ss * w; V2 = v * (1 - w) + np.minimum(1, v * vm) * w
    boost = (S2 > 0.18)
    S2 = np.where(boost, np.minimum(1, S2 * 1.28 + 0.06), S2); V2 = np.where(boost & (V2 < 0.97), np.minimum(1, V2 * 1.06), V2)
    out = hsv2rgb(H2, S2, V2)
    res = np.dstack([out, al])
    return Image.fromarray((np.clip(res, 0, 1) * 255).astype(np.uint8), 'RGBA')

def main():
    os.makedirs(OUT, exist_ok=True)
    mp = os.path.join(OUT, 'meta.json'); meta = json.load(open(mp)) if os.path.exists(mp) else {}
    EX = {'x_castle': (None, 420), 'x_tavern': (None, 420), 'x_pigfarm': (None, 360), 'x_crowd1': (0.755, 360), 'x_crowd2': (0.69, 360), 'x_crowd4': (0.765, 360)}

    for f in ([] if 'figs' in sys.argv else sorted(glob.glob(os.path.join(SRC, 'x_*.jpg')))):
        key = os.path.basename(f)[:-4]; cy, hh = EX.get(key, (None, 420 if 'dragon' in key else 320))
        if len(sys.argv) > 1 and sys.argv[1] not in ('figs',) and sys.argv[1] not in key: continue
        im = cut(f, hh, cy)
        if 'crowd' in key:  # a lábak közti fehér kitöltés: az alsó 45%-ban minden közel-fehér átlátszó, a perem lágy
            a = np.array(im).astype(np.float32); H_ = a.shape[0]; r0 = int(H_ * 0.52)
            mn = a[r0:, :, :3].min(axis=2); k = np.clip((mn - 205) / 40.0, 0, 1)
            a[r0:, :, 3] = a[r0:, :, 3] * (1 - k)
            im = Image.fromarray(a.astype(np.uint8), 'RGBA')
        im.save(os.path.join(OUT, key + '.webp'), 'WEBP', quality=84, method=6); meta[key] = {'w': im.width, 'h': im.height}; print(key, im.size)
    for f in sorted(glob.glob(os.path.join(SRC, '[A-Z]_*.jpg'))):
        key = os.path.basename(f)[:-4]; ptype, view = key.split('_')
        if len(sys.argv) > 1 and sys.argv[1] not in ('figs',) and sys.argv[1] not in key: continue
        cut(f); full_h = cut.last_h; fb = cut.last_box
        fy = FOOT.get(key); base = cut(f, H, fy) if fy else cut(f); nb = cut.last_box
        fw = fb[2] - fb[0]
        # a fej-téglalapok átszámításához: új = (régi * régi_méret - eltolás) / új_méret
        meta[key] = {'w': base.width, 'h': base.height, 'ratio': round(full_h / cut.last_h, 4), 'xo': round((nb[0] - fb[0]) / fw, 4), 'xr': round(fw / (nb[2] - nb[0]), 4)}
        for army in ('white', 'black', 'red', 'gold'):
            tint(base, army, ptype).save(os.path.join(OUT, f'{key}_{army}.webp'), 'WEBP', quality=84, method=6)
        print(key, base.size, meta[key]['ratio'], flush=True)
    json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'))

if __name__ == '__main__': main()
