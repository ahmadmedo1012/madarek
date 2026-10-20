# patterns — عقد الواجهات المشتركة (Agent S · r210)

> **CONTRACT v1 — FROZEN.** تستهلك هذه الواجهات كل عائلات الصفحات (4A–4E).
> يُسمح بإضافة props اختيارية لاحقًا؛ **يُمنع إعادة التسمية أو الإزالة**.
> المصدر الحيّ: `frontend/src/components/patterns/` · الأنماط: `frontend/src/styles/patterns.css`
> (مستوردة من `main.tsx` — سطر استيراد واحد قد يتعارض عند دمج Agent Z، انظر الملاحظات).

## المبدأ

لغة Superlist: القائمة هي المنتج. صفحات مدارك تُركَّب من إطار + ترويسة + أشرطة
أرقام + تصفية + صفوف/انقسام، بلا جدران بطاقات. كل شيء توكنات فقط، خصائص منطقية
(RTL)، أرضية نقر 44px، حلقة التركيز العامة، أرقام تصل مُنسَّقة من `utils/numbers.ts`.

## الواجهات

```ts
PageFrame { width?: 'reading'|'default'|'wide'|'full'; children }
// 760 / 1080 / 1320 / بلا حد — يقصّر عمود .content-inner فقط؛ لا padding سطري هنا.

PageHeader { title: string; description?: ReactNode; eyebrow?: string;
             meta?: ReactNode; actions?: ReactNode;
             breadcrumbs?: { label: string; to?: string }[];
             tabs?: ReactNode }
// <h1> واحد لكل مسار. breadcrumbs: آخر عنصر aria-current="page".
// فاصل المسار ChevronLeft (RTL — الأمام يسارًا).

SectionHeader { title: ReactNode; description?: ReactNode; actions?: ReactNode;
                as?: 'h2'|'h3' }   // الافتراضي h2

RowList { children; density?: 'comfortable'|'compact'; 'aria-label'?: string;
          loading?: boolean; empty?: ReactNode }
// loading → ListSkeleton · لا أبناء → empty ?? EmptyState الافتراضي الصادق.

RowItem { leading?; title; meta?; trailing?; children?(جسم قابل للتوسيع);
          defaultExpanded?; expandLabel? }
// محلي حتى يهبط RowItem من 1B — عندها يعاد توجيه الداخل لنفس الـprops.

SplitView { list: ReactNode; detail: ReactNode | null; detailOpen: boolean;
            onDetailClose(): void; detailTitle?: string;
            listWidth?: 'narrow'|'default'; emptyDetail?: ReactNode }
// سطح المكتب (≥921px): detail عمود لاصق (sticky) بتمريره الخاص.
// الجوّال (≤920px): detail في Sheet ملء الشاشة (نفس overlay البيت)، والقائمة تملأ الشاشة.
// detailOpen + detail هما مصدر الحقيقة في النطاقين.

StatLine { items: { label: string; value: ReactNode; hint?: string;
                    tone?: 'neutral'|'positive'|'warning'|'danger'|'signal';
                    to?: string }[] }
// بلا آبار أيقونات. tone يلوّن القيمة فقط. to تجعل الإحصاء رابطًا 44px+.

FilterBar { search?: { value: string; onChange(v: string): void; placeholder?: string };
            filters?: ReactNode; sort?: ReactNode; trailing?: ReactNode;
            sticky?: boolean }
// sticky يلتصق بأعلى .content (حاوية التمرير الوحيدة) بخلفية معتمة.

TodayList { title?: string;
            items: { id; title; meta?; leading?; action?; to?;
                     urgency?: 'now'|'soon'|'later' }[];
            emptyState?: ReactNode }
// نقطة إلحاح + نص sr-only («الآن/قريبًا/لاحقًا»). ليست شبكة بطاقات.
```

## قواعد الاستهلاك

1. **الأرقام**: تصل مُنسَّقة (`formatNum/formatInt/formatPct1`) — النمط لا ينسّق ولا يعدّ (بلا CountUp).
2. **النسخ**: صادق ومحدد؛ الحالات الفارغة بجملة «ماذا الآن» (EmptyState الافتراضي يفعل).
3. **التوسيع**: جسم RowItem يُعرض فقط عند الفتح — لا تفريغ مخفي.
4. **الألوان**: توكنات فقط؛ tone استثناءات دلالية معتمدة (success/warning/danger/accent-ink).
5. **primitives القديمة**: `primitives/PageHeader` و`Card` و`MetricCard` تبقى لمن يستخدمها
   حتى تنتهي موجة الترحيل — لا تعدّلها (ملك 4E)؛ الصفحات الجديدة تستخدم patterns.

## ملاحظات تكامل (لـ Agent Z)

- `styles/patterns.css` جديد — أُضيف سطر `import './styles/patterns.css';` في
  `main.tsx` بعد `layout.css`. عند أي تعارض استيراد: احتفظ بالسطر (الأنماط كلها
  ببادئة `pf-` منعومة الاصطدام).
- عند هبوط 1B: استبدل `patterns/RowList` الداخلي بـ RowItem المشترك — نفس الـprops
  (leading/title/meta/trailing + expandable body).
- طلبات توكن: لا شيء حتى الآن؛ الأنماط راضية عن سلّم r197 الحالي.
