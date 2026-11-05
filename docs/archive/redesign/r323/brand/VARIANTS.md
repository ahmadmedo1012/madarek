# R323 §A1 — VARIANTS — «نقطة تصبح مدارًا» — the six constructions considered

> العربية أولًا، ثم الإنجليزية. كل الأشكال الأربعة والعشرون أدناه **أصلية** —
> بُنيت من فكرة الخاتم (مربعان يتشاركان مركزًا، أحدهما مدوّر 45°) على شبكة
> 32 وحدة، ولم يُنسخ منها أي شكل من مرجع Heron ولا من أي شعار آخر.
>
> All constructions below are ORIGINAL — the khatam idea (two squares
> sharing one centre, one rotated 45°) redrawn on a 32-unit grid in the
> Heron *grammar* (hairline uniform ink, miter joins, one solid orange
> point). No Heron shape was traced, measured into the deliverable, or
> copied; the reference only set the *voice* (hairlines · miter ·
> negative space · one signal).

## الفائز — B «الخاتم الملتئم بالشبكة» / Grid-snapped khatam ✅

المربع المحوري 8..24 (أركانه على تقاطعات الشبكة)، والمربع المدوّر رُكّبت
رؤوسه على التقاطعات (16,5) (27,16) (16,27) (5,16)، والنقطة البرتقالية
المصمتة 4×4 تجلس **على** التقاطع (24,8) فوق الركن الشمالي-الشرقي.

المنطق: الالتزام الوحيد المطلوب من «نقطة تصبح مدارًا» أن تكون النقطة
موضوعَ على تقاطع — فيبقى المربع المدوّر ملتصقًا بالشبكة أيضًا. الفرق
في الضلع عن المربع المتطابق 8√2≈11.31 وحدة (رؤوس 16±8√2 ≈ 4.69/27.31)
هو 2.8٪ فقط — غير مرئي — بينما الانحراف عن الشبكة دائم لو بقينا
على √2. شطر شعرية موحّد، وصلات miter، أصفار استدارة، لا تدرّجات.

Winner: the congruent rotated square would put its vertices at 16±8√2
(≈4.69 / 27.31) — OFF the grid. Snapping the vertices to the
intersections costs a 2.8 % side difference (invisible) and buys a
permanent grid snap: every anchor of the mark — four corners, four
vertices, the point's seat (24,8) — is a lattice point. Delivered as
`frontend/src/brand/mark.ts` (`MARK_AXIS` · `MARK_DIAMOND_PATH` ·
`MARK_POINT`).

## المستكشفة والمرفوضة / The five rejected variants

### A — «الخاتم المتطابق حرفيًا» / The congruent khatam
مربعان متطابقان (ضلع 16) حول (16,16)، المدوّر 45°. صحيح رياضيًا لكن
رؤوسه 16±8√2 تخرج عن الشبكة (4.69/27.31) — قصة «النقطة على تقاطع»
تنهار لأن المستطيلات لا تستقر على أي تقاطع.
Rejected: mathematically pure, visually identical to B at display
sizes, but its vertices sit off-grid forever — the one story the brief
asks for («ON a grid intersection») cannot hold.

### C — «المدار المرئي» / The visible orbit ring
خاتم B + دائرة شعرية r=11 حول المركز تصوّر «المدار» حرفيًا.
Rejected: الدائرة صوت ثانٍ (منحنى في نظام وصلات miter)، وتُغلق الفراغ
السلبي حول الرؤوس، وتذوب عند 16px إلى طوق غير مقصود.
Rejected: a curve is a second voice inside a miter grammar; it eats
the negative space around the vertices and reads as an unintended halo
at 16 px. The «orbit» stays typographic — the wordmark and the tagline
carry it.

### D — «السهم النقطي» / The point-and-line minimal
مربع واحد + شعرة قطرية من الجنوب-الغرب إلى النقطة في الشمال-الشرقي.
Rejected: يُقرأ كمؤشر فأرة أو مربع اختيار، ويهجر الخاتم الذي أمر
الملف بالاحتفاظ به. 
Rejected: reads as a cursor/checkbox; abandons the khatam the brief
explicitly keeps. The diagonal also doubles the stroke count at the
NE corner where the point already sits.

### E — «الخاتم المصمت» / The solid khatam
المربع المحوري ممتلئ حبرًا، والمعيّن مفرّغ بالورق، والنقطة برتقالية.
Rejected: كتلة سوداء تتكدم عند الأحجام الصغيرة وتناقب قواعد النظام
(شعرية لا سطح)؛ تملأ الفراغ السلبي الذي يميّز النحو الجديد.
Rejected: a filled slab cakes at small sizes and contradicts the
system's own grammar — hairlines, not surfaces; it also destroys the
negative space that separates this mark from the r188 star.

### F — «الكلمة أولًا» / The wordmark-first plate
بلا رمز: «مدارك» المفرّغة + نقطة برتقالية على مدّدة التطويل.
Rejected: ملف الأيقونات (favicon) يحتاج رمزًا مربعًا مستقلًا؛ الهوية
تتوقف على الخط وحده وتنهار خارج السياق (تبويب، أيقونة تطبيق).
Rejected: the favicon/PWA icon seats need a self-standing symbol; a
typography-only identity collapses out of context (tab, home screen).

## جدول الحكم / Verdict table

| # | الفكرة | تقاطعات الشبكة؟ | نحو موحّد؟ | يقرأ عند 16px؟ | القرار |
|---|--------|------------------|-------------|------------------|--------|
| A | خاتم متطابق √2 | ✗ | ✓ | ✓ | مرفوض — خارج الشبكة |
| **B** | **خاتم ملتئم بالشبكة** | **✓ (٩ مراسي)** | **✓** | **✓** | **الفائز — مُسلَّم** |
| C | + حلقة مدار | ✓ | ✗ (منحنى) | ✗ | مرفوض — صوت ثانٍ |
| D | مربع + قطر | جزئيًا | ✓ | ✗ | مرفوض — يفقد الخاتم |
| E | خاتم مصمت | ✓ | ✗ (سطح) | ✗ | مرفوض — تكتّل |
| F | كلمة فقط | — | ✓ | ✗ | مرفوض — بلا رمز |

**B مُسلَّم**: `frontend/src/brand/mark.ts` + `scripts/r323/brand-assets.mjs`
(الأصول الساكنة) + `frontend/public/favicon.svg` — من السطر الواحد نفسه،
لا يمكن أن تتباعد.
