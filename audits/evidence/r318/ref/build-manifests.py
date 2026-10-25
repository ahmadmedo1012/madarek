import json

def vw(px, w=1440): return round(px / (w / 100.0), 3)

MAP = {
  "_readme": "R318 C3-H numbers-only extraction from المرجع (Heron). All values measured live (computed styles + screenshots), viewport 1440x900 unless marked mobile 390x844. vw = px/14.4 @1440. Evidence: audits/evidence/r318/ref/. Do not copy pixels/text into the app — numbers only.",
  "meta": {
    "site": "المرجع (heronaiapp.com)",
    "capturedAt": "2026-10-25",
    "viewport": {"w":1440,"h":900}, "rootFontSizePx": 8.3333,
    "anchors": "scroller = .main-inner (wrapper scrollTop, window.scrollY stays 0); capture via wrapper.scrollTop with lenis stopped; gsap.globalTimeline.pause()",
    "contentDriftNote": "live doc grew vs r313: scrollMax 13257 (was 11468), footer top 13440 (was 11651) — growth is AFTER home-map; the map band is unchanged (2358..8658)."
  },
  "band": {
    "section": "section.home-map", "top": 2358, "height": 6300, "vwHeight": vw(6300),
    "stickyStart": 2358, "stickyEnd": 7758, "range": 5400, "vwRange": vw(5400),
    "scrubTrigger": {"id": "ST#34 home-map-wrap", "start": 1908, "end": 7495, "range": 5587,
      "note": "starts 450px before pin (section entering) so band-progress 0 already carries 8% of scrub"},
    "pinMechanism": "CSS position:sticky (home-map-inner, top 0) — NO ScrollTrigger pin; scrub via ST#34 (scrub:true)",
    "stickyBox": {"x": 7, "y": 7, "w": 1427, "h": 887, "flex": "[home-map-main-stick | home-map-content-wrap]"}
  },
  "layerStack": {
    "order": "bottom→top: slogan h1 pair → img1 (kk.png, UNDER svg) → svg line layer (home-map-img-svg.filter) → svg violations overlay (masks+markers) → img2..img5 (ll/fff/Dimensions/final) → img-main container (hovercards) → intro card (absolute, last)",
    "slogan": {
      "elements": ["RIGHT THERE WITH YOU", "FOR THE WHOLE DESIGN"],
      "style": {"font": "BT Grotesk", "sizePx": 46.67, "sizeVw": vw(46.67), "weight": 700, "lh": 46.67, "ls": "-0.93px", "color": "#282828", "bbox": [432, 427, 589, 47]},
      "note": "persistent DOM pair behind the raster layers; visible only while layers above are transparent (statement states + transparent Dimensions state); at mid-band covered by opaque plan renders (pixel-verified: 8763 dark px at p0, 0 at p50%)"
    },
    "rasterStates": [
      {"n": 1, "src": "kk.png", "natural": "1734x1676", "fit": "contain", "box": [7, 23, 1425, 853], "note": "grey plan render (walls medium grey ~#A6A6A6 fills, thin dark outline); fades in st34 .52-.60"},
      {"n": 2, "src": "ll.png", "natural": "2312x2234", "note": "darker plan render with construction lines"},
      {"n": 3, "src": "fff.png", "natural": "2312x2234", "note": "plan render 3 (thick black walls + grey furniture)"},
      {"n": 4, "src": "Dimensions.png", "natural": "2312x2234", "note": "DIMENSION LINES overlay (mm numbers around plan); semi/transparent bg lets slogan show through"},
      {"n": 5, "src": "final layer (inner5)", "note": "violation/dimensions end-state layer, fades in st34 .92-1.0"}
    ],
    "svgLineLayer": {"cls": "home-map-img-svg filter", "viewBox": "0 0 1156 1117", "shapes": 13,
      "stroke": "#72726F (rgb 114,114,111)", "strokeWidth": "1.5px", "fill": "none",
      "extent": [426, 137, 950, 771], "note": "drafting guide/wall outline line work over the render"},
    "violationsSvg": {"cls": "(unnamed svg over plan)", "viewBox": "0 0 1156 1117", "texts": 0,
      "ink": {
        "roomMaskCuts": "6x path fill #FFFFFF behind 3 masks (mask0/1/2) — paper-coloured room cut-outs",
        "crossNodes": "6.9x6.9 #F15534 1px stroke plus-node + 5.3 white-stroked red-filled core, x3",
        "numberSquares": "32.1x32.1 fill #F15534 with white numeral paths 10.7x7.5 ('01','02','03'), x3",
        "oneThickRedLine": "8px #F15534 stroke x1",
        "hoverRoomBox": "home-map-number-box o=0 (hover-only), inner room shape o=0.24"
      },
      "note": "labels are NOT svg text: numerals are paths; halo treatment = none (paint-order normal); HTML hovercards carry the code labels"},
    "hovercards": {
      "count": 3, "box": [[265, 320, 196, 73], [396, 604, 196, 56], [310, 527, 196, 73]],
      "border": "1px #FA3600 all sides", "bg": "paper (bg-global)", "z": 2, "pos": "absolute",
      "pad": "10px", "overflow": "hidden",
      "label": "Geistmono 10px 500 uppercase #FA3600 ('IBC 1017.2' etc), mb 3.33px",
      "title": "BT Grotesk 13.33px 500 #282828 lh 17.33",
      "desc": "BT Grotesk 11.67px muted, display:none on desktop (visible on mobile)",
      "defaultOpacity": 0, "note": "HOVER-ONLY overlays — they never appear in any scrub state (verified across 27 states)"
    }
  },
  "introCard": {
    "cls": "home-map-intro (+active when engaged)",
    "anchor": {"cssTop": 756.53, "cssLeft": 26.67, "collapsedBox": [33, 805, 233, 61]},
    "revealedBox": [33, 702, 233, 164], "reveal": "rises ~103px (805→702) + fades 0→1 + clip opens 61→164, bottom edge PINNED at y≈866 throughout",
    "revealWindow": {"bandProgress": [0.41, 0.50], "st34": [0.47, 0.53], "scrollY": [4570, 4930]},
    "border": "1px #B3B3AF all 4 sides (single rule, no inner rules)", "radius": 0, "bg": "transparent (paper shows through)",
    "head": {"cls": "home-map-intro-head", "box": [34, 703, 231, 26], "bg": "#282828 (ink)", "pad": "6.67px 6.67px 6.67px 10px",
      "title": "INTRODUCTION — Geistmono 10px 500 UPPERCASE #FFFFFF (white on ink), lh 13px", "titleBox": [44, 710, 72, 13]},
    "content": {"cls": "home-map-intro-content", "display": "grid", "overflow": "hidden",
      "items": [
        {"n": 0, "box": [34, 729, 231, 136], "pad": "10px", "text": "Architects spend hours on manual modelling, coordination, and cleanup…", "typo": "BT Grotesk 13.33px 500 lh 17.33 ls -0.267px", "color": "rgba(40,40,40,0.72)", "cue": "[Scroll to continue] Geistmono 11.67px 500 upper #B4B4B0"},
        {"n": 1, "box": [34, 729, 231, 115], "text": "Most of it is repetitive and rule-based…", "typo": "BT Grotesk 11.67px 500 lh 16.33 ls -0.233px", "color": "rgba(40,40,40,0.72)", "cue": "[Scroll to continue] mono 11.67px #B4B4B0"},
        {"n": 2, "box": [34, 729, 231, 128], "text": "Heron works inside your design tool as an agent…", "typo": "BT Grotesk 11.67px", "color": "rgba(40,40,40,0.72)", "cue": "[Scroll to continue] mono 10px #B4B4B0"},
        {"n": 3, "box": [34, 729, 231, 128], "text": "(flags issues / makes edits…)", "typo": "BT Grotesk 11.67px", "cue": "[Scroll to continue] mono 10px #B4B4B0"},
        {"n": 4, "box": [34, 729, 231, 33], "text": "(no body — cue only)", "cue": "[Click on violation] mono 10px #B4B4B0"}
      ],
      "crossfade": "items stacked at same origin, opacity crossfade per state; unrevealed item = opacity:0 (no mask, no color change)",
      "subMarginBottom": "13.33px"
    },
    "paddingGrid": {"cardInner": 0, "contentItem": 10, "headLeft": 10, "textLeftFromCardEdge": 11},
    "positionVerdict": "card sits over the plan container (7,23,1425,853) at its BOTTOM-LEFT corner but over BLANK PAPER — pixel-sampled: 0 plan-ink pixels under card zone in all 9 states (plan drawing occupies centre ~(315,145)-(690,865)); FREE-MARGIN verdict",
    "cardHeights": {"c0": 164, "c1": 143, "c2": 156, "c3": 156, "c4": 61}
  },
  "states": [
    {"p": 0,   "y": 2358, "st34": 0.081, "rasterO": [0,0,0,0,0,0], "citemO": [0,0,0,0,0], "svgW": 1425, "sheet": [1432, 2], "slogan": "A", "note": "statement over blank paper + rulers; card hidden"},
    {"p": 12.5,"y": 3033, "st34": 0.201, "rasterO": [0,0,0,0,0,0], "citemO": [0,0,0,0,0], "svgW": 1427, "sheet": [1433, 0], "slogan": "A→B", "note": "slogan crossfade window"},
    {"p": 25,  "y": 3708, "st34": 0.322, "rasterO": [0,0,0,0,0,0], "citemO": [0,0,0,0,0], "svgW": 1427, "sheet": [1433, 0], "slogan": "B", "note": "FOR THE WHOLE DESIGN"},
    {"p": 37.5,"y": 4383, "st34": 0.443, "rasterO": [0,0,0,0,0,0], "citemO": [0,0,0,0,0], "svgW": 1427, "sheet": [1433, 0], "slogan": "B", "note": "plan starts drawing; card reveal begins right after"},
    {"p": 50,  "y": 5058, "st34": 0.564, "rasterO": [1,0.335,0,0,0,0], "citemO": [1,0,0,0,0], "svgW": 1427, "sheet": [1433, 0], "slogan": "covered", "note": "kk.png plan render in; card state 01 visible"},
    {"p": 62.5,"y": 5733, "st34": 0.685, "rasterO": [1,1,0.768,0,0,0], "citemO": [0,1,0,0,0], "svgW": 1427, "sheet": [1433, 0], "slogan": "covered", "note": "plan render 2; card 02"},
    {"p": 75,  "y": 6408, "st34": 0.805, "rasterO": [1,1,1,0.978,0,0], "citemO": [0,0,1,0,0], "svgW": 1427, "sheet": [1433, 0], "slogan": "covered", "note": "plan render 3; card 03"},
    {"p": 87.5,"y": 7083, "st34": 0.926, "rasterO": [1,1,1,1,1,0.337], "citemO": [0,0,0,0.198,0.802], "svgW": 1427, "sheet": [1433, 0], "slogan": "through-dims", "note": "dimension lines + red 01/02/03 squares; card 03→04 swap"},
    {"p": 100, "y": 7758, "st34": 1.0,   "rasterO": [1,1,1,1,1,1], "citemO": [0,0,0,0,1], "svgW": 963, "sheet": [970, 464], "slogan": "through-dims", "note": "closing: plan 963px + right sheet 464px; cue [Click on violation]"}
  ],
  "stateWindows": {
    "sloganAB_swap": {"bandP": [0.16, 0.25]}, "cardReveal": {"bandP": [0.41, 0.50]},
    "c0": [0.42, 0.58], "c0_c1": [0.58, 0.63], "c1_c2": [0.66, 0.72], "c2_c3": [0.78, 0.84], "c3_c4": [0.86, 0.92],
    "sheetSlideIn": "starts after st34 end (~y7495) as a ~0.4s width transition (NOT frame-locked scrub; mid-flight values vary run-to-run); final sheet x=970 w=464 is deterministic (verified post-band y7900-8500)"
  },
  "rightSheet": {
    "cls": "home-map-content", "finalBox": [970, 7, 464, 887],
    "label": "YOUR MODEL. YOUR TOOLS. CONNECTED. — Geistmono 11.67px 500 upper rgba(40,40,40,.72), box (996,20,108,35)",
    "title": "RUN AN AGENT NATIVELY IN YOUR MODEL — h2 BT Grotesk 40px 600 ls -0.8 upper #282828, box (996,427,410,120)",
    "sub": "BT Grotesk 13.33px muted, (996,567,359,87)",
    "cmsList": "4 rows 464x53, title 410x53 + icon cell 53x53 (icon inner 27x27), rows at y680/733/787/840",
    "note": "sheet is clipped to 0px through states 1-4 then slides in at the end (transition-smoothed)"
  },
  "planMidStateInk": {
    "atBandP": 0.42, "st34": 0.486,
    "walls": "grey fills in raster (kk.png) ~#A6A6A6 + svg line layer #72726F 1.5px on top",
    "roomFills": "white/paper fills via svg masks (room cut-outs)",
    "activeRoom": "no scrub-lit active room on the reference: highlight = hover-only (number-box o=0 → inner 0.24 overlay) + 32.1px red #F15534 number squares",
    "labels": "no svg text labels; numerals as white paths inside red squares; code labels only in hover cards (hover-only)",
    "caption": "the intro card IS the caption (bottom-left); no separate plan caption",
    "dimensionLines": "raster Dimensions.png (state 4) — mm numbers around plan (e.g. 5590, 4690, 5686, 3120)",
    "scheduleTable": "NONE on the reference map band (no schedule/table element at any state)",
    "zOrder": "slogan(z auto, bottom) < renders < svg lines < violations svg < hovercards(z2, absolute) < intro card (DOM-last)"
  },
  "mobile": {
    "viewport": {"w": 390, "h": 844}, "rootFontSizePx": 9.9237,
    "band": {"top": 2553, "height": 4819, "stickyStart": 2553, "stickyEnd": 6528, "range": 3975},
    "sticky": "home-map-main-stick-inner position:sticky (8,8) 374x828 — sticky EXISTS on mobile (shorter band)",
    "planFitted": {"container": [8, 28, 374, 689], "pctViewportWidth": 95.9, "note": "plan container = full content width 374px (=390-2x8 frame inset)"},
    "introCard": {"box": [40, 732, 278, 73], "belowPlan": True, "head": [41, 733, 276, 31], "bg": "#282828",
      "title": "INTRODUCTION mono 11.91px white", "body": "BT Grotesk 15.88px lh~20 muted", "cue": "[Scroll to continue] mono 13.89/11.91px #B4B4B0"},
    "indexMarkers": "NONE — no [nn/05] markers at any viewport; cues are [Scroll to continue] x4 + [Click on violation]; the 32px red squares carry 01/02/03 as drawn paths",
    "stageIndicator": "none beyond the cue rows; plan-band numbering = red squares only",
    "hovercards": {"box": [[31, 705, 328, 111], [31, 677, 328, 139], [31, 697, 328, 120]], "desc": "VISIBLE on mobile (2-3 extra rows), z4, transform x -164px (tucked), o=0 default"},
    "closingSheet": "stacked BELOW the sticky as normal flow: home-map-content 374x599 (label 47 + title 330 + cms list 222; 4 rows 374x56 with 56x56 icon cell, 319px title, 24px icons) — NOT a side sheet",
    "h1": "BT Grotesk 39.69px 700 #282828, pair at (28,382) 334x79",
    "footerStrip": {"wrap": [8, 604, 374, 137], "img": "footer1.avif 2571x566 rendered 334x48 o=0.8 (small centred wordmark, not full-bleed)"}
  },
  "statementBand": {
    "section": "home-intro", "top": 893, "height": 723,
    "illustration": {"box": [7, 0, 713, 723], "asset": "image 345.avif natural 1766x1766 object-fit contain",
      "content": "black line-drawn axonometric building with vertical hatching + SOLID ORANGE SUN DISC ~243px diameter at (319,54)-(558,298) inside the illustration box, disc colour #FA3600-family (sampled 245,70,7)",
      "pixelRows": "NO DOM pixel rows on the reference — closest are the client-logo strip (93x47 logos in 143px cells) and the dotted grid inside the footer wordmark image"},
    "headline": {"box": [845, 54, 463, 267], "text": "THE REPETITIVE PARTS OF MODELLING SHOULDN'T EAT YOUR DAY", "note": "h2/h3 grammar, #B4B4B0 per r313 digest for this heading class"},
    "btn": [845, 347, 136, 42],
    "clientsStrip": {"box": [720, 564, 713, 159], "label": "CLIENTS mono 11.67px upper #282828 at (747,575)", "slides": "143x95 cells, logo img 93x47, prev/next controls 38x38 at (1358/1396,564)"},
    "nextBand": "PROBLEMS label (33,750) + h2 'YOUR DESIGN TOOLS DO WHAT YOU TELL THEM, NOTHING MORE' 40px 600 (33,779,695,80); problem columns at x33/390/747/1103 with headers MANUAL[01]/DISJOINTED[02]/BLIND[03]/SLOW[04] (label #282828 + index #B4B4B0 mono 11.67) and 167x167 wireframe svgs (#B3B3AF 1px strokes)"},
  "evidence": {
    "sheets": ["map-states-1440.jpg (3x3, 89KB)", "map-states-390.jpg (42KB)"],
    "states": "map-1440-p000..p1000.jpg (27 jpegs) + inv-map-1440-p*.json (DOM inventory per state)",
    "mobile": "map-390-p000..p1000.jpg + inv-map-390-p*.json",
    "computed": ["map-computed-1440.json (static CSS truth)", "map-svg-detail-1440.json (svg shapes)", "map-img-layers-1440.json", "markers-1440.json", "images-1440.json", "triggers-1440.json", "triggers-390.json", "meta-1440.json", "meta-390.json"],
    "postBand": "map-1440-post1/2/3.jpg + inv (sheet final-state verification)",
    "probes": ["probe-r318.mjs (progress-anchored sweep)", "probe2-r318.mjs", "probe4-r318.mjs (verified-scroll re-runs)", "build-sheets.mjs"]
  }
}

PLATFORM = {
  "_readme": "R318 C3-H numbers-only extraction — PLATFORM section from المرجع. 1440x900. vw = px/14.4.",
  "meta": {"site": "المرجع (heronaiapp.com)", "capturedAt": "2026-10-25", "section": "home-platform", "top": 8658, "box": [7, 0, 1427, 710], "viewportBoxAtTop": [7, 0, 1427, 710]},
  "columns": {
    "count": 3,
    "left": {"cls": "home-platform-content-left", "box": [7, 384, 361, 145], "note": "the left SHEET column, 361px = 25.07vw"},
    "center": {"cls": "home-platform-img-wrap bg-global", "box": [368, 0, 601, 710], "note": "tool-interface canvas, 601px = 41.74vw; runs FULL section height"},
    "right": {"cls": "home-platform-content-right", "box": [969, 384, 464, 145], "note": "inspector/text column, 464px = 32.22vw"},
    "hairlines": [{"cls": "home-platform-img-line-right", "box": [968, 0, 1, 710], "bg": "#B3B3AF", "z": 2}],
    "gaps": "left|center boundary at x368 (1px line at 367 implicit grid), center|right hairline x968"
  },
  "h1": {
    "present": False,
    "verdict": "NO h1 inside the platform section; its left sheet carries the [01]/[02] + h4 title grammar. The nearest large heading is the map band's right-sheet h2 'RUN AN AGENT NATIVELY IN YOUR MODEL' (40px) directly above, and home-why's h2 below.",
    "leftSheetRows": {
      "number": {"box": [33, 411, 299, 16], "text": "[01]/[02]", "style": "Geistmono 11.67px 500 upper #B4B4B0"},
      "title": {"box": [33, 486, 299, 27], "text": "HERON CHAT WIDGET / HERON DASHBOARD", "style": "h4 BT Grotesk 26.67px 600 ls -0.533px upper #282828 lh 26.67"},
      "gap": "number row top 411 → title top 486 = 75px; sheet row height 145; sticky row engaged at viewport y384 when section top hits 0"
    }
  },
  "states": {
    "trigger": "ST#35 home-platform-content scrub 7765→9362 (range 1597)",
    "state01": {"scrollY": 7765, "left": "[01] HERON CHAT WIDGET", "rightSub": "A chat that floats over your design tool. Ask it about your model… (411x52, BT Grotesk 13.33 muted)", "centerImg": "Before-1.avif natural 1440x870 → rendered 599x354"},
    "state02": {"scrollY": 9362, "left": "[02] HERON DASHBOARD", "rightSub": "Ask code questions about your building…", "centerImg": "Before.avif natural 2880x1740 → rendered 599x354"},
    "crossfade": "two .home-platform-content-inner grids crossfade (o 0.295/0.705 at y8658 = 56% of trigger)",
    "btn": {"cls": "home-platform-content-btn", "box": [969, 490, 464, 40], "label": "LEARN MORE Geistmono 11.67px upper #282828 dual-label at (996,501) 374x16", "note": "464x40 full-bleed row button, z0"}
  },
  "toolInterface": {
    "canvas": {"box": [368, 0, 601, 710], "items": [{"box": [368, 0, 601, 355]}, {"box": [368, 355, 601, 355]}],
      "itemWrap": [369, 1, 599, 353], "note": "two stacked 601x355 tool captures (plan-with-violations on top, dashboard UI below in s02 state)"},
    "toolRailInspector": "NOT DOM — the tool rail / canvas / inspector columns are drawn INSIDE the raster captures (599x354)",
    "tooltipCards": {
      "verdict": "INSIDE the frames (drawn in the raster), NOT DOM overlays",
      "s02Example": "red notification box bottom-left INSIDE the drawing frame: solid red fill (#FF3300-family) + white text 'IBC 1011.5.2 / RISER HEIGHT / EXCEEDS CODE', mono key/value rows",
      "s01Example": "red square room-tag with number '62' + dimension texts (5686, 3120, 7948, 1808) and door labels D9/D18 drawn in the raster"
    },
    "accentRoom": "red #FA3600-family square tag (room number) + red error box — the accent treatment lives in the tool raster, echoed by the site's #FA3600 system",
    "monoLabels": [
      {"text": "[01]/[02]", "box": [33, 411], "style": "Geistmono 11.67 #B4B4B0"},
      {"text": "LEARN MORE", "box": [996, 501], "style": "Geistmono 11.67 #282828"},
      {"text": "WHY US", "box": [33, 843], "style": "Geistmono 11.67 upper rgba(40,40,40,.72)", "note": "next section's label marks the platform bottom edge"}
    ]
  },
  "evidence": {
    "sheets": ["platform-1440.jpg (s01|s02, 62KB)"],
    "captures": ["platform-1440-top.jpg (y8658)", "platform-1440-s01.jpg (y7765)", "platform-1440-s02.jpg (y9362)", "inv-platform-1440-{top,s01,s02}.json"]
  }
}

FOOTER = {
  "_readme": "R318 C3-H numbers-only extraction — FOOTER from المرجع. 1440x900 bottom capture + 390x844. vw = px/14.4.",
  "meta": {"site": "المرجع (heronaiapp.com)", "capturedAt": "2026-10-25", "footer": {"top": 13440, "box": [7, 183, 1427, 711], "grid": "355 (main) + 314 (strip) + 42 (copyright)"}},
  "grid": {
    "columns": [
      {"name": "head", "cls": "footer-head", "x": 7, "w": 357, "note": "title + subscribe form"},
      {"name": "body", "cls": "footer-body", "x": 363, "w": 715, "note": "menu 3x238 + info 3x238"},
      {"name": "logo", "cls": "footer-logo", "x": 1076, "w": 357}
    ],
    "captionAlignment": {"menuColumns": [363, 602, 840], "captionX": [377, 615, 853], "rule": "captions sit +14px from each column left edge (238px columns, 14px inner gutter)"},
    "separator": {"box": [363, 384, 715, 1], "bg": "#B3B3AF", "z": 2, "note": "hairline between menu row and info row"}
  },
  "wordmark": {
    "strip": {"cls": "footer-img-wrap", "box": [7, 538, 1427, 314], "aspect": "4.545:1",
      "innerFrame": {"box": [16.7, 547.6, 1406.7, 294.2], "bars": "6.7px", "plusMarks": "10x10 at strip corners (15,546 / 1415,546 / 15,833 / 1415,833)"}},
    "image": {"asset": "Frame 484 (1).png", "natural": "3428x754", "rendered": [7, 538, 1427, 314], "fit": "contain",
      "crop": "NONE — 3428/754 = 4.543 matches strip 1427/314 = 4.545 exactly (aspect-true render)"},
    "verdict": "STROKE-ONLY — 'HERON AI' drawn as thin uniform outlines, interior empty (paper shows through); NOT filled",
    "ink": {
      "colour": "black/near-black (#000-#181818) on paper #F4F4EE",
      "strokeWidth": "3-5px in the 3428px asset ≈ 1.3-2.1px rendered at 1427px (typical ~1.7px)",
      "glyphHeight": {"assetPx": 521, "renderedPx": 217, "pctOfStripHeight": 69},
      "inkBbox": {"asset": [226, 120, 3190, 640], "rendered": [94, 66, 1328, 281]},
      "letters": "Latin caps H E R O N ␣ A I — NOT Arabic, NOT connected; 6 glyph groups (some crossbars merge): widths 442/369/875/426/428/108 asset px",
      "font": "custom drafting-style letterforms (BT Grotesk-like skeleton) + small crosshair node markers at stroke vertices/midpoints + faint dotted grid behind"
    },
    "inkRender": {
      "mechanism": "ink-mask > ink-mask-img main (img z1) + sub ink-filter (turbulence-edge svg 'layer' viewBox 1000x220.2, z2)",
      "label": "NO DOM label on the desktop strip — the only text is the wordmark art itself; mobile variant shows a small centred image instead",
      "lens": "pointer lens r99.09 / pulse 104.04 (r313 telemetry, unchanged)"
    }
  },
  "columns": {
    "left": {
      "title": {"box": [20, 196, 330, 80], "text": "AN AI AGENT THAT WORKS INSIDE YOUR DESIGN TOOLS", "style": "h4 BT Grotesk 26.67px 600 ls -0.533 upper #282828, 3 rows of 27px"},
      "subscribe": {"label": "SUBSCRIBE — Geistmono 11.67px upper #626260 at (20,398)",
        "formTitle": "BT Grotesk 13.33px muted (20,430,330,35)",
        "input": {"box": [6, 498, 358, 40], "border": "1px #B3B3AF (right side 0 — merged with submit)", "font": "BT Grotesk 13.33"},
        "submit": {"box": [324, 498, 40, 40], "border": "left 1px #B3B3AF", "arrow": "13x8 → 17x17 on hover"}}
    },
    "menu": {
      "captions": ["COMPANY", "PRODUCT", "RESOURCES"], "captionStyle": "Geistmono 11.67px 500 upper #626260",
      "links": "BT Grotesk 13.33px 500 #282828, hover #FA3600; current page latched #FA3600; 26px rows, 37px rhythm",
      "note": "Home/About us/Contact us | Heron Chat Widget/Heron Dashboard/Pricing | Insights/AI Practices/Design Workflows"
    },
    "info": {
      "address": "60 Martin Pl, Sydney, NSW 2000, Australia — 2 lines 43px block",
      "emails": ["business@bear.plus (New business)", "hello@heronaiapp.com (General inquiries)"],
      "social": "2-col grid of 99x26 links: Website, Dribbble, FWA, Awwwards, Instagram, Linkedin"
    },
    "logo": {"box": [1076, 183, 357, 355], "svg": "footer-logo-svg 217x217 at (1146,252), viewBox 32x32: 7 stroke-only #FA3600 1px paths + 1 filled #282828 path", "sketchVariant": "215x222 o=0 (hover swap)", "note": "NOT a wordmark — an isometric 'H' line logo"}
  },
  "copyright": {
    "row": [7, 852, 1427, 42],
    "text": "©2026 HERON AI. ALL RIGHTS RESERVED. CONCEPT CRAFTED BY BEARPLUS — Geistmono 11.67px upper rgba(40,40,40,.72) at (33,866)",
    "policy": "right-aligned links x969-1433 (Privacy Policy / Terms & Conditions / Cookie Policy), 42px rows"
  },
  "mobile": {
    "viewport": {"w": 390, "h": 844},
    "title": "h4 23.82px, (23,-409) 344x79",
    "logo": "119x119 centred at (136,453)",
    "strip": {"wrap": [8, 604, 374, 137], "img": "footer1.avif 2571x566 → 334x48 at (28,648) o=0.8 — small centred wordmark, NOT full-bleed (vs desktop 1427x314)",
      "crop": "mobile shows the AVIF cropped small (334x48 window), desktop shows the PNG aspect-true full strip"},
    "menu": "2-col: 155px cells (Home/About us | Contact us…), links 13.89px",
    "copyright": "centred 218x26 at (86,752), Geistmono"
  },
  "evidence": {
    "sheets": ["footer-1440.jpg (84KB)"],
    "captures": ["footer-1440-bottom.jpg (y13257)", "footer-390-bottom.jpg", "inv-footer-1440-bottom.json", "inv-footer-390-bottom.json", "footer-img-1440.json", "footer-wordmark-1440.json", "images-1440.json"],
    "wordmarkAsset": "asset measured from the live image in /tmp only (not committed) — numbers above; the committed evidence shows it inside footer-1440.jpg"
  }
}

import os
base = '/home/z/madarek-wt/c3-h/docs/redesign/r318'
for name, data in [('heron-map.json', MAP), ('heron-platform.json', PLATFORM), ('heron-footer.json', FOOTER)]:
    p = os.path.join(base, name)
    with open(p, 'w') as f:
        json.dump(data, f, indent=1, ensure_ascii=False)
    json.load(open(p))
    print(name, 'written + parsed OK,', round(os.path.getsize(p)/1024, 1), 'KB')
