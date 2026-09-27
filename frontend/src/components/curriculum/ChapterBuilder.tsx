/**
 * Chapter builder — the "فصول المحاضرة" section of the إدارة المنهج panel.
 *
 * - ChapterFormModal: create (POST /lectures/:lectureId/chapters) and edit
 *   (PATCH /chapters/:id — only changed fields travel; the merged
 *   start/end window is re-validated client-side AND server-side).
 * - ChapterList: rows with start–end as m:ss (font-mono, LTR), concept
 *   name when linked, up/down reorder (5-D3: ordinal neighbor-swap
 *   via two PATCHes — the lecture pattern), edit (Modal) and delete
 *   (ConfirmDialog).
 *
 * Chapter ordinals are auto-assigned by the API (max+1) on create and
 * reordered exclusively through the move pair (never a form field).
 */
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../owner/ConfirmDialog';
import { Icon } from '../Icon';
import { Badge } from '../primitives';
import { toast } from '../../lib/toast';
import {
  apiErrorMessage,
  useCreateChapter,
  useDeleteChapter,
  useUpdateChapter,
  type Lecture,
  type LectureChapter,
} from '../../hooks/useResources';
import {
  chapterFormSchema,
  formatSec,
  parseTimeToSec,
  withinDuration,
  type ChapterFormValues,
} from './curriculumValidation';
import {
  AuthoringModal,
  FormField,
  ModalActions,
  MutationError,
  TimeInput,
  useDiscardGuard,
  useFieldId,
} from './AuthoringModal';

/* ── Create / edit form ───────────────────────────────────────── */

export function ChapterFormModal({
  lecture,
  existing,
  onClose,
}: {
  /** Parent lecture — needed for the duration-bound pre-check. */
  lecture: Lecture;
  existing?: LectureChapter;
  onClose: () => void;
}) {
  const lectureId = lecture.id;
  const create = useCreateChapter(lectureId);
  const update = useUpdateChapter();
  const isEdit = Boolean(existing);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const form = useForm<ChapterFormValues>({
    resolver: zodResolver(chapterFormSchema),
    defaultValues: {
      title: existing?.title ?? '',
      start: existing ? formatSec(existing.startSec) : '',
      end: existing ? formatSec(existing.endSec) : '',
    },
  });

  const titleId = useFieldId('ch-title');
  const startId = useFieldId('ch-start');
  const endId = useFieldId('ch-end');

  // Unsaved-edits guard: Esc / X / cancel / overlay-click route through a
  // blocking discard-confirm instead of silently dropping the draft.
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: form.formState.isDirty,
    pending,
    onClose,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const startSec = parseTimeToSec(values.start)!;
    const endSec = parseTimeToSec(values.end)!;

    // The server rejects out-of-duration windows with an Arabic 400 —
    // pre-check here so the teacher never has to round-trip for it.
    if (lecture.durationSec > 0) {
      if (!withinDuration(startSec, lecture.durationSec) || !withinDuration(endSec, lecture.durationSec)) {
        form.setError('end', {
          message: `حدود الفصل خارج مدة المحاضرة (${formatSec(lecture.durationSec)})`,
        });
        return;
      }
    }

    try {
      if (existing) {
        const patch: { chapterId: string; title?: string; startSec?: number; endSec?: number } = {
          chapterId: existing.id,
        };
        if (values.title.trim() !== existing.title) patch.title = values.title.trim();
        if (startSec !== existing.startSec) patch.startSec = startSec;
        if (endSec !== existing.endSec) patch.endSec = endSec;
        await update.mutateAsync(patch);
      } else {
        await create.mutateAsync({
          title: values.title.trim(),
          startSec,
          endSec,
        });
      }
      onClose();
    } catch {
      /* surfaced inline below */
    }
  });

  const err = form.formState.errors;

  return (
    <AuthoringModal
      title={isEdit ? 'تعديل الفصل' : 'فصل جديد'}
      onClose={requestClose}
      closeOnOverlayClick={!pending}
      closeOnEscape={!escapeLocked}
    >
      <form onSubmit={onSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <FormField label="عنوان الفصل" htmlFor={titleId} error={err.title?.message}>
            <input id={titleId} type="text" className="auth-input" {...form.register('title')} />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <FormField label="البداية" htmlFor={startId} error={err.start?.message} hint="مثل 05:20">
              <TimeInput
                id={startId}
                ariaLabel="بداية الفصل"
                value={form.watch('start')}
                onChange={(v) => form.setValue('start', v, { shouldValidate: form.formState.isSubmitted })}
                onBlur={() => form.trigger('start')}
              />
            </FormField>
            <FormField label="النهاية" htmlFor={endId} error={err.end?.message} hint="مثل 18:40">
              <TimeInput
                id={endId}
                ariaLabel="نهاية الفصل"
                value={form.watch('end')}
                onChange={(v) => form.setValue('end', v, { shouldValidate: form.formState.isSubmitted })}
                onBlur={() => form.trigger('end')}
              />
            </FormField>
          </div>

          {lecture.durationSec > 0 && (
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              مدة المحاضرة: <span dir="ltr" className="font-mono">{formatSec(lecture.durationSec)}</span> — يجب أن يقع الفصل داخلها.
            </p>
          )}

          <MutationError error={error} fallback="تعذَّر حفظ الفصل — تحقّق من البيانات وحاول مرة أخرى." />

          <ModalActions
            pending={pending}
            submitLabel={isEdit ? 'حفظ التعديلات' : 'إضافة الفصل'}
            onCancel={requestClose}
          />
        </div>
      </form>
      {guard}
    </AuthoringModal>
  );
}

/* ── List rows ─────────────────────────────────────────────────── */

export function ChapterList({
  lecture,
  chapters,
}: {
  lecture: Lecture;
  chapters: LectureChapter[];
}) {
  const del = useDeleteChapter();
  const update = useUpdateChapter();
  const [editing, setEditing] = useState<LectureChapter | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<LectureChapter | null>(null);

  // The API sorts by ordinal, but re-sort locally so the list stays
  // honest right after invalidation streaks (the panel's lecture-list
  // pattern — no local ordering fiction).
  const sorted = useMemo(
    () => [...chapters].sort((a, b) => a.ordinal - b.ordinal),
    [chapters],
  );

  /* 5-D3 (5-B6 hand-off #2): chapter reorder — the same neighbor-swap
   * through PATCH /chapters/:id the lectures use (ordinal joined the
   * update schema in wave 26). movingId locks every move button so two
   * swaps can never interleave their two-PATCH sequence. */
  const [movingId, setMovingId] = useState<string | null>(null);
  const move = async (chapter: LectureChapter, dir: -1 | 1) => {
    const index = sorted.findIndex((c) => c.id === chapter.id);
    const neighbor = sorted[index + dir];
    if (!neighbor) return;
    setMovingId(chapter.id);
    try {
      await update.mutateAsync({ chapterId: chapter.id, ordinal: neighbor.ordinal });
      await update.mutateAsync({ chapterId: neighbor.id, ordinal: chapter.ordinal });
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'تعذَّر تحديث ترتيب الفصول — حاول مرة أخرى.'),
        { title: 'تعذّر إعادة الترتيب' },
      );
    } finally {
      setMovingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
    } catch (error) {
      // Close the dialog on failure so the error is never trapped behind
      // the overlay — the toast (z-index above the modal) reports it and
      // the inline list banner below persists the context (audit 11-f P1-2).
      toast.error(apiErrorMessage(error, 'تعذَّر حذف الفصل — حاول مرة أخرى.'), {
        title: 'تعذّر حذف الفصل',
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {sorted.length === 0 && (
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          لا توجد فصول محددة بعد — أضِف فصولاً لمساعدة الطلاب على التنقل داخل المحاضرة.
        </p>
      )}
      {sorted.map((chapter, index) => {
        const moveLocked = movingId !== null;
        return (
        <div
          key={chapter.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            padding: 'var(--sp-2) var(--sp-3)',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--rule)',
          }}
        >
          {/* 5-D3 (5-B6 hand-off #2): up/down swap with the neighbor —
              the lecture pattern's mechanics (aria-labels, end-disable,
              mid-swap lock) on a horizontal pair: chapter rows are
              single-line compact rows, a vertical chevron stack would
              double their height. */}
          <div className="ch-move" role="group" aria-label={`ترتيب ${chapter.title}`}>
            <button
              type="button"
              className="btn ghost sm ch-move-btn"
              onClick={() => void move(chapter, -1)}
              disabled={index === 0 || moveLocked}
              aria-label={`انقل ${chapter.title} لأعلى القائمة`}
              title="انقل لأعلى"
            >
              <Icon icon={ChevronUp} size={12} />
            </button>
            <button
              type="button"
              className="btn ghost sm ch-move-btn"
              onClick={() => void move(chapter, 1)}
              disabled={index === sorted.length - 1 || moveLocked}
              aria-label={`انقل ${chapter.title} لأسفل القائمة`}
              title="انقل لأسفل"
            >
              <Icon icon={ChevronDown} size={12} />
            </button>
          </div>
          <span dir="ltr" className="font-mono text-xs" style={{ color: 'var(--text-secondary, var(--text))', whiteSpace: 'nowrap' }}>
            {formatSec(chapter.startSec)} – {formatSec(chapter.endSec)}
          </span>
          <span className="text-sm" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chapter.title}
          </span>
          {chapter.concept && <Badge>{chapter.concept.name}</Badge>}
          <button type="button" className="btn ghost sm" onClick={() => setEditing(chapter)} aria-label={`تعديل ${chapter.title}`}>
            <Icon icon={Pencil} size={12} />
          </button>
          <button
            type="button"
            className="btn ghost sm"
            style={{ color: 'var(--danger)' }}
            onClick={() => setDeleting(chapter)}
            aria-label={`حذف ${chapter.title}`}
          >
            <Icon icon={Trash2} size={12} />
          </button>
        </div>
        );
      })}

      <div>
        <button type="button" className="btn ghost sm" onClick={() => setAdding(true)}>
          <Icon icon={Plus} size={12} /> إضافة فصل
        </button>
      </div>

      {deleting && (
        <ConfirmDialog
          open
          title="حذف الفصل"
          message={`سيتم حذف الفصل "${deleting.title}" نهائياً.`}
          confirmLabel="حذف"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {del.isError && (
        <div className="auth-error" role="alert">
          {apiErrorMessage(del.error, 'تعذَّر حذف الفصل — حاول مرة أخرى.')}
        </div>
      )}

      {adding && <ChapterFormModal lecture={lecture} onClose={() => setAdding(false)} />}
      {editing && <ChapterFormModal lecture={lecture} existing={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
