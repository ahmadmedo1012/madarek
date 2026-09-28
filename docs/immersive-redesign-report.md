# تقرير إعادة الإعمار — جولة القادة «أطلس المعرفة»

> الفرع: `feat/immersive-redesign-v2` (يُكمل PR #30) · التاريخ: 2026-09-28
> المنهجية: scroll-craft (منحنى الشعور، عائلات الأجهزة، ذروة واحدة) + impeccable (سطح Persuade، حرفية بلا تسويف) + تحكيم بصري عمياء VLM قبل/بعد على لقطات فعلية.

## 1) ما كان ضعيفًا (تشخيص هيئة التحكيم على اللقطات — لا انطباعات)

الدرجات على 8 محاور قبل الجولة (VLM على 9 لقطات 1440px مقابل المرجع):
انطباع أول 4/10 · عمق الـHero 3/10 · إخراج فني 3/10 · طباعة عربية 5/10 · سرد التمرير 2/10 · حرفية دقيقة 3/10 · لون وضوء 4/10 · **جاهزية عالمية 3/10**.
التشخيص: «صفحة مُصمَّمة، لا مُؤلَّفة» — لا طقس دخول، لا عمق جوّي، طباعة آمنة لا نحتية، صفر سينماتوغرافيا تمرير، مكونات افتراضية، فراغ غير مقصود، RTL كانعكاس لا كأداة.

## 2) ما أُعيد بناؤه جذريًا (لا تحسينات تراكمية)

| النظام | القديم (حُذف) | الجديد |
|---|---|---|
| طقس الدخول | دخول فوري | `PreloaderRitual` — 1.65 ث: ثلاث حلقات نحاسية تنطبق + «مدارك» كوفي تتبلور + عدّاد، مرة/جلسة، قابل للتخطي، reduced-motion=تلاشي 300ms |
| محرّك السماء | `OrbitScene` (مدارات مفردة) | `SkyAtlas` — 5 مستويات مستقلة: سديم مُسبق التصيير، نجوم بعيدة/قريبة بمعدلات parallax مختلفة، **أسطرلاب نحاسي** (4 حلقات + شرطات درجات بأرقام عربية-هندية + رَتِة دوّارة + مِرْقاة معاكسة + هالة جوّية)، غبار قريب، كوكبة المؤشر، شهاب نادر |
| الخط العربي | Plex آمن 118px | **Noto Kufi Arabic** (500/700/800، self-hosted، arabic+latin) حتى 9vw مع أقنعة صاعدة `KineticWords` تحترم نوازل الحروف + Amiri للاقتباسات |
| بنية الصفحة | 8 فصول مكدّسة | **5 حركات سينمائية**: Hero مثبت 260vh (حالتا عبور) → مسار أفقي للكليات 320vh (`HorizonRail` — 6 محطات مدارية على خط الأفق) → **ذروة «الطريق»** مثبتة 500vh (5 محطات تتبادل وكوكبات تُرسم بالتمرير) → تدفق التقدّم/الحرم/الأدوار → ختام حاسم «ابدأ» |
| الحركة التوقيعية | خيط داخل فصل واحد | **`GoldenThread`** — خيط ذهبي يرسم نفسه عبر الصفحة كلها (يقيس العقد الحقيقية من DOM، مقاطع تكتمل عند منتصف شاشة كل عقدة، رأسه مسافر متوهّج، يُغلق دائرة كاملة حول CTA الختام) |
| التمرير | native فقط | `useSmoothScroll` — عجلة بدفع أُسّي على المؤشر الدقيق فقط؛ لوحة المفاتيح/شريط التمرير/اللمس/reduced-motion تبقى native بلا مساس |
| المؤشر | لا شيء | `CursorCompanion` — نجمة رفيقة بمومنتم تتحول حلقة فوق العناصر التفاعلية (pointer:fine فقط، تختفي فوق حقول النص) |
| الجوّ | تدرّج + نقاط | حبيبات فيلم 4.5% + vignette + غبار نجوم متنفّس + أرضية داكنة صلبة تحت التدرجات (تُصلح تباين axe) |

## 3) ما حُذف ولماذا / ما بُقي ولماذا

- **حُذف**: `OrbitScene` (مستوى واحد لا عمق)، `CollegeConstellation` (شبكة ساكنة — استُبدلت بمسار أفقي مقصود)، `JourneyLightPath` (موضعي — استُبدل بخيط الصفحة كاملة)، بنية الأقسام المكدّسة، أحجام العناوين الآمنة.
- **بُقي**: كل المحتوى الحقيقي (25 كلية من `colleges.config`، أرقام تجربة الصف المعكوس المنشورة، 1988، العضويات)، الهيدر/Megamenu/Popover (مختبَر ومُتاح)، القالب الآمن للمصادقة، القواعد: أرقام حقيقية فقط.
- **صُحّح أثناء التحقق (بugs حقيقية وُجدت وقُتلت)**:
  1. **قفل التمرير الأبدي**: تابع `onDone` inline كان يعيد تشغيل effect الطقس بعد إعادة رسم الصفحة فيُقفل `html{overflow:hidden}` للأبد (صفحة مجمدة بالكامل — أكتشفتها هيئة التحكيم وأكّدها diff بكسلي 0.5% ثم إصلاح ref). 
  2. تسلسل عناوين h1→h3 في مسار الكليات (h2/h3 الآن).
  3. تباين مناطق قابلة للتمرير بلا خلفية صريحة (سرير داكن للسكة).
  4. h1 يغادر شجرة الوصول عند الحالة الثانية (الآن يبقى visible وتنزل كلماته خلف الأقنعة).

## 4) الأدلة المقيسة (كلها أوامر فعلية، لا ادّعاءات)

- **tsc**: 0 أخطاء · **vitest**: **855/855** (80 ملفًا) · **build**: نظيف ~6s (LandingPage-*.js = 59KB/18.9KB gzip).
- **axe-core عبر Playwright**: **0 انتهاكات** عند 1440/1024/768/390/320px (فحص أعلى الصفحة + منتصفها لكل منفذ).
- **فيض أفقي**: 0px عند كل المنافذ (scrollWidth−innerWidth ≤ 0).
- **أخطاء console/page**: صفر.
- **التثبيت (pin) مقيسًا رقميًا**: hero stage يلتصق top=0 خلال نطاقه، colleges كذلك (y≈2558→4500)، journey كذلك (y≈5571→9000) — مسجّل بسكربت `diag-sticky.js`.
- **خيط الرحلة**: strokeDashoffset ينحدر رتيبًا 17999→1840 مع التمرير (يرسم فعلًا)، ويكتمل عند القاع.
- **ترتيب Tab**: brand → المنصة → روابط → CTA (سليم)، وEscape يغلق Megamenu (محفوظ من v2).
- **تحكيم VLM عمياء (لقطات فعلية)**:
  - قبل: جاهزية عالمية **3/10**
  - بعد الجولة (نفس المحاور الثمانية): تأثير 9 · hero 9 · إخراج فني **9.5** · طباعة 9 · سرد **9.5** · حرفية 8.5 · لون 9 · جاهزية **8.5** — **المتوسط 8.88/10**، الحكم: «SOTD-Podium Ready: YES (conditional)»، وشروطه الثلاثة (تباين خطوط الكوكبات، reduced-motion للقوس والطقس، فحص overflow الأسماء) **نُفّذت جميعًا** في هذا الـcommit.
- **أخطاء هيئة التحكيم الستة المرئية** (صورة الحرم الصادمة، محاذاة حالتي الـhero، إيقاع المحطات، محاذاة المعالم المدارية، CTA الختام العام) — أُصلحت كلها وأُعيد تصويرها.

## 5) القيود الصادقة

- الاختبار على Chromium headless فقط (لا Firefox/Safari حقيقيين ولا جهاز iOS فعلي) — منفذ العرض 390/320 يغطي القياس لا سلوك اللمس الحقيقي.
- smooth-scroll اختبر عبر scrollTo/لوحة المفاتيح، لا عبر محاكاة عجلة فيزيائية.
- Lighthouse لم يُشغَّل في هذه الجولة (قياس v2 السابق: 55fps للـcanvas؛ المحرّك الجديد أثقل طبقةً لكنه يتوقف خارج الشاشة ويخفض الكثافة تلقائيًا).
- الصفحات الداخلية خارج نطاق هذه الجولة (قاعدة النشر: الهبوط مسرح، الداخل أدوات هادئة).
- الموقع المنشور على Render لن يتغير حتى يُدمج PR #30 في main.

## 6) كيف تُراجع

```bash
cd frontend && npm run build && npx vite preview --port 4173
# ثم افتح http://localhost:4173 — جلسة جديدة = طقس الدخول كاملًا؛ أعد التحميل = دخول مباشر.
```
أدلة بصرية: `/home/z/my-project/audit/leaders-v2/` (45 لقطة + 3 أوراق تماس + 4 تحكيمات VLM خام).

---

## Round 4 — Reference-Matched Rebuild (2026 session)

**User direction:** full scrape of the reference site, understand it in detail,
then apply its shapes / themes / patterns to be closest to it. Plus: fix the
slow scrolling and the overlapping mobile version.

**What was done (evidence-backed):**

1. **Full reference scrape** (`/home/z/my-project/reference-scrape/`): HTML
   (10 sections mapped), complete stylesheet (47KB), JS bundles (GSAP +
   ScrollTrigger + Three.js detected, e-pin class-swap pinning system decoded).
2. **Design system extracted and re-applied** (100% original code): palette
   #110529 / #7367f0 / gradient 7367f0→8e2de2 / cream #f6f5e9 / blend
   #e2efba / footer #5123af; Rubik display font (Gridular role) + Plex Sans
   Arabic + Plex Mono; mono bracket tags; glass recipe (blur 20 + rgb(40 40
   40/.2) + 1px white/16%); gradient pill buttons with roll-up labels +
   accent glow; corner-composed hero (RTL-mirrored) with JS marquee;
   (S-001) stat pill anatomy; violet footer bookend with giant wordmark.
3. **Scroll jank eliminated** — the deployed version's smooth-scroll
   hijacking was replaced with native scroll: ONE rAF listener writes a CSS
   var (progress bar = compositor scaleX) + header class. OrbitScene
   rebuilt: zero per-frame allocations (bucketed fills), no layout reads,
   DPR 1.5 cap on mobile, scroll-velocity reactive, deterministic rebuilds.
   useReveal centralized: 1 shared listener for all 47 elements.
   **Measured: 60 fps / 0 long-frame gaps on 390px; 60 fps steady on 1440px.**
4. **Mobile overlap fixes** — programmatic bounding-box audit now reports
   ZERO viewport escapes; header CTA hidden ≤560; letter-spacing 0 on
   Arabic display text; station headers wrap; menu is absolute +
   max-height(100dvh) + scrollable; backdrop-filters and the fixed grain
   layer are dropped ≤768 (solid surfaces); legibility floor 12.5px.
5. **VLM-verified quality**: hero 8.5/10 desktop; mobile hero after-fix
   header 9/10, readability 8/10, polish 8/10 (before: 6/5/6).
6. **Tests**: 997/997 pass on the merged tree (tsc clean, build clean).
