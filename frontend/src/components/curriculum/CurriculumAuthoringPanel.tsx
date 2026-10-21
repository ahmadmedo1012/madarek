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
import { countAr } from '../../lib/format';
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

  // Structure totals for the card subtitle (5-B6 A7 P2-4).
  const chapterTotal = sorted.reduce((s, l) => s + (l._count?.chapters ?? 0), 0);
  const checkpointTotal = sorted.reduce((s, l) => s + (l._count?.checkpoints ?? 0), 0);

  return (
    <Card
      title="إدارة المنهج"
      icon={ListVideo}
      subtitle={
        /* 5-B6 (A7 P2-4): counted nouns — the old «3 محاضرة · 9 فصل ·
         * 4 سؤال تفاعلي» was raw. The empty list carries no count at
         * all (the empty state below owns that message). */
        lectures.data && sorted.length > 0
          ? `${countAr(sorted.length, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])} · ${countAr(chapterTotal, ['فصل واحد', 'فصلان', 'فصول', 'فصلاً'])} · ${countAr(checkpointTotal, ['سؤال تفاعلي واحد', 'سؤالان تفاعليان', 'أسئلة تفاعلية', 'سؤالاً تفاعلياً'])}`
          : undefined
      }
      actions={
        /* 3-d: the raw inline `background: accent` overrode .btn.primary's
         * audited token fill with the unaudited course themeColor — the
         * button keeps the token primary; the course accent survives only
         * on the non-text icon-well tint of the selected lecture's
         * structure head below (the --tq-accent idiom the family's rows
         * already use, teacher-quality.css). */
        <button
          type="button"
          className="btn primary sm"
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
        <div className="cur-structure">
          <div className="cur-structure-head">
            {/* The course accent's one surface — the family's tinted icon
             * well (.tq-row-icon keys off --tq-accent, teacher-quality.css;
             * the OfferingRow/LabRow idiom). Decorative only: no text ever
             * rides the raw course color (contrast unaudited). */}
            <span
              className="tq-row-icon"
              aria-hidden="true"
              style={accent ? { ['--tq-accent' as never]: accent } : undefined}
            >
              <Icon icon={ListVideo} size={22} />
            </span>
            <Badge color="brand">{selected.ordinal}</Badge>
            <span className="text-sm cur-structure-title">
              هيكل المحاضرة: {selected.title}
            </span>
          </div>

          {detail.isPending && <LoadingState label="جارٍ تحميل الفصول والأسئلة…" variant="minimal" />}
          {detail.isError && (
            <ErrorState message="تعذَّر تحميل هيكل المحاضرة" error={detail.error} onRetry={() => detail.refetch()} />
          )}

          {detail.data && (
            <div className="cur-structure-body">
              <section aria-label="فصول المحاضرة">
                {/* 3-d: counted nouns (the panel subtitle's own forms) —
                 * the raw «الفصول (N)» was broken Arabic for 1/2; the
                 * empty list carries no count (the section's empty state
                 * owns that message — the subtitle's rule). */}
                <div className="text-xs text-muted cur-sec-label">
                  {detail.data.chapters.length > 0
                    ? `الفصول · ${countAr(detail.data.chapters.length, ['فصل واحد', 'فصلان', 'فصول', 'فصلاً'])}`
                    : 'الفصول'}
                </div>
                <ChapterList lecture={detail.data} chapters={detail.data.chapters} />
              </section>
              <section aria-label="أسئلة التفاعل">
                <div className="text-xs text-muted cur-sec-label">
                  {detail.data.checkpoints.length > 0
                    ? `أسئلة التفاعل · ${countAr(detail.data.checkpoints.length, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])}`
                    : 'أسئلة التفاعل'}
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
