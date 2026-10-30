/**
 * DesignPage — `/__design` — the component-system specimen sheet.
 * R323 A5 §1 origin; §R325 (P2.2) brings it onto the app grammar.
 * Self-contained, like `/__brand`: App.tsx wires one route + one import.
 *
 * Every section renders the REAL primitives (components/primitives,
 * components/patterns, components/overlays, lib/toast, lib/bottomStack)
 * in their real states — never re-styled copies — so the reviewers'
 * evidence and the state-contrast sweep (scripts/r323/contrast-gate.mjs,
 * hover/active/focus-visible × 1440/390 × Paper/Ink) judge exactly what
 * ships. Static `selected`/`disabled` states render honestly inline;
 * `hover`/`active`/`focus-visible` are FORCED pseudo states — the gate
 * sweeps them mechanically, CSS demos of them would be forgeries.
 *
 *   [01] الأزرار       Button × 8 variants × 3 sizes × loading/disabled/pressed
 *   [02] الحقول        Input · FormField (hint/error) · select/checkbox/radio
 *   [03] الشارات       Badge × 6 tones · Pill on/off · StatusChip (r319s)
 *                      + the §R325.f chip-dot axis (hollow/ink/signal)
 *   [04] البطاقات      Card · MetricCard (static/navigable/pressed)
 *                      + the §R325.c hatch-hover target register
 *   [05] الجداول       the §R325.d register on the real .table classes —
 *                      sticky mono header, hairline rows, hatch hover,
 *                      LTR mono numerals, <bdi> clip, hatch empty row
 *   [06] التقدّم       ProgressBar (incl. the 0 mark) · ProgressRing · StatStrip
 *   [07] التبويبات     Tabs (roving tabstop, selected state)
 *   [08] الحالات       Loading · Empty (default/hatch) · Error · 403
 *                      Forbidden · the Skeleton family · .pat-skeleton
 *   [09] الهويات       UserAvatar square system (sizes + gated inks)
 *   [10] الرؤوس        patterns/PageHeader (§R325.b full anatomy) ·
 *                      patterns/SectionHeader
 *   [11] التنبيهات     AlertRow × 6 tones + unread
 *   [12] الطبقات       Modal (labelled/described) · Sheet end/bottom ·
 *                      Dropdown · Popover · Tooltip
 *   [13] التوست        the lib/toast store × 4 variants (real ToastStack)
 *   [14] الرسوم        the §R325.i chart register: Sparkline series,
 *                      hairline axes, mono ticks, square markers
 *   [15] الأنماط       .pat-hatch · .pat-dots · .pat-cross · .pat-skeleton
 *                      (+ the rules/grid recipe seats) at the element's own ink
 *   [16] هويات الأدوار the §R325.m seats — pattern + mono code, 7 roles,
 *                      no new colours (the owner alone carries the signal)
 *   [17] طبقة الأسفل   the §R325 bottom-stack pile (lib/bottomStack) —
 *                      consent banner → toast stack → FAB, live offsets
 *
 * Light/dark is structural (system tokens only); the page ships its own
 * theme seat so the reviewers flip both themes without the app shell.
 */
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import {
  BookOpen, Check, GraduationCap, Inbox, Users,
} from 'lucide-react';
import { Icon } from '../components/Icon';
import { usePageTitle } from '../hooks/usePageTitle';
import { useThemeStore } from '../stores/theme.store';
import {
  AlertRow, Badge, Button, Card, FormField, Input, LedgerPanel, LedgerRow,
  MetricCard, Pill, ProgressBar, ProgressRing, Sparkline,
  StatStrip, Tabs, UserAvatar,
} from '../components/primitives';
import {
  EmptyState, ErrorState, LoadingState, PermissionDeniedState, Skeleton,
  CardSkeleton, ChartSkeleton, KpiSkeleton, ListSkeleton, StripSkeleton,
  TableSkeleton,
} from '../components/primitives/States';
import {
  PageHeader as PatternsPageHeader, SectionHeader,
} from '../components/patterns';
import { Dropdown, DropdownItem, DropdownSeparator, Modal, Popover, Sheet, Tooltip } from '../components/overlays';
import { toast } from '../lib/toast';
import { dueChip, StatusChip } from '../components/student/StatusChip';
import { useBottomStackLayer } from '../hooks/useBottomStackLayer';
import { getBottomStackTotal } from '../lib/bottomStack';
import '../styles/r323-design.css';
/* §R325.n — the gallery is the specimen page FOR the app-grammar
   sheet: it mounts the same unlayered sheet AppShell mounts so the
   --app-* seats and .pat-* patterns it exhibits resolve for real.
   The shell cascade contract (after r319-shell.css) is untouched —
   this import serves the evidence surface only. */
import '../styles/r325-app.css';

const BTN_VARIANTS: Array<{ v: Parameters<typeof Button>[0]['variant']; label: string }> = [
  { v: 'default', label: 'افتراضي' },
  { v: 'primary', label: 'أساسي' },
  { v: 'accent', label: 'برتقالي' },
  { v: 'gold', label: 'ذهبي' },
  { v: 'ghost', label: 'شفاف' },
  { v: 'outline', label: 'محدّد' },
  { v: 'danger', label: 'خطر' },
  { v: 'success', label: 'نجاح' },
];

const ROLE_SEATS: Array<{ key: string; code: string; label: string }> = [
  { key: 'student', code: 'STU', label: 'طالب' },
  { key: 'faculty', code: 'FAC', label: 'أستاذ' },
  { key: 'department-head', code: 'DPT', label: 'رئيس قسم' },
  { key: 'dean', code: 'DEA', label: 'عميد' },
  { key: 'admin', code: 'ADM', label: 'مسجل عام' },
  { key: 'quality', code: 'QUA', label: 'جودة' },
  { key: 'owner', code: 'OWN', label: 'المالك' },
];

/* The §R325.f chip-dot axis — hollow = dormant · ink = settled ·
   signal = awaiting action. Three <span>s, no new component: the
   register lives in --app-chip-dot + the ink seats, the gallery only
   composes them (the .pat-* composition contract). */
function ChipAxis(): React.JSX.Element {
  return (
    <div className="r323d-row">
      <span className="r323d-chip"><span className="r323d-chip-dot r323d-chip-dot--hollow" aria-hidden="true" />مسودة</span>
      <span className="r323d-chip"><span className="r323d-chip-dot r323d-chip-dot--ink" aria-hidden="true" />منشور</span>
      <span className="r323d-chip"><span className="r323d-chip-dot r323d-chip-dot--signal" aria-hidden="true" />بانتظار مراجعة</span>
    </div>
  );
}

/* §R325.i chart register — hairline axes (--app-line-soft), mono
   `dir="ltr"` ticks, the square series-1 marker on the signal. Token
   seat exhibit, composed per the .pat-* composition contract. */
function AxisDemo(): React.JSX.Element {
  return (
    <div className="r323d-axis" aria-hidden="true">
      <span className="r323d-tick" dir="ltr">0</span>
      <span className="r323d-tick" dir="ltr">50</span>
      <span className="r323d-tick" dir="ltr">100</span>
      <span className="r323d-marker" />
    </div>
  );
}

/* §R325 bottom-stack demo layers — the REAL manager ranks them
   (consent → toast → fab); the real toast stack joins the pile from
   section [13] and lifts both demo layers' readouts. */
function BottomStackDemo(): React.JSX.Element {
  const bannerRef = useBottomStackLayer('consent');
  const fabRef = useBottomStackLayer('fab');
  const [banner, setBanner] = useState(true);
  const [fab, setFab] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setTotal(getBottomStackTotal()), 400);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="r323d-stack">
      <div className="r323d-row">
        <Button size="sm" variant={banner ? 'outline' : 'primary'} aria-pressed={banner} onClick={() => setBanner((b) => !b)}>
          لافتة الأسفل
        </Button>
        <Button size="sm" variant={fab ? 'outline' : 'primary'} aria-pressed={fab} onClick={() => setFab((f) => !f)}>
          الزر العائم
        </Button>
        <Button size="sm" variant="ghost" onClick={() => toast.info('طبقة التوست انضمت إلى الكومة فوق اللافتة.')}>
          أطلق توستًا فوق الكومة
        </Button>
        <span className="r323d-readout" dir="ltr">total {total}px</span>
      </div>
      {banner && (
        <div ref={bannerRef} className="r323d-stackdemo-banner">
          <span>لافتة الموافقة — المقعد الأساسي للكومة (offset 0).</span>
          <Button size="sm" variant="ghost" onClick={() => setBanner(false)}>إغلاق</Button>
        </div>
      )}
      {fab && (
        <button
          ref={fabRef}
          type="button"
          className="r323d-stackdemo-fab"
          onClick={() => toast.success('الزر العائم يجلس فوق التوست — رتبة الكومة.')}
        >
          <Icon icon={Inbox} size={16} />
          أبلغ
        </button>
      )}
    </div>
  );
}

function Section({ index, title, note, children }: {
  index: string; title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <section className="r323d-section" aria-labelledby={`r323d-${index}`}>
      <div className="r323d-idx-row">
        <span className="r323d-idx" dir="ltr" aria-hidden="true">[{index}]</span>
        <h2 id={`r323d-${index}`} className="r323d-title">{title}</h2>
        {note && <span className="r323d-note">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="r323d-cell">
      <div className="r323d-cell-body">{children}</div>
      <div className="r323d-cell-label" dir="ltr">{label}</div>
    </div>
  );
}

export default function DesignPage(): React.JSX.Element {
  usePageTitle('نظام المكونات');
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [pill, setPill] = useState(true);
  const [pressed, setPressed] = useState(false);
  const [modal, setModal] = useState(false);
  const [sheetEnd, setSheetEnd] = useState(false);
  const [sheetBottom, setSheetBottom] = useState(false);
  const [drop, setDrop] = useState(false);
  const [pop, setPop] = useState(false);
  const dropAnchor = useRef<HTMLButtonElement | null>(null);
  const popAnchor = useRef<HTMLButtonElement | null>(null);
  const modalTitle = 'تأكيد الحذف';
  const modalBody = 'سيُحذف الملزقة من الأسبوع الرابع. لا يمكن التراجع.';

  return (
    <div className="r323d" dir="rtl">
      <header className="r323d-head">
        <div className="r323d-head-row">
          <h1 className="r323d-wordmark">نظام مكونات مدارك</h1>
          <nav className="r323d-theme" aria-label="الثيم">
            {(['light', 'dark'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="btn sm"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {m === 'light' ? 'فاتح' : 'داكن'}
              </button>
            ))}
          </nav>
        </div>
        <p className="r323d-sub">
          عيّنة النظام الحيّة على قواعد ‎§R325 — كل قسم يجسّد المكوّنات
          الفعلية بحالاتها (افتراضي · تحويم · ضغط · تركيز · معطّل · محدّد)
          في الورقي والفحمي. بوابة تباين الحالات تفحص هذه الصفحة آليًا عند
          ‎1440/390 في الثيمين.
        </p>
      </header>

      <main className="r323d-main">
        <Section index="01" title="الأزرار" note="Button — 8 صيغ · تحويم/ضغط/تركيز تُفرَض على البوابة">
          <div className="r323d-grid">
            {BTN_VARIANTS.map(({ v, label }) => (
              <Cell key={v} label={`variant=${v}`}>
                <Button variant={v}>{label}</Button>
              </Cell>
            ))}
            <Cell label="sizes sm · md · lg">
              <div className="r323d-row">
                <Button size="sm" variant="primary">صغير</Button>
                <Button size="md" variant="primary">متوسط</Button>
                <Button size="lg" variant="primary">كبير</Button>
              </div>
            </Cell>
            <Cell label="loading + disabled">
              <div className="r323d-row">
                <Button variant="primary" loading>جارٍ الحفظ</Button>
                <Button variant="primary" disabled>معطّل</Button>
                <Button disabled>معطّل شفاف</Button>
              </div>
            </Cell>
            <Cell label="icons + aria-pressed (selected)">
              <div className="r323d-row">
                <Button variant="outline" leadingIcon={<Icon icon={Check} size={14} />}>مع أيقونة</Button>
                <Button
                  variant={pressed ? 'primary' : 'outline'}
                  aria-pressed={pressed}
                  onClick={() => setPressed((p) => !p)}
                >
                  {pressed ? 'محدّد' : 'غير محدّد'}
                </Button>
              </div>
            </Cell>
          </div>
        </Section>

        <Section index="02" title="الحقول" note="Input · FormField — التسمية فوق، 16px، الخطأ إشارة لا وردي">
          <div className="r323d-grid r323d-grid-2">
            <Cell label="Input — افتراضي · placeholder">
              <Input placeholder="ابحث في المقررات…" aria-label="بحث" />
            </Cell>
            <Cell label="FormField — تلميح 13px">
              <FormField label="البريد الجامعي" hint="البريد المؤسسي ينتهي بـ .ly">
                <Input defaultValue="s.tariq@madarek.ly" />
              </FormField>
            </Cell>
            <Cell label="FormField — خطأ تحقق (الإشارة)">
              <FormField label="كلمة المرور" error="ثمانية أحرف على الأقل">
                <Input type="password" defaultValue="1234" />
              </FormField>
            </Cell>
            <Cell label="Input — disabled">
              <Input defaultValue="رقم جامعي ثابت" disabled aria-label="رقم جامعي" />
            </Cell>
            <Cell label="select · checkbox · radio">
              <div className="r323d-stack">
                <select className="select" aria-label="القسم">
                  <option>علوم الحاسوب</option>
                  <option>هندسة كهربائية</option>
                </select>
                <label className="r323d-inline"><input type="checkbox" defaultChecked /> تذكّرني</label>
                <label className="r323d-inline"><input type="radio" name="r323d-r" defaultChecked /> أستاذ</label>
                <label className="r323d-inline"><input type="radio" name="r323d-r" /> طالب</label>
              </div>
            </Cell>
          </div>
        </Section>

        <Section index="03" title="الشارات والرقائق" note="Badge · Pill · StatusChip · محور نقطة ‎§R325.f">
          <div className="r323d-grid">
            <Cell label="Badge × 6 tones + icon">
              <div className="r323d-row">
                <Badge color="brand">مادة</Badge>
                <Badge color="green" icon={Check}>مكتمل</Badge>
                <Badge color="amber">قيد التصحيح</Badge>
                <Badge color="red">متأخر</Badge>
                <Badge color="purple">بحثي</Badge>
                <Badge color="gold">متميّز</Badge>
              </div>
            </Cell>
            <Cell label="Pill — on/off · interactive">
              <div className="r323d-row">
                <Pill on={pill} onClick={() => setPill((p) => !p)}>الكل</Pill>
                <Pill>محاضرات</Pill>
                <Pill trailing={<span className="r323d-count">12</span>} onClick={() => {}}>ملزقات</Pill>
              </div>
            </Cell>
            <Cell label="StatusChip — سجل r319s الأحادي">
              <div className="r323d-row">
                <StatusChip label="LIVE" tone="live" />
                <StatusChip label={dueChip(3).label} tone={dueChip(3).tone} />
                <StatusChip label="DONE" tone="done" />
                <StatusChip label="NEW" tone="new" />
                <StatusChip label="ARCHIVED" />
              </div>
            </Cell>
            <Cell label="§R325.f — محور النقطة (تجمّد/مستقر/انتظار)">
              <ChipAxis />
            </Cell>
          </div>
        </Section>

        <Section index="04" title="البطاقات" note="Card · MetricCard — التحويم يُفصَل §R325.c">
          <div className="r323d-grid r323d-grid-2">
            <Cell label="Card — تلميح + إجراء">
              <Card
                title="مقرر قواعد البيانات"
                subtitle="CS301 · الفصل الخامس"
                icon={BookOpen}
                actions={<Button size="sm" variant="ghost">فتح</Button>}
              >
                <p className="r323d-p">أسبوع 7: التطبيع والتوابع — أُضيفت محاضرة جديدة وملزقة.</p>
              </Card>
            </Cell>
            <Cell label="Card — compact">
              <Card compact title="تنبيه قصير" subtitle="بطاقة مضغوطة">
                <p className="r323d-p">نصّ الجسم — نفس الشعرية، حشو أقل.</p>
              </Card>
            </Cell>
            <Cell label="MetricCard × 3">
              <div className="r323d-row">
                <MetricCard icon={GraduationCap} label="مقرراتي" value="6" />
                <MetricCard icon={Users} label="نقاشات" value="14" />
                <MetricCard icon={BookOpen} label="ملاحظات" value="38" />
              </div>
            </Cell>
            <Cell label="MetricCard — navigable · pressed">
              <div className="r323d-row">
                <MetricCard
                  icon={Users}
                  label="مجموعة مشروع"
                  value="5"
                  onClick={() => {}}
                  pressed={pressed}
                  actionHint="افتح المجموعة"
                />
                <MetricCard icon={BookOpen} label="ملتقى قادم" value="الأحد" change="بعد يومين" />
              </div>
            </Cell>
            <Cell label="§R325.c — هدف التحويم: تظليل تسبيك فقط">
              <div className="r323d-hover-target pat-hatch" aria-hidden="true">
                <span>مرّر فوقي — 120ms عند ‎--app-t-hover</span>
              </div>
            </Cell>
          </div>
        </Section>

        <Section index="05" title="الجداول" note="الرأس أحادي لاصق · صفوف شعرية · الأرقام لاتينية ‎§R325.d">
          <div className="table-wrap sticky r323d-tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col" dir="ltr">ID</th>
                  <th scope="col">الطالب</th>
                  <th scope="col" dir="ltr">GRADE</th>
                  <th scope="col" dir="ltr">STATUS</th>
                  <th scope="col"><span className="visually-hidden">إجراءات</span></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="r323d-num" dir="ltr">101</td>
                  <td className="tbl-strong">سلمى الطارق</td>
                  <td className="r323d-num" dir="ltr">87.50</td>
                  <td><StatusChip label="GRADED" tone="done" /></td>
                  <td>
                    <span className="table-row-actions">
                      <Button size="sm" variant="ghost">عرض</Button>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="r323d-num" dir="ltr">102</td>
                  <td className="tbl-strong"><bdi>عبدالرحمن بن فيصل آل سعد العتيبي الكلثامي</bdi></td>
                  <td className="r323d-num" dir="ltr">72.00</td>
                  <td><StatusChip label="DUE 3D" tone="due" /></td>
                  <td>
                    <span className="table-row-actions">
                      <Button size="sm" variant="ghost">عرض</Button>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="r323d-num" dir="ltr">103</td>
                  <td className="tbl-strong">مراد الترهوني</td>
                  <td className="r323d-num" dir="ltr">—</td>
                  <td><StatusChip label="DRAFT" /></td>
                  <td>
                    <span className="table-row-actions">
                      <Button size="sm" variant="ghost">عرض</Button>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="r323d-tablewrap r323d-mt">
            <div className="r323d-empty-row pat-hatch">
              <span>لا توجد صفوف بعد — الحقل المُسبَّك + سطر صادق.</span>
              <Button size="sm" variant="primary">أضف السجل الأول</Button>
            </div>
          </div>
        </Section>

        <Section index="06" title="التقدّم" note="ProgressBar · ProgressRing · StatStrip">
          <div className="r323d-grid r323d-grid-2">
            <Cell label="ProgressBar — قيم متعددة + علامة الصفر">
              <div className="r323d-stack r323d-fill">
                <ProgressBar value={72} label="تقدّم المقرر" />
                <ProgressBar value={38} label="الفصل الحالي" />
                <ProgressBar value={0} label="لم يبدأ" showValue={false} />
              </div>
            </Cell>
            <Cell label="ProgressRing — مع المركز">
              <div className="r323d-row">
                <ProgressRing value={82} size={72} ariaLabel="الالتزام 82 بالمئة" center="82%" />
                <ProgressRing value={45} size={72} ariaLabel="الواجبات 45 بالمئة" center="45%" />
              </div>
            </Cell>
            <Cell label="StatStrip">
              <StatStrip
                ariaLabel="إحصاءات الطالب"
                cells={[
                  { label: 'حضور', value: '92%' },
                  { label: 'واجبات متأخرة', value: '1' },
                  { label: 'نقاط', value: '340' },
                ]}
              />
            </Cell>
          </div>
          <div className="r323d-mt">
            <LedgerPanel title="سجلّ الأسبوع" tag="06" ariaLabel="سجلّ الأسبوع">
              <LedgerRow
                lead="09:00"
                title="محاضرة قواعد البيانات — التطبيع"
                subtitle="القاعة بـ2 · د. الطرابلسي"
                tail={<StatusChip label="LIVE" tone="live" />}
              />
              <LedgerRow
                lead="11:30"
                title="سلم مختبر الشبكات"
                subtitle="التسليم عبر صفحة المختبر"
                tail={<StatusChip label={dueChip(3).label} tone={dueChip(3).tone} />}
              />
              <LedgerRow
                leadLabel="أسبوع 7"
                lead="W07"
                title="ورشة المشاريع — مناقشة أولى"
                tail={<StatusChip label="GRADED" tone="done" />}
              />
            </LedgerPanel>
          </div>
        </Section>

        <Section index="07" title="التبويبات" note="Tabs — roving tabstop · الحالة المحدّدة">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'a', label: 'المحاضرات' },
              { value: 'b', label: 'الواجبات' },
              { value: 'c', label: 'الملزقات' },
            ]}
          />
          <p className="r323d-p r323d-mt">
            {tab === 'a' ? 'لوحة المحاضرات — ستة عناصر.' : tab === 'b' ? 'لوحة الواجبات — عنصران قيد التصحيح.' : 'لوحة الملزقات — أربعة ملفات.'}
          </p>
        </Section>

        <Section index="08" title="الحالات" note="Loading · Empty · Error · 403 · عائلة الهياكل">
          <div className="r323d-grid r323d-grid-2">
            <Cell label="LoadingState — inline">
              <LoadingState label="جارٍ تحميل الجدول…" />
            </Cell>
            <Cell label="LoadingState — minimal">
              <div className="r323d-row"><LoadingState label="جارٍ التحديث…" variant="minimal" /><span className="r323d-p">داخل خلية جدول</span></div>
            </Cell>
            <Cell label="EmptyState — default + action">
              <EmptyState
                icon={Inbox}
                title="لا توجد ملاحظات بعد"
                description="ابدأ بملاحظة من المحاضرة الأولى."
                action={<Button size="sm" variant="primary">أضف ملاحظة</Button>}
              />
            </Cell>
            <Cell label="EmptyState — hatch (§R325.g)">
              <EmptyState variant="hatch" title="الخلية فارغة" description="الحقل المُسبَّك هو سجل الفراغ." />
            </Cell>
            <Cell label="ErrorState — إشارة + إعادة 44px">
              <ErrorState message="تعذّر تحميل الملاحظات — حاول مجددًا." onRetry={() => {}} />
            </Cell>
            <Cell label="PermissionDeniedState — الممنوع 403">
              <PermissionDeniedState detail="هذا القسم لأدوار محددة — اطلب الصلاحية من المسجل." onBack={() => {}} />
            </Cell>
            <Cell label="Skeleton family">
              <div className="r323d-stack r323d-fill">
                <div className="r323d-row">
                  <Skeleton width="70%" height={12} />
                  <Skeleton width="45%" height={12} />
                </div>
                <KpiSkeleton />
                <TableSkeleton rows={2} cols={4} />
                <CardSkeleton lines={2} />
                <ListSkeleton rows={2} />
                <ChartSkeleton height={120} />
              </div>
            </Cell>
            <Cell label="StripSkeleton + .pat-skeleton خام">
              <div className="r323d-stack">
                <StripSkeleton title="سجل الحضور" subtitle="بنية البطاقة نفسها تُشغل حتىresolve البيانات" rows={1} />
                <div className="r323d-pat pat-skeleton" aria-hidden="true" />
                <div className="r323d-pat pat-hatch" aria-hidden="true" />
              </div>
            </Cell>
          </div>
        </Section>

        <Section index="09" title="الهويات" note="UserAvatar — المربع النظامي + بوابات الحبر">
          <div className="r323d-row">
            <UserAvatar initials="ط م" size={44} />
            <UserAvatar initials="أ.س" size={36} />
            <UserAvatar initials="ر ع" size={28} />
            <UserAvatar initials="ن ق" size={36} color="#4F8EF7" />
            <UserAvatar initials="ه م" size={36} color="#3DD68C" />
          </div>
        </Section>

        <Section index="10" title="رؤوس الصفحات" note="patterns/PageHeader — تشققات · شارة · فهرس · إجراءات">
          <PatternsPageHeader
            index="02"
            eyebrow="مسجل الطالب"
            title="مقررات الفصل"
            description="قائمة مسجلك لهذا الفصل — تُحدَّث عند كل تعديل خطة."
            meta="الفصل الخامس · 6 مقررات · 17 ائتمانًا"
            breadcrumbs={[
              { label: 'لوحة الطالب', to: '/__design' },
              { label: 'الدراسة', to: '/__design' },
              { label: 'المقررات' },
            ]}
            actions={
              <div className="r323d-row">
                <Button size="sm" variant="outline">تصدير</Button>
                <Button size="sm" variant="primary">خطة بديلة</Button>
              </div>
            }
          />
          <div className="r323d-mt">
            <SectionHeader
              title="قسم داخل الصفحة"
              description="SectionHeader — ترويسة القسم بعقد الأنماط."
              actions={<Button size="sm" variant="ghost">الكل</Button>}
            />
          </div>
          <p className="r323d-p r323d-mt">
            PageHeader البسيط (primitives) يبقى لصفحات العائلات القديمة —
            القاعدة ‎§R325.b هي صيغة الأنماط أعلاه.
          </p>
        </Section>

        <Section index="11" title="التنبيهات" note="AlertRow × 6 نبرات + غير المقروء">
          <div className="r323d-stack r323d-fill">
            <AlertRow color="brand" title="تنبيه جدولة" description="يُفتح الاختبار النصفي يوم الأحد." />
            <AlertRow color="amber" title="موعد تسليم" description="آخر موعد للواجب الثالث بعد يومين." />
            <AlertRow color="red" title="فشل الرفع" description="حجم الملف يتجاوز 10 ميغابايت." />
            <AlertRow color="green" title="نشر الدرجة" description="درجة الاختبار الأول متاحة الآن." unread />
            <AlertRow color="purple" title="بحث التخرج" description="لجنة المناقشة حدّدت موعدًا مبدئيًا." />
            <AlertRow color="gold" title="شرف القسم" description="اسمك على لوحة الشرف هذا الفصل." />
          </div>
        </Section>

        <Section index="12" title="الطبقات" note="Modal · Sheet end/bottom · Dropdown · Popover · Tooltip">
          <div className="r323d-row">
            <Button variant="primary" onClick={() => setModal(true)}>افتح Modal</Button>
            <Button variant="outline" onClick={() => setSheetEnd(true)}>Sheet نهاية</Button>
            <Button variant="outline" onClick={() => setSheetBottom(true)}>Sheet أسفل</Button>
            <Button variant="ghost" ref={dropAnchor} aria-expanded={drop} aria-haspopup="menu" onClick={() => setDrop((d) => !d)}>
              قائمة منسدلة
            </Button>
            <Button variant="ghost" ref={popAnchor} aria-expanded={pop} onClick={() => setPop((p) => !p)}>
              Popover
            </Button>
            <Tooltip content="تلميح النظام — 44px هدفًا أدنى">
              <Button variant="ghost">مرّر فوقي</Button>
            </Tooltip>
          </div>
          <Modal
            open={modal}
            onClose={() => setModal(false)}
            ariaLabel={modalTitle}
            labelledById="r323d-modal-title"
            describedById="r323d-modal-body"
          >
            <h3 id="r323d-modal-title" className="r323d-modal-title">{modalTitle}</h3>
            <p id="r323d-modal-body" className="r323d-p">{modalBody}</p>
            <div className="r323d-row r323d-mt">
              <Button variant="danger" onClick={() => setModal(false)}>حذف</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>إلغاء</Button>
            </div>
          </Modal>
          <Sheet
            open={sheetEnd}
            onClose={() => setSheetEnd(false)}
            side="end"
            title="فلترة النتائج"
            ariaLabel="لوحة فلترة النتائج"
            footer={
              <div className="r323d-row">
                <Button variant="primary" onClick={() => setSheetEnd(false)}>تطبيق</Button>
                <Button variant="ghost" onClick={() => setSheetEnd(false)}>إلغاء</Button>
              </div>
            }
          >
            <div className="r323d-stack">
              <Pill on>هذا الفصل</Pill>
              <Pill>الأسبوع الحالي</Pill>
              <Pill>المحاضرات فقط</Pill>
            </div>
          </Sheet>
          <Sheet
            open={sheetBottom}
            onClose={() => setSheetBottom(false)}
            side="bottom"
            title="لوحة الجوال"
            ariaLabel="لوحة سفلية — سجل الحوار ≤920"
          >
            <p className="r323d-p">عند ≤920 يصبح الحوار ورقة سفلية بعرض كامل — نفس العقد بلا ظلّ.</p>
          </Sheet>
          <Dropdown
            open={drop}
            onClose={() => setDrop(false)}
            anchorRef={dropAnchor}
            ariaLabel="قائمة إجراءات السجل"
          >
            <DropdownItem onSelect={() => setDrop(false)}>تعديل الصف</DropdownItem>
            <DropdownItem onSelect={() => setDrop(false)}>نقل إلى أرشيف</DropdownItem>
            <DropdownSeparator />
            <DropdownItem disabled onSelect={() => setDrop(false)}>حذف — معطّل</DropdownItem>
          </Dropdown>
          <Popover
            open={pop}
            onClose={() => setPop(false)}
            anchorRef={popAnchor}
            ariaLabel="شرح مصغر"
          >
            <div className="r323d-p" style={{ padding: 'var(--sp-3)' }}>
              Popover — لوح مثبّت على المرتكز، يُغلق بـ Esc والنقر خارجه.
            </div>
          </Popover>
        </Section>

        <Section index="13" title="التوست" note="lib/toast → ToastStack الحقيقي — الخطأ يدوي فقط">
          <div className="r323d-row">
            <Button variant="outline" onClick={() => toast.success('حُفظت التعديلات بنجاح.')}>نجاح</Button>
            <Button variant="outline" onClick={() => toast.info('تذكير: الاختبار النصفي الأحد القادم.')}>معلومة</Button>
            <Button variant="outline" onClick={() => toast.warning('مساحة التخزين تقترب من الحد.')}>تنبيه</Button>
            <Button variant="danger" onClick={() => toast.error('تعذّر الرفع — الخادم لم يستجب.')}>خطأ (يدوي)</Button>
          </div>
          <p className="r323d-p r323d-mt">
            الأربعة تنطلق عبر المخزن البرمجي نفسه الذي تستخدمه الصفحات —
            لا عيّنة ثابتة.
          </p>
        </Section>

        <Section index="14" title="الرسوم" note="§R325.i — محاور شعرية · نقوش أحادية · علامات مربعة">
          <div className="r323d-grid r323d-grid-2">
            <Cell label="Sparkline — السلسلة الأولى إشارة">
              <div className="r323d-row">
                <Sparkline points={[4, 9, 6, 12, 8, 14]} ariaLabel="الحضور خلال ستة أسابيع" />
                <Sparkline points={[12, 10, 11, 7, 8, 5]} tone="mint" ariaLabel="الدرجات خلال ستة أسابيع" />
              </div>
            </Cell>
            <Cell label="المحور الشعري + النقش الأحادي + العلامة المربعة">
              <AxisDemo />
            </Cell>
            <Cell label="ChartSkeleton — هيكل الرسم">
              <ChartSkeleton height={140} />
            </Cell>
          </div>
        </Section>

        <Section index="15" title="الأنماط" note=".pat-* — حبر العنصر نفسه، بلا ألوان جديدة">
          <div className="r323d-grid">
            <Cell label=".pat-hatch — فراغ/تحويم">
              <div className="r323d-pat pat-hatch" aria-hidden="true" />
            </Cell>
            <Cell label=".pat-dots — عناصر الوسائط">
              <div className="r323d-pat pat-dots" aria-hidden="true" />
            </Cell>
            <Cell label=".pat-cross — مقفول/ممنوع">
              <div className="r323d-pat pat-cross" aria-hidden="true" />
            </Cell>
            <Cell label=".pat-skeleton — تسبيك + لمعة">
              <div className="r323d-pat pat-skeleton" aria-hidden="true" />
            </Cell>
            <Cell label="الحبر المكتوم — currentColor يرث">
              <div className="r323d-pat pat-hatch r323d-pat-muted" aria-hidden="true" />
            </Cell>
            <Cell label=".pat-cross على خلية جدول">
              <div className="r323d-pat pat-cross r323d-pat-cell">
                <span>خلية مقفولة</span>
              </div>
            </Cell>
          </div>
        </Section>

        <Section index="16" title="هويات الأدوار" note="§R325.m — نمط + رمز أحادي، المالك وحده الإشارة">
          <div className="r323d-grid">
            {ROLE_SEATS.map((r) => (
              <Cell key={r.key} label={`--app-role-pat-${r.key}`}>
                <div className="r323d-role">
                  <span className={`r323d-role-swatch r323d-role-swatch--${r.key}`} aria-hidden="true" />
                  <span className="r323d-role-code" dir="ltr">{r.code}</span>
                  <span className="r323d-p">{r.label}</span>
                </div>
              </Cell>
            ))}
          </div>
        </Section>

        <Section index="17" title="طبقة الأسفل" note="§R325 — كومة الأسفل: لافتة ← توست ← زر عائم">
          <BottomStackDemo />
        </Section>
      </main>

      <footer className="r323d-foot">
        <span dir="ltr">/__design · §R325 (P2.2) · gates: scripts/r323/contrast-gate.mjs · check:colors · check:raw-css</span>
      </footer>
    </div>
  );
}
