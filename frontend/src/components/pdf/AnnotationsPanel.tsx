import { useState } from 'react';
import {
  MessageSquare, Plus, Trash2, ChevronLeft,
} from 'lucide-react';
import { Icon } from '../Icon';
import { UserAvatar, Badge } from '../primitives';
import { EmptyState, ErrorState, Skeleton } from '../primitives/States';
import { useAnnotations, useCreateAnnotation, useDeleteAnnotation } from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';

interface AnnotationsPanelProps {
  paperId: string;
  /** Current PDF page — used to attach new annotations to it. */
  currentPage: number;
  /** Total pages — to bound the picker. */
  numPages: number;
  /** Caller subscribes to navigate to a specific page when the user clicks an annotation. */
  onJumpToPage: (page: number) => void;
}

/**
 * Teacher pen palette — the design world's section-color family inks,
 * quoted by value (copper / mint / sky / rose / yellow / lavender).
 *
 * These values are PERSISTED to the API as the annotation's color, so
 * they must be concrete hexes that stay stable across themes — a var()
 * reference would resolve differently per theme and is not a color
 * outside this CSS runtime (raw hex here is the documented guardrail-4
 * exception). Each is a light-palette family ink: a mid-tone that
 * keeps ≥3:1 against the dark theme's card ground and reads as a
 * bounded swatch on light (the chip itself carries a border + ring).
 * Annotations written before this palette keep rendering — the stored
 * color string is rendered verbatim.
 */
const PEN_COLORS = [
  { value: '#B57438', name: 'نحاسي' },   // copper family ink
  { value: '#4FA66D', name: 'أخضر' },    // mint family ink
  { value: '#5C8FCE', name: 'أزرق' },    // sky family ink
  { value: '#DD6E78', name: 'أحمر' },    // rose family ink
  { value: '#D6A330', name: 'ذهبي' },    // yellow family ink
  { value: '#8A6FE0', name: 'بنفسجي' },  // lavender family ink
] as const;

/** Shape-matched list placeholder — mirrors an annotation card
 *  (avatar + author line + two comment lines), craft floor. */
function AnnotationsSkeleton() {
  return (
    <div role="status" aria-label="جاري تحميل الملاحظات…" className="annotations-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="annotations-skeleton-item">
          <Skeleton width={28} height={28} rounded="var(--r-full)" />
          <div className="annotations-skeleton-lines">
            <Skeleton width="42%" height={10} />
            <Skeleton width="94%" height={10} />
            <Skeleton width="68%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnnotationsPanel({ paperId, currentPage, numPages, onJumpToPage }: AnnotationsPanelProps) {
  const annotations = useAnnotations(paperId);
  const createA = useCreateAnnotation(paperId);
  const deleteA = useDeleteAnnotation(paperId);
  const user = useAuthStore((s) => s.user);
  const canAnnotate = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftPage, setDraftPage] = useState(currentPage);
  const [draftColor, setDraftColor] = useState<string>(PEN_COLORS[0].value);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || createA.isPending) return;
    createA.mutate(
      { page: draftPage, comment: draft.trim(), color: draftColor },
      {
        onSuccess: () => {
          setDraft('');
          setComposing(false);
        },
      },
    );
  };

  const startCompose = () => {
    setDraftPage(currentPage);
    setComposing(true);
    setDraft('');
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const diffSec = Math.round((Date.now() - +d) / 1000);
    if (diffSec < 60) return 'الآن';
    if (diffSec < 3600) return `منذ ${Math.round(diffSec / 60)} د`;
    if (diffSec < 86400) return `منذ ${Math.round(diffSec / 3600)} س`;
    return d.toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' });
  };

  return (
    <aside className="annotations-panel">
      <header className="annotations-header">
        <div className="flex items-center gap-2">
          <Icon icon={MessageSquare} size={16} className="text-subtle" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>الملاحظات</span>
          <Badge>{annotations.data?.length ?? 0}</Badge>
        </div>
        {canAnnotate && !composing && (
          <button type="button" className="btn primary sm" onClick={startCompose}>
            <Icon icon={Plus} size={13} />
            إضافة ملاحظة
          </button>
        )}
      </header>

      {/* Composer */}
      {composing && (
        <form onSubmit={submit} className="annotation-composer">
          <div className="annotation-composer-meta flex items-center gap-2">
            <span className="text-xxs text-subtle">الصفحة</span>
            <input
              type="number"
              min={1}
              max={numPages}
              value={draftPage}
              onChange={(e) => setDraftPage(Math.max(1, Math.min(numPages, +e.target.value || 1)))}
              className="annotation-page-input font-mono"
              aria-label={`رقم الصفحة، من ${numPages}`}
            />
            <span className="text-xxs text-subtle">/ {numPages}</span>
            <div className="annotation-colors" role="group" aria-label="لون القلم">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`annotation-color${draftColor === c.value ? ' on' : ''}`}
                  onClick={() => setDraftColor(c.value)}
                  aria-pressed={draftColor === c.value}
                  aria-label={`قلم ${c.name}`}
                  title={`قلم ${c.name}`}
                >
                  <span className="annotation-color-dot" style={{ background: c.value }} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="اكتب ملاحظتك على هذه الصفحة…"
            aria-label="نص الملاحظة"
            rows={3}
            maxLength={2000}
            className="annotation-textarea"
            autoFocus
          />
          <div className="flex items-center justify-between" style={{ marginTop: 'var(--sp-2)' }}>
            <span className="text-xxs text-subtle">{draft.length} / 2000</span>
            <div className="flex gap-2">
              <button type="button" className="btn ghost sm" onClick={() => { setComposing(false); setDraft(''); }}>
                إلغاء
              </button>
              <button type="submit" className="btn primary sm" disabled={!draft.trim() || createA.isPending}>
                {createA.isPending ? 'جاري…' : 'حفظ'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List */}
      <div className="annotations-list">
        {annotations.isPending ? (
          <AnnotationsSkeleton />
        ) : annotations.isError ? (
          <ErrorState
            message="تعذّر تحميل الملاحظات"
            error={annotations.error}
            onRetry={() => annotations.refetch()}
          />
        ) : !annotations.data?.length ? (
          <EmptyState
            icon={MessageSquare}
            title="لا توجد ملاحظات بعد"
            description={canAnnotate ? 'أضف أول ملاحظة على هذا البحث.' : 'سيظهر هنا أي تعليق يضعه المُقيِّم على البحث.'}
          />
        ) : (
          annotations.data.map((a) => {
            const isMine = user?.id === a.author.id;
            const initials = a.author.avatarInitials ?? `${a.author.firstName[0] ?? ''}${a.author.lastName[0] ?? ''}`;
            return (
              <article
                key={a.id}
                className="annotation-item"
                /* 1px author-color hairline (orchestrator ruling #4: the
                   Notion hairline language — no >1px accent stripes). */
                style={{ borderInlineStart: `1px solid ${a.color ?? 'var(--accent)'}` }}
              >
                <div className="annotation-item-head">
                  <UserAvatar initials={initials} color={a.author.avatarColor ?? undefined} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                      {a.author.firstName} {a.author.lastName}
                    </div>
                    <div className="flex items-center gap-2 text-xxs text-subtle">
                      <RoleBadge role={a.author.role} />
                      <span>·</span>
                      <span>{fmtTime(a.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="annotation-jump"
                    onClick={() => onJumpToPage(a.page)}
                    title={`اذهب إلى الصفحة ${a.page}`}
                    aria-label={`الانتقال إلى الصفحة ${a.page}`}
                  >
                    <Icon icon={ChevronLeft} size={12} />
                    <span className="font-mono">صفحة {a.page}</span>
                  </button>
                </div>
                <p className="annotation-comment">{a.comment}</p>
                {isMine && (
                  <button
                    type="button"
                    className="annotation-delete"
                    onClick={() => deleteA.mutate(a.id)}
                    disabled={deleteA.isPending}
                    aria-label="حذف الملاحظة"
                  >
                    <Icon icon={Trash2} size={11} />
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}

function RoleBadge({ role }: { role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' }) {
  const label =
    role === 'TEACHER' ? 'أستاذ' :
    role === 'ADMIN' ? 'إدارة' :
    role === 'QUALITY' ? 'جودة' :
    'طالب';
  return <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{label}</span>;
}
