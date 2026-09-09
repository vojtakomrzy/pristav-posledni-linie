#!/usr/bin/env python3
"""Install Grafik export pack v1 into assets/ (960×600 maps, keyed sheets, HUD)."""
from __future__ import annotations

import json
import os
import subprocess
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = Path('/opt/cursor/artifacts/assets')
ATLAS_HTML = ROOT / 'scripts' / 'pack-atlas.html'
ATLAS_SHOT = Path('/tmp/pristav-atlas.png')


def cover_resize(im: Image.Image, w: int, h: int) -> Image.Image:
    im = im.convert('RGBA')
    scale = max(w / im.width, h / im.height)
    nw, nh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x = max(0, (nw - w) // 2)
    y = max(0, (nh - h) // 2)
    return im.crop((x, y, x + w, y + h))


def luma(arr: np.ndarray) -> np.ndarray:
    return arr[:, :, 0] * 0.2126 + arr[:, :, 1] * 0.7152 + arr[:, :, 2] * 0.0722


def punch_edge_bg(im: Image.Image, thresh: float = 42.0, feather: int = 2) -> Image.Image:
    arr = np.array(im.convert('RGBA'))
    h, w = arr.shape[:2]
    dark = luma(arr) < thresh
    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        if dark[0, x]:
            bg[0, x] = True
            q.append((0, x))
        if dark[h - 1, x]:
            bg[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if dark[y, 0]:
            bg[y, 0] = True
            q.append((y, 0))
        if dark[y, w - 1]:
            bg[y, w - 1] = True
            q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and dark[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    alpha = arr[:, :, 3].astype(np.float32)
    alpha[bg] = 0
    if feather:
        mask = Image.fromarray((~bg).astype(np.uint8) * 255, 'L').filter(
            ImageFilter.GaussianBlur(radius=feather)
        )
        alpha = np.minimum(alpha, np.array(mask, dtype=np.float32))
    arr[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def content_bbox(im: Image.Image, min_alpha: int = 24):
    arr = np.array(im.convert('RGBA'))
    ys, xs = np.where(arr[:, :, 3] > min_alpha)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def fit_frame(im: Image.Image, size: int = 96, pad: int = 6) -> Image.Image:
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    box = content_bbox(im)
    if not box:
        return canvas
    content = im.crop(box)
    inner = size - pad * 2
    content.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    ox = (size - content.width) // 2
    oy = (size - content.height) // 2
    canvas.alpha_composite(content, (ox, oy))
    return canvas


def extract_vertical_sheet(im: Image.Image, rows: int = 3, size: int = 96) -> Image.Image:
    punched = punch_edge_bg(im, thresh=38, feather=1)
    w, h = punched.size
    sheet = Image.new('RGBA', (size, size * rows), (0, 0, 0, 0))
    for i in range(rows):
        y0 = int(round(i * h / rows))
        y1 = int(round((i + 1) * h / rows))
        band = punched.crop((0, y0, w, y1))
        sheet.alpha_composite(fit_frame(band, size), (0, i * size))
    return sheet


def amber_cone(im: Image.Image) -> Image.Image:
    punched = punch_edge_bg(im, thresh=36, feather=2)
    arr = np.array(punched)
    a = arr[:, :, 3].astype(np.float32)
    src_l = luma(arr)
    boost = np.clip(src_l / 40.0, 0.15, 1.0)
    a = np.minimum(255.0, a * boost * 2.2)
    arr[:, :, 0] = 255
    arr[:, :, 1] = 209
    arr[:, :, 2] = 146
    arr[:, :, 3] = np.clip(a, 0, 255).astype(np.uint8)
    out = Image.fromarray(arr)
    box = content_bbox(out, min_alpha=8)
    if box:
        out = out.crop(box)
        pad = 8
        canvas = Image.new('RGBA', (out.width + pad * 2, out.height + pad * 2), (0, 0, 0, 0))
        canvas.alpha_composite(out, (pad, pad))
        out = canvas
    return out


def chrome_atlas():
    env_dir = '/tmp/chrome-pack-atlas'
    os.makedirs(env_dir, exist_ok=True)
    subprocess.run([
        'timeout', '20', 'google-chrome', '--headless=new', '--disable-gpu', '--no-sandbox',
        f'--user-data-dir={env_dir}', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=800,520', f'--screenshot={ATLAS_SHOT}', 'file://' + str(ATLAS_HTML),
    ], check=False)


def crop_punch(src: Image.Image, box, dest: Path, thresh=48):
    dest.parent.mkdir(parents=True, exist_ok=True)
    punch_edge_bg(src.crop(box), thresh=thresh, feather=1).save(dest)


def paint_hud_icons(hud: Path):
    hud.mkdir(parents=True, exist_ok=True)

    credits = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(credits)
    d.ellipse((3, 3, 28, 28), fill=(255, 209, 146, 255))
    d.ellipse((10, 10, 21, 21), outline=(42, 26, 8, 180), width=2)
    credits.save(hud / 'icon_credits.png')

    anchors = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(anchors)
    d.polygon([(16, 3), (29, 16), (16, 29), (3, 16)], outline=(184, 255, 217, 255), width=3)
    anchors.save(hud / 'icon_anchors.png')

    lives = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(lives)
    d.polygon([(11, 30), (21, 30), (19, 14), (13, 14)], fill=(197, 214, 206, 255))
    d.polygon([(10, 14), (22, 14), (20, 9), (12, 9)], fill=(155, 176, 168, 255))
    d.rectangle((13, 6, 19, 10), fill=(223, 234, 228, 255))
    d.ellipse((13, 2, 19, 8), fill=(255, 209, 146, 255))
    lives.save(hud / 'icon_lives.png')

    btn = Image.new('RGBA', (220, 56), (255, 209, 146, 255))
    d = ImageDraw.Draw(btn)
    d.rectangle((1, 1, 218, 54), outline=(255, 224, 176, 255), width=2)
    btn.save(hud / 'btn_start_wave.png')


def preview_collage(maps: dict[str, Image.Image], dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new('RGBA', (960, 600), (7, 16, 22, 255))
    labels = [('A · DEMO', maps['a']), ('B · MERGE', maps['b']), ('C · HORSESHOE', maps['c'])]
    for i, (label, im) in enumerate(labels):
        tile = cover_resize(im, 300, 520)
        x = 20 + i * 314
        canvas.alpha_composite(tile, (x, 48))
        draw = ImageDraw.Draw(canvas)
        draw.text((x + 8, 16), label, fill=(127, 212, 255, 255))
    canvas.save(dest)


def save_manifest():
    dest = ROOT / 'assets' / 'asset_manifest.json'
    dest.write_text(json.dumps({
        'version': 1,
        'coordinate_space': {'width': 960, 'height': 600},
        'maps': {
            'a_demo': {'file': 'assets/maps/map_a_demo.png', 'coords': 'maps-coords.json#A'},
            'b_merge': {'file': 'assets/maps/map_b_merge.png', 'coords': 'maps-coords.json#B'},
            'c_horseshoe': {'file': 'assets/maps/map_c_horseshoe.png', 'coords': 'maps-coords.json#C'},
        },
        'towers': {
            'frame_w': 96, 'frame_h': 96,
            'rows': ['l1', 'l2', 'l3'],
            'columns': ['cannon', 'tesla', 'cryo', 'mortar'],
            'sheets': {
                'cannon': {'file': 'towers/tower_cannon_sheet.png', 'frames': [
                    {'id': 'cannon_l1', 'x': 0, 'y': 0, 'w': 96, 'h': 96},
                    {'id': 'cannon_l2', 'x': 0, 'y': 96, 'w': 96, 'h': 96},
                    {'id': 'cannon_l3', 'x': 0, 'y': 192, 'w': 96, 'h': 96},
                ]},
                'tesla': {'file': 'towers/tower_tesla_sheet.png', 'frames': [
                    {'id': 'tesla_l1', 'x': 0, 'y': 0, 'w': 96, 'h': 96},
                    {'id': 'tesla_l2', 'x': 0, 'y': 96, 'w': 96, 'h': 96},
                    {'id': 'tesla_l3', 'x': 0, 'y': 192, 'w': 96, 'h': 96},
                ]},
                'cryo': {'file': 'towers/tower_cryo_sheet.png', 'frames': [
                    {'id': 'cryo_l1', 'x': 0, 'y': 0, 'w': 96, 'h': 96},
                    {'id': 'cryo_l2', 'x': 0, 'y': 96, 'w': 96, 'h': 96},
                    {'id': 'cryo_l3', 'x': 0, 'y': 192, 'w': 96, 'h': 96},
                ]},
                'mortar': {'file': 'towers/tower_mortar_sheet.png', 'frames': [
                    {'id': 'mortar_l1', 'x': 0, 'y': 0, 'w': 96, 'h': 96},
                    {'id': 'mortar_l2', 'x': 0, 'y': 96, 'w': 96, 'h': 96},
                    {'id': 'mortar_l3', 'x': 0, 'y': 192, 'w': 96, 'h': 96},
                ]},
            },
        },
        'enemies': {
            'frame_w': 110, 'frame_h': 64,
            'sheets': {
                'scout': {'file': 'enemies/enemy_scout_sheet.png', 'frames': [
                    {'id': 'scout_l1', 'x': 0, 'y': 0, 'w': 110, 'h': 64},
                    {'id': 'scout_l2', 'x': 110, 'y': 0, 'w': 110, 'h': 64},
                    {'id': 'scout_l3', 'x': 220, 'y': 0, 'w': 110, 'h': 64},
                ]},
                'swarm': {'file': 'enemies/enemy_swarm_sheet.png', 'frames': [
                    {'id': 'swarm_l1', 'x': 0, 'y': 0, 'w': 110, 'h': 64},
                    {'id': 'swarm_l2', 'x': 110, 'y': 0, 'w': 110, 'h': 64},
                    {'id': 'swarm_l3', 'x': 220, 'y': 0, 'w': 110, 'h': 64},
                ]},
                'ironclad': {'file': 'enemies/enemy_ironclad_sheet.png', 'frames': [
                    {'id': 'ironclad_l1', 'x': 0, 'y': 0, 'w': 110, 'h': 64},
                    {'id': 'ironclad_l2', 'x': 110, 'y': 0, 'w': 110, 'h': 64},
                    {'id': 'ironclad_l3', 'x': 220, 'y': 0, 'w': 110, 'h': 64},
                ]},
                'juggernaut': {'file': 'enemies/enemy_juggernaut.png', 'frames': [
                    {'id': 'juggernaut', 'x': 0, 'y': 0, 'w': 160, 'h': 72},
                ]},
            },
        },
        'hud': {
            'icon_credits': 'assets/hud/icon_credits.png',
            'icon_anchors': 'assets/hud/icon_anchors.png',
            'icon_lives': 'assets/hud/icon_lives.png',
            'dock_cannon': 'assets/hud/dock_cannon.png',
            'dock_tesla': 'assets/hud/dock_tesla.png',
            'dock_cryo': 'assets/hud/dock_cryo.png',
            'dock_mortar': 'assets/hud/dock_mortar.png',
            'btn_start_wave': 'assets/hud/btn_start_wave.png',
        },
        'fx': {
            'fog_overlay': 'assets/fx/fog_overlay.png',
            'lighthouse_cone': 'assets/fx/lighthouse_cone.png',
        },
    }, indent=2) + '\n')


def main():
    maps_dir = ROOT / 'assets' / 'maps'
    towers = ROOT / 'assets' / 'towers'
    fx = ROOT / 'assets' / 'fx'
    hud = ROOT / 'assets' / 'hud'
    enemies = ROOT / 'assets' / 'enemies'
    export = ROOT / 'assets' / 'export'
    for p in (maps_dir, towers, fx, hud, enemies, export):
        p.mkdir(parents=True, exist_ok=True)

    map_src = {
        'a': SRC / 'map_a_demo.png',
        'b': SRC / 'map_b_merge.png',
        'c': SRC / 'map_c_horseshoe.png',
    }
    maps = {k: cover_resize(Image.open(path), 960, 600) for k, path in map_src.items()}
    dests = {
        'a': ('map_a_demo.png', 'a.png'),
        'b': ('map_b_merge.png', 'b.png'),
        'c': ('map_c_horseshoe.png', 'c.png'),
    }
    for key, names in dests.items():
        for name in names:
            maps[key].save(maps_dir / name, optimize=True)

    fog = punch_edge_bg(cover_resize(Image.open(SRC / 'fog_overlay.png'), 960, 600), thresh=28, feather=3)
    fog.save(fx / 'fog_overlay.png')
    fog.save(fx / 'fog.png')

    cone = amber_cone(Image.open(SRC / 'lighthouse_cone.png'))
    cone.save(fx / 'lighthouse_cone.png')

    for name in ('cannon', 'tesla', 'cryo', 'mortar'):
        sheet = extract_vertical_sheet(Image.open(SRC / f'tower_{name}_sheet.png'))
        sheet.save(towers / f'tower_{name}_sheet.png')
        sheet.crop((0, 0, 96, 96)).save(hud / f'dock_{name}.png')

    paint_hud_icons(hud)

    chrome_atlas()
    if ATLAS_SHOT.exists():
        atlas = Image.open(ATLAS_SHOT).convert('RGBA')
        crop_punch(atlas, (0, 300, 330, 364), enemies / 'enemy_scout_sheet.png')
        crop_punch(atlas, (0, 364, 330, 428), enemies / 'enemy_swarm_sheet.png')
        crop_punch(atlas, (340, 300, 670, 364), enemies / 'enemy_ironclad_sheet.png')
        crop_punch(atlas, (400, 0, 560, 72), enemies / 'enemy_juggernaut.png')

    preview_collage(maps, export / 'preview.png')
    save_manifest()
    print('installed grafik pack v1')


if __name__ == '__main__':
    main()
