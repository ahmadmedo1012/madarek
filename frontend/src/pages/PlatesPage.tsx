/**
 * PlatesPage — `/__plates` — the R344 C-4 product-plate stage.
 * Self-contained like `/__design`: App.tsx wires one route + one import.
 *
 * WHY: the R333-era `public/media/product/*` captures were live-stack
 * app screenshots — full chrome, 11px-effective Arabic, cluttered. The
 * R344 C-4 contract replaces every one of them with AN ISOLATED UI
 * FRAGMENT on a paper plate: hairline frame, effective Arabic type
 * ≥ 14px, no chrome, light+dark deterministic twins. Every scene below
 * composes the REAL shipped components (components/primitives +
 * components/patterns — the same register /__design judges) with FIXED
 * fixture data — no network, no login, no transport: `scripts/art/
 * render-plates.mjs` renders this page per scene × theme and the
 * captures are byte-stable by construction (fixed DOM, fixed fonts,
 * no animation — the plate class pins `prefers-reduced-motion` via a
 * no-JS-motion style guard).
 *
 * Scene ids match `src/data/product-media.ts` PRODUCT_CAPTURES +
 * the Roles EXTRA_CAPTURES ladder + the three `src/assets/product`
 * consumers (Product.tsx / WhyScene.tsx).
 */

/* ── the plate stage ────────────────────────────────────────────────────────
 * The stage is the capture window: fixed 720×450 (the img contract),
 * paper ground, the hairline frame, and the fragment inset with the
 * sheet's own margins. The data-plate id is the render-plates key. */
import { StatLine } from '../components/patterns';
import { usePageTitle } from '../hooks/usePageTitle';
import { AlertRow, Badge, MetricCard, Pill, ProgressBar } from '../components/primitives';
import type { ReactNode } from 'react';

function PlatesPage(): React.JSX.Element {
  usePageTitle('لوحات المنتج');
  return (
    <main className="plates-root" aria-label="لوحات المنتج — مشاهد معزولة">
      <PlateScene id="student-dashboard" title="لوحة الطالب">
        <FragmentDashboard />
      </PlateScene>
      <PlateScene id="student-library" title="المكتبة الإلكترونية">
        <FragmentLibrary />
      </PlateScene>
      <PlateScene id="student-lecture-player" title="المشغّل التفاعلي">
        <FragmentLecturePlayer />
      </PlateScene>
      <PlateScene id="student-matrix" title="مصفوفة الإتقان">
        <FragmentMatrix />
      </PlateScene>
      <PlateScene id="teacher-dashboard" title="لوحة الأستاذ">
        <FragmentTeacher />
      </PlateScene>
      <PlateScene id="admin-dashboard" title="لوحة المسجل العام">
        <FragmentAdmin />
      </PlateScene>
      <PlateScene id="owner-dashboard" title="لوحة المالك">
        <FragmentOwner />
      </PlateScene>
      <PlateScene id="quality-dashboard" title="مكتب الجودة">
        <FragmentQuality />
      </PlateScene>
      <PlateScene id="ai-tutor" title="المساعد الذكيّ">
        <FragmentAiTutor />
      </PlateScene>
      <PlateScene id="exam-active" title="مركز الاختبارات">
        <FragmentExamActive />
      </PlateScene>
      <PlateScene id="lecture-checkpoint" title="نقطة الفحص">
        <FragmentCheckpoint />
      </PlateScene>
    </main>
  );
}

/* ── the stage wrapper ────────────────────────────────────────────────────── */
function PlateScene({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="plate" data-plate={id} aria-label={title}>
      <div className="plate-stage">
        <div className="plate-hairline" />
        {children}
      </div>
    </section>
  );
}

/* ── the shared fragment seats ────────────────────────────────────────────── */

function FragmentDashboard() {
  return (
    <div className="plate-frag plate-col">
      <StatLine
        items={[
          { label: 'متوسّط الدرجات', value: '78%', tone: 'positive' as const },
          { label: 'مقرّرات هذا الفصل', value: '2' },
          { label: 'واجبات بانتظارك', value: '3', hint: 'أقربها غدًا 10:00' },
          { label: 'محاضرة قادمة', value: 'الجشع', hint: 'هندسة الخوارزميات' },
        ]}
      />
      <div className="plate-row plate-cards">
        <MetricCard label="مفاهيم مُتقَنّة" value="41" change="+6 هذا الأسبوع" color="green" />
        <MetricCard label="فجوات التعلّم" value="3" change="راجعها قبل الاختبار" color="amber" />
      </div>
      <ProgressBar value={0.72} label="تقدّم الفصل" />
    </div>
  );
}

function FragmentLibrary() {
  return (
    <div className="plate-frag plate-col">
      <div className="plate-row plate-inputrow">
        <span className="plate-searchglyph" aria-hidden="true">⌕</span>
        <span className="plate-searchtext">خوارزميات الترتيب…</span>
        <Pill on>بحث</Pill>
      </div>
      <div className="plate-table" role="table" aria-label="نتائج البحث">
        <div className="plate-tr plate-th" role="row">
          <span role="columnheader">العنوان</span>
          <span role="columnheader">المؤلّف</span>
          <span role="columnheader">السنة</span>
        </div>
        {[
          ['مقدمة في الخوارزميات', 'د. سالم البوسيفي', '2024'],
          ['هياكل البيانات بالأمثلة', 'أ. مريم العجيلي', '2023'],
          ['تحليل الخوارزميات المتقدّم', 'د. أحمد كافو', '2022'],
        ].map(([t, a, y]) => (
          <div className="plate-tr" role="row" key={t}>
            <span role="cell">{t}</span>
            <span role="cell" className="plate-muted">{a}</span>
            <span role="cell" className="plate-mono">{y}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FragmentLecturePlayer() {
  return (
    <div className="plate-frag plate-col">
      <div className="plate-player">
        <div className="plate-playerbar">
          <span className="plate-mono">03:20</span>
          <span className="plate-track"><span className="plate-knob" style={{ inlineSize: '33%' }} /></span>
          <span className="plate-mono">09:58</span>
        </div>
      </div>
      <div className="plate-row plate-cards">
        <MetricCard label="نقطة الفحص" value="03:20" change="أجبتها بنجاح" color="green" />
        <MetricCard label="سرعة العرض" value="1.0×" change="عادية" />
      </div>
      <AlertRow color="green" title="إجابة صحيحة" description="«التعلّم الجشع يختار الأمثل محليًّا في كل خطوة»" />
    </div>
  );
}

function FragmentMatrix() {
  const concepts = [
    ['البرمجة الديناميكية', 20],
    ['الخوارزميات الجشعة', 55],
    ['الفهارس', 40],
    ['الفرز السريع', 85],
  ] as const;
  return (
    <div className="plate-frag plate-col">
      <div className="plate-matrix" role="list" aria-label="درجات الإتقان">
        {concepts.map(([name, pct]) => (
          <div className="plate-mxrow" role="listitem" key={name}>
            <span className="plate-mxlabel">{name}</span>
            <ProgressBar value={pct / 100} label={name} />
            <span className="plate-mono plate-mxval">{pct}%</span>
          </div>
        ))}
      </div>
      <StatLine items={[{ label: 'أقرب درس', value: 'الخوارزميات الجشعة', hint: 'يُرشَّح من مصفوفتك' }]} />
    </div>
  );
}

function FragmentTeacher() {
  return (
    <div className="plate-frag plate-col">
      <div className="plate-table" role="table" aria-label="درجات الطلاب">
        <div className="plate-tr plate-th" role="row">
          <span role="columnheader">الطالب</span>
          <span role="columnheader">الواجب</span>
          <span role="columnheader">المعمل</span>
          <span role="columnheader">المتوسّط</span>
        </div>
        {[
          ['أحمد المهدي', '90', '66', '78%'],
          ['سعاد الربيعي', '84', '74', '79%'],
          ['خالد بن عمران', '72', '88', '80%'],
        ].map(([n, h, l, m]) => (
          <div className="plate-tr" role="row" key={n}>
            <span role="cell">{n}</span>
            <span role="cell" className="plate-mono">{h}</span>
            <span role="cell" className="plate-mono">{l}</span>
            <span role="cell" className="plate-mono plate-strong">{m}</span>
          </div>
        ))}
      </div>
      <StatLine
        items={[
          { label: 'متوسّط الشعبة', value: '79%', tone: 'positive' as const },
          { label: 'واجبات بانتظار التصحيح', value: '12' },
          { label: 'أسئلة تحت مراجعة', value: '4', tone: 'warning' as const },
        ]}
      />
    </div>
  );
}

function FragmentAdmin() {
  return (
    <div className="plate-frag plate-col">
      <div className="plate-chiprow">
        <Pill on>الأدوار</Pill>
        <Pill>الصلاحيات</Pill>
        <Pill>السجلّ</Pill>
      </div>
      <div className="plate-table" role="table" aria-label="صلاحيات الأدوار">
        <div className="plate-tr plate-th" role="row">
          <span role="columnheader">الدور</span>
          <span role="columnheader">العضو</span>
          <span role="columnheader">الحالة</span>
        </div>
        {[
          ['مالك المؤسسة', 'أ. محمد الزوي', 'مفعَّل'],
          ['مدير النظام', 'أ. عائشة بركة', 'مفعَّل'],
          ['مراقب الجودة', 'د. سالم البوسيفي', 'بانتظار الموافقة'],
        ].map(([r, m, s]) => (
          <div className="plate-tr" role="row" key={r}>
            <span role="cell">{r}</span>
            <span role="cell" className="plate-muted">{m}</span>
            <span role="cell">
              <Badge color={s === 'مفعَّل' ? 'green' : 'amber'}>{s}</Badge>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FragmentOwner() {
  return (
    <div className="plate-frag plate-col">
      <div className="plate-row plate-cards">
        <MetricCard label="مؤسسات نشِطة" value="7" change="من 9 مسجَّلة" color="green" />
        <MetricCard label="أساتذة بلا مقرّرات" value="3" change="تحتاج إسنادًا" color="amber" />
      </div>
      <StatLine
        items={[
          { label: 'طلاب هذا الفصل', value: '1,240' },
          { label: 'مقرّرات مفتوحة', value: '58' },
          { label: 'حالة النظام', value: 'طبيعيّ', tone: 'positive' as const },
          { label: 'تنبيهات', value: '2', tone: 'warning' as const },
        ]}
      />
      <AlertRow color="amber" title="يحتاج انتباهك" description="3 أساتذة لم تُسند إليهم مقرّرات هذا الفصل" />
    </div>
  );
}

function FragmentQuality() {
  return (
    <div className="plate-frag plate-col">
      <div className="plate-table" role="table" aria-label="الاختبارات المعتمدة">
        <div className="plate-tr plate-th" role="row">
          <span role="columnheader">الاختبار</span>
          <span role="columnheader">المقرّر</span>
          <span role="columnheader">الحالة</span>
        </div>
        {[
          ['اختبار قصير — الوحدة الثانية', 'هندسة البرمجيات', 'معتمد'],
          ['اختبار المعمل الأول', 'قواعد البيانات', 'تحت المراجعة'],
          ['اختبار الفصل', 'الخوارزميات', 'معتمد'],
        ].map(([e, c, s]) => (
          <div className="plate-tr" role="row" key={e}>
            <span role="cell">{e}</span>
            <span role="cell" className="plate-muted">{c}</span>
            <span role="cell">
              <Badge color={s === 'معتمد' ? 'green' : 'amber'}>{s}</Badge>
            </span>
          </div>
        ))}
      </div>
      <ProgressBar value={0.91} label="متوسّط الحضور هذا الفصل" />
      <StatLine
        items={[
          { label: 'اختبارات معتمدة', value: '42' },
          { label: 'متوسّط الحضور', value: '91%' },
          { label: 'تحت المراجعة', value: '5' },
        ]}
      />
    </div>
  );
}

function FragmentAiTutor() {
  return (
    <div className="plate-frag plate-col">
      <div className="plate-chat">
        <div className="plate-bubble plate-user">ما الفرق بين تعلّم الآلة والتعلّم العميق؟</div>
        <div className="plate-bubble plate-bot">
          يرصد محرّك المنصّة إتقانك لكل مفهوم: التعلّم العميق طبقات من الشبكات العصبية تُشتق الخصائص بنفسها، بينما تستخدم خوارزميات تعلّم الآلة خصائص انتقائيّة تعِدّها مسبقًا.
        </div>
      </div>
      <div className="plate-row plate-inputrow">
        <span className="plate-searchtext plate-muted">اسأل عن أي مفهوم في مقرّرك…</span>
        <Pill on>أرسل</Pill>
      </div>
      <span className="plate-note plate-muted">يحلّل بيانات إتقانك محليًّا</span>
    </div>
  );
}

function FragmentExamActive() {
  return (
    <div className="plate-frag plate-col">
      <div className="plate-row plate-examtop">
        <span className="plate-mono plate-strong">29:55</span>
        <span className="plate-muted">اختبار قصير — هندسة البرمجيات</span>
      </div>
      <div className="plate-dots" aria-label="خمسة أسئلة">
        <span className="plate-dot is-on" /><span className="plate-dot" /><span className="plate-dot" /><span className="plate-dot" /><span className="plate-dot" />
      </div>
      <div className="plate-q">
        <span className="plate-mono">س1 / 5</span>
        <span className="plate-qtext">أي الخاصيّات التالية تمثّل التعقيد الزمنيّ لخوارزمية البحث الثنائي؟</span>
      </div>
      <div className="plate-col plate-opts">
        <span className="plate-opt plate-muted">O(n)</span>
        <span className="plate-opt plate-strong">O(log n)</span>
        <span className="plate-opt plate-muted">O(n log n)</span>
      </div>
    </div>
  );
}

function FragmentCheckpoint() {
  return (
    <div className="plate-frag plate-col">
      <div className="plate-cp">
        <span className="plate-cpkicker">نقطة فحص · 03:20</span>
        <span className="plate-cpq">ما الذي يختاره التعلّم الجشع في كل خطوة؟</span>
        <div className="plate-col plate-opts">
          <span className="plate-opt plate-strong">الأمثل محليًّا</span>
          <span className="plate-opt plate-muted">الأمثل عالميًّا</span>
        </div>
      </div>
      <AlertRow color="green" title="إجابة صحيحة — تابع المشاهدة" description="أُعيد التشغيل من ثانية نقطة الفحص" />
    </div>
  );
}

export default PlatesPage;
