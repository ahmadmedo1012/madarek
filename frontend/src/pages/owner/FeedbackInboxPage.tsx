/**
 * FeedbackInboxPage — r323 B3.6 — the registrar/owner feedback inbox.
 *
 * Every «أبلغ عن مشكلة / اقتراح» the pilot files lands here with its
 * context (route, role, browser, console ring, optional screenshot)
 * and the status grammar works the row: open → triage → fixed |
 * dismissed (terminal — the backend owns the transition verdict).
 */
import { useState } from 'react';
import { Inbox, MessageSquarePlus, RefreshCw } from 'lucide-react';
import { Card } from '../../components/primitives';
/* The patterns PageHeader — breadcrumbs brow + meta, the owner pages' seat. */
import { PageHeader } from '../../components/patterns';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useFeedbackInbox, useFeedbackStatus, type FeedbackRow } from '../../hooks/resources/feedback';
import { formatDate } from '../../utils/numbers';

const STATUS_LABELS: Record<FeedbackRow['status'], string> = {
  open: 'مفتوح',
  triage: 'قيد المراجعة',
  fixed: 'أُصلح',
  dismissed: 'مُستبعد',
};

const KIND_LABELS: Record<FeedbackRow['kind'], string> = {
  BUG: 'مشكلة',
  IDEA: 'اقتراح',
};

/** The transitions the inbox offers per current status — mirrors the
 *  backend's core.ts grammar (open → triage|fixed|dismissed, triage →
 *  fixed|dismissed, terminal states offer nothing). */
const NEXT_STATUSES: Record<FeedbackRow['status'], FeedbackRow['status'][]> = {
  open: ['triage', 'fixed', 'dismissed'],
  triage: ['fixed', 'dismissed'],
  fixed: [],
  dismissed: [],
};

function FeedbackRowCard({ row }: { row: FeedbackRow }) {
  const status = useFeedbackStatus();
  const [showConsole, setShowConsole] = useState(false);
  return (
    <article className="fb-row">
      <div className="fb-row-head">
        <span className="fb-chip" data-kind={row.kind}>{KIND_LABELS[row.kind]}</span>
        <span className="fb-chip" data-status={row.status}>{STATUS_LABELS[row.status]}</span>
        {row.route && <span className="fb-row-route" dir="ltr">{row.route}</span>}
        <span className="fb-row-user">
          {row.user ? `${row.user.firstName} ${row.user.lastName} · ${row.user.role} · ` : ''}
          {formatDate(row.createdAt, { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <p className="fb-row-note">{row.note}</p>
      {row.screenshot && <img className="fb-shot" src={row.screenshot} alt="لقطة من مُبلِّغ" loading="lazy" />}
      {(row.console?.length ?? 0) > 0 && (
        <>
          <button type="button" className="btn ghost sm" onClick={() => setShowConsole((v) => !v)}>
            أخطاء لوحة التطوير ({row.console!.length})
          </button>
          {showConsole && (
            <pre className="fb-console" dir="ltr">
              {row.console!.map((c) => `[${new Date(c.t).toISOString()}] ${c.text}`).join('\n')}
            </pre>
          )}
        </>
      )}
      {NEXT_STATUSES[row.status].length > 0 && (
        <div className="fb-status-actions">
          {NEXT_STATUSES[row.status].map((s) => (
            <button
              key={s}
              type="button"
              className="btn ghost sm"
              disabled={status.isPending}
              onClick={() => status.mutate({ id: row.id, status: s })}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

const FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: 'الكل' },
  { value: 'open', label: 'مفتوح' },
  { value: 'triage', label: 'قيد المراجعة' },
  { value: 'fixed', label: 'أُصلح' },
  { value: 'dismissed', label: 'مُستبعد' },
];

export default function FeedbackInboxPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const inbox = useFeedbackInbox(page, status);
  const rows = (inbox.data as { data?: FeedbackRow[] } | undefined)?.data ?? [];
  const meta = (inbox.data as { meta?: { total: number; totalPages: number; page: number } } | undefined)?.meta;

  return (
    <div className="page">
      <PageHeader
        title="صندوق التغذية الراجعة"
        description="كل «أبلغ عن مشكلة / اقتراح» وصل من مستخدمي المنصّة — مع سياقه الكامل."
        eyebrow="المنصّة · التشغيل"
        actions={
          <button type="button" className="btn ghost sm" onClick={() => void inbox.refetch()}>
            <Icon icon={RefreshCw} size={13} /> تحديث
          </button>
        }
      />

      <Card title="التقارير" subtitle="الحالة تتحرّك باتجاه واحد: مفتوح → قيد المراجعة → أُصلح أو مُستبعد.">
        <div className="fb-status-actions" style={{ marginInlineStart: 0, marginBottom: 'var(--sp-2-5)' }}>
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              className="btn ghost sm"
              data-active={status === f.value}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {inbox.isPending ? (
          <Skeleton width="100%" height={140} />
        ) : inbox.isError ? (
          <ErrorState error={inbox.error} onRetry={() => void inbox.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="لا تقارير هنا"
            description="عندما يرسل مستخدم «أبلغ عن مشكلة / اقتراح» يظهر تقريره في هذا الصندوق بسياقه الكامل."
          />
        ) : (
          <div className="fb-inbox">
            {rows.map((row) => (
              <FeedbackRowCard key={row.id} row={row} />
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="fb-status-actions" style={{ marginInlineStart: 0, marginTop: 'var(--sp-2-5)' }}>
            <button type="button" className="btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              السابق
            </button>
            <span className="fb-row-user">
              صفحة {meta.page} من {meta.totalPages} · {meta.total} تقريرًا
            </span>
            <button
              type="button"
              className="btn ghost sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </button>
          </div>
        )}

        <p className="inv-note">
          <Icon icon={MessageSquarePlus} size={12} /> الودجت العائم على كل شاشة مسجّل الدخول هو مصدر هذه التقارير.
        </p>
      </Card>
    </div>
  );
}
