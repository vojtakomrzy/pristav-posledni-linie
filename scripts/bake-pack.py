#!/usr/bin/env python3
"""Bake Grafik-style sheets/HUD from SVG atlas + map/fog copies + cone PNG."""
import json, os, shutil, struct, zlib, subprocess, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATLAS = os.path.join(ROOT, 'scripts', 'pack-atlas.html')
SHOT = '/tmp/pristav-atlas.png'


def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)


def write_png(path, w, h, buf, mode=6):
    raw = b''.join(b'\x00' + bytes(buf[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    ihdr = struct.pack('>IIBBBBB', w, h, 8, mode, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)


def paint_cone(path):
    w, h = 320, 220
    buf = bytearray(w * h * 4)
    ox, oy = 20, 20
    for y in range(h):
        for x in range(w):
            dx, dy = x - ox, y - oy
            ang = math.atan2(dy, dx)
            dist = math.hypot(dx, dy)
            if abs(ang - 0.45) < 0.28 and dist < 300:
                a = max(0, 1 - dist / 300) * 0.55 * (1 - abs(ang - 0.45) / 0.28)
                i = (y * w + x) * 4
                buf[i] = 255
                buf[i + 1] = 209
                buf[i + 2] = 146
                buf[i + 3] = int(a * 255)
    write_png(path, w, h, buf)


def paint_button(path):
    w, h = 220, 56
    buf = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            edge = min(x, y, w - 1 - x, h - 1 - y)
            i = (y * w + x) * 4
            if edge < 2:
                buf[i:i + 4] = bytes([255, 209, 146, 255])
            else:
                buf[i:i + 4] = bytes([255, 209, 146, 255])
    write_png(path, w, h, buf)


def ffmpeg_crop(src, dest, w, h, x, y):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    subprocess.check_call([
        'ffmpeg', '-y', '-loglevel', 'error', '-i', src,
        '-vf', f'crop={w}:{h}:{x}:{y}', dest,
    ])


def chrome_shot():
    env_dir = '/tmp/chrome-pack-atlas'
    os.makedirs(env_dir, exist_ok=True)
    url = 'file://' + ATLAS
    cmd = [
        'timeout', '15', 'google-chrome', '--headless=new', '--disable-gpu', '--no-sandbox',
        f'--user-data-dir={env_dir}', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--window-size=800,520', f'--screenshot={SHOT}', url,
    ]
    subprocess.run(cmd, check=False)


def main():
    chrome_shot()
    if not os.path.exists(SHOT):
        raise SystemExit('atlas screenshot missing')

    towers = os.path.join(ROOT, 'assets', 'towers')
    enemies = os.path.join(ROOT, 'assets', 'enemies')
    hud = os.path.join(ROOT, 'assets', 'hud')
    maps = os.path.join(ROOT, 'assets', 'maps')
    fx = os.path.join(ROOT, 'assets', 'fx')
    os.makedirs(enemies, exist_ok=True)
    os.makedirs(hud, exist_ok=True)

    ffmpeg_crop(SHOT, os.path.join(towers, 'tower_cannon_sheet.png'), 96, 288, 0, 0)
    ffmpeg_crop(SHOT, os.path.join(towers, 'tower_tesla_sheet.png'), 96, 288, 96, 0)
    ffmpeg_crop(SHOT, os.path.join(towers, 'tower_cryo_sheet.png'), 96, 288, 192, 0)
    ffmpeg_crop(SHOT, os.path.join(towers, 'tower_mortar_sheet.png'), 96, 288, 288, 0)

    ffmpeg_crop(SHOT, os.path.join(enemies, 'enemy_scout_sheet.png'), 330, 64, 0, 300)
    ffmpeg_crop(SHOT, os.path.join(enemies, 'enemy_swarm_sheet.png'), 330, 64, 0, 364)
    ffmpeg_crop(SHOT, os.path.join(enemies, 'enemy_ironclad_sheet.png'), 330, 64, 340, 300)
    ffmpeg_crop(SHOT, os.path.join(enemies, 'enemy_juggernaut.png'), 160, 72, 400, 0)

    ffmpeg_crop(SHOT, os.path.join(hud, 'dock_cannon.png'), 96, 96, 0, 0)
    ffmpeg_crop(SHOT, os.path.join(hud, 'dock_tesla.png'), 96, 96, 96, 0)
    ffmpeg_crop(SHOT, os.path.join(hud, 'dock_cryo.png'), 96, 96, 192, 0)
    ffmpeg_crop(SHOT, os.path.join(hud, 'dock_mortar.png'), 96, 96, 288, 0)
    ffmpeg_crop(SHOT, os.path.join(hud, 'icon_credits.png'), 32, 32, 400, 90)
    ffmpeg_crop(SHOT, os.path.join(hud, 'icon_anchors.png'), 32, 32, 440, 90)
    ffmpeg_crop(SHOT, os.path.join(hud, 'icon_lives.png'), 32, 32, 480, 90)

    shutil.copyfile(os.path.join(maps, 'a.png'), os.path.join(maps, 'map_a_demo.png'))
    shutil.copyfile(os.path.join(maps, 'b.png'), os.path.join(maps, 'map_b_merge.png'))
    shutil.copyfile(os.path.join(maps, 'c.png'), os.path.join(maps, 'map_c_horseshoe.png'))
    shutil.copyfile(os.path.join(fx, 'fog.png'), os.path.join(fx, 'fog_overlay.png'))
    paint_cone(os.path.join(fx, 'lighthouse_cone.png'))
    paint_button(os.path.join(hud, 'btn_start_wave.png'))

    manifest = {
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
                'cannon': {
                    'file': 'towers/tower_cannon_sheet.png',
                    'frames': [
                        {'id': 'cannon_l1', 'x': 0, 'y': 0, 'w': 96, 'h': 96},
                        {'id': 'cannon_l2', 'x': 0, 'y': 96, 'w': 96, 'h': 96},
                        {'id': 'cannon_l3', 'x': 0, 'y': 192, 'w': 96, 'h': 96},
                    ],
                },
                'tesla': {
                    'file': 'towers/tower_tesla_sheet.png',
                    'frames': [
                        {'id': 'tesla_l1', 'x': 0, 'y': 0, 'w': 96, 'h': 96},
                        {'id': 'tesla_l2', 'x': 0, 'y': 96, 'w': 96, 'h': 96},
                        {'id': 'tesla_l3', 'x': 0, 'y': 192, 'w': 96, 'h': 96},
                    ],
                },
                'cryo': {
                    'file': 'towers/tower_cryo_sheet.png',
                    'frames': [
                        {'id': 'cryo_l1', 'x': 0, 'y': 0, 'w': 96, 'h': 96},
                        {'id': 'cryo_l2', 'x': 0, 'y': 96, 'w': 96, 'h': 96},
                        {'id': 'cryo_l3', 'x': 0, 'y': 192, 'w': 96, 'h': 96},
                    ],
                },
                'mortar': {
                    'file': 'towers/tower_mortar_sheet.png',
                    'frames': [
                        {'id': 'mortar_l1', 'x': 0, 'y': 0, 'w': 96, 'h': 96},
                        {'id': 'mortar_l2', 'x': 0, 'y': 96, 'w': 96, 'h': 96},
                        {'id': 'mortar_l3', 'x': 0, 'y': 192, 'w': 96, 'h': 96},
                    ],
                },
            },
        },
        'enemies': {
            'frame_w': 110, 'frame_h': 64,
            'sheets': {
                'scout': {
                    'file': 'enemies/enemy_scout_sheet.png',
                    'frames': [
                        {'id': 'scout_l1', 'x': 0, 'y': 0, 'w': 110, 'h': 64},
                        {'id': 'scout_l2', 'x': 110, 'y': 0, 'w': 110, 'h': 64},
                        {'id': 'scout_l3', 'x': 220, 'y': 0, 'w': 110, 'h': 64},
                    ],
                },
                'swarm': {
                    'file': 'enemies/enemy_swarm_sheet.png',
                    'frames': [
                        {'id': 'swarm_l1', 'x': 0, 'y': 0, 'w': 110, 'h': 64},
                        {'id': 'swarm_l2', 'x': 110, 'y': 0, 'w': 110, 'h': 64},
                        {'id': 'swarm_l3', 'x': 220, 'y': 0, 'w': 110, 'h': 64},
                    ],
                },
                'ironclad': {
                    'file': 'enemies/enemy_ironclad_sheet.png',
                    'frames': [
                        {'id': 'ironclad_l1', 'x': 0, 'y': 0, 'w': 110, 'h': 64},
                        {'id': 'ironclad_l2', 'x': 110, 'y': 0, 'w': 110, 'h': 64},
                        {'id': 'ironclad_l3', 'x': 220, 'y': 0, 'w': 110, 'h': 64},
                    ],
                },
                'juggernaut': {
                    'file': 'enemies/enemy_juggernaut.png',
                    'frames': [{'id': 'juggernaut', 'x': 0, 'y': 0, 'w': 160, 'h': 72}],
                },
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
    }
    dest = os.path.join(ROOT, 'assets', 'asset_manifest.json')
    with open(dest, 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')
    print('wrote', dest)


if __name__ == '__main__':
    main()
