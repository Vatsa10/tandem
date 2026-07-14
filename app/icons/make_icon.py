"""Tandem app icon: two interlocking rings (linked = 'in tandem') in a warm
coral gradient on a near-black squircle. Rendered at 4x then downsampled."""
from PIL import Image, ImageDraw

SS = 4
C = 1024 * SS


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def gradient(size, c0, c1):
    """Diagonal linear gradient."""
    g = Image.new("RGB", (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = lerp(c0, c1, t)
    return g


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius, fill=255)
    return m


def ring_mask(size, cx, cy, r, w):
    """Filled annulus mask."""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2], fill=255)
    d.ellipse([cx - r + w / 2, cy - r + w / 2, cx + r - w / 2, cy + r - w / 2], fill=0)
    return m


# --- background: near-black vertical gradient in a squircle ---
bg = gradient(C, (26, 26, 32), (12, 12, 16))
canvas = Image.new("RGBA", (C, C), (0, 0, 0, 0))
canvas.paste(bg, (0, 0), rounded_mask(C, int(C * 0.225)))

# --- ring geometry ---
r = int(C * 0.232)      # centerline radius
w = int(C * 0.108)      # stroke width
d = int(C * 0.150)      # half the center separation
cy = C // 2
Lx, Rx = C // 2 - d, C // 2 + d

coral = gradient(C, (255, 122, 89), (255, 185, 120))   # warm coral -> amber

L = ring_mask(C, Lx, cy, r, w)
R = ring_mask(C, Rx, cy, r, w)

# Weave: R under L everywhere, except at the bottom crossing where R goes over L.
import math
sep = 2 * d
yoff = math.sqrt(max(r * r - d * d, 1))
bx, by = C // 2, int(cy + yoff)          # bottom intersection point
patch = Image.new("L", (C, C), 0)
ImageDraw.Draw(patch).ellipse(
    [bx - w * 1.3, by - w * 1.3, bx + w * 1.3, by + w * 1.3], fill=255)
R_over = Image.composite(R, Image.new("L", (C, C), 0), patch)

canvas.paste(coral, (0, 0), R)   # right ring
canvas.paste(coral, (0, 0), L)   # left ring over right
canvas.paste(coral, (0, 0), R_over)  # right ring back over left at bottom crossing

# subtle inner shadow on the rings for depth (thin darker inner edge)
icon = canvas.resize((1024, 1024), Image.LANCZOS)

icon.save("app-1024.png")
icon.resize((512, 512), Image.LANCZOS).save("app-512.png")

sizes = [16, 32, 48, 64, 128, 256]
icon.save("app.ico", sizes=[(s, s) for s in sizes])
try:
    icon.save("app.icns")
    print("icns ok")
except Exception as e:
    print("icns failed:", e)
print("done")
