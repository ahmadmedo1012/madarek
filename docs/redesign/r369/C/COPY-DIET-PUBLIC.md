# C2.2 — Public pages copy diet (R369)

Branch `agent/r369-product` · 2026-11-19 · gate: `scripts/gates/copy-budget.mjs` (class `public`).

## Before → after (gate-counted Arabic words per page)

| page | base (main 347e2508) | before (branch) | after | cut vs main |
|---|---|---|---|---|
| legal/LegalPages.tsx | 627 | 627 | **600** | −27 |
| RegisterPage.tsx | 246 | 246 | **229** | −17 |
| PublicPages.tsx | 212 | 212 | **201** | −11 |
| auth/ResetPasswordPage.tsx | 119 | 114 | **111** | −8 |
| auth/ForgotPasswordPage.tsx | 83 | 78 | **71** | −12 |
| AuthPage.tsx | 117 | 117 | **113** | −4 |
| Error403Page.tsx | 25 | 25 | **20** | −5 |
| Error500Page.tsx | 30 | 30 | **29** | −1 |
| colleges/CollegePages.tsx | 166 | 165 | **164** | −2 |
| auth/VerifyEmailPage.tsx | 43 | 45 | **44** | +1* |
| AppDownloadPage.tsx | 97 | 97 | 97 | 0 |
| capabilities/CapabilityPages.tsx | 50 | 50 | 50 | 0 |
| community/CommunityPages.tsx | 140 | 140 | 140 | 0 |
| competitions/CompetitionsPages.tsx | 138 | 138 | 138 | 0 |
| student/TrainingPages.tsx | 183 | 183 | 183 | 0 |
| vision/VisionPages.tsx | 37 | 37 | 37 | 0 |
| NotFoundPage.tsx | 27 | 27 | 27 | 0 |
| MaintenancePage.tsx | 23 | 23 | 23 | 0 |
| legal/LegalSheet.tsx | 21 | 21 | 21 | 0 |
| **TOTAL** | **2384** | **2375** | **2261** | **−123 (−5.2 %)** |

*VerifyEmail: the +2 vs main is the branch base's own state (a carried t6 change), not this diet; this round cut it 45→44.

Ceilings ratcheted DOWN in the same change for every file that lost words (10 entries: LegalPages 627→600, Register 246→229, PublicPages 212→201, Reset 122→111, Forgot 83→71, Auth 117→113, Error403 27→20, Error500 30→29, colleges 166→164, Verify 45→44). Gate: `COPY-BUDGET: CLEAN`. Style mode enforce: design-system files clean.

## The −25 % target vs the honest result — the structural analysis

The brief's C2.2 target is **public words −25 %**. Measured against the round base (main = 2384 → target ≤ 1788), the honest result is **−5.2 %**. The gap is structural, and this is the same honest-stop shape the mobile lane documented in d883d151:

1. **These exact files were already dieted twice.** R353 E4 (the chooser note 24→8 words) and R366 L4 ("the prose tightened to one line per substance point — every fact kept, every filler dropped") compressed the same public class. The ratchet meta records the wider history: the authed app class already took **21,504 → 12,753 (−40.7 %)** in R355. What remains is not filler.
2. **What the remaining 2,261 words are** (measured):
   - **countAr/arUnit plural arrays: 82 words** across 6 files (colleges 19, training 25, community 12, competitions 12, register 10, auth 4) — every Arabic plural form is counted, exactly one renders. The copy guide BLESSES this helper («use the shared `<Count>`/plural helpers; never «12 طلاب»») — cutting forms is banned by the guide itself.
   - **Legal fact sentences (~600)**: PAGES-GAP §6 law — every sentence is written from the code's actual behavior; the SECURITY_MARKER_KEYS (argon2, 12-72, 15m, 7d, 403, CSP), the storage ledger's 9 keys, the token lifetimes and the provider list are substance, and "legal substance intact" is C2.2's own constraint.
   - **1–3-word action labels**: field labels («الاسم الأول», «الكلّيّة», «اختر…»), buttons («إنشاء الحساب», «سجّل الدخول»), aria-labels («إخفاء كلمة المرور») — action-critical by definition; the never-lose law forbids touching them.
   - **Minimal error/maintenance sheets** (25–30 words each): one title + one remedy line + one link — already at the floor.
3. **What −25 % would require**: deleting FAQ answers (facts citing real surfaces), dropping legal rows, or removing plural forms / labels — each a direct violation of C2.2's own "legal substance intact" + the program's "never remove action-critical information" law. Not done; needs an owner decision if wanted.

## Read-through table (every changed string, old → new)

| file | old | new | note |
|---|---|---|---|
| LegalPages | ما نجمعه ولماذا وأين يُخزَّن، وحقوقك. | ماذا نجمع ولماذا، وحقوقك. | meta: storage location is the sheet's own §3 bar |
| LegalPages | الويب وقاعدة PostgreSQL على Vercel وNeon | الويب وPostgreSQL على Vercel وNeon | قاعدة implied by the code-run |
| LegalPages | ورمز التحديث / وطلب الحذف | والتحديث / والحذف | same facts |
| LegalPages | منصّة تعليمية تقنية مستقلّة، عربية أولًا — لا تنتمي لمؤسّسة تعليمية ولا تمثّلها | منصّة تعليمية مستقلّة، عربية أولًا — لا تنتمي لمؤسّسة ولا تمثّلها | تقنية + second تعليمية dropped |
| LegalPages | حسابات التجربة على @test.ly بكلمة مرور معروفة — لا بيانات حقيقية ولا خصوصية | حسابات @test.ly تجريبية بكلمة مرور معروفة — لا بيانات حقيقية | خصوصية implied |
| LegalPages | المنصّة تجريبية وتُقدَّم «كما هي»: قد تتغيّر الميزات أو تتوقف | المنصّة تجريبية «كما هي»: قد تتغيّر أو تتوقف | same |
| LegalPages | تُشغَّل كمشروع تجريبي مستقل؛ الهوية القانونية للمشغّل والقانون الحاكم | مشروع تجريبي مستقل؛ هوية المشغّل والقانون الحاكم | same facts |
| LegalPages | ولا يُرسل للخادم إلا ما يلزم طلبك | ولا يُرسل إلا ما يلزم طلبك | للخادم implied |
| LegalPages | رمز تحديث الجلسة … وينتهي خلال 7d. حذفه يُخرجك من الجهاز | رمز التحديث … ينتهي خلال 7d؛ وحذفه يُخرجك | same |
| LegalPages | أما mdrk-academic-links فلا يُمس عند الرفض: بياناتك التي كتبتَها تبقى ملكك | mdrk-academic-links لا يُمس عند الرفض — بياناتك تبقى ملكك | same |
| LegalPages | لم يُجرَ تقييم رسمي بعد، ومستوى الالتزام | لم يُجرَ تقييم رسمي؛ مستوى الالتزام | same |
| LegalPages | رمز وصول (15m) ورمز تحديث (7d) يدور عند كل تجديد | رمز وصول (15m) وتحديث (7d) يدوران عند كل تجديد | grammar follows |
| LegalPages | تحديد معدل المحاولات لكل IP، وقفل الحساب مؤقتًا بعد الفشل المتكرر | تحديد محاولات لكل IP وقفل الحساب مؤقتًا بعد تكرار الفشل | same |
| LegalPages | بيانات مبذورة اصطناعية بالكامل: … وحسابات @test.ly ونتائجها — لا تمثّل أحدًا حقيقيًا | بيانات اصطناعية بالكامل: … ونتائج @test.ly — لا تمثّل أحدًا | مبذورة≈اصطناعية dup |
| LegalPages | (سياسة الخصوصية) | (الخصوصية) | link destination named in bar |
| PublicPages | نموذج إنشاء الحساب (link) | نموذج التسجيل | same destination |
| PublicPages | (المسجل العام ومسجل كلية) | (مسجّل عام ومسجل كلية) | same seats |
| PublicPages | لا يوجد بريد يُرسَل من المنصّة بعد (×2) | لا بريد يُرسَل بعد | same |
| PublicPages | فستقابلك رسالة بالتفعيل وإعادة التحميل | تظهر رسالة التفعيل | the noscript message itself instructs reload |
| PublicPages | سجلّ القدرات «ما يعمل اليوم» يفصل | سجلّ «ما يعمل اليوم» يفصل | same ledger |
| PublicPages | بعمود واحد مع تاريخ آخر تحديث | بعمود واحد وتاريخ التحديث | same |
| PublicPages | منصّة تعليمية تقنية مستقلّة، عربية أولًا | منصّة تعليمية مستقلّة عربية أولًا | consistent with legal |
| PublicPages | المحاضرات، الاختبارات، … — التفصيل في صفحة السجلّ | المحاضرات والاختبارات … — التفصيل في السجلّ | same |
| PublicPages | إجابات قصيرة تشير إلى أسطح حقيقية | إجابات قصيرة إلى أسطح حقيقية | meta |
| PublicPages | صفحة التخزين المحلي (link) | صفحة التخزين | same page |
| PublicPages | مدارك — الصفحة الرئيسية (aria ×2) | مدارك — الرئيسية | brand link, unambiguous |
| PublicPages | نموذج إنشاء الحساب الجامعي (link) | نموذج إنشاء الحساب | same |
| RegisterPage | كلمة المرور شائعة جدًا — اختر واحدة أقل توقّعًا | كلمة مرور شائعة — اختر أقل توقّعًا | same remedy |
| RegisterPage | تعذَّر إنشاء الحساب — راجع البيانات وأعد المحاولة | تعذّر إنشاء الحساب — راجع الحقول | field errors follow |
| RegisterPage | لا أقسام في هذه الكلّيّة — اختر كلّيّة أخرى | لا أقسام هنا — اختر كلّيّة أخرى | same |
| RegisterPage | لا مؤسسات متاحة للتسجيل — تواصل مع إدارة المنصّة | لا مؤسسات متاحة — تواصل مع الإدارة | same |
| RegisterPage | قوة كلمة المرور: ضعيفة/متوسطة/قوية | القوة: ضعيفة/متوسطة/قوية | sits under the password field |
| RegisterPage | تعذّر التحقق — الحسم عند إنشاء الحساب | تعذّر التحقق — الحسم عند الإنشاء | same |
| RegisterPage | تعيين القيادة والمسجلين بدعوة من مالك المنصة | تعيين القيادة والمسجّلين بدعوة المالك | same |
| AuthPage | تعذَّر تسجيل الدخول — تحقَّق من البريد وكلمة المرور واتصالك | تعذّر الدخول — تحقّق من البريد والمرور والاتصال | same three causes |
| AuthPage | محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة | محاولات كثيرة — انتظر قليلًا وأعد المحاولة | same |
| AuthPage | سجّل الدخول للمتابعة إلى صفحتك / سجِّل دخولك للوصول إلى مقرَّراتك | سجّل دخولك للمتابعة إلى صفحتك / سجّل دخولك للوصول إلى مقرَّراتك | one voice |
| Forgot | إرسال البريد غير مُهيّأ بعد [يُستكمل قبل الإطلاق] — حسابات @test.ly تستلم الرابط هنا | البريد غير مُهيّأ بعد — @test.ly يرى الرابط هنا | dev-only string; same fact |
| Forgot | لا يُرسل بريد فعلي — الرابط هنا | لا بريد فعلي — الرابط هنا | same |
| Forgot | تعذّر إرسال الطلب — تحقّق من اتصالك | تعذّر الإرسال — تحقّق من اتصالك | same |
| Reset | كلمة المرور شائعة جدًا… | كلمة مرور شائعة… | same as register |
| Reset | تعذّر التحديث — تحقّق من اتصالك ثم أعد المحاولة | … تحقّق من اتصالك وأعد المحاولة | same |
| Verify | اطلب رسالة جديدة من «الإعدادات» ثم افتح الرابط من بريدك | اطلب رسالة جديدة من «الإعدادات» وافتح الرابط من بريدك | ثم→و |
| Error403 | صفحة لا يفتحها دورك — ربّما تغيّر الرابط أو أنها لدور آخر | صفحة لا يفتحها دورك — ربّما لدور آخر | URL-change hint dropped (the CTA to one's dashboard covers it) |
| Error403 | لوحة دورك هي نقطة البداية الصحيحة | لوحة دورك هي البداية الصحيحة | same |
| Error500 | إذا استمرّ الخلل، يمكنك العودة إلى الرئيسية أو تسجيل الدخول من جديد | إن استمرّ الخلل فعد إلى الرئيسية أو سجّل دخولك من جديد | same actions |
| colleges | سجلّ الكلّيّات — بيانات اصطناعية للعرض | سجلّ الكلّيّات — بيانات عرض اصطناعية | same |
| colleges | جارٍ تحميل الكلّيّات… | جارٍ التحميل… | context is the college grid |
| training | التقدّم نحو المستوى التالي في التطوير الذاتي | تقدّمك نحو المستوى التالي | aria; same |
| training | تصفية المسارات حسب الفئة | تصفية حسب الفئة | aria; same |
| competitions | تصفية المسابقات بحسب الحالة | تصفية بحسب الحالة | aria; same |

## Kept intact (deliberate)

- All countAr/arUnit plural arrays (82 structural words) — the guide's own plural law.
- SECURITY_MARKER_KEYS vocabulary + every legal fact row (storage ledger, lifetimes, providers, PendingTag markers).
- Form constraint strings («12 حرفًا على الأقل», «72 حرفًا كحدّ أقصى», «4 أحرف على الأقل»), a11y labels for the password eyes, and every 1–3-word label/button.
- The landing identity paragraph verbatim on /about (LEGAL-TODO row 14 constraint).
