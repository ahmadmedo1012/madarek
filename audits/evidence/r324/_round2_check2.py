#!/usr/bin/env python3
"""R324 round-2 supplements: button label color in dark, map dark light-ink token, footer pure-black bbox."""
import os, json
from PIL import Image
from collections import Counter

D = "/home/z/my-project/madarek/audits/evidence/r324"
def lum(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def near(c,t,tol):
    return all(abs(c[i]-t[i])<=tol for i in range(3))

out={}

# 1) dark CTA button label color: bbox of ember pixels in cta-x14-1440-dark.png
im = Image.open(os.path.join(D,"cta-x14-1440-dark.png")).convert("RGB")
w,h = im.size; px = im.load()
xs=[];ys=[]
for y in range(0,h,2):
    for x in range(0,w,2):
        c=px[x,y]
        if near(c,(255,90,31),25): xs.append(x); ys.append(y)
if xs:
    x0,x1,y0,y1 = min(xs),max(xs),min(ys),max(ys)
    cnt=Counter()
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            c=px[x,y]
            if not near(c,(255,90,31),30) and not near(c,(255,107,51),30):
                cnt[c]+=1
    out["darkBtn"]={"bbox":[x0,y0,x1,y1],"topNonBgColorsInBtn":cnt.most_common(6)}

# 2) same for light CTA button label
im = Image.open(os.path.join(D,"cta-x14-1440-light.png")).convert("RGB")
w,h=im.size; px=im.load()
xs=[];ys=[]
for y in range(0,h,2):
    for x in range(0,w,2):
        c=px[x,y]
        if near(c,(219,58,0),25): xs.append(x); ys.append(y)
if xs:
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    cnt=Counter()
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            c=px[x,y]
            if not near(c,(219,58,0),30) and not near(c,(199,46,0),30):
                cnt[c]+=1
    out["lightBtn"]={"bbox":[x0,y0,x1,y1],"topNonBgColorsInBtn":cnt.most_common(6)}

# 3) light-ink token in post-X18 dark map stages + dark-ink in light stages
for fn in ["map-s2-1440-dark.png","map-s4-1440-dark.png","map-s6-1440-dark.png"]:
    im=Image.open(os.path.join(D,fn)).convert("RGB"); w,h=im.size; px=im.load()
    cnt=Counter()
    for y in range(0,h,3):
        for x in range(0,w,3):
            c=px[x,y]
            if lum(c)>0.5: cnt[c]+=1
    out[fn+"_lightInk"]=cnt.most_common(3)
for fn in ["map-s4-1440-light.png"]:
    im=Image.open(os.path.join(D,fn)).convert("RGB"); w,h=im.size; px=im.load()
    cnt=Counter()
    for y in range(0,h,3):
        for x in range(0,w,3):
            c=px[x,y]
            if lum(c)<0.15: cnt[c]+=1
    out[fn+"_darkInk"]=cnt.most_common(3)

# 4) pure-black bbox in footer-x23-1440-light.png
im=Image.open(os.path.join(D,"footer-x23-1440-light.png")).convert("RGB")
w,h=im.size; px=im.load()
xs=[];ys=[];n=0
for y in range(0,h,2):
    for x in range(0,w,2):
        c=px[x,y]
        if c[0]<8 and c[1]<8 and c[2]<8: xs.append(x); ys.append(y); n+=1
out["footerLightPureBlack"]={"countSampled":n,"bbox":[min(xs),min(ys),max(xs),max(ys)] if xs else None}

# 5) header hairline color across post-X18 dark map stages (row scan top 8 rows)
for fn in ["map-s2-1440-dark.png","map-s6-1440-dark.png"]:
    im=Image.open(os.path.join(D,fn)).convert("RGB"); w,h=im.size; px=im.load()
    found=None
    for y in range(0,10):
        cnt=Counter()
        for x in range(0,w,2):
            c=px[x,y]
            if max(c)-min(c)<10 and 55<sum(c)/3<150: cnt[c]+=1
        if cnt and sum(cnt.values())>0.5*(w/2):
            found=[y,cnt.most_common(1)[0][0]]
            break
    out[fn+"_headerHairline"]=found

print(json.dumps(out,indent=1,ensure_ascii=False))
