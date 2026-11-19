#!/usr/bin/env python3
"""png-brightness.py — R369 C3.1 lane instrument (the ui-screens dark gate).

Prints the mean 0-255 brightness of a PNG using ONLY the stdlib (the GH
ubuntu runners have python3 but no guaranteed Pillow, and ImageMagick's
`identify -format %[fx:...]` returned empty on the runner — the first
gate iteration failed on exactly that). Handles the color types Android
screencap produces (RGBA/8 and RGB/8); non-interlaced only (screencap
never interlaces). Exits 1 with a message on anything it can't read.

Usage: python3 png-brightness.py <image.png> [sample-step]
"""
import struct
import sys
import zlib


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: png-brightness.py <image.png> [sample-step]", file=sys.stderr)
        return 1
    path = sys.argv[1]
    step = int(sys.argv[2]) if len(sys.argv) > 2 else 24
    with open(path, "rb") as f:
        data = f.read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        print("not a png", file=sys.stderr)
        return 1
    pos = 8
    width = height = bitdepth = colortype = None
    idat = bytearray()
    while pos + 8 <= len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        ctype = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if ctype == b"IHDR":
            width, height, bitdepth, colortype = struct.unpack(">IIBB", chunk[:10])
        elif ctype == b"IDAT":
            idat.extend(chunk)
        elif ctype == b"IEND":
            break
    if bitdepth != 8 or colortype not in (2, 6):
        print(f"unsupported png (depth={bitdepth}, color={colortype})", file=sys.stderr)
        return 1
    channels = 3 if colortype == 2 else 4
    stride = width * channels
    raw = zlib.decompress(bytes(idat))
    # unfilter scanlines (filters 0-4)
    bpp = channels
    out = bytearray(stride * height)
    prev = bytearray(stride)
    src = 0
    for y in range(height):
        ftype = raw[src]
        src += 1
        line = bytearray(raw[src : src + stride])
        src += stride
        if ftype == 0:
            pass
        elif ftype == 1:  # Sub
            for i in range(bpp, stride):
                line[i] = (line[i] + line[i - bpp]) & 0xFF
        elif ftype == 2:  # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ftype == 3:  # Average
            for i in range(stride):
                left = line[i - bpp] if i >= bpp else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:  # Paeth
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pred) & 0xFF
        else:
            print(f"bad filter {ftype}", file=sys.stderr)
            return 1
        out[y * stride : (y + 1) * stride] = line
        prev = line
    # sample + average
    total = count = 0
    for y in range(0, height, step):
        row = y * stride
        for x in range(0, stride, step * channels):
            o = row + x
            total += int(out[o]) + int(out[o + 1]) + int(out[o + 2])
            count += 1
    if count == 0:
        print("empty image", file=sys.stderr)
        return 1
    print(round(total / (3 * count)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
