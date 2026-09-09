#!/usr/bin/env python3
"""Bake 960×600 harbor bases. Pads are NOT painted — runtime overlay uses maps-coords."""
import json, math, os, struct, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 960, 600


def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)


def write_png(path, w, h, buf):
    raw = b''.join(b'\x00' + bytes(buf[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(png)


def hash2(x, y):
    n = (int(x) * 374761393 + int(y) * 668265263) & 0xffffffff
    n = (n ^ (n >> 13)) * 1274126177 & 0xffffffff
    return ((n ^ (n >> 16)) & 0xffffffff) / 4294967295.0


def lerp(a, b, t):
    return a + (b - a) * t


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.p = bytearray(w * h * 4)

    def _blend(self, i, r, g, b, a):
        if a <= 0:
            return
        ia = self.p[i + 3] / 255.0
        aa = a + ia * (1 - a)
        if aa <= 0:
            return
        s = a / aa
        d = 1 - s
        self.p[i] = int(r * s + self.p[i] * d)
        self.p[i + 1] = int(g * s + self.p[i + 1] * d)
        self.p[i + 2] = int(b * s + self.p[i + 2] * d)
        self.p[i + 3] = int(aa * 255)

    def dot(self, x, y, r, g, b, a=1.0):
        if 0 <= x < self.w and 0 <= y < self.h:
            self._blend((y * self.w + x) * 4, r, g, b, a)

    def fill(self, r, g, b, a=1.0):
        for i in range(0, len(self.p), 4):
            self.p[i] = r
            self.p[i + 1] = g
            self.p[i + 2] = b
            self.p[i + 3] = int(a * 255)

    def disc(self, cx, cy, rad, color, a=1.0):
        r0 = int(math.floor(cx - rad))
        r1 = int(math.ceil(cx + rad))
        s0 = int(math.floor(cy - rad))
        s1 = int(math.ceil(cy + rad))
        rr = rad * rad
        cr, cg, cb = color
        for y in range(max(0, s0), min(self.h, s1 + 1)):
            dy = y + 0.5 - cy
            for x in range(max(0, r0), min(self.w, r1 + 1)):
                dx = x + 0.5 - cx
                d = dx * dx + dy * dy
                if d <= rr:
                    edge = 1 - math.sqrt(d) / rad
                    self.dot(x, y, cr, cg, cb, a * min(1, edge * 3))

    def rect(self, x, y, w, h, color, a=1.0):
        cr, cg, cb = color
        x0, y0 = int(x), int(y)
        x1, y1 = int(x + w), int(y + h)
        for yy in range(max(0, y0), min(self.h, y1)):
            for xx in range(max(0, x0), min(self.w, x1)):
                self.dot(xx, yy, cr, cg, cb, a)

    def stroke(self, pts, width, color, a=1.0):
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]
            x1, y1 = pts[i + 1]
            dist = math.hypot(x1 - x0, y1 - y0) or 1
            steps = int(dist) + 1
            for s in range(steps + 1):
                t = s / steps
                self.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, width / 2, color, a)


def path_points(spec):
    if spec.get('lanes') == 2:
        left = spec['paths']['left'] + spec['paths']['merged'][1:]
        right = spec['paths']['right'] + spec['paths']['merged'][1:]
        return [left + [spec['base']], right + [spec['base']]]
    return [spec['path'] + [spec['base']]]


def near_path(paths, x, y, thresh):
    tt = thresh * thresh
    for pts in paths:
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]
            x1, y1 = pts[i + 1]
            vx, vy = x1 - x0, y1 - y0
            l2 = vx * vx + vy * vy or 1
            t = max(0, min(1, ((x - x0) * vx + (y - y0) * vy) / l2))
            px, py = x0 + vx * t, y0 + vy * t
            if (x - px) ** 2 + (y - py) ** 2 < tt:
                return True
    return False


def paint_water(c):
    for y in range(H):
        for x in range(W):
            n = hash2(x * 0.37, y * 0.41)
            n2 = hash2(x * 0.11 + 9, y * 0.09)
            wave = 0.5 + 0.5 * math.sin(x * 0.045 + y * 0.09 + n2 * 4)
            t = n * 0.55 + wave * 0.25 + (y / H) * 0.2
            r = int(lerp(2, 14, t))
            g = int(lerp(18, 42, t))
            b = int(lerp(22, 48, t))
            i = (y * W + x) * 4
            c.p[i] = r
            c.p[i + 1] = g
            c.p[i + 2] = b
            c.p[i + 3] = 255
            if n > 0.84:
                c.dot(x, y, 180, 210, 210, 0.07)


def paint_foam(c, paths):
    for pts in paths:
        c.stroke(pts, 48, (8, 28, 32), 0.55)
        c.stroke(pts, 36, (18, 40, 44), 0.8)
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]
            x1, y1 = pts[i + 1]
            dist = math.hypot(x1 - x0, y1 - y0) or 1
            nx, ny = -(y1 - y0) / dist, (x1 - x0) / dist
            steps = int(dist / 4) + 1
            for s in range(steps):
                t = s / steps
                x = x0 + (x1 - x0) * t
                y = y0 + (y1 - y0) * t
                side = 1 if (s + i) % 2 else -1
                c.disc(x + nx * 20 * side, y + ny * 20 * side, 5, (184, 255, 217), 0.18)
                if s % 3 == 0:
                    c.disc(x, y, 3, (226, 238, 232), 0.12)


def paint_deck(c, paths):
    for pts in paths:
        c.stroke(pts, 30, (22, 28, 26), 1)
        c.stroke(pts, 22, (36, 42, 38), 1)
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]
            x1, y1 = pts[i + 1]
            dist = math.hypot(x1 - x0, y1 - y0) or 1
            nx, ny = -(y1 - y0) / dist, (x1 - x0) / dist
            planks = int(dist / 10)
            for p in range(planks):
                t = p / max(1, planks)
                x = x0 + (x1 - x0) * t
                y = y0 + (y1 - y0) * t
                c.stroke([[x - nx * 10, y - ny * 10], [x + nx * 10, y + ny * 10]], 1.4, (12, 16, 16), 0.45)


def building(c, x, y, w, h, roof=True):
    c.rect(x + 3, y + 6, w, h, (6, 10, 12), 0.55)
    c.rect(x, y, w, h, (14, 18, 20), 1)
    c.rect(x, y, w, 4, (28, 32, 30), 1)
    if roof:
        c.rect(x - 2, y - 6, w + 4, 8, (10, 14, 16), 1)
    cols = max(1, int(w / 14))
    rows = max(1, int(h / 16))
    for row in range(rows):
        for col in range(cols):
            if hash2(x + col * 17, y + row * 13) > 0.38:
                c.rect(x + 5 + col * 14, y + 8 + row * 16, 5, 6, (255, 209, 146), 0.55 + 0.3 * hash2(col, row))


def crane(c, x, y, arm=70, left=True):
    c.rect(x, y, 6, 70, (18, 22, 24), 1)
    hx = x - arm if left else x + 6
    c.rect(hx, y + 8, arm, 4, (28, 32, 30), 1)
    c.disc(x + 3, y + 8, 5, (255, 177, 71), 0.7)


def lighthouse_rock(c, x, y):
    c.disc(x, y + 18, 38, (18, 22, 24), 1)
    c.disc(x - 16, y + 24, 22, (12, 16, 18), 1)
    c.disc(x + 18, y + 26, 18, (22, 26, 28), 1)
    c.rect(x - 8, y - 28, 16, 46, (180, 198, 190), 1)
    c.rect(x - 10, y - 34, 20, 8, (150, 168, 160), 1)
    c.disc(x, y - 40, 6, (255, 209, 146), 1)
    c.disc(x, y - 40, 14, (255, 209, 146), 0.28)


def paint_fog_layer(c, heavy_left=True):
    for i in range(8):
        x = (80 + i * 130) % (W + 100) - 40
        y = 30 + (i * 67) % 420
        if heavy_left:
            x = x * 0.55
        c.disc(x, y, 120, (120, 150, 150), 0.07)
        c.disc(x + 40, y + 20, 90, (90, 120, 120), 0.05)


def vignette(c):
    cx, cy = W / 2, H / 2
    maxd = math.hypot(cx, cy)
    for y in range(H):
        for x in range(W):
            d = math.hypot(x - cx, y - cy) / maxd
            if d > 0.45:
                a = (d - 0.45) / 0.55 * 0.5
                c.dot(x, y, 4, 12, 16, a)


def paint_map(key, spec):
    c = Canvas(W, H)
    paths = path_points(spec)
    paint_water(c)
    paint_foam(c, paths)
    paint_deck(c, paths)
    lx, ly = spec['base']
    lighthouse_rock(c, lx, ly)

    if key == 'A':
        building(c, 18, 40, 90, 110)
        building(c, 70, 90, 70, 80)
        crane(c, 40, 20, 80, False)
        building(c, 8, 260, 60, 90)
        building(c, 720, 430, 110, 90)
        building(c, 840, 390, 80, 120)
        crane(c, 880, 360, 70, True)
        building(c, 400, 20, 100, 60)
        paint_fog_layer(c, True)
    elif key == 'B':
        building(c, 20, 30, 100, 90)
        building(c, 80, 80, 70, 70)
        crane(c, 30, 10, 90, False)
        building(c, 20, 400, 80, 100)
        building(c, 160, 20, 60, 50)
        building(c, 700, 420, 120, 90)
        building(c, 840, 360, 90, 140)
        crane(c, 900, 330, 60, True)
        paint_fog_layer(c, True)
    else:
        building(c, 40, 80, 80, 70)
        building(c, 90, 140, 60, 90)
        crane(c, 50, 50, 70, False)
        building(c, 780, 80, 90, 80)
        building(c, 820, 170, 70, 100)
        crane(c, 880, 60, 70, True)
        building(c, 30, 420, 90, 80)
        building(c, 840, 430, 90, 80)
        paint_fog_layer(c, False)

    vignette(c)
    return c


def paint_fog_overlay():
    c = Canvas(W, H)
    for i in range(0, len(c.p), 4):
        c.p[i + 3] = 0
    for i in range(10):
        c.disc((i * 170) % W, 40 + (i * 53) % 500, 140, (160, 186, 186), 0.16)
        c.disc((90 + i * 140) % W, 80 + (i * 71) % 480, 100, (110, 140, 140), 0.12)
    return c


def main():
    coords = json.load(open(os.path.join(ROOT, 'assets', 'maps-coords.json')))
    out = os.path.join(ROOT, 'assets', 'maps')
    for key, spec in coords['maps'].items():
        c = paint_map(key, spec)
        dest = os.path.join(out, f'{key.lower()}.png')
        write_png(dest, W, H, c.p)
        print('wrote', dest, os.path.getsize(dest))
    fog = paint_fog_overlay()
    dest = os.path.join(ROOT, 'assets', 'fx', 'fog.png')
    write_png(dest, W, H, fog.p)
    print('wrote', dest, os.path.getsize(dest))


if __name__ == '__main__':
    main()
