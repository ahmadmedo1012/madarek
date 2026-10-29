/**
 * DesignPage — `/__design` — the R323 A5 component-system specimen
 * sheet (§A5-1). Self-contained, like `/__brand`: App.tsx wires one
 * route + one import.
 *
 * Every section renders the REAL primitives (components/primitives,
 * components/overlays) in their real states — never re-styled copies —
 * so the reviewers' evidence and the contrast-gate sweep (scripts/
 * r323/contrast-gate.mjs) judge exactly what ships:
 *
 *   [01] الأزرار      Button × 7 variants × 3 sizes × loading/disabled
 *   [02] الحقول       Input · FormField (hint/error) · select/checkbox
 *   [03] الشارات      Badge × 6 tones · Pill on/off
 *   [04] البطاقات     Card · MetricCard
 *   [05] التقدّم      ProgressBar · ProgressRing
 *   [06] التبويبات    Tabs (real roving-tabstop keyboard contract)
 *   [07] الحالات      Loading/Empty/Error + Skeleton family
 *   [08] الهويات      UserAvatar square system
 *   [09] الرؤوس       PageHeader · SectionTitle
 *   [10] التنبيهات    AlertRow tones
 *   [11] الطبقات      Modal · Sheet · Tooltip (triggers, honest mounts)
 *   [12] السجل        StatStrip + LedgerPanel (the r189 ledger language)
 *
 * Light/dark is structural (system tokens only); the page ships its own
 * theme seat so the reviewers flip both themes without the app shell.
 */
import { useState } from 'react';
import type React from 'react';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useThemeStore } from '../stores/theme.store';
import {
  AlertRow, Badge, Button, Card, FormField, Input, MetricCard, PageHeader,
  Pill, ProgressBar, ProgressRing, SectionTitle, StatStrip, Tabs, UserAvatar,
} from '../components/primitives';
import {
  EmptyState, ErrorState, LoadingState, Skeleton, TableSkeleton,
} from '../components/primitives/States';
import { Modal, Sheet, Tooltip } from '../components/overlays';
import '../styles/r323-design.css';

const BTN_VARIANTS: Array<{ v: Parameters<typeof Button>[0]['variant']; label: string }> = [
  { v: 'default', label: 'افتراضي' },
  { v: 'primary', label: 'أساسي' },
  { v: 'accent', label: 'برتقالي' },
  { v: 'ghost', label: 'شفاف' },
  { v: 'outline', label: 'محدّد' },
  { v: 'danger', label: 'خطر' },
  { v: 'success', label: 'نجاح' },
];

function Section({ index, title, note, children }: {
  index: string; title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <section className="r323d-section" aria-labelledby={`r323d-${index}`}>
      <div className="r323d-idx-row">
        <span className="r323d-idx">[{index}]</span>
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
      <div className="r323d-cell-label">{label}</div>
    </div>
  );
}

export default function DesignPage(): React.JSX.Element {
  usePageTitle('نظام المكونات');
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [tab, setTab] = useState<'a' | 'b'>('a');
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);

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
          عيّنة النظام الحيّة — كل قسم يُجسّد المكونات الفعلية بحالاتها
          (افتراضي · تحويم · تركيز · نشط · معطّل) في الفاتح والداكن. بوابة
          التباين تفحص هذه الصفحة آليًا.
        </p>
      </header>

      <main className="r323d-main">
        <Section index="01" title="الأزرار" note="Button — تعبئة فورية عند :active">
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
          </div>
        </Section>

        <Section index="02" title="الحقول" note="Input · FormField — عقد الربط aria">
          <div className="r323d-grid">
            <Cell label="Input — افتراضي">
              <Input placeholder="ابحث في المقررات…" aria-label="بحث" />
            </Cell>
            <Cell label="FormField — تلميح">
              <FormField label="البريد الجامعي" hint="البريد المؤسسي ينتهي بـ .ly">
                <Input defaultValue="s.tariq@madarek.ly" />
              </FormField>
            </Cell>
            <Cell label="FormField — خطأ تحقق">
              <FormField label="كلمة المرور" error="ثمانية أحرف على الأقل">
                <Input type="password" defaultValue="1234" />
              </FormField>
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

        <Section index="03" title="الشارات والحالات" note="Badge · Pill">
          <div className="r323d-grid">
            <Cell label="Badge × 6 tones">
              <div className="r323d-row">
                <Badge color="brand">مادة</Badge>
                <Badge color="green">مكتمل</Badge>
                <Badge color="amber">قيد التصحيح</Badge>
                <Badge color="red">متأخر</Badge>
                <Badge color="purple">بحثي</Badge>
                <Badge color="gold">متميّز</Badge>
              </div>
            </Cell>
            <Cell label="Pill on/off">
              <div className="r323d-row">
                <Pill on>الكل</Pill>
                <Pill>محاضرات</Pill>
                <Pill>ملزقات</Pill>
              </div>
            </Cell>
          </div>
        </Section>

        <Section index="04" title="البطاقات" note="Card · MetricCard">
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
            <Cell label="MetricCard × 3">
              <div className="r323d-row">
                <MetricCard icon={GraduationCap} label="مقرراتي" value="6" />
                <MetricCard icon={Users} label="نقاشات" value="14" />
                <MetricCard icon={BookOpen} label="ملاحظات" value="38" />
              </div>
            </Cell>
          </div>
        </Section>

        <Section index="05" title="التقدّم" note="ProgressBar · ProgressRing · StatStrip">
          <div className="r323d-grid r323d-grid-2">
            <Cell label="ProgressBar — قيم متعددة">
              <div className="r323d-stack">
                <ProgressBar value={72} label="تقدّم المقرر" />
                <ProgressBar value={38} label="الفصل الحالي" />
              </div>
            </Cell>
            <Cell label="ProgressRing × 2">
              <div className="r323d-row">
                <ProgressRing value={82} size={64} ariaLabel="الالتزام 82 بالمئة" />
                <ProgressRing value={45} size={64} ariaLabel="الواجبات 45 بالمئة" />
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
        </Section>

        <Section index="06" title="التبويبات" note="Tabs — roving tabstop">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'a', label: 'المحاضرات' },
              { value: 'b', label: 'الواجبات' },
            ]}
          />
          <p className="r323d-p r323d-mt">
            {tab === 'a' ? 'لوحة المحاضرات — ستة عناصر.' : 'لوحة الواجبات — عنصران قيد التصحيح.'}
          </p>
        </Section>

        <Section index="07" title="الحالات" note="Loading · Empty · Error · Skeleton">
          <div className="r323d-grid r323d-grid-2">
            <Cell label="LoadingState">
              <LoadingState label="جارٍ تحميل الجدول…" />
            </Cell>
            <Cell label="EmptyState">
              <EmptyState title="لا توجد ملاحظات بعد" description="ابدأ بملاحظة من المحاضرة الأولى." />
            </Cell>
            <Cell label="ErrorState">
              <ErrorState message="تعذّر تحميل الملاحظات — حاول مجددًا." onRetry={() => {}} />
            </Cell>
            <Cell label="Skeleton family">
              <div className="r323d-stack">
                <Skeleton width="100%" height={40} />
                <TableSkeleton rows={2} cols={4} />
              </div>
            </Cell>
          </div>
        </Section>

        <Section index="08" title="الهويات" note="UserAvatar — مربع النظام">
          <div className="r323d-row">
            <UserAvatar initials="ط م" size={44} />
            <UserAvatar initials="أ.س" size={36} />
            <UserAvatar initials="ر ع" size={28} />
          </div>
        </Section>

        <Section index="09" title="رؤوس الصفحات" note="PageHeader · SectionTitle">
          <PageHeader title="مقررات الفصل" subtitle="قائمة مسجلك لهذا الفصل" />
          <SectionTitle>قسم داخل صفحة</SectionTitle>
        </Section>

        <Section index="10" title="التنبيهات" note="AlertRow × tones">
          <div className="r323d-stack">
            <AlertRow color="brand" title="تنبيه جدولة" description="يُفتح الاختبار النصفي يوم الأحد." />
            <AlertRow color="amber" title="موعد تسليم" description="آخر موعد للواجب الثالث بعد يومين." />
            <AlertRow color="red" title="فشل الرفع" description="حجم الملف يتجاوز 10 ميغابايت." />
          </div>
        </Section>

        <Section index="11" title="الطبقات" note="Modal · Sheet · Tooltip">
          <div className="r323d-row">
            <Button variant="primary" onClick={() => setModal(true)}>افتح Modal</Button>
            <Button variant="outline" onClick={() => setSheet(true)}>افتح Sheet</Button>
            <Tooltip content="تلميح النظام — 44px هدفًا أدنى">
              <Button variant="ghost">مرّر فوقي</Button>
            </Tooltip>
          </div>
          <Modal open={modal} onClose={() => setModal(false)} ariaLabel="تأكيد الحذف">
            <p className="r323d-p">سيُحذف الملزقة من الأسبوع الرابع. لا يمكن التراجع.</p>
            <div className="r323d-row r323d-mt">
              <Button variant="danger" onClick={() => setModal(false)}>حذف</Button>
              <Button variant="ghost" onClick={() => setModal(false)}>إلغاء</Button>
            </div>
          </Modal>
          <Sheet open={sheet} onClose={() => setSheet(false)} title="فلترة النتائج" ariaLabel="لوحة فلترة النتائج">
            <div className="r323d-stack">
              <Pill on>هذا الفصل</Pill>
              <Pill>الأسبوع الحالي</Pill>
              <Pill>المحاضرات فقط</Pill>
            </div>
          </Sheet>
        </Section>

        <Section index="12" title="السجل" note="LedgerPanel — لغة سجّل مدارك">
          <div className="r323d-grid r323d-grid-2">
            <Cell label="LedgerPanel">
              <div className="r323d-ledger-demo">
                <div className="r323d-ledger-row"><span>[01] مقدمة في الأنظمة</span><span>مكتمل</span></div>
                <div className="r323d-ledger-row"><span>[02] تصميم قواعد البيانات</span><span>جارٍ</span></div>
                <div className="r323d-ledger-row"><span>[03] شبكات الحاسوب</span><span>لم يبدأ</span></div>
              </div>
            </Cell>
          </div>
        </Section>
      </main>

      <footer className="r323d-foot">
        <span>/__design · A5 §1 · البوابة: scripts/r323/contrast-gate.mjs</span>
      </footer>
    </div>
  );
}
