# Landing copy reduction proposal — R368 T8-a

**Date:** 2026-11-19 · **Branch:** `wip/r368-t8` · **Status: PROPOSAL ONLY — no landing file is edited
by T8-a.** The lead owns every `frontend/src/**` file named below; this document is the edit list the
lead asked for (task brief: "a concrete per-edit reduction list … Target ≥20 % of the pinned total").
**Baseline:** `docs/audit/evidence/landing-copy-baseline.md` — **1 398** Arabic visible words pinned;
**−20 % target: ≤ 1 118** (cut **≥ 280**).

## How to read this proposal

- **Δ** = Arabic words removed from the pinned source surface (same lexer as the baseline; every Δ
  below was machine-verified, not estimated).
- **Category A (rendered cuts)** — edits that shorten words a visitor or screen-reader actually
  reads. **239 words.**
- **Category B (source-dedup, zero rendered change)** — duplicated source literals whose second copy
  never renders; removing them shrinks the pinned source surface without changing one rendered word.
  **42 words.** Flagged separately because the lead may rule them ineligible for an "honest copy
  reduction" claim (the metric as pinned is source-based; the call is the lead's, recorded either way).
- Every current string below was grepped against `frontend/tests/**` for exact-string pins; conflicts
  found are in the **Pinned-string conflicts** section. The tests are LAW (AGENTS.md §3) — where a pin
  exists the proposal keeps the pinned string verbatim.

## Category A — rendered-copy edits (239 words)

### `components/landing/sections/Concepts.tsx` — 85 words (the r362 original band: our own copy, not
frozen-spec-mapped; its prose restates the itemized cards three times over)

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| C1 | `.cf-lede` | نرسم التعلّم كما يرسم المسّاح الأرض: كل مفهوم محطّة معلَّمة، وكل ربط خطّ بصر مقيس، وكل فجوة تُعلَّم بعلامة — ثم نسير المسار نفسه بوابات، من القراءة الموجّهة إلى الإتقان. (29) | نرسم التعلّم كما يرسم المسّاح الأرض: كل مفهوم محطّة، وكل ربط مقيس، وكل فجوة معلَّمة — ثم نسير المسار بوابات إلى الإتقان. (21) | −8 | Keeps: surveyor metaphor, concept=station, measured links, marked gaps, gates-to-mastery path. Drops adjectives the four annotation cards repeat. | none |
| C2 | ACT-01 `.cf-act-text` | خريطة المفاهيم في مدارك شبكة مثلثية: تبدأ من أُسّ مرجعي، تُقفل كل خط بصر فتُصبح المعرفة قابلة للقياس — والمفهوم الذي لا يُربط يظهر فورًا كفجوة معلَّمة. (26) | **OMIT** the paragraph (keep the `<h3>` + the annotation list) | −26 | Every claim survives verbatim one screen-inch below in the four `ANNOTATIONS` items (datum/يُقفل مثلثًا/measurable/unlinked→gap); this is the prose restatement of an itemized list. | none (r308 asserts only `.cf-title`, `.cf-field`, `.cf-disclose`, stage rows) |
| C3 | ACT-02 `.cf-act-text` | من نقطة البداية إلى الإتقان: كل بوابة مرحلة مقيسة، والمسار نفسه يتدرّج على سلّم مستويات. مسّ بوابة في الرسم أو صفًّا في القائمة — يُبرز مقطعاها على المسار. (27) | مسّ بوابة في الرسم أو صفًّا في القائمة — يُبرز مقطعها على المسار. (12) | −15 | Keeps the only non-duplicated content: the interaction instruction (pointer + list both highlight the route segment). The dropped clauses restate the five STAGES rows and the gates' own names. | none |
| C4 | ANNOTATIONS[0].text | نقطة البداية التي تُقاس منها المفاهيم — كل مسافة في الرسم تنطلق منها. (12) | النقطة التي تُقاس منها المفاهيم. (5) | −7 | Keeps: the datum everything is measured from. Drops "every distance in the drawing departs from it" (same fact, drawn by the instrument itself). | none |
| C5 | ANNOTATIONS[1].text | كل خط بصر جديد يُقفل مثلثًا، فيثبت المفهوم في الشبكة ويصبح قابلاً للتحقّق. (13) | كل خط جديد يُقفل مثلثًا فيثبت المفهوم. (7) | −6 | Keeps: new sight-line closes a triangle → concept fixed in the net. Drops "becomes verifiable" (the measurable claim is in C1's replacement + station-3). | none |
| C6 | ANNOTATIONS[2].text | مرّر المؤشر أو ركّز على أي محطة: يُرسم خطّ القياس من الأُسّ إليها مع بُعدها بوحدات الرسم. (17) | مرّر المؤشر على أي محطة: يُرسم خطّ القياس وبُعدها. (9) | −8 | Keeps the instruction (hover/focus any station → measurement line + its distance). Drops "from the datum" (the line is drawn from it visibly) and "in drawing units". | none |
| C7 | ANNOTATIONS[3].text | المفهوم غير المرتبط يبقى معزولًا بعلامة إشارة — أول ما يعالجه المساعد الأكاديمي. (12) | المفهوم غير المرتبط يبقى معلَّمًا — أول ما يعالجه المساعد. (9) | −3 | Keeps: unlinked concept stays marked; the assistant handles it first. (المساعد الأكاديمي full name renders at Product panel + JourneyScene finding 5.) | none |
| C8 | STAGES[0].note | مادة محدّدة قبل الجلسة — البوابة الأولى. (6) | مادة محدّدة قبل الجلسة. (4) | −2 | Keeps the definition (assigned material before the session); "first gate" is the list's own position. | none |
| C9 | STAGES[1].note | سؤال قصير يثبّت الفهم داخل المحاضرة نفسها. (7) | سؤال يثبّت الفهم داخل المحاضرة. (5) | −2 | Keeps question-fixes-understanding-in-lecture. | none |
| C10 | STAGES[2].note | تدريب يُصحَّح فورًا ويُحتسب في مصفوفة الإتقان. (7) | تدريب يُصحَّح فورًا ويُحتسب في المصفوفة. (6) | −1 | Same claim, one word shorter. | none |
| C11 | STAGES[3].note | عمل يُسلَّم ويُفهرس في مكتبة البحوث. (6) | عمل يُسلَّم ويُفهرس في المكتبة. (5) | −1 | Same claim. | none |
| C12 | STAGES[4].note | المحطة التي تُغلق المسار — سلّم المستويات كاملًا. (7) | المحطة التي تُغلق المسار. (4) | −3 | Keeps: the terminal station. Drops "levels ladder complete" (the ladder is the drawn route). | none |
| C13 | `.cf-disclose` | رسم توضيحي — لغة مدارك التقنية على بيانات مثال؛ لا يمثل تقدّمًا أكاديميًا حقيقيًا. (13) | رسم توضيحي على بيانات مثال — لا يمثل تقدّمًا أكاديميًا حقيقيًا. (10) | −3 | Honesty disclosure kept whole: illustrative drawing, sample data, no real academic progress. Drops the "Madarek technical language" tagline. | none (the required disclosure stays) |

### `components/landing/journey/JourneyScene.tsx` — 51 words

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| J1 | `CLOSE_COPY_AR` | مرّر لتشاهد الرحلة تُبنى على مسطح واحد: لا لقطات مُجمّلة ولا وعودًا قادمة. كل غرفة في هذا المسطح ميزة تعمل اليوم داخل المنصّة — من قاعة المحاضرات إلى غرفة الإتقان — وإنشاء الحساب في نهاية الصفحة. المسطح رسم أصلي لمدارك، والغرف تتّسع مع كل فصل جديد. (44) | مرّر لتشاهد الرحلة تُبنى على مسطح واحد: لا لقطات مُجمّلة ولا وعودًا قادمة. كل غرفة ميزة تعمل اليوم داخل المنصّة — وإنشاء الحساب في نهاية الصفحة. المسطح رسم أصلي. (28) | −16 | Keeps: the scroll instruction, the no-glam/no-promises honesty frame, **ميزة تعمل اليوم داخل المنصّة** (every room = a live capability), the register pointer, the originality note. Drops the room range (the doors themselves are labelled on the drawing + the four findings) and the grows-each-semester note. | r308:149 pins substring **«ميزة تعمل اليوم داخل المنصّة»** — KEPT verbatim inside the replacement. |
| J2 | `FINDINGS_AR[0].text` | محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، وحضور يُحتسب تلقائيًا عند الإكمال. (11) | محاضرة مسجَّلة بنقاط فحص وحضور تلقائي. (6) | −5 | Keeps recorded lecture + checkpoints + automatic attendance. | none |
| J3 | `FINDINGS_AR[1].text` | سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال. (10) | سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم. (8) | −2 | Keeps the checkpoint definition; "before moving on" is the flow itself. | none |
| J4 | `FINDINGS_AR[2].text` | بنك أسئلة بأربعة أنواع وقوالب جاهزة، وتصحيح تلقائي للأسئلة الموضوعية. (10) | بنك أسئلة بأربعة أنواع وتصحيح تلقائي للموضوعي. (7) | −3 | Same facts (4 question types, auto-grading objective). | none |
| J5 | `FINDINGS_AR[4].foot` | المساعد — يعمل اليوم داخل المنصّة (5) | المساعد — يعمل اليوم (3) | −2 | The foot is the doorway label; "inside the platform" rides the finding text directly above. | none |
| J6 | `LEDGER_AR[0].text` | المحاضرة التفاعلية — شرح مسجَّل بنقاط فحص وحضور يُحتسب (8) | المحاضرة التفاعلية (2) | −6 | The ledger row keeps the subject; the full sentence is finding 1's own text in the same walkthrough. | none |
| J7 | `LEDGER_AR[1].text` | نقاط الفحص داخل المحاضرة تصحّح الفهم فورًا (7) | نقاط الفحص (2) | −5 | Same rationale as J6. | none |
| J8 | `LEDGER_AR[2].text` | الاختبارات الإلكترونية بأنواعها وقوالبها الجاهزة (5) | الاختبارات الإلكترونية (2) | −3 | Same rationale as J6. | none |
| J9 | `LEDGER_AR[3].text` | مصفوفة الإتقان والمراجعة حسب أدائك الفعلي (6) | مصفوفة الإتقان (2) | −4 | Same rationale as J6. | r168b pins «خطط مراجعة حسب أدائك الفعلي» at file level — satisfied by finding 5 (untouched), so this cut is safe. |
| J10 | `ANNOTATIONS_AR[0].text` | بنك أسئلة بأربعة أنواع وتصحيح تلقائي فوري. (7) | أسئلة بأربعة أنواع وتصحيح فوري. (5) | −2 | The drawing callout stays a callout; the full claim is finding 3. | none |
| J11 | `ANNOTATIONS_AR[2].text` | رفع البحوث ومتابعة تقييمها داخل المنصّة. (6) | رفع البحوث ومتابعة تقييمها. (4) | −2 | "Inside the platform" is the whole sheet's context. | none |
| J12 | `ANNOTATIONS_AR[1].text` | مراجع ومصادر لكل فصل. (4) | مراجع لكل فصل. (3) | −1 | مراجع/مصادر are synonyms here. | none |

### `components/landing/sections/Roles.tsx` — 22 rendered words (+14 dedup, category B)

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| R1 | `DECK_ART_*.alt` | مبنى مدرسي أفقي منخفض وخط أفق أرضي مفتوح في مشهد معماري هادئ بلمسة برتقالية (14) | مبنى مدرسي أفقي منخفض وخط أفق مفتوح بلمسة برتقالية (9) | −5 | Alt still describes the authored plate: low horizontal school building, open horizon, one orange accent. | none |
| R2 | student line | رحلة تعلّم شخصية — من المحاضرة الأولى إلى الإتقان: جدول اليوم، والمهام، والتقدّم في مقرّر واحد. (15) | رحلة تعلّم شخصية: جدول اليوم والمهام والتقدّم في مقرّر واحد. (10) | −5 | Keeps the personal-journey claim + the three concrete surfaces. Drops "from first lecture to mastery" — that is the H1's own promise two bands above. | none |
| R3 | teacher line | بناء المحاضرات والاختبارات، وتصحيح بملاحظات، ومتابعة الطلاب قسمًا قسمًا. (9) | بناء المحاضرات والاختبارات، وتصحيح بملاحظات، ومتابعة الطلاب. (7) | −2 | "Department by department" is the registrar row's own grid metaphor. | none |
| R4 | registrar line | الكليات والأقسام والمقرّرات والصلاحيات، وتقارير حيّة عنها جميعًا. (8) | الكليات والأقسام والمقرّرات والصلاحيات — وتقارير حيّة. (6) | −2 | Keeps the registry scope + live reports. | none |
| R5 | quality line | مجالس الجودة ومؤشرات الالتزام — وكل مؤسّسة معزولة تمامًا عن غيرها. (10) | مجالس الجودة ومؤشرات الالتزام — وكل مؤسّسة معزولة. (7) | −3 | The isolation guarantee is the claim; "completely" is emphasis. | none |
| R6 | researcher line | طالب أو أستاذ يكتب بحثه: رفع PDF، وفحص نزاهة معلَن، وملاحظات معلَّمة من الأستاذ. (14) | طالب أو أستاذ: رفع PDF، وفحص نزاهة معلَن، وملاحظات معلَّمة من الأستاذ. (11) | −3 | Keeps who (student or teacher) + all three facts (PDF upload, declared integrity check, annotated teacher notes). Drops "writes their research" (the row title is الباحث). | none |
| R7 | guardian line | لا حساب منفصل لوليّ الأمر اليوم — المتابعة تمرّ عبر تقرير الطالب نفسه. (12) | لا حساب لوليّ الأمر اليوم — المتابعة عبر تقرير الطالب. (9) | −3 | Keeps the honest-absence fact + the real path (the student's own report). | none |
| — | supervisor line | المعامل الافتراضية قيد التطوير — فهرس للاستعراض دون تشغيل بعد. | **KEEP VERBATIM** | 0 | r168b truthfulness pin. | r168b:92-93 pins «المعامل الافتراضية» + «دون تشغيل بعد» in Roles.tsx |

### `components/landing/sections/Product.tsx` — 28 words

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| P1 | item 1 text | اختبار إلكتروني يعمل اليوم: مؤقّت، وأسئلة موضوعية بتصحيح تلقائي، ومقالية تصل إلى الأستاذ — على بيانات الطالب نفسها. (17) | اختبار إلكتروني يعمل اليوم: مؤقّت، وتصحيح تلقائي للموضوعي، ومقالية للأستاذ — على بيانات الطالب نفسها. (14) | −3 | Keeps live-today, timer, auto-graded objective, essay-to-teacher, same student data. | none |
| P2 | item 2 text | من نقطة الفحص داخل المحاضرة إلى خطة المراجعة: كل أداة تعمل على بيانات الطالب نفسها، فلا ينتقل الفهم بين أنظمة متفرّقة. (21) | من نقطة الفحص إلى خطة المراجعة: كل أداة على بيانات الطالب نفسها — لا أنظمة متفرّقة. (15) | −6 | Keeps the no-silo thesis (one data spine checkpoint→review-plan). | none |
| P3 | item 1 alt | لوحة تخطيطية مقاسة: مخطط طابق بإسقاط علوي ولوحة مساعدة على ورق دافئ، بلمسة برتقالية واحدة (15) | مخطط طابق ولوحة مساعدة على ورق دافئ بلمسة برتقالية (9) | −6 | Alt keeps the two described panels + paper + accent. | none |
| P4 | item 2 alt | لوحة تخطيطية مقاسة: صفوف بيانات ولوحة أدوات على ورق دافئ، بقواعد رفيعة ولمسة برتقالية واحدة (15) | صفوف بيانات ولوحة أدوات على ورق دافئ بلمسة برتقالية (9) | −6 | Same for the data-table plate. | none |
| P5 | panel answer line | سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال. (10) | سؤال داخل المحاضرة يُصحَّح فورًا. (5) | −5 | The panel's spec line keeps the checkpoint definition; the full sentence remains at JourneyScene finding 2. | none |
| P6 | `PANEL_SHOT.alt` | لوحة الطالب في مدارك — لقطة حقيقية من واجهة مدارك (بيانات العرض التجريبية) (12) | لوحة الطالب — لقطة حقيقية من واجهة مدارك (بيانات العرض التجريبية) (10) | −2 | "in Madarek" was redundant with "from Madarek's interface". Keeps the real-capture + demo-data disclosure. | none |

### `components/landing/sections/Statement.tsx` — 8 rendered words (+28 dedup, category B)

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| S1 | `STATEMENT_TEXT` tail | …سجلّ واحد للقسم والكلية — يعمل اليوم، ويكبر مع كل فصل. (28 total) | …سجلّ واحد للقسم والكلية — يعمل اليوم. (24 total) | −4 | Keeps the one-ledger-per-department-and-college claim + works-today. Drops "grows with every semester" — a roadmap promise, not a live fact (the honest-ledger rule prefers present tense). | **mapping risk** — see Global risks |
| S2 | `MEDIA_ART.alt` | رسم أصلي: برج معرفي عمودي بشرائح رأسية على ورق دافئ، ودائرة جمرٍ تلامس كتفه الأيمن (15) | رسم أصلي: برج معرفي بشرائح رأسية ودائرة جمرٍ على ورق دافئ (11) | −4 | Keeps originality mark + tower/shards/ember/paper. | none |

### `components/landing/sections/Why.tsx` — 8 words

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| W1 | `.wy-lede-t` | شاهد، تحقّق، اختبر، أتقن — المراحل الأربع التي تعبرها في كل مقرّر داخل مدارك، ولكل مرحلة سطح حقيقي من أسطح الطالب نعرضه هنا كما هو تمامًا. (25) | شاهد، تحقّق، اختبر، أتقن — أربع مراحل في كل مقرّر، ولكل مرحلة سطح حقيقي للطالب نعرضه كما هو. (17) | −8 | Keeps the four stages, per-course framing, and the as-is honesty claim ("real surface, shown as it is"). | none |

### `components/landing/WhyScene.tsx` — 12 words

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| Y1 | ROWS[0].sub | محاضرة مسجَّلة بنقاط فحص تُصحَّح فورًا أثناء المشاهدة (8) | محاضرة مسجَّلة بنقاط فحص تُصحَّح فورًا (6) | −2 | "during watching" is the capture itself. | none |
| Y2 | ROWS[3].sub | مصفوفة إتقان تُظهر ما أتممت وما بقي عليك (8) | مصفوفة إتقان تُظهر ما أتممت وما بقي (7) | −1 | "on you" implied. | none |
| Y3 | stage `alt` | دورة المنصّة من اليمين إلى اليسار: مرصد التعلّم، جدار الفجوات، ممر التدريب، وسلّم التقدّم الصاعد (15) | دورة المنصّة: مرصد التعلّم، جدار الفجوات، ممر التدريب، وسلّم التقدّم (10) | −5 | Keeps all four named stations. | none |
| Y4 | stage caption | دورة مدارك في لوحة واحدة — من المشاهدة إلى الإتقان (9) | دورة مدارك في لوحة واحدة (5) | −4 | The four ROW titles below ARE the from-watch-to-mastery sequence. | none |

### `components/landing/sections/Vision.tsx` — 5 words

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| V1 | `.fo-cta-lede` | أنشئ حسابك الجامعي في دقائق — ببريدك الإلكتروني ورقم قيدك، وتابع تقدّمك من أول محاضرة. (14) | أنشئ حسابك الجامعي في دقائق — ببريدك الإلكتروني ورقم قيدك، وتابع تقدّمك. (11) | −3 | Keeps university-email + enrolment-number requirement. Drops "from your first lecture" (the hero's own words). | landing-funnel:133 pins **«أنشئ حسابك الجامعي»** inside the lede block — KEPT. |
| V2 | registry login link | سجل الدخول لاستعراض كليتك داخل المنصّة (6) | سجل الدخول لاستعراض كليتك (4) | −2 | The 5th login affordance keeps its route + purpose. | funnel counts route hrefs (5), not this label — unaffected. |

### `components/landing/sections/Live.tsx` — 8 words

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| L1 | PAINS[0].text | تُلقى المحاضرة ثم ينتهي أثرها: لا فحص يثبّت الفهم، ولا حضور يُحتسب. (12) | تُلقى المحاضرة ثم ينتهي أثرها: لا فحص ولا حضور يُحتسب. (10) | −2 | Same two gaps (no check to fix understanding, no counted attendance). | none |
| L2 | PAINS[1].text | تمرّ أسابيع قبل أن يعرف الطالب خطأه — وفرصة المراجعة تكون قد فاتت. (12) | تمرّ أسابيع قبل أن يعرف الطالب خطأه — وتفوت فرصة المراجعة. (10) | −2 | Same fact, active verb. | none |
| L3 | PAINS[*].answer ×4 | الجواب: … (prefix, 1 word × 4) | drop the «الجواب: » prefix; the accented leading sentence stays | −4 | The r322 pin is structural ("the answer rides as the body block's leading sentence, accented") — the accent + leading position carry the answer grammar without the spoken prefix. **Flagged: voice change — lead's call.** | none pins the literal «الجواب» |

### `components/landing/cursor/HeroInspect.tsx` — 5 words

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| H1 | `cp.bodyAr` | سؤال قصير داخل المحاضرة يُصحَّح فورًا قبل المتابعة. (8) | سؤال داخل المحاضرة يُصحَّح فورًا. (5) | −3 | Keeps the checkpoint definition (the same fact also lives at JourneyScene finding 2 + Product panel). | r306:247 pins the LABELS «نقطة فحص / مراجعة بحث / فجوة إتقان» — all three labels KEPT verbatim; only body texts change. |
| H2 | `research.bodyAr` | بحث PDF بملاحظات معلَّمة من الأستاذ ثم فهرسة في المكتبة. (9) | بحث PDF بملاحظات معلَّمة من الأستاذ وفهرسة في المكتبة. (8) | −1 | Then→and. | none |
| H3 | `gap.bodyAr` | المصفوفة تكشف الفجوة وتربطها بالدرس المناسب لك. (7) | المصفوفة تكشف الفجوة وتربطها بالدرس المناسب. (6) | −1 | "for you" implied. | none |

### `components/landing/hero/Hero.tsx` — 2 words

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| HE1 | `LEAD_LINES[0]` | محاضرات تفاعلية، ومصفوفة إتقان، واختبارات، وبحوث، ورسائل — (7) | محاضرات تفاعلية، واختبارات، وبحوث، ورسائل — (5) | −2 | The work strip directly below enumerates ALL SIX capability subjects (`HERO_WORK_ITEMS`); the lead line keeps four + the dash into the positioning line. | H1 lines + funnel labels untouched. |

### `components/landing/sections/Footer.tsx` — 1 word

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| F1 | `.fo-biglink-t` | التواصل والتسجيل المبكر (3) | التسجيل المبكر (2) | −1 | The `<h3>التواصل</h3>` beside it already names the door; the link keeps the early-access purpose. | **Flagged** — see conflict #2. |

### `components/landing/ElevationDrawing.tsx` — 4 words

| id | seat | current | proposed | Δ | meaning check | pins |
|---|---|---|---|---:|---|---|
| E1 | `bp-tag` | مسار التعلّم — من المحاضرة إلى الإتقان (6) | مسار التعلّم (2) | −4 | The elevation's five zone labels (المحاضرات → الإتقان) already draw the path; the tag caption duplicated the H1's promise. | r306:298 pins the file's aria-label prefix — aria untouched. |

## Category B — source-dedup, zero rendered change (42 words)

| id | file | duplication | proposed | Δ | rendered change | pins |
|---|---|---|---|---:|---|---|
| S0 | `Statement.tsx` | `STATEMENT_TEXT` (28 words — the rendered manifesto) **and** `STATEMENT_LINES` (the same sentence re-authored as 8 line strings — `ScrubReveal` reads only each line's word COUNT, never its content; verified in `journey/WordReveal.tsx:156-158`) | replace `STATEMENT_LINES` with a numeric `STATEMENT_LINE_COUNTS = [4,4,3,4,3,4,3,3]` (+ a tiny `ScrubReveal` counts prop or a split derived in place) | −28 | **none** — the DOM is byte-identical; the line census (`intro.line.1..8`) keeps 8 lines | none (structure unchanged) |
| R0 | `Roles.tsx` | `DECK_ART_WIDE.alt` and `DECK_ART_NARROW.alt` carry the same 14-word string twice; only one art object renders at a time | one shared `DECK_ART_ALT` constant (the `copy.ts` one-constant pattern) | −14 | **none** — both objects reference the same string value | none |

These are "repeated labels" in the source surface (the plan's Task-8 language) and they count against
the pinned metric as defined — but they change no rendered word, so the lead may prefer to exclude
them from the acceptance claim and take the reserve bench instead. Both numbers are shown.

## The arithmetic

Machine-verified deltas (the same `countWords` law as the baseline script):

| file | rendered Δ | dedup Δ | total |
|---|---:|---:|---:|
| Concepts.tsx | −85 | — | −85 |
| JourneyScene.tsx | −51 | — | −51 |
| Roles.tsx | −22 | −14 | −36 |
| Product.tsx | −28 | — | −28 |
| Statement.tsx | −8 | −28 | −36 |
| Why.tsx | −8 | — | −8 |
| WhyScene.tsx | −12 | — | −12 |
| Vision.tsx | −5 | — | −5 |
| Live.tsx | −8 | — | −8 |
| HeroInspect.tsx | −5 | — | −5 |
| hero/Hero.tsx | −2 | — | −2 |
| Footer.tsx | −1 | — | −1 |
| ElevationDrawing.tsx | −4 | — | −4 |
| **TOTAL** | **−239** | **−42** | **−281** |

- **Coverage: 281 / 1 398 = 20.1 % ≥ 20 %** → post-cut count **1 117 ≤ 1 118** (the −20 % target
  from the pinned baseline) — **with both categories**.
- **Rendered-only: 239 / 1 398 = 17.1 %** → 1 159 words — 41 short of the target if the lead rules
  the source-dedups ineligible. The reserve bench below closes that gap.

### Reserve bench (defensible, flagged, NOT counted in the 281)

| id | edit | Δ | flag |
|---|---|---:|---|
| B1 | J1 deeper: drop «لا لقطات مُجمّلة ولا وعودًا قادمة.» | −5 | loses the no-glam/no-promises honesty frame (the works-today claim stays) |
| B2 | P1 deeper: drop «— على بيانات الطالب نفسها» | −4 | the same-data thesis then lives only on item 2 |
| B3 | W1 deeper: drop «نعرضه كما هو» | −3 | loses the as-is honesty clause |
| B4 | R1 deeper: alt 9→6 («مبنى مدرسي وخط أفق بلمسة برتقالية») | −3 | thinner alt description |
| B5 | L-deep: PAINS[2].text 10→7 (drop «ولا خطوته التالية») | −3 | loses the next-step framing |
| B6 | C9 deeper: gate-2 note 5→3 | −2 | thinner stage note |
| B7 | Y2 deeper: row-2 sub drop «صادقة» | −1 | loses the honesty adjective on the dashboard capture |

Bench total: **−21** — enough to reach 260 rendered-only (18.6 %) or, with the dedups, 302 (21.6 %).

**Explicitly NOT proposed** (would move the number without an honest landing-copy reduction):
- `SheetLoader.tsx` (49 words) — retired-from-mount (R333 P-D); its copy renders nowhere. Deleting
  the file is a deadcode-lane decision (knip/jscpd ratchet), not a copy edit; claiming it would be
  metric-gaming.
- `data/landing-ledger.ts` `LIVE_CAPABILITIES` (35) + `VISION_STATUS` (32) — render on
  `/capabilities`, not on the landing; cutting them edits another page's copy (its own 50-word
  ceiling in `docs/QA/copy-budget.json` applies) while lowering the landing number. Out of scope.
- `data/colleges.config.ts` `nameAr` values (36) — real (synthetic-registry) college names: data,
  not copy.

## Pinned-string conflicts found (grep of `frontend/tests/**` for every current string above)

1. **r168b-truthfulness.test.tsx:63-64** — `JourneyScene.tsx` must contain «شروحات مخصَّصة» AND
   «خطط مراجعة حسب أدائك الفعلي» (source-level `toContain`). The finding-5 assistant text carries
   both and is **KEPT VERBATIM** — an earlier draft of this proposal shortened it and is withdrawn.
   The J9 ledger cut is safe because the pin is file-level and finding 5 satisfies it.
2. **legal-pages.test.tsx:81** — the `/contact` route-table entry pins the ContactPage title
   «التواصل والتسجيل المبكر». The Footer's biglink (F1) happens to reuse that exact string; the
   test reads the page's own title constant, **not** the footer — no break. Flag: F1 makes the door
   label diverge from the destination page's title; if the lead wants them identical, keep F1 (−1
   lost) and pull B6+B7 instead.

**Verified-pinned and untouched by this proposal** (every one greps in tests): «رحلة تعلم واحدة» +
«من المحاضرة إلى الإتقان» (H1 — guest-landing/r308/r312/r309/r311/r325), «مدارك» + «منصّة التعليم
الذكي» + «مؤسسة مدارك النموذجية» + «ما يعمل اليوم» (guest-landing; brand/identity), «أنشئ حسابك
الجامعي» + «تسجيل الدخول» (funnel — landing-funnel/r183/guest-landing), «نقطة فحص» / «مراجعة بحث» /
«فجوة إتقان» (HeroInspect labels — r306:247), «المحاضرة التفاعلية» (JourneyScene finding title —
r308:131), «الفصول» + «الرحلة — أربعة فصول تتحرك أمامك» + «ميزة تعمل اليوم داخل المنصّة»
(JourneyScene closing column — r308:147-149), «مقدمة» (intro card — r312-mobile-camera:381),
«المعامل الافتراضية … دون تشغيل بعد» (Roles supervisor row — r168b:92-93), «اصطناعية بالكامل» +
«مستقلّة» (r177:120-122 / r188 over the landing), «فتح القائمة»/«إغلاق القائمة»/«المظهر» (SheetNav
— landing-funnel:225,241 / r162), «© {year} مدارك» (r177), the aria-label «واجهة معمارية لمبنى
التعلّم…» prefix (r306:298), and the funnel structure itself (5 × `to="/auth/register"` + 5 ×
`to="/auth"` — landing-funnel:108,119). All preserved.

## Preservation checklist (rules from the task brief, honored)

- **Libyan education terms** — preserved everywhere: مقرّر, قسم/كلية, رقم قيد, أستاذ, مسجل عام,
  ضمان الجودة, مصفوفة الإتقان, نقطة فحص, مكتبة البحوث, اختبارات موضوعية/مقالية, بحث عربي.
- **Instructions** — kept: the Concepts interaction instruction (C3 keeps it whole), HeroInspect
  hover/tap hints, the preloader skip, the CTA pairs.
- **Error explanations / consent / legal** — untouched: ConsentBanner, the Footer legal row, the
  independence paragraph (r188/r320 §D contract, verbatim), the registry demo-data disclosure.
- **aria-labels / accessibility names** — zero aria edits (aria is outside the pinned total anyway);
  all section/stage/control labels stay.
- **No bulk rewrite** — 58 edits (56 rendered + 2 source-dedups), each a single string with a meaning check; 26 of the rendered edits are ≤3 words.

## Global risks the lead must weigh before applying

1. **E-score re-measure** — every text shortening changes ink coverage in text regions; the affected
   seats' conformance E (SSIM) must be re-run per the plan's per-seat gates (T floors are
   data-spec-bound, so structure is safe).
2. **Statement census sync** — S1 changes the manifesto word count 28→24; the frozen-spec char
   scaffold `HERON_CHAR_COUNTS` (26 entries) currently binds `intro.wchar.N.M` for our words — fewer
   words than the reference's 26 means the last char-box pairs lose their counterpart (mapping law:
   no-counterpart = FAIL). Applying S1 requires re-syncing `scripts/conformance/mapping/
   home-intro-wrap.json` (drop the surplus wchar bindings) in the same change. S0's dedup keeps the
   8-line census intact.
3. **copy.ts consumers** — REGISTER/LOGIN/BRAND_LABEL/START_NOW/MASTERY_SCORE_LINE/LECTURE_INTERACTIVE
   are untouched; HE1/V1/F1 change only per-seat literals.
4. **Bundle** — all cuts are copy-negative; no new code except S0's tiny counts plumbing (net
   negative).
5. Re-run `node scripts/gates/landing-copy-baseline.mjs` after applying — the post-cut count must
   read ≤ 1 118.
