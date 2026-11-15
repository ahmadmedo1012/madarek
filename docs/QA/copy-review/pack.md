# Copy review pack — the R355 diet, before/after (R356 Lane 2a)

Generated: git diff e83a3da6~1..HEAD over the 63 diet-touched page files;
every source line that lost or gained Arabic text. Lines are raw source
(JSX text + string literals) — the reviewer reads them as the editor.

Files with Arabic diffs: 63
Removed Arabic lines: 2011 · Added Arabic lines: 1499

## frontend/src/pages/AppDownloadPage.tsx (32 − / 27 +)

| before (removed) | after (added) |
|---|---|
| 'تنزيل تطبيق مدارك لأندرويد من GitHub — حالة iOS وقنوات التحديث والحد الأدنى للإصدار.', | description: 'تنزيل أندرويد، حالة iOS، وقنوات التحديث.', |
| العودة إلى الصفحة الرئيسية | العودة للرئيسية |
| تنزيل أندرويد المباشر، حالة iOS، قنوات التحديث، والحد الأدنى للإصدار — | تنزيل لأندرويد |
| قراءة حيّة من الخادم. | اسمح بالتثبيت من مصادر غير معروفة أول مرة. |
| تنزيل تطبيق مدارك لأندرويد | تنزيل لأندرويد |
| تنزيل مباشر من GitHub Actions — الإصدار المتجدّد. اسمح بالتثبيت من مصادر | <p className="ap-p ap-p-note">جارٍ قراءة بيانات البناء…</p> |
| غير معروفة أول مرة. | تعذّر قراءة بيانات البناء. |
| تنزيل تطبيق مدارك لأندرويد | آخر بناء:{' '} |
| <p className="ap-p ap-p-note">جارٍ قراءة بيانات آخر بناء منشور…</p> | {' '}· التحقق:{' '} |
| تعذّر قراءة بيانات البناء — زرّ التنزيل أعلاه يبقى المصدر المباشر. | <span className="ap-bar-title">رمز QR</span> |
| آخر بناء منشور وموثّق:{' '} | امسح الرمز بكاميرا هاتفك. |
| {' '}· التحقق المستقل:{' '} | <span className="ap-bar-title">قنوات التحديث</span> |
| <span className="ap-bar-title">رمز QR — افتح هذه الصفحة من جوالك</span> | الشاشات تتحدّث فوريًا (OTA)، والأذونات ومكتبات النظام تصلك كتثبيت جديد. |
| امسح الرمز بكاميرا الهاتف — تفتح هذه الصفحة على الجوال. | ثلاث قنوات: <span className="ap-mono" dir="ltr">production</span> و |
| <span className="ap-bar-title">كيف تصل التحديثات؟ (القنوات)</span> | <span className="ap-mono" dir="ltr">preview</span> و |
| الشاشات تتحدّث فوريًا (OTA)، والتغيّرات الأصلية (الأذونات، مكتبات النظام) | <span className="ap-mono" dir="ltr">development</span> — جهازك يسحب من قناته فقط. |
| تصلك كتثبيت جديد من هذه الصفحة. | <span className="ap-bar-title">الحد الأدنى للإصدار</span> |
| ثلاث قنوات مفتوحة اليوم: <span className="ap-mono" dir="ltr">production</span> للنسخة | تعذّر قراءة الحالة — حدّث الصفحة. |
| العامة، <span className="ap-mono" dir="ltr">preview</span> للمعاينة، | الحد الأدنى الآن{' '} |
| و<span className="ap-mono" dir="ltr">development</span> للتطوير — جهازك | يُعاد إلى هنا حتى يُحدّث. |
| يسحب من قناته فقط. | لا حدّ أدنى مفروض حاليًا — أي نسخة تعمل. |
| <span className="ap-bar-title">الحد الأدنى للإصدار — قراءة حيّة</span> | إصدار الخادم: <span className="ap-mono" dir="ltr">{status?.buildId ?? '—'}</span> |
| تعذّر قراءة الحالة — حدّث الصفحة بعد لحظات. | {' '}· رابط التحديث: {' '} |
| الخادم يفرض الآن حدًا أدنى{' '} | أندرويد 7.0+ وiOS 15+، والواجهة عربية بالوضعين الفاتح والداكن. |
| يُعاد إلى هذه الصفحة حتى يُحدّث. | للبلاغ عن مشكلة: |
| لا حدّ أدنى مفروض حاليًا — أي نسخة تعمل. تظهر القيمة هنا فورًا عند فرضه. | <p className="ap-colophon-line">منصّة مستقلّة · عربية أولًا · المصدر: GitHub Actions</p> |
| إصدار الخادم الحالي: <span className="ap-mono" dir="ltr">{status?.buildId ?? '—'}</span> | آخر بناء:{' '} |
| {' '}· رابط التحديث الرسمي: {' '} |  |
| أندرويد 7.0 أو أحدث، وiOS 15 أو أحدث للتطبيق الأصلي. الواجهة عربية بالكامل |  |
| بالوضعين الفاتح والداكن. للبلاغ عن مشكلة في التطبيق: |  |
| <p className="ap-colophon-line">منصّة مستقلّة · عربية أولًا · المصدر الرسمي للتطبيق: GitHub Actions</p> |  |
| آخر بناء منشور:{' '} |  |

## frontend/src/pages/AuthPage.tsx (8 − / 6 +)

| before (removed) | after (added) |
|---|---|
| <span className="auth-meta">(اختيار المؤسسة)</span> | جارٍ التحقق… |
| حسابك عضو في أكثر من مؤسسة — اختر مؤسسة هذه الجلسة. | ? 'سجّل الدخول للمتابعة إلى صفحتك.' |
| جارٍ التحقق من العضوية… | : 'سجِّل دخولك للوصول إلى مقرَّراتك.'} |
| ? 'سجّل الدخول للمتابعة إلى الصفحة التي طلبها.' | <span>تعذّر تحميل المؤسسات.</span> |
| : 'سجِّل دخولك للوصول إلى مقرَّراتك ومواردك الأكاديمية.'} | {countAr(issueCount, ['مشكلة', 'مشكلتان', 'مشاكل', 'مشكلة'])} في النموذج — راجع الحقول المعلّمة ثم أعد المحاولة. |
| <span>تعذّر تحميل المؤسسات — تحقّق من اتصالك بالشبكة.</span> | «تعبئة» ثم «دخول». |
| {countAr(issueCount, ['مشكلة واحدة', 'مشكلتان', 'مشاكل', 'مشكلة'])} في النموذج — راجع الحقول المعلّمة ثم أعد المحاولة. |  |
| حساب واحد لكل دور — «تعبئة» ثم «دخول». |  |

## frontend/src/pages/DocumentViewerPage.tsx (8 − / 5 +)

| before (removed) | after (added) |
|---|---|
| if (path.startsWith('/student/library')) return 'المكتبة'; | const LIBRARY_LABEL = 'المكتبة'; |
| if (path.startsWith('/teacher/library')) return 'المكتبة'; | const DOC_FALLBACK_TITLE = 'مستند'; |
| <h1 className="doc-reader-title">{title ?? 'مستند'}</h1> | ? 'الرابط لا يحمل اسم ملف.' |
| ? 'الرابط لا يحمل اسم ملف — افتح المستند من بحوثك أو المقرر.' | : 'اسم الملف لا يصلح لعرض PDF.'} |
| : 'اسم الملف لا يصلح لعرض PDF — افتح المستند من بحوثك أو المقرر.'} | {countAr(numPages, ['صفحة', 'صفحتان', 'صفحات', 'صفحة'])} |
| <h1 className="doc-reader-title">{title ?? 'مستند'}</h1> |  |
| {countAr(numPages, ['صفحة واحدة', 'صفحتان', 'صفحات', 'صفحة'])} |  |
| title="ملاحظات البحث" |  |

## frontend/src/pages/PublicPages.tsx (49 − / 43 +)

| before (removed) | after (added) |
|---|---|
| description: 'منصّة تعليمية تقنية مستقلّة، عربية أولًا — بيان الاستقلال، بلا إضافات.', | description: 'منصّة تعليمية تقنية مستقلّة، عربية أولًا.', |
| العودة إلى الصفحة الرئيسية | العودة إلى الرئيسية |
| كل ما يمكن قوله بصدق اليوم موجود في فقرة واحدة — نضعها هنا كما هي في صفحة البداية، حرفيًا. | <span className="ab-bar-title">ما يعمل اليوم</span> |
| <span className="ab-bar-title">ما الذي يعمل اليوم</span> | المحاضرات التفاعلية، الاختبارات، مصفوفة الإتقان، مكتبة البحوث، الرسائل |
| المحاضرات التفاعلية، الاختبارات ذاتية التصحيح للموضوعي، مصفوفة الإتقان، مكتبة البحوث برفع | والإشعارات، والجدول الأسبوعي — التفصيل في |
| <bdi className="ab-code ab-mono" dir="ltr">PDF</bdi> والمراجعة، الرسائل والإشعارات، والجدول الأسبوعي — والسجلّ الكامل الصادق | <Link to="/capabilities" className="ab-link">صفحة السجلّ</Link>. |
| (ما يعمل حقيقة وما هو محاكاة) في <Link to="/capabilities" className="ab-link">صفحة السجلّ</Link>. | لم يُعلن المالك عن نفسه بعد — |
| لا نضيف هنا شيئًا لم يقله المالك بعد — ما يمكن نشره عن من يبني مدارك (خلفية، فريق، تمويل) | الفصل بين بيانات العرض وبياناتك الحقيقية في |
| الفصل الكامل بين بيانات العرض الاصطناعية وبياناتك الحقيقية في | والسياسات في <Link to="/legal/privacy" className="ab-link">سياسة الخصوصية</Link> و |
| وسياسات المنصّة في <Link to="/legal/privacy" className="ab-link">سياسة الخصوصية</Link> و | بريد ينتهي بـ <bdi className="hp-code hp-mono" dir="ltr">@test.ly</bdi> وكلمة المرور <bdi className="hp-code hp-mono" dir="ltr">12345678</bdi> — |
| بحسابات الاختبار الموزّعة على المختبرين: بريد ينتهي بـ <bdi className="hp-code hp-mono" dir="ltr">@test.ly</bdi> وكلمة المرور <bdi className="hp-code hp-mono" dir="ltr">12345678</bdi> — | حساب لكل دور، في لوحة «حسابات تجريبية» على صفحة الدخول (زر «تعبئة» ثم «دخول»). |
| حساب واحد لكل دور، معروضة في لوحة «حسابات تجريبية» على صفحة الدخول في بيئة التطوير | تُوزّع حسابات التجربة على المختبرين مع كل مرحلة — استخدم الحساب الذي وصلك، |
| (زر «تعبئة» ثم «دخول»). | وإن لم يصل فانتظر فتح التسجيل من |
| حسابات التجربة تُوزّع على فريق المختبرين عند فتح كل مرحلة — إن كنت من المختبرين فاستخدم | خمسة أدوار: <strong>طالب</strong> و<strong>أستاذ</strong> (ومعه رئيس قسم وعميد) |
| الحساب الذي وصلك من فريق مدارك، وإن لم يصل بعدُ فانتظر فتح التسجيل من | المنصّة</strong> — الصلاحيات مفروضة في الخادم. |
| خمسة أدوار: <strong>طالب</strong> و<strong>أستاذ</strong> (ومعه الأدوار القيادية: رئيس قسم وعميد) | لا يوجد بريد يُرسَل من المنصّة بعد. حسابات <bdi className="hp-code hp-mono" dir="ltr">@test.ly</bdi> كلمة مرورها معروفة |
| المنصّة</strong> — لكل دور لوحته وصلاحياته المفروضة في الخادم. | (<bdi className="hp-code hp-mono" dir="ltr">12345678</bdi>) فتُملأ من صفحة الدخول؛ حسابك الخاص؟ فالطريق |
| الحقيقة كاملة: لا يوجد بريد يُرسَل من المنصّة بعد. حسابات <bdi className="hp-code hp-mono" dir="ltr">@test.ly</bdi> كلمة مرورها | <Link to="/contact" className="hp-link">قناة التواصل</Link>. |
| معروفة (<bdi className="hp-code hp-mono" dir="ltr">12345678</bdi>) فتُملأ من صفحة الدخول مباشرة؛ وإن كان حسابك الخاص فقدنا كلمة | لا يوجد بريد يُرسَل من المنصّة بعد. حساب تجريبي؟ ادخل ببياناته من |
| مروره فالطريق اليوم <Link to="/contact" className="hp-link">قناة التواصل</Link> — لا نعدك بغير ما | {' '}<Link to="/auth" className="hp-link">صفحة الدخول</Link>؛ حسابك الخاص؟ فالطريق |
| يعمل. | <Link to="/contact" className="hp-link">قناة التواصل</Link>. |
| الحقيقة كاملة: لا يوجد بريد يُرسَل من المنصّة بعد. حساب تجريبي؟ استخدم بيانات الحساب الذي وصلك | المتصفحات الحديثة (<bdi>Chrome</bdi> و<bdi>Edge</bdi> و<bdi>Firefox</bdi> |
| من فريق التجربة وادخل بها مباشرة من | عُطّلت فستقابلك رسالة تطلب التفعيل وإعادة التحميل. |
| {' '}<Link to="/auth" className="hp-link">صفحة الدخول</Link>؛ وإن كان حسابك الخاص فقدنا كلمة | q: 'هل يمكن تخفيف الحركة؟', |
| مروره فالطريق اليوم <Link to="/contact" className="hp-link">قناة التواصل</Link> — لا نعدك بغير ما | نعم — فعّل «تقليل الحركة» في نظامك. |
| يعمل. | q: 'كيف أبدّل المظهر؟', |
| المتصفحات الحديثة بإصداراتها الأخيرة (<bdi>Chrome</bdi> و<bdi>Edge</bdi> و<bdi>Firefox</bdi> | بمفتاح المظهر في الشريط الجانبي — ويُحفظ اختيارك على جهازك. |
| كانت معطلة فستقابلك رسالة عربية واحدة تطلب تفعيلها وإعادة التحميل. | كوكي واحد وتسعة مفاتيح تخزين — الجدول الكامل وما يُحذف عند الرفض في |
| q: 'هل يمكن تخفيف الحركة في الواجهة؟', | q: 'ما يعمل فعلًا وما هو محاكاة؟', |
| نعم: فعّل «تقليل الحركة» في نظامك — وستنهار الحركات إلى ظهور هادئ. | سجلّ القدرات يفصل: <Link to="/capabilities" className="hp-link">«ما يعمل اليوم»</Link> — وما هو |
| q: 'كيف أبدّل المظهر الفاتح والداكن؟', | محاكاة أو قيد التطوير موسوم كذلك. |
| بمفتاح المظهر في الشريط الجانبي — واختيارك يُحفظ على جهازك ويُستعاد في الزيارة التالية. | نعم — صفحات <bdi className="hp-code hp-mono" dir="ltr">/legal/*</bdi> تُطبع كوثيقة بعمود واحد: النص |
| كوكي واحد وتسعة مفاتيح تخزين محلي، لكل واحد غرض معلن — الجدول الكامل مع ما يُحذف عند الرفض في | والإطارات الحاكمة وتاريخ آخر تحديث. |
| q: 'ما الذي يعمل فعلًا وما الذي محاكاة؟', | description: 'إجابات قصيرة — كل جواب يشير إلى سطح حقيقي في المنصّة.', |
| سجلّ القدرات يفصل بصدق: <Link to="/capabilities" className="hp-link">«ما يعمل اليوم»</Link> — كل | العودة إلى الرئيسية |
| سطر فيه حقيقة نظام يمكن التحقق منها، وما هو محاكاة أو قيد التطوير موسوم كذلك. | تسعة أسئلة — وكل جواب مما يعمل اليوم. |
| نعم — صفحات <bdi className="hp-code hp-mono" dir="ltr">/legal/*</bdi> مصمّمة للطباعة كوثيقة نظيفة بعمود واحد: أرسل أمر الطباعة | description: 'قناة التواصل — التسجيل المبكر، بلا بريد مخترع.', |
| من متصفحك مباشرة وستحصل على النص والإطارات الحاكمة وتاريخ آخر تحديث دون أي زخرفة شاشة. | lede="لا نخترع قنوات — هذه المتاحة اليوم." |
| description: 'إجابات قصيرة وصادقة عن مدارك — كل جواب يشير إلى سطح حقيقي في المنصّة، لا إلى وعود.', | لا بريد عام بعد — قدّم طلبك من |
| العودة إلى الصفحة الرئيسية | وما يصل عبره يقرؤه المشغّل. |
| تسعة أسئلة هي ما يسأله الزوار فعلًا — وكل جواب يستند إلى ما يعمل اليوم في المنصّة، بلا تجميل. | أي قناة تُعلن هنا — ولن نطلب بياناتك عبر طريق غيره. |
| description: 'قناة التواصل المتاحة مع منصّة مدارك — التسجيل المبكر، بلا بريد ولا هواتف مخترعة.', | لا نعد بمدة لم تُقرّ — نافذة الرد الملتزمة <PendingTag />. |
| lede="لا نخترع قنوات تواصل — هذه هي القناة المتاحة فعلًا اليوم، مكتوبة كما هي." | بلاغات الثغرات عبر القناة نفسها — وسياسة الإفصاح المسؤول في |
| التسجيل المبكر من صفحة البداية هو قناة التواصل المتاحة حاليًا — لا بريد عام في مرحلة الإطلاق |  |
| التجريبي. يمكنك تقديم طلبك من |  |
| وما يصل عبره هو ما يقرؤه المشغّل. |  |
| لا قنوات تواصل اليوم — أي قناة تُعلن هنا، ولن نطلب بياناتك عبر أي طريق غير هذا المكان. |  |
| لا نعد بمدة استجابة لم تُقرّ بعد — نافذة الرد الملتزمة <PendingTag />. |  |
| بلاغات الثغرات الأمنية تصل عبر القناة نفسها — وسياسة الإفصاح المسؤول في |  |

## frontend/src/pages/RegisterPage.tsx (24 − / 21 +)

| before (removed) | after (added) |
|---|---|
| .max(16, 'الكود أطول من اللازم — 16 حرفًا كحدّ أقصى') | .max(16, '16 حرفًا كحدّ أقصى') |
| .refine((v) => v === '' \|\| v.length >= 4, 'الكود قصير جدًا — 4 أحرف على الأقل'), | .refine((v) => v === '' \|\| v.length >= 4, '4 أحرف على الأقل'), |
| 'تعذَّر إنشاء الحساب — راجع البيانات وتأكَّد من اتصالك ثم أعد المحاولة.'; | 'تعذَّر إنشاء الحساب — راجع البيانات وأعد المحاولة.'; |
| 'لا أقسام في هذه الكلّيّة بعد — اختر كلّيّة أخرى أو تواصل مع المسجل العام.'; | 'لا أقسام في هذه الكلّيّة — اختر كلّيّة أخرى.'; |
| 'لا توجد مؤسسات تعليمية متاحة للتسجيل بعد — تواصل مع إدارة المنصّة.'; | 'لا مؤسسات متاحة للتسجيل — تواصل مع إدارة المنصّة.'; |
| <span className="auth-context">إنشاء حساب جديد</span> | <span className="auth-context">إنشاء حساب</span> |
| <p className="auth-form-sub">جميع الحقول مطلوبة لإتمام إنشاء الحساب.</p> | <span>تعيين القيادة والمسجلين بدعوة من مالك المنصة</span> |
| اختر نوع الحساب لإنشاء وصولك إلى منصّة مدارك. | <strong>منصّة تعليم ذكية مستقلّة</strong> |
| <span className="role-card-sub">مقيَّد في كلّية جامعية</span> | setState({ kind: 'busy', text: 'جارٍ التحقق…' }); |
| <span>تعيين القيادة والمسجلين يتم عبر دعوة من مالك المنصة</span> | text: res.scopeLabel ? `الكود صحيح — ستُضاف إلى ${res.scopeLabel}.` : 'الكود صحيح.', |
| <strong>منصّة تعليم ذكية مستقلّة</strong> · عربية أولًا | setState({ kind: 'bad', text: authErrorView(e).serverMessage ?? 'تعذّر التحقق — الحسم عند إنشاء الحساب.' }); |
| setState({ kind: 'busy', text: 'جارٍ التحقق من الكود…' }); | <Field index="[04]" label="كلمة المرور" error={form.formState.errors.password?.message}> |
| text: res.scopeLabel ? `الكود صحيح — ستُضاف تلقائيًا إلى ${res.scopeLabel}.` : 'الكود صحيح.', | <span>تعذّر تحميل الكلّيّات.</span> |
| setState({ kind: 'bad', text: authErrorView(e).serverMessage ?? 'تعذّر التحقق من الكود — الحسم عند إنشاء الحساب.' }); | {countAr(issueCount, ['مشكلة واحدة', 'مشكلتان', 'مشاكل', 'مشكلة'])} في النموذج — راجع الحقول المعلّمة. |
| <Field index="[04]" label="كلمة المرور (12 حرفًا على الأقل)" error={form.formState.errors.password?.message}> | <Field index="[04]" label="كلمة المرور" error={form.formState.errors.password?.message}> |
| <span>تعذّر تحميل الكلّيّات — تحقّق من اتصالك بالشبكة.</span> | <span>تعذّر تحميل الكلّيّات.</span> |
| {countAr(issueCount, ['مشكلة واحدة', 'مشكلتان', 'مشاكل', 'مشكلة'])} في النموذج — راجع الحقول المعلّمة ثم أعد المحاولة. | <Field index="[08]" label="التخصص" error={form.formState.errors.specialty?.message}> |
| <Field index="[04]" label="كلمة المرور (12 حرفًا على الأقل)" error={form.formState.errors.password?.message}> | المنصب القياديّ يُحدَّد بقرار إداريّ. |
| <span>تعذّر تحميل الكلّيّات — تحقّق من اتصالك بالشبكة.</span> | {countAr(issueCount, ['مشكلة واحدة', 'مشكلتان', 'مشاكل', 'مشكلة'])} في النموذج — راجع الحقول المعلّمة. |
| <Field index="[08]" label="التخصص العلمي" error={form.formState.errors.specialty?.message}> | <Field index={index} label="المؤسسة" error={error}> |
| المنصب القياديّ يُحدَّد بقرار إداريّ بعد التحقّق من الملف. | <span>تعذّر تحميل المؤسسات.</span> |
| {countAr(issueCount, ['مشكلة واحدة', 'مشكلتان', 'مشاكل', 'مشكلة'])} في النموذج — راجع الحقول المعلّمة ثم أعد المحاولة. |  |
| <Field index={index} label="المؤسسة التعليمية" error={error}> |  |
| <span>تعذّر تحميل المؤسسات — تحقّق من اتصالك بالشبكة.</span> |  |

## frontend/src/pages/SettingsPage.tsx (16 − / 7 +)

| before (removed) | after (added) |
|---|---|
| description="مظهرك وكلمة مرورك ومقاعد حسابك — في ورقة واحدة لكل الأدوار." | عند التغيير تُنهى جلسات بقية الأجهزة، وتبقى جلستك مفتوحة. |
| اختيارك يُطبَّق فورًا ويُحفظ في ملفك — تجده على أجهزتك الأخرى. | note="التنبيهات عبر الجرس." |
| متاح لكل الأدوار — عند التغيير تُنهى جلسات بقية الأجهزة، وتبقى جلستك مفتوحة. | note="لغات بديلة لاحقًا." |
| <p className="set-note">كما تقرؤها الخدمة الآن — لا حاجة لتخمين ما هو محفوظ.</p> | note="أنهِ بقية الجلسات عبر تغيير كلمة المرور أعلاه." |
| <p className="set-note">تفضيلات الإشعارات (البريد داخل المنصة وغيرها) غير متاحة بعد.</p> | لنسخ بياناتك أو حذف حسابك استخدم <Link to="/contact">صفحة التواصل</Link> — |
| التنبيهات عبر الجرس؛ تفضيلات لكل نوع تحتاج أعمدةً لم تُبنَ — | تُنفَّذ الطلبات يدويًا. ما نجمعه موثّق في{' '} |
| تُفتح أول ما تصل. | action={<Link to="/contact" className="btn lg"><Icon icon={Bell} size={16} />تواصل معنا</Link>} |
| <p className="set-note">مدارك عربية-أولًا بلغة واحدة اليوم؛ مقعد اللغة محجوز.</p> |  |
| note="واجهة عربية RTL واحدة؛ لغات بديلة قرار إطلاق لاحق." |  |
| <p className="set-note">قائمة الأجهزة النشطة غير متاحة بعد — وسيلة إنهائها الفعّالة متاحة الآن.</p> |  |
| لا واجهة للجلسات بعد — تغيير كلمة المرور (القسم [02]) يُنهي جلسات |  |
| بقية الأجهزة ويُبقي جلستك الحالية. |  |
| <p className="set-note">لا يوجد تصدير ذاتي أو حذف ذاتي بعد — الطلب يصل عبر قناة التواصل.</p> |  |
| لطلب نسخة من بياناتك أو حذف حسابك، استخدم <Link to="/contact">صفحة التواصل</Link> — |  |
| الطلبات تُنفيذ يدويًا من فريق المنصة في هذه المرحلة التجريبية. ما نجمعه ولماذا موثّق في{' '} |  |
| action={<Link to="/contact" className="btn lg"><Icon icon={Bell} size={16} />فتح قناة التواصل</Link>} |  |

## frontend/src/pages/admin/AdminExtraPages.tsx (47 − / 42 +)

| before (removed) | after (added) |
|---|---|
| description="الطلاب المسجَّلون في الجامعة، مع البحث والتصفية حسب الكلّيّة." | * footer counted the same "طالب" forms twice — one home. */ |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'الطلاب' }]} | const STUDENT_COUNT: [string, string, string, string] = ['طالب واحد', 'طالبان', 'طلاب', 'طالباً']; |
| ? `${countAr(studentsQ.data.meta.total, ['طالب واحد مسجَّل', 'طالبان مسجَّلان', 'طلاب مسجَّلون', 'طالباً مسجَّلاً'])} · بحث الخادم` | const REGISTRAR_DASHBOARD = 'لوحة المسجل العام'; |
| : 'قراءة سجلّ الطلاب…'} | const LOADING = 'جارٍ التحميل…'; |
| استيراد طلاب من ملف | const FAILED_LOAD = 'تعذّر التحميل'; |
| placeholder: 'ابحث بالاسم أو البريد أو رقم القيد…', | const DROP_ENROLLMENT = 'إلغاء التسجيل'; |
| <option value="">{facQ.isPending ? 'جارٍ تحميل الكلّيّات…' : 'كلّ الكلّيّات'}</option> | breadcrumbs={[{ label: REGISTRAR_DASHBOARD, to: '/admin/dashboard' }, { label: 'الطلاب' }]} |
| إعادة تحميل الكلّيّات | استيراد الطلاب |
| {studentsQ.isError && <ErrorState error={studentsQ.error} message="تعذّر تحميل قائمة الطلاب" onRetry={() => studentsQ.refetch()} />} | placeholder: 'اسم / بريد / رقم قيد…', |
| <EmptyState illustration="empty-search" title="لا توجد نتائج" description="جرّب تعديل البحث أو الفلتر لعرض نتائج أوسع." action={hasActiveFilters ? ( | <option value="">{facQ.isPending ? LOADING : 'كلّ الكلّيّات'}</option> |
| unit={['طالب واحد', 'طالبان', 'طلاب', 'طالباً']} | إعادة المحاولة |
| toast.success('تمّ التسجيل في المقرّر'); | <EmptyState illustration="empty-search" title="لا نتائج" action={hasActiveFilters ? ( |
| setError(apiErrorMessage(e, 'تعذَّر التسجيل — حاول مرة أخرى.')); | toast.success('تمّ التسجيل'); |
| إلغاء التسجيل يحذف تسجيل الطالب وتقدُّمه نهائيًا — كل إلغاء يمرّ على تأكيد صريح. | setError(apiErrorMessage(e, 'تعذَّر التسجيل.')); |
| <div className="text-sm text-muted">لا تسجيلات حاليًا.</div> | <div className="text-sm text-muted">لا تسجيلات.</div> |
| {drop.isPending && drop.variables?.enrollmentId === e.id ? 'جارٍ الإلغاء…' : 'إلغاء التسجيل'} | {drop.isPending && drop.variables?.enrollmentId === e.id ? 'جارٍ الإلغاء…' : DROP_ENROLLMENT} |
| <div className="text-sm font-semibold">تسجيل في مقرّر جديد</div> | <div className="text-sm font-semibold">تسجيل بمقرّر</div> |
| <div className="text-sm text-muted">لا توجد مقرّرات متاحة للتسجيل.</div> | <div className="text-sm text-muted">لا مقرّرات.</div> |
| title="إلغاء التسجيل" | ? `سيُحذف تسجيل الطالب في «${confirmingDrop.courseName}» وتقدُّمه نهائيًا.` |
| ? `سيُحذف تسجيل الطالب في «${confirmingDrop.courseName}» وتقدُّمه نهائيًا — لا تراجع.` | toast.success('تمّ الإلغاء'); |
| toast.success('تمّ إلغاء التسجيل'); | setError(apiErrorMessage(e, 'تعذَّر الإلغاء.')); |
| setError(apiErrorMessage(e, 'تعذَّر إلغاء التسجيل — حاول مرة أخرى.')); | breadcrumbs={[{ label: REGISTRAR_DASHBOARD, to: '/admin/dashboard' }, { label: 'التحوّل الرقميّ' }]} |
| description="مؤشّرات تبنّي المنصّة عبر مكوّنات الجامعة." | { label: 'إجمالي الحسابات', value: formatNum(q.data.totalUsers), trend: 'كل الأدوار' }, |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'التحوّل الرقميّ' }]} | { label: 'حسابات نشطة', value: formatNum(q.data.activeUsers), trend: 'من الإجمالي' }, |
| {q.isError && <ErrorState error={q.error} message="تعذّر تحميل مؤشّرات التحوّل الرقميّ" onRetry={() => q.refetch()} />} | { label: 'نسبة التبنّي', value: `${formatNum(q.data.adoptionPct)}٪`, trend: 'حصة النشطة' }, |
| { label: 'إجمالي الحسابات', value: formatNum(q.data.totalUsers), trend: 'كل الأدوار في الجامعة' }, | { label: 'ملفات تعليمية', value: formatNum(q.data.materialsUploaded) }, |
| { label: 'حسابات نشطة', value: formatNum(q.data.activeUsers), trend: 'من إجمالي الحسابات' }, | <DigitalRow component="التعلّم النشط" label="جلسات معامل" value={q.data.labSessions} /> |
| { label: 'نسبة التبنّي', value: `${formatNum(q.data.adoptionPct)}٪`, trend: 'حصة الحسابات النشطة' }, | <DigitalRow component="التعلّم النشط" label="بثّ مباشر" value={q.data.liveSessions} /> |
| { label: 'ملفات تعليمية مرفوعة', value: formatNum(q.data.materialsUploaded) }, | <DigitalRow component="البحث العلميّ" label="أوراق علميّة" value={q.data.researchPapers} /> |
| subtitle="ما يجري فعلاً عبر المنصّة في كل مكوّن" | breadcrumbs={[{ label: REGISTRAR_DASHBOARD, to: '/admin/dashboard' }, { label: 'إعدادات المنصّة' }]} |
| <DigitalRow component="التعلّم النشط" label="جلسات معامل افتراضيّة" value={q.data.labSessions} /> | <div className="settings-label">اللغة</div> |
| <DigitalRow component="التعلّم النشط" label="جلسات بثّ مباشر" value={q.data.liveSessions} /> | <div className="settings-value">مدارك</div> |
| <DigitalRow component="البحث العلميّ" label="أوراق علميّة في النظام" value={q.data.researchPapers} /> | ? `زمن الاستجابة ${health.data!.dbLatencyMs} مث` |
| description="إعدادات تشغيليّة على مستوى الجامعة." | : 'تعذّر التحقق'} |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'إعدادات المنصّة' }]} | <div className="settings-value">الرمز 15 دقيقة · التحديث كل 7 أيام</div> |
| <div className="settings-label">اللغة الافتراضيّة</div> | <div className="settings-value">حدّ عامّ 1000 طلب/15 دقيقة · مصادقة 10 محاولات/15 دقيقة</div> |
| <div className="settings-value">مدارك — علامة المنصّة المستقلّة</div> | التنفيذ من لوحة المالك. |
| ? `متصلة · زمن الاستجابة ${health.data!.dbLatencyMs} مث` | تصدير السجلّ |
| : 'تعذّر التحقق من الاتصال'} | بثّ إعلان |
| <div className="settings-value">صلاحية الرمز 15 دقيقة · التحديث كل 7 أيام</div> | فحص الصحّة |
| <div className="settings-value">حدّ عامّ 1000 طلب كل 15 دقيقة · مصادقة 10 محاولات لكل 15 دقيقة</div> | <li><Link to="/admin/sync">مزامنة الكلّيّات</Link></li> |
| عمليّات تنفيذيّة — للتنفيذ الفعليّ استخدم لوحة المالك. | <li><Link to="/admin/teachers">صلاحيات هيئة التدريس</Link></li> |
| تصدير سجلّ النشاط |  |
| بثّ إعلان عامّ |  |
| فحص الصحّة العامّة |  |
| <li><Link to="/admin/sync">مزامنة الكلّيّات والأقسام</Link></li> |  |
| <li><Link to="/admin/teachers">صلاحيات أعضاء هيئة التدريس</Link></li> |  |

## frontend/src/pages/admin/AdminGovernancePages.tsx (62 − / 59 +)

| before (removed) | after (added) |
|---|---|
| RESEARCH_PUBLISH: 'نشر البحوث للمكتبة', | RESEARCH_PUBLISH: 'نشر البحوث', |
| CURRICULUM_EDIT_OWN: 'تعديل منهج مقرّراتي', | CURRICULUM_EDIT_OWN: 'تعديل منهجي', |
| CURRICULUM_EDIT_ANY: 'تعديل أي منهج', | CURRICULUM_EDIT_ANY: 'تعديل المناهج', |
| QUALITY_VIEW: 'عرض لوحة الجودة', | QUALITY_VIEW: 'لوحة الجودة', |
| QUALITY_REPORT: 'إصدار تقارير الجودة', | QUALITY_REPORT: 'تقارير الجودة', |
| ANNOUNCE_PLATFORM: 'إعلانات على مستوى المنصة', | ANNOUNCE_PLATFORM: 'إعلانات المنصة', |
| title={isSearching ? 'لا نتائج مطابقة' : 'لم يتم تسجيل أساتذة بعد'} | title={isSearching ? 'لا نتائج' : 'لا أساتذة'} |
| ? 'لم نجد أساتذة تطابق البحث الحالي.' | ? 'لم نجد مطابقات.' |
| : 'ستظهر القائمة فور تسجيل أول أستاذ في النظام.'} | : 'ستظهر مع أول أستاذ.'} |
| description="توثيق الملفات الأكاديمية واقتراح المقرّرات الأنسب لكل أستاذ." | breadcrumbs={[{ label: 'المسجل العام', to: '/admin/dashboard' }, { label: 'الأساتذة' }]} |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'الأساتذة' }]} | label: 'الأساتذة', |
| label: 'عدد الأساتذة', | hint: count.isPending ? 'قراءة العدّاد…' : count.data ? 'في هذه المؤسّسة' : 'تعذّر القراءة', |
| hint: count.isPending ? 'قراءة عدّاد الخادم…' : count.data ? 'في هذه المؤسّسة' : 'تعذّر قراءة العدّاد', | placeholder: 'ابحث بالاسم أو البريد…', |
| placeholder: 'ابحث بالاسم أو البريد الإلكتروني…', | message="تعذّر تحميل الأساتذة" |
| message="تعذّر تحميل قائمة الأساتذة" | unit={['أستاذ', 'أستاذان', 'أساتذة', 'أستاذاً']} |
| unit={['أستاذ واحد', 'أستاذان', 'أساتذة', 'أستاذاً']} | message="تعذّر التحميل" |
| message="تعذّر تحميل الملف الأكاديمي" | title="بلا ملف" |
| title="لا يوجد ملف أستاذ" | description="لم يُستكمل بعد." |
| description="هذا الحساب لم يُستكمل ملفه الأكاديمي بعد." | title="تعذّر التوثيق" |
| title="تعذّر توثيق الأستاذ" | description={apiErrorMessage(verify.error, 'لم يستجب الخادم.')} |
| description={apiErrorMessage(verify.error, 'لم يستجب الخادم للطلب. أعد المحاولة بعد لحظات.')} | <FactRow label="الدرجة" value={DEGREE_LABEL[data.teacher.degreeLevel] ?? data.teacher.degreeLevel} /> |
| <FactRow label="الدرجة العلمية" value={DEGREE_LABEL[data.teacher.degreeLevel] ?? data.teacher.degreeLevel} /> | <FactRow label="الرتبة" value={RANK_LABEL[data.teacher.rank] ?? data.teacher.rank} /> |
| <FactRow label="الرتبة الأكاديمية" value={RANK_LABEL[data.teacher.rank] ?? data.teacher.rank} /> | <FactRow label="الخبرة" value={`${data.teacher.yearsExperience} سنة`} /> |
| <FactRow label="سنوات الخبرة" value={`${data.teacher.yearsExperience} سنة`} /> | <Card title="الشهادات" icon={Award}> |
| <Card title="الشهادات والاعتمادات" icon={Award}> | <Card title="المقرّرات المقترحة" icon={Briefcase} subtitle={data.suggestedCourses.length > 0 ? `${countAr(data.suggestedCourses.length, ['مقرّر', 'مقرّران', 'مقرّرات', 'مقرّراً'])} حسب تخصصه` : undefined}> |
| <Card title="المقرّرات المقترحة لتدريسها" icon={Briefcase} subtitle={data.suggestedCourses.length > 0 ? `${countAr(data.suggestedCourses.length, ['مقرّر مرتّب', 'مقرّران مرتّبان', 'مقرّرات مرتّبة', 'مقرّراً مرتّباً'])} حسب القرب من تخصصه` : undefined}> | <Badge color="brand">{c.matchScore} تطابق</Badge> |
| <Badge color="brand">{c.matchScore} درجة تطابق</Badge> | title="لا مطابقات" |
| title="لا توجد مقرّرات مطابقة بعد" | description="أضف كلمات مفتاحية." |
| description="أضف كلمات مفتاحية لملف الأستاذ لتوليد اقتراحات أدق." | message={`سيحمل «${data.teacher.name}» شارة التوثيق.`} |
| message={`سيحمل «${data.teacher.name}» شارة التوثيق ويظهر كمدرّس مؤهّل في الاقتراحات — ويُسجَّل في سجلّ النشاط.`} | <Card title="المنصب القياديّ" icon={Crown}> |
| <Card title="المنصب القياديّ" icon={Crown} subtitle="يُمنح بالتعيين الإداريّ — فوق دور الأستاذ ولا يستبدله"> | <option value="NONE">بلا منصب</option> |
| <option value="NONE">— بلا منصب —</option> | إنهاء المنصب |
| إنهاء المنصب الحاليّ | title="تعذّر الحفظ" |
| title="تعذّر حفظ التعيين" | description={apiErrorMessage(assign.error, 'لم يستجب الخادم.')} |
| description={apiErrorMessage(assign.error, 'لم يستجب الخادم للطلب. أعد المحاولة بعد لحظات.')} | <strong className="text-sm">نطاق {roleLabel}</strong> |
| <strong className="text-sm">نطاق صلاحيّة {roleLabel}</strong> | <option value="UNIVERSITY">الجامعة</option> |
| النطاق الافتراضيّ على مستوى الجامعة — يمكن قَصره على كلّيّة واحدة. | <option value="FACULTY">كلّيّة</option> |
| <option value="UNIVERSITY">على مستوى الجامعة</option> | الحاليّ: <strong>{scopeFacultyName}</strong> |
| <option value="FACULTY">كلّيّة محدَّدة</option> | {assign.isPending ? 'جارٍ الحفظ…' : 'حفظ'} |
| النطاق الحاليّ: <strong>{scopeFacultyName}</strong> | title="تعذّر الحفظ" |
| {assign.isPending ? 'جارٍ الحفظ…' : 'حفظ النطاق'} | description={apiErrorMessage(assign.error, 'لم يستجب الخادم.')} |
| title="تعذّر حفظ النطاق" | research: 'البحوث', |
| description={apiErrorMessage(assign.error, 'لم يستجب الخادم للطلب. أعد المحاولة بعد لحظات.')} | exams: 'الاختبارات', |
| research: 'البحوث العلمية', | governance: 'الحاكمية', |
| exams: 'الاختبارات الإلكترونية', | <Icon icon={ChevronRight} size={14} /> العودة للأساتذة |
| governance: 'المستخدمون والحاكمية', | message="تعذّر التحميل" |
| <Icon icon={ChevronRight} size={14} /> العودة إلى الأساتذة | ? `أُعيدت صلاحية «${CAP_LABEL[capability]}» للافتراضيّ` |
| message="تعذّر تحميل صلاحيات المستخدم" | ? `أُعيدت صلاحية «${CAP_LABEL[capability]}» للافتراضيّ` |
| ? `أُعيدت صلاحية «${CAP_LABEL[capability]}» إلى قيمة الدور الافتراضية` | <Icon icon={ChevronRight} size={14} /> العودة للأساتذة |
| ? `أُعيدت صلاحية «${CAP_LABEL[capability]}» إلى قيمة الدور الافتراضية` | { label: 'فعلية', value: formatNum(data.effective.length), trend: 'مفعّلة الآن' }, |
| <Icon icon={ChevronRight} size={14} /> العودة إلى الأساتذة | { label: 'استثناءات', value: formatNum(data.overrides.length), trend: data.overrides.length > 0 ? 'يدويّ' : 'لا استثناءات' }, |
| subtitle="الدور الافتراضي، والاستثناءات، والنطاق." | <Card title="الصلاحيات" icon={ShieldCheck}> |
| { label: 'صلاحيات فعلية', value: formatNum(data.effective.length), trend: 'مفعّلة الآن' }, | title="لا تُعدَّل من هنا" |
| { label: 'استثناءات يدوية', value: formatNum(data.overrides.length), trend: data.overrides.length > 0 ? 'منح أو سحب يدويّ' : 'لا استثناءات' }, | description="اطلب من غيرك تطبيقه (403)." |
| <Card title="محرّر الصلاحيات" icon={ShieldCheck}> | title="تعذّر التحديث" |
| title="هذه صلاحياتك أنت — لا يمكن تعديلها من هنا" | description={apiErrorMessage(setCap.error, 'لم يستجب الخادم.')} |
| description="حرس الحاكمية يمنع تعديل صلاحياتك بنفسك (403) — اطلب من مالك أو إداري آخر تطبيق التغيير." | ['صلاحية مفعّلة', 'صلاحيتان مفعّلتان', 'صلاحيات مفعّلة', 'صلاحية مفعّلة'], |
| title="تعذّر تحديث الصلاحية" | {state === 'granted' && <Badge color="green">ممنوحة</Badge>} |
| description={apiErrorMessage(setCap.error, 'لم يستجب الخادم للطلب. أعد المحاولة بعد لحظات.')} | {state === 'revoked' && <Badge color="amber">مسحوبة</Badge>} |
| ['صلاحية واحدة مفعّلة', 'صلاحيتان مفعّلتان', 'صلاحيات مفعّلة', 'صلاحية مفعّلة'], |  |
| {state === 'granted' && <Badge color="green">ممنوحة يدوياً</Badge>} |  |
| {state === 'revoked' && <Badge color="amber">مسحوبة يدوياً</Badge>} |  |

## frontend/src/pages/admin/AdminMailPage.tsx (18 − / 14 +)

| before (removed) | after (added) |
|---|---|
| const OUTBOX_ROW_UNIT: [string, string, string, string] = ['صف واحد', 'صفّان', 'صفوف', 'صفًا']; | const OUTBOX_ROW_UNIT: [string, string, string, string] = ['صف', 'صفّان', 'صفوف', 'صفًا']; |
| const SUPPRESSION_ROW_UNIT: [string, string, string, string] = ['عنوان واحد', 'عنوانان', 'عناوين', 'عنوانًا']; | const SUPPRESSION_ROW_UNIT: [string, string, string, string] = ['عنوان', 'عنوانان', 'عناوين', 'عنوانًا']; |
| description="حالة المزوّد، سجلّ التسليم، الحجب، ورسالة اختبار — كما هي، بلا ادّعاء." | <Metric label="أُرسل (24 ساعة)" value={String(data.last24h.sent)} ok={data.last24h.sent >= 0} icon={CheckCircle2} /> |
| <Metric label="أُرسل (٢٤ ساعة)" value={String(data.last24h.sent)} ok={data.last24h.sent >= 0} icon={CheckCircle2} /> | <Metric label="فشل (24 ساعة)" value={String(data.last24h.failed)} ok={data.last24h.failed === 0} icon={XCircle} /> |
| <Metric label="فشل (٢٤ ساعة)" value={String(data.last24h.failed)} ok={data.last24h.failed === 0} icon={XCircle} /> | آخر إرسال: <time dateTime={data.lastSentAt}>{formatDate(data.lastSentAt)}</time> |
| آخر إرسال ناجح: <time dateTime={data.lastSentAt}>{formatDate(data.lastSentAt)}</time> | لتشغيل الإرسال اضبط <code>MAIL_PROVIDER</code> و<code>MAIL_API_KEY</code> و<code>MAIL_FROM</code> — الدليل في <code>MAIL-SETUP-AR.md</code>. توثيق النطاق خطوة تخصّ المالك. |
| لتشغيل الإرسال الفعلي: اضبط <code>MAIL_PROVIDER</code> و<code>MAIL_API_KEY</code> و<code>MAIL_FROM</code> من إعدادات الخدمة — الدليل الكامل في <code>MAIL-SETUP-AR.md</code>. توثيق النطاق لدى المزوّد خطوة تخصّ المالك. | onSuccess: () => toast.success('أُعيد للانتظار.', { title: 'إعادة إرسال' }), |
| subtitle="الحالة، المحاولات، المزوّد، وأزرار الإعادة/الإلغاء." | onSuccess: () => toast.success('أُلغي الإرسال.', { title: 'إلغاء' }), |
| description="لم يُرسِل النظام أي بريد بعد — تظهر هنا لحظة الدخول للصادر." | <EmptyState icon={MailX} title="لا محجوبين" /> |
| onSuccess: () => toast.success('أُعيد الصف إلى قائمة الانتظار.', { title: 'إعادة إرسال' }), | onSuccess: () => toast.success('أُزيل من الحجب.', { title: 'إزالة' }), |
| onSuccess: () => toast.success('أُلغي إرسال الصف.', { title: 'إلغاء' }), | subtitle="إرسال حقيقي إلى عنوان تختاره." |
| subtitle="لن يُرسَل إليها مجددًا ما دامت هنا." | onSuccess: () => toast.success('انضمت للصادر؛ تُسلَّم قريباً.', { title: 'أُرسلت' }), |
| <EmptyState icon={MailX} title="لا محجوبين" description="لا عناوين محجوبة — كل الرسائل تصل مَن تصلهم." /> | onError: (err) => toast.error(apiErrorMessage(err, 'تعذّر الانضمام — الحد اليومي ممتلئ أو غير مضبوط.'), { title: 'فشل' }), |
| onSuccess: () => toast.success('أُزيل العنوان من قائمة الحجب.', { title: 'إزالة الحجب' }), | قوالب: {templates.data.templates.map((t) => ( |
| subtitle="إرسال حقيقي عبر المزوّد إلى عنوان تختاره." |  |
| onSuccess: () => toast.success('انضمت رسالة الاختبار للصادر — تُسلَّم مع الدفعة القادمة.', { title: 'أُرسلت' }), |  |
| onError: (err) => toast.error(apiErrorMessage(err, 'تعذّر الانضمام — الحد اليومي ممتلئ أو الإرسال غير مضبوط.'), { title: 'فشل' }), |  |
| قوالب جاهزة للمعاينة: {templates.data.templates.map((t) => ( |  |

## frontend/src/pages/admin/AdminPages.tsx (115 − / 76 +)

| before (removed) | after (added) |
|---|---|
| return <StripSkeleton title="يحتاج انتباهك" subtitle="جارٍ التحقق من حالات تحتاج انتباهك…" />; | export const COURSE_UNIT: [string, string, string, string] = ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً']; |
| title: 'مقرّرات بلا محتوى تعليميّ', | const STUDENT_UNIT: [string, string, string, string] = ['طالب واحد', 'طالبان', 'طلاب', 'طالباً']; |
| desc: `${countAr(zeroContent.length, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])} لم تُرفع لها محاضرات أو ملفات بعد${capped ? ' (ضمن أول 100 مقرّر)' : ''}`, | const DEPT_UNIT: [string, string, string, string] = ['قسم واحد', 'قسمان', 'أقسام', 'قسماً']; |
| desc: `${countAr(gradedPapers.data.meta.total, ['بحث واحد', 'بحثان', 'بحوث', 'بحثاً'])} جاهزة للنشر في مكتبة الجامعة`, | const ENROLL_UNIT: [string, string, string, string] = ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلاً']; |
| tag={countAr(rows.length, ['بند واحد', 'بندان', 'بنود', 'بنداً'])} | return <StripSkeleton title="يحتاج انتباهك" subtitle="" />; |
| <PatternsPageHeader title={roleDashboardLabel('ADMIN')} description="إحصائيات حيّة عن طلاب وأساتذة المنصّة." /> | title: 'مقرّرات بلا محتوى', |
| <StripSkeleton title="يحتاج انتباهك" subtitle="جارٍ التحقق من حالات تحتاج انتباهك…" /> | desc: `${countAr(zeroContent.length, COURSE_UNIT)}${capped ? ' (ضمن أول 100 مقرّر)' : ''}`, |
| <PatternsPageHeader title={roleDashboardLabel('ADMIN')} description="إحصائيات حيّة عن طلاب وأساتذة المنصّة." /> | desc: `${countAr(gradedPapers.data.meta.total, ['بحث واحد', 'بحثان', 'بحوث', 'بحثاً'])}`, |
| description="إحصائيات حيّة عن طلاب وأساتذة المنصّة." | tag={countAr(rows.length, ['بند', 'بندان', 'بنود', 'بنداً'])} |
| trend: `موزّعة على ${countAr(cityCount, ['مدينة واحدة', 'مدينتين', 'مدن', 'مدينة'])}`, | <StripSkeleton title="يحتاج انتباهك" subtitle="" /> |
| trend: 'مسجَّل في النظام', | trend: countAr(cityCount, ['مدينة واحدة', 'مدينتين', 'مدن', 'مدينة']), |
| trend: countAr(s.totalEnrollments, ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلاً']), | title="لا بيانات طلاب بعد" |
| ? `أعلى ${countAr(topByStudents.length, ['كلّيّة', 'كلّيّتين', 'كلّيّات', 'كلّيّة'])} عدداً · انقر عموداً لعرض طلابها` | كلّيّة واحدة لديها طلاب. |
| title="لا توجد بيانات طلاب بعد" | label="أعلى كلّيّة عدداً" |
| description="ستظهر التوزيعة هنا فور تسجيل الطلاب في الكلّيّات." | summary={topFaculty ? `أعلى كلّيّة: ${topFaculty.name} (${countAr(topFaculty.studentCount, ['طالب واحد', 'طالبين', 'طلاب', 'طالباً'])}).` : undefined} |
| كلّيّة واحدة لديها طلاب — يظهر التفصيل عند تعدُّد الكلّيّات. | caption: 'توزيع الطلاب', |
| label="أعلى كلّيّة عدداً للطلاب" | hint="عرض الكلّيّات" |
| summary={topFaculty ? `أعلى كلّيّة عددًا للطلاب: ${topFaculty.name} بـ${countAr(topFaculty.studentCount, ['طالب واحد', 'طالبين', 'طلاب', 'طالباً'])}.` : undefined} | hint="فتح سجلّ البحوث" |
| caption: 'توزيع الطلاب حسب الكلّيّة', | <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[03]</span>نشاط الإنتاج العلميّ</>} icon={TrendingUp}> |
| hint="عرض الكلّيّات والأقسام" | title="لا أبحاث بعد" |
| hint="فتح سجلّ البحوث المنشورة" | caption: 'الإنتاج العلمي شهرياً', |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[03]</span>نشاط الإنتاج العلميّ — آخر 6 أشهر</>} icon={TrendingUp} subtitle="أبحاث مقدَّمة، مقيَّمة، ومنشورة شهرياً"> | <span>{countAr(faculty.teacherCount, ['عضو هيئة تدريس', 'عضوا هيئة تدريس', 'أعضاء هيئة تدريس', 'عضواً هيئة تدريس'])}</span> |
| title="لا توجد بيانات أبحاث بعد" | {countAr(d.students, STUDENT_UNIT)} · {countAr(d.teachers, ['مدرّس واحد', 'مدرّسان', 'مدرّسون', 'مدرّساً'])} · {countAr(d.courses, COURSE_UNIT)} |
| description="ستظهر حركة النشر هنا بعد رفع أول بحث إلى المنصة." | toast.success(`أُضيفت كلّيّة «${facultyForm.name.trim()}».`); |
| summary="حركة البحوث المرفوعة والمقيَّمة والمنشورة — ستة أشهر الأخيرة." | toast.success(`أُضيف قسم «${deptForm.name.trim()}».`); |
| caption: 'نشاط الإنتاج العلمي شهرياً', | breadcrumbs={[{ label: roleDashboardLabel('ADMIN'), to: '/admin/dashboard' }, { label: 'الكلّيّات والأقسام' }]} |
| <span>{countAr(faculty.departmentCount, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])}</span> | breadcrumbs={[{ label: roleDashboardLabel('ADMIN'), to: '/admin/dashboard' }, { label: 'الكلّيّات والأقسام' }]} |
| <span>{countAr(faculty.courseCount, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</span> | breadcrumbs={[{ label: roleDashboardLabel('ADMIN'), to: '/admin/dashboard' }, { label: 'الكلّيّات والأقسام' }]} |
| <span>{countAr(faculty.studentCount, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}</span> | { label: 'الكلّيّات', value: formatNum(data.length), trendTone: 'flat' }, |
| <span>{countAr(faculty.teacherCount, ['عضو هيئة تدريس واحد', 'عضوا هيئة تدريس', 'أعضاء هيئة تدريس', 'عضواً هيئة تدريس'])}</span> | { label: 'الأقسام', value: formatNum(totalDepts), trendTone: 'flat' }, |
| title={open ? 'طيّ الأقسام' : 'توسيع الأقسام'} | { label: 'إجمالي الطلاب', value: formatNum(totalStudents), trendTone: 'flat' }, |
| {countAr(d.students, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])} · {countAr(d.teachers, ['مدرّس واحد', 'مدرّسان', 'مدرّسون', 'مدرّساً'])} · {countAr(d.courses, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])} | { label: 'هيئة التدريس', value: formatNum(totalTeachers), trendTone: 'flat' }, |
| toast.success(`أُضيفت كلّيّة «${facultyForm.name.trim()}».`, { title: 'تمّت الإضافة' }); | ? `${countAr(data.length, ['كلّيّة واحدة', 'كلّيّتين', 'كلّيّات', 'كلّيّة'])} · بعد التصفيّة` |
| `أُضيف قسم «${deptForm.name.trim()}» إلى «${deptTarget.name}».`, | placeholder="ابحث…" |
| { title: 'تمّت الإضافة' }, | title="لا نتائج مطابقة" |
| description="جميع كلّيّات الجامعة وأقسامها مع إحصائيات حية." | <h3 className="modal-title">إضافة كلّيّة</h3> |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'الكلّيّات والأقسام' }]} | <FormField label="الاسم بالإنجليزية (اختياري)" id="faculty-name-en"> |
| description="جميع كلّيّات الجامعة وأقسامها مع إحصائيات حية." | <FormField label="رمز تعبيري (اختياري)" id="faculty-icon"> |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'الكلّيّات والأقسام' }]} | 'لا استجابة من الخادم.', |
| description="جميع كلّيّات الجامعة وأقسامها مع إحصائيات حية." | في «{deptTarget.name}» |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'الكلّيّات والأقسام' }]} | <FormField label="الاسم بالإنجليزية (اختياري)" id="dept-name-en"> |
| { label: 'الكلّيّات', value: formatNum(data.length), trend: 'في هذه المؤسّسة', trendTone: 'flat' }, | 'لا استجابة من الخادم.', |
| { label: 'الأقسام', value: formatNum(totalDepts), trend: 'عبر الكلّيّات', trendTone: 'flat' }, | breadcrumbs={[{ label: roleDashboardLabel('ADMIN'), to: '/admin/dashboard' }, { label: 'التقارير المؤسسية' }]} |
| { label: 'إجمالي الطلاب', value: formatNum(totalStudents), trend: 'مسجَّلون', trendTone: 'flat' }, | breadcrumbs={[{ label: roleDashboardLabel('ADMIN'), to: '/admin/dashboard' }, { label: 'التقارير المؤسسية' }]} |
| { label: 'هيئة التدريس', value: formatNum(totalTeachers), trend: 'أعضاء', trendTone: 'flat' }, | breadcrumbs={[{ label: roleDashboardLabel('ADMIN'), to: '/admin/dashboard' }, { label: 'التقارير المؤسسية' }]} |
| ? `من أصل ${countAr(data.length, ['كلّيّة واحدة', 'كلّيّتين', 'كلّيّات', 'كلّيّة'])} · بعد التصفيّة` | title="لا بيانات بعد" |
| : `${countAr(totalDepts, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])} · ${countAr(totalCourses, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}`} | <th scope="col">مقيَّم</th> |
| placeholder="ابحث باسم الكلّيّة أو القسم…" | <td className="font-mono" data-label="مقيَّم">{row.graded}</td> |
| title="لا توجد نتائج مطابقة" | title={status ? `لا توجد بحوث بحالة «${PAPER_STATUS_LABEL[status]}»` : 'لا بحوث بعد'} |
| description="جرّب تعديل البحث أو اختيار مدينة أخرى." | عرض الكل |
| <h3 className="modal-title">إضافة كلّيّة جديدة</h3> | <th scope="col" className="admin-table-num" style={{ width: 110 }}>نسبة الاقتباس <span className="text-xxs text-subtle">محاكاة</span></th> |
| <FormField label="الاسم بالإنجليزية (اختياري)" id="faculty-name-en" hint="يظهر بجانب الاسم العربي في السجلّ"> | <Card title="أكثر المقرّرات تسجيلاً" icon={ClipboardCheck}> |
| hint="الكلّيّات تتميّز بالاسم داخل كل مدينة" | title="لا تسجيلات بعد" |
| <FormField label="رمز تعبيري (اختياري)" id="faculty-icon" hint="يظهر مكان الأيقونة الافتراضية بجانب اسم الكلّيّة"> | toast.success(`حُفظت تعديلات «${form.name}».`); |
| placeholder="رمز تعبيري قصير (اختياري)" | toast.success(`أُضيف مقرّر «${form.name}».`); |
| 'لم يستجب الخادم للطلب. إعادة المحاولة.', | ? `${countAr(meta.total, COURSE_UNIT)}${hasFilters ? ' مطابقة للبحث والتصفيّة' : ' في الجامعة'}` |
| سيُضاف القسم إلى «{deptTarget.name}». | breadcrumbs={[{ label: roleDashboardLabel('ADMIN'), to: '/admin/dashboard' }, { label: 'المقرّرات' }]} |
| <FormField label="الاسم بالإنجليزية (اختياري)" id="dept-name-en" hint="يظهر بجانب الاسم العربي في السجلّ"> | placeholder="ابحث…" |
| 'لم يستجب الخادم للطلب. إعادة المحاولة.', | <option value="">{facQ.isPending ? 'جارٍ التحميل…' : 'كلّ الكلّيّات'}</option> |
| description="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." | إعادة المحاولة |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'التقارير المؤسسية' }]} | title="لا نتائج" |
| description="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." | {formMode === 'edit' ? 'تعديل المقرّر' : 'إضافة مقرّر'} |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'التقارير المؤسسية' }]} | <FormField label="كود المقرّر" id="course-code"> |
| description="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." | placeholder="مقدمة في الحاسوب" |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'التقارير المؤسسية' }]} | <FormField label="القسم" id="course-dept"> |
| trend: periodLabel ? `آخر 6 أشهر · ${periodLabel}` : 'في النظام', | hint="بين 1 و10" |
| trend: 'جاهزة في مكتبة الجامعة', | 'لا استجابة من الخادم.', |
| trend: 'حسابات تعمل الآن', | شعبة لمقرّر «{offeringCourse.name}» (<bdi>{offeringCourse.code}</bdi>). |
| trend: 'كل الأدوار', | <FormField label="الفصل الدراسي" id="offering-term" hint="1–50 حرفًا"> |
| subtitle={periodLabel ? `آخر 6 أشهر (${periodLabel}) · مرفوعة، مقيَّمة، منشورة` : 'مرفوعة · مقيَّمة · منشورة'} | {teachersQ.isPending ? 'جارٍ التحميل…' : 'اختر الأستاذ…'} |
| title="لا توجد بيانات نشر بعد" | <FormField label="السعة" id="offering-capacity"> |
| description="ستظهر حركة البحوث هنا بعد رفع أول بحث." | 'لا استجابة من الخادم.', |
| <th scope="col">تمّ تقييمه</th> | 'لا استجابة من الخادم.', |
| <td className="font-mono" data-label="تمّ تقييمه">{row.graded}</td> | ? `سيُحذف «${confirmingDelete.name}» نهائيًا.` |
| title={`مرفوعة: ${b.submitted}`} | toast.success(`حُذف «${target.name}».`); |
| title={`مقيَّمة: ${b.graded}`} | toast.error(apiErrorMessage(err, 'تعذّر الحذف — توجد عناصر مرتبطة.'), { |
| title={`منشورة: ${b.published}`} |  |
| : 'سجلّ مؤسّسيّ لبحوث الطلاب عبر دورة حياتها'} |  |
| title={status ? `لا توجد بحوث بحالة «${PAPER_STATUS_LABEL[status]}»` : 'لا توجد بحوث بعد'} |  |
| ? 'جرّب حالة أخرى أو اعرض جميع الحالات.' |  |
| : 'ستظهر البحوث هنا فور رفع أول بحث إلى المنصة.'} |  |
| عرض جميع الحالات |  |
| <th scope="col" className="admin-table-num" style={{ width: 110 }} title="قيمة محاكاة — ليست قياساً فعلياً">نسبة الاقتباس <span className="text-xxs text-subtle">محاكاة</span></th> |  |
| <Card title="أكثر المقرّرات تسجيلاً" icon={ClipboardCheck} subtitle={data.topCourses.length > 0 ? `أعلى ${countAr(data.topCourses.length, ['مقرّر', 'مقرّرين', 'مقرّرات', 'مقرّراً'])} بناءً على عدد الطلاب` : undefined}> |  |
| title="لا توجد تسجيلات بعد" |  |
| description="تظهر هنا فور تسجيل الطلاب في مقرّراتهم." |  |
| toast.success(`حُفظت تعديلات «${form.name}».`, { title: 'تمّ الحفظ' }); |  |
| toast.success(`أُضيف مقرّر «${form.name}» إلى السجلّ.`, { title: 'تمّت الإضافة' }); |  |
| { title: 'تمّ فتح الشعبة' }, |  |
| ? `${countAr(meta.total, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}${hasFilters ? ' مطابقة للبحث والتصفيّة' : ' في الجامعة'}` |  |
| : 'جميع المقرّرات الجامعية مع إحصائيات حيّة.'} |  |
| breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'المقرّرات' }]} |  |
| placeholder="ابحث بالاسم أو الكود…" |  |
| <option value="">{facQ.isPending ? 'جارٍ تحميل الكلّيّات…' : 'كلّ الكلّيّات'}</option> |  |
| إعادة تحميل الكلّيّات |  |
| title="لا توجد نتائج" |  |
| description="جرّب تعديل البحث أو الفلتر لعرض نتائج أوسع." |  |
| {countAr(c.totalEnrollments, ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلاً'])} |  |
| unit={['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً']} |  |
| {formMode === 'edit' ? 'تعديل المقرّر' : 'إضافة مقرّر جديد'} |  |
| <FormField label="كود المقرّر" id="course-code" hint="مثال: CS101 — يظهر بخط أحادي في السجلّ"> |  |
| placeholder="مقدمة في علوم الحاسب" |  |
| <FormField label="القسم" id="course-dept" hint="الكلّيّة تحدّدها القسم الذي تختاره"> |  |
| hint="بين 1 و10 — الزرّ معطّل خارجه" |  |
| 'لم يستجب الخادم للطلب. إعادة المحاولة.', |  |
| سيُدرَّس مقرّر «{offeringCourse.name}» (<bdi>{offeringCourse.code}</bdi>) في الشعبة الجديدة. |  |
| <FormField label="الفصل الدراسي" id="offering-term" hint="نص حرّ من 1 إلى 50 حرفًا — مثال: 2024-FALL"> |  |
| hint="أساتذة مؤسستك فقط — لا تُسند الشُّعب إلا لنشط فيها" |  |
| {teachersQ.isPending ? 'جارٍ تحميل الأساتذة…' : 'اختر الأستاذ…'} |  |
| <FormField label="السعة" id="offering-capacity" hint="أقصى عدد طلاب يمكن تسجيلهم في الشعبة"> |  |
| 'لم يستجب الخادم للطلب. إعادة المحاولة.', |  |
| 'لم يستجب الخادم للطلب. إعادة المحاولة.', |  |
| ? `سيُحذف «${confirmingDelete.name}» نهائيًا من السجلّ — لا تراجع.` |  |
| toast.success(`حُذف «${target.name}» من السجلّ.`, { title: 'تمّ الحذف' }); |  |
| toast.error(apiErrorMessage(err, 'تعذّر حذف المقرّر — قد تكون له شُعب أو مفاهيم مرتبطة.'), { |  |

## frontend/src/pages/admin/ImportWizardPage.tsx (49 − / 47 +)

| before (removed) | after (added) |
|---|---|
| 'universityId:رقم القيد,email:البريد الإلكتروني,year:السنة الدراسية,' + | 'universityId:رقم القيد,email:البريد,year:السنة,' + |
| 'studentPhone:هاتف الطالب,guardianName:اسم ولي الأمر,' + | 'studentPhone:هاتف الطالب,guardianName:اسم الولي,' + |
| 'guardianPhone:هاتف ولي الأمر,dateOfBirth:تاريخ الميلاد,gender:الجنس,' + | 'guardianPhone:هاتف الولي,dateOfBirth:تاريخ الميلاد,gender:الجنس,' + |
| FILL_EMPTY: 'إكمال الفراغات فقط', | FILL_EMPTY: 'إكمال الفراغات', |
| setError(apiErrorMessage(err, 'تعذّر تحليل الملف — تأكد من الصيغة (XLSX أو CSV) وحجمه (≤ ١٠ م.ب)')); | setError(apiErrorMessage(err, 'تعذّر تحليل الملف')); |
| setError('حجم الملف يتجاوز ١٠ ميغابايت — قسّمه إلى ملفات أصغر'); | setError('أكبر من ١٠ ميغابايت — قسّمه'); |
| setError('تعذّر رفع الملف — أعد المحاولة'); | setError('تعذّر رفع الملف'); |
| setError('لم تُطابَق أي أعمدة — خصّص عمودًا واحدًا على الأقل قبل المتابعة'); | setError('خصّص عمودًا على الأقل'); |
| setError(apiErrorMessage(err, 'تعذّر تجهيز المعاينة — أعد المحاولة')); | setError(apiErrorMessage(err, 'تعذّر تجهيز المعاينة')); |
| toast.success(`تم تثبيت الاستيراد: ${payload.succeeded} صفًا`); | toast.success(`تم التثبيت — ${payload.succeeded} صفًا`); |
| setError(apiErrorMessage(err, 'تعذّر تثبيت الاستيراد — راجع المعاينة وأعد المحاولة')); | setError(apiErrorMessage(err, 'تعذّر التثبيت — راجع المعاينة')); |
| toast.success('تم التراجع عن الاستيراد'); | toast.success('تم التراجع'); |
| setError(apiErrorMessage(err, 'تعذّر التراجع — حاول مجددًا')); | setError(apiErrorMessage(err, 'تعذّر التراجع')); |
| toast.success(`طُبق «${labelAr}» — راجع الأعمدة ثم عدّل ما تشاء`); | toast.success(`طُبق «${labelAr}» — راجع الأعمدة`); |
| description="رفع ← مطابقة ← مراجعة ← تأكيد ← نتيجة — لا شيء يُكتب قبل تأكيدك." | description="لا شيء يُكتب قبل تأكيدك." |
| <Card title="ارفع ملف الطلاب" icon={FileUp}> | <Card title="رفع الملف" icon={FileUp}> |
| <p className="iw-drop-title">اسحب ملف Excel أو CSV هنا</p> | <p className="iw-drop-title">اسحب الملف هنا</p> |
| <p className="iw-drop-sub">أو اضغط للاختيار · XLSX / CSV · حتى ١٠ ميغابايت · حتى ٢٠ ألف صف</p> | <p className="iw-drop-sub">XLSX / CSV · حتى ١٠ ميغابايت · ٢٠ ألف صف</p> |
| <a href="/api/v1/import/templates/STUDENT" download>تحميل القالب الرسمي (Excel)</a> | <a href="/api/v1/import/templates/STUDENT" download>تحميل القالب (Excel)</a> |
| {' '}— يدعم النظام ترميز Windows-1256 وفواصل الأعمدة المختلفة تلقائيًا. | <span className="iw-warn">{parsed.unknownColumns.length} أعمدة غير متعرَّف عليها</span> |
| <span className="iw-warn">{parsed.unknownColumns.length} أعمدة غير متعرَّف عليها — ستُراجع في المطابقة</span> | متابعة <ArrowLeft size={15} aria-hidden="true" /> |
| متابعة إلى المطابقة <ArrowLeft size={15} aria-hidden="true" /> | <p className="iw-presets-title">قوالب جاهزة:</p> |
| <p className="iw-presets-title">قوالب جاهزة — طبّقها بلمسة ثم عدّل ما تشاء:</p> | title={s.noteAr ?? (s.coverage === 1 ? 'تطابق كامل' : `ينقص: ${s.missingTargets.join('، ')}`)} |
| title={s.noteAr ?? (s.coverage === 1 ? 'تطابق كامل مع المتطلبات' : `ينقص: ${s.missingTargets.join('، ')}`)} | القوالب غير الموثّقة — راجعها قبل التثبيت. |
| «منظومة الغويل» قالب غير موثّق — طبّقه بحذر وراجع كل عمود قبل التثبيت. | <th scope="col">الحقل الهدف</th> |
| <th scope="col">الحقل في مدارك</th> | <Card title="المراجعة"> |
| <Card title="المراجعة — نتيجة كل صف قبل الكتابة"> | <span className="iw-counts-total">من {preview.counts.total} صفًا</span> |
| <span className="iw-counts-total">من أصل {preview.counts.total} صفًا</span> | <EmptyState title="لا صفوف" illustration="empty-list" /> |
| <EmptyState title="لا صفوف بهذا التصنيف" description="غيّر التصفية لمشاهدة بقية الصفوف." illustration="empty-list" /> | ? <p className="iw-row-msg">لا اختلافات.</p> |
| ? <p className="iw-row-msg">لا اختلافات — الملف يطابق بيانات الملف الشخصي.</p> | <p className="iw-row-msg">«إكمال الفراغات» ستضيف: {r.fillable!.join('، ')}</p> |
| <p className="iw-row-msg">سياسة «إكمال الفراغات» ستضيف: {r.fillable!.join('، ')}</p> | متابعة <ArrowLeft size={15} aria-hidden="true" /> |
| متابعة إلى التأكيد <ArrowLeft size={15} aria-hidden="true" /> | <Card title="التأكيد"> |
| <Card title="التأكيد — ما الذي سيحدث بالضبط؟"> | {' '}إنشاء الكليات/الأقسام غير الموجودة (تُسجَّل في التدقيق) |
| {' '}إنشاء الكليات/الأقسام غير الموجودة بأسمائها (تُسجَّل في التدقيق) | <li>الحسابات بلا بريد: كلمة مرور مؤقتة تُعرض مرة واحدة.</li> |
| <li>الحسابات الجديدة بلا بريد تُنشأ بكلمات مرور مؤقتة — تُعرض مرة واحدة في الخطوة التالية.</li> | <li className="iw-muted">٧٢ ساعة للتراجع (ما لم يسجّل الطالب دخوله).</li> |
| <li className="iw-muted">يمكنك التراجع عن كل المهمة خلال ٧٢ ساعة من التثبيت (ما لم يسجّل الطالب دخوله).</li> | رجوع |
| رجوع للمراجعة | {busy ? 'جارٍ التثبيت…' : 'تثبيت الاستيراد'} |
| {busy ? 'جارٍ التثبيت…' : 'تثبيت الاستيراد نهائيًا'} | كلمات المرور تُعرض <strong>مرة واحدة</strong> — نزّلها؛ تُغيَّر عند أول دخول. |
| كلمات المرور المؤقتة أدناه تُعرض <strong>مرة واحدة</strong> — نزّل الورقة واطبعها ووزّعها؛ | <th scope="col">كلمة المرور</th> |
| يُطلب من الطلاب تغييرها عند أول دخول. | 'كلمات-المرور.csv', |
| <th scope="col">كلمة المرور المؤقتة</th> | 'الاسم,الرقم الجامعي,البريد,كلمة المرور\n' + |
| 'كلمات-المرور-المؤقتة.csv', | <Download size={14} aria-hidden="true" /> تقرير الصفوف (Excel) |
| 'الاسم,الرقم الجامعي,البريد,كلمة المرور المؤقتة\n' + | <RotateCcw size={14} aria-hidden="true" /> التراجع |
| <Download size={14} aria-hidden="true" /> تقرير كل صف (Excel) | <Link className="btn primary sm" to="/admin/students">قائمة الطلاب</Link> |
| <RotateCcw size={14} aria-hidden="true" /> التراجع عن المهمة | title="التراجع؟" |
| <Link className="btn primary sm" to="/admin/students">العودة إلى قائمة الطلاب</Link> | message="تُحذف الحسابات غير المستخدمة وتُستعاد القيم." |
| title="التراجع عن الاستيراد؟" | <Link className="btn primary sm" to="/admin/students">قائمة الطلاب</Link> |
| message="سيُحذف كل حساب أُنشئ بها ولم يسجّل الدخول بعد، وتُستعاد القيم كما كانت. المهمة المتابعة لا تُمسّ." |  |
| <Link className="btn primary sm" to="/admin/students">العودة إلى قائمة الطلاب</Link> |  |

## frontend/src/pages/admin/PeoplePages.tsx (77 − / 52 +)

| before (removed) | after (added) |
|---|---|
| SELECT: 'اختيار', MULTI_SELECT: 'اختيار متعدد', | SELECT: 'اختيار', MULTI_SELECT: 'متعدد', |
| description="الطلاب والمدرّسون مع أرقام التواصل — وفق إعدادات الظهور." | <p className="r349p-error" role="alert">تعذّر تجهيز التصدير.</p> |
| <p className="r349p-error" role="alert">تعذّر تجهيز ملف التصدير — أعد المحاولة.</p> | placeholder={kind === 'student' ? 'الاسم أو رقم القيد أو الهاتف…' : 'الاسم أو الرقم الوظيفي…'} |
| placeholder={kind === 'student' ? 'ابحث بالاسم أو رقم القيد أو الهاتف…' : 'ابحث بالاسم أو الرقم الوظيفي…'} | <option value="">كل الأوضاع</option> |
| <option value="">كل أوضاع الدراسة</option> | <ErrorState error={directory.error} message="تعذّر التحميل" onRetry={() => directory.refetch()} /> |
| <option value="MORNING">صباحي</option> | <EmptyCell label="لا نتائج" note="عدّل البحث أو التصفية." /> |
| <option value="EVENING">مسائي</option> | {requested ? 'أُرسل' : 'طلب تواصل'} |
| <option value="PARALLEL">موازي</option> | <ErrorState error={defs.error} message="تعذّر تحميل الحقول" onRetry={() => defs.refetch()} /> |
| <option value="ACTIVE">مقيّد</option> | <b className="text-sm">الحقول المخصصة</b> |
| <option value="SUSPENDED">موقوف</option> | أضف أول حقل أعلاه. |
| <option value="DEFERRED">مؤجّل</option> | <p className="r349p-error" role="alert">تعذّر الحذف.</p> |
| <option value="GRADUATED">متخرّج</option> | if (!isEdit && !FIELD_KEY_RE.test(form.key.trim())) return 'حروف لاتينية صغيرة وأرقام وشرطات'; |
| <option value="WITHDRAWN">منسحب</option> | if (optionsList.length === 0) return 'تحتاج خيارًا واحدًا على الأقل'; |
| <ErrorState error={directory.error} message="تعذّر تحميل الدليل" onRetry={() => directory.refetch()} /> | ? 'تحقّق من المفتاح والترتيب' |
| <EmptyCell label="لا نتائج" note="جرّب تعديل البحث أو التصفية." /> | <FormField label="المفتاح" value={form.key} onChange={set('key')} dir="ltr" mono /> |
| {requested ? 'أُرسل الطلب' : 'طلب تواصل'} | <span className="text-xxs text-subtle">الخيارات (سطر لكل خيار)</span> |
| <ErrorState error={defs.error} message="تعذّر تحميل الحقول المخصصة" onRetry={() => defs.refetch()} /> | <span className="text-xs">إلزامي</span> |
| <b className="text-sm">الحقول المخصصة للمؤسسة</b> | <span className="text-xs">قابل للبحث</span> |
| حقول إضافية تُدار هنا وتُعرض في ملفات الطلاب والمدرّسين. | {pending ? '…' : 'حفظ'} |
| لا حقول بعد — أضف أول حقل من الأزرار أعلاه. | <PageHeader title="ملف الطالب" description="خارج نطاق مؤسستك." /> |
| <p className="r349p-error" role="alert">تعذّر الحذف — أعد المحاولة</p> | <ErrorState error={person.error ?? new Error('not found')} message="تعذّر الفتح" onRetry={() => person.refetch()} /> |
| if (!isEdit && !FIELD_KEY_RE.test(form.key.trim())) return 'المفتاح: حروف لاتينية صغيرة وأرقام وشرطات فقط'; | <PageHeader title="الملف" description="ملف مدرّس." /> |
| if (optionsList.length === 0) return 'حقول الاختيار تحتاج خيارًا واحدًا على الأقل'; | {p ? <TeacherFileBody person={p} /> : <EmptyCell label="غير موجود" note="خارج نطاقك أو محذوف." /> } |
| ? 'تعذّر الحفظ — تحقّق من المفتاح والترتيب (قد يكونان محجوزين)' | description={`رقم القيد ${p.universityId}`} |
| <FormField label="المفتاح (لا يتغيّر لاحقًا)" value={form.key} onChange={set('key')} dir="ltr" mono /> | { label: 'الوضع', value: p.academic.studyType ? STUDY_TYPE_LABELS[p.academic.studyType] : '—' }, |
| { value: 'TEXT', label: 'نص' }, | <SectionBar index="01" title="بيانات التوثيق" /> |
| { value: 'NUMBER', label: 'رقم' }, | <FormField label="الاسم" value={form.nameAr} onChange={set('nameAr')} /> |
| { value: 'DATE', label: 'تاريخ' }, | <FormField label="الأب" value={form.fatherName} onChange={set('fatherName')} /> |
| { value: 'BOOLEAN', label: 'نعم/لا' }, | <FormField label="الجد" value={form.grandfatherName} onChange={set('grandfatherName')} /> |
| { value: 'SELECT', label: 'اختيار' }, | <FormField label="الأم" value={form.motherName} onChange={set('motherName')} /> |
| { value: 'MULTI_SELECT', label: 'اختيار متعدد' }, | <FormField label="الميلاد" value={form.birthPlace} onChange={set('birthPlace')} /> |
| <span className="text-xxs text-subtle">الخيارات (واحد في كل سطر)</span> | <FormField label="الصلة" value={form.guardianRelationship} onChange={set('guardianRelationship')} /> |
| <span className="text-xs">إلزامي عند التسجيل</span> | <p className="r349p-note">هاتف ولي الأمر خاص — مقنّع.</p> |
| <span className="text-xs">قابل للبحث في الدليل</span> | <SelectField label="الوضع" value={form.studyType} onChange={set('studyType')} options={[ |
| {pending ? '…' : 'حفظ الحقل'} | <SelectField label="الحالة" value={form.enrollmentStatus} onChange={set('enrollmentStatus')} options={[ |
| <PageHeader title="ملف الطالب" description="الملف غير موجود أو خارج نطاق مؤسستك." /> | <FormField label="المرحلة" value={form.stage} onChange={set('stage')} /> |
| <ErrorState error={person.error ?? new Error('not found')} message="تعذّر فتح الملف" onRetry={() => person.refetch()} /> | <FormField label="الصف" value={form.grade} onChange={set('grade')} /> |
| <PageHeader title="الملف" description="هذا الملف لمدرّس — يُعرض من دليل المدرّسين." /> | <FormField label="شعبة" value={form.secondarySchoolBranch} onChange={set('secondarySchoolBranch')} /> |
| {p ? <TeacherFileBody person={p} /> : <EmptyCell label="الملف غير موجود" note="خارج نطاق مؤسستك أو محذوف." />} | <FormField label="نسبة الثانوية" value={form.secondarySchoolPercent} onChange={set('secondarySchoolPercent')} dir="ltr" mono /> |
| description={`ملف الطالب · رقم القيد ${p.universityId}`} | <FormField label="القبول" value={form.admissionYear} onChange={set('admissionYear')} dir="ltr" mono /> |
| { label: 'وضع الدراسة', value: p.academic.studyType ? STUDY_TYPE_LABELS[p.academic.studyType] : '—' }, | {patch.isError && <span className="r349p-error" role="alert">تعذّر الحفظ.</span>} |
| <SectionBar index="01" title="الملف — بيانات التوثيق" /> | {patch.isPending ? '…' : 'حفظ'} |
| <FormField label="الاسم كما في الوثائق" value={form.nameAr} onChange={set('nameAr')} /> | if (q.isError) return <Card><ErrorState error={q.error} message="تعذّر التحميل" onRetry={() => q.refetch()} /></Card>; |
| <FormField label="اسم الأب" value={form.fatherName} onChange={set('fatherName')} /> | if (rows.length === 0) return <Card><EmptyCell label="لا مقررات" note="غير مسجّل بعد." /></Card>; |
| <FormField label="اسم الجد" value={form.grandfatherName} onChange={set('grandfatherName')} /> | if (offeringIds.length === 0) return <Card><EmptyCell label="لا مقررات" /></Card>; |
| <FormField label="اسم الأم" value={form.motherName} onChange={set('motherName')} /> | ? 'لا درجات' |
| <FormField label="مكان الميلاد" value={form.birthPlace} onChange={set('birthPlace')} /> | 'people.read': 'قراءة', |
| <FormField label="صلة القرابة" value={form.guardianRelationship} onChange={set('guardianRelationship')} /> | 'people.update': 'تعديل', |
| <p className="r349p-note">هاتف ولي الأمر خاص — يظهر مقنّعًا حتى يغيّر الملف إعداده.</p> | 'directory.export': 'تصدير دليل', |
| <SelectField label="وضع الدراسة" value={form.studyType} onChange={set('studyType')} options={[ | 'profile.self-update': 'تعديل ذاتيّ', |
| { value: 'MORNING', label: 'صباحي' }, | if (q.isError) return <Card><ErrorState error={q.error} message="تعذّر التحميل" onRetry={() => q.refetch()} /></Card>; |
| { value: 'EVENING', label: 'مسائي' }, | return <Card><EmptyCell label="فارغ" note="لا لمسات بعد." /></Card>; |
| { value: 'PARALLEL', label: 'موازي' }, |  |
| <SelectField label="الحالة الدراسية" value={form.enrollmentStatus} onChange={set('enrollmentStatus')} options={[ |  |
| { value: 'ACTIVE', label: 'مقيّد' }, |  |
| { value: 'SUSPENDED', label: 'موقوف' }, |  |
| { value: 'DEFERRED', label: 'مؤجّل' }, |  |
| { value: 'GRADUATED', label: 'متخرّج' }, |  |
| { value: 'WITHDRAWN', label: 'منسحب' }, |  |
| <FormField label="المرحلة (مدارس)" value={form.stage} onChange={set('stage')} /> |  |
| <FormField label="الصف (مدارس)" value={form.grade} onChange={set('grade')} /> |  |
| <FormField label="شعبة الثانوية" value={form.secondarySchoolBranch} onChange={set('secondarySchoolBranch')} /> |  |
| <FormField label="نسبة الثانوية ٪" value={form.secondarySchoolPercent} onChange={set('secondarySchoolPercent')} dir="ltr" mono /> |  |
| <FormField label="سنة القبول" value={form.admissionYear} onChange={set('admissionYear')} dir="ltr" mono /> |  |
| {patch.isError && <span className="r349p-error" role="alert">تعذّر الحفظ — أعد المحاولة</span>} |  |
| {patch.isPending ? '…' : 'حفظ التعديلات'} |  |
| if (q.isError) return <Card><ErrorState error={q.error} message="تعذّر تحميل المقررات" onRetry={() => q.refetch()} /></Card>; |  |
| if (rows.length === 0) return <Card><EmptyCell label="لا مقررات" note="الطالب غير مسجّل في مقررات بعد." /></Card>; |  |
| if (offeringIds.length === 0) return <Card><EmptyCell label="لا مقررات" note="لا درجات ولا حضور بلا مقررات." /></Card>; |  |
| ? 'لا درجات مسجّلة' |  |
| 'people.read': 'قراءة الملف', |  |
| 'people.update': 'تعديل الملف', |  |
| 'directory.export': 'تصدير دليل شمل الملف', |  |
| 'profile.self-update': 'تعديل صاحب الملف', |  |
| if (q.isError) return <Card><ErrorState error={q.error} message="تعذّر تحميل السجل" onRetry={() => q.refetch()} /></Card>; |  |
| return <Card><EmptyCell label="سجل فارغ" note="لم يُقرأ ولم يُعدّل بعد — كل لمسة ستُسجّل هنا." /></Card>; |  |
| سجل اللمسات على الملف (قراءة/تعديل/تصدير) — بلا قيم بيانات شخصية. |  |

## frontend/src/pages/auth/ForgotPasswordPage.tsx (5 − / 5 +)

| before (removed) | after (added) |
|---|---|
| 'إرسال البريد غير مُهيّأ بعد [يُستكمل قبل الإطلاق] — حسابات @test.ly تستلم الرابط هنا مباشرةً، وغيرها عبر «اتصل بنا».'; | 'إرسال البريد غير مُهيّأ بعد [يُستكمل قبل الإطلاق] — حسابات @test.ly تستلم الرابط هنا.'; |
| أدخل بريدك الإلكتروني المسجّل — إذا كان موجودًا فستصلك رسالة خلال دقائق. | أدخل بريدك الإلكتروني المسجّل. |
| <p className="fp-dev-inbox-note">لا يُرسل بريد فعلي — الرابط معروض هنا (حساب تجريبي @test.ly).</p> | <p className="fp-dev-inbox-note">لا يُرسل بريد فعلي — الرابط هنا (حساب @test.ly).</p> |
| مشكلة واحدة في النموذج — راجع الحقل المعلّم ثم أعد المحاولة. | راجع الحقل المعلّم ثم أعد المحاولة. |
| <strong>منصّة تعليم ذكية مستقلّة</strong> · عربية أولًا | <strong>منصّة تعليم مستقلّة</strong> · عربية أولًا |

## frontend/src/pages/auth/ResetPasswordPage.tsx (9 − / 6 +)

| before (removed) | after (added) |
|---|---|
| 'روابط الاستعادة تُستخدم مرة وتنتهي بعد ٣٠ دقيقة — اطلب رابطًا جديدًا.'; | 'الرابط يُستخدم مرة وينتهي بعد ٣٠ دقيقة.'; |
| كلمة المرور الجديدة سارية، وأُبطلت كل الجلسات على جميع الأجهزة — سجّل الدخول من جديد. | كلمة المرور الجديدة سارية وأُبطلت كل الجلسات — سجّل الدخول من جديد. |
| سيُعاد توجيهك إلى صفحة تسجيل الدخول بعد لحظات — أو{' '} | سيُعاد توجيهك إلى تسجيل الدخول بعد لحظات — أو{' '} |
| <span>{INVALID_TOKEN_TITLE} — اطلب رابطًا جديدًا.</span> | <Link to="/auth" className="auth-register-link">تسجيل الدخول</Link> |
| <Link to="/auth" className="auth-register-link">العودة إلى تسجيل الدخول</Link> | return n === 1 ? 'مشكلة واحدة — راجع الحقل المعلّم.' : 'مشكلتان — راجع الحقلين المعلّمين.'; |
| السياسة: ١٢ حرفًا على الأقل و٧٢ كحدّ أقصى، وليست من الكلمات الشائعة — كما في التسجيل والتغيير. | <span>حفظ كلمة المرور</span> |
| return n === 1 ? 'مشكلة واحدة في النموذج — راجع الحقل المعلّم ثم أعد المحاولة.' : 'مشكلتان في النموذج — راجع الحقلين المعلّمين ثم أعد المحاولة.'; |  |
| <span>حفظ كلمة المرور الجديدة</span> |  |
| جارٍ تحديث كلمة المرور… |  |

## frontend/src/pages/capabilities/CapabilityPages.tsx (3 − / 1 +)

| before (removed) | after (added) |
|---|---|
| كل رقم من حالة الميزات في النظام — يتغيّر مع التحديثات، لا الحملات. | كل رقم من حالة الميزات في النظام. |
| نبني منظومة تتذكّر ما شاهد الطالب وما أخطأ وما ينقصه — |  |
| ثم تقترح الخطوة التالية. بلا أرقام مختلقة ولا وعود بلا تنفيذ: |  |

## frontend/src/pages/colleges/CollegePages.tsx (14 − / 7 +)

| before (removed) | after (added) |
|---|---|
| أنشئ حسابك الجامعي وابدأ رحلتك على مدارك. | const COLLEGES_LABEL = 'كلّيّات الجامعة'; |
| useDocTitle(isGuest ? 'كلّيّات الجامعة' : null); | const LEADERBOARD_CARD_TITLE = 'لوحة المتصدّرين'; |
| title="البنية الأكاديمية التجريبية — مؤسسة مدارك النموذجية" | title="كلّيّات مؤسسة مدارك النموذجية" |
| description="الكلّيّات والأقسام وقادة كلّ كلّيّة وأبرز طلّابها في سجلّ المؤسّسة المرجعية." | <EmptyState illustration="empty-list" title="لا توجد كلّيّات بعد" /> |
| <EmptyState illustration="empty-list" title="لا توجد كلّيّات بعد" description="تظهر هنا حين يضيفها المسجل العام." /> | search={{ value: state.query, onChange: setQuery, placeholder: 'ابحث…' }} |
| search={{ value: state.query, onChange: setQuery, placeholder: 'ابحث عن كلّيّة…' }} | description="مقارنة الكلّيّات على مؤشّرات الأداء." |
| description="جرّب كلمة بحث مختلفة أو غيّر الحرم الجامعي." | لا كلّيّة جمعت نقاطًا بعد — أول نشاط يفتح الترتيب. |
| description="مقارنة الكلّيّات على مؤشّرات الأداء الأكاديميّ والنشاط الرقميّ." |  |
| <Card title="لوحة المتصدّرين" icon={Trophy}> |  |
| description="النقاط من نشاط الطلاب — تظهر أولى النتائج مع بداية النشاط." |  |
| نقاط المنافسة تُحتسب من نشاط الطلاب المسجّلين — الاختبارات، المعامل، |  |
| والأبحاث. لا كلّيّة جمعت نقاطًا بعد هذا الفصل، لذا يقف الجميع على خط |  |
| الانطلاق: أول نشاط مسجّل يفتح الترتيب. |  |
| <Card title="لوحة المتصدّرين" icon={Trophy}> |  |

## frontend/src/pages/community/CommunityPages.tsx (49 − / 46 +)

| before (removed) | after (added) |
|---|---|
| PLATFORM: 'كل المنصة', FACULTY: 'كلّيّة', DEPARTMENT: 'قسم', OFFERING: 'مقرر', | PLATFORM: 'المنصّة', FACULTY: 'كلّيّة', DEPARTMENT: 'قسم', OFFERING: 'مقرر', |
| STUDENT: 'طالب', TEACHER: 'أستاذ', QUALITY: 'مكتب الجودة', | STUDENT: 'طالب', TEACHER: 'أستاذ', QUALITY: 'الجودة', |
| { key: 'rooms', label: 'غرف الدراسة', icon: Users }, | { key: 'rooms', label: 'الغرف', icon: Users }, |
| eyebrow="الحياة الأكاديمية" | المسابقات |
| description="إعلانات الجامعة · مسابقات وفعاليات · أنشطة طلابية." | الكليات |
| صفحة المسابقات الكاملة | { label: 'نشطة', value: annCount, tone: 'signal' }, |
| كلّيّات الجامعة | { label: 'مفتوحة', value: compsCount }, |
| { label: 'إعلانات نشطة', value: annCount, tone: 'signal' }, | { label: 'قادمة', value: eventsCount, tone: 'positive' }, |
| { label: 'مسابقات مفتوحة', value: compsCount }, | srLabel={countAr(ann.data?.length ?? 0, ['إعلان', 'إعلانان', 'إعلانات', 'إعلان'])} |
| { label: 'فعاليات قادمة', value: eventsCount, tone: 'positive' }, | <ErrorState message="تعذَّر التحميل." error={ann.error} onRetry={() => ann.refetch()} /> |
| srLabel={countAr(ann.data?.length ?? 0, ['إعلان واحد', 'إعلانان', 'إعلانات', 'إعلان'])} | empty={<EmptyCell label="لا إعلانات" />} |
| <ErrorState message="تعذَّر تحميل الإعلانات" error={ann.error} onRetry={() => ann.refetch()} /> | srLabel={countAr(comps.data?.length ?? 0, ['مسابقة', 'مسابقتان', 'مسابقات', 'مسابقة'])} |
| empty={<EmptyCell label="لا توجد إعلانات بعد" note="ستظهر هنا إعلانات الجامعة والكليات والأقسام." />} | <ErrorState message="تعذَّر التحميل." error={comps.error} onRetry={() => comps.refetch()} /> |
| srLabel={countAr(comps.data?.length ?? 0, ['مسابقة واحدة', 'مسابقتان', 'مسابقات', 'مسابقة'])} | empty={<EmptyCell label="لا مسابقات" />} |
| <ErrorState message="تعذَّر تحميل المسابقات" error={comps.error} onRetry={() => comps.refetch()} /> | srLabel={countAr(events.data?.length ?? 0, ['فعاليّة', 'فعاليّتان', 'فعاليات', 'فعاليّة'])} |
| empty={<EmptyCell label="لا توجد مسابقات بعد" note="تظهر المسابقات عند إعلانها." />} | <ErrorState message="تعذَّر التحميل." error={events.error} onRetry={() => events.refetch()} /> |
| srLabel={countAr(events.data?.length ?? 0, ['فعاليّة واحدة', 'فعاليّتان', 'فعاليات', 'فعاليّة'])} | empty={<EmptyCell label="لا فعاليات" />} |
| <ErrorState message="تعذَّر تحميل الفعاليات" error={events.error} onRetry={() => events.refetch()} /> | expandLabel={`عرض: ${a.title}`} |
| empty={<EmptyCell label="لا توجد فعاليات قادمة بعد" note="تظهر الفعاليات عند جدولتها." />} | ? days === 1 ? 'يوم' |
| expandLabel={`عرض نص الإعلان: ${a.title}`} | : days === 2 ? 'يومان' |
| ? days === 1 ? 'يوم واحد متبقٍ' | : days <= 10 ? `${days} أيام` |
| : days === 2 ? 'يومان متبقيان' | : `${days} يوماً` |
| : days <= 10 ? `${days} أيام متبقية` | : hours >= 1 ? `بعد ${arUnit(hours, 'ساعة', 'ساعتين', 'ساعات')}` |
| : `${days} يوماً متبقياً` | : 'قريباً'; |
| : hours >= 1 ? `تنتهي بعد ${arUnit(hours, 'ساعة', 'ساعتين', 'ساعات')}` | <Badge color="gold">محكّمة</Badge> |
| : 'تنتهي خلال دقائق'; | ? (isOpen ? 'كن الأول' : 'لا مشاركات') |
| <Badge color="gold">تمّ التحكيم</Badge> | : arUnit(c._count.entries, 'مشترك', 'مشتركان', 'مشتركين')} |
| ? (isOpen ? 'كن أول المشاركين' : 'لا مشاركات') | <span title="من السعة"> |
| : c._count.entries === 1 ? 'مشترك واحد' : arUnit(c._count.entries, 'مشترك', 'مشتركان', 'مشتركين')} | expandLabel={`عرض: ${e.title}`} |
| <span title="الحضور المؤكّدون من إجمالي السعة"> | <Icon icon={AlertTriangle} size={12} aria-hidden /> تعذَّر التسجيل. |
| expandLabel={`عرض وصف الفعالية: ${e.title}`} | ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scopeId'], message: 'مطلوب' }); |
| <Icon icon={AlertTriangle} size={12} aria-hidden /> تعذّر تسجيل ردّك | '📢': 'مكبّر', '📌': 'دبوس', '🎓': 'قبعة', '🏆': 'كأس', // allow-emoji: a11y name map for the admin-picker palette above |
| ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scopeId'], message: 'مطلوب لهذا النطاق' }); | {canPlatform && <option value="PLATFORM">المنصّة</option>} |
| '📢': 'مكبّر صوت', '📌': 'دبوس', '🎓': 'قبعة تخرّج', '🏆': 'كأس', // allow-emoji: a11y name map for the admin-picker palette above | {create.isError && <div className="auth-error">تعذَّر النشر.</div>} |
| {canPlatform && <option value="PLATFORM">على مستوى المنصّة</option>} | pendingLabel="جارٍ…" |
| <span className="text-sm text-muted">إبقاء الإعلان في أعلى التغذية</span> | ? 'جارٍ…' |
| {create.isError && <div className="auth-error">تعذَّر النشر. تحقَّق من البيانات.</div>} | ? 'تعذَّر التحميل.' |
| pendingLabel="جارٍ النشر…" | ? 'لا مقرّرات.' |
| ? 'جارٍ تحميل مقرّراتك…' | message: 'النهاية بعد البداية', path: ['endsAt'], |
| ? 'تعذَّر تحميل المقرّرات.' | '📅': 'تقويم', '🎤': 'ميكروفون', '🎓': 'قبعة', '🔬': 'مجهر', // allow-emoji: a11y name map for the admin-picker palette above |
| ? 'لا توجد مقرّرات مُسنَدة إليك حالياً.' | '⚽': 'كرة', '🎨': 'ألوان', '🧑‍🏫': 'مدرّس', '🤝': 'مصافحة', // allow-emoji: a11y name map for the admin-picker palette above |
| message: 'النهاية يجب أن تكون بعد البداية', path: ['endsAt'], | <input type="text" placeholder="قاعة 301…" {...form.register('location')} className="auth-input" /> |
| '📅': 'تقويم', '🎤': 'ميكروفون', '🎓': 'قبعة تخرّج', '🔬': 'مجهر', // allow-emoji: a11y name map for the admin-picker palette above | <FormField label="السعة"> |
| '⚽': 'كرة قدم', '🎨': 'لوحة ألوان', '🧑‍🏫': 'مدرّس', '🤝': 'مصافحة', // allow-emoji: a11y name map for the admin-picker palette above | {create.isError && <div className="auth-error">تعذَّر الإنشاء.</div>} |
| <input type="text" placeholder="مدرَج الكلّيّة، قاعة 301…" {...form.register('location')} className="auth-input" /> | pendingLabel="جارٍ…" |
| <FormField label="السعة القصوى"> | submitLabel="إنشاء" |
| {create.isError && <div className="auth-error">تعذَّر إنشاء الفعاليّة — تحقَّق من البيانات.</div>} |  |
| pendingLabel="جارٍ الحفظ…" |  |
| submitLabel="إنشاء الفعاليّة" |  |

## frontend/src/pages/competitions/CompetitionsPages.tsx (37 − / 32 +)

| before (removed) | after (added) |
|---|---|
| JUDGED: 'تمّ التحكيم', | JUDGED: 'محكّمة', |
| '💻': 'حاسوب', '🎨': 'لوحة ألوان', '🎤': 'ميكروفون', '📊': 'مخطط بياني', // allow-emoji: a11y name map for the admin-picker palette above | '💻': 'حاسوب', '🎨': 'ألوان', '🎤': 'ميكروفون', '📊': 'مخطط', // allow-emoji: a11y name map for the admin-picker palette above |
| description="شارك في تحديات المعرفة والابتكار، أو نظِّم مسابقتك الخاصّة." | { label: 'مفتوحة', value: kpiValue(stats.open), tone: 'positive' }, |
| { label: 'مسابقات مفتوحة', value: kpiValue(stats.open), tone: 'positive' }, | { label: 'المشاركات', value: kpiValue(stats.totalEntries) }, |
| { label: 'إجمالي المشاركات', value: kpiValue(stats.totalEntries) }, | ['all', 'الكل'], ['OPEN', 'مفتوحة'], ['CLOSED', 'مغلقة'], ['JUDGED', 'محكّمة'], |
| ['all', 'الكل'], ['OPEN', 'مفتوحة'], ['CLOSED', 'مغلقة'], ['JUDGED', 'تمّ التحكيم'], | title="لا مسابقات" |
| title="لا توجد مسابقات بعد" | أنشئ مسابقة |
| ? 'ابدأ أوّل تحدٍّ للمعرفة على المنصّة وادعُ الطلاب للمشاركة.' | title="لا مسابقات" |
| : 'ستظهر المسابقات المتاحة هنا فور إطلاقها من منظّميها.'} | عرض الكل |
| أنشئ أوّل مسابقة | ? (submissionEnded(c) \|\| c.status !== 'OPEN' ? 'لا مشاركات' : 'كن الأول') |
| title="لا توجد مسابقات في هذه الفئة" | المسابقات |
| description="جرّب فئة أخرى أو اعرض كل المسابقات." | ? (canEnter ? 'كن الأول' : 'لا مشاركات') |
| عرض كل المسابقات | {closer.isPending ? 'جارٍ…' : 'إغلاق المسابقة'} |
| ? (submissionEnded(c) \|\| c.status !== 'OPEN' ? 'لا مشاركات' : 'كن أول المشاركين') | title={!someScored ? 'قَيِّم أوّلاً' : undefined} |
| كل المسابقات | {judge.isPending ? 'جارٍ…' : allScored ? 'إعلان النتائج' : 'إعلان النتائج (بلا تقييم)'} |
| ? (canEnter ? 'كن أول المشاركين' : 'لا مشاركات') | {closer.isError ? 'تعذَّر الإغلاق.' : 'تعذَّر النشر.'} |
| {closer.isPending ? 'جارٍ الإغلاق…' : 'إغلاق المسابقة'} | title="لا مشاركات" |
| title={!someScored ? 'قَيِّم مشاركة واحدة على الأقلّ أوّلاً' : undefined} | <Icon icon={FileText} size={12} /> مرفق |
| {judge.isPending ? 'جارٍ النشر…' : allScored ? 'إعلان النتائج' : 'إعلان النتائج (مشاركات بلا تقييم)'} | message="سيُوقف الاستقبال نهائياً." |
| {closer.isError ? 'تعذَّر إغلاق المسابقة.' : 'تعذَّر إعلان النتائج.'} تحقّق من اتصالك وحاول مرة أخرى. | ? 'ستُنشر النتائج.' |
| title="لم يشارك أحد بعد" | : `${countAr(unscoredCount, ['مشاركة', 'مشاركتان', 'مشاركات', 'مشاركة'])} بلا تقييم` |
| description={canEnter ? 'كن أوّل من يشارك!' : 'انتهت مهلة التقديم على هذه المسابقة.'} | <label htmlFor={inputId} className="text-xxs text-subtle">التقييم</label> |
| <Icon icon={FileText} size={12} /> ملف مُرفَق | <span className="visually-hidden">تمّ الحفظ</span> |
| message="سيُوقف استقبال المشاركات فوراً، ولا تقديم أو تعديل بعد الإغلاق." | <span className="form-error-msg">تعذَّر الحفظ.</span> |
| ? 'ستُنشر النتائج والترتيب النهائي لجميع المشاركين.' | 'الموعد في المستقبل', |
| : `${countAr(unscoredCount, ['مشاركة واحدة بلا تقييم', 'مشاركتان بلا تقييم', 'مشاركات بلا تقييم', 'مشاركة بلا تقييم'])} — تترتّب في نهاية اللوحة عند الإعلان.` | <div className="form-error" role="alert">تعذَّر الإنشاء.</div> |
| <label htmlFor={inputId} className="text-xxs text-subtle">التقييم (من 100)</label> | {create.isPending ? 'جارٍ…' : 'إنشاء'} |
| <span className="visually-hidden">تمّ حفظ التقييم</span> | <FormField label="العنوان" error={form.formState.errors.title?.message}> |
| <span className="form-error-msg">تعذَّر حفظ التقييم.</span> | <FormField label="المحتوى" error={form.formState.errors.body?.message}> |
| 'يجب أن يكون الموعد النهائي في المستقبل', | <FormField label="رابط الملف" error={form.formState.errors.fileUrl?.message}> |
| <div className="form-error" role="alert">تعذَّر إنشاء المسابقة — تحقَّق من البيانات.</div> | {enter.isError && <div className="form-error" role="alert">تعذَّر الإرسال.</div>} |
| {create.isPending ? 'جارٍ الإنشاء…' : 'إنشاء'} | {enter.isPending ? 'جارٍ…' : existing ? 'حفظ التعديلات' : 'إرسال'} |
| <FormField label="عنوان المشاركة" error={form.formState.errors.title?.message}> |  |
| <FormField label="الوصف / المحتوى" error={form.formState.errors.body?.message}> |  |
| <FormField label="رابط الملف (اختياري)" error={form.formState.errors.fileUrl?.message}> |  |
| {enter.isError && <div className="form-error" role="alert">تعذَّر تقديم المشاركة — تحقَّق من البيانات.</div>} |  |
| {enter.isPending ? 'جارٍ الإرسال…' : existing ? 'حفظ التعديلات' : 'إرسال'} |  |

## frontend/src/pages/exams/OnlineExamsPages.tsx (55 − / 42 +)

| before (removed) | after (added) |
|---|---|
| return apiErrorMessage(error, 'تعذَّر بدء الاختبار — تحقّق من اتصالك.'); | return apiErrorMessage(error, 'تعذَّر بدء الاختبار.'); |
| eyebrow="مركز الاختبارات" | title="الاختبارات" |
| title="الاختبارات الإلكترونية" | srLabel={countAr(available.length, ['اختبار', 'اختباران', 'اختبارات', 'اختباراً'])} |
| description="اختبارات موحَّدة معتمدة — لا إعادة بعد التسليم إلا التدريبية." | label="لا اختبارات متاحة" |
| srLabel={countAr(available.length, ['اختبار واحد', 'اختباران', 'اختبارات', 'اختباراً'])} | srLabel={countAr(unavailable.length, ['اختبار', 'اختباران', 'اختبارات', 'اختباراً'])} |
| label="لا توجد اختبارات متاحة حالياً" | srLabel={countAr(taken.length, ['اختبار', 'اختباران', 'اختبارات', 'اختباراً'])} |
| ? 'مواعيد المغلقة في القائمة أدناه.' | {'محاولة قيد التقدم'} |
| srLabel={countAr(unavailable.length, ['اختبار واحد', 'اختباران', 'اختبارات', 'اختباراً'])} | : <span className="oex-review-missed">لم تُجب</span>} |
| srLabel={countAr(taken.length, ['اختبار واحد', 'اختباران', 'اختبارات', 'اختباراً'])} | : 'التسليم نهائي — لا إعادة.'; |
| {ws === 'closed' ? 'محاولة قيد التقدم' : 'محاولة قيد التقدم — متابعة'} | setSubmitError(apiErrorMessage(e, 'تعذَّر تسليم الاختبار.')); |
| : <span className="oex-review-missed">لم تُجب عن هذا السؤال</span>} | setUrgentNote('أقلّ من دقيقتين — تسليم تلقائي.'); |
| : 'بعد التسليم لا تعديل ولا إعادة.'; | العودة للاختبارات |
| setSubmitError(apiErrorMessage(e, 'تعذَّر تسليم الاختبار — حاول مرة أخرى.')); | {expired ? 'انتهت مدة المحاولة' : 'أنهيت الاختبار مسبقاً'} |
| setUrgentNote('أقلّ من دقيقتين — تسليم تلقائي عند الانتهاء.'); | <p className="oex-result-note">لا نتيجة ولا إعادة.</p> |
| العودة إلى الاختبارات | ? 'درجة أولية — بانتظار الأستاذ.' |
| {expired ? 'انتهت مدة هذه المحاولة' : 'لقد أكملت هذا الاختبار مسبقاً'} | : 'لا إعادة بعد التسليم.'} |
| <p className="oex-result-note">انتهى الوقت دون تسليم — لا نتيجة ولا إعادة.</p> | <span className="form-error-msg">تعذَّر جلب نتيجتك.</span> |
| ? 'درجة أولية آلية — المقالية بانتظار الأستاذ.' | <button type="button" className="btn ghost sm" onClick={() => void examsQ.refetch()}>إعادة</button> |
| : 'لا يمكن إعادة المحاولة بعد التسليم.'} | <p className="oex-result-note">النتيجة قيد الاحتساب أو بانتظار المقالية.</p> |
| <p className="oex-result-note">المراجعة متاحة بعد اكتمال التصحيح.</p> | العودة للاختبارات |
| <span className="form-error-msg">تعذَّر جلب نتيجتك — تحقّق من اتصالك.</span> | {hasLiveAttempt ? 'محاولة قيد التقدم' : 'جاهز للبدء؟'} |
| <button type="button" className="btn ghost sm" onClick={() => void examsQ.refetch()}>إعادة المحاولة</button> | ? 'الوقت لم يتوقف — إجاباتك محفوظة.' |
| <p className="oex-result-note">لا يمكن إعادة المحاولة بعد التسليم.</p> | : 'المؤقّت يبدأ بأول ضغطة ولا يتوقف.'} |
| <p className="oex-result-note">النتيجة قيد الاحتساب أو بانتظار تقييم المقالية.</p> | العودة للاختبارات |
| العودة إلى الاختبارات | ? <>{countAr(result.needsManual, ['سؤال', 'سؤالان', 'أسئلة', 'سؤالاً'])} بحاجة لتقييم الأستاذ.</> |
| {hasLiveAttempt ? 'لديك محاولة قيد التقدم' : 'هل أنت مستعد للبدء؟'} | : 'تم الاحتساب فوراً.'} |
| ? 'الوقت لم يتوقف — إجاباتك كما تركتها.' | <p className="oex-result-note">المراجعة بعد اكتمال التصحيح.</p> |
| : 'المؤقّت يبدأ مع أول ضغطة ولا يتوقف.'} | : `تعذَّر حفظ إجابات الأسئلة ${failedNumbers.slice(0, 3).join(' و')}${failedNumbers.length > 3 ? ' وأخرى' : ''} — أعد الإجابة`} |
| العودة إلى الاختبارات | srLabel={countAr(attempt.questions.length, ['سؤال', 'سؤالان', 'أسئلة', 'سؤالاً'])} |
| ? <>{countAr(result.needsManual, ['سؤال', 'سؤالان', 'أسئلة', 'سؤالاً'])} بحاجة لتقييم الأستاذ — الدرجة النهائية بعد المراجعة.</> | label="لا أسئلة في هذا الاختبار" |
| : 'تم احتساب النتيجة فوراً.'} | ? 'الإجابة أطول من الحد (4000 حرفًا)' |
| <p className="oex-result-note">المراجعة متاحة بعد اكتمال التصحيح اليدوي.</p> | : 'أُجيب عن الكل'} |
| : `تعذَّر حفظ إجابات الأسئلة ${failedNumbers.slice(0, 3).join(' و')}${failedNumbers.length > 3 ? ' وأخرى' : ''} — أعد الإجابة عليها`} | ? `${countAr(unanswered, ['سؤال واحد بدون إجابة', 'سؤالان بدون إجابة', 'أسئلة بدون إجابة', 'سؤالاً بدون إجابة'])}. ${finalityNote}` |
| srLabel={countAr(attempt.questions.length, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])} | cancelLabel="مراجعة" |
| label="لا توجد أسئلة في هذا الاختبار" | الأسئلة —{' '} |
| note="لا أسئلة معتمدة بعد — سلِّم كما هي أو راجع القائمة." | ? countAr(questions.length, ['سؤال', 'سؤالان', 'أسئلة', 'سؤالاً']) |
| ? 'الإجابة أطول من الحد (4000 حرفًا) — اختصرها ليُحفظ' | {apiErrorMessage(tplQ.error, 'تعذَّر تحميل أسئلة القالب — راجع أولًا.')} |
| : 'أُجيب عن كل الأسئلة'} | {countAr(points, ['نقطة', 'نقطتان', 'نقاط', 'نقطة'])} |
| ? `لديك ${countAr(unanswered, ['سؤال واحد بدون إجابة', 'سؤالان بدون إجابة', 'أسئلة بدون إجابة', 'سؤالاً بدون إجابة'])}. ${finalityNote}` | setActionError({ id, approve, message: apiErrorMessage(e, 'تعذَّر تنفيذ القرار.') }); |
| cancelLabel="مراجعة إجاباتي" | title="الطابور فارغ" |
| أسئلة القالب —{' '} | placeholder="ملاحظات (اختياري)…" |
| ? countAr(questions.length, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً']) | إعادة |
| {apiErrorMessage(tplQ.error, 'تعذَّر تحميل أسئلة القالب — راجع قبل القرار.')} |  |
| {countAr(points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])} |  |
| setActionError({ id, approve, message: apiErrorMessage(e, 'تعذَّر تنفيذ القرار — تحقّق من اتصالك.') }); |  |
| subtitle="اعتماد قوالب الاختبارات قبل إتاحتها للطلاب." |  |
| trend: kpiKnown ? (pendingCount === 0 ? 'لا شيء ينتظر' : 'تنتظر قرارك') : 'بانتظار البيانات', |  |
| ? (questionsAwaiting === 0 ? 'لا أسئلة معلّقة' : 'أسئلة القوالب المعلّقة') |  |
| : 'بانتظار البيانات', |  |
| label: 'حالة النظام', |  |
| value: queueQ.isPending ? '…' : queueQ.isError ? 'تعذّر الاتصال' : 'نشط', |  |
| trend: queueQ.isError ? 'تعذّر جلب الطابور' : kpiKnown ? 'اتصال سليم' : 'بانتظار البيانات', |  |
| title="لا شيء بانتظار المراجعة" |  |
| placeholder="ملاحظات للمؤلف (اختياري)…" |  |
| إعادة المحاولة |  |

## frontend/src/pages/legal/LegalPages.tsx (116 − / 99 +)

| before (removed) | after (added) |
|---|---|
| description: 'ما تجمعه مدارك من بيانات ولماذا وأين تُخزَّن، وحقوقك — من سلوك المنصّة الفعلي.', | description: 'ما نجمعه ولماذا وأين يُخزَّن، وحقوقك.', |
| lede="ما نجمعه فعلًا من سلوك المنصّة — لا وعود. ما لا نعرفه بعد يُكتب بوضوح: [يُستكمل قبل الإطلاق]." | lede="من السلوك الفعلي — لا وعود." |
| <li>عند إنشاء الحساب: <strong>البريد الإلكتروني والاسم والدور</strong> (طالب أو أستاذ أو مسجل عام…) ولون الصورة الرمزية وحروفها الأولى.</li> | <li>الحساب: <strong>البريد والاسم والدور</strong> ولون الصورة الرمزية.</li> |
| <li>للطالب: الكلية والقسم والسنة الدراسية ورقم التسجيل.</li> | <li>للطالب: الكلية والقسم والسنة ورقم التسجيل.</li> |
| <strong>كلمة المرور لا تُخزَّن نصًا أبدًا</strong> — تُحوَّل عند إنشائها إلى تجزئة عبر خوارزمية <CodeRun>argon2</CodeRun>. | <strong>كلمة المرور لا تُخزَّن نصًا أبدًا</strong> — تُجزَّأ عبر <CodeRun>argon2</CodeRun>. |
| وما تكتبه داخل المنصّة يُخزَّن مع حسابك: الرسائل والإشعارات، محادثات المساعد الأكاديمي، | وما تكتبه يُخزَّن مع حسابك: الرسائل، محادثات المساعد، بحوثك وموادك، وإجابات الاختبارات — وسجلّ تدقيق. |
| البحوث والمواد التي ترفعها، وإجابات الاختبارات. وتحتفظ المنصّة بسجلّ تدقيق لعملياتها (من فعل ماذا ومتى). | <li>تسجيل المقررات والتقدّم والمصفوفة.</li> |
| <li>تسجيل المقررات ومتابعة التقدّم والمصفوفة.</li> | <li>لا نبيع بياناتك ولا نشاركها، ولا تحليلات ولا إعلانات.</li> |
| <li>لا نبيع بياناتك ولا نشاركها.</li> | خدمة الويب وقاعدة <CodeRun>PostgreSQL</CodeRun> على <strong>Render</strong> و<strong>Neon</strong>، |
| <li>لا تحليلات ولا إعلانات.</li> | والمرفوعات في مخزن يحدده المشغّل — لا خوادم أخرى. |
| خدمة الويب تعمل على <strong>Render</strong>، وقاعدة البيانات <CodeRun>PostgreSQL</CodeRun> مُدارة على | رمز الوصول خلال <CodeRun>15m</CodeRun> ورمز التحديث خلال |
| <strong> Neon</strong>. الملفات المرفوعة (البحوث والمواد) تُخزَّن في مخزن يحدده المشغّل: قرص محلي، أو مخزن | <CodeRun> 7d</CodeRun>، وسجل قرارك يبقى حتى تغييره. سياسة الاحتفاظ الكاملة |
| متوافق مع <CodeRun>S3</CodeRun>، أو داخل قاعدة البيانات نفسها. لا خوادم أخرى تُستقبل بياناتك. | وطلب الحذف <PendingTag />. |
| اليوم: رمز الوصول ينتهي خلال <CodeRun>15m</CodeRun> ورمز تحديث الجلسة خلال | عدّل ملفك وكلمة مرورك أي وقت — التغيير يُنهي جلساتك على كل الأجهزة. |
| <CodeRun> 7d</CodeRun>، وسجل قرارك على لافتة التخزين يبقى حتى تغيير قرارك. أما سياسة الاحتفاظ الكاملة | وللتصدير أو الحذف: قناة التواصل (08) — الآلية <PendingTag />. |
| وطلب حذف الحساب <PendingTag /> — وحتى ذلك الحين تُعامل جميع البيانات كبيانات عرض. | المساعد الذكي — ميزة اختيارية عبر مزوّد متوافق مع <CodeRun>OpenAI</CodeRun> |
| يمكنك تعديل بيانات ملفك من صفحتك، وتغيير كلمة مرورك في أي وقت — تُنهي التغييرة جلساتك | يحدده المشغّل (<CodeRun>openai</CodeRun>/<CodeRun>openrouter</CodeRun>/<CodeRun>groq</CodeRun>). |
| على كل الأجهزة. ولطلب تصدير بياناتك أو حذف حسابك فالطريق اليوم هو قناة التواصل (القسم 08) — | <li>عند التعطيل: أداة محلية داخل الخادم، لا إرسال للخارج.</li> |
| آلية التنفيذ ومدة الاستجابة <PendingTag />. | <li>المزوّد الفعلي وشروط معالجته للمحادثات <PendingTag />.</li> |
| طرف واحد محتمل فقط: <strong>المساعد الأكاديمي الذكي</strong> — ميزة اختيارية عبر مزوّد | <LegalSectionBar index={7} title="الكوكيز والتخزين" id="privacy-storage" /> |
| متوافق مع <CodeRun>OpenAI</CodeRun> يحدده المشغّل، ويُوسم بصدق في الواجهة | <strong>كوكي واحد</strong> و<strong> تسعة مفاتيح تخزين محلي</strong> — |
| (<CodeRun>openai</CodeRun> أو <CodeRun>openrouter</CodeRun> أو <CodeRun>groq</CodeRun> حسب المضيف). | ما يُحذف عند الرفض في |
| <li>عند تعطيل المزوّد: أداة محلية داخل الخادم، لا إرسال للخارج.</li> | <Link to="/legal/cookies" className="lg-link">صفحة التخزين</Link>. |
| <li>المزوّد الفعلي المُعد في الإنتاج <PendingTag />.</li> | القناة اليوم: التسجيل المبكر — لا بريد عام (التفاصيل في |
| <li>شروط معالجة المزوّد لمحتوى المحادثات <PendingTag />.</li> | <Link to="/contact" className="lg-link">صفحة التواصل</Link>). |
| غير ذلك: لا تحليلات، لا إعلانات، لا برامج تتبّع، لا خطوط من خدمات خارجية. | <p className="lg-p">تُراجع قبل الإطلاق وقبل أي تعديل جوهري.</p> |
| <LegalSectionBar index={7} title="ملفات تعريف الارتباط والتخزين المحلي" id="privacy-storage" /> | description: 'ما المنصّة وما ليست — وقواعد الحساب والمحتوى.', |
| تكتب مدارك على جهازك <strong>كوكيًا واحدًا</strong> (<CodeRun>mdrk_refresh</CodeRun>) و | lede="ما هي مدارك، وما ليست." |
| <strong> تسعة مفاتيح تخزين محلي</strong> — لكل مفتاح غرض معلن؛ الجدول الكامل مع ما يُحذف عند | مدارك منصّة تعليمية تقنية مستقلّة، عربية أولًا — لا تنتمي إلى مؤسّسة تعليمية ولا تمثّلها. |
| الرفض في <Link to="/legal/cookies" className="lg-link">صفحة التخزين المحلي</Link>. | <strong>مدارك ليست جامعة معتمدة ولا تمنح درجات</strong> — محتواها عرض تجريبي |
| قناة التواصل اليوم: التسجيل المبكر من صفحة البداية — لا بريد عام بعد. التفاصيل في | لـ«مؤسسة مدارك النموذجية». |
| <Link to="/contact" className="lg-link">صفحة التواصل</Link>. | كلمة المرور بين <CodeRun>12</CodeRun> و<CodeRun>72</CodeRun> محرفًا، وتُرفض الشائعة في قائمة المنع. أنت مسؤول عن حسابك وعمّا يُكتب منه. |
| تُراجع هذه الصاسة وتُختم قبل الإطلاق وقبل أي تعديل جوهري — التاريخ أسفل الصفحة. | للتجربة ننشر <strong>حسابات اختبار</strong> على <CodeRun>@test.ly</CodeRun> بكلمة مرور |
| description: 'شروط استخدام منصّة مدارك التجريبية — ما هي المنصّة وما ليست، وقواعد الحساب والمحتوى.', | معروفة — لا بيانات حقيقية ولا خصوصية. |
| lede="شروط قصيرة وصادقة لمنصّة تجريبية: ما هي مدارك بالضبط، وما ليست، وما نطلبه منك مقابل حسابك." | ما ترفعه وتكتبه يبقى لك — والفصل بينه وبين بيانات العرض في |
| مدارك منصّة تعليمية تقنية مستقلّة، عربية أولًا — لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ | <Link to="/legal/data" className="lg-link">صفحة البيانات</Link>. |
| وبيانات العرض داخلها تخصّ «مؤسسة مدارك النموذجية» الاصطناعية بالكامل. | المنصّة تجريبية وتُقدَّم <strong>«كما هي»</strong>: قد تتغير الميزات أو تتوقف دون إشعار — |
| <strong>مدارك ليست جامعة معتمدة ولا تمنح درجات</strong> — الكليات والمقررات والنتائج | ولا ضمانات استمرارية أو خلوًّا من الأخطاء. |
| داخلها محتوى عرض تجريبي. | تُشغَّل اليوم كمشروع تجريبي مستقل؛ الهوية القانونية للمشغّل <PendingTag />، والقانون |
| كلمة المرور يجب أن تكون بين <CodeRun>12</CodeRun> و<CodeRun>72</CodeRun> محرفًا، وتُرفض الكلمات | الحاكم <PendingTag />. |
| الشائعة المسجَّلة في قائمة المنع. أنت مسؤول عن حسابك وعمّا يُكتب منه. | قد نحدّثها — المرجع آخر تحديث أسفل الصفحة: |
| للتجربة ننشر <strong>حسابات اختبار</strong> على نطاق <CodeRun>@test.ly</CodeRun> بكلمة مرور واحدة | { key: 'madarek.consent', purpose: 'قرار لافتة التخزين (موافق/أرفض)', kind: 'أساسي', purge: 'هو القرار نفسه' }, |
| معروفة — حسابات مكشوفة بتصميمها: لا بيانات حقيقية فيها ولا خصوصية. | { key: 'madarek.consent.record', purpose: 'القرار مع طابعه الزمني (JSON)', kind: 'أساسي', purge: 'لا' }, |
| ما ترفعه وتكتبه أنت (بحوثك، موادك، رسائلك) يبقى لك — وبيانات العرض اصطناعية بالكامل. | { key: 'madarek-theme', purpose: 'المظهر: فاتح أو داكن أو النظام', kind: 'أساسي', purge: 'لا' }, |
| الفصل بينهما موثّق في <Link to="/legal/data" className="lg-link">صفحة البيانات</Link>. | { key: 'mdrk-theme-profile', purpose: 'ذاكرة المظهر قبل التحميل', kind: 'أساسي', purge: 'لا' }, |
| المنصّة تجريبية وتُقدَّم <strong>«كما هي»</strong>: قد تتغير الميزات أو تتوقف خدمات دون إشعار، | { key: 'mdrk-auth', purpose: 'جلسة الدخول: المستخدم والرمز وسياق المؤسسة', kind: 'أساسي', purge: 'لا' }, |
| ولا ضمانات للاستمرارية أو الخلوّ من الأخطاء. | { key: 'mdrk-ui', purpose: 'طيّ الشريط وآخر اللوحات (4)', kind: 'تفضيل', purge: 'نعم' }, |
| تُشغَّل مدارك حاليًا كمشروع تقني تجريبي مستقل؛ الهوية القانونية للمشغّل <PendingTag />، والقانون | { key: 'mdrk-doc-side-w', purpose: 'عرض اللوحة الجانبية في العارض', kind: 'تفضيل', purge: 'نعم' }, |
| الحاكم لهذه الشروط <PendingTag />. | { key: 'mdrk-academic-links', purpose: 'روابطك الأكاديمية — بياناتك أنت', kind: 'بيانات مستخدم', purge: 'لا تُدمَّر أبدًا' }, |
| قد نحدّث هذه الشروط مع تطوير المنصّة — آخر تحديث أسفل الصفحة هو المرجع: | { key: 'mdrk-auth::probe', purpose: 'فحص التخزين — يُكتب ويُحذف فورًا', kind: 'عابر', purge: 'ينظّف نفسه' }, |
| { key: 'madarek.consent', purpose: 'قرارك على لافتة التخزين (موافق/أرفض)', kind: 'أساسي', purge: 'لا — هو القرار نفسه' }, | description: 'الكوكي الوحيد ومفاتيح التخزين التسعة — الجدول الكامل.', |
| { key: 'madarek.consent.record', purpose: 'سجل القرار مع طابعه الزمني (JSON)', kind: 'أساسي', purge: 'لا' }, | lede="كوكي واحد وتسعة مفاتيح تخزين — لا تحليلات ولا تتبّع." |
| { key: 'madarek-theme', purpose: 'اختيارك للمظهر: فاتح أو داكن أو النظام', kind: 'أساسي', purge: 'لا' }, | التخزين المحلي يبقى على جهازك — لا يُرسل للخادم إلا ما يلزم طلبك، |
| { key: 'mdrk-theme-profile', purpose: 'ذاكرة المظهر قبل تحميل الصفحة', kind: 'أساسي', purge: 'لا' }, | والخطوط مستضافة داخل المنصّة. |
| { key: 'mdrk-auth', purpose: 'جلسة الدخول: المستخدم ورمز الوصول القصير وسياق المؤسسة', kind: 'أساسي', purge: 'لا' }, | <caption className="lg-table-caption">مفاتيح التخزين المحلي</caption> |
| { key: 'mdrk-ui', purpose: 'طيّ الشريط الجانبي وآخر اللوحات المفتوحة (4 على الأكثر)', kind: 'تفضيل', purge: 'نعم' }, | «يُحذف عند الرفض»: تُمسح مفاتيح التفضيلات — وتبقى بياناتك (القسم 04). |
| { key: 'mdrk-doc-side-w', purpose: 'عرض اللوحة الجانبية في عارض المستندات', kind: 'تفضيل', purge: 'نعم' }, | كوكي واحد فقط: <CodeRun>mdrk_refresh</CodeRun> — رمز تحديث الجلسة، <CodeRun>httpOnly</CodeRun> |
| { key: 'mdrk-academic-links', purpose: 'روابطك الأكاديمية التي تحفظها بنفسك — بياناتك أنت', kind: 'بيانات مستخدم', purge: 'لا — لا تُدمَّر أبدًا' }, | و<CodeRun>sameSite=strict</CodeRun>، محصور في المسار <CodeRun>/api/v1/auth</CodeRun>، |
| { key: 'mdrk-auth::probe', purpose: 'فحص توفر التخزين — يُكتب ويُحذف في اللحظة نفسها', kind: 'عابر', purge: 'ينظّف نفسه' }, | وينتهي خلال <CodeRun>7d</CodeRun> مع دوران الرمز. حذفه يسجّل خروجك من الجهاز. |
| description: 'الكوكي الوحيد ومفاتيح التخزين المحلي التسعة التي تكتبها منصّة مدارك — الجدول الكامل وما يُحذف عند الرفض.', | <LegalSectionBar index={4} title="عند الرفض" id="cookies-reject" /> |
| lede="هذه هي القائمة الكاملة لما تكتبه مدارك على جهازك: كوكي واحد وتسعة مفاتيح تخزين محلي — لا شيء غيرها، ولا تحليلات ولا تتبّع." | عند الرفض تُحذف مفاتيح التفضيلات <CodeRun>mdrk-ui</CodeRun> و<CodeRun>mdrk-doc-side-w</CodeRun> |
| التخزين المحلي يبقى على جهازك — لا يُرسل إلى الخادم إلا ما يلزم طلبك نفسه. لا سكربتات | وتُشتق من جديد، ويُحفظ قرار الرفض حتى لا تُسأل مجددًا. |
| تحليلات أو إعلانات أو تتبّع من أي طرف ثالث — والخطوط مستضافة داخل المنصّة. | أما <CodeRun>mdrk-academic-links</CodeRun> <strong>فلا يُمس عند الرفض |
| <caption className="lg-table-caption">مفاتيح التخزين المحلي التي تكتبها المنصّة — كاملة</caption> | أبدًا</strong>: بياناتك التي كتبتَها تبقى ملكك. |
| «يُحذف عند الرفض»: تُمسح مفاتيح التفضيلات القابلة للاشتقاق — وتبقى بياناتك أنت | امسح التخزين والكوكيز من إعدادات متصفحك متى شئت. |
| كما هي (التفصيل في القسم 04). | الجدول يُحدَّث مع أي مفتاح جديد. |
| كوكي واحد فقط: <CodeRun>mdrk_refresh</CodeRun> — يحمل رمز تحديث الجلسة، بسمات <CodeRun>httpOnly</CodeRun> | description: 'ما يُطبَّق فعلًا — لوحة مفاتيح، تقليل الحركة، تباين.', |
| (لا تقرؤه سكربتات الصفحة) و<CodeRun>sameSite=strict</CodeRun>، ومحصور في المسار <CodeRun>/api/v1/auth</CodeRun>، | lede="ما يشحنه التطبيق فعلًا — لا ادّعاء اجتياز قبل حدوثه." |
| وينتهي خلال <CodeRun>7d</CodeRun> مع دوران الرمز. حذفك له من المتصفح يعني تسجيل خروجك من هذا الجهاز. | <li>عربية أولًا: الواجهة <CodeRun>rtl</CodeRun> من الأساس.</li> |
| <LegalSectionBar index={4} title="الرفض وما يحدث عنده" id="cookies-reject" /> | <li>روابط «تخطَّ إلى المحتوى» في كل سطح، وتنقّل بلوحة المفاتيح وحلقات تركيز ظاهرة.</li> |
| عند الرفض تُحذف مفاتيح التفضيلات <CodeRun>mdrk-ui</CodeRun> و<CodeRun>mdrk-doc-side-w</CodeRun> — | <li>أرضية لمس <CodeRun>44px</CodeRun> للأهداف التفاعلية على الشاشات الصغيرة.</li> |
| كلاهما تُعيد المنصّة اشتقاقه افتراضيًا، فلا يتعطل شيء. ويُحفظ قرار الرفض نفسه | <li>احترام «تقليل الحركة» في النظام — حركات هادئة.</li> |
| حتى لا تُسأل في كل زيارة. | <li>بوابات تباين ضمن فحوص التكامل، فاتحًا وداكنًا.</li> |
| أما <CodeRun>mdrk-academic-links</CodeRun> (روابطك الأكاديمية) <strong>فلا يُمس عند الرفض | <li><CodeRun>IBM Plex Sans Arabic</CodeRun> للنص و<CodeRun>Geist Mono</CodeRun> للأرقام والرموز.</li> |
| أبدًا</strong>: بياناتك التي كتبتَها تبقى ملكك — وكذلك جلسة الدخول واختيار المظهر وذاكرته. | إن واجهت عائقًا فأخبرنا عبر <Link to="/contact" className="lg-link">قناة التواصل</Link>. |
| يمكنك في أي وقت مسح التخزين المحلي والكوكيز من إعدادات متصفحك — أدوات المنصّة لا تحتاج | description: 'الضوابط المطبَّقة فعلًا — التجزئة، دوران الجلسات، الحدود.', |
| أكثر من الجدول أعلاه لتعمل من جديد. | lede="الضوابط التي يشحنها النظام فعلًا." |
| الجدول يُحدَّث في الوقت نفسه مع أي مفتاح جديد يضيفه التطوير — التاريخ أسفل الصفحة. | <li>كلمات المرور تُجزَّأ بـ <CodeRun>argon2</CodeRun>، وسياستها <CodeRun>12-72</CodeRun> محرفًا مع قائمة منع.</li> |
| description: 'ما تطبّقه مدارك فعلًا لإمكانية الوصول — عربية أولًا، لوحة مفاتيح، تقليل الحركة، تباين.', | <li>رمز وصول قصير (<CodeRun>15m</CodeRun>) ورمز تحديث (<CodeRun>7d</CodeRun>) يدور عند كل تجديد، وتغيير كلمة المرور يُبطل جلسات كل الأجهزة.</li> |
| lede="هذا البيان يذكر ما يشحنه التطبيق فعلًا اليوم — لا ادّعاء اجتياز معيار رسمي قبل أن يحدث." | <li>رمز التحديث في كوكي <CodeRun>httpOnly</CodeRun> و<CodeRun>sameSite=strict</CodeRun> محصور في <CodeRun>/api/v1/auth</CodeRun> — لا يقرؤه سكربت في الصفحة.</li> |
| <li>عربية أولًا: الواجهة <CodeRun>rtl</CodeRun> من الأساس، لا طبقة مترجمة.</li> | <li>تحديد معدل المحاولات لكل IP، وقفل الحساب مؤقتًا بعد الفشل المتكرر.</li> |
| <li>روابط «تخطَّ إلى المحتوى» في كل سطح، وتنقّل منطقي بلوحة المفاتيح مع حلقات تركيز ظاهرة.</li> | <li>الأذونات تُفرض في الخادم لكل مسار حسب الدور — المرفوض يعيد <CodeRun>403</CodeRun> من الخادم نفسه.</li> |
| <li>أرضية لمس لا تقل عن <CodeRun>44px</CodeRun> للأهداف التفاعلية على الشاشات الصغيرة.</li> | لا شهادة <CodeRun>ISO</CodeRun> ولا <CodeRun>SOC</CodeRun> ولا اعتماد <CodeRun>GDPR</CodeRun> اليوم — |
| <li>احترام إعداد «تقليل الحركة» في النظام: تنهار الحركات إلى ظهور هادئ.</li> | وإن أُضيف اعتماد فسيُعلن مع وثيقته. |
| <li>بوابات تباين ضمن فحوص التكامل المستمرة، فاتحًا وداكنًا.</li> | رصدت ثغرة؟ بلّغنا عبر <Link to="/contact" className="lg-link">قناة التواصل</Link>. |
| <li>اقتران خطّي <CodeRun>IBM Plex Sans Arabic</CodeRun> للنص و<CodeRun>Geist Mono</CodeRun> للأرقام والرموز.</li> | سياسة الإفصاح (النطاق والاستجابة والملاذ الآمن) |
| <PendingTag /> — لا نعلن اجتيازًا لم نُختبر عليه. | description: 'الفصل بين البيانات الاصطناعية المبذورة وبياناتك الحقيقية.', |
| إن واجهت عائقًا فأخبرنا عبر <Link to="/contact" className="lg-link">قناة التواصل</Link> — وصف الخطوة | lede="ما الاصطناعي للعرض، وما كتبته أنت؟" |
| والمتصفح يعجّل الإصلاح. | <LegalSectionBar index={1} title="النوعان" id="data-types" /> |
| description: 'الضوابط الأمنية المطبَّقة فعلًا — تجزئة كلمات المرور، دوران الجلسات، الحدود.', | <strong>بيانات مبذورة اصطناعية بالكامل:</strong> «مؤسسة مدارك النموذجية» بكلياتها ومقرراتها، |
| lede="قائمة الضوابط التي يشحنها النظام فعلًا — لا شهادات ولا اعتمادات: لا ندّعي ما ليس لدينا." | والمستخدمون التجريبيون وحسابات <CodeRun>@test.ly</CodeRun> ونتائجهم — |
| <li>كلمات المرور تُجزَّأ بـ <CodeRun>argon2</CodeRun>، وسياستها <CodeRun>12-72</CodeRun> محرفًا مع قائمة منع للكلمات الشائعة.</li> | ولا تمثّل أحدًا حقيقيًا. |
| <li>رمز وصول قصير (<CodeRun>15m</CodeRun>) ورمز تحديث (<CodeRun>7d</CodeRun>) يدور عند كل تجديد؛ وتغيير كلمة المرور يُبطل جلسات كل الأجهزة فورًا.</li> | <strong>بياناتك الحقيقية:</strong> ما تدخله عند التسجيل، وما تكتبه أو ترفعه — |
| <li>رمز التحديث في كوكي <CodeRun>httpOnly</CodeRun> بسمة <CodeRun>sameSite=strict</CodeRun> محصور في <CodeRun>/api/v1/auth</CodeRun> — لا يستطيع أي سكربت في الصفحة قراءته.</li> | رسائلك، بحوثك، موادك، إجاباتك. |
| <li>تحديد معدل المحاولات لكل عنوان IP، وقفل الحساب مؤقتًا بعد المحاولات الفاشلة المتكررة.</li> | سجلّ القدرات <Link to="/capabilities" className="lg-link">«ما يعمل اليوم»</Link> يفصل الحقيقي |
| <li>الأذونات تُفرض في الخادم لكل مسار حسب الدور — المرفوض يعيد <CodeRun>403</CodeRun> من الخادم، لا من الواجهة فقط.</li> | من المحاكاة — والمنطق نفسه للبيانات: ما لم يُذكر حقيقيًا فهو عرض. |
| لا شهادة <CodeRun>ISO</CodeRun> ولا <CodeRun>SOC</CodeRun> ولا اعتماد <CodeRun>GDPR</CodeRun> — لا يوجد | النوعان في مكان واحد (التفصيل في <Link to="/legal/privacy" className="lg-link">سياسة الخصوصية</Link>). |
| أي منها اليوم، ولا نضع شعاراتها. إن أُضيف اعتماد يومًا فسيُعلن هنا مع وثيقته. | وجميع البيانات بيانات عرض حتى استكمال سياسة الاحتفاظ <PendingTag />. |
| إن رصدت ثغرة فبلّغنا عبر <Link to="/contact" className="lg-link">قناة التواصل</Link> — نقدّر الإبلاغ | المساعد الأكاديمي وحده قد يغادر الخادم — والتفصيل في سياسة الخصوصية. |
| المسؤول. سياسة الإفصاح التفصيلية (النطاق ومدة الاستجابة والملاذ الآمن) |  |
| description: 'الفصل بين البيانات الاصطناعية المبذورة وبياناتك الحقيقية داخل منصّة مدارك التجريبية.', |  |
| lede="سؤال واحد: ما الذي داخل مدارك اصطناعي للعرض، وما الذي بيانات حقيقية كتبتها أنت؟" |  |
| <LegalSectionBar index={1} title="ما الذي نجمعه — النوعان" id="data-types" /> |  |
| <strong>بيانات مبذورة اصطناعية بالكامل:</strong> «مؤسسة مدارك النموذجية» بكلياتها ومقرراتها |  |
| وخططها الدراسية، والمستخدمون التجريبيون وحسابات الاختبار <CodeRun>@test.ly</CodeRun> ونتائجهم — |  |
| كلها من سكربت البذرة لأغراض العرض، ولا تمثّل أحدًا حقيقيًا. |  |
| <strong>بياناتك الحقيقية:</strong> ما تدخله عند التسجيل (بريدك واسمك وملفك الأكاديمي)، وما |  |
| تكتبه أو ترفعه — رسائلك، بحوثك، موادك، إجاباتك. |  |
| سجلّ القدرات <Link to="/capabilities" className="lg-link">«ما يعمل اليوم»</Link> يفصل بصدق بين ما |  |
| يعمل حقيقة وما هو محاكاة — والمبدأ نفسه يسري على البيانات: ما لم يُذكر أنه حقيقي |  |
| فهو عرض تجريبي. |  |
| النوعان في المكان نفسه: الويب على <strong>Render</strong> وقاعدة <CodeRun>PostgreSQL</CodeRun> |  |
| على <strong>Neon</strong> (التفصيل في <Link to="/legal/privacy" className="lg-link">سياسة الخصوصية</Link>). |  |
| وتُعامل جميع البيانات كبيانات عرض حتى استكمال سياسة الاحتفاظ <PendingTag />. |  |
| المساعد الأكاديمي وحده قد يغادر الخادم (مزوّد متوافق مع <CodeRun>OpenAI</CodeRun> حسب الإعداد، أو |  |
| أداة محلية عند تعطيله) — والتفصيل في سياسة الخصوصية. لا تحليلات ولا إعلانات. |  |

## frontend/src/pages/owner/FeedbackInboxPage.tsx (5 − / 1 +)

| before (removed) | after (added) |
|---|---|
| description="كل «أبلغ عن مشكلة / اقتراح» — بسياقه الكامل." | <Card title="التقارير"> |
| <Card title="التقارير" subtitle="مفتوح → قيد المراجعة → أُصلح أو مُستبعد."> |  |
| description="يظهر تقريره هنا بسياقه الكامل." |  |
| <Icon icon={MessageSquarePlus} size={12} /> الودجت العائم على كل شاشة مسجّل الدخول هو مصدر هذه التقارير. |  |
| description="يصل التقرير هنا تلقائيًا — لا يُطلب من المستخدم شيء." |  |

## frontend/src/pages/owner/OwnerActivityPage.tsx (46 − / 28 +)

| before (removed) | after (added) |
|---|---|
| login:   { icon: LogIn, colorClass: 'green', label: 'تسجيل دخول' }, | const L_LOGIN = 'تسجيل دخول'; |
| roles:   { icon: UserCog, colorClass: 'purple', label: 'أدوار' }, | const L_LOGOUT = 'تسجيل خروج'; |
| system:  { icon: Server, colorClass: 'amber', label: 'نظام' }, | const L_ROLES = 'أدوار'; |
| error:   { icon: AlertTriangle, colorClass: 'red', label: 'خطأ' }, | const L_SYSTEM = 'نظام'; |
| if (action.startsWith('user.login') \|\| action.startsWith('auth.login')) return { category: 'login', label: 'تسجيل دخول' }; | const L_ERROR = 'خطأ'; |
| if (action.includes('login.failed')) return { category: 'error', label: 'محاولة دخول فاشلة' }; | const L_ROLE_EDIT = 'تعديل صلاحيات'; |
| if (action.startsWith('user.logout')) return { category: 'login', label: 'تسجيل خروج' }; | const L_ROLE_CHANGE = 'تغيير صلاحيات'; |
| if (action.startsWith('user.role') \|\| action.startsWith('user.status') \|\| action.startsWith('roles.')) return { category: 'roles', label: 'تعديل صلاحيات' }; | const L_ACCOUNT_STATUS = 'تعديل حالة الحساب'; |
| if (action.startsWith('user.created')) return { category: 'roles', label: 'إنشاء حساب' }; | const L_ENROLL = 'تسجيل مقرّر'; |
| ) return { category: 'roles', label: 'تعديل صلاحيات' }; | const L_USER_CREATED = 'إنشاء حساب'; |
| if (action.startsWith('ENROLLMENT_')) return { category: 'content', label: 'تسجيل في مقرّر' }; | if (action.includes('login.failed')) return { category: 'error', label: 'دخول فاشل' }; |
| if (action.includes('error') \|\| action.includes('failed')) return { category: 'error', label: 'خطأ' }; | 'user.login': 'دخول ناجح', |
| 'user.login': 'تسجيل دخول ناجح', | 'auth.login': 'دخول ناجح', |
| 'auth.login': 'تسجيل دخول ناجح', | USER_SCOPE_CHANGE: 'تعديل نطاق', |
| 'user.logout': 'تسجيل خروج', | TEACHER_POSITION: 'تعيين موقع', |
| 'user.created': 'إنشاء حساب', | ENROLLMENT_CREATED: 'تسجيل طالب', |
| 'user.role_changed': 'تغيير صلاحيات مستخدم', | ENROLLMENT_REMOVED: 'إلغاء تسجيل', |
| 'user.status_changed': 'تعديل حالة الحساب', | ALERT_RESOLVED: 'حلّ تنبيه', |
| 'enrollment.created': 'تسجيل في مقرّر', | SETTING_UPDATED: 'تحديث إعداد', |
| ROLE_CHANGE: 'تغيير صلاحيات مستخدم', | 'theme.update': 'تغيير المظهر', |
| STATUS_CHANGE: 'تعديل حالة الحساب', | 'onboarding.complete': 'إكمال التعريف', |
| USER_SCOPE_CHANGE: 'تعديل نطاق مستخدم', | if (n === 1) return 'حدث'; |
| TEACHER_POSITION: 'تعيين موقع أستاذ', | title="سجلّ النشاط" |
| ENROLLMENT_CREATED: 'تسجيل طالب في مقرّر', | label: 'الأحداث', |
| ENROLLMENT_REMOVED: 'إلغاء تسجيل طالب', | label: 'دخول', |
| ALERT_RESOLVED: 'حلّ تنبيه تشغيليّ', | hint: kpiKnown ? (kpi.failed === 0 ? 'لا إخفاقات' : 'التفاصيل أدناه') : 'بانتظار البيانات', |
| SETTING_UPDATED: 'تحديث إعداد المنصّة', | title={filter === 'all' ? 'لا أحداث بعد' : 'لا أحداث هنا'} |
| 'theme.update': 'تغيير مظهر المنصّة', | {expanded === event.id ? 'إخفاء' : 'عرض'} |
| 'onboarding.complete': 'إكمال جولة التعريف', |  |
| if (n === 1) return 'حدث واحد'; |  |
| { value: 'login', label: 'تسجيل دخول' }, |  |
| { value: 'content', label: 'محتوى' }, |  |
| { value: 'roles', label: 'أدوار' }, |  |
| { value: 'system', label: 'نظام' }, |  |
| title="سجل النشاط والمراقبة" |  |
| description="العمليّات المنفَّذة — حيّة من سجلّ التدقيق" |  |
| label: 'إجمالي الأحداث', |  |
| hint: 'المسجَّلة على المنصّة', |  |
| label: 'تسجيلات دخول', |  |
| hint: 'ضمن الصفحة الحاليّة', |  |
| hint: kpiKnown ? (kpi.failed === 0 ? 'لا إخفاقات ضمن الصفحة' : 'تحقّق من التفاصيل أدناه') : 'بانتظار البيانات', |  |
| hint: 'ضمن الصفحة الحاليّة', |  |
| title={filter === 'all' ? 'لا توجد أحداث مسجَّلة بعد' : 'لا أحداث في هذا التبويب'} |  |
| ? 'تُسجَّل الأحداث فور أول عمليّة.' |  |
| : 'جرِّب تبويباً آخر.'} |  |
| {expanded === event.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'} |  |

## frontend/src/pages/owner/OwnerAiPage.tsx (21 − / 16 +)

| before (removed) | after (added) |
|---|---|
| label: 'عدد الطلبات', | label: 'الطلبات', |
| description="مراقبة استخدام وأداء خدمات الذكاء الاصطناعيّ" | <Card title="حسب الميزة"><ChartSkeleton height={240} /></Card> |
| <Card title="الطلبات حسب الميزة"><ChartSkeleton height={240} /></Card> | <Card title="اتّجاه الاستخدام"><ChartSkeleton height={240} /></Card> |
| <Card title="اتّجاه الاستخدام (7 أيّام)"><ChartSkeleton height={240} /></Card> | <Card title="التفاصيل"><TableSkeleton rows={4} cols={4} /></Card> |
| <Card title="تفاصيل الاستخدام حسب الميزة"><TableSkeleton rows={4} cols={4} /></Card> | trend: data.successRate >= 90 ? 'مستقرّ' : 'راجع الأعطال', |
| trend: 'تراكميّة على المنصّة', | <Card title="حسب الميزة"> |
| trend: 'مقيسة من المزوّد', | description="تظهر المؤشّرات فور تسجيل أول طلب. الجهوزيّة تحدّدها إعدادات المزوّد — الأعلام تُسجَّل ولا تستهلكها بوابة تشغيل." |
| trend: data.successRate >= 90 ? 'تشغيل مستقرّ' : 'راجع الأعطال الأخيرة', | summary={`الأكثر استخداماً: ${FEATURE_LABELS[data.byFeature.reduce((a, b) => (b.count > a.count ? b : a)).feature] ?? '—'}`} |
| trend: 'زمن الردّ المتوسط', | caption: 'حسب الميزة', |
| <Card title="الطلبات حسب الميزة"> | <Card title="اتّجاه الاستخدام"> |
| description="تظهر المؤشّرات فور تسجيل أول طلب. الجهوزيّة تحدّدها إعدادات المزوّد — الأعلام والإعدادات تُسجَّل ولا تستهلكها بوابة تشغيل." | <EmptyState illustration="empty-list" title="لا بيانات بعد" /> |
| summary={`أكثر الميزات استخداماً: ${FEATURE_LABELS[data.byFeature.reduce((a, b) => (b.count > a.count ? b : a)).feature] ?? '—'}.`} | summary={`الذروة: ${formatNum(Math.max(...data.trend.map((t) => t.count)))}`} |
| caption: 'الطلبات حسب الميزة', | caption: 'الاتّجاه اليومي', |
| <Card title="اتّجاه الاستخدام (7 أيّام)"> | <Card title="التفاصيل"> |
| <EmptyState illustration="empty-list" title="لا توجد بيانات بعد" description="يُرسم الاتّجاه فور أول طلب." /> | <th scope="col">الحصة</th> |
| summary={`ذروة الاستخدام ${formatNum(Math.max(...data.trend.map((t) => t.count)))} طلب في يوم واحد.`} | <td data-label="الحصة"> |
| caption: 'اتّجاه الاستخدام اليومي', |  |
| <Card title="تفاصيل الاستخدام حسب الميزة"> |  |
| <th scope="col">الحصة من التوكنات</th> |  |
| <td data-label="الحصة من التوكنات"> |  |
| <span className="owner-share" title={`${formatNum(f.tokens)} من ${formatNum(data.totalTokens)} توكن`}> |  |

## frontend/src/pages/owner/OwnerAlertsPage.tsx (5 − / 3 +)

| before (removed) | after (added) |
|---|---|
| onSuccess: () => toast.success('أُغلق التنبيه وسُجّلت العمليّة في سجلّ النشاط.', { title: 'تمّ حلّ التنبيه' }), | onSuccess: () => toast.success('أُغلق التنبيه.', { title: 'تمّ الحلّ' }), |
| description="إدارة ومراقبة التنبيهات التشغيليّة — من سجلّ المنصّة." | سجلّ النشاط |
| description="كل الأنظمة طبيعيّة — تابع آخر العمليّات من سجلّ النشاط." | ? `سيُغلَق التنبيه نهائيًّا ويُسجَّل الحل باسمك.` |
| استعراض سجلّ النشاط |  |
| ? `سيُغلَق التنبيه نهائيًّا ويُسجَّل الحل باسمك؛ إذا استمر السبب فقد يُرفع تنبيه جديد — لا تراجع من هذه الصفحة.` |  |

## frontend/src/pages/owner/OwnerContentPage.tsx (10 − / 7 +)

| before (removed) | after (added) |
|---|---|
| description="إدارة الإعلانات، أعلام الميزات، والهويّة البصريّة للمنصّة" | بثّ إعلانات على مستوى المنصّة أو الكلّيّة أو القسم. |
| إنشاء وبثّ الإعلانات على مستوى المنصّة أو الكلّيّة أو القسم — مع أيقونة وخيار تثبيت. | فتح المجتمع |
| فتح المجتمع الجامعيّ | تُسجَّل وتُوثَّق في السجلّ، ولا تستهلكها بوابة تشغيل. |
| تشغيل الميزات عبر نظام الأعلام — تُسجَّل وتُوثَّق في السجلّ، ولا تستهلكها بوابة تشغيل: | تعديل ألوان العلامة التجاريّة ومحتوى الصفحة الرئيسيّة قيد التطوير — الألوان |
| الميزات تعمل بحالاتها المضمّنة في الشيفرة. | تُقرَأ حالياً من رموز نظام التصميم النشطة (فاتح/داكن). |
| تعديل ألوان العلامة التجاريّة (الأساسيّ، الثانويّ، التمييز) ومحتوى الصفحة الرئيسيّة قيد | محرّر العنوان والوصف ونصّ زرّ الصفحة الرئيسيّة قيد التطوير — النصوص |
| التطوير. حالياً تُعتمَد ألوان علامة مدارك الرسميّة المعتمدة في نظام التصميم — تُقرَأ | محدّدة في كود الصفحة. |
| مباشرةً من رموز نظام التصميم النشطة (فاتح/داكن) عند عرض الصفحة. |  |
| محرّر العنوان والوصف الفرعيّ ونصّ زرّ «ابدأ الآن» قيد التطوير — النصوص |  |
| الحاليّة محدّدة في كود الصفحة الرئيسيّة. |  |

## frontend/src/pages/owner/OwnerDashboardPage.tsx (63 − / 45 +)

| before (removed) | after (added) |
|---|---|
| 'user.login': 'تسجيل دخول', | const PAGE_TITLE = 'لوحة التحكم الرئيسية'; |
| 'auth.login': 'تسجيل دخول', | const STRIP_TITLE = 'يحتاج انتباهك'; |
| 'user.logout': 'تسجيل خروج', | const STRIP_PENDING_SUBTITLE = 'جارٍ التحقق…'; |
| 'user.role_changed': 'تغيير صلاحيات', | const BAND_PENDING_TEXT = 'جارٍ الجلب…'; |
| 'user.status_changed': 'تعديل حالة الحساب', | const LIVE_MONITOR_LABEL = 'المراقبة الحيّة'; |
| 'course.created': 'إنشاء مقرّر', | const USERS_CARD_TITLE = 'توزيع المستخدمين'; |
| 'course.updated': 'تحديث مقرّر', | const OPS_CARD_TITLE = 'الحالة التشغيليّة'; |
| 'enrollment.created': 'تسجيل في مقرّر', | const ENROLL_LABEL = 'تسجيل'; |
| ROLE_CHANGE: 'تغيير صلاحيات مستخدم', | const L_LOGIN = 'دخول'; |
| STATUS_CHANGE: 'تعديل حالة الحساب', | const L_ROLE_CHANGE = 'تغيير صلاحيات'; |
| USER_SCOPE_CHANGE: 'تعديل نطاق مستخدم', | const L_STATUS_CHANGE = 'تغيير حالة'; |
| TEACHER_POSITION: 'تعيين موقع أستاذ', | const L_COURSE_CREATED = 'إنشاء مقرّر'; |
| TEACHER_VERIFY: 'توثيق أستاذ', | const L_COURSE_UPDATED = 'تحديث مقرّر'; |
| ENROLLMENT_CREATED: 'تسجيل طالب في مقرّر', | 'user.logout': 'خروج', |
| ENROLLMENT_REMOVED: 'إلغاء تسجيل طالب', | USER_SCOPE_CHANGE: 'تعديل نطاق', |
| ALERT_RESOLVED: 'حلّ تنبيه تشغيليّ', | TEACHER_POSITION: 'تعيين موقع', |
| SETTING_UPDATED: 'تحديث إعداد المنصّة', | TEACHER_VERIFY: 'توثيق', |
| COURSE_CREATED: 'إنشاء مقرّر', | ENROLLMENT_REMOVED: 'إلغاء تسجيل', |
| COURSE_UPDATED: 'تحديث مقرّر', | ALERT_RESOLVED: 'حلّ تنبيه', |
| OFFERING_CREATED: 'إنشاء شعبة تدريس', | SETTING_UPDATED: 'تحديث إعداد', |
| 'theme.update': 'تغيير مظهر المنصّة', | OFFERING_CREATED: 'إنشاء شعبة', |
| 'onboarding.complete': 'إكمال جولة التعريف', | 'theme.update': 'تغيير المظهر', |
| TeacherProfile: 'ملف أستاذ', | 'onboarding.complete': 'إكمال التعريف', |
| UserPermission: 'صلاحية مستخدم', | TeacherProfile: 'ملف', |
| OperationalAlert: 'تنبيه تشغيليّ', | UserPermission: 'صلاحية', |
| PlatformSetting: 'إعداد منصّة', | OperationalAlert: 'تنبيه', |
| CourseOffering: 'شعبة تدريس', | PlatformSetting: 'إعداد', |
| return <StripSkeleton title="يحتاج انتباهك" subtitle="جارٍ التحقق من حالات تحتاج انتباهك…" />; | CourseOffering: 'شعبة', |
| hint: 'فتح التنبيهات التشغيليّة', | desc: `${countAr(idle, IDLE_TEACHER_FORMS)} لم تُسند إليهم مقرّرات`, |
| desc: `${countAr(idle, IDLE_TEACHER_FORMS)} لم تُسند إليهم مقرّرات — راجع أعباء التدريس`, | ? 'لا مستخدمين.' |
| hint: 'فتح لوحة التعليم', | : `${topSegment.label} الفئة الأكبر.`; |
| title="يحتاج انتباهك" | <span className="status-text">تعذّر جلب التنبيهات</span> |
| title="لوحة التحكم الرئيسية" | : 'النظام مستقرّ'} |
| description="نظرة شاملة وإحصائيات حيّة عن المنصة" | hint: `${formatNum(data.totalOfferings)} شعبة فاعلة`, |
| <span className="status-text">جارٍ جلب حالة التنبيهات…</span> | hint: 'تراكمية', |
| <StripSkeleton title="يحتاج انتباهك" subtitle="جارٍ التحقق من حالات تحتاج انتباهك…" /> | caption: 'توزيع الأدوار', |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[01]</span>توزيع المستخدمين</>}> | <span className="owner-health-label">جلسات نشطة</span> |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[02]</span>الحالة التشغيليّة</>}> | <span className="owner-health-label">بثّ مباشر</span> |
| title="لوحة التحكم الرئيسية" | <span className="owner-health-label">طلبات AI / دقيقة</span> |
| ? 'لا مستخدمين مسجَّلين بعد.' | <span className="owner-health-label">آخر نشاط</span> |
| : `${topSegment.label} الفئة الأكبر من مستخدمي المنصّة.`; | <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[03]</span>الأحداث الأخيرة</>} icon={Clock}> |
| <span className="status-text">تعذّر جلب حالة التنبيهات</span> | <EmptyState illustration="empty-list" title="لا أحداث" icon={FileWarning} /> |
| ? 'جارٍ جلب حالة التنبيهات…' | <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[04]</span>إجراءات</>} icon={ShieldCheck}> |
| : 'النظام يعمل بشكل طبيعي'} | التنبيهات |
| title="لوحة التحكم الرئيسية" | إعدادات النظام |
| description="نظرة شاملة وإحصائيات حيّة عن المنصة" |  |
| المراقبة الحيّة |  |
| hint: 'في هذه اللحظة', |  |
| hint: `${formatNum(data.totalOfferings)} شعبة تدريس فاعلة`, |  |
| hint: 'تسجيلات مقرّرات تراكمية', |  |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[01]</span>توزيع المستخدمين</>}> |  |
| caption: 'توزيع المستخدمين حسب الدور', |  |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[02]</span>الحالة التشغيليّة</>}> |  |
| <span className="owner-health-label">جلسات نشطة الآن</span> |  |
| <span className="owner-health-label">بثّ مباشر جارٍ</span> |  |
| <span className="owner-health-label">طلبات الذكاء الاصطناعيّ / دقيقة</span> |  |
| <span className="owner-health-label">آخر نشاط مسجَّل</span> |  |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[03]</span>الأحداث الأخيرة</>} icon={Clock} subtitle="آخر العمليّات على المنصّة"> |  |
| <EmptyState illustration="empty-list" title="لا توجد أحداث بعد" description="ستظهر أحدث العمليّات هنا فور حدوثها." icon={FileWarning} /> |  |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[04]</span>إجراءات سريعة</>} icon={ShieldCheck}> |  |
| المراقبة الحيّة |  |
| التنبيهات التشغيليّة |  |
| المزامنة وإعدادات النظام |  |

## frontend/src/pages/owner/OwnerEducationPage.tsx (26 − / 15 +)

| before (removed) | after (added) |
|---|---|
| label: 'عدد المقررات', | const PAGE_TITLE = 'النظرة التعليميّة'; |
| title="النظرة التعليميّة" | const BREADCRUMB_ROOT = 'لوحة المالك'; |
| breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'النظرة التعليميّة' }]} | const T_FACULTY = 'المقرّرات حسب الكلّيّة'; |
| <Card title="المقرّرات حسب الكلّيّة"><ChartSkeleton height={240} /></Card> | const T_TOP = 'أكثر المقرّرات تسجيلاً'; |
| <Card title="أكثر المقرّرات تسجيلاً"><TableSkeleton rows={5} cols={4} /></Card> | const T_WORKLOAD = 'توزيع حِمل أعضاء هيئة التدريس'; |
| <Card title="توزيع حِمل أعضاء هيئة التدريس"><ListSkeleton rows={5} /></Card> | const T_TREND = 'اتّجاه الحضور'; |
| <Card title="اتّجاه الحضور"><ChartSkeleton height={240} /></Card> | const L_COURSE_COUNT = 'عدد المقرّرات'; |
| title="النظرة التعليميّة" | { label: 'بدون عرض', n: workloadBuckets.idle, color: 'var(--neutral-400)', aria: 'نسبة الأساتذة بدون عرض هذا الفصل' }, |
| breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'النظرة التعليميّة' }]} | { label: 'متوسط التسجيل', value: formatNum(totals.avgEnrolment) }, |
| { label: 'بدون عرض هذا الفصل', n: workloadBuckets.idle, color: 'var(--neutral-400)', aria: 'نسبة الأساتذة بدون عرض هذا الفصل' }, | <EmptyState illustration="empty-courses" title="لا مقرّرات بعد" /> |
| title="النظرة التعليميّة" | columns: ['الكلّيّة', L_COURSE_COUNT], |
| description="إحصائيات المقرّرات وهيئة التدريس والطلاب" | <EmptyState illustration="empty-list" title="لا تسجيلات بعد" /> |
| breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'النظرة التعليميّة' }]} | <EmptyState illustration="empty-list" title="لا أساتذة بعد" /> |
| { label: 'متوسط التسجيل في العرض', value: formatNum(totals.avgEnrolment) }, | <Card title={T_TREND} subtitle="آخر 6 أشهر"> |
| <Card title="المقرّرات حسب الكلّيّة" subtitle="عدد المقرّرات المُدرَّجة في كل كلّيّة"> | <EmptyState illustration="empty-list" title="لا سجلّات حضور بعد" /> |
| <EmptyState illustration="empty-courses" title="لا مقرّرات بعد" description="تظهر حين تُسجَّل مقرّرات على الكلّيّات." /> |  |
| caption: 'المقرّرات حسب الكلّيّة', |  |
| columns: ['الكلّيّة', 'عدد المقرّرات'], |  |
| <Card title="أكثر المقرّرات تسجيلاً"> |  |
| <EmptyState illustration="empty-list" title="لا تسجيلات بعد" description="تظهر فور تسجيل الطلاب في العروض." /> |  |
| title="توزيع حِمل أعضاء هيئة التدريس" |  |
| subtitle="الأساتذة حسب عدد العروض هذا الفصل" |  |
| <EmptyState illustration="empty-list" title="لا يوجد أساتذة بعد" description="يُحسب التوزيع فور إسناد أول عرض." /> |  |
| <Card title="اتّجاه الحضور" subtitle="آخر 6 أشهر — يُحسب من سجلات الحضور الفعليّة"> |  |
| <EmptyState illustration="empty-list" title="لا توجد سجلّات حضور بعد" description="يبدأ الحساب فور أول جلسة حضور." /> |  |
| caption: 'اتّجاه الحضور الشهري', |  |

## frontend/src/pages/owner/OwnerGovernancePage.tsx (13 − / 9 +)

| before (removed) | after (added) |
|---|---|
| ? `مخطط خطّي لنموّ المستخدمين — مستخدمون جدد أسبوعياً على مدى ${growthWindow}` | ? `مخطط نموّ المستخدمين (${growthWindow})` |
| : 'مخطط خطّي لنموّ المستخدمين — مستخدمون جدد أسبوعياً'; | : 'مخطط نموّ المستخدمين'; |
| description="تتبّع الصلاحيات والنموّ وتحليل تسجيلات الدخول" | <EmptyState illustration="empty-list" title="لا نموّ بعد" description="" /> |
| trend: 'تجاوزات موثّقة في السجلّ', | ? 'أسبوع واحد فقط.' |
| trend: 'تعيينات وتحويلات', | : `ذروة النموّ: ${countAr(Math.max(...govData.weeklyGrowth.map((w) => w.count)), ['مستخدم جديد واحد', 'مستخدمان جديدان', 'مستخدمين جدد', 'مستخدماً جديداً'])}`} |
| trend: 'من باب التسجيل', | <Card title="تسجيلات الدخول"> |
| <EmptyState illustration="empty-list" title="لا توجد بيانات نموّ بعد" description="يُرسم المنحنى فور تسجيل أول مستخدم." /> | <EmptyState illustration="empty-list" title="لا محاولات" description="" /> |
| ? `أسبوع واحد حتى الآن — ${countAr(govData.weeklyGrowth[0]!.count, ['مستخدم جديد واحد', 'مستخدمان جديدان', 'مستخدمين جدد', 'مستخدماً جديداً'])} في أسبوعه الأول؛ يُرسم المنحنى فور تسجيل الأسبوع القادم.` | <Card title="التسجيلات اليوميّة"> |
| : `أعلى نموّ ${countAr(Math.max(...govData.weeklyGrowth.map((w) => w.count)), ['مستخدم جديد واحد', 'مستخدمان جديدان', 'مستخدمين جدد', 'مستخدماً جديداً'])} في أسبوع واحد.`} | <EmptyState illustration="empty-list" title="لا بيانات" description="" /> |
| <Card title="تسجيلات الدخول: ناجحة / فاشلة"> |  |
| <EmptyState illustration="empty-list" title="لا توجد محاولات دخول بعد" description="يظهر التوزيع فور أول محاولة دخول." /> |  |
| <Card title="تفاصيل تسجيلات الدخول اليوميّة"> |  |
| <EmptyState illustration="empty-list" title="لا توجد بيانات يوميّة" description="تُسجَّل المحاولات يوماً بيوم فور حدوثها." /> |  |

## frontend/src/pages/owner/OwnerInstitutionDetailPage.tsx (58 − / 40 +)

| before (removed) | after (added) |
|---|---|
| title={`${duplicateCount} سجلات متطابقة بلا محتوى — مجمّعة هنا، والسجلات كما هي`} | <span>{countAr(faculty.departmentCount, ['قسم', 'قسمان', 'أقسام', 'قسماً'])}</span> |
| <span>{countAr(faculty.departmentCount, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])}</span> | <span>{countAr(faculty.courseCount, ['مقرّر', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</span> |
| <span>{countAr(faculty.courseCount, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</span> | <span>{countAr(faculty.studentCount, ['طالب', 'طالبان', 'طلاب', 'طالباً'])}</span> |
| <span>{countAr(faculty.studentCount, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}</span> | {countAr(d.courses, ['مقرّر', 'مقرّران', 'مقرّرات', 'مقرّراً'])} · {countAr(d.teachers, ['مدرّس', 'مدرّسان', 'مدرّسون', 'مدرّساً'])} |
| title={open ? 'طيّ الأقسام' : 'توسيع الأقسام'} | toast.success(`أُضيفت كلّيّة «${facultyForm.name.trim()}».`); |
| {countAr(d.courses, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])} · {countAr(d.teachers, ['مدرّس واحد', 'مدرّسان', 'مدرّسون', 'مدرّساً'])} | toast.success(`أُضيف قسم «${deptForm.name.trim()}».`); |
| title={writesDisabled ? 'التعديلات الأكاديمية متاحة للمؤسسات النشطة فقط' : `إضافة قسم إلى «${faculty.name}»`} | toast.success(`أُضيف مقرّر «${courseForm.name}».`); |
| `أُضيفت كلّيّة «${facultyForm.name.trim()}» إلى «${institution?.name ?? ''}».`, | toast.success(`فُتحت شعبة «${offeringCourse.name}».`); |
| { title: 'تمّت الإضافة' }, | description="حُذفت أو تغيّر معرّفها." |
| `أُضيف قسم «${deptForm.name.trim()}» إلى «${deptTarget.name}».`, | العودة للمؤسسات |
| { title: 'تمّت الإضافة' }, | {countAr(institution.activeMembershipCount, ['عضو', 'عضوان', 'أعضاء', 'عضواً'])} |
| `أُضيف مقرّر «${courseForm.name}» إلى «${institution?.name ?? ''}».`, | title="المؤسسة معلّقة" |
| { title: 'تمّت الإضافة' }, | description="التعديلات للمؤسسات النشطة فقط." |
| `فُتحت شعبة «${offeringCourse.name}» للفصل «${offeringForm.term.trim()}».`, | subtitle={`${countAr(faculties.length, ['كلّيّة', 'كلّيّتان', 'كلّيّات', 'كلّيّة'])} · ${countAr(totalDepartments, ['قسم', 'قسمان', 'أقسام', 'قسماً'])}${foldedRows > 0 ? ` · ${foldedRows} سجلّ بذر مُجمَّع` : ''}`} |
| { title: 'تمّ فتح الشعبة' }, | {countAr(emptyCensus.length, ['كلّيّة بلا محتوى', 'كلّيتان بلا محتوى', 'كلّيّات بلا محتوى', 'كلّيّة بلا محتوى'])} |
| <p className="page-subtitle">لا توجد مؤسسة بمعرّف «{routeSlug}» على المنصّة.</p> | title="لا كليات بعد" |
| description="حُذفت أو تغيّر معرّفها — عد إلى قائمة المؤسسات واخترها." | ? countAr(coursesMeta.total, ['مقرّر', 'مقرّران', 'مقرّرات', 'مقرّراً']) |
| العودة إلى المؤسسات | <th scope="col">المقرّر</th> |
| {countAr(institution.activeMembershipCount, ['عضو نشط واحد', 'عضوان نشطان', 'أعضاء نشطون', 'عضواً نشطاً'])} | <td className="ws-id" data-label="المقرّر"> |
| title="هذه المؤسسة معلّقة" | <td className="admin-table-num font-mono" data-label="س.م">{c.credits}</td> |
| description="التعديلات الأكاديمية للمؤسسات النشطة فقط — فعّل المؤسسة من قائمة المؤسسات أولًا." | صفحة {formatNum(coursesMeta.page)} من {formatNum(coursesMeta.totalPages)} · {countAr(coursesMeta.total, ['مقرّر', 'مقرّران', 'مقرّرات', 'مقرّراً'])} |
| subtitle={`${countAr(faculties.length, ['كلّيّة واحدة', 'كلّيّتان', 'كلّيّات', 'كلّيّة'])} · ${countAr(totalDepartments, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])}${foldedRows > 0 ? ` · ${foldedRows} سجلّ بذر مكرّر مُجمَّع` : ''}`} | <h3 className="modal-title">إضافة كلّيّة</h3> |
| title={suspended ? 'التعديلات الأكاديمية متاحة للمؤسسات النشطة فقط' : undefined} | hint="مطلوب" |
| {countAr(emptyCensus.length, ['كلّيّة واحدة بلا محتوى بعد', 'كلّيتان بلا محتوى بعد', 'كلّيّات بلا محتوى بعد', 'كلّيّة بلا محتوى بعد'])} | description={apiErrorMessage(createFaculty.error, 'تعذَّر الاتصال.')} |
| {' — '}أقسام ومقرّرات وطلابها لم تُنشأ بعد | سيُضاف القسم إلى «{deptTarget.name}». |
| <span title={`${entry.duplicateCount} سجلات متطابقة بلا محتوى — مجمّعة، والسجلات كما هي`}> | description={apiErrorMessage(createDepartment.error, 'تعذَّر الاتصال.')} |
| title={suspended ? 'التعديلات الأكاديمية متاحة للمؤسسات النشطة فقط' : `إضافة قسم إلى «${entry.faculty.name}»`} | <h3 className="modal-title">إضافة مقرّر</h3> |
| title="لا كليات بعد في هذه المؤسسة" | <FormField label="كود المقرّر" id="owner-course-code"> |
| description="أنشئ أول كلّيّة من الزر أعلاه — بعدها الأقسام والمقرّرات والشُّعب." | hint={`أقسام «${institution.name}» فقط`} |
| ? countAr(coursesMeta.total, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً']) | {facultiesQ.isPending ? 'جارٍ التحميل…' : 'اختر القسم…'} |
| title={suspended ? 'التعديلات الأكاديمية متاحة للمؤسسات النشطة فقط' : undefined} | hint="بين 1 و10" |
| <th scope="col">اسم المقرّر</th> | description={apiErrorMessage(createCourse.error, 'تعذَّر الاتصال.')} |
| description="أضف أول مقرّر بعد إنشاء كلّيّة وقسم — الشُّعب من صف المقرّر." | سيُدرَّس «{offeringCourse.name}» في شعبة جديدة. |
| <td className="ws-id" data-label="اسم المقرّر"> | <FormField label="الفصل" id="owner-offering-term"> |
| <td className="admin-table-num font-mono" data-label="ساعات معتمدة">{c.credits}</td> | hint="أساتذة المؤسسة فقط" |
| title={suspended ? 'التعديلات الأكاديمية متاحة للمؤسسات النشطة فقط' : undefined} | {teachersQ.isPending ? 'جارٍ التحميل…' : 'اختر الأستاذ…'} |
| صفحة {formatNum(coursesMeta.page)} من {formatNum(coursesMeta.totalPages)} · {countAr(coursesMeta.total, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])} | <FormField label="السعة" id="owner-offering-capacity"> |
| <h3 className="modal-title">إضافة كلّيّة جديدة</h3> | title="تعذّر تحميل الأساتذة" |
| ستُضاف الكلّيّة إلى «{institution.name}». | description={apiErrorMessage(teachersQ.error, 'تعذَّر الاتصال.')} |
| hint="مطلوب — الكلّيّات تتميّز بالاسم داخل كل مدينة" | description={apiErrorMessage(createOffering.error, 'تعذَّر الاتصال.')} |
| description={apiErrorMessage(createFaculty.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')} |  |
| سيُضاف القسم إلى «{deptTarget.name}» في «{institution.name}». |  |
| description={apiErrorMessage(createDepartment.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')} |  |
| <h3 className="modal-title">إضافة مقرّر جديد</h3> |  |
| سيُضاف المقرّر إلى «{institution.name}». |  |
| <FormField label="كود المقرّر" id="owner-course-code" hint="مثال: CS101 — يظهر بخط أحادي في السجلّ"> |  |
| hint={`أقسام «${institution.name}» فقط — القسم يحدّد الكلّيّة`} |  |
| {facultiesQ.isPending ? 'جارٍ تحميل الأقسام…' : 'اختر القسم…'} |  |
| hint="بين 1 و10 — الزرّ معطّل خارجه" |  |
| description={apiErrorMessage(createCourse.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')} |  |
| سيُدرَّس مقرّر «{offeringCourse.name}» (<bdi>{offeringCourse.code}</bdi>) في الشعبة الجديدة داخل «{institution.name}». |  |
| <FormField label="الفصل الدراسي" id="owner-offering-term" hint="نص حرّ من 1 إلى 50 حرفًا — مثال: 2024-FALL"> |  |
| hint="أساتذة هذه المؤسسة فقط — لا تُسند الشُّعب إلا لنشط فيها" |  |
| {teachersQ.isPending ? 'جارٍ تحميل الأساتذة…' : 'اختر الأستاذ…'} |  |
| <FormField label="السعة" id="owner-offering-capacity" hint="أقصى عدد طلاب يمكن تسجيلهم في الشعبة"> |  |
| title="تعذّر تحميل قائمة الأساتذة" |  |
| description={apiErrorMessage(teachersQ.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')} |  |
| description={apiErrorMessage(createOffering.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')} |  |

## frontend/src/pages/owner/OwnerInstitutionsPage.tsx (28 − / 19 +)

| before (removed) | after (added) |
|---|---|
| subtitle="تُنشأ نشطة — ويعيَّن مسجلها العام بعد ذلك." | const SERVER_SILENT_MSG = 'لم يستجب الخادم.'; |
| <FormField label="اسم المؤسسة" error={nameProblem} hint="مطلوب — كما سيظهر لأعضاء المؤسسة"> | <FormField label="اسم المؤسسة" error={nameProblem}> |
| placeholder="مثلاً: أكاديمية طرابلس للعلوم" | <FormField label="بالإنجليزية (اختياري)"> |
| <FormField label="الاسم بالإنجليزية (اختياري)"> | hint="يُشتق تلقائيًا." |
| hint="أحرف لاتينية صغيرة وأرقام وشرطات؛ يُشتق تلقائيًا إن تُرك فارغًا" | <option value="new">مستخدم جديد</option> |
| description={apiErrorMessage(error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')} | <option value="existing">مستخدم قائم</option> |
| <option value="new">مستخدم جديد — يُنشأ حساب بكلمة مرور</option> | <FormField label="البريد الإلكتروني" error={emailProblem}> |
| <option value="existing">مستخدم قائم — يُربط بالمؤسسة</option> | <FormField label="كلمة المرور" error={passwordProblem} hint="12 حرفًا على الأقل"> |
| <FormField label="البريد الإلكتروني" error={emailProblem} hint="مطلوب"> | toast.success(`أُنشئت «${institution.name}».`, { title: 'تمّ الإنشاء' }); |
| <FormField label="كلمة المرور" error={passwordProblem} hint="مطلوبة — 12 حرفًا على الأقل"> | title: suspending ? 'تعليق' : 'تنشيط', |
| description={apiErrorMessage(error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')} | : `سيستعيدون وصولهم.`, |
| toast.success(`أُنشئت «${institution.name}» وهي نشطة الآن.`, { title: 'تمّ إنشاء المؤسسة' }); | { title: 'تمّ التحديث' }, |
| title: suspending ? 'تعليق المؤسسة' : 'تنشيط المؤسسة', | `عُيّن ${user.firstName} ${user.lastName} مسجلاً لـ«${target.name}».`, |
| : `سيستعيد الأعضاء النشطون وصولهم.`, | title: 'إلغاء العضوية', |
| { title: 'تمّ تحديث الحالة' }, | <th scope="col">الأعضاء</th> |
| apiErrorMessage(error, 'تعذّر تحديث حالة المؤسسة — حاول مجدداً.'), | <th scope="col">المسجّلون</th> |
| `تمّ تعيين ${user.firstName} ${user.lastName} مسجلاً عاماً لـ«${target.name}».`, | <td data-label="الأعضاء"> |
| title: 'إلغاء عضوية المسجل العام', | <td data-label="المسجّلون"> |
| apiErrorMessage(error, 'تعذّر إلغاء العضوية — حاول مجدداً.'), | <span className="text-xs text-subtle">لا مسجّلين</span> |
| apiErrorMessage(error, 'تعذّرت استعادة العضوية — حاول مجدداً.'), |  |
| description="أنشئ أول مؤسسة تعليمية من النموذج أعلاه لبدء استقبال أعضائها." |  |
| <th scope="col">الأعضاء النشطون</th> |  |
| <th scope="col">المسجلون العامّون</th> |  |
| <td data-label="الأعضاء النشطون"> |  |
| <td data-label="المسجلون العامّون"> |  |
| <span className="text-xs text-subtle">لا مسجلين عامّين بعد</span> |  |
| title={`فتح سياق «${institution.name}» وإعداد بنيتها الأكاديمية`} |  |
| title={`تعيين مسجل عام لـ«${institution.name}»`} |  |

## frontend/src/pages/owner/OwnerRealtimePage.tsx (12 − / 10 +)

| before (removed) | after (added) |
|---|---|
| 'تنبيه نشط واحد', 'تنبيهان نشطان', 'تنبيهات نشطة', 'تنبيهاً نشطاً', | 'تنبيه واحد', 'تنبيهان', 'تنبيهات', 'تنبيهاً', |
| description="العمليّات الحيّة في الوقت الفعليّ" | <Link to="/owner/alerts" className="btn accent sm">التنبيهات</Link> |
| <Link to="/owner/alerts" className="btn accent sm">التنبيهات التشغيليّة</Link> | <Link to="/owner/system" className="btn ghost sm">النظام</Link> |
| <Link to="/owner/system" className="btn ghost sm">النظام والتشغيل</Link> | ? 'جارٍ الجلب…' |
| ? 'جارٍ جلب حالة التنبيهات…' | ? 'تعذّر جلب التنبيهات' |
| ? 'تعذّر جلب حالة التنبيهات' | : 'طبيعيّ'} |
| ? `يوجد ${countAr(unresolvedAlerts.length, ACTIVE_ALERT_FORMS)}` | liveCell('الجلسات النشطة', data.activeSessions), |
| : 'النظام يعمل بشكل طبيعيّ'} | liveCell('طلبات AI / دقيقة', data.aiRequestsPerMin), |
| { label: liveLabel('الجلسات النشطة'), value: tickValue(data.activeSessions, 'الجلسات النشطة') }, | liveCell('بثّ مباشر', data.liveBroadcasts), |
| { label: liveLabel('طلبات AI / دقيقة'), value: tickValue(data.aiRequestsPerMin, 'طلبات AI / دقيقة') }, | liveCell('اختبارات جارية', data.activeExams), |
| { label: liveLabel('بثّ مباشر'), value: tickValue(data.liveBroadcasts, 'بثّ مباشر') }, |  |
| { label: liveLabel('اختبارات جارية'), value: tickValue(data.activeExams, 'اختبارات جارية') }, |  |

## frontend/src/pages/owner/OwnerSystemPage.tsx (33 − / 24 +)

| before (removed) | after (added) |
|---|---|
| toast.success('حُفظت الإعدادات المعدَّلة بنجاح.', { title: 'تمّ الحفظ' }); | const STORAGE_ROW_LABEL = 'حالة التخزين'; |
| `تعذّر حفظ ${failedSavesLabel(failedKeys.size)} — أُبقيت قيمه في المحرّر، حاول مجدداً.`, | const DISABLE_FLAG_LABEL = 'تعطيل الميزة'; |
| : 'لم يُتحقق بعد' | const ENABLE_FLAG_LABEL = 'تفعيل الميزة'; |
| <p className="page-subtitle">إدارة البنية التحتية وحالة الخدمات</p> | toast.success(`حُفظت ${failedSavesLabel(entries.length)}.`, { title: 'تمّ الحفظ' }); |
| <Link to="/owner/alerts" className="btn accent sm">التنبيهات التشغيليّة</Link> | `تعذّر حفظ ${failedSavesLabel(failedKeys.size)}.`, |
| trend: 'من حالة الاستعلام الحيّ', | : 'لم يُتحقق' |
| trend: 'سجلّ تشغيليّ', | <Link to="/owner/alerts" className="btn accent sm">التنبيهات</Link> |
| <span className="owner-health-label">حالة التخزين</span> | trend: 'سجلّ', |
| <span className="owner-health-label">حالة التخزين</span> | ? 'تعذّر جلب الحالة.' |
| ? 'تعذّر جلب حالة النظام — أعد المحاولة.' | : 'لا يُصرّح عن حالة تخزين الرفعات بعد.'} |
| : 'نسخة الخادم الحاليّة لا تُصرّح عن حالة تخزين الرفعات بعد.'} | <span className="owner-health-label">دوام الملفات</span> |
| <span className="owner-health-label">دوام الملفات المرفوعة</span> | لم يُتحقق الاتصال — تظهر الحالة بعد أول فحص. |
| لم يتحقّق الخادم من اتصال المخزن — تظهر الحالة بعد أول فحص. | تحقّق من متغيّرات <bdi>S3_*</bdi> وحالة المزوّد —{' '} |
| السائق مهيّأ بـ<bdi>S3</bdi> لكن آخر فحص لم يتلقَّ ردًّا. تحقّق من متغيّرات{' '} | الدوام يتطلب ضبط <code>STORAGE_DRIVER=s3</code> مع متغيّرات <bdi>S3_*</bdi> —{' '} |
| <bdi>S3_*</bdi> في لوحة البيئة ومن حالة المزوّد نفسه — الخطوات الكاملة في{' '} | الخطوات: <bdi>docs/12-deployment.md</bdi>. |
| («تخزين رفعات PDF في الإنتاج — خطوات المالك»). | title="لا أعلام مُعرَّفة" |
| أوراق البحث والملفات المرفوعة تُفقد عند كل نشر — دوامها يتطلب | description="تُدار من قاعدة البيانات." |
| ضبط <code>STORAGE_DRIVER=s3</code> مع متغيّرات <bdi>S3_*</bdi> من لوحة | {`تعذّر تحديث العلم «${toggleFlag.variables?.slug ?? ''}» — المعروضة آخر حالة محفوظة.`} |
| البيئة — الخطوات الكاملة في <bdi>docs/12-deployment.md</bdi> | ? `هل تريد ${flagConfirm.enabled ? 'تعطيل' : 'تفعيل'} «${flagConfirm.name}»؟ يُسجَّل ويمكن التراجع.` |
| («تخزين رفعات PDF في الإنتاج — خطوات المالك»). | <Card title="التنبيهات المفتوحة" icon={AlertTriangle}> |
| title="لا توجد أعلام مُعرَّفة" | message="تعذّر جلب التنبيهات" |
| description="لم تُعرَّف أعلام ميزات بعد؛ تُدار حالياً مباشرةً من قاعدة بيانات المنصّة." | title="لا تنبيهات مفتوحة" |
| {`تعذّر تحديث العلم «${toggleFlag.variables?.slug ?? ''}» — القيمة المعروضة هي آخر حالة محفوظة.`} | title="لا إعدادات مُعرَّفة" |
| title={flagConfirm?.enabled ? 'تعطيل الميزة' : 'تفعيل الميزة'} | description="القيم الافتراضية تعمل." |
| confirmLabel={flagConfirm?.enabled ? 'تعطيل الميزة' : 'تفعيل الميزة'} |  |
| ? `هل تريد تعطيل «${flagConfirm.name}»؟ يُسجَّل في سجلّ النشاط ويمكن إعادته من هذه البطاقة.` |  |
| : `هل تريد تفعيل «${flagConfirm.name}»؟ يُسجَّل في السجلّ ويمكن التراجع من هذه البطاقة.` |  |
| <Card title="التنبيهات التشغيلية المفتوحة" icon={AlertTriangle}> |  |
| message="تعذّر جلب التنبيهات التشغيلية" |  |
| title="لا توجد تنبيهات مفتوحة" |  |
| description="كل أنظمة المنصّة في حالة طبيعيّة الآن." |  |
| title="لا توجد إعدادات مُعرَّفة" |  |
| description="لا توجد إعدادات مخصّصة بعد؛ القيم الافتراضية تعمل." |  |

## frontend/src/pages/owner/OwnerUsersPage.tsx (17 − / 13 +)

| before (removed) | after (added) |
|---|---|
| : `تعذَّر تحديث حالة حساب «${name}»`, | : `تعذَّر تحديث حالة «${name}»`, |
| detail: apiErrorMessage(e, 'حاول مرة أخرى بعد لحظات.'), | detail: apiErrorMessage(e, 'حاول مرة أخرى.'), |
| ? user.memberships.map((m) => m.institution.name).join('، ') | ? `«${user.firstName} ${user.lastName}» لن يستطيع الدخول.` |
| ? `«${user.firstName} ${user.lastName}» لن يتمكّن من الدخول.` | : `«${user.firstName} ${user.lastName}» سيستطيع الدخول مجدداً.`, |
| : `«${user.firstName} ${user.lastName}» سيتمكّن من الدخول مجدداً.`, | { label: 'إجمالي المستخدمين', value: kpiValue(statData?.totalUsers ?? 0) }, |
| description="عرض جميع حسابات المنصّة والبحث فيها وإدارتها" | { label: 'الطلاب', value: kpiValue(statData?.students ?? 0), hint: topSegmentKey === 'students' ? 'الفئة الأكبر' : undefined }, |
| { label: 'إجمالي المستخدمين', value: kpiValue(statData?.totalUsers ?? 0), hint: 'حسابات مسجَّلة' }, | { label: 'الأساتذة', value: kpiValue(statData?.teachers ?? 0), hint: topSegmentKey === 'teachers' ? 'الفئة الأكبر' : undefined }, |
| { label: 'الطلاب', value: kpiValue(statData?.students ?? 0), hint: topSegmentKey === 'students' ? 'الفئة الأكبر' : 'حسابات الطلاب' }, | { label: 'مسجلون عامّون وجودة', value: kpiValue((statData?.admins ?? 0) + (statData?.quality ?? 0)), hint: topSegmentKey === 'staff' ? 'الفئة الأكبر' : undefined }, |
| { label: 'الأساتذة', value: kpiValue(statData?.teachers ?? 0), hint: topSegmentKey === 'teachers' ? 'الفئة الأكبر' : 'هيئة التدريس' }, | placeholder: 'ابحث…', |
| { label: 'مسجلون عامّون وجودة', value: kpiValue((statData?.admins ?? 0) + (statData?.quality ?? 0)), hint: topSegmentKey === 'staff' ? 'الفئة الأكبر' : 'إدارة ومتابعة' }, | title={hasActiveFilters ? 'لا نتائج' : 'لا مستخدمين بعد'} |
| placeholder: 'ابحث بالاسم أو البريد الإلكتروني…', | مسح الفلاتر |
| title={hasActiveFilters ? 'لا نتائج مطابقة' : 'لا يوجد مستخدمون بعد'} | <span className="visually-hidden">انضم حديثاً — </span> |
| ? 'لم نجد حسابات تطابق البحث أو الدور المحدّد.' | <span className="text-xs text-subtle" title="دور المالك ثابت"> |
| : 'تظهر الحسابات فور تسجيل أول مستخدم.'} |  |
| مسح البحث والفلاتر |  |
| <span className="visually-hidden">انضم خلال الأسبوع الماضي — </span> |  |
| <span className="text-xs text-subtle" title="دور المالك لا يُغيَّر من هذه الواجهة"> |  |

## frontend/src/pages/quality/QualityPages.tsx (65 − / 31 +)

| before (removed) | after (added) |
|---|---|
| تطوير الأداء الأكاديمي والإداري والتقني — وفق متطلبات الاعتماد المحلية والدولية. | const LECTURE_UNIT: [string, string, string, string] = ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة']; |
| {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })} · قراءة لحظية للمؤشرات | const FILE_UNIT: [string, string, string, string] = ['ملف واحد', 'ملفان', 'ملفات', 'ملفاً']; |
| trend: 'مسجَّل في النظام', | const RECORD_UNIT: [string, string, string, string] = ['سجل واحد', 'سجلان', 'سجلات', 'سجلاً']; |
| trend: 'أعضاء فاعلون', | const LOW_COMMITMENT_LABEL = 'التزام أقلّ من 50%'; |
| trend: countAr(d.lectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة']), | subtitle={e.weeklyActiveEstimated ? 'بيانات تقديرية' : undefined} |
| trend: countAr(e.attendance.total, ['سجل واحد', 'سجلان', 'سجلات', 'سجلاً']), | ? `الذروة ${countAr(Math.max(...e.weeklyActive), ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])} يوم ${WEEKDAY_NAMES_AR[e.weeklyActive.indexOf(Math.max(...e.weeklyActive))] ?? ''}.` |
| ? 'عدد الجلسات اليومية النشطة — منحنى تقديري لحدّة البيانات' | : 'لا بيانات.' |
| : 'عدد الجلسات اليومية النشطة' | caption: 'النشاط الأسبوعي', |
| ? `ذروة النشاط ${countAr(Math.max(...e.weeklyActive), ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])} يوم ${WEEKDAY_NAMES_AR[e.weeklyActive.indexOf(Math.max(...e.weeklyActive))] ?? ''}.` | title="لا تنبيهات" |
| : 'لا بيانات نشاط لهذا الأسبوع.' | <p className="page-subtitle">{`${metricLabel} · مرتَّبة من الأدنى`}</p> |
| caption: 'النشاط الأسبوعي — جلسات نشطة يومياً', | c.isError ? <ErrorState message="تعذّر تحميل المقرّرات" error={c.error} onRetry={() => c.refetch()} /> : |
| كل السجلات بوضع واحد — يظهر المخطط فور تنوّع الحالات. | title={debouncedQ ? 'لا نتائج مطابقة' : 'لا مقرّرات'} |
| title="لا توجد تنبيهات" | placeholder="ابحث…" |
| description="كل المؤشرات ضمن النطاق الطبيعي حالياً." | <th scope="col" title="محاضرات وملفات المقرّر">النشاط التعليميّ</th> |
| ? `${metricLabel} لكل مقرّر · مرتَّبة من الأدنى أولاً` | <th scope="col" title="محاضرة 20 نقطة، ملف 5، واجب 10 — بحدّ أقصى 100">اكتمال المحتوى</th> |
| : 'تتبّع جودة كل مقرّر: المحاضرات، الملفات، الواجبات.'} | <ErrorState message="تعذّر تحميل الأساتذة" error={p.error} onRetry={() => p.refetch()} /> |
| c.isError ? <ErrorState message="تعذّر تحميل قائمة المقرّرات" error={c.error} onRetry={() => c.refetch()} /> : | <p className="page-subtitle">قيم تقديرية.</p> |
| title={debouncedQ ? 'لا نتائج مطابقة' : 'لا توجد مقرّرات نشطة بعد'} | placeholder="ابحث…" |
| ? 'لم نجد مقرّراً يطابق البحث — جرّب كلمة أوسع.' | {!compact ? <th scope="col">المقرّرات</th> : <th scope="col" title="مقرّراته وملفاته">النشاط التعليميّ</th>} |
| : 'تظهر المقرّرات هنا فور اعتمادها وربطها بالفصل.'} | <th scope="col">رضا الطلاب <span className="text-xxs text-subtle">تقديري</span></th> |
| placeholder="ابحث بالاسم أو الكود…" | <th scope="col">زمن الاستجابة <span className="text-xxs text-subtle">تقديري</span></th> |
| <th scope="col" title="محاضرات المقرّر وملفاته المرفوعة">النشاط التعليميّ</th> | subtitle={d.weeklyActiveEstimated ? 'بيانات تقديرية' : undefined} |
| <th scope="col" title="كل محاضرة 20 نقطة، كل ملف 5، كل واجب 10 — بحدّ أقصى 100">اكتمال المحتوى</th> | ? `الذروة ${countAr(peak, ['جلسة نشطة واحدة', 'جلستان نشطتان', 'جلسات نشطة', 'جلسة نشطة'])}.` |
| <div>{countAr(o._count.lectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])}</div> | : 'لا بيانات.' |
| <div className="text-xxs text-subtle">{countAr(o._count.materials, ['ملف واحد', 'ملفان', 'ملفات', 'ملفاً'])}</div> | caption: 'النشاط الأسبوعي', |
| <p className="page-subtitle">رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.</p> | subtitle={`${countAr(f.departments.length, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])} · ${countAr(f.departments.reduce((s, d) => s + d.courses.length, 0), COURSE_UNIT)}`}> |
| <p className="page-subtitle">رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.</p> | <Card title="اللوحات الحيّة" icon={ListChecks}> |
| <ErrorState message="تعذّر تحميل قائمة الأساتذة" error={p.error} onRetry={() => p.refetch()} /> | <Card title="تصدير التقارير (PDF/Excel)" icon={FileText}> |
| رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة. | التصدير قيد التطوير. |
| ? ' رضا الطلاب وزمن الاستجابة قيم تقديرية حتى تفعيل قياسها.' | title="لا تنبيهات حالياً" |
| trend: 'على رسائل الطلاب', | <p className="qlt-empty-note hr-note">لا تنبيهات.</p> |
| trend: 'التزام أقلّ من 50%', |  |
| placeholder="ابحث باسم الأستاذ…" |  |
| title={lowOnly ? 'عرض جميع الأساتذة' : 'عرض الأساتذة بحاجة لمتابعة فقط'} |  |
| description="لم نجد أستاذاً يطابق البحث — جرّب اسمًا آخر أو امسح البحث." |  |
| description="تظهر هيئة التدريس هنا فور إضافة أعضائها." |  |
| <span className="hr-chip" data-tone="danger">مصفّى: التزام أقلّ من 50%</span> |  |
| {!compact ? <th scope="col">المقرّرات</th> : <th scope="col" title="المقرّرات التي يدرّسها والملفات المرفوعة">النشاط التعليميّ</th>} |  |
| <th scope="col" title="قيمة تقديرية — ليست قياساً فعلياً">رضا الطلاب <span className="text-xxs text-subtle">تقديري</span></th> |  |
| <th scope="col" title="قيمة تقديرية — ليست قياساً فعلياً">زمن الاستجابة <span className="text-xxs text-subtle">تقديري</span></th> |  |
| <div>{countAr(t.offerings, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</div> |  |
| <div className="text-xxs text-subtle">{countAr(t.totals.materials, ['ملف واحد', 'ملفان', 'ملفات', 'ملفاً'])}</div> |  |
| <p className="page-subtitle">نسب الحضور، إكمال المحاضرات، النقاط المتفاعلة.</p> |  |
| trend: countAr(d.attendance.total, ['سجل واحد', 'سجلان', 'سجلات', 'سجلاً']), |  |
| subtitle={d.weeklyActiveEstimated ? 'عدد الجلسات اليومية · بيانات تقديرية' : undefined} |  |
| ? `ذروة النشاط ${countAr(peak, ['جلسة نشطة واحدة', 'جلستان نشطتان', 'جلسات نشطة', 'جلسة نشطة'])}.` |  |
| : 'لا بيانات نشاط لهذا الأسبوع.' |  |
| caption: 'النشاط الأسبوعي — جلسات نشطة يومياً', |  |
| <p className="page-subtitle">شجرة الكلّيّات والأقسام والمقرّرات، مع مؤشرات الاكتمال.</p> |  |
| subtitle={`${countAr(f.departments.length, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])} · ${countAr(f.departments.reduce((s, d) => s + d.courses.length, 0), ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}`}> |  |
| <span>{countAr(d.courses.length, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</span> |  |
| {countAr(lectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])} |  |
| {countAr(materials, ['ملف واحد', 'ملفان', 'ملفات', 'ملفاً'])} |  |
| desc: 'كل عرض دراسيّ: التسجيلات، المحتوى، اكتمال التقييم.', |  |
| desc: 'رضا الطلاب، زمن الاستجابة، والالتزام بمعايير المنصة.', |  |
| desc: 'نسب الحضور والغياب، إكمال المحاضرات، النشاط الأسبوعي.', |  |
| desc: 'نسبة اكتمال المحتوى الرقميّ عبر الكلّيّات والأقسام.', |  |
| <p className="page-subtitle">لوحات حيّة — تُحدَّث مع كل عمليّة على المنصّة.</p> |  |
| <Card title="اللوحات الحيّة" icon={ListChecks} subtitle="أربع لوحات مرتبطة ببعضها"> |  |
| <Card title="تصدير تقارير ثابتة (PDF/Excel)" icon={FileText}> |  |
| إصدار التقارير القابلة للتحميل قيد التطوير — اللوحات الحيّة أعلاه تُحدَّث فوريًا مع بيانات المنصّة. |  |
| <p className="page-subtitle">أحداث تستوجب تدخّل فريق الجودة — من بيانات المنصّة.</p> |  |
| title="لا توجد تنبيهات حالياً" |  |
| description="كلّ المؤشّرات ضمن النطاق الطبيعيّ." |  |
| <p className="qlt-empty-note hr-note">لا تنبيهات بهذه الشدّة — اختر شدّة أخرى أو «الكل».</p> |  |

## frontend/src/pages/student/AiAssistantPage.tsx (45 − / 40 +)

| before (removed) | after (added) |
|---|---|
| 'ما المفاهيم التي أحتاج إلى مراجعتها؟', | 'ما المفاهيم التي أحتاج مراجعتها؟', |
| 'اقترح لي خطّة مذاكرة لفجواتي المعرفيّة', | 'اقترح خطّة مذاكرة لفجواتي', |
| 'كيف أحسّن درجتي في أضعف مفاهيمي؟', | 'كيف أحسّن أضعف مفاهيمي؟', |
| 'ما خطوتي الدراسيّة التالية؟', | 'ما خطوتي التالية؟', |
| 'راجع معي المفاهيم التي أتعثّر فيها', | 'راجع معي مفاهيمي المتعثّرة', |
| 'اقترح طريقة لتقييم فهم الطلاب بعد كل محاضرة', | 'كيف أقيّم فهم الطلاب؟', |
| 'كيف أنظّم مقرّري عبر الأسابيع بدفعة زمنية واضحة؟', | 'كيف أنظّم مقرّري؟', |
| 'اقترح أنشطة تفاعلية تزيد مشاركة الطلاب في المحاضرة', | 'اقترح أنشطة تزيد مشاركة الطلاب', |
| 'كيف أصوغ أسئلة اختبار تقيس الفهم لا الحفظ؟', | 'كيف أصوغ أسئلة تقيس الفهم؟', |
| 'مرحبًا! أنا مساعدك الدراسيّ. أحلّل بيانات إتقانك محليّاً (بلا نموذج لغويّ خارجيّ) لأقترح خطوات مذاكرة تركّز على فجواتك المعرفيّة. كيف أساعدك؟'; | 'مرحبًا! أحلّل بيانات إتقانك محليّاً وأقترح خطوة مذاكرة تالية.'; |
| 'مرحبًا! أنا مساعد تحليليّ محليّ (بلا نموذج لغويّ خارجيّ). لا أملك بيانات إتقان للمقرّرات التي تدرّسها، فإجاباتي عامّة. كيف أساعدك؟'; | 'مرحبًا! لا بيانات إتقان لمقرّراتك — إجاباتي عامّة.'; |
| 'مرحبًا! أنا مساعدك الدراسيّ المدعوم بنموذج لغويّ حقيقيّ عبر مزوّد خارجيّ. أرى بيانات إتقانك ومقرّراتك المسجَّلة في المنصّة لتركّز إجاباتي على فجواتك المعرفيّة. كيف أساعدك؟'; | 'مرحبًا! أرى بيانات إتقانك لأركّز على فجواتك.'; |
| 'مرحبًا! أنا مساعدك المدعوم بنموذج لغويّ حقيقيّ عبر مزوّد خارجيّ. لا أملك بيانات إتقان، لكن أستطيع مساعدتك في أسئلة التدريس والتقييم وتنظيم المقرّرات. كيف أساعدك؟'; | 'مرحبًا! لا بيانات إتقان لديّ — أساعدك في التدريس والتقييم.'; |
| 'إشعار الخصوصيّة: تُرسَل رسائلك وبيانات إتقانك إلى مزوّد ذكاء اصطناعيّ خارجيّ (المسمّى في الشارة أعلاه) لتوليد الردّ.'; | 'إشعار الخصوصيّة: تُرسَل رسائلك وبيانات إتقانك إلى مزوّد خارجيّ.'; |
| 'انتهت حصّتك اليوميّة من أسئلة المساعد الذكيّ — عُد غدًا أو تابع من محادثاتك السابقة.'; | 'انتهت حصّتك اليوميّة — عُد غدًا.'; |
| text: serverMsg \|\| 'تعذَّر الاتصال بالمساعد الآن.', | text: serverMsg \|\| 'تعذَّر الاتصال بالمساعد.', |
| void send(`اشرح لي مفهوم "${conceptName}" — لاحظت أنّ لديّ فجوة فيه.`); | void send(`اشرح لي مفهوم "${conceptName}"`); |
| ? 'مساعدك الدراسيّ مدعوم بنموذج لغويّ حقيقيّ يرى بيانات إتقانك ويعطي إجابات مخصّصة لك.' | title="تعذَّر تحليل فجواتك" |
| : 'يحلّل بيانات إتقانك محليّاً ويقترح خطوة مذاكرة تالية — مساعد تحليليّ محليّ، لا نموذج لغويّ خارجيّ.' | description="يمكنك مواصلة المحادثة." |
| <p className="r319sp-sec-note">مفاهيم تحتاج إلى توضيح — اضغط على أيٍّ منها لطرح سؤال مباشر على المساعد</p> | srLabel={countAr(gaps.data.length, ['فجوة', 'فجوتان', 'فجوات', 'فجوةً'])} |
| title="تعذَّر تحليل فجواتك المعرفيّة" | اسأل عن المفهوم |
| description="لن تظهر بطاقات المفاهيم المقترحة، لكن يمكنك مواصلة المحادثة مع المساعد بشكل طبيعي." | <span className="ai-surface-title r305ai-head-title"><Icon icon={Bot} size={16} />محادثتك</span> |
| srLabel={countAr(gaps.data.length, ['فجوة واحدة ذات أولويّة', 'فجوتان ذاتا أولويّة', 'فجوات ذات أولويّة', 'فجوةً ذات أولويّة'])} | أعد الإرسال |
| <p className="r319sp-sec-note">مفاهيم تحتاج إلى توضيح — اضغط على أيٍّ منها لطرح سؤال مباشر على المساعد</p> | أعد الفتح |
| اسأل المساعد عن هذا المفهوم | <button type="button" className="ai-quick-chip" onClick={() => void send('لخّص الفصل الأخير')} disabled={busy}> |
| <span className="ai-surface-title r305ai-head-title"><Icon icon={Bot} size={16} />محادثتك مع المساعد</span> | <button type="button" className="ai-quick-chip" onClick={() => void send('اشرح مفهوماً صعباً')} disabled={busy}> |
| أعد إرسال سؤالك | <button type="button" className="ai-quick-chip" onClick={() => void send('أنشئ اختباراً قصيراً')} disabled={busy}> |
| أعد فتح المحادثة | <button type="button" className="ai-quick-chip" onClick={() => void send('اقترح موارد إضافيّة')} disabled={busy}> |
| <button type="button" className="ai-quick-chip" onClick={() => void send('لخّص لي الفصل الأخير من المقرّر')} disabled={busy}> | <button type="button" className="ai-quick-chip" onClick={() => void send('اشرح مفهوماً صعباً')} disabled={busy}> |
| <button type="button" className="ai-quick-chip" onClick={() => void send('اشرح لي مفهوماً صعباً واجهته اليوم')} disabled={busy}> | <button type="button" className="ai-quick-chip" onClick={() => void send('ما المفاهيم التي أحتاج مراجعتها؟')} disabled={busy}> |
| <button type="button" className="ai-quick-chip" onClick={() => void send('أنشئ لي اختباراً قصيراً (5 أسئلة)')} disabled={busy}> | 'سؤال متبقٍّ', |
| <button type="button" className="ai-quick-chip" onClick={() => void send('اقترح موارد دراسيّة إضافيّة')} disabled={busy}> | 'سؤالان متبقّيان', |
| <button type="button" className="ai-quick-chip" onClick={() => void send('اشرح لي مفهوماً صعباً واجهته اليوم')} disabled={busy}> | 'أسئلة متبقّية', |
| <button type="button" className="ai-quick-chip" onClick={() => void send('ما المفاهيم التي أحتاج إلى مراجعتها؟')} disabled={busy}> | 'سؤالًا متبقّيًا', |
| 'سؤال واحد متبقٍّ اليوم', | srLabel={countAr(convList.length, ['محادثة', 'محادثتان', 'محادثات', 'محادثةً'])} |
| 'سؤالان متبقّيان اليوم', | description="ستظهر القائمة عند إعادة المحاولة." |
| 'أسئلة متبقّية اليوم', | label="لا محادثات سابقة بعد" |
| 'سؤالًا متبقّيًا اليوم', | title="سيُحذف نهائيًا" |
| srLabel={countAr(convList.length, ['محادثة واحدة سابقة', 'محادثتان سابقتان', 'محادثات سابقة', 'محادثةً سابقة'])} | title="حذف نهائيّ" |
| description="يمكنك مواصلة محادثتك الحالية بشكل طبيعي، وستظهر القائمة عند إعادة المحاولة." | meta={<BarCount n={suggestions.length} srLabel={countAr(suggestions.length, ['سؤال', 'سؤالان', 'أسئلة', 'سؤالاً'])} />} |
| label="لا توجد محادثات سابقة بعد" |  |
| note="ابدأ بأول سؤال وستظهر محادثاتك هنا." |  |
| title="سيُحذف سجلّ هذه المحادثة نهائيًا" |  |
| title="حذف هذه المحادثة نهائيًا" |  |
| meta={<BarCount n={suggestions.length} srLabel={countAr(suggestions.length, ['سؤال مقترح واحد', 'سؤالان مقترحان', 'أسئلة مقترحة', 'سؤالاً مقترحاً'])} />} |  |

## frontend/src/pages/student/CalendarPage.tsx (8 − / 7 +)

| before (removed) | after (added) |
|---|---|
| <SectionBar index="01" title="مواعيد الشهر" /> | <SectionBar index="01" title="المواعيد" /> |
| <SectionBar index="01" title="مواعيد الشهر" /> | <SectionBar index="01" title="المواعيد" /> |
| 'كل مواعيدك في نظرة واحدة: الحصص، التسليمات، الاختبارات، والبثّ — بتوقيت ليبيا.' | description="كل مواعيدك في نظرة واحدة — بتوقيت ليبيا." |
| title="مواعيد الشهر" | title="المواعيد" |
| srLabel={countAr(monthEventCount, ['يوم واحد له مواعيد', 'يومان لهما مواعيد', 'أيام لها مواعيد', 'يوماً له مواعيد'])} | srLabel={countAr(monthEventCount, ['يوم', 'يومان', 'أيام', 'يوماً'])} |
| note={`لا مواعيد في ${monthTitleAr(view.year, view.month)} — جرّب شهرًا آخر أو راجع جدولك.`} | note={`لا مواعيد في ${monthTitleAr(view.year, view.month)}.`} |
| description="لا أحداث في هذا اليوم — اختر يومًا آخر." | <Badge color="brand">{arUnit(selectedEvents.length, 'حدث', 'حدثان', 'أحداث')}</Badge> |
| <Badge color="brand">{arUnit(selectedEvents.length, 'حدث واحد', 'حدثان', 'أحداث')}</Badge> |  |

## frontend/src/pages/student/CampusMapPage.tsx (8 − / 6 +)

| before (removed) | after (added) |
|---|---|
| 'كلّيّات مؤسسة مدارك النموذجية بحسب الحرم — بيانات عرض اصطناعية.' | const COLLEGE_UNIT = ['كلّيّة واحدة', 'كلّيّتان', 'كليّات', 'كلّيّة'] as const; |
| title="انتشار الكليّات على المدن" | description="بيانات عرض اصطناعية." |
| srLabel={arCount(faculties.length, 'كلّيّة واحدة', 'كلّيّتان', 'كليّات', 'كلّيّة')} | title="انتشار الكليّات" |
| <p className="ml-sec-note">طول الشريط يتناسب مع عدد الكليّات — انقر مدينة لتصفية الدليل.</p> | <p className="ml-sec-note">انقر مدينة لتصفية الدليل.</p> |
| srLabel={arCount(visible.length, 'كلّيّة واحدة', 'كلّيّتان', 'كليّات', 'كلّيّة')} | label="لا كلّيّات في هذه المدينة" |
| label="لا توجد كلّيّات في هذه المدينة" | صفحة المؤسسة الكاملة |
| note="جرِّب اختيار مدينة أخرى من انتشار الكليّات الأعلى." |  |
| صفحة المؤسسة النموذجية الكاملة |  |

## frontend/src/pages/student/CatalogPage.tsx (9 − / 7 +)

| before (removed) | after (added) |
|---|---|
| eyebrow="مرجع للقراءة فقط" | eyebrow="للقراءة فقط" |
| ? `فهرس مقرّرات ${institutionName} — للبحث والاطّلاع على الخطة الدراسية.` | <span>التسجيل عبر مكتب المسجل العام.</span> |
| : 'فهرس مقرّرات مؤسستك — للبحث والاطّلاع على الخطة الدراسية.' | description="اختر مؤسستك من المبدّل أعلاه." |
| <span>التسجيل عبر مكتب المسجل العام — تواصل مع مؤسستك.</span> | ? `لا نتائج لـ «${debouncedQ}».` |
| description="اختر مؤسستك من مبدّل المؤسسة أعلاه لعرض دليلها." | : 'لم تُضف مقرّرات بعد.'} |
| ? `لم نجد مقرّراً يطابق «${debouncedQ}» — جرّب كلمات أخرى.` | title="المقرّرات" |
| : 'لم تُضف مقرّرات لدليل مؤسستك بعد — تظهر فور إضافتها من المسجل العام.'} | {searching && <> · نتائج «<bdi>{debouncedQ}</bdi>»</>} |
| title="مقرّرات المؤسسة" |  |
| {searching && <> · نتائج البحث عن «<bdi>{debouncedQ}</bdi>»</>} |  |

## frontend/src/pages/student/CourseDetailPage.tsx (18 − / 12 +)

| before (removed) | after (added) |
|---|---|
| العودة إلى مقرراتي | عودة للمقرّرات |
| { label: 'مقرّراتي الدراسية', to: '/student/courses' }, | { label: 'مقرّراتي', to: '/student/courses' }, |
| {countAr(data.course.credits, ['ساعة معتمدة واحدة', 'ساعتان معتمدتان', 'ساعات معتمدة', 'ساعة معتمدة'])} · الفصل <bdi>{data.term}</bdi> | {countAr(data.course.credits, ['ساعة معتمدة', 'ساعتان معتمدتان', 'ساعات معتمدة', 'ساعة معتمدة'])} · الفصل <bdi>{data.term}</bdi> |
| {countAr(watchedCount, ['محاضرة مكتملة', 'محاضرتان مكتملتان', 'محاضرات مكتملة', 'محاضرة مكتملة'])} من {data.lectures.length} | { label: 'المحاضرات', value: formatInt(data.lectures.length) }, |
| { label: 'المحاضرات', value: formatInt(data.lectures.length), hint: countAr(watchedCount, ['واحدة مكتملة', 'مكتملتان', 'مكتملة', 'مكتملة']) }, | { label: 'المواد المرفقة', value: formatInt(data.materials.length) }, |
| { label: 'المواد المرفقة', value: formatInt(data.materials.length), hint: countAr(data.materials.length, ['ملف واحد متاح', 'ملفان متاحان', 'ملفات متاحة', 'ملفاً متاحاً']) }, | { label: 'الواجبات', value: formatInt(data.assignments.length) }, |
| { label: 'الواجبات', value: formatInt(data.assignments.length), hint: 'هذا الفصل' }, | { label: 'الطلاب', value: formatInt(data._count.enrollments) }, |
| { label: 'الطلاب', value: formatInt(data._count.enrollments), hint: countAr(data._count.enrollments, ['طالب واحد مسجَّل', 'طالبان مسجَّلان', 'طلاب مسجَّلون', 'طالباً مسجَّلاً']) }, | ? 'لم تُكمل محاضرة بعد.' |
| note="يضيفها الأستاذ تباعاً مع تقدّم الفصل." | : 'كل المحاضرات مكتملة.'} |
| ? 'لم تُكمل محاضرة بعد — «تابع من هنا» يقودك لأول غير منتهية.' | srLabel={countAr(data.materials.length, ['ملف واحد', 'ملفان', 'ملفات', 'ملفاً'])} |
| : 'كل المحاضرات مكتملة — أنجزت المنهج.'} | srLabel={countAr(data.schedule.length, ['حصة أسبوعية', 'حصتان', 'حصص', 'حصة'])} |
| srLabel={countAr(data.materials.length, ['ملف واحد متاح', 'ملفان متاحان', 'ملفات متاحة', 'ملفاً متاحاً'])} | label="لم يُنشَر الجدول بعد" |
| note="تظهر الملفات والمراجع فور رفعها." |  |
| srLabel={countAr(data.schedule.length, ['حصة أسبوعية واحدة', 'حصتان أسبوعيتان', 'حصص أسبوعية', 'حصة أسبوعية'])} |  |
| label="لم يُنشَر جدول هذا المقرّر بعد" |  |
| note="يظهر فور تثبيت المواعيد الأسبوعيّة." |  |
| <p className="r305c-sec-note">مواعيد التسليم والوزن في صفحة مقرّراتك.</p> |  |
| note="لا شيء بانتظارك في هذا المقرر — وقت جيد لمراجعة السابقة." |  |

## frontend/src/pages/student/CoursesPage.tsx (17 − / 13 +)

| before (removed) | after (added) |
|---|---|
| description="جميع المقرّرات التي سجّلت فيها هذا الفصل، مع تقدّمك في كل واحد منها." | const ENROLLED_FORMS: [string, string, string, string] = ['مقرّر مسجَّل', 'مقرّران مسجّلان', 'مقرّرات مسجَّلة', 'مقرّراً']; |
| <EmptyState illustration="empty-courses" icon={BookOpen} title="لم تسجّل في أي مقرّر بعد" description="تواصل مع المسجل العام لإكمال تسجيل مقرّرات الفصل — ستظهر هنا فور اعتمادها." /> | description="جميع المقرّرات التي سجّلت فيها هذا الفصل." |
| srLabel={countAr(data.length, ['مقرّر مسجَّل واحد', 'مقرّران مسجّلان', 'مقرّرات مسجَّلة', 'مقرّراً مسجّلاً'])} | <EmptyState illustration="empty-courses" icon={BookOpen} title="لا مقرّرات بعد" description="تواصل مع المسجل العام لإكمال التسجيل." /> |
| <bdi>{countAr(data.length, ['مقرّر مسجَّل واحد', 'مقرّران مسجّلان', 'مقرّرات مسجَّلة', 'مقرّراً مسجّلاً'])}</bdi> | label="لا مقرّرات في هذا التصنيف" |
| label="لا توجد مقرّرات في هذا التصنيف" | srLabel={countAr(upcoming.length, ['واجب قادم', 'واجبان', 'واجبات قادمة', 'واجباً'])} |
| note="جرّب تصنيفاً آخر من الأزرار أعلاه لعرض مقرّراتك." | label="لا واجبات قادمة" |
| srLabel={countAr(upcoming.length, ['واجب واحد قادم', 'واجبان قادمان', 'واجبات قادمة', 'واجباً قادماً'])} | {late ? 'تمّ التسليم متأخرًا' : 'تمّ التسليم بنجاح'} |
| <p className="r305c-sec-note">واجباتك المستحقة فعلياً خلال الأسبوع القادم ولم تُسلّمها بعد</p> | ? 'استُلمت إجابتك وسيُعلَّم التسليم متأخرًا.' |
| label="لا توجد واجبات قادمة" | : 'استُلمت إجابتك — بانتظار التقييم.'} |
| note="ستظهر هنا الواجبات المستحقة فور إضافتها من أساتذة مقرّراتك." | تابع تقييمك في النتائج |
| {late ? 'تمّ التسليم — بعد الموعد النهائي' : 'تمّ التسليم بنجاح'} | hint="رابط https:// اختياري — نصك يكفي للتسليم." |
| ? 'استُلمت إجابتك وسيُعلَّم التسليم متأخرًا؛ الحسم لأستاذ المقرّر.' | {apiErrorMessage(submit.error, 'تعذَّر تسليم الواجب — تحقّق من اتصالك.')} |
| : 'استُلمت إجابتك وستظهر للأستاذ بانتظار التقييم.'} | {submit.isPending ? 'جارٍ التسليم…' : 'حفظ التسليم'} |
| تابع حالة التقييم ودرجتك من صفحة النتائج |  |
| hint="رابط خارجي يبدأ بـ https:// إن توفّر — نصك وحده يكفي للتسليم." |  |
| {apiErrorMessage(submit.error, 'تعذَّر تسليم الواجب — تحقّق من اتصالك وحاول مرة أخرى.')} |  |
| {submit.isPending ? 'جارٍ التسليم…' : 'تسليم الواجب'} |  |

## frontend/src/pages/student/DashboardPage.tsx (29 − / 21 +)

| before (removed) | after (added) |
|---|---|
| <span className="dash-resume-eyebrow r305s-eyebrow">{focus.continuing ? 'أكمل من حيث توقفت' : 'الخطوة التالية'}</span> | const PAGE_TITLE = 'لوحة التحكم'; |
| <span className="ind-microlabel">محاضرات المقرّر</span> | const RESUME_EYEBROW = 'أكمل من حيث توقفت'; |
| <span className="dash-resume-eyebrow r305s-eyebrow">{focus.started ? 'أكمل من حيث توقفت' : 'الخطوة التالية'}</span> | const NEXT_EYEBROW = 'الخطوة التالية'; |
| <span className="dash-resume-lecture">مسار التطوير الذاتي · {focus.started ? <>أنجزت <bdi>{formatInt(focus.progressPct)}%</bdi> من دروسه</> : 'سجّلت فيه ولم تبدأه بعد'}</span> | const MOMENTUM_LABEL = 'زخم الفصل'; |
| <h1 className="pf-page-title">لوحة التحكم</h1> | <span className="ind-microlabel">محاضرات</span> |
| <div className="r305s-rule-labeled" aria-hidden="true">زخم الفصل</div> | <span className="dash-resume-lecture">مسار التطوير الذاتي · {focus.started ? <>أنجزت <bdi>{formatInt(focus.progressPct)}%</bdi> من دروسه</> : 'لم تبدأه بعد'}</span> |
| <PageHeader title="لوحة التحكم" /> | description="استخدم حساب طالب." |
| title="لوحة التحكم" | : 'غير محدّد'; |
| description={`استخدم حساب طالب — أو اختر صفحة كلّيّة.`} | ? d.kpi.attendancePct >= 80 ? 'مطمئن' : d.kpi.attendancePct >= 60 ? 'قريب' : 'تحت الحد' |
| : 'موعد غير محدّد'; | : 'لا سجلات', |
| ? d.kpi.attendancePct >= 80 ? 'مطمئن هذا الفصل' : d.kpi.attendancePct >= 60 ? 'قريب من الحد' : 'تحت الحد — راجع حضورك' | hint: d.agenda.assignments[0] ? `أقربها ${formatDue(d.agenda.assignments[0].dueAt)}` : 'لا مهام', |
| : 'لا توجد سجلات بعد', | ? `المركز ${d.kpi.rank} من ${d.kpi.cohortSize}` |
| hint: d.agenda.assignments[0] ? `أقربها ${formatDue(d.agenda.assignments[0].dueAt)}` : 'لا مهام قريبة', | : 'لا مقرّرات', |
| ? `المركز ${d.kpi.rank} من ${d.kpi.cohortSize} على دفعتك` | {greeting}{studentName ? <>، <bdi>{studentName}</bdi></> : null} |
| : 'لم تُسجّل في مقرّر بعد', | action={<Link to="/student/courses" className="btn ghost sm">المقرّرات</Link>} |
| title="لوحة التحكم" | action={<Link to="/student/matrix" className="btn ghost sm">المصفوفة</Link>} |
| eyebrow="مساحة الطالب" | label="لا فجوات" |
| {greeting}{studentName ? <>، <bdi>{studentName}</bdi></> : null} — {identitySegments.length > 0 ? identitySegments : 'لوحة متابعة تقدّمك الأكاديمي.'} | note="أجب عن نقاط التفاعل." |
| note="لا حصص اليوم — أسبوعك القادم أدناه، ومقرّراتك في الأسفل." | note="يُسجَّل تلقائيًا." |
| action={<Link to="/student/courses" className="btn ghost sm">كل المقرّرات</Link>} | srLabel={countAr(later.length, ['التزام قادم', 'التزامان', 'التزامات', 'التزاماً'])} |
| note="لم تُسجَّل بعد — دليل المقرّرات يعرض ما تقدّمه كلّيّتك." | action={<Link to="/student/calendar" className="btn ghost sm">التقويم</Link>} |
| action={<Link to="/student/matrix" className="btn ghost sm">المصفوفة الكاملة</Link>} |  |
| label="لا فجوات بعد" |  |
| note="لا فجوات بعد — أجب عن نقاط التفاعل لترسم خريطة إتقانك." |  |
| <div className="r305s-rule-labeled" aria-hidden="true">زخم الفصل</div> |  |
| note="يُسجَّل تلقائيًا مع كل محاضرة تشاهدها" |  |
| <span>اسأل عن مقرّر، لخّص محاضرة، أو اطلب خطة مراجعة.</span> |  |
| srLabel={countAr(later.length, ['التزام واحد قادم', 'التزامان قادمان', 'التزامات قادمة', 'التزاماً قادماً'])} |  |
| action={<Link to="/student/calendar" className="btn ghost sm">التقويم الكامل</Link>} |  |

## frontend/src/pages/student/JobsPage.tsx (7 − / 3 +)

| before (removed) | after (added) |
|---|---|
| description="وظائف وفرص تدريب تجريبية مفتوحة لطلاب وخرّيجي الجامعة (بيانات عرض)." | label="لا فرص نشطة" |
| srLabel={countAr(jobs.length, ['فرصة واحدة مفتوحة', 'فرصتان مفتوحتان', 'فرص مفتوحة', 'فرصةً مفتوحة'])} | 'لا فرص ضمن هذا النوع.' |
| label="لا توجد فرص نشطة هذا الأسبوع" | label="لا فرص ضمن هذا النوع" |
| note="تُضاف فرص التوظيف والتدريب دوريًا — وسيصلك إشعار الفرص الملائمة لتخصصك." |  |
| 'لا توجد فرص ضمن هذا النوع حاليّاً — جرّب نوعاً آخر.' |  |
| label="لا توجد فرص ضمن هذا النوع" |  |
| note="كل الفرص المفتوحة تظهر تحت «الكل»." |  |

## frontend/src/pages/student/LabsPage.tsx (27 − / 21 +)

| before (removed) | after (added) |
|---|---|
| description: 'تكوين راوتر وسويتش، إعداد VLANs، اختبار الاتصال بين الأجهزة.', | instructions: 'فعّل الواجهات وعيّن IP.', |
| instructions: 'أدخل الأوامر التالية لتفعيل الواجهات وتعيين IP.', | '✔ الواجهة مفعّلة.', // allow-emoji: simulated terminal content |
| '✔ تم تفعيل الواجهة بنجاح.', // allow-emoji: simulated terminal content | '✔ VLAN 10 جاهزة.', // allow-emoji: simulated terminal content |
| '✔ تم إعداد VLAN 10 على المنفذ FastEthernet0/1.', // allow-emoji: simulated terminal content | instructions: 'اختبر الاتصال عبر ping.', |
| instructions: 'استخدم ping للتحقق من الاتصال بين الأجهزة.', | '✔ الاتصال يعمل.', // allow-emoji: simulated terminal content |
| '✔ الاتصال يعمل بنجاح.', // allow-emoji: simulated terminal content | instructions: 'احفظ الإعدادات.', |
| instructions: 'احفظ الإعدادات إلى الذاكرة الدائمة.', | '✔ حُفظت الإعدادات.', // allow-emoji: simulated terminal content |
| '✔ تم حفظ الإعدادات في NVRAM.', // allow-emoji: simulated terminal content | { title: 'تجهيز المواد', instructions: 'حضّر HCl وNaOH بتركيز 0.1M.', output: '> beaker.add(\'HCl\', 50, 0.1);\n> beaker.add(\'NaOH\', 50, 0.1);\n✔ تم التحضير.' }, // allow-emoji: simulated terminal content |
| description: 'محاكاة تفاعل HCl مع NaOH وقياس درجة الحموضة.', | { title: 'الخلط والتفاعل', instructions: 'اخلط الكميتين.', output: '> mix(beaker_A, beaker_B);\nReaction: HCl + NaOH → NaCl + H₂O\nTemperature rise: +5°C (exothermic)\n✔ التفاعل مكتمل.' }, // allow-emoji: simulated terminal content |
| { title: 'تجهيز المواد', instructions: 'حضّر 50 مل من HCl تركيز 0.1M و 50 مل من NaOH.', output: '> beaker.add(\'HCl\', 50, 0.1);\n> beaker.add(\'NaOH\', 50, 0.1);\n✔ تم تحضير المواد بأمان.' }, // allow-emoji: simulated terminal content | { title: 'القياس النهائي', instructions: 'اقرأ pH بعد التفاعل.', output: '> ph.measure(mix);\npH = 7.0 (متعادل)\n✔ تعادل تام.' }, // allow-emoji: simulated terminal content |
| { title: 'الخلط والتفاعل', instructions: 'اخلط الكميتين تدريجياً.', output: '> mix(beaker_A, beaker_B);\nReaction: HCl + NaOH → NaCl + H₂O\nTemperature rise: +5°C (exothermic)\n✔ التفاعل مكتمل.' }, // allow-emoji: simulated terminal content | { title: 'تجميع المكونات', instructions: 'اختر المكونات.', output: '+ Battery: 9V\n+ Resistor: 470Ω\n+ LED: Red, Vf=2.0V\n✔ جاهزة.' }, // allow-emoji: simulated terminal content |
| { title: 'القياس النهائي', instructions: 'اقرأ pH بعد التفاعل.', output: '> ph.measure(mix);\npH = 7.0 (متعادل)\n✔ النتيجة المتوقعة: تفاعل تعادل تام.' }, // allow-emoji: simulated terminal content | { title: 'حساب التيار', instructions: 'استخدم قانون أوم: I = (Vbat - Vled) / R.', output: 'I = (9 - 2) / 470\nI = 14.89 mA\n✔ آمن (Imax = 20 mA).' }, // allow-emoji: simulated terminal content |
| description: 'بناء دائرة بقاعدة ومقاوم ومصباح، حساب التيار.', | { title: 'إغلاق الدائرة', instructions: 'وصّل المكونات.', output: '> circuit.close();\nCurrent flowing: 14.9 mA\nLED brightness: 75%\n✔ يعمل.' }, // allow-emoji: simulated terminal content |
| { title: 'تجميع المكونات', instructions: 'اختر بطارية 9V، مقاوم 470Ω، ومصباح LED.', output: '+ Battery: 9V\n+ Resistor: 470Ω\n+ LED: Red, Vf=2.0V\n✔ المكونات جاهزة.' }, // allow-emoji: simulated terminal content | { title: 'قياس الجهد', instructions: 'قِس جهد المقاوم.', output: '> voltmeter.read(R1);\nVR = 7.0V\nVerification: Vbat = VR + VLED = 7 + 2 = 9V ✔' }, // allow-emoji: simulated terminal content |
| { title: 'حساب التيار', instructions: 'استخدم قانون أوم: I = (Vbat - Vled) / R.', output: 'I = (9 - 2) / 470\nI = 14.89 mA\n✔ ضمن النطاق الآمن للـ LED (Imax = 20 mA).' }, // allow-emoji: simulated terminal content | description={'تجارب تفاعلية بلا معدات.'} |
| { title: 'إغلاق الدائرة', instructions: 'وصّل المكونات على متوازي.', output: '> circuit.close();\nCurrent flowing: 14.9 mA\nLED brightness: 75%\n✔ المصباح يعمل.' }, // allow-emoji: simulated terminal content | srLabel={countAr(labs.data!.length, ['معمل واحد', 'معملان', 'معامل متاحة', 'معملاً'])} |
| { title: 'قياس الجهد', instructions: 'استخدم الفولتميتر لقياس الجهد على المقاوم.', output: '> voltmeter.read(R1);\nVR = 7.0V\nVerification: Vbat = VR + VLED = 7 + 2 = 9V ✔' }, // allow-emoji: simulated terminal content | <EmptyCell label="لا معامل متاحة" /> |
| 'تجارب تفاعلية بلا معدات — شغّلها خطوة بخطوة وراقب النتائج في طرفية المحاكاة.' | <EmptyState icon={FlaskConical} title="التجربة قيد البناء" description="" /> |
| hint: 'مسجَّلة في دليل المنصّة', | أكملت «<bdi>{exp.title}</bdi>» — أُحتسبت في إحصائيّاتك. |
| ? 'لم تُسجَّل تجربة مكتملة بعد' | لم يُسجَّل الإكمال على الخادم. |
| srLabel={countAr(labs.data!.length, ['معمل واحد متاح', 'معملان متاحان', 'معامل متاحة', 'معملاً متاحاً'])} | <div className="terminal-hint">— بانتظار التشغيل —</div> |
| label="لا معامل متاحة" |  |
| note="لم تُسجّل معامل في دليل المنصّة بعد — ستظهر هنا فور إضافتها." |  |
| <EmptyState icon={FlaskConical} title="هذه التجربة قيد البناء" description="سيتم إضافتها قريباً." /> |  |
| أكملت «<bdi>{exp.title}</bdi>» بنجاح — أُحتسبت في إحصائيّاتك. |  |
| وصلت إلى نهاية التجربة لكن لم يُسجَّل الإكمال على الخادم — أعد المحاولة أو عُد لاحقاً. |  |
| <div className="terminal-hint">— اضغط "تشغيل الخطوة" لتنفيذ الأوامر —</div> |  |

## frontend/src/pages/student/LecturePlayerPage.tsx (18 − / 15 +)

| before (removed) | after (added) |
|---|---|
| title="لم يتم تحديد محاضرة" | title="لا محاضرة محددة" |
| description="الرابط لا يتضمّن محاضرة — اختر محاضرة من المقرر للمتابعة." | action={<Link className="btn ghost sm" to="/student/courses">مقرراتي</Link>} |
| action={<Link className="btn ghost sm" to="/student/courses">العودة إلى مقرراتي</Link>} | مقرراتي |
| العودة إلى مقرراتي | <span>تعذّر تسجيل الاكتمال.</span> |
| <span>تعذّر تسجيل الاكتمال — قد لا يُحتسب تقدّمك.</span> | {reportWatch.isPending ? 'يُعيد المحاولة…' : 'إعادة التسجيل'} |
| {reportWatch.isPending ? 'يُعيد المحاولة…' : 'إعادة تسجيل الاكتمال'} | المحتويات |
| {checkpointsTotal > 0 && <> · {countAr(checkpointsTotal, ['نقطة تفاعل واحدة', 'نقطتا تفاعل', 'نقاط تفاعل', 'نقطة تفاعل'])}</>} | تبقى {countAr(checkpointsTotal - checkpointsAnswered, |
| الفصول ونقاط التفاعل | ['نقطة تفاعل', 'نقطتا تفاعل', 'نقاط تفاعل', 'نقطة تفاعل'])}. |
| أُجيب عن {checkpointsAnswered} من {countAr(checkpointsTotal, ['نقطة تفاعل واحدة', 'نقطتا تفاعل', 'نقاط تفاعل', 'نقطة تفاعل'])} | أجب الآن |
| أنهيت المشاهدة — تبقى {countAr(checkpointsTotal - checkpointsAnswered, | أنهيت المحاضرة. |
| ['نقطة تفاعل واحدة لم تُجب', 'نقطتا تفاعل لم تُجبا', 'نقاط تفاعل لم تُجب', 'نقطة تفاعل لم تُجب'])}. | <EmptyCell label="لا فصول مقسَّمة" /> |
| إلى نقطة التفاعل التالية | placeholder="ابحث…" |
| أنهيت هذه المحاضرة{checkpointsTotal > 0 ? ' — ونقاط تفاعلها كلّها مُجابة' : ''}. | <p className="lecture-sec-note">لا نتائج.</p> |
| <EmptyCell label="لا فصول مقسَّمة" note="لم تُقسَّم المحاضرة — شاهدها كاملة دون تنقّل." /> | <span>تشغيل/إيقاف</span> |
| placeholder="ابحث في النص المكتوب…" | تعذّر إرسال الإجابة. |
| <p className="lecture-sec-note">لا نتائج مطابقة في هذا النص.</p> |  |
| <span>تشغيل / إيقاف</span> |  |
| تعذّر إرسال الإجابة — أعد المحاولة. |  |

## frontend/src/pages/student/LibraryPage.tsx (37 − / 30 +)

| before (removed) | after (added) |
|---|---|
| toast.success(`موعد إرجاع «${book.title}»: ${formatDateAr(loan.dueAt)}.`, { | const DAY_UNIT: [string, string, string, string] = ['يوم واحد', 'يومين', 'أيام', 'يوماً']; |
| toast.error(apiErrorMessage(e, 'تعذَّرت الاستعارة — تحقّق من اتصالك.')); | const RESULT_UNIT: [string, string, string, string] = ['نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة']; |
| ? 'لا توجد نسخ متاحة للاستعارة حالياً' | const RESEARCH_UNIT: [string, string, string, string] = ['بحث واحد', 'بحثان', 'بحوث', 'بحوثاً']; |
| : countAr(book.availableCopies, ['نسخة متاحة واحدة', 'نسختان متاحتان', 'نسخ متاحة', 'نسخة متاحة']); | toast.success(`الإرجاع: ${formatDateAr(loan.dueAt)}.`, { |
| <span title={book.totalCopies > 0 ? `${availabilityHint} من ${formatInt(book.totalCopies)}` : undefined}> | toast.error(apiErrorMessage(e, 'تعذَّرت الاستعارة.')); |
| <bdi>{formatInt(book.availableCopies)}</bdi> متاحة من <bdi>{formatInt(book.totalCopies)}</bdi> | const availabilityHint = unavailable ? 'لا نسخ متاحة' : `${formatInt(book.totalCopies)} نسخة`; |
| <span className="lib-book-detail-v">14 يوماً — يصلك موعد الإرجاع في إشعار التأكيد.</span> | <span title={unavailable ? availabilityHint : book.totalCopies > 0 ? `${formatInt(book.availableCopies)} من ${formatInt(book.totalCopies)} متاحة` : undefined}> |
| <span className="lib-book-detail-v">جميع النسخ مستعارة — جرّب لاحقاً أو استعرض البحوث.</span> | <bdi>{formatInt(book.availableCopies)}</bdi> من <bdi>{formatInt(book.totalCopies)}</bdi> متاحة |
| ? `استحقّ منذ ${countAr(days, ['يوم واحد', 'يومين', 'أيام', 'يوماً'])}` | <span className="lib-book-detail-v">14 يوماً</span> |
| ? `ينتهي بعد ${countAr(days, ['يوم واحد', 'يومين', 'أيام', 'يوماً'])}` | <span className="lib-book-detail-v">جميع النسخ مستعارة.</span> |
| : `متبقٍ ${countAr(days, ['يوم واحد', 'يومين', 'أيام', 'يوماً'])}`; | ? `منذ ${countAr(days, DAY_UNIT)}` |
| toast.success(`أُعيد «${loan.book.title}» إلى المكتبة.`, { title: 'تمّ الإرجاع' }); | ? `بعد ${countAr(days, DAY_UNIT)}` |
| <span>موعد الإرجاع: <bdi className="font-mono">{formatDateAr(loan.dueAt)}</bdi></span> | : `متبقٍ ${countAr(days, DAY_UNIT)}`; |
| ? <>حرف واحد — البحث يبدأ من حرفين</> | toast.success(`أُعيد «${loan.book.title}».`, { title: 'تمّ الإرجاع' }); |
| : <><bdi>{visibleResearch.length}</bdi> بحث منشور</>) | <span>الإرجاع: <bdi className="font-mono">{formatDateAr(loan.dueAt)}</bdi></span> |
| ? countAr(totalBooks, booksFiltered ? ['نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة'] : BOOK_UNIT) | ? <>حرف واحد</> |
| ? 'البحث في البحوث يبدأ من حرفين — أضف حرفًا ثانيًا ليبدأ فورًا.' | ? 'يلزم حرفان.' |
| ? `لم نجد بحثاً يطابق «${debouncedQ}» — جرّب كلمات أخرى.` | ? `لا نتائج لـ «${debouncedQ}».` |
| : 'سيظهر هنا أرشيف بحوث الطلاب فور إجازتها من الأساتذة.'} | «بحوثي» is the shelf's sibling workflow (your own |
| /* 22-c (A3 P3-10): honest scope — no «آلاف الكتب» overclaim. */ | papers land on the published shelf), «التحميلات» is |
| 'كتب وبحوث الجامعة المنشورة — للاستعارة الفوريّة والاطّلاع.' | بحوثي |
| «بحوثي العلمية» is the shelf's sibling workflow (your own | التحميلات |
| papers land on the published shelf), «مركز التحميلات» is | بحث |
| بحوثي العلمية | srLabel={countAr(openLoans.length, ['استعارة', 'استعارتان', 'استعارات', 'استعارة'])} |
| مركز التحميلات | <strong>لا استعارات نشطة</strong> |
| {isResearchTab ? 'بحث البحوث' : 'بحث المكتبة'} | title={booksFiltered ? 'لا كتب مطابقة' : 'لا كتب بعد'} |
| srLabel={countAr(openLoans.length, ['استعارة واحدة', 'استعارتان', 'استعارات', 'استعارة'])} | description={booksFiltered ? 'جرّب كلمات أخرى.' : undefined} |
| <strong>لا استعارات نشطة</strong> — اضغط «استعارة» على أي كتاب متاح ليظهر هنا مع موعد إرجاعه (14 يوماً). | label={hit.matchedIn === 'title' ? 'في العنوان' : hit.matchedIn === 'abstract' ? 'في الملخص' : 'في المتن'} |
| srLabel={countAr(totalBooks, booksFiltered ? ['نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة'] : BOOK_UNIT)} | expandLabel={`تفاصيل ${paper.title}`} |
| title={booksFiltered ? 'لا توجد كتب تطابق البحث' : 'لا توجد كتب بعد'} | موثّق |
| description={booksFiltered ? 'جرّب كلمات بحث مختلفة أو إزالة التصنيفات.' : 'ستظهر هنا كتب المكتبة فور توفرها.'} |  |
| srLabel={countAr(visibleResearch.length, ['بحث واحد منشور', 'بحثان منشوران', 'بحوث منشورة', 'بحثاً منشوراً'])} |  |
| <span className="rs-group-count">{countAr(g.papers.length, ['بحث واحد', 'بحثان', 'بحوث', 'بحوثاً'])}</span> |  |
| label={hit.matchedIn === 'title' ? 'تطابق في العنوان' : hit.matchedIn === 'abstract' ? 'تطابق في الملخص' : 'تطابق في المتن'} |  |
| expandLabel={`تفاصيل البحث: ${paper.title}`} |  |
| <span>ذكاء اصطناعي: <bdi className="font-mono">{formatPct(paper.aiContentPct)}%</bdi></span> |  |
| تم التحقق من النشر |  |

## frontend/src/pages/student/LivePage.tsx (6 − / 2 +)

| before (removed) | after (added) |
|---|---|
| description="الجلسات الحيّة لمقرّراتك — انضمّ مباشرة، والتسجيلات هنا بعد كل جلسة." | <p className="ml-sec-note">انضمّ بنقرة واحدة</p> |
| note="تظهر الجلسة تلقائياً حال نشرها من أساتذتك." | <p className="ml-sec-note">قد تتوفر تسجيلات</p> |
| <p className="ml-sec-note">انضمّ إلى أيّ جلسة بنقرة واحدة</p> |  |
| note="لا جلسات نشطة الآن — القادمة في القائمة أدناه." |  |
| note="يظهر هنا أي بثّ يجدوله أساتذتك." |  |
| <p className="ml-sec-note">أحدث الجلسات المنتهية — قد تتوفر لها تسجيلات</p> |  |

## frontend/src/pages/student/MatrixPage.tsx (11 − / 7 +)

| before (removed) | after (added) |
|---|---|
| 'خريطة معرفيّة لكل مفهوم درسته — كل خلية تعكس إتقانك من التفاعل والاختبارات.' | 'خريطة معرفيّة لكل مفهوم درسته.' |
| ? <>{countAr(totalConcepts, ['مفهوم واحد مُقاس', 'مفهومان مُقاسان', 'مفاهيم مُقاسة', 'مفهوماً مُقاساً'])} عبر {countAr(mappedCourses.length, ['مقرّر واحد', 'مقرّرين', 'مقرّرات', 'مقرّراً'])}</> | ? <>{countAr(totalConcepts, ['مفهوم مُقاس', 'مفهومان مُقاسان', 'مفاهيم مُقاسة', 'مفهوماً مُقاساً'])} عبر {countAr(mappedCourses.length, ['مقرّر واحد', 'مقرّرين', 'مقرّرات', 'مقرّراً'])}</> |
| <Badge color="brand" icon={Sparkles}>تتبّع المعرفة</Badge> | label="لا فجوات حالياً" |
| <p className="r319sp-sec-note">ابدأ بسدّ الفجوات — الصفّ يأخذك مباشرة إلى المحاضرة المناسبة</p> | srLabel={countAr(totalConcepts, ['مفهوم', 'مفهومان', 'مفاهيم', 'مفهوماً'])} |
| label="لا فجوات حالياً — أحسنت!" | {masteredConcepts > 0 ? `أتقنت ${masteredConcepts}` : 'لا إتقان بعد'} |
| note="استمر بحضور المحاضرات والإجابة على نقاط التفاعل." | title={`${titleBase} — ${remediation.lectureTitle ?? 'المحاضرة الموصى بها'}`} |
| note="شاهد أول محاضرة وأجب عن نقاط التفاعل — سترسم المصفوفة خريطتك تلقائياً." | {countAr(unmappedCount, ['مقرّر آخر', 'مقرّران آخران', 'مقرّرات أخرى', 'مقرّراً آخر'])} |
| srLabel={countAr(totalConcepts, ['مفهوم واحد مُقاس', 'مفهومان مُقاسان', 'مفاهيم مُقاسة', 'مفهوماً مُقاساً'])} |  |
| {masteredConcepts > 0 ? `أتقنت ${masteredConcepts}` : 'لم تتقن منها بعد'} |  |
| title={`${titleBase} — راجع في: ${remediation.lectureTitle ?? 'المحاضرة الموصى بها'}`} |  |
| {countAr(unmappedCount, ['مقرّر واحد آخر في قائمتك', 'مقرّران آخران في قائمتك', 'مقرّرات أخرى في قائمتك', 'مقرّراً آخر في قائمتك'])} |  |

## frontend/src/pages/student/MoocPage.tsx (5 − / 4 +)

| before (removed) | after (added) |
|---|---|
| description="دورات من منصّات عالمية معتمدة — التسجيل من موقع المنصّة." | const MOOC_UNIT: [string, string, string, string] = ['دورة خارجية واحدة', 'دورتان خارجيتان', 'دورات خارجية', 'دورة خارجية']; |
| note="يربط المسجل العام دورات Coursera وedX بمقرّراتك — راجع المرشد لمعرفة المعتمد." | description="التسجيل من موقع المنصّة." |
| srLabel={countAr(data.length, ['دورة خارجية واحدة', 'دورتان خارجيتان', 'دورات خارجية', 'دورة خارجية'])} | note="يربطها المسجّل العام بمقرّراتك." |
| <bdi>{countAr(data.length, ['دورة خارجية واحدة', 'دورتان خارجيتان', 'دورات خارجية', 'دورة خارجية'])}</bdi> | note="جرّب كلمة أقصر." |
| note="جرّب كلمة أقصر، أو ابحث باسم الجهة." |  |

## frontend/src/pages/student/MorePages.tsx (63 − / 43 +)

| before (removed) | after (added) |
|---|---|
| if (n === 1) return 'نقطة واحدة'; | if (n === 1) return 'نقطة'; |
| description="تقدّمك ومستواك مقارنة بزملائك في المنصة." | label: 'مستوى التطوير', |
| label: 'مستوى التطوير الذاتي', | hint: me ? TIER_LABEL[me.level.tier] : 'لم يبدأ بعد', |
| hint: me ? TIER_LABEL[me.level.tier] : 'لم يبدأ المسار بعد', | label: 'مركزك بالدفعة', |
| label: 'مركزك على الدفعة', | hint: rank !== null && cohortSize > 1 ? undefined : 'فور توافر الدفعة', |
| hint: rank !== null && cohortSize > 1 ? undefined : 'يظهر الترتيب فور توافر الدفعة', | ? 'تعذّر تحميل المستوى' |
| ? 'تعذّر تحميل مستوى التطوير الذاتي' | ? `${TIER_LABEL[me.level.tier]} · المستوى ${me.level.level}` |
| ? `${TIER_LABEL[me.level.tier]} · المستوى ${me.level.level} في التطوير الذاتي` | {rank !== null && cohortSize > 1 && ` · المركز ${formatNum(rank)} من ${formatNum(cohortSize)}`} |
| {rank !== null && cohortSize > 1 && ` · المركز ${formatNum(rank)} من ${formatNum(cohortSize)} على دفعتك`} | تعذّر تحميل النقاط. |
| تعذّر تحميل نقاط الإنجاز. | 'تعذّر تحميل النقاط' |
| 'تعذّر تحميل نقاط الإنجاز' | إعادة المحاولة |
| إعادة محاولة تحميل المستوى | srLabel={countAr(ach.data!.length, ['إنجاز', 'إنجازان', 'إنجازات', 'إنجازاً'])} |
| srLabel={countAr(ach.data!.length, ['إنجاز واحد محقّق', 'إنجازان محقّقان', 'إنجازات محقّقة', 'إنجازاً محقّقاً'])} | srLabel={countAr(lb.data!.length, ['طالب', 'طالبان', 'طلاب', 'طالباً'])} |
| note="أكمل دروساً ومسارات لتفتح أول إنجاز." | label="لا ترتيب بعد" |
| srLabel={countAr(lb.data!.length, ['طالب واحد مرتّب', 'طالبان مرتّبان', 'طلاب مرتّبون', 'طالباً مرتّباً'])} | action={<Link to="/training" className="btn primary sm">ابدأ التطوير الذاتي</Link>} |
| label="لا يوجد ترتيب بعد" | srLabel={countAr(skills.data!.length, ['مهارة', 'مهارتان', 'مهارات', 'مهارةً'])} |
| note="اكسب النقاط بإكمال الدروس — يظهر ترتيبك فور تسجيل أول نقطة." | label="لا مهارات بعد" |
| action={<Link to="/training" className="btn primary sm">ابدأ من التطوير الذاتي</Link>} | caption: 'مستوى الإتقان', |
| description="رصد مهاراتك التقنية وتطوّرها مع الوقت." | <span className="flex-1">تعذَّر تعليم الإشعارات كمقروءة.</span> |
| srLabel={countAr(skills.data!.length, ['مهارة واحدة مُسجَّلة', 'مهارتان مُسجَّلتان', 'مهارات مُسجَّلة', 'مهارةً مُسجَّلة'])} | <EmptyCell label="لا إشعارات بعد" /> |
| label="لم تُسجَّل أي مهارة بعد" | title="مصدر الإشعار" |
| note="تُحتسب تلقائياً من إنجازاتك ومسارات التطوير." | <PatternPageHeader title="الجدول الدراسي" /> |
| caption: 'مستوى الإتقان لكل مهارة', | ? countAr(totalSlots, ['حصة أسبوعياً', 'حصتان أسبوعياً', 'حصص أسبوعياً', 'حصة أسبوعياً']) |
| description="آخر التحديثات والتذكيرات الأكاديمية." | label="لا جدول مسجّل" |
| <span className="flex-1">تعذَّر تعليم الإشعارات كمقروءة — أعد المحاولة.</span> | <PatternPageHeader title="النتائج والتقييمات" /> |
| <EmptyCell label="لا توجد إشعارات بعد" note="ستظهر التذكيرات والتحديثات الأكاديميّة هنا." /> | message="تعذَّر تحميل القسم" |
| title="الانتقال إلى مصدر الإشعار" | ? <>{countAr(d.headline.courseCount, ['مقرّر مُقيَّم', 'مقرّران مُقيَّمان', 'مقرّرات مُقيَّمة', 'مقرّراً مُقيَّماً'])}</> |
| <PatternPageHeader title="الجدول الدراسي" description="جارٍ جمع جدولك…" /> | hint: d.headline.highest?.courseName ?? 'لا درجات بعد', |
| description="جدولك الأسبوعيّ مع أماكن المحاضرات." | <Card title="درجاتك حسب المقرّر" icon={Activity} subtitle={hasGrades ? 'النسبة المرجَّحة' : undefined} className="results-chart-card"> |
| ? countAr(totalSlots, ['حصة واحدة أسبوعياً', 'حصتان أسبوعياً', 'حصص أسبوعياً', 'حصة أسبوعياً']) | <EmptyState illustration="empty-list" title="لا درجات بعد" /> |
| label="لا يوجد جدول مسجّل" | : 'لا متوسّط بعد.' |
| note="تظهر محاضراتك فور تسجيل الجدول لمقرّراتك." | caption: 'درجاتك حسب المقرّر', |
| <PatternPageHeader title="النتائج والتقييمات" description="جارٍ جمع درجاتك…" /> | title="الرجوع للمقرّر" |
| message="تعذَّر تحميل هذا القسم" | <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0' }}>لا تقييمات حديثة.</p> |
| description="درجاتك وتحليل أدائك من بياناتك الفعليّة." | title="الرجوع للمقرّر" |
| ? <>{countAr(d.headline.courseCount, ['مقرّر واحد مُقيَّم', 'مقرّران مُقيَّمان', 'مقرّرات مُقيَّمة', 'مقرّراً مُقيَّماً'])} هذا الفصل</> | title="لا تجارب AR/VR بعد" |
| hint: d.headline.highest?.courseName ?? 'لا توجد درجات بعد', | placeholder="ماذا يدور في ذهنك؟ (#هاشتاج)" |
| <Card title="درجاتك حسب المقرّر" icon={Activity} subtitle={hasGrades ? 'النسبة المرجَّحة لكل مقرّر' : 'ستظهر درجاتك هنا فور تسجيلها'} className="results-chart-card"> | <span>تعذّر النشر — نصّك محفوظ بالأعلى.</span> |
| <EmptyState illustration="empty-list" title="لم تُسجَّل أي درجات بعد" description="يبدأ الحساب فور رصد أوّل تقييم في أي مقرّر." /> | srLabel={countAr(trending.length, ['وسم', 'وسمان', 'وسوم', 'وسماً'])} |
| : 'لم تُسجَّل درجات بعد.' | label="لا ملفّات بعد" |
| caption: 'درجاتك حسب المقرّر بالنسبة المئوية', | title="لا مؤسّسة في جلستك" |
| كل ما سلّمته وتمّ تقييمه في «آخر الواجبات المقيَّمة» أدناه — وسيصلك إشعار بأي درجة. | message="تعذَّر تحميل الكليّات" |
| title="الرجوع إلى سياق المقرّر حيث يظهر هذا التكليف" | <EmptyState illustration="empty-list" title="لا كلّيّات بعد" /> |
| <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0' }}>لم تُسجَّل درجات بعد.</p> |  |
| <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0' }}>لا توجد تقييمات حديثة.</p> |  |
| title="الرجوع إلى سياق المقرّر حيث يظهر هذا التكليف" |  |
| title="لا توجد تجارب AR/VR بعد" |  |
| description="ستظهر هنا حين يضيفها المسجل العام." |  |
| description="تواصل مع زملائك وأساتذتك حول المقرّرات والمشاريع." |  |
| placeholder="ماذا يدور في ذهنك؟ (يمكنك استخدام #هاشتاج)" |  |
| <span>تعذّر نشر المنشور — نصّك ما زال محفوظاً بالأعلى.</span> |  |
| note="كن أول من يشارك تجربته أو سؤاله." |  |
| srLabel={countAr(trending.length, ['وسم واحد متداولاً', 'وسمان متداولاان', 'وسوم متداولة', 'وسماً متداولاً'])} |  |
| <p className="r319sp-sec-note">الوسوم الأكثر تكراراً في آخر 20 منشوراً محمَّلاً.</p> |  |
| description="ملفّات مقرّراتك في مكان واحد — حالة كل رابط معلَنة." |  |
| label="لا توجد ملفّات بعد" |  |
| note="تظهر هنا فور رفع موادّ في مقرّراتك." |  |
| description="مؤسّستك التعليميّة على منصّة مدارك." |  |
| title="لا توجد مؤسّسة في جلستك" |  |
| description="اختر مؤسّستك من قائمة العضويّات ثم عُد هنا." |  |
| description="كليّات مؤسّستك المسجَّلة في منصّة مدارك." |  |
| message="تعذَّر تحميل قائمة الكليّات" |  |
| <EmptyState illustration="empty-list" title="لا توجد كلّيّات بعد" description="لم تُسجَّل كلّيّات في هذه المؤسّسة بعد." /> |  |

## frontend/src/pages/student/PaymentPage.tsx (15 − / 10 +)

| before (removed) | after (added) |
|---|---|
| toast.success('تم تحميل بياناتك الدراسية من الخادم.', { title: 'تمّ التحديث' }); | toast.success('تمّ التحميل.', { title: 'تمّ التحديث' }); |
| description="حالة رسومك الجامعيّة وكيفيّة سدادها." | <span>تعذّر تحميل بياناتك.</span> |
| <span>تعذّر تحميل بياناتك الدراسية من الخادم.</span> | لا تُعرض مبالغ هنا — رصيدك وسجلّ سدادك من مكتب الشؤون الماليّة. |
| تكامل الدفع قيد التطوير ولا تُعرض مبالغ تقديريّة — رصيدك وسجلّ سدادك | meta="في كلّيّتك — القنوات أدناه" |
| من مكتب الشؤون الماليّة. | title="أحضر بطاقتك الجامعيّة" |
| حتّى ذلك الحين، خُطواتك اليوم: | title="تابع إعلانات الإدارة الماليّة" |
| meta="في كلّيّتك، أو تواصل معه عبر القنوات أدناه" | meta="على لوحة المجتمع" |
| title="أحضر رقمك الجامعيّ أو بطاقتك الجامعيّة" | <SectionBar index="04" title="مكتب الشؤون الماليّة" /> |
| title="تابع مواعيد الرسوم وإعلانات الإدارة الماليّة" | <div className="list-row-sub">9:00 صباحاً – 2:00 مساءً</div> |
| meta="تُنشر على لوحة المجتمع الجامعيّ" | فتح المجتمع |
| <SectionBar index="04" title="مكتب الشؤون الماليّة بالجامعة" /> |  |
| <div className="list-row-sub">من 9:00 صباحاً حتى 2:00 مساءً</div> |  |
| الساعات من الإدارة — قد تتغيّر خلال الاختبارات والإجازات. |  |
| الإعلانات الرسميّة للرسوم والمواعيد تُنشر على لوحة المجتمع. |  |
| فتح المجتمع الجامعيّ |  |

## frontend/src/pages/student/ProfilePage.tsx (12 − / 6 +)

| before (removed) | after (added) |
|---|---|
| description: 'منصة عالمية لمشاركة البحوث — احفظ رابط ملفك هنا.', | hint: 'حفظ محليّ', |
| description: 'فهرس البحوث الأشهر — منشوراتك مع الاستشهادات.', | <span>تعذّر تحميل بياناتك.</span> |
| description: 'معرّف الباحث الدولي — يُنصح به عند النشر الأكاديمي.', | <span className="sr-only">{countAr(linkedCount, ['رابط', 'رابطان', 'روابط', 'رابطاً'])} من {formatNum(LINKS.length)}</span> |
| description="معلوماتك الأكاديمية وحساباتك العلمية وإنجازاتك." | <p className="r319sp-sec-note">تُحفظ في متصفّحك فقط — لا تُرسَل للجامعة.</p> |
| <span className="r305s-eyebrow">الملف الشخصي</span> | تم الحفظ |
| hint: 'حفظ محليّ في متصفّحك فقط', | srLabel={countAr(achievements.data!.length, ['إنجاز', 'إنجازان', 'إنجازات', 'إنجازاً'])} |
| <span>تعذّر تحميل بياناتك — الحقول تُعرض “—” حتى يعود الاتصال.</span> |  |
| <span className="sr-only">{countAr(linkedCount, ['رابط محفوظ واحد', 'رابطان محفوظان', 'روابط محفوظة', 'رابطاً محفوظاً'])} من {formatNum(LINKS.length)}</span> |  |
| <p className="r319sp-sec-note">روابطك للرجوع السريع — تُحفظ في متصفّحك فقط، لا تُرسَل للجامعة.</p> |  |
| تم الحفظ في متصفّحك |  |
| srLabel={countAr(achievements.data!.length, ['إنجاز واحد محقّق', 'إنجازان محقّقان', 'إنجازات محقّقة', 'إنجازاً محقّقاً'])} |  |
| note="أكمل بعض المحاضرات والمهام لكسب أوّل شارة." |  |

## frontend/src/pages/student/ResearchPage.tsx (38 − / 33 +)

| before (removed) | after (added) |
|---|---|
| PUBLISHED: 'مُنشور في المكتبة', | PUBLISHED: 'منشور', |
| ? { k: 'جارٍ الآن', hint: 'الفحص يجري — النتائج تظهر تلقائياً.' } | const SCANNING_NOW = { k: 'جارٍ الآن', hint: 'الفحص يجري — النتائج تظهر تلقائياً.' }; |
| return { k: 'جارٍ الآن', hint: 'الفحص يجري — النتائج تظهر تلقائياً.' }; | const UPLOAD_NEW = 'رفع بحث جديد'; |
| return { k: 'الخطوة التالية', hint: 'بانتظار تقييم أستاذك — لا إجراء مطلوب منك الآن.' }; | const UPLOADING_FILE = 'جارٍ رفع الملف…'; |
| return { k: 'الخطوة التالية', hint: 'ارفع نسخة معدّلة — عنوانك وملخّصك يُعبّآن مسبقاً.' }; | return { k: 'الخطوة التالية', hint: 'بانتظار تقييم أستاذك — لا إجراء مطلوب.' }; |
| return { k: 'التقييم وصل', hint: 'راجع الدرجة والملاحظات — النشر قرار الأستاذ.' }; | return { k: 'الخطوة التالية', hint: 'ارفع نسخة معدّلة — تُعبّأ مسبقاً.' }; |
| return { k: 'مكتمل', hint: 'البحث متاح للجميع في مكتبة الجامعة.' }; | return { k: 'التقييم وصل', hint: 'راجع الدرجة والملاحظات — النشر للأستاذ.' }; |
| { label: 'إجمالي بحوثك', value: formatInt(papers.length), hint: 'منذ أول رفعة' }, | return { k: 'مكتمل', hint: 'متاح في المكتبة.' }; |
| { label: 'قيد المراجعة', value: formatInt(pendingCount), hint: pendingCount > 0 ? 'بانتظار خطوة تالية' : 'لا شيء معلّق' }, | { label: 'إجمالي بحوثك', value: formatInt(papers.length), hint: 'منذ البداية' }, |
| setScanError(apiErrorMessage(e, 'تعذَّر بدء الفحص — تحقّق من اتصالك وحاول مرة أخرى.')); | { label: 'قيد المراجعة', value: formatInt(pendingCount), hint: pendingCount > 0 ? 'بانتظار خطوة' : 'لا شيء' }, |
| 'ارفع بحوثك، اعرضها على فحص الانتحال (محاكاة)، ثم أرسلها لأستاذك للتقييم والنشر في المكتبة.' | setScanError(apiErrorMessage(e, 'تعذَّر بدء الفحص — تحقّق من اتصالك.')); |
| ارفعه الآن — يُفحص، ثم يقيّمه أستاذك، وتميّزه يُنشر. | explainer below carry the «محاكاة» note; the header keeps it |
| رفع بحث جديد | toast.success('سيُفحص ثم يصل إلى أستاذك.', { |
| toast.success('سيخضع البحث لفحص الانتحال ثم يصل إلى أستاذك.', { | pdfUploadErrorMessage(e, 'تعذَّر رفع البحث — تحقّق من اتصالك.'), |
| pdfUploadErrorMessage(e, 'تعذَّر رفع البحث — تحقّق من اتصالك وحاول مرة أخرى.'), | title="لا بحوث بعد" |
| title="لم ترفع أي بحث بعد" | expandLabel={`تفاصيل: ${paper.title}`} |
| description="ارفع أول بحث ليُفحص ثم يُقيَّم من الأستاذ." | {isScanning ? 'جارٍ بدء الفحص…' : 'ابدأ الفحص'} |
| رفع بحث جديد | تجاوز الحدود المسموح بها (محاكاة) |
| expandLabel={`تفاصيل البحث: ${paper.title}`} | «منشور» chip + the مكتمل next-step line — the third |
| {isScanning ? 'جارٍ بدء الفحص…' : 'ابدأ الفحص الآن'} | ملاحظات الأستاذ |
| تجاوز البحث الحدود التجريبية المسموح بها (محاكاة) | { n: 1, title: 'ارفع بحثك', desc: 'العنوان والملخّص والمقرّر.', icon: Upload }, |
| تم نشر هذا البحث في مكتبة الجامعة. | { n: 3, title: 'تقييم الأستاذ', desc: 'يُقيِّم الأستاذ البحث من 20.', icon: FileText }, |
| مراجعة البحث مع ملاحظات الأستاذ | { n: 4, title: 'النشر في المكتبة', desc: 'المتميزة تُنشر.', icon: BookMarked }, |
| { n: 1, title: 'ارفع بحثك', desc: 'العنوان، الملخّص، والمقرّر المرتبط.', icon: Upload }, | ? '3 أحرف على الأقل.' |
| { n: 3, title: 'تقييم الأستاذ', desc: 'بعد اجتياز الفحص، يُقيِّم الأستاذ البحث من 20.', icon: FileText }, | placeholder="مثال: أنماط التصميم" |
| { n: 4, title: 'النشر في المكتبة', desc: 'البحوث المتميزة تُضاف إلى مكتبة الجامعة.', icon: BookMarked }, | placeholder="الفكرة والمنهج والنتائج…" |
| <div className="modal-title">رفع بحث جديد</div> | <FormField label="المقرّر المرتبط (اختياري)" id={offeringFieldId}> |
| ? 'يجب أن يكون 3 أحرف على الأقل.' | <option value="">— بدون مقرّر —</option> |
| placeholder="مثال: تطبيق أنماط التصميم في تطبيقات الويب" | <option value="" disabled>جارٍ تحميل المقرّرات…</option> |
| placeholder="اكتب ملخصاً مختصراً عن الفكرة، المنهج، والنتائج…" | hint="PDF فقط، حتى 20 ميغابايت." |
| <FormField label="المقرّر الأكاديمي المرتبط (اختياري)" id={offeringFieldId}> | الملف مرفوع بالفعل — ستعيد المحاولة استخدامه. |
| <option value="">— غير مرتبط بمقرّر محدّد —</option> | أكمل العنوان (3 أحرف على الأقل). |
| <option value="" disabled>جارٍ تحميل مقرراتك المسجَّلة…</option> | {filePending ? UPLOADING_FILE : isPending ? 'جارٍ الرفع…' : 'رفع البحث'} |
| hint="PDF فقط، بحد أقصى 20 ميغابايت — بدونه يُسجَّل البحث بعنوانه وملخصه فقط." |  |
| الملف مرفوع بالفعل — إعادة المحاولة ستعيد استخدامه دون رفعه من جديد. |  |
| label="جارٍ رفع الملف…" |  |
| أكمل عنوان البحث (3 أحرف على الأقل) لتتمكّن من الرفع. |  |
| {filePending ? 'جارٍ رفع الملف…' : isPending ? 'جارٍ الرفع…' : 'رفع البحث'} |  |

## frontend/src/pages/student/TrainingPages.tsx (41 − / 28 +)

| before (removed) | after (added) |
|---|---|
| description="مسارات تدريبية لاحتياجاتك الأكاديمية والمهنية — أكمل مساراً لتحصل على سجلّ إتمام موثَّق." | const MINUTES_AR: [string, string, string, string] = ['دقيقة واحدة', 'دقيقتين', 'دقائق', 'دقيقة']; |
| message="تعذَّر تحميل ملخص تقدّمك في التطوير الذاتي" | const LESSONS_AR: [string, string, string, string] = ['درس واحد', 'درسان', 'دروس', 'درساً']; |
| { label: 'الأوسمة', value: formatNum(me.badgeCount), trend: badgesQ.data ? `من ${countAr(badgesQ.data.length, ['وسام واحد', 'وسامين', 'أوسمة', 'وساماً'])} في المنصة` : 'في مسارات التطوير الذاتي' }, | const BADGES_AR: [string, string, string, string] = ['وسام واحد', 'وسامين', 'أوسمة', 'وساماً']; |
| { label: 'الشهادات', value: formatNum(me.certificateCount), trend: 'إتمام موثَّق من المنصة' }, | const BACK_TO_TRACKS = 'العودة إلى المسارات'; |
| message="تعذَّر تحميل المسارات التدريبية" | const TRACK_NOT_FOUND = 'المسار غير موجود'; |
| title={filter === 'all' ? 'لا توجد مسارات منشورة بعد' : 'لا توجد مسارات في هذه الفئة بعد'} | const BROWSE_TRACKS = 'تصفح المسارات'; |
| description="تظهر المسارات هنا فور نشرها من فريق الجامعة." | message="تعذَّر تحميل الملخص" |
| <span className="cp-inline"><Icon icon={BookOpen} size={12} /> {countAr(track.totalLessons, ['درس واحد', 'درسان', 'دروس', 'درساً'])}</span> | { label: 'الأوسمة', value: formatNum(me.badgeCount), trend: badgesQ.data ? `من ${countAr(badgesQ.data.length, BADGES_AR)}` : undefined }, |
| العودة إلى المسارات | { label: 'الشهادات', value: formatNum(me.certificateCount), trend: 'إتمام موثَّق' }, |
| title="المسار غير موجود" | message="تعذَّر تحميل المسارات" |
| description="ربما تم حذفه أو أن الرابط غير صحيح." | title="لا مسارات بعد" |
| action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>} | description="تحقّق من اتصالك." |
| العودة إلى المسارات | label={track.isCompleted ? 'مكتمل — شهادة جاهزة' : `${completedCount} / ${countAr(track.lessons.length, ['درس مكتمل', 'درسان مكتملان', 'دروس مكتملة', 'درساً مكتملًا'])}`} |
| <Badge><Icon icon={Clock} size={11} /> {countAr(track.estMinutes, ['دقيقة واحدة', 'دقيقتين', 'دقائق', 'دقيقة'])}</Badge> | subtitle={track.enrolled ? undefined : 'سجّل في المسار لفتح الدروس'} |
| <Badge><Icon icon={BookOpen} size={11} /> {countAr(track.lessons.length, ['درس واحد', 'درسان', 'دروس', 'درساً'])}</Badge> | setFeedback({ ok: true, msg: 'تم احتسابه مسبقاً.' }); |
| description="تحقّق من اتصالك بالشبكة ثم أعد المحاولة." | setFeedback({ ok: false, msg: apiErrorMessage(err, 'تعذّر احتساب الدرس.') }); |
| label={track.isCompleted ? 'هذا المسار مكتمل — شهادة جاهزة' : `${completedCount} / ${countAr(track.lessons.length, ['درس مكتمل', 'درسان مكتملان', 'دروس مكتملة', 'درساً مكتملًا'])}`} | {lesson.isCompleted ? 'تم الإكمال' : complete.isPending ? 'جارٍ الإرسال…' : 'أكملت الدرس'} |
| subtitle={track.enrolled ? 'اضغط على أي درس للبدء بمراجعته' : 'سجّل في المسار أعلاه لفتح الدروس'} | message="تعذَّر تحميل الملخص" |
| العودة إلى المسارات | { label: 'الأوسمة المحقّقة', value: formatNum(me.badgeCount), trend: badgesQ.data ? `من ${countAr(badgesQ.data.length, BADGES_AR)}` : undefined }, |
| title="المسار غير موجود" | { label: 'الشهادات', value: formatNum(me.certificateCount), trend: 'إتمام موثَّق' }, |
| description="ربما تم حذفه أو أن الرابط غير صحيح." | note="أكمل الدروس لتحصد الأوسمة." |
| action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>} | label="لا شهادات بعد" |
| description="ربما تم حذفه أو أن الرابط غير صحيح." | note="أكمل مساراً لشهادتك." |
| setFeedback({ ok: true, msg: 'تم احتساب هذا الدرس مسبقاً.' }); | <Badge>{countAr(c.hours, ['ساعة تقديرية', 'ساعتان تقديريّتان', 'ساعات تقديرية', 'ساعة تقديرية'])}</Badge> |
| setFeedback({ ok: false, msg: apiErrorMessage(err, 'تعذّر احتساب الدرس — أعد المحاولة.') }); | subtitle="آخر 20 طالباً نشاطاً" |
| <span><Icon icon={Clock} size={10} /> {countAr(lesson.estMinutes, ['دقيقة واحدة', 'دقيقتين', 'دقائق', 'دقيقة'])}</span> | note="اكسب النقاط بإكمال الدروس." |
| {lesson.isCompleted ? 'تم الإكمال' : complete.isPending ? 'جارٍ الإرسال…' : 'أكملت — احتساب الدرس'} | ? 'أفضل 10 فقط' |
| description="نقاطك، أوسمتك، شهاداتك، وترتيبك بين الزملاء." | : `عرض الكل — ${countAr(lbRows.length, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}`} |
| message="تعذَّر تحميل ملخص نقاطك" |  |
| { label: 'الأوسمة المحقّقة', value: formatNum(me.badgeCount), trend: badgesQ.data ? `من ${countAr(badgesQ.data.length, ['وسام واحد', 'وسامين', 'أوسمة', 'وساماً'])}` : undefined }, |  |
| { label: 'الشهادات', value: formatNum(me.certificateCount), trend: 'إتمام موثَّق من المنصة' }, |  |
| note="ابدأ بدروس التطوير الذاتي لتحصد أول وسام." |  |
| action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>} |  |
| label="لم تحصل على شهادات بعد" |  |
| note="أكمل أول مسار لشهادتك الأولى." |  |
| action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>} |  |
| <Badge>{countAr(c.hours, ['ساعة تقديرية واحدة', 'ساعتان تقديريّتان', 'ساعات تقديرية', 'ساعة تقديرية'])}</Badge> |  |
| subtitle="آخر 20 طالباً نشاطاً على المنصة" |  |
| note="اكسب النقاط بإكمال الدروس — يظهر ترتيبك فور أول نقطة." |  |
| ? 'عرض أفضل 10 فقط' |  |
| : `عرض الترتيب كاملًا — ${countAr(lbRows.length, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}`} |  |

## frontend/src/pages/student/WebinarsPage.tsx (5 − / 2 +)

| before (removed) | after (added) |
|---|---|
| description="جدول البثّ المباشر لمقرّراتك، وروابط الفعاليّات الجامعيّة." | <p className="r319sp-sec-note">المباشرة منها تُعلَّم بنبضة حمراء</p> |
| <p className="r319sp-sec-note">البثوث المرتبطة بمقرّراتك — المباشرة منها تُعلَّم بنبضة حمراء</p> | جلسات مقرّراتك مع التسجيلات. |
| note="تجده هنا وفي صفحة البثّ — مع التسجيلات بعد الجلسة." |  |
| <p className="r319sp-sec-note">الفعاليّات الرسميّة تُنشر على لوحة المجتمع، وجلسات مقرّراتك تعيش في صفحة البثّ.</p> |  |
| جلسات البثّ المباشر الخاصّة بمقرّراتك مع التسجيلات بعد الجلسة. |  |

## frontend/src/pages/teacher/ExamAuthorPages.tsx (147 − / 100 +)

| before (removed) | after (added) |
|---|---|
| return 'بانتظار مراجعة الجودة — يُفتح النشر بعد اعتمادها.'; | const COUNT__QUESTIONS: [string, string, string, string] = ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً']; |
| ? 'رفضته الجودة — طالِع ملاحظتها أدناه وعدّل القالب.' | const COUNT__MINUTES: [string, string, string, string] = ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة']; |
| : 'رفضته الجودة — عدّل القالب ليعود إلى المراجعة.'; | const COUNT__POINTS: [string, string, string, string] = ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة']; |
| return 'هذا الاختبار منشور بالفعل.'; | const COUNT__ATTEMPTS: [string, string, string, string] = ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة']; |
| return 'هذا الاختبار مُغلق.'; | const ERR_TITLE_SHORT = 'العنوان قصير — 3 أحرف على الأقل.'; |
| return 'مسودة لم تُرسل إلى مراجعة الجودة بعد.'; | const ERR_TITLE_LONG = 'العنوان طويل — الحد 200 حرف.'; |
| if (title.length < 3) errors.title = 'العنوان قصير — 3 أحرف على الأقل.'; | const ERR_DURATION = 'المدة عدد صحيح بين 5 و 480 دقيقة.'; |
| else if (title.length > 200) errors.title = 'العنوان طويل — الحد 200 حرف.'; | const ERR_PASS = 'درجة النجاح نسبة صحيحة بين 0 و 100.'; |
| errors.durationMin = 'المدة عدد صحيح بين 5 و 480 دقيقة.'; | const ERR_WINDOW = 'موعد الإغلاق يجب أن يكون بعد موعد الفتح.'; |
| errors.passingScore = 'درجة النجاح نسبة صحيحة بين 0 و 100.'; | const ERR_DECISION = 'تعذَّر تنفيذ القرار.'; |
| errors.window = 'موعد الإغلاق يجب أن يكون بعد موعد الفتح.'; | const HINT_CALENDAR = 'اختر من تقويم الحقل.'; |
| if (prompt.length < 5) errors.prompt = 'نص السؤال قصير جداً — 5 أحرف على الأقل.'; | const TOGGLE_RANDOM_DESC = 'يُخلط الترتيب لكل طالب عند البدء'; |
| else if (d.choices.length < 2) errors.choices = 'خياران على الأقل.'; | const TOGGLE_RANDOM_LABEL = 'ترتيب عشوائي للأسئلة'; |
| errors.choices = 'سؤال صح أم خطأ له خياران بالضبط.'; | const FIELD_OPEN = 'يفتح في (اختياري)'; |
| errors.modelAnswer = 'الإجابة القصيرة تحتاج إجابة نموذجية للتصحيح الآلي.'; | const FIELD_CLOSE = 'يغلق في (اختياري)'; |
| errors.points = 'النقاط عدد صحيح بين 1 و 20.'; | const DESC_HINT = 'تعليمات مختصرة لطلابك…'; |
| else if (tags.some((t) => t.length > 40)) errors.tags = 'كل وسم حتى 40 حرفاً.'; | const NO_ATTEMPTS = 'لا محاولات بعد'; |
| if (title.length < 3) errors.title = 'العنوان قصير — 3 أحرف على الأقل.'; | const SAVED_PLAIN = 'حُفظت تعديلات القالب.'; |
| else if (title.length > 200) errors.title = 'العنوان طويل — الحد 200 حرف.'; | const NEW_TEMPLATE = 'قالب اختبار جديد'; |
| if (d.scope === 'offering' && !d.offeringId) errors.scope = 'اختر المقرّر الذي يُخصَّص له الاختبار.'; | const LOADING = 'جارٍ التحميل…'; |
| if (d.scope === 'faculty' && !d.facultyId) errors.scope = 'اختر الكلّيّة التي يُخصَّص لها الاختبار.'; | const TWO_CHOICES_MIN = 'خياران على الأقل.'; |
| errors.durationMin = 'المدة عدد صحيح بين 5 و 480 دقيقة.'; | const COUNT__TEMPLATES: [string, string, string, string] = ['قالب واحد', 'قالبان', 'قوالب', 'قالباً']; |
| errors.passingScore = 'درجة النجاح نسبة صحيحة بين 0 و 100.'; | const COUNT__PENDING_REVIEW: [string, string, string, string] = ['إجابة واحدة', 'إجابتان', 'إجابات', 'إجابة']; |
| if (d.questionIds.size < 1) errors.questionIds = 'اختر سؤالاً واحداً على الأقل من البنك.'; | const PENDING_SUFFIX = ' بانتظار تقييمك'; |
| else if (d.questionIds.size > 60) errors.questionIds = 'الحد 60 سؤالاً في القالب الواحد.'; | const AWAITING_SUFFIX = ' بانتظار تصحيحك'; |
| errors.window = 'موعد الإغلاق يجب أن يكون بعد موعد الفتح.'; | const QUEUE_SUFFIX = ' بانتظار قرارك'; |
| تأليف الأسئلة وبناء القوالب، ومتابعة اعتمادها من الجودة حتى النشر. | const GENERAL_SCOPE_LABEL = 'عام — كل الكلّيّات'; |
| title="صلاحية التأليف غير مفعَّلة لحسابك" | const CAP_NOTE = 'تُعرض أول 100 نتيجة — قد تكون هناك المزيد.'; |
| detail="إنشاء الأسئلة والقوالب يتطلب صلاحية «إنشاء اختبارات» — تواصل مع إدارة المنصة." | return 'بانتظار مراجعة الجودة.'; |
| ? 'جارٍ التحميل…' | return 'رفضته الجودة — عدّله ليعود للمراجعة.'; |
| ? `${countAr(q.data.length, ['قالب واحد', 'قالبان', 'قوالب', 'قالباً'])} — يُفتح النشر بعد اعتماد الجودة.` | return 'الاختبار منشور بالفعل.'; |
| : 'ستظهر قوالبك هنا — ابنِ قالباً من أسئلة البنك المعتمدة.' | return 'الاختبار مُغلق.'; |
| <Icon icon={Plus} size={14} /> قالب اختبار جديد | return 'مسودة لم تُرسل بعد.'; |
| title="لم تُنشئ قوالب اختبارات بعد" | if (prompt.length < 5) errors.prompt = 'نص السؤال قصير — 5 أحرف على الأقل.'; |
| description="ابدأ ببناء قالب من أسئلة البنك، ثم أرسله لمراجعة الجودة ونشره لطلابك." | errors.choices = 'صح أم خطأ: خياران بالضبط.'; |
| <Icon icon={Plus} size={14} /> قالب اختبار جديد | errors.modelAnswer = 'تحتاج إجابة نموذجية للتصحيح الآلي.'; |
| تُعرض أول 100 نتيجة — قد تكون هناك المزيد. | errors.points = 'النقاط بين 1 و 20.'; |
| const GENERAL_SCOPE = 'عام — كل الكلّيّات'; | else if (tags.some((t) => t.length > 40)) errors.tags = 'الوسم حتى 40 حرفاً.'; |
| {countAr(template._count.questions, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])} ·{' '} | if (d.scope === 'offering' && !d.offeringId) errors.scope = 'اختر المقرّر.'; |
| {countAr(template.durationMin, ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'])} | if (d.scope === 'faculty' && !d.facultyId) errors.scope = 'اختر الكلّيّة.'; |
| <span>{countAr(template._count.attempts, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])}</span> | if (d.questionIds.size < 1) errors.questionIds = 'اختر سؤالاً على الأقل.'; |
| رفضته الجودة — افتح القالب للاطلاع على الملاحظات وعدّله ليعود إلى المراجعة. | else if (d.questionIds.size > 60) errors.questionIds = 'الحد 60 سؤالاً.'; |
| toast.success('أصبح الاختبار متاحاً للطلاب حسب نطاقه.', { | title="التأليف غير مفعَّل لحسابك" |
| title="النشر يعرض الاختبار للطلاب حسب نطاقه ولا يمكن التراجع عنه" | detail="يتطلب صلاحية «إنشاء اختبارات»." |
| {apiErrorMessage(publish.error, 'تعذَّر النشر — حاول مرة أخرى.')} | title="لم تُنشئ قوالب بعد" |
| message="بعد النشر يظهر الاختبار للطلاب حسب نطاقه ولا يمكن سحبه من هنا. نشر الآن؟" | رفضته الجودة — افتحه وعدّله ليعود إلى المراجعة. |
| desc="الأسئلة التي اعتمدتها الجودة — سؤال جديد يمرّ على المراجعة أولاً." | toast.success('متاح للطلاب حسب نطاقه.', { |
| title={filtered ? 'لا توجد أسئلة تطابق التصفية' : 'البنك فارغ حتى الآن'} | title="النشر نهائي" |
| ? 'جرّب كلمات بحث مختلفة أو أزل بعض عوامل التصفية.' | {apiErrorMessage(publish.error, 'تعذَّر النشر.')} |
| : 'أنشئ أول سؤال — بعد اعتماده من الجودة يظهر هنا ويصلح للقوالب.' | message="يظهر للطلاب ولا رجعة. نشر الآن؟" |
| <Icon icon={X} size={13} /> مسح البحث والتصفية | title={filtered ? 'لا أسئلة تطابق التصفية' : 'البنك فارغ'} |
| تُعرض أول 100 نتيجة — قد تكون هناك المزيد. | <Icon icon={X} size={13} /> مسح التصفية |
| {countAr(question.points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])} | أُرسل السؤال إلى مراجعة الجودة. |
| الأسئلة المعتمدة ثابتة — أنشئ سؤالاً جديداً لصياغة معدَّلة. | hint={categoriesEmpty ? 'من المسجل العام.' : undefined} |
| أُرسل السؤال إلى مراجعة الجودة — يظهر في البنك بعد الاعتماد. | <option value="">لا تصنيفات بعد</option> |
| hint={categoriesEmpty ? 'تصنيفات الأسئلة تنشئها إدارة المنصة — تواصل معهم.' : undefined} | <Field label="نوع السؤال" htmlFor="newq-type"> |
| <option value="">جارٍ التحميل…</option> | placeholder="كما يظهر للطالب…" |
| <option value="">لا توجد تصنيفات بعد</option> | placeholder="بروتوكول التحكم بالنقل" |
| <Field label="نوع السؤال" htmlFor="newq-type" hint="النوع يحدد شكل الإجابة وطريقة التصحيح"> | hint="تُصحَّح يدوياً — يظهر المعيار للمصحح" |
| placeholder="اكتب نص السؤال كما سيظهر للطالب…" | placeholder="ثلاث خصائص مع شرح…" |
| hint="تُصحَّح إجابة الطالب آلياً بمطابقتها مع هذا النص" | <Field label="وسوم (اختياري)" htmlFor="newq-tags" error={errors.tags}> |
| placeholder="مثال: بروتوكول التحكم بالنقل" | {apiErrorMessage(create.error, 'تعذَّر حفظ السؤال.')} |
| hint="الأسئلة المقالية تُصحَّح يدوياً — يظهر المعيار للمصحح" | أُرسل القالب إلى مراجعة الجودة. |
| placeholder="مثال: يذكر الطالب ثلاث خصائص مع شرح موجز لكل منها…" | placeholder="اختبار نصفي — الشبكات" |
| <Field label="وسوم (اختياري)" htmlFor="newq-tags" error={errors.tags} hint="افصل بين الوسوم بفاصلة"> | hint={offeringsEmpty ? 'لا مقرّرات مسندة إليك.' : undefined} |
| {apiErrorMessage(create.error, 'تعذَّر حفظ السؤال — تحقّق من البيانات وحاول مرة أخرى.')} | <Field label="المدة (بالدقائق)" htmlFor="tpl-duration" error={errors.durationMin}> |
| أُرسل القالب إلى مراجعة الجودة — بعد الاعتماد يصبح النشر متاحاً. | <Field label="درجة النجاح (%)" htmlFor="tpl-pass" error={errors.passingScore}> |
| placeholder="مثال: اختبار نصفي — الشبكات" | <Field label="وصف (اختياري)" htmlFor="tpl-desc"> |
| hint={offeringsEmpty ? 'لا مقرّرات مسندة إليك هذا الفصل — اختر نطاقاً آخر.' : undefined} | {apiErrorMessage(create.error, 'تعذَّر إنشاء القالب.')} |
| <option value="">جارٍ التحميل…</option> | {countAr(selected.size, ['سؤال مختار', 'سؤالان مختاران', 'أسئلة مختارة', 'سؤالاً مختاراً'])} من 60 ·{' '} |
| <option value="">جارٍ التحميل…</option> | ترتيب اختيارك يحدّد ترتيب الأسئلة. |
| <Field label="المدة (بالدقائق)" htmlFor="tpl-duration" error={errors.durationMin} hint="بين 5 و 480 دقيقة"> | لا أسئلة معتمدة تطابق البحث. |
| <Field label="درجة النجاح (%)" htmlFor="tpl-pass" error={errors.passingScore} hint="نسبة من مجموع النقاط"> | <span className="exa-pick-order" title="ترتيبه في الاختبار"> |
| label="ترتيب عشوائي للأسئلة" | العودة إلى الاختبارات |
| description="يُخلط ترتيب الأسئلة لكل طالب عند بدء الاختبار" | desc={`مجموع النقاط ${countAr(totalPoints, COUNT__POINTS)}`} |
| label="يفتح في (اختياري)" | title="لا أسئلة في القالب" |
| : 'اختر من تقويم الحقل — الصيغة تتبع إعدادات المتصفح.'} | toast.success('أُنشئت نسخة للمراجعة.'); |
| label="يغلق في (اختياري)" | title="نسخة كاملة تُرسل للمراجعة" |
| : 'اختر من تقويم الحقل — الصيغة تتبع إعدادات المتصفح.'} | {apiErrorMessage(clone.error, 'تعذَّر الاستنساخ.')} |
| <Field label="وصف (اختياري)" htmlFor="tpl-desc" hint="يظهر للطالب قبل بدء الاختبار"> | toast.success('حُفظ التعديل وعاد للمراجعة.', { |
| placeholder="تعليمات مختصرة لطلابك…" | toast.success(SAVED_PLAIN, { title: 'تمّ الحفظ' }); |
| {apiErrorMessage(create.error, 'تعذَّر إنشاء القالب — تحقّق من البيانات وحاول مرة أخرى.')} | ? 'حفظ التعديل يُلغي الاعتماد ويعيد القالب إلى المراجعة.' |
| {countAr(selected.size, ['سؤال مختار واحد', 'سؤالان مختاران', 'أسئلة مختارة', 'سؤالاً مختاراً'])} من 60 ·{' '} | ? 'حفظ التعديل يعيده إلى المراجعة.' |
| {countAr(points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])} | ? 'حُفظ التعديل — القالب بانتظار المراجعة.' |
| ? 'ترتيب اختيارك يحدّد ترتيب الأسئلة — ويُخلط عشوائياً لكل طالب عند بدئه.' | الأسئلة والنطاق ثابتة — عدّل التوقيت أو استنسخ. |
| : 'ترتيب اختيارك يحدّد ترتيب الأسئلة.'} | <Field label="المدة (بالدقائق)" htmlFor="edit-tpl-duration" error={errors.durationMin}> |
| لا أسئلة معتمدة تطابق البحث — الجديدة تحتاج اعتماد الجودة أولاً. | <Field label="درجة النجاح (%)" htmlFor="edit-tpl-pass" error={errors.passingScore}> |
| <span className="exa-pick-order" title="ترتيب السؤال في الاختبار"> | : 'غير محدَّد.'} |
| <span>{countAr(question.points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}</span> | : 'غير محدَّد.'} |
| ? 'جارٍ التحميل…' | <Field label="وصف (اختياري)" htmlFor="edit-tpl-desc"> |
| ? countAr(q.data.length, ['قالب واحد بانتظار قرارك', 'قالبان بانتظار قرارك', 'قوالب بانتظار قرارك', 'قالباً بانتظار قرارك']) | {apiErrorMessage(update.error, 'تعذَّر حفظ التعديل.')} |
| description="كل القوالب المرسلة اجتازت المراجعة — الجديدة تظهر هنا فور إرسالها." | title={onlyPending ? 'لا محاولات بانتظار التصحيح' : NO_ATTEMPTS} |
| {countAr(item._count.questions, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])} ·{' '} | لم يكتب الطالب إجابة لهذا السؤال. |
| {countAr(item.durationMin, ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'])} | toast.success('اعتُمدت الدرجة النهائية.', { title: 'تمّ التصحيح' }); |
| العودة إلى بنك الأسئلة والاختبارات | اعتُمدت الدرجة النهائية: <bdi className="font-mono">{done.score} / {done.maxScore}</bdi>. |
| <span>عام — كل الكلّيّات</span> | {' '}· الدرجة الآلية: <bdi className="font-mono">{attempt.score} / {attempt.maxScore}</bdi> |
| count={countAr(template.questions.length, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])} | لا إجابات معلّقة — يُعتدّ بالدرجة الآلية. |
| desc={`مجموع النقاط ${countAr(totalPoints, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}`} | حدِّد حكم كل إجابة معلّقة قبل الحفظ. |
| title="لا أسئلة في هذا القالب" | {apiErrorMessage(grade.error, 'تعذَّر حفظ التصحيح.')} |
| description="ربما أُوقفت أسئلته من البنك بعد بنائه." | placeholder="تصل للمؤلف مع القرار…" |
| 'عام — كل الكلّيّات' |  |
| {countAr(template.durationMin, ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'])} |  |
| ? 'لا محاولات بعد' |  |
| : countAr(template._count.attempts, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])} |  |
| toast.success('أُنشئت نسخة بأسئلة القالب وأُرسلت إلى مراجعة الجودة.', { |  |
| title: 'تمّ الاستنساخ', |  |
| title="نسخة كاملة من القالب بأسئلته — تُرسل إلى مراجعة الجودة" |  |
| {apiErrorMessage(clone.error, 'تعذَّر الاستنساخ — تحقّق من اتصالك وحاول مرة أخرى.')} |  |
| toast.success('حُفظ التعديل وعاد القالب إلى المراجعة بمحتواه المحدَّث.', { |  |
| toast.success('حُفظت تعديلات القالب.', { title: 'تمّ الحفظ' }); |  |
| ? 'حفظ التعديل يُلغي الاعتماد ويعيد القالب إلى المراجعة قبل نشره.' |  |
| ? 'حفظ التعديل يعيد القالب إلى المراجعة بمحتواه المحدَّث.' |  |
| ? 'حُفظ التعديل — القالب الآن بانتظار مراجعة الجودة.' |  |
| : 'حُفظت التعديلات على القالب.'} |  |
| الأسئلة والنطاق ثابتة بعد الإنشاء — عدّل العرض والتوقيت هنا، |  |
| أو استنسخ القالب لأسئلة مختلفة. |  |
| <Field label="المدة (بالدقائق)" htmlFor="edit-tpl-duration" error={errors.durationMin} hint="بين 5 و 480 دقيقة"> |  |
| <Field label="درجة النجاح (%)" htmlFor="edit-tpl-pass" error={errors.passingScore} hint="نسبة من مجموع النقاط"> |  |
| label="ترتيب عشوائي للأسئلة" |  |
| description="يُخلط ترتيب الأسئلة لكل طالب عند بدء الاختبار" |  |
| label="يفتح في (اختياري)" |  |
| : 'غير محدَّد — يفتح فور النشر. مسح الحقل يزيل الموعد.'} |  |
| label="يغلق في (اختياري)" |  |
| : 'غير محدَّد — بلا إغلاق تلقائي. مسح الحقل يزيل الموعد.'} |  |
| <Field label="وصف (اختياري)" htmlFor="edit-tpl-desc" hint="يظهر للطالب قبل بدء الاختبار"> |  |
| placeholder="تعليمات مختصرة لطلابك…" |  |
| {apiErrorMessage(update.error, 'تعذَّر حفظ التعديل — تحقّق من البيانات وحاول مرة أخرى.')} |  |
| ? 'جارٍ التحميل…' |  |
| : countAr(awaiting, ['محاولة واحدة بانتظار تصحيحك', 'محاولتان بانتظار تصحيحك', 'محاولات بانتظار تصحيحك', 'محاولة بانتظار تصحيحك'])) |  |
| title={onlyPending ? 'لا محاولات بانتظار التصحيح' : 'لا محاولات بعد'} |  |
| ? 'كل المحاولات المسلَّمة مُصحَّحة — الجديدة تظهر فور تسليمها.' |  |
| : 'يبدأ الطلاب المحاولات من صفحاتهم — تظهر هنا لحظة بدئها.' |  |
| {countAr(attempt.pendingReview, ['إجابة واحدة بانتظار تقييمك', 'إجابتان بانتظار تقييمك', 'إجابات بانتظار تقييمك', 'إجابة بانتظار تقييمك'])} |  |
| {countAr(answer.points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])} |  |
| لم يكتب الطالب إجابة لهذا السؤال — حكمك يحدد درجته. |  |
| toast.success('اعتُمدت الدرجة النهائية للمحاولة.', { title: 'تمّ التصحيح' }); |  |
| اعتُمدت الدرجة النهائية: <bdi className="font-mono">{done.score} / {done.maxScore}</bdi> — سترى |  |
| المحاولة في القائمة بحالة «{ATTEMPT_STATUS_LABEL.GRADED}». |  |
| {' '}· الدرجة الآلية حتى الآن: <bdi className="font-mono">{attempt.score} / {attempt.maxScore}</bdi> |  |
| لا إجابات معلّقة — حفظ التصحيح يعتدّ بالدرجة الآلية كما هي ويُنهي المحاولة. |  |
| حدِّد حكمك — صحيحة أم خاطئة — لكل إجابة معلّقة قبل الحفظ. |  |
| {apiErrorMessage(grade.error, 'تعذَّر حفظ التصحيح — تحقّق من اتصالك وحاول مرة أخرى.')} |  |
| {countAr(points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])} |  |
| <span className="form-error-msg">{apiErrorMessage(failed.error, 'تعذَّر تنفيذ القرار — حاول مرة أخرى.')}</span> |  |
| placeholder="تصل الملاحظة للمؤلف مع قرار الاعتماد أو الرفض…" |  |
| يمكنك مراجعة أسئلته أدناه وإيقاف أيّ سؤال غير مناسب. |  |
| <span className="form-error-msg">{apiErrorMessage(failed.error, 'تعذَّر تنفيذ القرار — تحقّق من اتصالك وحاول مرة أخرى.')}</span> |  |

## frontend/src/pages/teacher/ResearchReviewPage.tsx (29 − / 18 +)

| before (removed) | after (added) |
|---|---|
| hint: 'بحوث اجتازت الفحص', | toast.success('انشره من «جاهزة للنشر».', { |
| hint: 'لا تحتاج تقييماً', | title: 'تمّ الحفظ', |
| hint: 'بحوث مُقيَّمة', | toast.success('متاح للطلاب في المكتبة.', { |
| toast.success('صار البحث مُقيَّماً — انشره في المكتبة من «جاهزة للنشر».', { | title: 'تمّ النشر', |
| title: 'تمّ حفظ التقييم', | setPublishError(apiErrorMessage(err, 'تعذَّر النشر — أعد المحاولة.')); |
| toast.success('أصبح البحث متاحاً للطلاب في مكتبة الجامعة.', { | مراجعة الأقدم |
| title: 'تمّ نشر البحث', | message="تعذَّر تحميل القائمة" |
| setPublishError(apiErrorMessage(err, 'تعذَّر نشر البحث — أعد المحاولة.')); | title="لا بحوث تنتظر" |
| description="قائمة بحوث الطلاب للمراجعة، ومنشوراتك العلمية." | <p className="r305rp-rev-empty-title">اختر بحثاً</p> |
| مراجعة أقدم بحث | message="الخروج يتخلّى عن تعديلاتك." |
| message="تعذَّر تحميل قائمة المراجعة" | <div className="r305rp-kicker"><h4 className="r305rp-kicker-title">نتائج الفحص</h4></div> |
| description="بحوث اجتازت الفحص التجريبي (محاكاة) — مرتّبة بالأقدم انتظاراً" | note="قيم تجريبية — ليست قياساً فعلياً." |
| title="لا بحوث في الانتظار" | placeholder="ملاحظاتك…" |
| description="تظهر هنا بحوث الطلاب فور اجتيازها الفحص (محاكاة)." | منشور — لا إجراء هنا. |
| description="بحوث تجاوزت الحدود التجريبية — لا تحتاج تقييماً" | <span className="text-xs text-muted">تعذَّر تحميل الملاحظات.</span> |
| description="بحوث قُيِّمت ويمكن نشرها في مكتبة الجامعة" | <Icon icon={RefreshCw} size={12} /> إعادة |
| <p className="r305rp-rev-empty-title">اختر بحثاً من القائمة</p> | label: 'منشوراتك', |
| تظهر نتائج الفحص ونموذج التقييم وملاحظاتك على المستند هنا. | title="لا منشورات بعد" |
| message="لديك تقييم لم تحفظه — التبديل أو الإغلاق الآن يتخلّى عنه نهائياً." |  |
| <div className="r305rp-kicker"><h4 className="r305rp-kicker-title">نتائج الفحص الأوتوماتيكي</h4></div> |  |
| note="قيم الفحص تجريبية معلنة — ليست قياساً فعلياً." |  |
| placeholder="اكتب ملاحظاتك على البحث…" |  |
| البحث منشور في المكتبة — لا إجراء متاح عليه هنا. |  |
| <span className="text-xs text-muted">تعذَّر تحميل الملاحظات على البحث.</span> |  |
| <Icon icon={RefreshCw} size={12} /> إعادة المحاولة |  |
| label: 'منشورات في ملفّك', |  |
| hint: publications.length === 0 ? 'لم تُسجَّل بعد' : 'في ملفك الأكاديمي', |  |
| title="لم تُسجَّل منشورات بعد" |  |
| description="حدِّث ملفك الأكاديميّ لإضافة بحوثك المنشورة." |  |

## frontend/src/pages/teacher/TeacherDashboardPage.tsx (22 − / 15 +)

| before (removed) | after (added) |
|---|---|
| <PageHeader title="لوحة الأستاذ" description="جارٍ تحضير لوحتك…" /> | <PageHeader title="لوحة الأستاذ" description="جارٍ التحميل…" /> |
| message="تعذَّر تحميل لوحة الأستاذ" | message="تعذَّر التحميل." |
| caption: 'اتجاه الأداء والحضور — آخر ستة أسابيع', | caption: 'اتجاه الأداء والحضور', |
| description="كل ما يحتاج تدخّلك اليوم — تيار واحد مرتّب بالأولوية." | : countAr(visible.length, ['عنصر', 'عنصران', 'عناصر', 'عنصراً'])} |
| : countAr(visible.length, ['عنصر يحتاج متابعة', 'عنصران يحتاجان متابعة', 'عناصر تحتاج متابعة', 'عنصراً يحتاج متابعة'])} | title="لا بيانات كافية بعد" |
| icon={Activity} subtitle="متوسط أداء وحضور طلابك خلال الأسابيع الستة الماضية"> | : `${countAr(coverage.weeksRecorded, ['أسبوع واحد مسجَّل', 'أسبوعان مسجَّلان', 'أسابيع مسجَّلة', 'أسبوعاً مسجَّلاً'])}` |
| title="لا تتوفّر بيانات كافية بعد لرسم الاتجاه" | <p>لا بيانات كافية بعد.</p> |
| ? 'لم يُسجَّل أسبوع بعد — يُرسم المخطط بعد أسبوعين على الأقل.' | summary="متوسط الدرجات مقابل الحضور." |
| : `${countAr(coverage.weeksRecorded, ['أسبوع واحد مسجَّل', 'أسبوعان مسجَّلان', 'أسابيع مسجَّلة', 'أسبوعاً مسجَّلاً'])} حتى الآن — يُرسم بعد أسبوعين على الأقل.` | title="لا متطلبات الآن" |
| <p>لا تتوفّر بيانات كافية بعد لرسم المخطط الخطي.</p> | استعرض مقرّراتك |
| summary="مقارنة أسبوعية بين متوسط درجات الطلاب ونسبة الحضور." | description={total === 0 ? undefined : `${countAr(total, ['تسليم', 'تسليمان', 'تسليمات', 'تسليماً'])} بانتظار درجتك`} |
| title="لا متطلبات الآن — أحسنت!" | {countAr(e.count, ['تسليم', 'تسليمان', 'تسليمات', 'تسليماً'])} |
| description="سيظهر هنا أي عنصر جديد فور وصوله." | <ErrorState message="تعذَّر التحميل." error={offsQ.error} onRetry={() => offsQ.refetch()} /> |
| استعرض أداء مقرّراتك | ? countAr(risks.data.length, ['طالب', 'طالبان', 'طلاب', 'طالباً']) |
| description={total === 0 ? undefined : countAr(total, ['تسليم بانتظار درجتك', 'تسليمان بانتظار درجتك', 'تسليمات بانتظار درجتك', 'تسليماً بانتظار درجتك'])} | <ErrorState message="تعذَّر التحميل." error={risks.error} onRetry={() => risks.refetch()} /> |
| <span>تظهر الجديدة فور وصولها.</span> |  |
| {countAr(e.count, ['تسليم واحد', 'تسليمان', 'تسليمات', 'تسليماً'])} |  |
| <ErrorState message="تعذَّر تحميل جدول اليوم" error={offsQ.error} onRetry={() => offsQ.refetch()} /> |  |
| meta="جدول اليوم فارغ — استرح أو راجع الأسبوعيّ." |  |
| ? countAr(risks.data.length, ['طالب تحت المتابعة', 'طالبان تحت المتابعة', 'طلاب تحت المتابعة', 'طالباً تحت المتابعة']) |  |
| <ErrorState message="تعذَّر تحميل قائمة المتابعة" error={risks.error} onRetry={() => risks.refetch()} /> |  |
| meta="لا مؤشّرات خطر — تظهر هنا أقصر طرق المتابعة فور رصدها." |  |

## frontend/src/pages/teacher/TeacherIntelligencePage.tsx (41 − / 36 +)

| before (removed) | after (added) |
|---|---|
| متابعة أداء طلابك بتحليل لحظي للحضور والدرجات، مع توصيات تدخّل. | <Icon icon={MessageSquare} size={13} /> راسل الطلاب |
| <Icon icon={MessageSquare} size={13} /> تواصل مع الطلاب | title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[01]</span>طلاب للمتابعة</>} |
| title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[01]</span>طلاب يحتاجون متابعة</>} | : risks.data && risks.data.length > 0 ? countAr(risks.data.length, ['طالب', 'طالبان', 'طلاب', 'طالباً']) |
| : risks.data && risks.data.length > 0 ? countAr(risks.data.length, ['طالب موزّع', 'طالبان موزّعان', 'طلاب موزّعون', 'طالباً موزّعاً']) | message="تعذَّر التحميل." |
| message="تعذَّر تحميل قائمة المتابعة" | title="الكل مستقر" |
| title="جميع طلابك في وضع جيد" | : offerings.data && offerings.data.length > 0 ? countAr(offerings.data.length, ['مقرّر', 'مقرّران', 'مقرّرات', 'مقرّراً']) + ' هذا الفصل' |
| description="لا حاجة لتدخّل عاجل." | message="تعذَّر التحميل." |
| : offerings.data && offerings.data.length > 0 ? countAr(offerings.data.length, ['مقرّر واحد هذا الفصل', 'مقرّران هذا الفصل', 'مقرّرات هذا الفصل', 'مقرّراً هذا الفصل']) | title="لا مقرّرات" |
| message="تعذَّر تحميل مقرّراتك" | <span><Icon icon={Users} size={12} /> {offering._count.enrollments === 0 ? 'لا طلاب' : countAr(offering._count.enrollments, ['طالب', 'طالبان', 'طلاب', 'طالباً'])}</span> |
| title="لم تُسند إليك مقرّرات بعد" | <span><Icon icon={BookOpen} size={12} /> {offering._count.lectures === 0 ? 'لا محاضرات' : countAr(offering._count.lectures, ['محاضرة', 'محاضرتان', 'محاضرات', 'محاضرة'])}</span> |
| description="تظهر مقرّراتك هنا فور إسنادها من المسجل العام." | <span><Icon icon={ClipboardCheck} size={12} /> {offering._count.assignments === 0 ? 'لا واجبات' : countAr(offering._count.assignments, ['واجب', 'واجبان', 'واجبات', 'واجباً'])}</span> |
| <span><Icon icon={Users} size={12} /> {offering._count.enrollments === 0 ? 'لا طلاب' : countAr(offering._count.enrollments, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}</span> | <span><Icon icon={Sparkles} size={12} /> {countAr(offering._count.examTemplates, ['اختبار', 'اختباران', 'اختبارات', 'اختباراً'])}</span> |
| <span><Icon icon={BookOpen} size={12} /> {offering._count.lectures === 0 ? 'لا محاضرات' : countAr(offering._count.lectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])}</span> | { value: 'students', label: 'الطلاب والمخاطر' }, |
| <span><Icon icon={ClipboardCheck} size={12} /> {offering._count.assignments === 0 ? 'لا واجبات' : countAr(offering._count.assignments, ['واجب واحد', 'واجبان', 'واجبات', 'واجباً'])}</span> | مقرّراتي |
| <span><Icon icon={Sparkles} size={12} /> {countAr(offering._count.examTemplates, ['اختبار واحد', 'اختباران', 'اختبارات', 'اختباراً'])}</span> | message="تعذَّر التحميل." |
| { value: 'students', label: 'الطلاب وتقييم المخاطر' }, | مقرّراتي |
| العودة إلى كل مقرّراتي | مقرّراتي |
| message="تعذَّر تحميل بيانات المقرّر" | <p className="hr-eyebrow">تحليل المقرّر</p> |
| العودة إلى كل مقرّراتي | : countAr(offering._count.enrollments, ['طالب', 'طالبان', 'طلاب', 'طالباً'])} |
| description="حُذف العرض أو الرابط غير صحيح." | <Badge>{countAr(offering.course.credits, ['وحدة', 'وحدتان', 'وحدات', 'وحدة'])}</Badge> |
| العودة إلى كل مقرّراتي | <Icon icon={ClipboardCheck} size={13} /> إدخال الدرجات |
| <p className="hr-eyebrow">الذكاء الأكاديمي · تحليل المقرّر</p> | message="تعذَّر التحميل." |
| : countAr(offering._count.enrollments, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])} | trend: 'تسجيلات نشطة', |
| <Badge>{countAr(offering.course.credits, ['وحدة واحدة', 'وحدتان', 'وحدات', 'وحدة'])}</Badge> | trend: 'فوق حدّ 50%', |
| <Icon icon={ClipboardCheck} size={13} /> إدخال درجات المقرّر | <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[01]</span>قائمة الطلاب</>} icon={Users}> |
| message="تعذَّر تحميل مؤشرات المقرّر" | message="تعذَّر التحميل." |
| trend: 'تسجيلات نشطة في المقرّر', | title="لا طلاب" |
| trend: 'طلاب عند 50 فأعلى', | title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[02]</span>اقتراح هيكل المنهج</>} |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[01]</span>قائمة الطلاب — تحليل لحظي</>} icon={Users}> | {suggest.isPending ? 'جارٍ الاقتراح…' : suggest.data ? 'إعادة الاقتراح' : 'اقترح الهيكل'} |
| message="تعذَّر تحميل قائمة الطلاب" | <span className="text-sm text-muted">تعذَّر الاقتراح.</span> |
| title="لا يوجد طلاب مسجَّلون" | title="ابدأ باقتراح" |
| description="تظهر قائمة الطلاب فور تسجيلهم في المقرّر." | description="قالبيّ بمطابقة الاسم (محاكاة)." |
| title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[02]</span>اقتراح هيكل منهج (محاكاة قالبية)</>} | <Badge>{countAr(suggest.data.outline.length, ['فصل', 'فصلان', 'فصول', 'فصلاً'])}</Badge> |
| {suggest.isPending ? 'جارٍ الاقتراح…' : suggest.data ? 'إعادة الاقتراح' : 'اقتراح هيكل المنهج'} | <Badge color="brand">{countAr(suggest.data.suggestedTotalLectures, ['محاضرة مقترحة', 'محاضرتان مقترحتان', 'محاضرات مقترحة', 'محاضرة مقترحة'])}</Badge> |
| <span className="text-sm text-muted">تعذَّر اقتراح هيكل المنهج.</span> | <Badge color="green">{countAr(suggest.data.currentLectureCount, ['محاضرة موجودة', 'محاضرتان موجودتان', 'محاضرات موجودة', 'محاضرة موجودة'])}</Badge> |
| title="ابدأ باقتراح ذكي" | <Badge>{countAr(ch.estLectures, ['محاضرة', 'محاضرتان', 'محاضرات', 'محاضرة'])}</Badge> |
| description="اقتراح قالبيّ بمطابقة اسم المقرّر — لا تحليل للمحتوى (محاكاة)." |  |
| <Badge>{countAr(suggest.data.outline.length, ['فصل واحد', 'فصلان', 'فصول', 'فصلاً'])}</Badge> |  |
| <Badge color="brand">{countAr(suggest.data.suggestedTotalLectures, ['محاضرة مقترحة واحدة', 'محاضرتان مقترحتان', 'محاضرات مقترحة', 'محاضرة مقترحة'])}</Badge> |  |
| <Badge color="green">{countAr(suggest.data.currentLectureCount, ['محاضرة موجودة واحدة', 'محاضرتان موجودتان', 'محاضرات موجودة', 'محاضرة موجودة'])}</Badge> |  |
| <Badge>{countAr(ch.estLectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])}</Badge> |  |

## frontend/src/pages/teacher/TeacherLabsPage.tsx (7 − / 2 +)

| before (removed) | after (added) |
|---|---|
| وجّه طلابك للمعامل كمكمّل عملي — يدخلون كمشاركين، وأنت | <strong>تنويه:</strong> بيئات محاكاة — ليست بديلاً عن المختبر الواقعي. |
| المسؤول عن سياق التعلّم. | description="تواصل مع إدارة المنصّة." |
| trend: 'شبكات، علوم، ذكاء اصطناعي…', |  |
| trend: 'منصّات مختلفة داخل المعامل', |  |
| <strong>تنويه:</strong> المعامل بيئات محاكاة معتمدة — لتعزيز فهم النظري، |  |
| ليست بديلاً عن المختبر الواقعي. |  |
| description="تواصل مع إدارة المنصة لإضافة معامل لكليتك." |  |

## frontend/src/pages/teacher/TeacherLivePage.tsx (21 − / 14 +)

| before (removed) | after (added) |
|---|---|
| setCreateError(apiErrorMessage(err, 'تحقّق من اتصالك ثم أعد المحاولة.')); | setCreateError(apiErrorMessage(err, 'تحقّق من اتصالك.')); |
| <span className="hr-brow">التعليم المتزامن</span> | <Icon icon={Plus} size={14} /> {showForm ? 'إغلاق' : 'جلسة جديدة'} |
| جدولة المحاضرات الحية وتشغيلها — الطلاب يرون جلسات مقرّراتهم فقط. | trend: live.length === 0 ? 'لا بثّ' : undefined, |
| <Icon icon={Plus} size={14} /> {showForm ? 'إغلاق النموذج' : 'جلسة جديدة'} | trend: past.length === 0 ? 'لا جلسات سابقة' : undefined, |
| trend: live.length === 0 ? 'لا بثّ نشط حالياً' : 'يمكن إنهاؤها من هنا', | <Card title="جلسة جديدة" icon={Plus}> |
| trend: scheduled.length === 0 ? 'لا جلسات قادمة' : 'قادمة في جدولك', | <span className="flex-1">تعذَّر تحميل مقرّراتك.</span> |
| trend: past.length === 0 ? 'لا جلسات سابقة' : 'معروضة في الأسفل', | {offerings.isPending ? 'جارٍ التحميل…' : '— اختر مقرراً —'} |
| <Card title="جلسة بث جديدة" icon={Plus}> | : 'اختر من التقويم.'} |
| <span className="flex-1">تعذَّر تحميل مقرّراتك — اختر المقرر بعد إعادة المحاولة.</span> | placeholder="مثال: الوحدة الثالثة" |
| {offerings.isPending ? 'جارٍ تحميل مقرّراتك…' : '— اختر مقرراً —'} | placeholder="الانحدار الخطي" |
| : 'اختر من تقويم الحقل — الصيغة تتبع إعدادات المتصفح.'} | placeholder="ما ستغطّيه الجلسة…" |
| placeholder="مثال: شرح الوحدة الثالثة — التعلم الآلي" | <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[01]</span>مباشرة الآن</>} icon={Radio}> |
| placeholder="مثال: الانحدار الخطي" | : countAr(scheduled.length, ['جلسة مجدولة', 'جلستان مجدولتان', 'جلسات مجدولة', 'جلسة مجدولة'])} |
| placeholder="الموضوعات التي ستغطّيها الجلسة…" | title="لا جلسات قادمة" |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[01]</span>مباشرة الآن</>} icon={Radio} subtitle="جلسات نشطة — أنهِها من هنا"> |  |
| : countAr(scheduled.length, ['جلسة مجدولة واحدة', 'جلستان مجدولتان', 'جلسات مجدولة', 'جلسة مجدولة'])} |  |
| title="لا توجد جلسات قادمة" |  |
| description="أنشئ جلسة جديدة لتظهر هنا." |  |
| <button type="button" className="btn primary sm" onClick={onStart} title="بدء البث" disabled={busy}> |  |
| <button type="button" className="btn sm" onClick={onEnd} title="إنهاء البث" disabled={busy}> |  |
| title="إلغاء الجلسة" |  |

## frontend/src/pages/teacher/TeacherPages.tsx (84 − / 65 +)

| before (removed) | after (added) |
|---|---|
| if (offsQ.isPending) return <div className="page"><PageHeader title="جدول المحاضرات" subtitle="جدولك الأسبوعيّ مع القاعات والأوقات." /><Card><TableSkeleton rows={5} cols={4} /></Card></div>; | if (offsQ.isPending) return <div className="page"><PageHeader title="جدول المحاضرات" /><Card><TableSkeleton rows={5} cols={4} /></Card></div>; |
| if (offsQ.isError) return <div className="page"><PageHeader title="جدول المحاضرات" subtitle="جدولك الأسبوعيّ مع القاعات والأوقات." /><ErrorState error={offsQ.error} onRetry={() => offsQ.refetch()} /></div>; | if (offsQ.isError) return <div className="page"><PageHeader title="جدول المحاضرات" /><ErrorState error={offsQ.error} onRetry={() => offsQ.refetch()} /></div>; |
| subtitle="جدولك الأسبوعيّ مع القاعات والأوقات." | <Link to="/teacher/attendance" className="btn accent sm">تسجيل الحضور</Link> |
| <Link to="/teacher/attendance" className="btn accent sm">تسجيل حضور اليوم</Link> | <input type="text" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مقدّمة في UML" /> |
| description="ستظهر محاضراتك هنا فور تسجيل جداول مقرّراتك." | <EmptyState title="لا توجد مقرّرات" description="" illustration="empty-courses" /> |
| : 'اختر التاريخ من تقويم الحقل — الصيغة تتبع إعدادات المتصفح.'} | <EmptyState title="لا طلاب" description="" illustration="empty-list" /> |
| <input type="text" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: مقدّمة في UML" /> | <p className="hr-note">اختر مقرّراً.</p> |
| <EmptyState title="لا توجد مقرّرات" description="ستظهر المقرّرات هنا حين تُسنَد إليك." illustration="empty-courses" /> | <EmptyState icon={ClipboardCheck} title="لا طلاب" description="" illustration="empty-list" /> |
| <EmptyState title="لا يوجد طلاب" description="لا توجد تسجيلات نشطة في هذا المقرّر بعد." illustration="empty-list" /> | {apiErrorMessage(record.error, 'تعذَّر حفظ سجلّ الحضور.')} |
| <p className="hr-note">اختر مقرّراً لعرض إحصائيّات جلساته.</p> | <span>تمّ حفظ سجلّ الحضور.</span> |
| <EmptyState icon={ClipboardCheck} title="لا طلاب في هذا المقرّر بعد" description="لا إحصائيّات بعد — سجّل طالبًا أول لعرض حضوره." illustration="empty-list" /> | المتوسّط يجمع الواجبات والدرجات الفصليّة — والتحليل الأعمق في{' '} |
| {apiErrorMessage(record.error, 'تعذَّر حفظ سجلّ الحضور.')} أعد المحاولة بالضغط على «حفظ السجلّ». | <Link to="/teacher/intelligence" className="text-link">الذكاء الأكاديميّ</Link>. |
| <span>تمّ حفظ سجلّ الحضور لهذا التاريخ.</span> | <EmptyState title="اختر مقرّراً" description="" illustration="empty-courses" /> |
| subtitle="نظرة على متوسّط درجات طلاب المقرّر الحاليّ." | <EmptyState title="لا طلاب" description="" illustration="empty-list" /> |
| المتوسّط يجمع كل تقييم مُرصَد لكل طالب — درجات الواجبات المُقيَّمة والدرجات | setFormError('أدخل درجة واحدة على الأقل.'); |
| الفصليّة المسجَّلة من بطاقة الإدخال أدناه.{' '} | setFormError('الحدّ 200 درجة في الحفظة الواحدة.'); |
| <Link to="/teacher/intelligence" className="text-link">شاهد الذكاء الأكاديميّ</Link> | else if (value < 0) errors[s.studentId] = 'الدرجة لا تكون سالبة.'; |
| {' '}للحصول على تحليل أعمق. | toast.success('حُفظت الدرجات.'); |
| <EmptyState title="اختر مقرّراً" description="حدّد مقرّراً من الأعلى لعرض درجات طلابه." illustration="empty-courses" /> | : 'الفارغ لا يُرسَل.' |
| <EmptyState title="لا يوجد طلاب" description="لا توجد تسجيلات في هذا المقرّر بعد." illustration="empty-list" /> | <EmptyState title="اختر مقرّراً" description="" illustration="empty-courses" /> |
| setFormError('أدخل درجة واحدة على الأقل — الفارغ لا يُرسَل ولا يمسّ المسجَّلة.'); | <EmptyState title="لا طلاب" description="" illustration="empty-list" /> |
| setFormError('الحدّ 200 درجة في الحفظة الواحدة — احفظ على دفعات.'); | <th scope="col">{`الدرجة (0–${maxInvalid ? 100 : maxVal})`}</th> |
| else if (value < 0) errors[s.studentId] = 'لا يمكن أن تكون الدرجة سالبة.'; | <th scope="col">ملاحظات (اختياري)</th> |
| toast.success('حُفظت الدرجات وستظهر لطلاب المقرّر فوراً.', { title: 'تمّ الحفظ' }); | <td data-label="ملاحظات (اختياري)"> |
| : 'سجّل درجة كل طالب — الفارغ لا يُرسَل، والمسجَّلة مسبقاً تأتي معبَّأة.' | placeholder="ملاحظة للطالب…" |
| hint="بين 1 و100 — تعتمد من المسجَّلة لهذا النوع" | {apiErrorMessage(upsert.error, 'تعذَّر حفظ الدرجات.')} |
| <EmptyState title="اختر مقرّراً" description="حدّد مقرّراً من الأعلى لإدخال درجات طلابه." illustration="empty-courses" /> | <span>تمّ حفظ الدرجات المسجَّلة.</span> |
| <EmptyState title="لا يوجد طلاب" description="لا تسجيلات في المقرّر بعد — لا درجات لإدخالها." illustration="empty-list" /> | if (!file) { setValidationError('اختر ملف PDF.'); return; } |
| <th scope="col">{`الدرجة (من 0 إلى ${maxInvalid ? 100 : maxVal})`}</th> | toast.success('أُضيف الملف إلى المقرّر.'); |
| <th scope="col">ملاحظات للطالب (اختياري)</th> | toast.success('أُضيف الملف إلى المقرّر.'); |
| <td data-label="ملاحظات للطالب (اختياري)"> | <FormField label="المقرّر" error={list.length === 0 ? 'لا مقرّرات مرتبطة بحسابك.' : undefined}> |
| placeholder="ملاحظة قصيرة تصل الطالب مع الدرجة…" | placeholder='محاضرة الأسبوع الثالث' |
| {apiErrorMessage(upsert.error, 'تعذَّر حفظ الدرجات — حاول مرة أخرى.')} | hint="PDF فقط — حتى 20 ميغابايت." |
| <span>تمّ حفظ الدرجات المسجَّلة في هذا النوع.</span> | hint='رابط مباشر للملف.' |
| if (!file) { setValidationError('اختر ملف PDF للرفع.'); return; } | placeholder='وصف مختصر…' |
| toast.success('أُضيف الملف إلى المقرّر وسيظهر لطلابه فوراً.', { title: 'تمّت الإضافة' }); | ? pdfUploadErrorMessage(uploadMaterial.error, 'تعذّرت إضافة المادة.') |
| toast.success('أُضيف الملف إلى المقرّر وسيظهر لطلابه فوراً.', { title: 'تمّت الإضافة' }); | : apiErrorMessage(create.error, 'تعذّرت إضافة المادة.')} |
| <FormField label="المقرّر" error={list.length === 0 ? 'لا توجد مقرّرات مرتبطة بحسابك — تواصل مع المسجل العام.' : undefined}> | <EmptyState title="لا ملفات" description="" illustration="empty-list" /> |
| placeholder='مثال: محاضرة الأسبوع الثالث — الشرائح' | <PageHeader title="قائمة الطلاب" /> |
| hint="ملفات PDF فقط، بحد أقصى 20 ميغابايت." | <PageHeader title="قائمة الطلاب" /> |
| hint='رابط مباشر للملف، أو مسار ملف ورقة من المنصة.' | إرفاق طلاب |
| placeholder='وصف مختصر لمحتوى المادة…' | <EmptyState title="اختر مقرّراً" description="" illustration="empty-courses" /> |
| ? pdfUploadErrorMessage(uploadMaterial.error, 'تعذّرت إضافة المادة — حاول مرة أخرى.') | <EmptyState title="لا طلاب" description="" illustration="empty-list" /> |
| : apiErrorMessage(create.error, 'تعذّرت إضافة المادة — حاول مرة أخرى.')} | title="المخاطرة والأداء" |
| subtitle="ملفّاتك على مقرّراتك — مع المشاهدات والتحميلات الفعليّة." | <EmptyState title="اختر مقرّراً" description="" illustration="empty-courses" /> |
| ارفع ملف PDF من جهازك أو أضف رابطاً خارجياً — المرفوعات | trend: students.length > 0 ? `${passing} من ${students.length}` : 'لا بيانات', |
| تُخزَّن على المنصة ويفتحها الطلاب من العارض الداخلي. | trend: students.length > 0 ? `من ${students.length}` : 'لا بيانات', |
| <EmptyState title="لم ترفع ملفات بعد" description="أضف أول مادة بزر «إضافة مادة» — يظهر لطلاب المقرّر فوراً." illustration="empty-list" /> | title="لا بيانات توزيع" |
| <PageHeader title="قائمة الطلاب" subtitle="جميع الطلاب المسجّلين في مقرّراتك." /> | Number.isNaN(Date.parse(dueAt)) ? 'الموعد النهائي غير صالح.' : |
| <PageHeader title="قائمة الطلاب" subtitle="جميع الطلاب المسجّلين في مقرّراتك." /> | toast.success('أُنشئ الواجب.', { title: 'تمّ الإنشاء' }); |
| subtitle="جميع الطلاب المسجَّلين في مقرّراتك." | <FormField label="المقرّر" error={list.length === 0 ? 'لا مقرّرات مرتبطة بحسابك.' : undefined}> |
| إرفاق طلاب بهذا المقرر | placeholder="واجب الأسبوع الأول" |
| <EmptyState title="اختر مقرّراً" description="حدّد مقرّراً من الأعلى لعرض قائمة طلابه." illustration="empty-courses" /> | : 'اختر من التقويم.'} |
| <EmptyState title="لا يوجد طلاب مسجَّلون" description="لا تسجيلات نشطة في المقرّر بعد." illustration="empty-list" /> | placeholder="تعليمات التسليم…" |
| title="سياق المخاطرة والأداء في الذكاء الأكاديميّ" | {apiErrorMessage(create.error, 'تعذّر إنشاء الواجب.')} |
| subtitle="رؤى على أداء فصلك — مُستخرجة من بيانات الحضور والدرجات الفعليّة." | <EmptyState title="لا واجبات" description="" illustration="empty-list" /> |
| <EmptyState title="اختر مقرّراً" description="حدّد مقرّراً من الأعلى لعرض تحليل فصلك." illustration="empty-courses" /> | : countAr(pending.length, ['تسليم', 'تسليمان', 'تسليمات', 'تسليماً']) + ' بانتظار درجتك' |
| trend: students.length > 0 ? `${passing} من ${students.length}` : 'لا توجد بيانات', | title="لا تسليمات بانتظارك" |
| trend: students.length > 0 ? `من ${students.length}` : 'لا توجد بيانات', | setValidationError('الدرجة لا تكون سالبة.'); |
| title="لا توجد بيانات توزيع بعد" | toast.success('تمّ حفظ الدرجة.', { title: 'تمّ التقييم' }); |
| description="سيظهر التوزيع فور تسجيل طلاب في المقرّر." | placeholder="ملاحظاتك…" |
| Number.isNaN(Date.parse(dueAt)) ? 'قيمة الموعد النهائي غير صالحة.' : | {apiErrorMessage(grade.error, 'تعذَّر حفظ الدرجة.')} |
| toast.success('أُنشئ الواجب وسيظهر لطلاب المقرّر فوراً.', { title: 'تمّ الإنشاء' }); | ...(rosterQ.isPending ? ['جارٍ التحميل…'] : []), |
| <FormField label="المقرّر" error={list.length === 0 ? 'لا توجد مقرّرات مرتبطة بحسابك — تواصل مع المسجل العام.' : undefined}> | ...(rosterQ.isError ? ['تعذَّر تحميل الطلاب'] : []), |
| placeholder="مثال: واجب الأسبوع الأول — مقدمة في الموضوع" | noRecipientsHint="لا مستلمين — اختر مقرّراً أو ردّ على رسالة واردة." |
| : 'اختر من تقويم الحقل — الصيغة تتبع إعدادات المتصفح.'} |  |
| placeholder="تعليمات التسليم ومعايير التقييم…" |  |
| {apiErrorMessage(create.error, 'تعذّر إنشاء الواجب — حاول مرة أخرى.')} |  |
| subtitle="الواجبات الموزَّعة على مقرّراتك، والتسليمات بانتظار تقييمك." |  |
| <EmptyState title="لا توجد واجبات بعد" description="أنشئ أول واجب بزر «واجب جديد» — يظهر لطلاب المقرّر فوراً." illustration="empty-list" /> |  |
| <span className="text-xs font-mono text-muted" title="التسليمات مقابل المسجّلين"> |  |
| ? 'لا تسليمات بانتظار درجتك' |  |
| : countAr(pending.length, ['تسليم واحد بانتظار درجتك', 'تسليمان بانتظار درجتك', 'تسليمات بانتظار درجتك', 'تسليماً بانتظار درجتك']) |  |
| title="لا تسليمات بانتظار التصحيح" |  |
| description="ستظهر هنا تسليمات طلابك فور وصولها." |  |
| setValidationError('لا يمكن أن تكون الدرجة سالبة.'); |  |
| toast.success('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.', { title: 'تمّ التقييم' }); |  |
| placeholder="اكتب ملاحظاتك على الإجابة…" |  |
| {apiErrorMessage(grade.error, 'تعذَّر حفظ الدرجة — حاول مرة أخرى.')} |  |
| ...(rosterQ.isPending ? ['جارٍ تحميل طلاب المقرّر…'] : []), |  |
| ...(rosterQ.isError ? ['تعذَّر تحميل طلاب المقرّر'] : []), |  |
| noRecipientsHint="لا مستلمين متاحين بعد — اختر مقرّراً أو ردّ على رسالة واردة." |  |
| hint="اختر مقرّراً لدرج طلابه — أو راسِل من راسلك سابقاً." |  |
| subtitle="كل رسالة وصلتك أو أرسلتها — المستلمون طلاب مقرّراتك ومن راسلك سابقاً." |  |

## frontend/src/pages/teacher/TeacherProfilePage.tsx (36 − / 34 +)

| before (removed) | after (added) |
|---|---|
| message="تعذَّر تحميل ملفك الأكاديمي" | message="تعذَّر التحميل." |
| title="لا يوجد ملف أستاذ مرتبط بهذا الحساب" | title="لا ملف مرتبط" |
| description="تواصل مع المسجل العام لربط ملفك الأكاديمي بهذا الحساب." | description="راجع المسجل العام لربطه." |
| setSaveError(apiErrorMessage(err, 'تعذَّر حفظ التعديلات — أعد المحاولة.')); | setSaveError(apiErrorMessage(err, 'تعذَّر الحفظ.')); |
| ملفك كما يظهر للمسجل العام والجودة والطلاب — حدّثه ليعكس نشاطك العلمي. | <Icon icon={Edit3} size={14} /> تعديل البيانات |
| <Icon icon={Edit3} size={14} /> تعديل البيانات الشخصية | <Icon icon={Save} size={14} /> {update.isPending ? 'جارٍ…' : 'حفظ'} |
| <Icon icon={Save} size={14} /> {update.isPending ? 'جارٍ الحفظ…' : 'حفظ'} | {saveError ?? 'تمّ الحفظ.'} |
| {saveError ?? 'تمّ حفظ تعديلات ملفك الأكاديمي.'} | label: 'المقرّرات', |
| label: 'المقرّرات هذا الفصل', | trend: countAr(profile.workload.totalCredits, ['وحدة', 'وحدتان', 'وحدات', 'وحدة']), |
| trend: countAr(profile.workload.totalCredits, ['وحدة معتمدة واحدة', 'وحدتان معتمدتان', 'وحدات معتمدة', 'وحدة معتمدة']), | trend: 'في مقرّراتك', |
| trend: 'مسجَّلون في مقرّراتك', | trend: countAr(profile.yearsExperience, ['سنة خبرة', 'سنتا خبرة', 'سنوات خبرة', 'سنة خبرة']), |
| trend: countAr(profile.yearsExperience, ['سنة خبرة واحدة', 'سنتا خبرة', 'سنوات خبرة', 'سنة خبرة']), | placeholder="خبرتك واهتماماتك العلمية…" |
| placeholder="نبذة عن خبرتك الأكاديمية واهتماماتك العلمية…" | <div className="text-sm text-muted">لم تُضف نبذة.</div> |
| <div className="text-sm text-muted">لم تُضف نبذة بعد — اضغط «تعديل» لإضافتها.</div> | placeholder="مبنى الكلّيّة - مكتب 305" |
| placeholder="مثال: مبنى الكلّيّة - مكتب 305" | placeholder="الأحد والثلاثاء 10-12" |
| placeholder="مثال: الأحد والثلاثاء 10-12" | <div className="text-xs text-muted">غير محدّد.</div> |
| <div className="text-xs text-muted">لم يُحدد موقع المكتب.</div> | <div className="text-xs text-muted">غير محدّدة.</div> |
| <div className="text-xs text-muted">لم تُحدَّد ساعات العمل.</div> | <div className="text-xs text-muted">غير مضاف.</div> |
| <div className="text-xs text-muted">لم يُضف موقع شخصي.</div> | <div className="text-sm text-muted">لا مجالات بعد.</div> |
| <div className="text-sm text-muted">لم تُسجَّل مجالات بحثية بعد.</div> | ? 'لا شهادات' |
| ? 'لم تُضف شهادة' | : countAr(profile.certifications.length, ['شهادة', 'شهادتان', 'شهادات', 'شهادة'])} |
| : countAr(profile.certifications.length, ['شهادة واحدة', 'شهادتان', 'شهادات', 'شهادة'])} | <div className="text-sm text-muted">لا شهادات.</div> |
| <div className="text-sm text-muted">لم تُضف شهادات.</div> | ? 'لا منشورات' |
| ? 'لم تُضف منشورات' | : countAr(profile.publications.length, ['منشور', 'منشوران', 'منشورات', 'منشوراً'])} |
| : countAr(profile.publications.length, ['منشور واحد', 'منشوران', 'منشورات', 'منشوراً'])} | title="لا منشورات بعد" |
| title="لم تُضف منشورات بعد" | description="تُدار من المسجل العام." |
| description="تُدار منشوراتك من ملفك الأكاديمي لدى المسجل العام." | ? 'لا جوائز' |
| ? 'لم تُضف جائزة' | : countAr(profile.awards.length, ['جائزة', 'جائزتان', 'جوائز', 'جائزة'])} |
| : countAr(profile.awards.length, ['جائزة واحدة', 'جائزتان', 'جوائز', 'جائزة'])} | title="لا جوائز بعد" |
| title="لم تُضف جوائز بعد" | description="تُدار من المسجل العام." |
| description="تُدار تكريماتك وجوائزك من ملفك الأكاديمي لدى المسجل العام." | <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[08]</span>المقرّرات الحالية</>} icon={BookOpen} subtitle={`${countAr(profile.courses.length, ['مقرّر', 'مقرّران', 'مقرّرات', 'مقرّراً'])} هذا الفصل`}> |
| <Card title={<><span className="w11-idx" dir="ltr" aria-hidden="true">[08]</span>المقرّرات الحالية</>} icon={BookOpen} subtitle={countAr(profile.courses.length, ['مقرّر واحد هذا الفصل', 'مقرّران هذا الفصل', 'مقرّرات هذا الفصل', 'مقرّراً هذا الفصل'])}> | title="لا مقرّرات" |
| title="لم يُسند إليك أي مقرّر بعد" | <span><Icon icon={Users2} size={12} /> {countAr(c.enrolled, ['طالب', 'طالبان', 'طلاب', 'طالباً'])}</span> |
| description="ستظهر مقرّراتك هنا فور إسنادها من قِبَل المسجل العام." | <span>{countAr(c.credits, ['وحدة', 'وحدتان', 'وحدات', 'وحدة'])}</span> |
| <span><Icon icon={Users2} size={12} /> {countAr(c.enrolled, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}</span> |  |
| <span>{countAr(c.credits, ['وحدة واحدة', 'وحدتان', 'وحدات', 'وحدة'])}</span> |  |

## frontend/src/pages/vision/VisionPages.tsx (10 − / 7 +)

| before (removed) | after (added) |
|---|---|
| title={`${formatNum(total)} ابتكاراً قادماً، نبني التعليم في يدك خطوة بخطوة.`} | title={`${formatNum(total)} ابتكاراً قادماً`} |
| title="لا توجد ابتكارات معروضة بعد" | title="لا ابتكارات بعد" |
| description="تظهر خارطة الطريق هنا حين تُنشر." | {countAr(grouped.beta.length, ['متاح للتجربة', 'متاحان للتجربة', 'متاحة للتجربة', 'متاحاً للتجربة'])} |
| {countAr(grouped.beta.length, ['ابتكار متاح للتجربة', 'ابتكاران متاحان للتجربة', 'ابتكارات متاحة للتجربة', 'ابتكاراً متاحاً للتجربة'])} | ['ابتكار مبكر', 'ابتكاران مبكران', 'ابتكارات مبكرة', 'ابتكاراً مبكراً'], |
| ['ابتكار في المراحل المبكرة', 'ابتكاران في المراحل المبكرة', 'ابتكارات في المراحل المبكرة', 'ابتكاراً في المراحل المبكرة'], | خارطة طريق لا وعود تسويقية — كل بطاقة تصف مرحلتها الفعلية وتُحدَّث فور تغيّرها. |
| هذه خارطة طريق لا وعود تسويقية: كل بطاقة تصف مرحلتها الفعلية من | نبّهني عند الإطلاق |
| التطوير، وتُحدَّث حالتها هنا فور تغيّرها. لا نتائج مقيسة ولا | خدمة التنبيه على البريد قيد التطوير. |
| مواعيد إطلاق متوقّعة — حقائق تصميم ومراحل عمل فقط. |  |
| نبّهني عند إطلاق هذه الميزة |  |
| خدمة التنبيه على البريد قيد التطوير — حالة كل ابتكار تُحدَّث هنا فور تغيّرها. |  |