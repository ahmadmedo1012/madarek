/**
 * CurriculumAuthoringPanel — the whole "إدارة المنهج" surface of the
 * teacher offering page (/teacher/intelligence/:offeringId).
 *
 * Composition:
 *   1. المحاضرات card — lecture rows (ordinal order) + add/edit/delete.
 *   2. When a lecture is selected, its structure loads via useLecture
 *      (chapters + checkpoints) and renders the ChapterList and
 *      CheckpointList sections.
 *
 * The panel assumes the page already gated the tab by role
 * (TEACHER/ADMIN/OWNER); the API still 403s non-owners, so the UI
 * affordance is the first gate, the backend the last.
 */
import { useMemo, useState } from 'react';
import { ListVideo, Plus } from 'lucide-react';
import { Card, Badge } from '../primitives';
import { EmptyState, ErrorState, LoadingState } from '../primitives/States';
import { Icon } from '../Icon';
import { useLecture, useOfferingLectures, type Lecture } from '../../hooks/useResources';
import { LectureAuthoringList, LectureFormModal } from './LectureAuthoring';
import { ChapterList } from './ChapterBuilder';
import { CheckpointList } from './CheckpointBuilder';

export function CurriculumAuthoringPanel({
  offeringId,
  accent,
}: {
  offeringId: string;
  accent?: string;
}) {
  const lectures = useOfferingLectures(offeringId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lecture | null>(null);
  const [adding, setAdding] = useState(false);

  // The API sorts by ordinal, but re-sort locally so the panel stays
  // honest right after optimistic invalidation streaks.
  const sorted = useMemo(
    () => [...(lectures.data ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [lectures.data],
  );
  const selected = sorted.find((l) => l.id === selectedId) ?? null;
  const detail = useLecture(selected?.id);

  return (
    <Card
      title="إدارة المنهج"
      icon={ListVideo}
      subtitle={
        lectures.data
          ? `${sorted.length} محاضرة · ${sorted.reduce((s, l) => s + (l._count?.chapters ?? 0), 0)} فصل · ${sorted.reduce((s, l) => s + (l._count?.checkpoints ?? 0), 0)} سؤال تفاعلي`
          : undefined
      }
      actions={
        <button
          type="button"
          className="btn primary sm"
          style={accent ? { background: accent } : undefined}
          onClick={() => setAdding(true)}
        >
          <Icon icon={Plus} size={13} /> محاضرة جديدة
        </button>
      }
    >
      {lectures.isPending && <LoadingState label="جارٍ تحميل المحاضرات…" />}

      {lectures.isError && (
        <ErrorState
          message="تعذَّر تحميل المحاضرات"
          error={lectures.error}
          onRetry={() => lectures.refetch()}
        />
      )}

      {lectures.data && sorted.length === 0 && (
        <EmptyState
          icon={ListVideo}
          title="لا توجد محاضرات بعد"
          description="ابدأ بإضافة أول محاضرة: عنوان، رابط فيديو، ومدة اختيارية."
        />
      )}

      {sorted.length > 0 && (
        <LectureAuthoringList
          lectures={sorted}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
          onEdit={setEditing}
        />
      )}

      {selected && (
        <div
          style={{
            marginTop: 'var(--sp-4)',
            padding: 'var(--sp-4)',
            borderRadius: 'var(--r-lg)',
            border: '1px solid var(--rule)',
            background: 'var(--surface-2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-2)',
              marginBottom: 'var(--sp-3)',
            }}
          >
            <Badge color="brand">{selected.ordinal}</Badge>
            <span className="text-sm" style={{ fontWeight: 'var(--fw-bold, 700)' }}>
              هيكل المحاضرة: {selected.title}
            </span>
          </div>

          {detail.isPending && <LoadingState label="جارٍ تحميل الفصول والأسئلة…" variant="minimal" />}
          {detail.isError && (
            <ErrorState message="تعذَّر تحميل هيكل المحاضرة" error={detail.error} onRetry={() => detail.refetch()} />
          )}

          {detail.data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <section aria-label="فصول المحاضرة">
                <div className="text-xs text-muted" style={{ marginBottom: 'var(--sp-2)', fontWeight: 'var(--fw-semibold, 600)' }}>
                  الفصول ({detail.data.chapters.length})
                </div>
                <ChapterList lecture={detail.data} chapters={detail.data.chapters} />
              </section>
              <section aria-label="أسئلة التفاعل">
                <div className="text-xs text-muted" style={{ marginBottom: 'var(--sp-2)', fontWeight: 'var(--fw-semibold, 600)' }}>
                  أسئلة التفاعل ({detail.data.checkpoints.length})
                </div>
                <CheckpointList lecture={detail.data} checkpoints={detail.data.checkpoints} />
              </section>
            </div>
          )}
        </div>
      )}

      {adding && <LectureFormModal offeringId={offeringId} onClose={() => setAdding(false)} />}
      {editing && <LectureFormModal offeringId={offeringId} existing={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}
