#!/usr/bin/env python3
"""R324 Reviewer B pixel audit: paper/ink/orange/gradient/shadow checks."""
import json, sys, os
from PIL import Image
from collections import Counter

D = "/home/z/my-project/madarek/audits/evidence/r324"
FILES = """hero-x14-1440-light.png hero-x14-1440-dark.png hero-x14-390-light.png hero-x14-390-dark.png
statement-x14-1440-light.png statement-x14-1440-dark.png statement-x14-390-light.png statement-x14-390-dark.png
pains-x14-1440-light.png pains-x14-1440-dark.png
map-x14-1440-light.png map-x14-1440-dark.png
platform-x14-1440-light.png platform-x14-1440-dark.png platform-390-light.png platform-390-dark.png
why-x14-1440-light.png why-x14-1440-dark.png
roles-x14-1440-light.png roles-x14-1440-dark.png
cta-x14-1440-light.png cta-x14-1440-dark.png
footer-x14-1440-light.png footer-x14-1440-dark.png footer-x14-390-light.png footer-x14-390-dark.png""".split()

PAPER = (0xF6, 0xF6, 0xEE)  # 246,246,238
INK   = (0x28, 0x28, 0x28)  # 40,40,40
ORANGE= (0xFA, 0x36, 0x00)  # 250,54,0
EMBER = (0xFF, 0x5A, 0x1F)  # 255,90,31

def near(c, t, tol=10):
    return all(abs(c[i]-t[i]) <= tol for i in range(3))

def lum(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])

def contrast(a,b):
    l1,l2=sorted([lum(a),lum(b)],reverse=True)
    return (l1+0.05)/(l2+0.05)

def audit(fn):
    im = Image.open(os.path.join(D, fn)).convert("RGB")
    w,h = im.size
    px = im.load()
    res = {"file": fn, "size": [w,h]}
    # sample full image (stride for speed)
    st = max(1, w*h//400000)
    counts = Counter()
    orange_sig = ember_sig = other_orange = white = black_leak = 0
    total = 0
    ys_sig, ys_ember = [], []
    for y in range(0,h,st):
        for x in range(0,w,st):
            c = px[x,y]; total += 1
            counts[(c[0]//8*8, c[1]//8*8, c[2]//8*8)] += 1
            if near(c, ORANGE, 14): orange_sig += 1; ys_sig.append(y)
            elif near(c, EMBER, 12): ember_sig += 1; ys_ember.append(y)
            elif c[0]>200 and c[1]<110 and c[2]<90 and abs(c[1]-54)>18: other_orange += 1
            if c[0]>250 and c[1]>250 and c[2]>250: white += 1
            if c[0]<8 and c[1]<8 and c[2]<8: black_leak += 1
    res["paperPct"] = round(100*sum(v for k,v in counts.items() if near(k,PAPER,6))/total,2)
    res["inkPct"]   = round(100*sum(v for k,v in counts.items() if near(k,INK,6))/total,2)
    res["signalOrangePct"] = round(100*orange_sig/total,3)
    res["emberPct"] = round(100*ember_sig/total,3)
    res["otherOrangePct"] = round(100*other_orange/total,3)
    res["whitePct"] = round(100*white/total,3)
    res["pureBlackPct"] = round(100*black_leak/total,3)
    # corner + edge background sample
    res["corners"] = [px[2,2], px[w-3,2], px[2,h-3], px[w-3,h-3]]
    res["bgTopStrip"] = Counter(px[x,y] for y in range(0, max(4,h//40)) for x in range(0,w, max(1,w//60))).most_common(2)
    # gradient scan: left/right 30px margins, smooth luminance drift?
    drifts = []
    for strip_x in (12, w-13):
        prev = None; dr = 0
        for y in range(0, h, 4):
            l = lum(px[strip_x, y])
            if prev is not None and abs(l-prev) > 0.0009: dr += 1
            prev = l
        drifts.append(dr)
    res["edgeLumSteps"] = drifts
    # midtone blob heuristic (shadow indicator): pixels notably between bg and ink in wide runs
    mid = 0
    for y in range(0,h,3):
        run = 0; best = 0
        for x in range(0,w,3):
            c = px[x,y]
            is_mid = (60 < sum(c)/3 < 200) and max(c)-min(c) < 12 and not near(c, PAPER, 18) and not near(c, INK, 12)
            run = run+1 if is_mid else 0
            best = max(best, run)
        mid += best
    res["midtoneRunScore"] = mid
    return res

out = [audit(f) for f in FILES]
print(json.dumps(out, indent=1, ensure_ascii=False))
