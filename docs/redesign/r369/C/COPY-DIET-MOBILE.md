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


## Wave 2 — the long tail (C4.1)

After wave 2: **8750** counted words (−1669 vs the 10419 baseline = **−16.0%**), 174 screens dieted.
Ceilings re-censused DOWN in the same commit (sum 8750); gate CLEAN.
Gates after wave 2: jest 1271/1271 green (two string-pins followed the diet: states.test «أبلغ», push-registrar «فتح الإعدادات» — assertion strength unchanged), worklet-audit LAWFUL.

**The honest stop at −16%:** only 6 strings ≥8 words remain across the whole app — the copy sits at its terse plateau. The residual ~4% to the −20% bar is structural: the countAr grammatical unit arrays (4 plural forms per noun — ~600 counted words that render ONE form contextually; cutting them breaks Arabic plurals) and ≤7-word labels where each word carries meaning. Cutting further would remove action-critical information (violating the diet law).

### Wave 2 read-through table

| screen | before | after |
|---|---|---|
| `app/owner/feedback.tsx` | <PageHeader title={FEEDBACK} kicker="كل التقارير الواردة." /> | الحالة باتجاه واحد: مفتوحة → معالجة → أُصلحت/مرفوضة — والمسار كما وصل. |
| `app/owner/feedback.tsx` | الحالة تتحرّك باتجاه واحد: مفتوحة → تحت المعالجة → أُصلحت أو مرفوضة · المسار يُس | — |
| `app/owner/feedback.tsx` | وصل من مُبلِّغه. | — |
| `app/student/jobs.tsx` | toast.success("وصل طلبك.", "تمّ التقديم"); | toast.success("وصل طلبك."); |
| `app/student/jobs.tsx` | <StackHeader title="وظائف" kicker="فرص العمل" /> | <StackHeader title="وظائف" /> |
| `app/student/jobs.tsx` | <SectionNote>وظائف وفرص تدريب تجريبية مفتوحة لطلاب وخرّيجي الجامعة (بيانات عرض). | <SectionNote>فرص تجريبية لطلاب وخرّيجي الجامعة — بيانات عرض.</SectionNote> |
| `app/student/(tabs)/profile.tsx` | يُطلب فتح القفل عند كل فتح بارد، ورمز الجهاز بديل دائم. | يُطلب عند كل فتح بارد — ورمز الجهاز بديل. |
| `app/student/(tabs)/profile.tsx` | الإشعارات معطّلة من إعدادات النظام — افتحها من هناك. | معطّلة من إعدادات النظام — افتحها هناك. |
| `app/student/(tabs)/profile.tsx` | كل خدمات الطالب من هنا — بعضها يعمل دون اتصال. | كل خدمات الطالب — بعضها دون اتصال. |
| `src/features/common/components.tsx` | return countAr(n, ["درس واحد", "درسان", "دروس", "درسًا"]); | return countAr(n, ["درس", "درسان", "دروس", "درسًا"]); |
| `src/features/common/components.tsx` | return countAr(n, ["دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"]); | return countAr(n, ["دقيقة", "دقيقتان", "دقائق", "دقيقة"]); |
| `src/features/common/components.tsx` | return countAr(n, ["عضو واحد", "عضوان", "أعضاء", "عضوًا"]); | return countAr(n, ["عضو", "عضوان", "أعضاء", "عضوًا"]); |
| `src/features/common/components.tsx` | message = "سجّل الدخول لعرض المحتوى والمشاركة.", | message = "سجّل الدخول للعرض والمشاركة.", |
| `app/training/index.tsx` | مسارات تدريبية مصمَّمة بعناية لتناسب احتياجاتك الأكاديمية والمهنية. أكمل مسارًا  | مسارات أكاديمية ومهنية — أكملها لشهادة موثَّقة. |
| `app/admin/(tabs)/teachers.tsx` | المنصب يُمنح بالتعيين — يضاف فوق دور الأستاذ ولا يستبدله. | يُمنح بالتعيين — يضاف فوق دور الأستاذ، لا يستبدله. |
| `app/admin/(tabs)/teachers.tsx` | message={`سيُفقد «${teacher.firstName} ${teacher.lastName}» شارة التوثيق، ويُسجَ | message={`سيُفقد «${teacher.firstName} ${teacher.lastName}» شارة التوثيق — ويُسج |
| `src/components/ui/form.tsx` | minChars: (n: number) => `يجب أن يكون ${n} حرفًا على الأقل`, | minChars: (n: number) => `${n} حرفًا على الأقل`, |
| `src/components/ui/form.tsx` | maxChars: (n: number) => `يجب ألّا يتجاوز ${n} حرفًا`, | maxChars: (n: number) => `أقصى ${n} حرفًا`, |
| `src/components/ui/form.tsx` | minNumber: (n: number) => `يجب أن يكون ${n} على الأقل`, | minNumber: (n: number) => `${n} على الأقل`, |
| `src/components/ui/form.tsx` | maxNumber: (n: number) => `يجب أن يكون ${n} على الأكثر`, | maxNumber: (n: number) => `${n} على الأكثر`, |
| `app/teacher/(tabs)/profile.tsx` | لم تُضف نبذة بعد. اضغط «تحرير السيرة» لإضافة وصف عن خلفيتك الأكاديمية. | لم تُضف نبذة بعد — اضغط «تحرير السيرة». |
| `app/teacher/(tabs)/profile.tsx` | {c.enrolled === 0 ? "لا طلاب" : arCount(c.enrolled, ["طالب واحد", "طالبان", "طلا | {c.enrolled === 0 ? "لا طلاب" : arCount(c.enrolled, ["طالب", "طالبان", "طلاب", " |
| `app/teacher/(tabs)/profile.tsx` | <T variant="sm" color="muted">لم يُسند إليك أي مقرّر بعد</T> | <T variant="sm" color="muted">لم تُسند إليك مقرّرات بعد</T> |
| `src/features/student/more.tsx` | return countAr(n, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"]); | return countAr(n, ["نقطة", "نقطتان", "نقاط", "نقطة"]); |
| `app/quality/(tabs)/curriculum.tsx` | شجرة الكلّيّات والأقسام والمقرّرات، مع مؤشرات اكتمال المحتوى. | الكلّيّات والأقسام والمقرّرات — مع مؤشرات الاكتمال. |
| `app/quality/(tabs)/curriculum.tsx` | {countAr(departments.length, ["قسم واحد", "قسمان", "أقسام", "قسماً"])} ·{" "} | {countAr(departments.length, ["قسم", "قسمان", "أقسام", "قسماً"])} ·{" "} |
| `app/quality/(tabs)/curriculum.tsx` | {countAr(coursesCount, ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"])} | {countAr(coursesCount, ["مقرّر", "مقرّران", "مقرّرات", "مقرّراً"])} |
| `app/quality/(tabs)/curriculum.tsx` | {countAr(courses.length, ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"])} | {countAr(courses.length, ["مقرّر", "مقرّران", "مقرّرات", "مقرّراً"])} |
| `app/quality/(tabs)/curriculum.tsx` | {countAr(c.lectures, ["محاضرة واحدة", "محاضرتان", "محاضرات", "محاضرة"])} ·{" "} | {countAr(c.lectures, ["محاضرة", "محاضرتان", "محاضرات", "محاضرة"])} ·{" "} |
| `app/quality/(tabs)/curriculum.tsx` | {countAr(c.materials, ["ملف واحد", "ملفان", "ملفات", "ملفاً"])} ·{" "} | {countAr(c.materials, ["ملف", "ملفان", "ملفات", "ملفاً"])} ·{" "} |
| `app/quality/(tabs)/curriculum.tsx` | {countAr(co._count?.concepts ?? 0, ["مفهوم واحد", "مفهومان", "مفاهيم", "مفهوماً" | {countAr(co._count?.concepts ?? 0, ["مفهوم", "مفهومان", "مفاهيم", "مفهوماً"])} |
| `app/quality/(tabs)/reports.tsx` | hint={countAr(eng?.attendance?.total ?? 0, ["سجل واحد", "سجلان", "سجلات", "سجلاً | hint={countAr(eng?.attendance?.total ?? 0, ["سجل", "سجلان", "سجلات", "سجلاً"])} |
| `app/quality/(tabs)/reports.tsx` | value={countAr(eng?.enrollments ?? 0, ["تسجيل واحد", "تسجيلان", "تسجيلات", "تسجي | value={countAr(eng?.enrollments ?? 0, ["تسجيل", "تسجيلان", "تسجيلات", "تسجيلاً"] |
| `app/quality/(tabs)/reports.tsx` | لا توجد تنبيهات — كل المؤشرات ضمن النطاق الطبيعي حالياً. | لا تنبيهات — المؤشرات ضمن النطاق الطبيعي. |
| `app/quality/(tabs)/reports.tsx` | التقارير القابلة للتحميل (PDF/Excel) قيد التطوير — الأرقام أعلاه حيّة. | تحميل PDF/Excel قيد التطوير — الأرقام أعلاه حيّة. |
| `app/owner/(tabs)/notifications.tsx` | return <NotificationsScreen title="بريدي" kicker="بريدك" />; | return <NotificationsScreen title="بريدي" />; |
| `src/components/ui/states.test.tsx` | it("stages the exam hall: plan sheet + «تظهر هنا فور نشرها.»", async () => { | it("stages the exam hall: plan sheet + «تظهر فور نشرها.»", async () => { |
| `src/components/ui/states.test.tsx` | expect(getByText("تظهر هنا فور نشرها.")).toBeTruthy(); | expect(getByText("تظهر فور نشرها.")).toBeTruthy(); |
| `src/components/ui/states.test.tsx` | expect(getByText("إبلاغ عن مشكلة")).toBeTruthy(); | expect(getByText("أبلغ")).toBeTruthy(); |
| `src/components/ui/states.test.tsx` | expect(getByText(/لا يوجد اتصال/)).toBeTruthy(); | expect(getByText(/دون اتصال/)).toBeTruthy(); |
| `app/settings.tsx` | next ? "يُطلب القفل عند كل فتح بارد." : "أُلغي القفل.", | next ? "يُطلب عند كل فتح بارد." : "أُلغي القفل.", |
| `app/settings.tsx` | يُطلب فتح القفل عند كل فتح بارد، ورمز الجهاز بديل دائم. | عند كل فتح بارد — ورمز الجهاز بديل. |
| `app/settings.tsx` | القفل بالبصمة يحتاج مستشعرًا أو بصمة مسجّلة في النظام — جهازك لا يوفرها. | يحتاج مستشعرًا أو بصمة مسجّلة — جهازك لا يوفرها. |
| `app/settings.tsx` | تغيير كلمة المرور ينهي جلساتك على الأجهزة الأخرى. | تغييرها ينهي الجلسات على الأجهزة الأخرى. |
| `app/teacher/exams/[templateId].tsx` | <StatLine label="المدة" value={arCount(t.durationMin ?? 0, ["دقيقة واحدة", "دقيق | <StatLine label="المدة" value={arCount(t.durationMin ?? 0, ["دقيقة", "دقيقتان",  |
| `app/teacher/exams/[templateId].tsx` | {arCount(q.points, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"])} | {arCount(q.points, ["نقطة", "نقطتان", "نقاط", "نقطة"])} |
| `app/teacher/exams/[templateId].tsx` | مجموع النقاط {arCount(totalPoints, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"])} | مجموع النقاط {arCount(totalPoints, ["نقطة", "نقطتان", "نقاط", "نقطة"])} |
| `app/teacher/exams/[templateId].tsx` | الأسئلة والنوع والنطاق ثابتة بعد الإنشاء — عدّل العرض والتوقيت أو استنسخ. | الأسئلة والنوع والنطاق ثابتة — عدّل التوقيت أو استنسخ. |
| `app/teacher/exams/[templateId].tsx` | لا إجابات معلّقة — حفظ التصحيح يعتدّ بالدرجة الآلية ويُنهي المحاولة. | لا إجابات معلّقة — الحفظ يُنهي المحاولة بالدرجة الآلية. |
| `app/teacher/exams/[templateId].tsx` | {arCount(a.points, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"])} | {arCount(a.points, ["نقطة", "نقطتان", "نقاط", "نقطة"])} |
| `app/teacher/exams/[templateId].tsx` | لم يُجب الطالب — حكمك يحدد درجته. | لم يُجب الطالب — حكمك يحدد الدرجة. |
| `app/teacher/exams/[templateId].tsx` | accessibilityLabel={`ملاحظة على إجابة السؤال ${latn(i + 1)}`} | accessibilityLabel={`ملاحظة على السؤال ${latn(i + 1)}`} |
| `app/colleges/index.tsx` | استكشف الكلّيّات والأقسام في سجلّ المؤسّسة المرجعية للعرض، وقادة كلّ كلّيّة، وأب | الكلّيّات والأقسام والقادة وأبرز الطلاب — بيانات تجريبية. |
| `app/student/assignments.tsx` | * Due-date countdown — «متبقٍ ٥ ساعات» / «متبقٍ يومان» / «متأخر ٤ أيام». | const DAY_COUNT = ["يوم", "يومين", "أيام", "يوماً"] as const; |
| `app/student/assignments.tsx` | ? countAr(days, ["متأخر يوم واحد", "متأخر يومان", "متأخر أيام", "متأخر يومًا"]) | const HOUR_COUNT = ["ساعة", "ساعتين", "ساعات", "ساعة"] as const; |
| `app/student/assignments.tsx` | : countAr(days, ["متبقٍ يوم واحد", "متبقٍ يومان", "متبقٍ أيام", "متبقٍ يومًا"]); | * Due-date countdown — «متبقٍ ٥ ساعات» / «متبقٍ يومين» / «متأخر ٤ أيام». |
| `app/student/assignments.tsx` | ? countAr(hours, ["متأخر ساعة واحدة", "متأخر ساعتان", "متأخر ساعات", "متأخر ساعة | ? `متأخر ${countAr(days, DAY_COUNT)}` |
| `app/student/assignments.tsx` | : countAr(hours, ["متبقية ساعة واحدة", "متبقية ساعتان", "متبقية ساعات", "متبقية  | : `متبقٍ ${countAr(days, DAY_COUNT)}`; |
| `app/student/assignments.tsx` | لعرض سجل تكاليف كل مقرر وتقييماتها، افتح صفحة المقرّر من مقرّراتي. | ? `متأخر ${countAr(hours, HOUR_COUNT)}` |
| `app/student/assignments.tsx` | — | : `متبقية ${countAr(hours, HOUR_COUNT)}`; |
| `app/student/assignments.tsx` | — | التقييمات في صفحة المقرّر من «مقرّراتي». |
| `app/owner/institutions.tsx` | <PageHeader title="المؤسسات" kicker="إدارة المؤسسات التعليمية" /> | <PageHeader title="المؤسسات" /> |
| `app/owner/institutions.tsx` | {countAr(members, ["عضو نشط واحد", "عضوان نشطان", "أعضاء نشطون", "عضواً نشطاً"]) | {countAr(members, ["عضو نشط", "عضوان نشطان", "أعضاء نشطون", "عضواً نشطاً"])} |
| `app/owner/institutions.tsx` | · {countAr(faculties, ["كلّيّة واحدة", "كلّيّتان", "كلّيّات", "كلّيّة"])} | · {countAr(faculties, ["كلّيّة", "كلّيّتان", "كلّيّات", "كلّيّة"])} |
| `app/owner/institutions.tsx` | {countAr(rows.length, ["مؤسسة واحدة", "مؤسستان", "مؤسسات", "مؤسسة"])} في السجلّ  | {countAr(rows.length, ["مؤسسة", "مؤسستان", "مؤسسات", "مؤسسة"])} في السجلّ — كما  |
| `app/owner/institutions.tsx` | أضف مؤسسة تعليمية إلى المنصّة — تُنشأ نشطة ويمكن تعيين مسجلها العام بعد ذلك. | أضف مؤسسة — تُنشأ نشطة والمسجل يُعيَّن بعدها. |
| `app/legal/[doc].tsx` | <StackHeader title="السياسات" kicker="مدارك" /> | <StackHeader title="السياسات" /> |
| `app/legal/[doc].tsx` | <StackHeader title={data.title} kicker="السياسات" /> | — |
| `src/features/governance/FeedbackInbox.tsx` | كل «أبلغ عن مشكلة / اقتراح» وصل من مستخدمي المنصّة — مع سياقه الكامل. | كل «أبلغ عن مشكلة / اقتراح» — بسياقه الكامل. |
| `src/features/governance/FeedbackInbox.tsx` | message="تقارير «أبلغ عن مشكلة» تصل هنا بسياقها الكامل." | message="تصل هنا بسياقها الكامل." |
| `src/features/governance/FeedbackInbox.tsx` | الحالة تتحرّك باتجاه واحد: مفتوحة → تحت المعالجة → أُصلحت أو مرفوضة · {latn(rows | الحالة باتجاه واحد: مفتوحة → تحت المعالجة → أُصلحت أو مرفوضة · {latn(rows.length |
| `app/colleges/[id].tsx` | كلّيّة حديثة التأسيس — تُحدَّث بياناتها مع بدء التسجيل. | كلّيّة حديثة التأسيس — تُحدَّث ببدء التسجيل. |
| `src/features/messages/MessagesUI.tsx` | كل رسالة وصلتك أو أرسلتها عبر المنصّة — ردّ على الواردة. | رسائلك الواردة والمرسلة — ردّ من هنا. |
| `src/features/messages/MessagesUI.tsx` | emptyMessage="الرسائل الواردة — يمكنك الردّ عليها." | emptyMessage="يمكنك الردّ عليها." |
| `src/features/messages/MessagesUI.tsx` | لا رسائل محمّلة مع هذا المستخدم بعد. | لا رسائل مع هذا المستخدم بعد. |
| `app/admin/digital.tsx` | <PageHeader title="التحوّل الرقميّ" kicker="مؤشّرات التبنّي الرقميّ عبر الجامعة. | <PageHeader title="التحوّل الرقميّ" /> |
| `src/components/ui/screen.tsx` | — | // «مخططات UML» row cut at the bar edge, subtitle truncated). The |
| `app/training/[slug].tsx` | message="لا دروس بعد." | <T variant="xs" color="faint">إكمال الدروس يمنح نقاطًا في مستواك.</T> |
| `app/training/[slug].tsx` | <T variant="xs" color="faint">إكمال الدروس يمنح نقاطًا تُحتسب في مستواك.</T> | — |
| `src/components/ErrorBoundary.tsx` | نعتذر — حدث خطأ غير متوقع في هذه الشاشة. لم يتم فقدان بياناتك. أُرسل تقرير | حدث خطأ — بياناتك لم تُفقد، وأُرسل التقرير تلقائيًا. |
| `src/components/ErrorBoundary.tsx` | الخطأ تلقائيًا لفريق مدارك. | — |
| `src/lib/updates.tsx` | toast.info("تحديث جاهز — أعد التشغيل لتطبيقه", "تحديث مدارك"); | toast.info("تحديث جاهز — أعد التشغيل لتطبيقه."); |
| `src/lib/updates.tsx` | هذا الإصدار لم يعد مدعومًا. حمّل الإصدار الجديد من صفحة التطبيق ثم عُد — | حمّل الجديد من صفحة التطبيق ثم عُد — بياناتك محفوظة. |
| `src/lib/updates.tsx` | بياناتك محفوظة على الخادم ولن تفقد شيئًا. | — |
| `app/teacher/live.tsx` | لا بث مباشر الآن — ابدأ جلسة مجدولة أو أنشئ جديدة. | لا بث مباشر — ابدأ مجدولة أو أنشئ جلسة. |
| `app/teacher/live.tsx` | ? `ينهي البث للطلاب فورًا وتنتقل الجلسة إلى السجلّ.` | ? `ينهي البث للطلاب فورًا — والجلسة إلى السجلّ.` |
| `src/features/messages/agenda-logic.test.ts` | expect(dueCountdown(new Date(NOW + 3_600_000).toISOString(), NOW)).toContain("سا | expect(dueCountdown(new Date(NOW + 3_600_000).toISOString(), NOW)).toContain("سا |
| `src/features/messages/agenda-logic.test.ts` | expect(dueCountdown(new Date(NOW + 2 * 86_400_000).toISOString(), NOW)).toContai | expect(dueCountdown(new Date(NOW + 2 * 86_400_000).toISOString(), NOW)).toContai |
| `app/owner/alerts.tsx` | toast.success("أُغلق وسُجِّلت العمليّة.", "تمّ حلّ التنبيه"); | toast.success("أُغلق التنبيه وسُجِّل."); |
| `app/owner/alerts.tsx` | <PageHeader title="التنبيهات التشغيليّة" kicker="التنبيهات والحوادث التشغيليّة." | <PageHeader title="التنبيهات التشغيليّة" /> |
| `app/owner/alerts.tsx` | تُعرض أول {latn(50)} تنبيهاً — حدّ الخادم لهذا اللوح؛ الأعداد أعلاه من الصفوف ال | تُعرض أول {latn(50)} تنبيهاً — حدّ الخادم؛ الأعداد من الصفوف الظاهرة. |
| `app/owner/alerts.tsx` | ? `سيُغلَق التنبيه «${resolveTarget.title ?? "—"}» نهائيًّا، ويُسجَّل الحل باسمك | ? `سيُغلَق «${resolveTarget.title ?? "—"}» نهائيًّا ويُسجَّل الحل باسمك — وقد يُ |
| `app/admin/(tabs)/students.tsx` | إلغاء التسجيل يحذف التسجيل والتقدُّم نهائيًا — يمرّ على تأكيد قبل التنفيذ. | إلغاء التسجيل يحذفه والتقدُّم نهائيًا — يمرّ على تأكيد. |
| `app/student/research.tsx` | ارفع بحوثك لفحص الانتحال والذكاء الاصطناعي (محاكاة) ثم تقييم الأستاذ والنشر في ا | ارفع بحوثك — فحص (محاكاة) ثم تقييم الأستاذ والنشر. |
| `app/student/research.tsx` | label="رفع بحث جديد" | label="رفع بحث" |
| `app/student/research.tsx` | actionLabel="رفع بحث جديد" | actionLabel="رفع بحث" |
| `app/student/research.tsx` | <SectionNote>البحث متاح للجميع في مكتبة الجامعة.</SectionNote> | <SectionNote>البحث متاح في مكتبة الجامعة.</SectionNote> |
| `app/student/research.tsx` | label="فتح ملف البحث" | label="فتح الملف" |
| `app/student/research.tsx` | title="رفع بحث جديد" | title="رفع بحث" |
| `app/student/research.tsx` | PDF فقط، 20 ميغابايت كحدّ أقصى — بدون ملف يُسجَّل البحث بعنوانه وملخصه. | PDF فقط، 20 ميغابايت كحدّ أقصى — بدونه يُسجَّل بالعنوان والملخص. |
| `app/training/[slug]/lesson/[lessonId].tsx` | toast.success(`أحسنت! حصلت على ${pointsAr(r.pointsAwarded)}.`, "درس مكتمل"); | toast.success(`حصلت على ${pointsAr(r.pointsAwarded)}.`, "درس مكتمل"); |
| `app/training/[slug]/lesson/[lessonId].tsx` | toast.success("احتُسب الدرس.", "درس مكتمل"); | toast.success("احتُسب الدرس."); |
| `app/training/[slug]/lesson/[lessonId].tsx` | يمكنك إعادة قراءة المحتوى متى شئت — لا تُحتسب النقاط مرة أخرى. | أعد القراءة متى شئت — لا نقاط مرة أخرى. |
| `app/training/[slug]/lesson/[lessonId].tsx` | تُرسل إجابتك مع إكمال الدرس — الإجابة الصحيحة تحتسب الدرس مكتملًا. | الإجابة الصحيحة تكمل الدرس — وتُرسل إجابتك. |
| `app/student/courses/[offeringId].tsx` | ])} · ${countAr(checkpoints, ["نقطة تفاعل واحدة", "نقطتا تفاعل", "نقاط تفاعل", " | ])} · ${countAr(checkpoints, ["نقطة تفاعل", "نقطتا تفاعل", "نقاط تفاعل", "نقطة ت |
| `app/student/courses/[offeringId].tsx` | {teacher ? `د. ${teacher.firstName} ${teacher.lastName}` : "بلا أستاذ مسجَّل"} | {teacher ? `د. ${teacher.firstName} ${teacher.lastName}` : "بلا أستاذ"} |
| `app/student/courses/[offeringId].tsx` | ? ` · ${countAr(course.credits, ["ساعة معتمدة واحدة", "ساعتان معتمدتان", "ساعات  | ? ` · ${countAr(course.credits, ["ساعة معتمدة", "ساعتان معتمدتان", "ساعات معتمدة |
| `app/student/courses/[offeringId].tsx` | emptyMessage="لا محاضرات — يضيفها الأستاذ تباعًا." | emptyMessage="لا محاضرات — يضيفها الأستاذ." |
| `app/student/courses/[offeringId].tsx` | message="لا محاضرات — يضيفها الأستاذ تباعًا." | message="يضيفها الأستاذ." |
| `app/admin/directory.tsx` | أرقام التواصل على ملفات المؤسّسة — يحكمها إعداد الظهور لدى كل صاحب ملف. | أرقام التواصل على الملفات — يحكمها إعداد الظهور. |
