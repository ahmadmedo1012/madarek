# BRAND — نظام علامة «مدارك» · R323 §A1 / the R323 brand system

> **العربية أولًا** (الإنجليزية تحت كل قسم). الوثيقة الرسمية لنظام العلامة
> الواحد بعد تقاعد هويات r188 المتزاحمة (التدقيق:
> [`AUDIT.md`](AUDIT.md) — ستّ هويات متزاعدة). الأصل الهندسي:
> [`VARIANTS.md`](VARIANTS.md).

---

## ١ · القصة / The story

> **«نقطة تصبح مدارًا»** — كلّ معرفة تبدأ نقطةً وتصبح مدارًا.

الرمز يبقي فكرة **الخاتم** (مربّعان يتشاركان مركزًا، أحدهما مدوّر 45°)
ويعيد رسمها بالنحو الجديد: شعيرات حبر موحّدة بوصلات miter، ونقطة
برتقالية مصمتة واحدة تجلس **على تقاطع** الشبكة (24,8) — الشمال-الشرقي،
حيث يبدأ النور.

EN: the mark keeps the khatam idea (two squares, one rotated 45°,
sharing a centre) redrawn in the system grammar: uniform hairline ink
strokes, miter joins, ONE solid orange square — the point of light —
seated ON the grid intersection (24,8).

## ٢ · الهندسة / Geometry (شبكة ٣٢)

| العنصر | القيمة |
|---|---|
| viewBox | `0 0 32 32` |
| المربع المحوري | x=8..24 (ضلع 16) — الأركان على (8,8) (24,8) (24,24) (8,24) |
| المربع المدوّر | `M16 5L27 16L16 27L5 16Z` — الرؤوس على التقاطعات (التقاط √2: فرق 2.8٪ غير مرئي — `VARIANTS.md` ب) |
| النقطة | مربّع 4×4 مصمت عند x=22..26 · y=6..10 — مركزه التقاطع **(24,8)** |
| الشعرة | موحّدة: `1.5px` non-scaling في المكوّن · `1` وحدة للتوائم الساكنة · **2.25** في الأيقونة فقط (`§الحد الأدنى`) |
| الوصلات | `stroke-linejoin="miter"` دائمًا — لا round، لا استدارة، لا ظل، لا تدرّج |

المصدر الواحد: `frontend/src/brand/mark.ts` — والأصول الساكنة من
`scripts/r323/brand-assets.mjs` (اختبار الحزام يثبّت الاثنين معًا).

EN: one source of geometry (`mark.ts`); the static twins regenerate
from `brand-assets.mjs` and the unit belt pins them together.

## ٣ · الألوان / Colour (الثلاثة فقط)

| الرمز | Hex | الدور |
|---|---|---|
| الورق paper | `#F6F6EE` | الأرضية (فاتح) — والنسخ الساكنة |
| الحبر ink | `#282828` | الخطوط والكلمة — يركب `currentColor` في المكوّن |
| البرتقالي orange | `#FA3600` | **النقطة** — الإشارة الوحيدة؛ يركب `var(--accent)` في النسق `auto` |

- **الداكن**: نفس المكوّن بلا خصائص — `currentColor` يتبع النص، و
  `var(--accent)` تعيد ضبط المقعد إلى الجمر المضيء `#FF5A1F`
  (تبادل الداكن المعتمد عبر الرموز، لا نسخة ثانية من الشعار).
- **ممنوع نهائيًا**: أي تدرّج، أي توهّج، أي نحاسي/ذهبي
  (`#B57438` · `#E9B44C`)، أي لون رابع. بوابة: اختبار
  `r323-brand-system.test.ts` (a).

EN: three colours only (paper `#F6F6EE`, ink `#282828`, orange
`#FA3600`). Dark mode is a token swap (`var(--accent)` → `#FF5A1F`
ember), never a second logo. Gradients, glows, copper/gold and any
fourth colour are banned and gated.

## ٤ · النسخ الأربع / The four variants

`import { Logo } from '@/brand'` — الواجهة المتجمّدة التي تبرمج ضدها
كل الحزم الموازية:

```tsx
export type LogoVariant = 'lockup' | 'mark' | 'wordmark' | 'stacked';
export type LogoTone = 'auto' | 'ink' | 'paper' | 'orange';
export function Logo(props: {
  variant?: LogoVariant;   // الافتراضي 'lockup' — أفقي RTL: الرمز يمين، الكلمة يسار
  size?: number;           // ارتفاع الرمز px (الافتراضي 32)؛ lockup/stacked تتدرّج منه
  tone?: LogoTone;         // 'auto' = currentColor + var(--accent)
  className?: string;
  animated?: boolean;      // رسم شعري 600–900ms — النقطة أخيرًا
}): React.JSX.Element;
```

| النسخة | التركيب | الحجم `size` | أين |
|---|---|---|---|
| `lockup` (الافتراضي) | الرمز يمين + «مدارك» يسار (RTL) | ارتفاع الرمز | الترويسة، الدخول، التذييل |
| `mark` | الرمز وحده | ضلعه | الشريط الجانبي، الأيقونات، الشارة |
| `wordmark` | «مدارك» المفرّغة وحدها | ارتفاع حبر الكلمة | الكلمات العريضة داخل النص |
| `stacked` | الرمز / «مدارك» / `MADAREK` | عرض الرمز (32u) | أغلفة، بيانات تعريف، OG |

- الكلمة «مدارك»: IBM Plex Sans Arabic 600، منحوتة harfbuzz (م→د
  متصلان، ا/ر/ك منفردة)، **مفرّغة فقط** (stroke-only) — لا حشو، ولا
  تباعد أحرف عربي أبدًا. المصدر المولَّد:
  `scripts/r323/wordmark-build-r323.mjs` → `frontend/src/brand/wordmark.generated.ts`.
- «MADAREK»: Geist Mono 500 بتتبع 0.08em (اللاتينية يجوز تتبعها)،
  مصمتة الحبر — الصوت المونوي.
- inline SVG فقط — لا `<img>`، ولا `document.logo` خارج
  `/brand/*` المولَّدة. الجذر يحمل `data-logo` و `role="img"`
  و `<title>مدارك</title>`.

## ٥ · الفراغ الأمان والحد الأدنى / Clear space & min sizes

- **الفراغ الأمان**: ½ ارتفاع الرمز من كل جهة — لا نص، لا حافة بطاقة،
  لا شعرة جدول داخلها.
- **الحد الأدنى**: الرمز `16px` · التركيب الأفقي `88px` (ارتفاع الرمز
  فيه). تحته: استخدم `mark` 16px أو لا تعرض شيئًا.
- **المنحدر البصري (R324/X11)**: شعرة المكوّن غير القياسية تتدرّج تحت
  32px — `1.5px @32 → 1.125px @16 (نسبة الـ favicon المعتمدة 2.25/32)
  → أرضية 0.9px` — فلا تثقل المقاعد الصغيرة (كانت 12.5% عند 12px،
  2.7× النسبة المصمّمة). الـ favicon نفسه لم يتغيّر.
- الاستثناء المعتمد الوحيد: `favicon.svg` بشعرة 2.25/32 (النسبة
  الأصلية تذوب عند 16px الحقيقيين).

EN: clear space = ½ mark height on every side; minimums: mark 16 px,
horizontal lockup 88 px. The component's non-scaling hairline rides the
optical-size ramp below 32 px (1.5 @32 → 1.125 @16 = the favicon's
sanctioned 2.25/32 ratio → 0.9 px floor); the favicon's 2.25/32 stroke
ratio remains the only sanctioned static deviation.

## ٦ · النغمات / Tones

| tone | الحبر | النقطة | الأرضية المناسبة |
|---|---|---|---|
| `auto` (الافتراضي) | `currentColor` | `var(--accent)` | أي أرضية نظام |
| `ink` | `#282828` | `#282828` | ورقة/صور فاتحة |
| `paper` | `#F6F6EE` | `#F6F6EE` | حبر/داكن |
| `orange` | `#FA3600` | `#FA3600` | لوحات الإشارة الواحدة (استعمال نادر) |

قاعدة: النقطة تختفي بوصفها إشارة إذا تساوى لونها مع لون الحبر على
أرضية شقراء — حينها `tone="ink"|"paper"` حسب الأرضية، ولا يُحاط
الرمز بخلفية برتقالية أبدًا (هذا مقعد EdgeTab القديم — يتقاعد).

## ٧ · افعل / لا تفعل / Do & don't

**افعل**: الشبكة 32 قبل أي تعديل · شعرة موحّدة · miter · نقطة واحدة
فوق (24,8) · فراغ أمان ½ · `currentColor`/`var(--accent)` · العربية
بلا تباعد.

**لا تفعل**: تدرّج أو توهّج · وصلات round أو استدارة · نحاسي/ذهبي أو
لون رابع · تدوير أو ميل الرمز · حشو المربعين · إعادة رسم الظل أو
«نسخة داكنة» يدوية (المقعد يتكيف وحده) · تباعد أحرف عربية · استخدام
أي هوية قديمة (`StarMark` · `BrandMark` · نجم EdgeTab · لوحة الإقلاع
النصية) — كلها ضمن قائمة R323-PENDING المتجمّدة وتبدّل في مرحلة
التكامل.

## ٨ · الأصول والتوليد / Assets & generation

```bash
node scripts/r323/wordmark-build-r323.mjs   # الكلمة المولَّدة (حبر/مونو)
node scripts/r323/brand-assets.mjs          # mark/madarek-mark/lockup(+stacked)/favicon/icons/OG
```

| الأصل | المولَّد من |
|---|---|
| `frontend/public/brand/mark.svg` + `madarek-mark.svg` | mark.ts (بركة Geometry واحدة) |
| `frontend/public/brand/wordmark.svg` · `lockup.svg` · `lockup-stacked.svg` | wordmark.generated.ts + lockups.ts |
| `frontend/public/favicon.svg` | نفس الهندسة، شعرة 2.25 (§٥) |
| `frontend/public/brand/icon-{180,192,512}.png` · `madarek-og.jpg` (1200×630) | Playwright/Chromium — ورق، إطار شعري، تركيب أفقي، نقطة برتقالية واحدة، السطر «منصّة مدارك — كلّ معرفة تبدأ نقطةً وتصبح مدارًا» |
| `frontend/public/manifest.webmanifest` | الأيقونات نفسها + `theme_color`/`background_color` = الورق |

كل الأصول حتمية (نفس المدخلات ⇒ نفس البايتات) — وأي تحرير يدوي يُكتشف
بإعادة التوليد.

## ٩ · البوابات / Gates

- `frontend/tests/unit/r323-brand-system.test.ts` — (a) لا نحاسي/ذهبي
  خارج قائمة R323-PENDING · (b) رسم الاستيراد المتجمّد
  (`StarMark`/`BrandMark`) · (c) favicon/madarek-mark بلا تدرّج ولا
  نحاسي، ومزامنة الهندسة بين `mark.ts` والمولّد.
- `bash scripts/check-icons.sh` — `frontend/src/brand/**` +
  `frontend/src/pages/BrandPage.tsx` مدرجان في القائمة المسموحة
  (رموز العلامة، صنف LibyaFlag/StarMark).
- صفحة الفحص `/__brand` (`frontend/src/pages/BrandPage.tsx`): الشبكة
  الإنشائية، النسخ الأربع، الفراغ الأمان، الحد الأدنى، الرموز اللونية،
  افعل/لا تفعل — صحيحة في النسقين (رموز النظام فقط داخل الصفحة).
