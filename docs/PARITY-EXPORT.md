# Parity Export — the design-canon gate · بوابة تكافؤ التصميم

**Contract:** what the Madarek design-canon export pair ([`DESIGN.md`](../DESIGN.md)) is, and what the verify gate enforces.

**One command, four gates:**

```bash
node scripts/verify-parity-export.mjs
# PASS — 168 token checks verified against tokens.css; 0 broken var() refs; 0 retired values; both files parse.
```

Dependency-free (`node:fs` / `node:path` / `node:url` only) — runs anywhere Node runs, including CI.

---

## 1. The export pair — what it is, and what it is NOT

| File | Role | Lines |
|---|---|---|
| `frontend/src/styles/unified-parity.css` | **Canonical export** — a faithful distillation of `tokens.css` / `motion.css` / `components.css`: both theme blocks (light cream + copper, dark night + gold), status/accent families, elevation recipes, glass surfaces (base + strong tier), structural component recipes | 1189 (لقطة r140 — 2026-10-11) |
| `frontend/src/styles/shared-design-system.css` | **Structural skeleton** — the non-color layer: spacing, radius, type scale (incl. the chrome step), motion ladder, z-order, layout dimensions, type roles. **Color always comes from the parity file.** | 396 (لقطة r140 — 2026-10-11) |

> **قاعدة الأعداد (r140):** أي عدد متغير (أسطر/دبابيس) يُكتب بلقطة مؤرخة — عدد بلا تاريخ ينهار دائمًا.

**The two hard facts about the pair:**

1. **It is NOT imported by madarek's own app.** The app chain is `fonts → tokens → motion → base → components → layout → auth → notifications → student → polish` — the export pair sits outside it, as reference artifacts.
2. **It is not a runtime dependency of anything.** The pair exists as the reference distillate the verify gate diffs against canonical `tokens.css` — pinning the canon so silent drift fails loudly.

> **History (why this contract exists):** the first revision of the parity file (added in cc03c2e with a false claim of external application — it was never applied anywhere) diverged from canonical `tokens.css` in 40+ tokens: a generic near-black dark ground instead of night indigo, a 100/200/300ms motion scale instead of the 80/160/240/380/520/720 ladder, a saffron/ember light accent instead of copper-on-cream, an invented 24px radius rung, Tailwind-gray neutrals, a dark `.btn.primary` referencing an un-inverted neutral ramp, a reduced-motion hole (raw `--t-*` never zeroed), and an invented ten-band z-scale. The r127-F1 rewrite corrected every divergence, and the verify script now pins the export to the canonical source so it can never silently drift again.

**Load order (if the pair is ever consumed outside the app):** `unified-parity.css` first (color + motion + state source), then `shared-design-system.css` (structural layer). Host aliases are tolerated **only** when the parity file is absent (shadcn-style hosts): `--foreground`, `--muted-foreground`, `--card`, `--card-muted`, `--ring`. Everything else resolves from the pair.

---

## 2. The four gates · البوابات الأربع

| # | Gate | Asserts | Failure mode |
|---|---|---|---|
| **1** | **Token parity** | Builds resolved light/dark token maps for `tokens.css` and the export (theme blocks + `var()` chains + fallbacks) and asserts **163/163 key tokens match exactly** (168 قبل اجتياح r148-d). Headline tokens are additionally **pinned to their documented values** — night `#070B16`, gold `#E9B44C`, copper `#B57438`, cream `#FBFAF9`, sand `#F2EFE6` — so a future drift of the *reference itself* fails loudly instead of silently dragging the export along. A meta-check requires ≥100 token checks to be defined. | Any divergence, either direction, exits 1 with a readable diff. |
| **2** | **Undefined-var audit** | Every `var(--x)` in the export must resolve within the export itself — directly or through a complete fallback chain. The shared skeleton is audited against `shared ∪ parity ∪` the documented host-alias set. | A broken reference (token defined nowhere) fails the run. |
| **3** | **Forbidden retired values** | The **43 retired divergent spellings** (§3) must be absent from **both** files — comments included, so a "retired but mentioned" value still fails. | Any hit names the file and the exact needle. |
| **4** | **Brace balance** | Both files must parse: balanced braces, no negative depth, after comment stripping. | Unbalanced file fails the run. |

Sanctioned opt-in consumer hooks (the only undefined names allowed): `--reveal-distance`, `--reveal-index` — permitted **only** with complete fallback chains, so a host that never sets them still renders.

Documented canonical wrinkle: `--journey-core` historically spelled `var(--ink)` with `--ink` defined nowhere; `--ink` is now defined in both theme blocks (= `#191918` light, the sand `#F2EFE6` dark) and the export asserts through the normal path (r130-W2-7).

---

## 3. The 43 retired values · القيم المُحالة للتقاعد

These spellings are **retired forever**. They must never reappear in the export pair — treat them as anti-patterns (the values that never shipped):

| Group | Retired values |
|---|---|
| Saffron/ember accents (the wrong light accent) | `#bc4700` · `#a33d00` · `#d45500` |
| Generic dark grounds (not night indigo) | `#0f0f0f` · `#151515` · `#1a1a1a` · `#222222` |
| Divergent dark secondary/borders | `#c4c0b8` · `#2a2a2a` · `#3d3d3d` |
| Tailwind grays | `#f7f8fa` · `#f0f1f3` · `#e5e7eb` · `#d1d5db` · `#6b7280` · `#9ca3af` |
| Tailwind status colors | `#3b82f6` · `#dc2626` · `#d97706` · `#0ea579` |
| Non-canonical shadows | `oklch(` · `--glass-shadow` · `--shadow-glow` · `--shadow-glow-strong` |
| Invented z bands | `99999` (z-max) · `--z-max` · `--z-sticky` · `--z-drawer` · `--z-header` · `--z-overlay` |
| Wrong ease-out curve | `0.16, 1, 0.2, 1` (both spacings) — canonical decelerate is `(0.16,1,0.3,1)` |
| Non-canonical glass blur | `blur(20px)` — canonical is 16px surfaces / 4px scrims |
| Invented token names | `--lh-relaxed` · `--btn-primary-bg` · `--btn-primary-hover` · `--primary-hover` · `--primary-text` · `--elev-card` · `--elev-modal` · `--surface-raised` · `--motion-ease-decalerate` |
| Renamed selector | `.input-field` — canonical is `.input` |

---

## 4. Scope exclusions — deliberate, not omissions · ما لا يُصدَّر

| Stays out of the export | Why |
|---|---|
| **Orbit Ink (`--ln-*` family + the 42s marquee)** | Landing-only vocabulary — the marketing world is madarek's own. Reference doc: `DESIGN.md` §1a. **Fleet porting contract:** [`docs/PORT-KIT.md`](PORT-KIT.md) — adopted r140 (SM/SL/SO/SB cloned the layer through it; see §6هـ). |
| **Role-accent / college-accent slots** (`body[data-role]`) | Madarek-app identity slots — stay out of the export. |
| **Illustration palette (`--ill-*)`** | Illustration-layer vocabulary (incl. its `prefers-contrast` stroke thickening) — stays with the illustration system. |

---

## 5. المستهلكون · العلاقة الفعلية مع المنظومة

عقد r137 (صدق): زوج التصدير ليس مرجعًا نظريًا — أربعة منتجات شقيقة
نسخت قيمه فعليًا إلى داخل مستودعاتها، كلٌّ عبر مِحكّ تكافؤ (parity
harness) مستقل يُقارن نسخًا يدوية من القيم المرجعية بقيم ملفاتها هي،
ويُفشل الـCI عند أي انحراف:

| المنتج | المِحكّ | ما يُثبّت |
|---|---|---|
| Smart-Link | `tests/parity.mjs` | **538 دبوسًا (لقطة r140 — 2026-10-11؛ بعد مسمار manifest في جولة SL نفسها — كانت 537 عند c4b4506)** (الأعمق في المنظومة؛ مرجعه المعلن: `tokens.css` مباشرة) — الحلقة اليدوية الأكبر، وكل تعديل توكن في مدارك يُفشل مِحكّها حتى يُعاد التدبيس |
| Smart-Menu | `tests/design/parity.test.ts` + `mobile/tests/design/parity.mjs` | نسخة القيم المرجعية مقابل `globals.css` (+توأم الجوال) — **web 237 (لقطة r139)** و**mobile 256 (لقطة r140 — 2026-10-11)** — مِحكّان للمنتج الواحد |
| Smart-Order | `tests/parity.mjs` | نفس النمط، مع جسر أسماء shadcn (`--background`/`--card`…) فوق القيم المداركية — **347 دبوسًا (لقطة r140 — 2026-10-11)** |
| SmartBot | `fb_dashboard/frontend/tests/parity.mjs` + `src/test/MadarekParity.test.ts` | مِحكّ **422 دبوسًا (لقطة r140 — 2026-10-11)** + منافذ حرفية من ملفات مدارك (سجل الضغط من `shared-design-system.css`، توست `notifications.css`، قاعدة المتصفح من `base.css`)؛ **mobile بلا محكّ تصميمي بعد** (ثغرة موثقة P-SB-3 — تدقيق r140) |
| **PORT-KIT** (عالم الـlanding — Orbit-Ink) | [`docs/PORT-KIT.md`](PORT-KIT.md) (المواصفة نفسها؛ لا مِحكّ آلي — الانضباط بالمواصفة) | مواصفة استنساخ طبقة `--ln-*` — **SL/SO/SB استنسخوها عبره (r128)**، وlanding.css الخاص بـSM يستشهد الكيت نفسه حرفيًا (SM landing.css:5 — r128-F1a) |

**حقيقة الصيانة (لا إطار تجاريًا — علاقة صيانة معلنة):** لا يستورد أي منتج
شقيق ملفات مدارك وقت البناء؛ النسخ يدوية ويجري تحديثها على جولات كل
مستودع بنفسه. لذلك أي تغيير قيمة يمر بالترتيب نفسه دائمًا:

1. **`tokens.css` أولًا** — المصدر المُؤلَّف هو وحده مكان التعديل (قاعدة §8 أدناه).
2. **إعادة توليد زوج التصدير في نفس الجولة** — `node scripts/verify-parity-export.mjs` يجب أن يبقى 163/163 أخضر قبل الدفع.
3. **الأشقاء يُعيدون التدبيس في جولاتهم** — مِحكّاتهم تفشل جهرةً حتى تُحدّث النسخ اليدوية؛ هذا هو التعاقد، لا إشعار يدوي.

> هذه الفقرة وحدها — دون الجدول — هي الحد الأدنى الذي يجب أن يبقى صادقًا
> عند أي تعديل مستقبلي على العلاقة: من يستهلك القيم، وكيف يُزامنها.

---

## 6. عقود الأسطولة (Fleet Contracts) — القرارات العابرة للمنتجات

> بيوت هذه العقود كانت موزعة في مستودعات المنتجات وأرشيف الجولات بلا
> مرجع أب واحد (فجوة M-3 — تدقيق r140). هذا القسم هو البيت الكنوني:
> أي منتج جديد أو جولة استنساخ تجد هنا ما اتفقت عليه الأسطولة خارج
> أوراق الأنماط. العقود **تشغيلية-تصميمية** (ليست توكنات CSS)؛ القيم
> التصميمية تبقى في `tokens.css` وزوجه.

### أ) عقد الهاتف الليبي الموحد — r138 (قرار r138-SO)

```
^(?:09\d{7,8}|0[1-9]\d{8})$
```

- **محمول:** `09` بطول 9–10 خانات — `0912345678` الكامل، و`091234567`
  نموذج المشغّلين القصار المقبول (مقايضة القبول على الرفض الموثقة).
- **أرضي:** `0[1-9]` بعشر خانات (`0211234567` طرابلس وأخواتها) — اتساع
  r138 عن الرفض السابق للأرضي، على شكل Smart-Order نفسه فتوحّدت الأسطولة.
- **الجذع للمحمول فقط:** `912345678` بلا بادئة تُسبق بصفرًا (9→09)؛
  **الأرضي بلا جذع يُرفض** في الأسطولة كلها.
- **القمامة لا تتحول أرضيًا:** `123456789` لا يقبل بجذع أعمى — يجب أن
  يبدأ الرقم بـ`0` فعلًا بعد التطبيع.
- **التطبيع قبل العقد:** أرقام مشرقية (٠٩…) وفواصل وطوابع `+218`/`00218`
  تُطوَّع أولًا ثم يُختبر الناتج بالعقد.
- **«واتساب أولًا» سلوك عرض لا شرط قبول:** رابط wa.me للمحمول (`09`)
  حصرًا؛ الأرضي يُعرض نصًا خامًا قابلًا للاتصال (درس SM r103-F8 — لا
  روابط ميتة).
- **أصحاب التوائم الأربعة:** Smart-Link `src/lib/phone.ts:48`
  (**المرجع المُصدَّر** — العقد نصًّا وتوثيقًا) · Smart-Order
  `src/lib/phone.ts` (r138، commit 82990f0 — توأم حرفي) · SmartBot
  ثلاثيًا: web `fb_dashboard/frontend/src/lib/phone.ts` + mobile
  `mobile/src/lib/phone.ts` + بايثون `fb_dashboard/_utils.py:129` ·
  **Smart-Menu = المتخلف الموثق**: بوابة الدفع `src/lib/payment-schema.ts:40`
  مازالت `^09\d{8}$` (محمول-فقط، قبل التطبيع) و`CUSTOMER_PHONE_RE`
  (`src/lib/phone.ts:39`) فضفاض دولي — معلقة على قرار المنسق منذ r138.

### ب) عرض المال — formatLyd (r138-SO)

- **الصحيح نظيف:** 19 دينارًا تُعرض «**19 د.ل**» — لا أصفار ذيلية بلا
  قرار (`19.000` كان يُعرض قبل r138 بلا تعليل موثق).
- **الكسر بدقة الدرهم الأصيلة:** 19.5 دينارًا تُعرض «**19.500 د.ل**» —
  ثلاث منازل (الدينار = 1000 درهم)، لا تدوير.
- **تجميع ar-LY نقطي** للصحيح ≥ 1000 («12.500.000 د.ل») — hand-rolled
  لا `Intl`، ليطابق الخادمُ العميلَ بايتًا-بالبايت (سياسة تطابق
  الترطيب).
- **النماذج غير العرض:** عقد الذهاب/العودة الخام (ثلاث منازل دائمًا، بلا
  «د.ل» ولا تجميع) للنماذج والمحررات — العقد أعلاه لعرض المستخدم.
- **أصحاب العقد:** Smart-Order `src/lib/money.ts` (**المرجع الذي وثّق
  r138** — formatLyd) · Smart-Link `src/lib/money.ts` (توأم حرفي) ·
  SmartBot `fmt_lyd` (smart-trim r133).
- **الاستثناء المعروف — Smart-Menu (لا يُوحَّد قسرًا):** `src/lib/format.ts`
  `formatPrice`: تقليم ذكي بحدّ منزلتين (12.75 → «12.75 د.ل») + أرقام
  مشرقية في العرض — قرار محلي معلل (فواتير ومستندات SM تعتمد منزلتين
  بدقة ثابتة) يُدرَج استثناءً موثقًا لا يُلغى من الخارج.

### ج) درجة الكروم 14px — اتفاق r133، شرّعها الكنون r140

SL/SO/SB تستخدم 14px خامًا لمقاطع كروم الواجهة (روابط التنقل، أعمدة
التذييل، تسميات النماذج، صناديق الحالة، الطوابع الزمنية) — سندها
اتفاق أسطولة r133 (SL R16: «SANCTIONED UI-CHROME step»). r140 أضافت
`--fs-chrome: 0.875rem` لسلّم الكنون (DESIGN.md §2) — نثر المتن يبقى
على `--fs-body` 15px.

### د) حزمة الخطوط — 10 وجوه للأسطولة (r132)

**الاستنساخ الأسطولي = 10 وجوه (بلا Serif italic — حذف موثق r132 في
SM/SL)؛ الـSerif مدارك-فقط.** مدارك نفسها تشحن الوجوه الاثني عشر
كاملة؛ منتجات الأسطولة تقتطع وجهي الـSerif فلا يشحنونه قط. (تصحيح
تبعي معروف: SB `MASTER.md` §3 تدّعي 12 وجهًا مع Serif — خطأ توثيقي
سجّله تدقيق r140 P-SB-1.)

### هـ) جدول المستهلكين الحالي

جدول §5 أعلاه محدَّث بلقطة r140 (2026-10-11) بالعدادات الجديدة:
SM web **237** + mobile **256** · SL **538** (بعد مسمار manifest في
جولتها) · SO **347** · SB web **422** (+ mobile بلا محكّ بعد) ·
PORT-KIT سطره الجديد في الجدول نفسه.

---

## 7. الدين الموثق · Documented debt

| الدين | الحالة | التفصيل |
|---|---|---|
| إسقاط `all` من `--t-clean` | **مؤجل r140 بقرار المنسق — يحتاج قياس سلوك polish.css** | `tokens.css:160` يشحن `--t-clean: all …` و`polish.css` يحيّده (4-A11 P1-3)؛ بوابة `check-motion-tokens.sh` توثق الاستثناء وتسمح له. إسقاط `all` = تغيير سلوك تشغيلي لمدارك نفسه — لا يُفعل إلا بقياس تحرّكات polish.css الفعلية أولًا (قرار المنسق r140). |
| بوابة هاتف Smart-Menu | معلقة على قرار المنسق منذ r138 | `payment-schema.ts:40` (`^09\d{8}$` محمول-فقط قبل التطبيع) — آخر المتخلفين عن عقد §6أ (P-SM-1 — تدقيق r140). |
| محكّ parity لـSB mobile | ثغرة موثقة (P-SB-3) | توأم SM-mobile عنده محكّ؛ SB-mobile يعتمد الكنون بلا محكّ تصميمي بعد. |

---

## 8. Rules of engagement · قواعد التعامل

1. **Do not import the pair into the app.** The app consumes `tokens.css` / `motion.css` / `components.css` directly — the pair is the verification surface only.
2. **A changed value belongs in `tokens.css` first** — open an issue/PR against the canonical source; never fork a token into the export by hand.
3. **Run the gate after any reference token change** — `node scripts/verify-parity-export.mjs` must stay green (`163/163`) before a change to `tokens.css` ships.
4. The canon in human-readable form is [`DESIGN.md`](../DESIGN.md); the authored values live in `frontend/src/styles/tokens.css`.

---

*Source of truth for this contract: `scripts/verify-parity-export.mjs` (the gate is the documentation). File headers of the export pair carry the same history.*
