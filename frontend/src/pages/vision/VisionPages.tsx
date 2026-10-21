import { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  Sparkles, ArrowLeft, ChevronRight, Bell,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
/* r266 (4E — اتجاه Superlist): جدار بطاقات KPI يصير شريط أرقام هادئ،
   وشبكات المفاهيم تصير قوائم صفوف بتفصيل على الصف. G النهائية:
   الإطار والترويسة على عقد patterns (PageFrame/PageHeader) وأسلوب
   الصفحة ينتقل من السطري إلى vision.css. */
import { PageFrame, PageHeader, RowList, RowItem, StatLine } from '../../components/patterns';
import { EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { VISION_CONCEPTS, STATUS_LABEL, STATUS_COLOR, type VisionConcept } from '../../lib/vision';
import { countAr } from '../../lib/format';
import { formatNum } from '../../utils/numbers';
import '../../styles/vision.css';

/* 5-C5 (A12 P2-7): the detail page is a READING surface. Every value
 * below consumes the same grammar the platform's card headers use
 * (components.css .card-title) — real h2s declared in vision.css since
 * G (the page had zero heading structure under its h1: the article's
 * only prose was a 13px muted paragraph stretched across a 1134px
 * measure). */

/* Article prose — body-role size, real ink, and the shared 72ch
 * measure token (taste floor: 45–75ch) — .vision-article in
 * vision.css. */

/* Payload document title (A12 P3-6): the tab said «ابتكار قادم · مدارك»
 * for every article while the h1 carried the real name. The concept
 * data is STATIC, so this effect lands in the same commit as the
 * shell's pathname-title effect — child effects run before the
 * parent's, and the 0ms macrotask schedules after every effect in the
 * commit, so the payload title survives the stomp. (A null title —
 * unknown slug — leaves the shell's resolution in place; the page
 * redirects to the gallery in that branch anyway.) */
function useDocTitle(title: string | null) {
  useEffect(() => {
    if (title === null) return;
    const set = window.setTimeout(() => {
      document.title = `${title} · مدارك`;
    }, 0);
    return () => {
      window.clearTimeout(set);
    };
  }, [title]);
}

/**
 * Vision pages — static roadmap content (no API: no skeleton/error states
 * by design; the empty state below is the honest guard if the concept
 * list is ever emptied). Craft notes (wave 6-c):
 *   - Headers adopt the platform's .page-header / .page-title-block
 *     system — real typography plus the designed entrance, which is this
 *     page's one authored moment (the vision-statement reveal).
 *   - The eyebrow/kicker is removed per ruling #2 (app-internal page) —
 *     its letter-spacing also broke Arabic cursive joins.
 *   - Concept gradient hexes never color TEXT anymore (audit 0-b P2-30):
 *     they only fill decorative icon chips; values/steps read through
 *     gated tokens.
 */

/** Decorative gradient chip carrying a concept's icon. The gradient comes
 *  from the concept data (lib/vision.ts) — the one legitimately dynamic
 *  value, kept inline; the geometry/theme grammar lives in vision.css
 *  (.vision-chip + size modifier). */
function ConceptChip({ concept, variant }: { concept: VisionConcept; variant: 'row' | 'hero' }) {
  return (
    <span
      className={`vision-chip ${variant === 'hero' ? 'vision-chip--hero' : 'vision-chip--row'}`}
      aria-hidden
      style={{ background: `linear-gradient(135deg, ${concept.gradient[0]}, ${concept.gradient[1]})` }}
    >
      <Icon icon={concept.icon} size={variant === 'hero' ? 32 : 17} />
    </span>
  );
}

export function VisionGalleryPage() {
  const grouped = {
    beta: VISION_CONCEPTS.filter((c) => c.status === 'beta'),
    prototype: VISION_CONCEPTS.filter((c) => c.status === 'prototype'),
    planning: VISION_CONCEPTS.filter((c) => c.status === 'planning'),
    research: VISION_CONCEPTS.filter((c) => c.status === 'research'),
  };
  // Count truth: the headline number derives from the data — never a
  // hardcoded digit (audit 0-b P1-10 pattern).
  const total = VISION_CONCEPTS.length;

  return (
    <PageFrame>
      {/* r262 family grammar (G): patterns PageHeader — the same header
          contract every recomposed index rides (community/competitions/
          colleges); the authored vision statement stays the h1. */}
      <PageHeader
        title={`${formatNum(total)} ابتكاراً قادماً، نبني التعليم في يدك خطوة بخطوة.`}
        description="هذه نظرة على المسار التقني للمنصة — من الذكاء الاصطناعي والميتافيرس إلى البلوكشين والترجمة الفورية."
      />

      {total === 0 ? (
        <EmptyState illustration="empty-list"
          icon={Sparkles}
          title="لا توجد ابتكارات معروضة بعد"
          description="ستظهر خارطة الطريق التقنية للمنصة هنا حين تُنشر."
        />
      ) : (
        <>
          {/* r266: ملخّص الحالات شريط أرقام هادئ (القيم من البيانات). */}
          <StatLine
            items={[
              { label: 'إصدار تجريبي', value: formatNum(grouped.beta.length), tone: 'positive' },
              { label: 'نموذج أولي', value: formatNum(grouped.prototype.length), tone: 'signal' },
              { label: 'قيد التخطيط', value: formatNum(grouped.planning.length), tone: 'warning' },
              { label: 'قيد البحث', value: formatNum(grouped.research.length) },
            ]}
          />

          {/* The hub tells a status story (A12 P3-4): the LIVE concepts
              lead under «جرّبها الآن», everything in development follows
              ordered by stage — statuses no longer interleave in the grid
              (the audit measured «نموذج أولي، نموذج أولي، قيد التخطيط…»
              in raw array order). The per-card badges keep the precise
              stage; the two bands give the scan order a lead story. */}
          {grouped.beta.length > 0 && (
            <section aria-labelledby="vision-group-live" className="vision-group">
              {/* baseline alignment keeps the counted-noun note on the
                  heading's rhythm (.vision-group-head). */}
              <header className="vision-group-head">
                <h2 id="vision-group-live" className="vision-h2">جرّبها الآن</h2>
                <span className="text-xs text-subtle">
                  {countAr(grouped.beta.length, ['ابتكار متاح للتجربة', 'ابتكاران متاحان للتجربة', 'ابتكارات متاحة للتجربة', 'ابتكاراً متاحاً للتجربة'])}
                </span>
              </header>
              <RowList aria-label="ابتكارات متاحة للتجربة">
                {grouped.beta.map((c) => (
                  <VisionConceptCard key={c.slug} concept={c} />
                ))}
              </RowList>
            </section>
          )}
          {[...grouped.prototype, ...grouped.planning, ...grouped.research].length > 0 && (
            <section aria-labelledby="vision-group-dev" className="vision-group">
              <header className="vision-group-head">
                <h2 id="vision-group-dev" className="vision-h2">قيد التطوير</h2>
                <span className="text-xs text-subtle">
                  {countAr(
                    grouped.prototype.length + grouped.planning.length + grouped.research.length,
                    ['ابتكار في المراحل المبكرة', 'ابتكاران في المراحل المبكرة', 'ابتكارات في المراحل المبكرة', 'ابتكاراً في المراحل المبكرة'],
                  )}
                </span>
              </header>
              <RowList aria-label="ابتكارات في المراحل المبكرة">
                {[...grouped.prototype, ...grouped.planning, ...grouped.research].map((c) => (
                  <VisionConceptCard key={c.slug} concept={c} />
                ))}
              </RowList>
            </section>
          )}

          {/* Bottom note — honest framing (A8 P2-5): the old copy
              promised «موارد مخصّصة، تواريخ إطلاق متوقّعة، ومؤشرات قياس
              واضحة» for every concept — none of which exists. The cards
              now carry design facts and real stages only (A8 P1-1). */}
          <Card>
            <div className="flex items-center gap-3">
              <Icon icon={Sparkles} size={20} className="text-accent" />
              <p className="text-sm text-muted flex-1 vision-note-copy">
                هذه خارطة طريق لا وعود تسويقية: كل بطاقة تصف مرحلتها الفعلية من
                التطوير، وتُحدَّث حالتها هنا فور تغيّرها. لا نتائج مقيسة ولا
                مواعيد إطلاق متوقّعة — حقائق تصميم ومراحل عمل فقط.
              </p>
            </div>
          </Card>
        </>
      )}
    </PageFrame>
  );
}

/* One concept card — shared by both hub bands (the body moved out of
 * the gallery map when the grid gained status grouping, A12 P3-4). */
function VisionConceptCard({ concept: c }: { concept: VisionConcept }) {
  /* r266: صفّ مفهوم هادئ — الشريحة اللونية تقود، العنوان هو باب الصف،
     الحالة شارة في الطرف. (التفصيل الكامل يبقى في صفحة المفهوم.) */
  return (
    /* r289: الصف كله الوصلة (RowItem to) — أرضية اللمس لكل الصف. */
    <RowItem
      to={`/vision/${c.slug}`}
      leading={<ConceptChip concept={c} variant="row" />}
      title={c.title}
      meta={c.subtitle}
      trailing={<Badge color={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>}
    />
  );
}

/* ─── Detail page ───────────────────────────────────────── */
export function VisionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const concept = VISION_CONCEPTS.find((c) => c.slug === slug);
  useDocTitle(concept?.title ?? null);
  if (!concept) return <Navigate to="/vision" replace />;

  return (
    <PageFrame>
      {/* Back — ChevronRight is the RTL back direction (mirrors the
          colleges detail / leaderboard idiom, CollegePages ~:600/:1015);
          the old ChevronLeft pointed «forward» in RTL. */}
      <Link to="/vision" className="btn ghost sm vision-back">
        <Icon icon={ChevronRight} size={13} />
        العودة إلى الابتكارات
      </Link>

      {/* Hero — gradient chip + status + statement on the page-title
          grammar (the old raw clamp/letterSpacing inline blob and the
          0px-rendering .vision-detail-hero-bg div are gone). */}
      <div className="vision-detail-hero flex-col gap-2">
        <ConceptChip concept={concept} variant="hero" />
        <div>
          <Badge color={STATUS_COLOR[concept.status]} icon={Sparkles}>
            {STATUS_LABEL[concept.status]}
          </Badge>
        </div>
        <h1 className="page-title vision-detail-title">{concept.title}</h1>
        <p className="page-subtitle">{concept.subtitle}</p>
      </div>

      {/* Article body — the reading space (A12 P2-7): plain prose on the
          page ground at body size + the 72ch measure token, replacing the
          13px muted spec-line inside full-width Card chrome. No TOC: the
          articles run ~200 words (taste: a TOC buys nothing under 600),
          the h2 sections below carry the structure. */}
      <p className="vision-article">{concept.description}</p>

      {/* Metrics — honest design facts (A8 P1-1: every invented
          precision number was removed from this data; what remains are
          real stages, real technology choices, and the one honest
          measured counter the file ever had). r304: the values are
          mostly TEXT, so the definition row rides the StatLine
          contract — the same quiet label/value/hint grammar every
          framed page opens with — instead of the dashboard `.metric`
          tile vocabulary the patterns contract retires. */}
      <StatLine
        items={concept.metrics.map((m) => ({
          label: m.label,
          value: m.value,
          hint: m.sub,
        }))}
      />

      <div className="grid-2-1">
        {/* Features — a real h2 (the page had zero heading levels under
            the h1; P2-7's reading-craft fix). */}
        <Card>
          <h2 className="vision-h2">المميزات</h2>
          <div className="flex-col gap-2">
            {concept.features.map((f, i) => (
              <div key={i} className="list-row">
                <span className="text-accent">
                  <Icon icon={Sparkles} size={14} />
                </span>
                <div className="list-row-body">
                  <div className="text-sm vision-feature">{f}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* How it works — numbered steps on gated tokens (was white-on-
            concept-gradient text, ungated). */}
        <Card>
          <h2 className="vision-h2">كيف تعمل</h2>
          <div className="flex-col gap-3">
            {concept.steps.map((s, i) => (
              <div key={i} className="flex gap-3 vision-step">
                <span aria-hidden className="vision-step-num">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold vision-step-title">{s.title}</div>
                  <div className="text-xs text-muted vision-step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Use cases */}
      <Card>
        <h2 className="vision-h2">الاستخدامات المحتملة</h2>
        <div className="flex flex-wrap gap-2">
          {concept.useCases.map((u) => (
            <Badge key={u}>{u}</Badge>
          ))}
        </div>
      </Card>

      {/* Launch notification — HONEST state (audit 4-A8 P2-2): the old
          CTA promised «ستتلقى إشعاراً على بريدك الجامعي» with zero API
          calls and a state that reset on reload — an unsatisfiable
          claim. No notification endpoint exists yet, so the card says
          so: a disabled «قريباً» button, no email promise. When a real
          subscription endpoint lands, wire it here and drop this note.
          Compact chrome (taste: compress the administrative parts —
          the article carries the weight, not the scaffolding). */}
      <Card compact>
        <div className="flex items-center gap-3 vision-notify">
          <span aria-hidden className="vision-notify-icon">
            <Icon icon={Bell} size={16} />
          </span>
          <div className="flex-1 vision-notify-body">
            <div className="text-md font-semibold vision-notify-title">
              نبّهني عند إطلاق هذه الميزة
            </div>
            <div className="text-xs text-subtle vision-notify-hint">
              خدمة التنبيه على البريد قيد التطوير — تابع صفحة الرؤية: حالة كل ابتكار تُحدَّث هنا فور تغيّرها.
            </div>
          </div>
          <button type="button" className="btn outline" disabled>
            <Icon icon={Bell} size={13} />
            قريباً
          </button>
        </div>
      </Card>

      {/* Bottom navigation between concepts */}
      <Card flush>
        <div className="flex justify-between vision-prevnext">
          {(() => {
            const idx = VISION_CONCEPTS.findIndex((c) => c.slug === slug);
            const prev = idx > 0 ? VISION_CONCEPTS[idx - 1] : null;
            const next = idx < VISION_CONCEPTS.length - 1 ? VISION_CONCEPTS[idx + 1] : null;
            return (
              <>
                {prev ? (
                  <Link to={`/vision/${prev.slug}`} className="btn ghost sm">
                    <Icon icon={ArrowLeft} size={13} className="vision-icon-back" />
                    {prev.title}
                  </Link>
                ) : <span />}
                {next ? (
                  <Link to={`/vision/${next.slug}`} className="btn ghost sm">
                    {next.title}
                    <Icon icon={ArrowLeft} size={13} />
                  </Link>
                ) : null}
              </>
            );
          })()}
        </div>
      </Card>
    </PageFrame>
  );
}
