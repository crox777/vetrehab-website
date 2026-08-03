#!/usr/bin/env python3
"""Slice a tall full-page screenshot into readable chunks."""
import sys, os
from PIL import Image

src = sys.argv[1]
chunk = int(sys.argv[2]) if len(sys.argv) > 2 else 1100
maxw = int(sys.argv[3]) if len(sys.argv) > 3 else 1000

im = Image.open(src)
w, h = im.size
base, _ = os.path.splitext(src)
out = []
i = 0
y = 0
while y < h:
    y2 = min(y + chunk, h)
    tile = im.crop((0, y, w, y2))
    if w > maxw:
        r = maxw / w
        tile = tile.resize((maxw, int(tile.height * r)), Image.LANCZOS)
    p = f"{base}_s{i:02d}.png"
    tile.save(p)
    out.append(p)
    i += 1
    y = y2
print("\n".join(out))
