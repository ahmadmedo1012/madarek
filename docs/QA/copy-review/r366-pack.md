# Copy review pack — the r366 round-2 diet (Agent 4)

Generated from the r366 branch commits (ac3cc77 · cfc1dc8 and the lane commits that follow).
Every Arabic line the round removed or added across the touched page files, read as the
native-editor pack against the R356 failure classes (grammar, lost meaning, truncation,
English leftovers, term consistency, tone, actionable errors, empty states).

## frontend/src/pages/student/AiAssistantPage.tsx (244 → 181)

| before | after |
|---|---|
| مرحبًا! أحلّل بيانات إتقانك محليّاً وأقترح خطوة مذاكرة تالية. | أحلّل بيانات إتقانك محليّاً وأقترح خطوتك التالية. |
| مرحبًا! لا بيانات إتقان لمقرّراتك — إجاباتي عامّة. | لا بيانات إتقان لمقرّراتك — إجاباتي عامّة. |
| مرحبًا! أرى بيانات إتقانك لأركّز على فجواتك. | أرى بيانات إتقانك لأركّز على فجواتك. |
| مرحبًا! لا بيانات إتقان لديّ — أساعدك في التدريس والتقييم. | لا بيانات إتقان لديّ — أساعدك في التدريس والتقييم. |
| انتهت حصّتك اليوميّة — عُد غدًا. | عُد غدًا. (the card's title already names the daily limit) |
| تعذَّر الاتصال بالمساعد. | تعذَّر الاتصال. |
| اقترح خطّة مذاكرة لفجواتي (suggestion chip) | اقترح خطّة مذاكرة |
| كيف أحسّن أضعف مفاهيمي؟ / راجع معي مفاهيمي المتعثّرة (chips) | cut — overlapped the surviving asks |
| اقترح أنشطة تزيد مشاركة الطلاب | اقترح أنشطة تفاعلية |
| كيف أصوغ أسئلة تقيس الفهم؟ (chip) | cut — the surviving «كيف أقيّم فهم الطلاب؟» carries it |
| اسأل عن المفهوم | اسأل عنه |
| انتقل لأحدث رسالة | إلى الأحدث |
| سؤالان متبقّيان | سؤالان (counter label) |
| description="يمكنك مواصلة المحادثة." | cut — the error title + retry button carry the action |
| description="ستظهر القائمة عند إعادة المحاولة." | cut — same class |
| 5 suggestion chips → 3 per role; shared RETRY_LABEL/GAPS_BAR_TITLE consts; quick-ask chips now render the ask verbatim (no parallel label to drift) | |

## frontend/src/pages/teacher/* (589+150+152 → 450+120+139)

The teacher set's cuts were literal-consolidation plus restatement removal; every
action-critical bound kept verbatim (spot-verified in the pack generation):
- «عدد صحيح بين 0 و100» / «عدد صحيح بين 1 و100» / «الحدّ 200 درجة في الحفظة» / «الدرجة العظمى أكبر من صفر.» — KEPT verbatim (validation bounds).
- «الخروج يتخلّى عن تعديلاتك.» (discard guard) — KEPT verbatim (destructive finality).
- Repeated page-title/help literals → single consts (the copy gate counts per literal).
- Full line-by-line table: `git show cfc1dc8 -- frontend/src/pages/teacher/` (read as the pack).

## frontend/src/pages/student/CoursesPage.tsx (119 → 115)

| before | after |
|---|---|
| جميع المقرّرات التي سجّلت فيها هذا الفصل. | مقرّراتك هذا الفصل. (r173a one-summary-line contract kept) |

## frontend/src/pages/student/MorePages.tsx (410 → 356)

| before | after |
|---|---|
| فهرس تجارب AR/VR للمقرّرات العمليّة — غير متاح بعد. | غير متاح بعد. (title carries «تجارب AR / VR») |
| (densest hub rows — see `git show cfc1dc8 -- frontend/src/pages/student/MorePages.tsx`) | |

## frontend/src/pages/owner/OwnerInstitutionsPage.tsx (178 → 173)

| before | after |
|---|---|
| description="إدارة المؤسسات التعليمية على المنصّة" | cut — restated the title «المؤسسات» |

## Deliberately NOT cut (truthfulness pins win)

- OwnerAiPage «تظهر المؤشّرات فور تسجيل أول طلب. الجهوزيّة تحدّدها إعدادات المزوّد — الأعلام تُسجَّل ولا تستهلكها بوابة تشغيل.» — the r165g truthfulness test guards the operator's action path (provider config). Attempted trim REVERTED.
- CoursesPage's empty-state helper «تواصل مع المسجل العام لإكمال التسجيل.» — action-critical next step.
- ImportWizard «لا شيء يُكتب قبل تأكيدك.» — data-safety meaning.

## Editor's verification notes

- Grammar/spelling: no broken forms; «سؤالان» reads naturally under the counter's context («سؤالان متبقّيان» → counter + label).
- Libyan-education terms unchanged: المقرّر، الكلية، القسم، المسجل العام، مراقب الامتحانات.
- Tone: helpers stay معكّمة; errors keep their action («إعادة المحاولة» verbatim).
- Empty states: 1 line + 1 action everywhere touched.
