# PORT-KIT — مواصفة استنساخ عالم الـlanding (Orbit-Ink) · عقد النقل الأسطولي

> **ما هذا:** مواصفة نقل عالم الـlanding المدركي (Orbit-Ink — طبقة
> `--ln-*`) إلى منتجات الأسطولة، بحيث يستنسخ كل منتج الطبقة التعريفية
> نفسها حرفيًا: التوكنات، قاعدة النطاق، الماركي، الكروم، عائلة الظهور،
> وتشريح الرحلة — بلا اختراع قيمة واحدة.
>
> **الإسناد الكنوني:** القيم المرجعية = `frontend/src/styles/tokens.css`
> (طبقة Orbit-Ink: `--ln-*` + `--ln-t-*`/`--ln-ease-*`) و
> `frontend/src/styles/landing.css` — **عند الالتزام c4b4506 (تبنّي r140)**.
> وُلد الكيت في r128 ضد النسخة cf7ffca (جولة الـlanding الثالثة) واستنسخه
> المنتجات منها؛ r140 ضمّه إلى الكنون بإسناد النسخة الحية.
>
> **الحدّ الفاصل (علاقة بزوج التصدير):** طبقة `--ln-*` **تبقى خارج زوج
> التصدير** (`unified-parity.css`/`shared-design-system.css`) — عالم
> الـlanding مفردات مدارك الخاصة (DESIGN.md §1a). هذا الملف هو عقد
> النقل **فوق** الاستثناء: المنتجات التي تريد الـlanding التعريفي تنقله
> عبر هذه المواصفة لا عبر زوج التصدير.

## المصدر (Provenance)

الكيت وُلد في r128 كملف sandboxي (`/home/z/my-project/specs/r128/PORT-KIT.md`)
استهلكته أربعة منتجات بالاستشهاد الحرفي في رؤوس أوراق `landing.css` الخاصة
بها. الملف الأصلي لم يعد موجودًا في الـsandbox (تدقيق r140 — فجوة M-4)،
فأُعيد بناء هذه الوثيقة في r140 **من الحقيقة الحية**: الاستشهادات
والكتل المنقولة في مستودعات المنتجات الأربعة نفسها (الأدلة أدناه
ملف:سطر). أي تعارض مستقبلي: القيم الحية في `tokens.css`/`landing.css`
هي الحكم.

## §0 — قاعدة النطاق (R4)

كل شيء داخل غلاف `.landing` على جذر الصفحة: عالم الـlanding يُرسَم
**في الثيمين معًا** (مرحلته الداكنة مقصودة)، ودبابيس توكنات المنتج
(`globals.css`/`styles.css`) **لا تُمس أبدًا**. أي `var()` يشير إليه كتلة
منقولة ولا تملكه ورقة المنتج يُجسَّر **داخل `.landing` حصرًا** بقيمة
مداركية حرفية (Bridge tokens) — لا قيمة منتحلة أبدًا (ملاحظة §1).

## §1 — كتلة توكنات Orbit-Ink (حرفيًا)

تنقل **نصًّا كما هي** من `tokens.css` (المرجع الحي: SL
`src/app/landing.css:20-53`):

```css
.landing {
  --ln-ink:        #252A3E;   /* primary flat ground */
  --ln-ink-2:      #1C2032;   /* darker step — scene separation */
  --ln-cream:      #F5F3E7;   /* primary text on ink — 12.75:1 AAA */
  --ln-cream-dim:  #C9C6B4;   /* secondary text — 8.26:1 AAA on ink */
  --ln-lime:       #DFEDB2;   /* accent 1 (pistachio) */
  --ln-lime-deep:  #B9D778;   /* hover/active lime — 8.82:1 on ink */
  --ln-violet:     #7A6BF2;   /* accent 2 — large-text/accent only */
  --ln-violet-deep:#4E2FB8;   /* depth — decorative fill only */
  --ln-line:       rgba(245,243,231,0.14);  /* 1px hairline on ink */
  --ln-line-soft:  rgba(245,243,231,0.07);  /* resting card border */
  --ln-grain-op:   0.075;     /* the rendered canonical (see R7) */
  --ln-radius-pill: var(--r-full);
  --ln-h1:         clamp(2.75rem, 8.2vw, 6.75rem);  /* hero ≤108px */
  --ln-h1-lh:      1.04;      /* mobile lifts to 1.12 in landing.css */
  --ln-t-fast:      var(--t-fast);      /* 160ms */
  --ln-t-base:      var(--t-base);      /* 240ms */
  --ln-t-slow:      var(--t-slow);      /* 380ms */
  --ln-t-cinema:    var(--t-cinema);    /* 720ms */
  --ln-t-reveal:    var(--motion-duration-reveal);  /* 360ms */
  --ln-ease:        var(--ease);        /* standard state ease (R1) */
  --ln-ease-out:    var(--ease-out);
  --ln-ease-soft:   var(--ease-soft);
  --ln-ease-spring: var(--ease-spring);
  --ln-ease-linear: var(--ease-linear);
  --ln-dur-marquee: 42s;      /* the one raw literal — ambient loop */
  background: var(--ln-ink); color: var(--ln-cream);
}
```

عقد التباين (موثق في tokens.css): `--ln-violet` للعناوين الكبيرة
واللمسات فقط (3.52:1)، و`--ln-violet-deep` حشوة عمق زخرفية فقط —
**ليس** نصًّا ولا خطوط أيقونات أبدًا.

## §2 — عائلة الظهور (reveal family)

النصف CSS من زوج useReveal/RevealCssClass: `.reveal-up` منقولة من
`polish.css` (مدارك: 360ms decelerate، إزاحة 14px، مرة واحدة عبر
IntersectionObserver). الجسر `--ln-t-reveal` يحمل 360ms الكنونية — إن لم
يكن للمنتج توكن reveal خاص به فالقيمة الكنونية تُجسَّر (لا تُنتَحل).

## §3 — شريط الماركي (حرفيًا)

ماركي واحد بطيء (`--ln-dur-marquee: 42s` خطي، مرور واحد لحلقة الكليات)
من `landing.css` الكنونية — حواف صلبة بلا mask/fade، والاتجاه يتبع
اتجاه القراءة RTL (R3).

## §4 — الكروم

رأس `.landing-header` + حالة `.scrolled`، عائلة روابط التنقل، حالة
scroll-spy النشطة (الشكل المقصود R2 — المراقب يكتب `data-active-section`
على العنصر HEADER نفسه)، الميغامينو، عائلات الأزرار، وشريط التقدم العلوي
(شريط 2px يكتب JS قيمة `--p` عبر rAF — صفر setState). القيم كلها من
الكنون (press 80ms scale .97 — R8).

## §6 — تشريح الرحلة

ترتيب المقاطع بترتيب الشلال الكنوني (R6): الهيدر ← الهيرو ← الثقة ←
المنتجات ← الرحلة ← التقدم ← المنصات ← الأدوار ← CTA الختامي ← الأسئلة
← التذييل. خرائط المصطلحات حسب المنتج (مثال SL: colleges→products،
campus→platforms).

## §7 — الانضباط (قواعد صارمة)

أرضيات حبرية مسطحة، خطوط شعرية 1px، لمسات lime/violet فقط — **لا
تدرجات على الأرضيات، لا توهج، لا زجاج/ضباب، لا ميل ثلاثي الأبعاد، لا
نص متدرج**. قيم كنونية فقط (§1/§3/§4 حرفيًا) — صفر ألوان/منحنيات/مدد
منتَحلة.

## الأحكام R1–R8 (الملزمة)

| # | الحكم |
|---|---|
| R1 | حركات الحالة ترفع `--ln-ease` (المنحنى القياسي) — لا منحنى خاص |
| R2 | scroll-spy بالشكل المقصود: `data-active-section` على الهيدر، والقواعد تقرؤه هناك |
| R3 | الماركي يتبع اجاه القراءة RTL؛ مفتاح إيقاف RM يعبر الجسر |
| R4 | كل شيء داخل `.landing` — دبابيس المنتج لا تتحرك أبدًا |
| R6 | الترتيب = ترتيب الشلال الكنوني (انظر §6) |
| R7 | الحبيبة `--ln-grain-op: 0.075` — القيمة الكنونية **المُرسَمة** (r129: القيمة المقصودة 0.05 في المسودة الأصلية رُفعت؛ المنتجات تدبّس 0.075) |
| R8 | الحركة تمر عبر سلسلة `--ln-t-*` → `--t-*` حتى ينساب إصفار RM العام؛ الضغط 80ms scale .97 |

*(R5 لم يعد له ذكر حي في المستودعات الأربعة — إن وُجد أرشيفه فهو
أثري؛ الأحكام الحية هي أعلاه.)*

## المستهلكون (لقطة r140 — 2026-10-11)

| المنتج | الدليل الحي |
|---|---|
| Smart-Menu | `src/app/landing.css:5` — «Ported … per /home/z/my-project/specs/r128/PORT-KIT.md + worklog r128-W0b rulings R1-R8 (binding)» (r128-F1a) |
| Smart-Link | `src/app/landing.css:3` — «Single source: /home/z/my-project/specs/r128/PORT-KIT.md (§1–§4 + rulings R1–R8)» (r128-F2a؛ مرجع كتلة §1 الحي: السطور 20-53) |
| Smart-Order | `src/app/landing.css:5` — «per specs/r128/PORT-KIT.md §1/§3/§4 + rulings» (r128) |
| SmartBot | `fb_dashboard/frontend/src/app/landing.css:1-21` — «PORT-KIT §0 R4 … Discipline (PORT-KIT §7)» (r128-F3a) |

> ملاحظة تدقيق r140: تدقيق A140-MK عدّ المستهلكين ثلاثة (SL/SO/SB)؛
> الفحص الحي وجد أن landing.css الخاص بـSmart-Menu يستشهد الكيت نفسه
> حرفيًا — فالمستهلكون أربعة، والجدول أعلاه يثبّت الحقيقة الأوسع.

---

*هذه الوثيقة جزء من عقد الكنون: [PARITY-EXPORT.md](PARITY-EXPORT.md) §4-§6 (استثناء التصدير + جدول المستهلكين) و[DESIGN.md](../DESIGN.md) §1a (عالم Orbit-Ink).*
