/**
 * Lecture authoring — the "المحاضرات" list of the إدارة المنهج panel.
 *
 * - LectureFormModal: create (POST /offerings/:offeringId/lectures) and
 *   edit (PATCH /lectures/:id — only changed fields travel).
 * - LectureAuthoringList: rows ordered by ordinal with duration,
 *   video link, chapter/checkpoint counts, edit (Modal) and delete
 *   (ConfirmDialog — the 409 "سجل مشاهدات" case surfaces inline).
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, ExternalLink, ListVideo, Pencil, Trash2, CircleHelp } from 'lucide-react';
import { ConfirmDialog } from '../owner/ConfirmDialog';
import { Icon } from '../Icon';
import { Badge } from '../primitives';
import { toast } from '../../lib/toast';
import {
  apiErrorMessage,
  useCreateLecture,
  useDeleteLecture,
  useUpdateLecture,
  type Lecture,
} from '../../hooks/useResources';
import {
  formatSec,
  lectureFormSchema,
  lectureFormToCreatePayload,
  lectureFormToPatchPayload,
  type LectureFormValues,
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

export function LectureFormModal({
  offeringId,
  existing,
  onClose,
}: {
  offeringId: string;
  existing?: Lecture;
  onClose: () => void;
}) {
  const create = useCreateLecture(offeringId);
  const update = useUpdateLecture();
  const isEdit = Boolean(existing);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const form = useForm<LectureFormValues>({
    resolver: zodResolver(lectureFormSchema),
    defaultValues: {
      title: existing?.title ?? '',
      description: existing?.description ?? '',
      videoUrl: existing?.videoUrl ?? '',
      duration: existing && existing.durationSec > 0 ? formatSec(existing.durationSec) : '',
      ordinal: isEdit ? String(existing!.ordinal) : '',
    },
  });

  const titleId = useFieldId('lec-title');
  const descId = useFieldId('lec-desc');
  const urlId = useFieldId('lec-url');
  const durId = useFieldId('lec-dur');
  const ordId = useFieldId('lec-ord');

  // Unsaved-edits guard: Esc / X / cancel / overlay-click route through a
  // blocking discard-confirm instead of silently dropping the draft.
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: form.formState.isDirty,
    pending,
    onClose,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (existing) {
        await update.mutateAsync(lectureFormToPatchPayload(values, existing));
      } else {
        await create.mutateAsync(lectureFormToCreatePayload(values));
      }
      onClose();
    } catch {
      /* surfaced inline below */
    }
  });

  const err = form.formState.errors;

  return (
    <AuthoringModal
      title={isEdit ? 'تعديل المحاضرة' : 'محاضرة جديدة'}
      onClose={requestClose}
      closeOnOverlayClick={!pending}
      closeOnEscape={!escapeLocked}
    >
      <form onSubmit={onSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <FormField label="عنوان المحاضرة" htmlFor={titleId} error={err.title?.message}>
            <input id={titleId} type="text" className="auth-input" {...form.register('title')} />
          </FormField>

          <FormField label="رابط الفيديو" htmlFor={urlId} error={err.videoUrl?.message}
            hint="رابط خارجي يبدأ بـ https:// أو مسار ملف داخل المنصة (/api/v1/files/papers/)">
            <input id={urlId} type="text" dir="ltr" className="auth-input" placeholder="https://…" {...form.register('videoUrl')} />
          </FormField>

          <FormField label="الوصف (اختياري)" htmlFor={descId} error={err.description?.message}>
            <textarea id={descId} rows={3} className="auth-input" style={{ blockSize: 'auto', paddingInlineStart: 'var(--sp-4)', resize: 'vertical' }} {...form.register('description')} />
          </FormField>

          <div className="auth-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
            <FormField label="المدة (اختياري)" htmlFor={durId} error={err.duration?.message} hint="بصيغة دقائق:ثوانٍ مثل 45:00">
              <TimeInput
                id={durId}
                ariaLabel="مدة المحاضرة"
                value={form.watch('duration')}
                onChange={(v) => form.setValue('duration', v, { shouldValidate: form.formState.isSubmitted })}
                onBlur={() => form.trigger('duration')}
              />
            </FormField>
            <FormField label="الترتيب (اختياري)" htmlFor={ordId} error={err.ordinal?.message} hint="اتركه فارغاً للإضافة في نهاية القائمة">
              <input id={ordId} type="text" dir="ltr" inputMode="numeric" className="auth-input" placeholder="0 – 500" {...form.register('ordinal')} />
            </FormField>
          </div>

          <MutationError error={error} fallback="تعذَّر حفظ المحاضرة — تحقّق من البيانات وحاول مرة أخرى." />

          <ModalActions
            pending={pending}
            submitLabel={isEdit ? 'حفظ التعديلات' : 'إضافة المحاضرة'}
            onCancel={requestClose}
          />
        </div>
      </form>
      {guard}
    </AuthoringModal>
  );
}

/* ── List rows (selection + edit + delete) ─────────────────────── */

export function LectureAuthoringList({
  lectures,
  selectedId,
  onSelect,
  onEdit,
}: {
  /** Already sorted by ordinal by the parent. */
  lectures: Lecture[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (lecture: Lecture) => void;
}) {
  const del = useDeleteLecture();
  const [deleting, setDeleting] = useState<Lecture | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
    } catch (error) {
      // Close the dialog on failure so the 409 message is never trapped
      // behind the overlay — the toast (z-index above the modal) reports
      // it and the inline list banner below persists the context
      // (audit 11-f P1-2).
      toast.error(
        apiErrorMessage(error, 'تعذَّر حذف المحاضرة — تحقّق من اتصالك وحاول مرة أخرى.'),
        { title: 'تعذّر حذف المحاضرة' },
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex-col gap-2">
      {lectures.map((lecture) => {
        const selected = lecture.id === selectedId;
        return (
          <div
            key={lecture.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-2)',
              padding: 'var(--sp-3)',
              borderRadius: 'var(--r-md)',
              border: `1px solid ${selected ? 'var(--accent)' : 'var(--rule)'}`,
              background: selected ? 'var(--surface-2)' : 'transparent',
            }}
          >
            <button
              type="button"
              onClick={() => onSelect(lecture.id)}
              aria-pressed={selected}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-3)',
                textAlign: 'start',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              <Badge color={selected ? 'brand' : undefined}>{lecture.ordinal}</Badge>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="text-sm" style={{ display: 'block', fontWeight: 'var(--fw-semibold, 600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {lecture.title}
                </span>
                <span className="text-xs text-muted" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginTop: 2 }}>
                  <span><Icon icon={Clock} size={11} /> {lecture.durationSec > 0 ? formatSec(lecture.durationSec) : 'مدة غير محددة'}</span>
                  <span><Icon icon={ListVideo} size={11} /> {lecture._count?.chapters ?? 0} فصل</span>
                  <span><Icon icon={CircleHelp} size={11} /> {lecture._count?.checkpoints ?? 0} سؤال</span>
                </span>
              </span>
            </button>
            <a
              href={lecture.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="btn ghost sm"
              aria-label={`فتح فيديو ${lecture.title}`}
              title="فتح الفيديو"
            >
              <Icon icon={ExternalLink} size={12} />
            </a>
            <button type="button" className="btn ghost sm" onClick={() => onEdit(lecture)}>
              <Icon icon={Pencil} size={12} /> تعديل
            </button>
            <button
              type="button"
              className="btn ghost sm"
              style={{ color: 'var(--danger)' }}
              onClick={() => setDeleting(lecture)}
              aria-label={`حذف ${lecture.title}`}
            >
              <Icon icon={Trash2} size={12} />
            </button>
          </div>
        );
      })}

      {deleting && (
        <ConfirmDialog
          open
          title="حذف المحاضرة"
          message={`سيتم حذف "${deleting.title}" مع كل فصولها وأسئلتها التفاعلية نهائياً. لا يمكن التراجع عن هذا الإجراء.`}
          confirmLabel="حذف نهائي"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {del.isError && (
        <div className="auth-error" role="alert">
          {apiErrorMessage(
            del.error,
            'تعذَّر حذف المحاضرة — تحقّق من اتصالك وحاول مرة أخرى.',
          )}
        </div>
      )}
    </div>
  );
}
