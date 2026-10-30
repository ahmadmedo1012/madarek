#!/usr/bin/env python3
"""R324 Round-2 verifier: targeted pixel checks for X22/X23/X18/X21 + CTA decision."""
import os, json
from PIL import Image
from collections import Counter

D = "/home/z/my-project/madarek/audits/evidence/r324"

def lum(c):
    def f(v):
        v /= 255.0
        return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])

def contrast(a, b):
    l1, l2 = sorted([lum(a), lum(b)], reverse=True)
    return (l1+0.05)/(l2+0.05)

def load(fn):
    return Image.open(os.path.join(D, fn)).convert("RGB")

def near(c, t, tol=8):
    return all(abs(c[i]-t[i]) <= tol for i in range(3))

PAPER = (246, 246, 238)   # F6F6EE warm
COLD  = (246, 248, 250)   # F6F8FA cold blue (pre-X22)
DARKBG= (40, 40, 40)      # 282828
RAISE_L = (249, 249, 244) # raised light surface (pre-X23)
RAISE_D = (42, 42, 42)    # raised dark surface (pre-X23)
CTA = (219, 58, 0)        # DB3A00
SIG = (250, 54, 0)        # FA3600
EMBER = (255, 90, 31)     # FF5A1F

out = {}

def top_colors(im, pred, topn=6):
    px = im.load(); w, h = im.size
    st = max(1, (w*h)//600000)
    cnt = Counter()
    for y in range(0, h, st):
        for x in range(0, w, st):
            c = px[x, y]
            if pred(c): cnt[c] += 1
    return cnt.most_common(topn)

# ---------- X22: warm ink in dark statement ----------
x22 = {}
for fn in ["statement-x22-1440-dark.png", "statement-x14-1440-dark.png", "statement-x14-390-dark.png"]:
    im = load(fn)
    tc = top_colors(im, lambda c: lum(c) > 0.5, 6)
    warm = cold = other = 0
    tot = 0
    px = im.load(); w, h = im.size
    st = max(1, (w*h)//600000)
    for y in range(0, h, st):
        for x in range(0, w, st):
            c = px[x, y]
            if lum(c) > 0.5:
                tot += 1
                if near(c, PAPER, 4): warm += 1
                elif near(c, COLD, 4): cold += 1
                else: other += 1
    x22[fn] = {"topLightInk": tc, "warmPct": round(100*warm/max(tot,1),1),
               "coldPct": round(100*cold/max(tot,1),1), "otherPct": round(100*other/max(tot,1),1)}
out["X22"] = x22

# ---------- X23: footer on same paper, no raised surface ----------
x23 = {}
for fn in ["footer-x23-1440-light.png", "footer-x23-1440-dark.png",
           "footer-x14-1440-light.png", "footer-x14-1440-dark.png"]:
    im = load(fn); w, h = im.size; px = im.load()
    corners = [list(px[2,2]), list(px[w-3,2]), list(px[2,h-3]), list(px[w-3,h-3])]
    band = Counter()
    tot = 0
    raised = 0
    for y in range(int(h*0.72), h, 2):
        for x in range(0, w, max(1, w//300)):
            c = px[x, y]; tot += 1
            band[c] += 1
            if near(c, RAISE_L, 3) or near(c, RAISE_D, 2): raised += 1
    x23[fn] = {"size": [w, h], "corners": corners,
               "raisedSurfacePctInFooterBand": round(100*raised/max(tot,1),2),
               "topBandColors": [[list(c), n] for c, n in band.most_common(4)]}
out["X23"] = x23

# ---------- X18: dark map stages real, not copies ----------
x18 = {}
pairs = [(f"map-s{i}-1440-dark.png", f"map-s{i}-1440-light.png") for i in range(1, 7)]
for dpath, lpath in pairs:
    res = {}
    for tag, fn in [("dark", dpath), ("light", lpath)]:
        im = load(fn); w, h = im.size; px = im.load()
        tot = 0; darkbg = paper = white = 0
        for y in range(0, h, 3):
            for x in range(0, w, 3):
                c = px[x, y]; tot += 1
                if near(c, DARKBG, 10): darkbg += 1
                elif near(c, PAPER, 10): paper += 1
                if c[0] > 250 and c[1] > 250 and c[2] > 250: white += 1
        res[tag] = {"size": [w, h], "darkBgPct": round(100*darkbg/tot,1),
                    "paperPct": round(100*paper/tot,1), "pureWhitePct": round(100*white/tot,2),
                    "corners": [list(px[2,2]), list(px[w-3,2]), list(px[2,h-3]), list(px[w-3,h-3])]}
    # structural diff dark vs light (downscaled)
    di = load(dpath).resize((96, 192)); li = load(lpath).resize((96, 192))
    dp, lp = di.load(), li.load()
    diff = sum(abs(dp[x,y][ch]-lp[x,y][ch]) for y in range(192) for x in range(96) for ch in range(3))/(96*192*3)
    res["meanAbsDiffDarkVsLight"] = round(diff, 1)
    x18[dpath.split("/")[-1]] = res
out["X18"] = x18

# ---------- X21: dark hairline contrast ----------
x21 = {}
for fn in ["statement-x14-390-dark.png", "platform-x14-1440-dark.png"]:
    im = load(fn); w, h = im.size; px = im.load()
    rows = []
    for y in range(h):
        cnt = Counter()
        run = 0
        for x in range(0, w, 2):
            c = px[x, y]
            mx, mn = max(c), min(c)
            if mx-mn < 10 and 55 < sum(c)/3 < 150:
                run += 1
                cnt[c] += 1
        if run > 0.5*(w/2):
            rows.append((y, cnt.most_common(1)[0][0]))
    groups = []
    for y, c in rows:
        if groups and y - groups[-1][-1][0] <= 2:
            groups[-1].append((y, c))
        else:
            groups.append([(y, c)])
    gsum = []
    for g in groups:
        cc = Counter(c for _, c in g)
        col = cc.most_common(1)[0][0]
        gsum.append({"rows": [g[0][0], g[-1][0]], "color": list(col), "contrastVsDark": round(contrast(col, DARKBG), 2)})
    x21[fn] = gsum[:8]
out["X21"] = x21

out["ref"] = {
    "contrast(92,92,90)vs(40,40,40)": round(contrast((92,92,90), DARKBG), 2),
    "contrast(84,84,84)vs(40,40,40)": round(contrast((84,84,84), DARKBG), 2),
    "contrast(74,74,72)vs(40,40,40)": round(contrast((74,74,72), DARKBG), 2),
    "contrast(179,179,175)vs paper": round(contrast((179,179,175), PAPER), 2),
    "white on DB3A00": round(contrast((255,255,255), CTA), 2),
    "DB3A00 vs paper": round(contrast(CTA, PAPER), 2),
}

# ---------- CTA decision: button bg ----------
cta = {}
for fn in ["cta-x14-1440-light.png", "cta-x14-1440-dark.png", "hero-x14-1440-light.png", "hero-x14-1440-dark.png"]:
    im = load(fn)
    tc = top_colors(im, lambda c: c[0] > 140 and c[1] < 115 and c[2] < 95, 4)
    def classify(c):
        cands = {"DB3A00": CTA, "FA3600": SIG, "FF5A1F": EMBER}
        best = min(cands, key=lambda k: sum((c[i]-cands[k][i])**2 for i in range(3)))
        d = sum((c[i]-cands[best][i])**2 for i in range(3))
        return f"{best}(d={int(d**0.5)})" if d < 900 else f"other{list(c)}"
    cta[fn] = [{"color": list(c), "n": n, "as": classify(c)} for c, n in tc]
out["CTA"] = cta

print(json.dumps(out, indent=1, ensure_ascii=False))
