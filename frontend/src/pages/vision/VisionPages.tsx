import { Link, useParams, Navigate } from 'react-router-dom';
import {
  Sparkles, ArrowLeft, ChevronLeft, Bell,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { VISION_CONCEPTS, STATUS_LABEL, STATUS_COLOR, type VisionConcept } from '../../lib/vision';

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
 *  from the concept data (lib/vision.ts); the glyph is white in both
 *  themes — the one place a literal white is correct (documented raw
 *  value, guardrail 4: there is no on-color token). */
function ConceptChip({ concept, box, glyph }: { concept: VisionConcept; box: number; glyph: number }) {
  return (
    <span
      className="vision-chip"
      aria-hidden
      style={{
        inlineSize: box,
        blockSize: box,
        borderRadius: 'var(--r-md)',
        background: `linear-gradient(135deg, ${concept.gradient[0]}, ${concept.gradient[1]})`,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon icon={concept.icon} size={glyph} />
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
    <div className="page">
      {/* Standard page header — the page-title-block carries the authored
          entrance (vision-statement reveal, polish.css). */}
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">
            {total.toLocaleString('ar-LY')} ابتكاراً قادماً، نبني التعليم في يدك خطوة بخطوة.
          </h1>
          <p className="page-subtitle">
            هذه نظرة على المسار التقني للمنصة خلال السنوات الثلاث القادمة —
            من الذكاء الاصطناعي والميتافيرس إلى البلوكشين والترجمة الفورية.
          </p>
        </div>
      </header>

      {total === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="لا توجد ابتكارات معروضة بعد"
          description="ستظهر خارطة الطريق التقنية للمنصة هنا حين تُنشر."
        />
      ) : (
        <>
          {/* Status summary */}
          <div className="grid-4">
            <MetricCard label="إصدار تجريبي" value={grouped.beta.length} color="green" />
            <MetricCard label="نموذج أولي" value={grouped.prototype.length} color="brand" />
            <MetricCard label="قيد التخطيط" value={grouped.planning.length} color="amber" />
            <MetricCard label="قيد البحث" value={grouped.research.length} color="red" />
          </div>

          {/* The concepts — shared card + grid system (the page-local
              vision-* classes stay as hooks for a future vision.css). */}
          <div className="grid-3 vision-grid">
            {VISION_CONCEPTS.map((c) => (
              <Link to={`/vision/${c.slug}`} key={c.slug} className="card vision-card">
                <ConceptChip concept={c} box={44} glyph={20} />
                <div>
                  <div className="vision-card-title font-semibold">{c.title}</div>
                  <div className="vision-card-sub text-sm text-muted">{c.subtitle}</div>
                </div>
                <div className="vision-card-foot flex items-center justify-between gap-2">
                  <Badge color={STATUS_COLOR[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  <span className="text-xxs text-subtle flex items-center gap-1">
                    التفاصيل
                    <Icon icon={ArrowLeft} size={11} />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom note */}
          <Card>
            <div className="flex items-center gap-3">
              <Icon icon={Sparkles} size={20} className="text-accent" />
              <p className="text-sm text-muted flex-1" style={{ lineHeight: 'var(--lh-base)' }}>
                هذه الرؤية ليست وعداً تسويقياً. كل ابتكار له موارد مخصّصة، تواريخ
                إطلاق متوقّعة، ومؤشرات قياس واضحة. سنشاركها مع الجامعة كل ربع سنة.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/* ─── Detail page ───────────────────────────────────────── */
export function VisionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const concept = VISION_CONCEPTS.find((c) => c.slug === slug);
  if (!concept) return <Navigate to="/vision" replace />;

  return (
    <div className="page">
      <Link to="/vision" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
        <Icon icon={ChevronLeft} size={13} />
        كل الابتكارات
      </Link>

      {/* Hero — gradient chip + status + statement on the .page-title
          system (the old raw clamp/letterSpacing inline blob and the
          0px-rendering .vision-detail-hero-bg div are gone). */}
      <div className="vision-detail-hero flex-col gap-2">
        <ConceptChip concept={concept} box={64} glyph={32} />
        <div>
          <Badge color={STATUS_COLOR[concept.status]} icon={Sparkles}>
            {STATUS_LABEL[concept.status]}
          </Badge>
        </div>
        <h1 className="page-title vision-detail-title">{concept.title}</h1>
        <p className="page-subtitle" style={{ maxInlineSize: 580 }}>{concept.subtitle}</p>
      </div>

      {/* Description */}
      <Card>
        <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: 'var(--lh-loose)' }}>
          {concept.description}
        </p>
      </Card>

      {/* Metrics — the designed .metric-value treatment (concept hexes no
          longer color values; audit 0-b P2-30). */}
      <div className="grid-3">
        {concept.metrics.map((m) => (
          <div key={m.label} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            {m.sub && <div className="metric-change">{m.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid-2-1">
        {/* Features */}
        <Card title="المميزات" icon={Sparkles}>
          <div className="flex-col gap-2">
            {concept.features.map((f, i) => (
              <div key={i} className="list-row">
                <span className="text-accent">
                  <Icon icon={Sparkles} size={14} />
                </span>
                <div className="list-row-body">
                  <div className="text-sm" style={{ color: 'var(--text)' }}>{f}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* How it works — numbered steps on gated tokens (was white-on-
            concept-gradient text, ungated). */}
        <Card title="كيف تعمل">
          <div className="flex-col gap-3">
            {concept.steps.map((s, i) => (
              <div key={i} className="flex gap-3" style={{ padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
                <span
                  aria-hidden
                  className="flex items-center justify-center"
                  style={{
                    inlineSize: 26,
                    blockSize: 26,
                    borderRadius: 'var(--r-full)',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-ink, var(--accent))',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 'var(--fw-bold)',
                    fontSize: 'var(--fs-xs)',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.title}</div>
                  <div className="text-xs text-muted" style={{ marginBlockStart: 'var(--sp-1)', lineHeight: 'var(--lh-base)' }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Use cases */}
      <Card title="الاستخدامات المحتملة">
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
          subscription endpoint lands, wire it here and drop this note. */}
      <Card>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <span
            aria-hidden
            className="flex items-center justify-center"
            style={{
              inlineSize: 44,
              blockSize: 44,
              borderRadius: 'var(--r-md)',
              background: 'var(--gold-soft)',
              /* --gold on --gold-soft is 2.2:1; --gold-ink is the
                 designed text-on-gold pair (6.98:1 light / 8.18:1 dark). */
              color: 'var(--gold-ink, var(--gold))',
              flexShrink: 0,
            }}
          >
            <Icon icon={Bell} size={18} />
          </span>
          <div className="flex-1" style={{ minInlineSize: 200 }}>
            <div className="text-md font-semibold" style={{ color: 'var(--text)' }}>
              نبّهني عند إطلاق هذه الميزة
            </div>
            <div className="text-xs text-subtle" style={{ marginBlockStart: 2 }}>
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
        <div className="flex justify-between" style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
          {(() => {
            const idx = VISION_CONCEPTS.findIndex((c) => c.slug === slug);
            const prev = idx > 0 ? VISION_CONCEPTS[idx - 1] : null;
            const next = idx < VISION_CONCEPTS.length - 1 ? VISION_CONCEPTS[idx + 1] : null;
            return (
              <>
                {prev ? (
                  <Link to={`/vision/${prev.slug}`} className="btn ghost sm">
                    <Icon icon={ArrowLeft} size={13} style={{ transform: 'scaleX(-1)' }} />
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
    </div>
  );
}
