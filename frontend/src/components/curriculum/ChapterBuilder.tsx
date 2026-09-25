/**
 * Chapter builder — the "فصول المحاضرة" section of the إدارة المنهج panel.
 *
 * - ChapterFormModal: create (POST /lectures/:lectureId/chapters) and edit
 *   (PATCH /chapters/:id — only changed fields travel; the merged
 *   start/end window is re-validated client-side AND server-side).
 * - ChapterList: rows with start–end as m:ss (font-mono, LTR), concept
 *   name when linked, edit (Modal) and delete (ConfirmDialog).
 *
 * Chapter ordinals are auto-assigned by the API (max+1) — never edited here.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
  const [editing, setEditing] = useState<LectureChapter | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<LectureChapter | null>(null);

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
      {chapters.length === 0 && (
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          لا توجد فصول محددة بعد — أضِف فصولاً لمساعدة الطلاب على التنقل داخل المحاضرة.
        </p>
      )}
      {chapters.map((chapter) => (
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
      ))}

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
