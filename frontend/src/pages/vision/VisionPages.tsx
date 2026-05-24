import { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  Sparkles, ArrowLeft, ChevronLeft, Bell, CheckCircle2, type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { VISION_CONCEPTS, STATUS_LABEL, STATUS_COLOR } from '../../lib/vision';

export function VisionGalleryPage() {
  const grouped = {
    beta: VISION_CONCEPTS.filter((c) => c.status === 'beta'),
    prototype: VISION_CONCEPTS.filter((c) => c.status === 'prototype'),
    planning: VISION_CONCEPTS.filter((c) => c.status === 'planning'),
    research: VISION_CONCEPTS.filter((c) => c.status === 'research'),
  };

  return (
    <div className="page">
      <div className="vision-hero">
        <div className="vision-eyebrow">
          <Icon icon={Sparkles} size={12} />
          رؤية مدارك المستقبلية
        </div>
        <h1 className="vision-title">
          12 ابتكاراً قادماً، نبني التعليم في يدك خطوة بخطوة.
        </h1>
        <p className="vision-tagline">
          هذه نظرة على المسار التقني لمنصة مدارك خلال السنوات الثلاث القادمة —
          من الذكاء الاصطناعي والميتافيرس إلى البلوكشين والترجمة الفورية.
        </p>
      </div>

      {/* Status summary */}
      <div className="grid-4">
        <MetricCard label="إصدار تجريبي" value={grouped.beta.length} color="green" />
        <MetricCard label="نموذج أولي" value={grouped.prototype.length} color="brand" />
        <MetricCard label="قيد التخطيط" value={grouped.planning.length} color="amber" />
        <MetricCard label="قيد البحث" value={grouped.research.length} color="red" />
      </div>

      {/* The 12 concepts */}
      <div className="vision-grid">
        {VISION_CONCEPTS.map((c) => (
          <Link to={`/vision/${c.slug}`} key={c.slug} className="vision-card">
            {/* Decorative gradient mark */}
            <div
              className="vision-card-icon"
              style={{
                background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})`,
                color: '#fff',
              }}
            >
              <Icon icon={c.icon} size={20} />
            </div>
            <div>
              <div className="vision-card-title">{c.title}</div>
              <div className="vision-card-sub">{c.subtitle}</div>
            </div>
            <div className="vision-card-foot">
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
          <p className="text-sm text-muted" style={{ flex: 1, lineHeight: 'var(--lh-base)' }}>
            هذه الرؤية ليست وعداً تسويقياً. كل ابتكار له موارد مخصّصة، تواريخ
            إطلاق متوقّعة، ومؤشرات قياس واضحة. سنشاركها مع الجامعة كل ربع سنة.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ─── Detail page ───────────────────────────────────────── */
export function VisionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const concept = VISION_CONCEPTS.find((c) => c.slug === slug);
  const [notified, setNotified] = useState(false);
  if (!concept) return <Navigate to="/vision" replace />;

  return (
    <div className="page">
      <Link to="/vision" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
        <Icon icon={ChevronLeft} size={13} style={{ transform: 'scaleX(-1)' }} />
        كل الابتكارات
      </Link>

      {/* Hero */}
      <div className="vision-detail-hero">
        <div
          className="vision-detail-hero-bg"
          style={{
            background: `linear-gradient(135deg, ${concept.gradient[0]}, ${concept.gradient[1]})`,
          }}
        />
        <div
          className="vision-detail-hero-icon"
          style={{
            background: `linear-gradient(135deg, ${concept.gradient[0]}, ${concept.gradient[1]})`,
            color: '#fff',
          }}
        >
          <Icon icon={concept.icon} size={32} />
        </div>
        <Badge color={STATUS_COLOR[concept.status]} icon={Sparkles}>
          {STATUS_LABEL[concept.status]}
        </Badge>
        <h1 style={{
          fontSize: 'clamp(22px, 3vw, 32px)',
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.5px',
          lineHeight: 1.2,
          margin: 'var(--sp-3) 0 var(--sp-2)',
          position: 'relative',
        }}>
          {concept.title}
        </h1>
        <p className="text-md text-muted" style={{ maxWidth: 580, lineHeight: 'var(--lh-base)', position: 'relative' }}>
          {concept.subtitle}
        </p>
      </div>

      {/* Description */}
      <Card>
        <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: 'var(--lh-loose)' }}>
          {concept.description}
        </p>
      </Card>

      {/* Metrics */}
      <div className="grid-3">
        {concept.metrics.map((m) => (
          <div key={m.label} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: concept.gradient[0] }}>{m.value}</div>
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
                <span style={{ color: concept.gradient[0] }}>
                  <Icon icon={Sparkles} size={14} />
                </span>
                <div className="list-row-body">
                  <div className="text-sm" style={{ color: 'var(--text)' }}>{f}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* How it works */}
        <Card title="كيف تعمل">
          <div className="flex-col gap-3">
            {concept.steps.map((s, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: 'var(--sp-3)',
                padding: 'var(--sp-3)',
                background: 'var(--surface-2)',
                borderRadius: 'var(--r-md)',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: concept.gradient[0], color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.title}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 4, lineHeight: 'var(--lh-base)' }}>
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

      {/* Notify CTA */}
      <Card>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--r-md)',
            background: 'var(--gold-soft)', color: 'var(--gold)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon icon={Bell} size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="text-md font-semibold" style={{ color: 'var(--text)' }}>
              {notified ? 'تم تفعيل التنبيه' : 'نبّهني عند إطلاق هذه الميزة'}
            </div>
            <div className="text-xs text-subtle" style={{ marginTop: 2 }}>
              {notified
                ? 'سنُعلمك على بريدك الجامعي فور توفّر النسخة التجريبية.'
                : 'ستتلقى إشعاراً على بريدك الجامعي فور توفّر النسخة التجريبية.'}
            </div>
          </div>
          <button
            type="button"
            className={notified ? 'btn outline' : 'btn primary'}
            onClick={() => setNotified((v) => !v)}
            disabled={notified}
          >
            <Icon icon={notified ? CheckCircle2 : Bell} size={13} />
            {notified ? 'مُفعَّل' : 'تفعيل التنبيه'}
          </button>
        </div>
      </Card>

      {/* Bottom navigation between concepts */}
      <Card flush>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--sp-4) var(--sp-5)' }}>
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

// Re-export for nav use
export const VisionIcon: LucideIcon = Sparkles;
