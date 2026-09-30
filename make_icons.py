# Generates the app icons: the two 3x3 dot matrices from the calendar, coral + teal on near-black.
from PIL import Image, ImageDraw

BG = (11, 11, 12)
CORAL = (238, 138, 98)
TEAL = (87, 196, 196)
MUTED = (44, 44, 48)
A = [1, 1, 0, 1, 1, 1, 0, 1, 1]
B = [1, 1, 1, 0, 1, 1, 1, 1, 0]

def icon(size, path):
    s = 4  # supersample for smooth circles
    W = size * s
    im = Image.new('RGB', (W, W), BG)
    d = ImageDraw.Draw(im)
    dot = W * 0.085
    gap = W * 0.035
    block = 3 * dot + 2 * gap
    between = W * 0.07
    total = 2 * block + between
    x0 = (W - total) / 2
    y0 = (W - block) / 2
    for bi, (bits, c) in enumerate(((A, CORAL), (B, TEAL))):
        bx = x0 + bi * (block + between)
        for i, on in enumerate(bits):
            cx = bx + (i % 3) * (dot + gap)
            cy = y0 + (i // 3) * (dot + gap)
            d.ellipse([cx, cy, cx + dot, cy + dot], fill=c if on else MUTED)
    im.resize((size, size), Image.LANCZOS).save(path)

for n in (180, 192, 512):
    icon(n, f'icons/icon-{n}.png')
print('ok')
