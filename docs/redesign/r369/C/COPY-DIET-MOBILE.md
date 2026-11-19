# R369 · C — the mobile copy diet (C4.1) — wave 1

Baseline (branch base aa450d8f): **10419** counted Arabic words (174 screens, gate `copy-budget-mobile`).
After wave 1: **9743** (−676, −6.5%). Ceilings re-censused DOWN in the same commit; gate CLEAN; jest 1271/1271 green; worklet-audit LAWFUL.

The −20% bar (≤ 8335) continues in wave 2 (the long tail + the deep pass on the shared feature components).

## Read-through table — the changed strings (before → after)

| screen | before | after |
|---|---|---|
| `app/admin/(tabs)/faculties.tsx` | جميع كلّيّات الجامعة وأقسامها مع إحصائيات حية. | {countAr(d.teachers ?? 0, ["أستاذ واحد", "أستاذان", "أساتذة", "أستاذاً"])} ·{" "} |
| `app/admin/(tabs)/faculties.tsx` | {countAr(d.teachers ?? 0, ["مدرّس واحد", "مدرّسان", "مدرّسون", "مدرّساً"])} ·{" "} | hint="يتميّز داخل مدينته." |
| `app/admin/(tabs)/students.tsx` | قائمة الطلاب المسجَّلين في الجامعة، مع البحث وإدارة التسجيلات. | إلغاء التسجيل يحذف التسجيل والتقدُّم نهائيًا — يمرّ على تأكيد قبل التنفيذ. |
| `app/admin/(tabs)/students.tsx` | إلغاء التسجيل يحذف تسجيل الطالب في المقرّر وتقدُّمه فيه نهائيًا — يمرّ كل إلغاء على تأكيد صريح قبل التنفيذ. | لا مقرّرات متاحة. |
| `app/admin/(tabs)/students.tsx` | لا توجد مقرّرات متاحة للتسجيل. | ? `سيُحذف التسجيل في «${confirming.offering?.course?.name ?? "المقرّر"}» والتقدُّم نهائيًا — لا يمكن التراجع.` |
| `app/admin/(tabs)/teachers.tsx` | توثيق الملفات الأكاديمية وتعيين المناصب القيادية لكل أستاذ. | toast.success("تمّ حفظ التعيين."); |
| `app/admin/(tabs)/teachers.tsx` | toast.success("تمّ حفظ التعيين.", "المنصب القياديّ"); | المنصب يُمنح بالتعيين — يضاف فوق دور الأستاذ ولا يستبدله. |
| `app/admin/courses.tsx` | toast.success(`حُذف «${deleting?.name}» من السجلّ.`, "تمّ الحذف"); | toast.success(`حُذف «${deleting?.name}» من السجلّ.`); |
| `app/admin/courses.tsx` | placeholder="ابحث بالاسم أو الكود…" | placeholder="بحث بالاسم أو الكود…" |
| `app/admin/courses.tsx` | ? "حفظ التعديلات" | ? "حفظ" |
| `app/admin/courses.tsx` | بين 1 و10 — الحدّ الذي يقبله الخادم | بين 1 و10. |
| `app/admin/courses.tsx` | ? `سيُحذف «${deleting.name}» نهائيًا من السجلّ الجامعي. لا يمكن التراجع عن هذا الإجراء.` | ? `سيُحذف «${deleting.name}» نهائيًا من السجلّ — لا يمكن التراجع.` |
| `app/admin/courses.tsx` | `فُتحت شعبة «${course.name}» للفصل «${term.trim()}».`, | toast.success(`فُتحت شعبة «${course.name}» للفصل «${term.trim()}».`); |
| `app/admin/courses.tsx` | "تمّ فتح الشعبة", | سيُدرَّس «{course.name}» في الشعبة الجديدة. |
| `app/admin/courses.tsx` | سيُدرَّس مقرّر «{course.name}» ({course.code}) في الشعبة الجديدة. | 1–50 حرفًا — مثال: 2024-FALL |
| `app/auth/register.tsx` | الأدوار الأخرى (المسجل العام، الجودة، المالك) تُمنح بتعيين فقط — تواصل مع إدارة مؤسّستك. | الأدوار الأخرى تُمنح بتعيين فقط — تواصل مع إدارة مؤسّستك. |
| `app/auth/register.tsx` | <T variant="sm" color="muted">رجوع — تغيير الصفة</T> | <T variant="sm" color="muted">تغيير الصفة</T> |
| `app/community.tsx` | <StackHeader title="المجتمع الجامعي" kicker="الحياة الأكاديمية" /> | <StackHeader title="المجتمع الجامعي" /> |
| `app/community.tsx` | إعلانات الجامعة · مسابقات وفعاليات · أنشطة طلابية. المساحة الرسمية للحياة الأكاديمية اليومية. | المساحة الرسمية للحياة الأكاديمية اليومية. |
| `app/community.tsx` | إنشاء الإعلانات متاح للإدارة وهيئة التدريس من لوحاتها — يظهر هنا آخر تحديثات الجامعة. | تُنشأ الإعلانات من لوحات الإدارة والتدريس — هنا آخر التحديثات. |
| `app/competitions/[id].tsx` | toast.success("وصلت — بالتوفيق!", "المشاركة"); | toast.success("وصلت — بالتوفيق."); |
| `app/competitions/[id].tsx` | <StackHeader title="مسابقة" kicker="المسابقات الأكاديمية" /> | <StackHeader title="مسابقة" /> |
| `app/competitions/[id].tsx` | message={canEnter ? "كن أوّل المشاركين!" : "انتهت المهلة."} | message={canEnter ? "كن أوّل المشاركين." : "انتهت المهلة."} |
| `app/competitions/[id].tsx` | التحكيم يتمّ من منظّم المسابقة — تظهر النتائج هنا فور إعلانها. | التحكيم من منظّم المسابقة — النتائج فور إعلانها. |
| `app/owner/(tabs)/dashboard.tsx` | نظرة شاملة وإحصائيات حيّة عن المنصة | صندوق التغذية الراجعة من صفحة «المحتوى». |
| `app/owner/(tabs)/users.tsx` | عرض جميع حسابات المنصّة والبحث فيها وإدارتها | toast.success(`أصبح دور «${name}» الآن ${ROLE_LABELS[role] ?? "دور آخر"}.`); |
| `app/owner/(tabs)/users.tsx` | toast.success(`أصبح دور «${name}» الآن ${ROLE_LABELS[role] ?? "دور آخر"}.`, "تمّ تغيير الدور"); | toast.success(isActive ? `أُعيد تفعيل حساب «${name}».` : `عُطِّل حساب «${name}».`); |
| `app/owner/(tabs)/users.tsx` | toast.success(isActive ? `أُعيد تفعيل حساب «${name}».` : `عُطِّل حساب «${name}».`, "حُدِّثت الحالة"); | كل إجراء يُوثَّق في سجلّ النشاط. |
| `app/owner/(tabs)/users.tsx` | كل إجراء يُوثَّق في سجلّ نشاط المنصّة. | ? `من ${ROLE_LABELS[user.role ?? ""] ?? "دور آخر"} إلى ${ROLE_LABELS[roleDraft] ?? "دور آخر"}${insts ? ` — عضويته النشطة: ${insts}.` : " — بلا عضوية نشطة."}` |
| `app/owner/(tabs)/users.tsx` | ? `هل تريد تغيير دور «${name}» من ${ROLE_LABELS[user.role ?? ""] ?? "دور آخر"} إلى ${ROLE_LABELS[roleDraft] ?? "دور آخر"}؟${insts ? ` عضويته النشطة: ${insts}.` : " لا عضوية مؤسسة نشطة لهذا الحساب."}` | ? `لن يتمكّن من الدخول إلى المنصّة.` |
| `app/owner/(tabs)/users.tsx` | ? `هل تريد تعطيل حساب «${name}»؟ لن يتمكّن من الدخول إلى المنصّة.` | : `سيتمكّن من الدخول مجدداً.` |
| `app/owner/content.tsx` | <PageHeader title="المحتوى والعلامة التجاريّة" kicker="الهويّة وأصول العلامة" /> | <PageHeader title="المحتوى والعلامة التجاريّة" /> |
| `app/owner/content.tsx` | المصادر الرسميّة تعيش في مستودع الويب (frontend/public/brand) — التطبيق يرسم توأمه | المصادر الرسميّة في مستودع الويب (frontend/public/brand) — التطبيق يرسم توأمه المتجهيّ. |
| `app/owner/content.tsx` | المتجهيّ الخاص من الهندسة ذاتها. | تعديل الألوان ومحتوى الصفحة الرئيسيّة قيد التطوير — الألوان من نظام التصميم، والعنوان في كود الصفحة. |
| `app/owner/content.tsx` | تعديل ألوان العلامة التجاريّة (الأساسيّ، الثانويّ، التمييز) ومحتوى الصفحة الرئيسيّة | تُدار الإعلانات وأعلام الميزات والصفحة الرئيسيّة من لوحة الويب. |
| `app/owner/content.tsx` | قيد التطوير. حالياً تُعتمَد ألوان علامة مدارك الرسميّة المعتمدة في نظام التصميم — | تقارير «أبلغ عن مشكلة / اقتراح» من المستخدمين، بحالتها وطريقها. |
| `app/owner/institutions/[slug].tsx` | toast.success("حُفظ الاسم.", "بيانات المؤسسة"); | toast.success("حُفظ الاسم."); |
| `app/owner/institutions/[slug].tsx` | `تمّ ربط «${payload.email}» بدور المسجل العام في «${inst.name}».`, | toast.success(`تمّ ربط «${payload.email}» بدور المسجل العام في «${inst.name}».`); |
| `app/owner/institutions/[slug].tsx` | "تمّ التعيين", | toast.success(`أُلغيت العضوية في «${inst.name}».`); |
| `app/owner/institutions/[slug].tsx` | toast.success(`أُلغيت العضوية في «${inst.name}».`, "أُلغيت العضوية"); | toast.success(`أُعيدت العضوية في «${inst.name}».`); |
| `app/owner/institutions/[slug].tsx` | toast.success(`أُعيدت العضوية في «${inst.name}».`, "تمّت الاستعادة"); | يُمنح دور المسجل العام داخل المؤسسة فقط — عبر بريد حساب قائم. |
| `app/owner/institutions/[slug].tsx` | يُمنح دور المسجل العام داخل هذه المؤسسة فقط — يُربط حساب قائم عبر بريده الإلكتروني. | لا عضويات بعد — تظهر فور توثيق أول تعيين. |
| `app/owner/institutions/[slug].tsx` | لا تحمل حمولة القائمة عضويات مسجلين بعد — تُعرض هنا فور توثيق أول تعيين. | المعرّف غير متوفر — يُدار من لوحة الويب. |
| `app/owner/institutions/[slug].tsx` | لا تحمل الحمولة معرّف العضوية — يُدار الإجراء من لوحة الويب. | ? `سيفقد «${`${revokeTarget.firstName ?? ""} ${revokeTarget.lastName ?? ""}`.trim() \|\| revokeTarget.email \|\| "—"}» وصوله إلى «${inst.name}» فورًا.` |
| `app/owner/institutions/[slug].tsx` | ? `هل تريد إلغاء عضوية «${`${revokeTarget.firstName ?? ""} ${revokeTarget.lastName ?? ""}`.trim() \|\| revokeTarget.email \|\| "—"}» في «${inst.name}»؟ سيفقد وصوله إلى سياق هذه المؤسسة فورًا.` | ? `سيستعيد «${`${restoreTarget.firstName ?? ""} ${restoreTarget.lastName ?? ""}`.trim() \|\| restoreTarget.email \|\| "—"}» وصوله إلى «${inst.name}».` |
| `app/owner/institutions/[slug].tsx` | ? `هل تريد إعادة تنشيط عضوية «${`${restoreTarget.firstName ?? ""} ${restoreTarget.lastName ?? ""}`.trim() \|\| restoreTarget.email \|\| "—"}» في «${inst.name}»؟ سيستعيد وصوله إلى سياق هذه المؤسسة.` | label={rename.isPending ? SAVING : "حفظ"} |
| `app/owner/institutions/[slug].tsx` | label={rename.isPending ? SAVING : "حفظ الأسماء"} | يُربط حساب قائم (بالبريد) بدور المسجل العام هنا — إنشاء الحسابات من لوحة الويب. |
| `app/owner/system.tsx` | : { label: "لم يُتحقق بعد", tone: "yellow" as const, note: "لم يُتحقّق من اتصاله." } | : { label: "لم يُتحقق بعد", tone: "yellow" as const, note: null } |
| `app/owner/system.tsx` | <PageHeader title="النظام والتشغيل" kicker="البنية والخدمات" /> | <PageHeader title="النظام والتشغيل" /> |
| `app/owner/system.tsx` | لا توجد إعدادات مُعرَّفة بعد — القيم الافتراضية تعمل. | لا إعدادات مُعرَّفة — القيم الافتراضية تعمل. |
| `app/owner/system.tsx` | تُحفَظ القيمة في قاعدة البيانات وتُوثَّق في سجلّ النشاط — لا يستهلكها مسار تشغيل بعد؛ سلوك | تُحفَظ في قاعدة البيانات وتُوثَّق في السجلّ — لا تُستهلك؛ السلوك بقيم الشيفرة. |
| `app/owner/system.tsx` | المنصّة يبقى بقيمه المضمّنة في الشيفرة. | message="تُدار من قاعدة البيانات." |
| `app/owner/system.tsx` | message="لا أعلام — تُدار من قاعدة البيانات." | تُحفَظ الحالة في قاعدة البيانات وتُوثَّق في السجلّ — لا تُستهلك؛ السلوك بقيم الشيفرة. |
| `app/owner/system.tsx` | تُحفَظ حالة كل علم في قاعدة البيانات وتُوثَّق في سجلّ النشاط — لا تستهلكها أيّ بوابة تشغيل | تُدار من لوحة «التنبيهات التشغيليّة». |
| `app/owner/system.tsx` | بعد، فلا يتغيّر سلوك المنصّة بتغييرها. | ? `تعطيل «${flagConfirm.name ?? flagConfirm.slug}»؟ يُسجَّل في السجلّ — الإرجاع من هذه البطاقة.` |
| `app/owner/system.tsx` | حالياً — تُدار من لوحة «التنبيهات التشغيليّة». | : `تفعيل «${flagConfirm.name ?? flagConfirm.slug}»؟ يُسجَّل في السجلّ — التراجع من هذه البطاقة.` |
| `app/owner/system.tsx` | ? `هل تريد تعطيل «${flagConfirm.name ?? flagConfirm.slug}»؟ سيُسجَّل الإجراء في سجلّ النشاط، ويمكن إعادته في أي وقت من هذه البطاقة.` | label={setSetting.isPending ? SAVING : "حفظ"} |
| `app/quality/exam-moderation.tsx` | <StackHeader title="مراجعة الاختبارات" kicker="قطاع ضمان الجودة" /> | <StackHeader title="مراجعة الاختبارات" /> |
| `app/quality/exam-moderation.tsx` | title="مراجعة الاختبارات" | <PageHeader title="مراجعة الاختبارات" /> |
| `app/quality/exam-moderation.tsx` | kicker="مراجعة القوالب — حصرية." | غير المعتمدة فقط. |
| `app/quality/exam-moderation.tsx` | من بنك الأسئلة — الأسئلة غير المعتمدة فقط. | ? `سيُرفض «${rejectConfirm.title}» ويخرج من الطابور بلا تراجع.` |
| `app/settings.tsx` | toast.success("غُيّرت كلمة المرور.", "كلمة المرور"); | toast.success("غُيّرت كلمة المرور."); |
| `app/settings.tsx` | <PageHeader title="الإعدادات" kicker="مدارك" testID="settings-title" /> | <PageHeader title="الإعدادات" testID="settings-title" /> |
| `app/settings.tsx` | طريقة عرض الأرقام في لوحتك ونتائجك — {`١٢٣`} بالخط العربي أو {`123`} باللاتيني. | عرض الأرقام في لوحتك ونتائجك — {`١٢٣`} عربي أو {`123`} لاتيني. |
| `app/settings.tsx` | اهتزاز خفيف عند التفاعلات الرئيسة — يعمل على الجوال فقط. | اهتزاز خفيف عند التفاعلات الرئيسة. |
| `app/settings.tsx` | عند التفعيل، يُطلب فتح القفل عند كل فتح بارد للتطبيق قبل عرض أي بيانات — مع رمز الجهاز كبديل دائمًا. | يُطلب فتح القفل عند كل فتح بارد، ورمز الجهاز بديل دائم. |
| `app/settings.tsx` | قفل التطبيق بالبصمة متاح على الأجهزة المزوّدة بمستشعر بصمة أو تعرّف على الوجه — جهازك الحالي لا يوفّره (أو لم تُسجّل بصمة في النظام). | القفل بالبصمة يحتاج مستشعرًا أو بصمة مسجّلة في النظام — جهازك لا يوفرها. |
| `app/settings.tsx` | تغيير كلمة المرور ينهي جلساتك على جميع الأجهزة الأخرى. | تغيير كلمة المرور ينهي جلساتك على الأجهزة الأخرى. |
| `app/settings.tsx` | <Button label={busy ? SAVING : "حفظ كلمة المرور"} onPress={changePassword} loading={busy} /> | <Button label={busy ? SAVING : "حفظ"} onPress={changePassword} loading={busy} /> |
| `app/settings.tsx` | confirmLabel="خروج" | confirmLabel="تسجيل الخروج" |
| `app/student/(tabs)/profile.tsx` | <PageHeader title="حسابي" kicker="هويّتك وخدمات الطالب." /> | <PageHeader title="حسابي" /> |
| `app/student/(tabs)/profile.tsx` | يتبع التطبيق تفضيلك هنا وعلى الموقع — يتزامن مع حسابك. | يتبع التطبيق والموقع تفضيلك — يتزامن مع حسابك. |
| `app/student/(tabs)/profile.tsx` | الإشعارات مفعّلة — تصلك التنبيهات على هذا الجهاز. | الإشعارات مفعّلة على هذا الجهاز. |
| `app/student/(tabs)/profile.tsx` | جميع خدمات الطالب متاحة من هنا — تعمل بعضها في وضع الطيار وتُوسَم بذلك داخل صفحاتها. | كل خدمات الطالب من هنا — بعضها يعمل دون اتصال. |
| `app/student/lectures/[lectureId].tsx` | toast.info("من حيث توقفت", "استئناف المشاهدة"); | toast.info("من حيث توقفت"); |
| `app/student/lectures/[lectureId].tsx` | <ProgressBar ratio={watchPct / 100} accent label={`تقدّم مشاهدة المحاضرة ${fmt(watchPct)}٪`} /> | <ProgressBar ratio={watchPct / 100} accent label={`تقدّم المشاهدة ${fmt(watchPct)}٪`} /> |
| `app/student/lectures/[lectureId].tsx` | placeholder="ابحث في النص…" | placeholder="بحث…" |
| `app/student/lectures/[lectureId].tsx` | {reveal.correct ? "إجابة صحيحة!" : "إجابة غير صحيحة."} | {reveal.correct ? "إجابة صحيحة." : "إجابة غير صحيحة."} |
| `app/student/library.tsx` | <StackHeader title="المكتبة" kicker="المكتبة الإلكترونية" /> | <StackHeader title="المكتبة" /> |
| `app/student/library.tsx` | كتب المكتبة الأكاديمية وبحوث طلاب الجامعة المنشورة — متاحة للاستعارة الفورية والاطّلاع المرجعي. | كتب أكاديمية وبحوث منشورة — للاستعارة والاطّلاع. |
| `app/student/library.tsx` | "تمّت الاستعارة", | toast.success("أُعيد الكتاب."); |
| `app/student/library.tsx` | toast.success("أُعيد الكتاب.", "تمّ الإرجاع"); | تصفية على الكتب الظاهرة — حمّل المزيد للتوسيع. |
| `app/student/library.tsx` | تصفية على الكتب الظاهرة أدناه — حمّل المزيد لتوسيع النتيجة. | <SectionNote>لا استعارات نشطة — اضغط «استعارة» على كتاب متاح.</SectionNote> |
| `app/student/library.tsx` | <SectionNote>لا استعارات نشطة — اضغط «استعارة» على أي كتاب متاح ليظهر هنا.</SectionNote> | <SectionNote>يبدأ البحث من حرفين على الأقل.</SectionNote> |
| `app/student/library.tsx` | <SectionNote>البحث في البحوث يبدأ من حرفين على الأقل — أضف حرفاً ثانياً وسيبدأ فوراً.</SectionNote> | النشر مُتحقَّق قبل الإدراج — عبر عارض المستندات. |
| `app/student/matrix.tsx` | kicker="تتبّع المعرفة" | {`خريطة معرفيّة لكل مفهوم — تُرسم من نقاط التفاعل والاختبارات.`} |
| `app/student/matrix.tsx` | {`خريطة معرفيّة شخصيّة لكل مفهوم درسته — تُرسم من نقاط التفاعل في المحاضرات والاختبارات.`} | ابدأ بسدّ الفجوات — التوصية تأخذك للمحاضرة المناسبة. |
| `app/student/matrix.tsx` | ابدأ بسدّ هذه الفجوات — حيث تتوفّر توصية، يأخذك الصفّ مباشرة إلى المحاضرة المناسبة. | لا فجوات حالياً. استمر بالحضور والإجابة. |
| `app/student/matrix.tsx` | لا فجوات حالياً — أحسنت! استمر بحضور المحاضرات والإجابة على نقاط التفاعل. | لا مفاهيم بعد — تظهر فور إضافتها من الأستاذ. |
| `app/student/my-data.tsx` | title="بياناتي واتصالي" | <PageHeader title="بياناتي واتصالي" /> |
| `app/student/my-data.tsx` | kicker="بيانات المؤسسة — عدّل ما يخصّك." | هذه الحقول يُدخلها المسجّل العام — لتصحيحها راجعه. |
| `app/student/my-data.tsx` | الاسم الرباعي والرقم الوطني ومكان الميلاد يُدخلها المسجّل العام في مؤسستك — لتصحيحها | الصيغ المقبولة: 09XXXXXXXXX أو 9XXXXXXXX أو +218XXXXXXXXX — والأرقام الهندية |
| `app/student/my-data.tsx` | راجعه. | لا بيانات ولي أمر — تُدخلها إدارة التسجيل. |
| `app/student/my-data.tsx` | الصيغ المقبولة: 09XXXXXXXXX أو 9XXXXXXXX أو +218XXXXXXXXX — والأرقام العربية-الهندية | لا حقول مخصّصة بعد. |
| `app/student/my-data.tsx` | لا توجد بيانات ولي أمر — تُدخلها إدارة التسجيل في مؤسستك. | كلمة المرور من «الإعدادات» — تغييرها يُنهي الجلسات الأخرى. |
| `app/student/online-exams/[templateId].tsx` | toast.success("سُلّم اختبارك.", "تمّ التسليم"); | toast.success("سُلّم اختبارك."); |
| `app/student/online-exams/[templateId].tsx` | ? `تعذَّر حفظ إجابة السؤال ${latn(failedNumbers[0])} — أعد الإجابة عليه` | ? `تعذَّر حفظ إجابة السؤال ${latn(failedNumbers[0])} — أعد الإجابة` |
| `app/student/online-exams/[templateId].tsx` | : `تعذَّر حفظ إجابات الأسئلة ${failedNumbers.slice(0, 3).map(latn).join(" و")} — أعد الإجابة عليها`} | : `تعذَّر حفظ إجابات الأسئلة ${failedNumbers.slice(0, 3).map(latn).join(" و")} — أعد الإجابة`} |
| `app/student/online-exams/[templateId].tsx` | placeholder="اكتب إجابتك هنا…" | placeholder="اكتب إجابتك…" |
| `app/student/online-exams/[templateId].tsx` | ? countAr(unanswered, ["سؤال بدون إجابة", "سؤالان بدون إجابة", "أسئلة بدون إجابة", "سؤالاً بدون إجابة"]) | ? `${countAr(unanswered, ["سؤال", "سؤالان", "أسئلة", "سؤالاً"])} بدون إجابة` |
| `app/student/online-exams/[templateId].tsx` | label={navPick == null ? "اختر سؤالاً" : `انتقال إلى السؤال ${latn(navPick + 1)}`} | label={navPick == null ? "اختر سؤالاً" : `السؤال ${latn(navPick + 1)}`} |
| `app/student/online-exams/[templateId].tsx` | title="التسليم نهائي — تأكيد؟" | title="تسليم الاختبار؟" |
| `app/student/online-exams/[templateId].tsx` | أنت دون اتصال — إجاباتك تُحفظ وستُرسل تلقائياً عند عودة الشبكة. | أنت دون اتصال — إجاباتك تُحفظ وتُرسل تلقائياً عند عودة الشبكة. |
| `app/student/online-exams/[templateId].tsx` | ? "مبروك — اجتزت الاختبار!" | ? "اجتزت الاختبار" |
| `app/student/online-exams/[templateId].tsx` | ? `${countAr(result.needsManual, ["سؤال", "سؤالان", "أسئلة", "سؤالاً"])} بحاجة لتقييم يدوي من الأستاذ — ستظهر الدرجة النهائية بعد المراجعة.` | ? `${countAr(result.needsManual, ["سؤال", "سؤالان", "أسئلة", "سؤالاً"])} بحاجة لتقييم يدوي — الدرجة النهائية بعد المراجعة.` |
| `app/student/online-exams/[templateId].tsx` | ستتمكّن من مراجعة أسئلتك بعد اكتمال التصحيح اليدوي. | المراجعة متاحة بعد اكتمال التصحيح. |
| `app/student/online-exams/[templateId].tsx` | لا توجد تفاصيل مراجعة لهذه المحاولة. | لا تفاصيل مراجعة لهذه المحاولة. |
| `app/student/research.tsx` | toast.success("اكتمل الفحص.", "فحص النزاهة"); | toast.success("اكتمل فحص النزاهة."); |
| `app/student/research.tsx` | <StackHeader title="بحوثي" kicker="البحوث العلمية" /> | <StackHeader title="بحوثي" /> |
| `app/student/research.tsx` | ارفع بحوثك، اعرضها على فحص الانتحال وكشف الذكاء الاصطناعي (محاكاة حتى تفعيل كشف حقيقي)، ثم أرسلها لأستاذك للتقييم والنشر في مكتبة الجامعة. | ارفع بحوثك لفحص الانتحال والذكاء الاصطناعي (محاكاة) ثم تقييم الأستاذ والنشر في المكتبة. |
| `app/student/research.tsx` | <SectionNote>الفحص الأوتوماتيكي يجري — النتائج تظهر هنا تلقائياً.</SectionNote> | <SectionNote>الفحص يجري — النتائج تظهر تلقائياً.</SectionNote> |
| `app/student/research.tsx` | تجاوز البحث الحدود التجريبية المسموح بها (محاكاة) — ارفع نسخة معدّلة. | تجاوز الحدود المسموحة (محاكاة) — ارفع نسخة معدّلة. |
| `app/student/research.tsx` | <SectionNote>الخطوة التالية: ابدأ الفحص الأوتوماتيكي (انتحال + محتوى ذكاء اصطناعي).</SectionNote> | <SectionNote>ابدأ الفحص (انتحال + ذكاء اصطناعي).</SectionNote> |
| `app/student/research.tsx` | label={scanning ? "جارٍ بدء الفحص…" : "ابدأ الفحص الآن"} | label={scanning ? "جارٍ بدء الفحص…" : "ابدأ الفحص"} |
| `app/student/research.tsx` | <SectionNote>بانتظار تقييم أستاذك — لا إجراء مطلوب منك الآن.</SectionNote> | <SectionNote>بانتظار تقييم الأستاذ — لا إجراء مطلوب.</SectionNote> |
| `app/student/research.tsx` | toast.success("فحص انتحال ثم تقييم الأستاذ.", "تمّ رفع البحث"); | toast.success("فحص انتحال ثم تقييم الأستاذ."); |
| `app/student/research.tsx` | أكمل عنوان البحث (3 أحرف على الأقل) لتتمكّن من الرفع. | أكمل العنوان (3 أحرف على الأقل). |
| `app/student/research.tsx` | ملفات PDF فقط، بحد أقصى 20 ميغابايت — بدون ملف يُسجَّل البحث بعنوانه وملخصه فقط. | PDF فقط، 20 ميغابايت كحدّ أقصى — بدون ملف يُسجَّل البحث بعنوانه وملخصه. |
| `app/teacher/(tabs)/dashboard.tsx` | kicker="تدخّلات اليوم بالأولوية." | kicker="تدخّلات اليوم" |
| `app/teacher/(tabs)/dashboard.tsx` | "تسليم بانتظار التصحيح", | label={arCount(pendingTotal, ["تسليم", "تسليمان", "تسليمات", "تسليماً"])} |
