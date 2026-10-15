#!/usr/bin/env python3
"""Draw product-catalog images for the Product Visuals that have no image on the
source instance (Data Storage Visual, Implementation Services, Integration Gateway).

Flat vector-style 640x640 JPEGs (the size of the other catalog images), drawn with
Pillow at 2x and downsampled. No text, so nothing can come out garbled.
Output: seed/images/generated/<visual sys_id>-image.jpg, listed in
seed/images/generated.json. extract_images.py picks them up for any image field
the source can't supply.

Usage: seed/tools/generate_catalog_images.py
"""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw

SEED = Path(__file__).resolve().parent.parent
OUT = SEED / "images" / "generated"
S, N = 2, 640  # supersample factor, final size
W = N * S

NAVY, NAVY2, INK = (15, 27, 61), (30, 46, 92), (10, 18, 42)
TEAL, MINT, PURPLE, PEACH, WHITE = (45, 212, 191), (134, 232, 214), (155, 140, 235), (255, 178, 140), (255, 255, 255)
GREEN, AMBER = (52, 211, 153), (251, 191, 36)
SOFT_TEAL, SOFT_PURPLE, SOFT_PEACH = (176, 238, 226), (216, 208, 247), (255, 218, 196)


def canvas(circles):
    im = Image.new("RGB", (W, W), (250, 251, 253))
    d = ImageDraw.Draw(im)
    for cx, cy, r, col in circles:
        d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=col)
    return im, ImageDraw.Draw(im)


def rr(d, x, y, w, h, r, fill, outline=None, width=0):
    d.rounded_rectangle([x * S, y * S, (x + w) * S, (y + h) * S], radius=r * S, fill=fill, outline=outline, width=width * S)


def ell(d, cx, cy, rx, ry, fill):
    d.ellipse([(cx - rx) * S, (cy - ry) * S, (cx + rx) * S, (cy + ry) * S], fill=fill)


def line(d, pts, fill, width):
    d.line([(x * S, y * S) for x, y in pts], fill=fill, width=int(width * S), joint="curve")


def shadow(im, x, y, w, h, r, blur_steps=6, color=(120, 130, 160)):
    """Soft drop shadow: a few stacked translucent rounded rects."""
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    for i in range(blur_steps, 0, -1):
        a = int(10 * (blur_steps - i + 1) / blur_steps) + 2
        od.rounded_rectangle([(x - i * 2) * S, (y + 8 - i) * S, (x + w + i * 2) * S, (y + h + 8 + i * 2) * S],
                             radius=(r + i * 2) * S, fill=color + (a,))
    im.paste(Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB"))


def cloud(d, cx, cy, s, fill):
    for dx, dy, r in [(-0.55, 0.15, 0.42), (-0.1, -0.2, 0.55), (0.45, 0.05, 0.45), (0.0, 0.25, 0.5)]:
        ell(d, cx + dx * s, cy + dy * s, r * s, r * s, fill)
    rr(d, cx - 0.55 * s, cy + 0.1 * s, 1.1 * s, 0.6 * s, 0.3 * s, fill)


def gear(d, cx, cy, r_out, r_in, teeth, fill, hole, hole_fill):
    pts = []
    for i in range(teeth * 4):
        a = (i / (teeth * 4)) * 2 * math.pi
        r = r_out if (i % 4) in (1, 2) else r_in
        pts.append(((cx + r * math.cos(a)) * S, (cy + r * math.sin(a)) * S))
    d.polygon(pts, fill=fill)
    ell(d, cx, cy, hole, hole, hole_fill)


def check(d, cx, cy, s, col, width):
    line(d, [(cx - s, cy), (cx - s * 0.3, cy + s * 0.7), (cx + s, cy - s * 0.7)], col, width)


def finish(im, name):
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    im.resize((N, N), Image.LANCZOS).save(path, "JPEG", quality=92, optimize=True)
    return path


def data_storage():
    im, d = canvas([(560, 90, 190, SOFT_TEAL), (60, 600, 210, SOFT_PURPLE), (610, 560, 90, SOFT_PEACH)])
    # cloud, upper right
    cloud(d, 470, 150, 95, TEAL)
    cloud(d, 470, 160, 70, MINT)
    line(d, [(470, 205), (470, 130)], WHITE, 9)
    line(d, [(445, 152), (470, 127), (495, 152)], WHITE, 9)
    # server rack, centre
    x, y, w, h = 200, 215, 320, 78
    shadow(im, x, y, w, 4 * (h + 14) - 14, 18)
    d = ImageDraw.Draw(im)
    for i in range(4):
        yy = y + i * (h + 14)
        rr(d, x, yy, w, h, 16, NAVY)
        rr(d, x + 14, yy + 14, w - 28, h - 28, 9, NAVY2)
        for k in range(6):  # drive bays
            rr(d, x + 28 + k * 34, yy + 24, 24, h - 48, 4, INK)
        ell(d, x + w - 40, yy + h / 2, 6, 6, [GREEN, GREEN, AMBER, GREEN][i])
        ell(d, x + w - 62, yy + h / 2, 6, 6, TEAL)
    # database cylinder, lower left
    cx, top, cw, ch = 105, 400, 84, 120
    for i in range(3):
        yy = top + i * 40
        rr(d, cx - cw / 2, yy, cw, 56, 8, PURPLE)
    rr(d, cx - cw / 2, top + 14, cw, 108, 8, PURPLE)
    for i in range(3):
        yy = top + 14 + i * 40
        ell(d, cx, yy + 28, cw / 2, 16, PURPLE if i else (123, 108, 214))
        ell(d, cx, yy + 22, cw / 2, 16, (190, 178, 247))
    ell(d, cx, top + 12, cw / 2, 18, (205, 195, 250))
    # connector from cylinder to rack
    line(d, [(cx + cw / 2, 470), (x, 470)], PURPLE, 6)
    return finish(im, "data-storage.jpg")


def implementation_services():
    im, d = canvas([(80, 70, 170, SOFT_PEACH), (590, 560, 200, SOFT_TEAL), (620, 90, 80, SOFT_PURPLE)])
    # clipboard
    x, y, w, h = 120, 120, 250, 330
    shadow(im, x, y, w, h, 22)
    d = ImageDraw.Draw(im)
    rr(d, x, y, w, h, 22, NAVY)
    rr(d, x + 16, y + 34, w - 32, h - 50, 12, WHITE)
    rr(d, x + w / 2 - 44, y - 12, 88, 44, 12, NAVY2)
    rr(d, x + w / 2 - 22, y - 22, 44, 22, 8, TEAL)
    for i, col in enumerate([GREEN, GREEN, GREEN, (203, 210, 224)]):
        yy = y + 64 + i * 64
        rr(d, x + 34, yy, 36, 36, 9, col)
        if i < 3:
            check(d, x + 52, yy + 18, 10, WHITE, 5)
        rr(d, x + 86, yy + 6, 110 - i * 8, 10, 5, (203, 210, 224))
        rr(d, x + 86, yy + 22, 70, 8, 4, (225, 230, 240))
    # gears
    gear(d, 430, 215, 92, 74, 10, TEAL, 30, (250, 251, 253))
    gear(d, 505, 330, 58, 46, 8, PURPLE, 18, (250, 251, 253))
    gear(d, 395, 340, 44, 35, 7, PEACH, 14, (250, 251, 253))
    # roadmap with milestones along the bottom
    pts = [(95, 540), (230, 510), (360, 545), (500, 505), (560, 520)]
    line(d, pts, NAVY, 8)
    for i, (px, py) in enumerate(pts[:4]):
        ell(d, px, py, 17, 17, WHITE)
        ell(d, px, py, 11, 11, [PEACH, TEAL, PURPLE, GREEN][i])
    # flag at the end
    line(d, [(560, 520), (560, 470)], NAVY, 6)
    d.polygon([(560 * S, 470 * S), (600 * S, 484 * S), (560 * S, 498 * S)], fill=GREEN)
    return finish(im, "implementation-services.jpg")


def integration_gateway():
    im, d = canvas([(560, 80, 180, SOFT_PURPLE), (70, 580, 200, SOFT_TEAL), (600, 590, 80, SOFT_PEACH)])
    hub = (320, 330)
    nodes = [((150, 175), TEAL), ((490, 175), PURPLE), ((150, 485), PEACH), ((490, 485), GREEN)]
    for (nx, ny), col in nodes:  # connectors first, so nodes sit on top
        line(d, [hub, (nx, ny)], NAVY2, 7)
        mx, my = (hub[0] + nx) / 2, (hub[1] + ny) / 2
        ell(d, mx, my, 10, 10, WHITE)
        ell(d, mx, my, 6, 6, col)
    # hexagon gateway
    r = 108
    hexpts = [(hub[0] + r * math.cos(math.radians(60 * i + 30)), hub[1] + r * math.sin(math.radians(60 * i + 30))) for i in range(6)]
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(ov).polygon([(px * S, (py + 6) * S) for px, py in hexpts], fill=(120, 130, 160, 45))
    im.paste(Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB"))
    d = ImageDraw.Draw(im)
    d.polygon([(px * S, py * S) for px, py in hexpts], fill=NAVY)
    inner = [(hub[0] + (r - 16) * math.cos(math.radians(60 * i + 30)), hub[1] + (r - 16) * math.sin(math.radians(60 * i + 30))) for i in range(6)]
    d.polygon([(px * S, py * S) for px, py in inner], fill=NAVY2)
    # two-way arrows inside the hub
    line(d, [(268, 308), (372, 308)], TEAL, 9)
    d.polygon([(372 * S, 290 * S), (396 * S, 308 * S), (372 * S, 326 * S)], fill=TEAL)
    line(d, [(372, 358), (268, 358)], MINT, 9)
    d.polygon([(268 * S, 340 * S), (244 * S, 358 * S), (268 * S, 376 * S)], fill=MINT)
    # API nodes: rounded tiles with a </> glyph
    for (nx, ny), col in nodes:
        shadow(im, nx - 62, ny - 62, 124, 124, 24)
        d = ImageDraw.Draw(im)
        rr(d, nx - 62, ny - 62, 124, 124, 24, col)
        rr(d, nx - 50, ny - 50, 100, 100, 16, (255, 255, 255, 40) and tuple(min(255, c + 28) for c in col))
        line(d, [(nx - 14, ny - 22), (nx - 34, ny), (nx - 14, ny + 22)], WHITE, 8)
        line(d, [(nx + 14, ny - 22), (nx + 34, ny), (nx + 14, ny + 22)], WHITE, 8)
        line(d, [(nx + 6, ny - 26), (nx - 6, ny + 26)], WHITE, 8)
    return finish(im, "integration-gateway.jpg")


# visual sys_id, field, source attachment sys_id (dangling on the target), drawing
JOBS = [
    ("530c985e2b4343504deaf02ac891bfe9", "image", "1d0e442b2ba64b10c472f5b4f291bf55", data_storage),
    ("5b0c985e2b4343504deaf02ac891bfea", "image", "074556d9935acfd0306ff9a3b503d68f", implementation_services),
    ("7a8b5ee92bc38b104deaf02ac891bf21", "image", "a3c50039931ac314306ff9a3b503d63a", integration_gateway),
]


def main():
    entries = []
    for record, field, attachment, draw in JOBS:
        path = draw()
        final = path.with_name(f"{record}-{field}.jpg")
        path.replace(final)
        entries.append({"table": "sn_prd_pm_visuals", "record": record, "field": field, "attachment": attachment,
                        "file": f"generated/{final.name}", "file_name": "image", "content_type": "image/jpeg"})
        print(f"{final.relative_to(SEED)}  {final.stat().st_size} bytes")
    (SEED / "images" / "generated.json").write_text(json.dumps(
        {"_comment": "Drawn by generate_catalog_images.py for image fields that are empty on the source instance.",
         "images": entries}, indent=2) + "\n")


if __name__ == "__main__":
    main()
