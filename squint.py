#!/usr/bin/env python3
"""Squint view: full page downscaled + optional blur, tiled side by side."""
import sys, os
from PIL import Image, ImageFilter

srcs = sys.argv[1].split(',')
colw = int(sys.argv[2]) if len(sys.argv) > 2 else 260
maxh = int(sys.argv[3]) if len(sys.argv) > 3 else 1500
out = sys.argv[4]

tiles = []
for s in srcs:
    im = Image.open(s).convert('RGB')
    w, h = im.size
    r = colw / w
    im = im.resize((colw, int(h*r)), Image.LANCZOS)
    if im.height > maxh:
        im = im.resize((int(colw*maxh/im.height), maxh), Image.LANCZOS)
    tiles.append(im)

W = sum(t.width for t in tiles) + 12*(len(tiles)-1)
H = max(t.height for t in tiles)
canvas = Image.new('RGB', (W, H), (255,255,255))
x = 0
for t in tiles:
    canvas.paste(t, (x, 0)); x += t.width + 12
canvas.save(out)
print(out, canvas.size)
