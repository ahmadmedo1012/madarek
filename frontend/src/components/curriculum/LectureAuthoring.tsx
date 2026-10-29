/**
 * Lecture authoring — the "المحاضرات" list of the إدارة المنهج panel.
 *
 * - LectureFormModal: create (POST /offerings/:offeringId/lectures) and
 *   edit (PATCH /lectures/:id — only changed fields travel).
 * - LectureAuthoringList: rows ordered by ordinal with duration,
 *   video link, chapter/checkpoint counts, reorder (5-B6: up/down
 *   ordinal swap via two PATCHes), edit (Modal) and delete
 *   (ConfirmDialog — the 409 "سجل مشاهدات" case surfaces inline).
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Clock, ExternalLink, ListVideo, Pencil, Trash2, CircleHelp } from 'lucide-react';
import { ConfirmDialog } from '../owner/ConfirmDialog';
import { Icon } from '../Icon';
import { Badge } from '../primitives';
import { toast } from '../../lib/toast';
import { countAr } from '../../lib/format';
import { VideoUploadField, type VideoSourceMode } from './VideoUploadField';
import {
  apiErrorMessage,
  useCreateLecture,
  useDeleteLecture,
  useReorderLectures,
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

  // r323 B2.1: the video source picker — «رفع ملف» (presigned direct
  // upload) or «رابط» (the original paste field). The uploaded serving
  // path lands in the SAME videoUrl field, so the create/patch payloads
  // and their schema stay untouched.
  const [videoMode, setVideoMode] = useState<VideoSourceMode>(
    existing?.videoUrl && existing.videoUrl.startsWith('/api/v1/files/lectures/') ? 'upload' : 'url',
  );

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
      closeOnEscape={!escapeLocked && !pending}
      pending={pending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="cur-form">
          <FormField label="عنوان المحاضرة" htmlFor={titleId} error={err.title?.message}>
            <input id={titleId} type="text" className="auth-input" {...form.register('title')} />
          </FormField>

          <FormField label="مصدر الفيديو" htmlFor={urlId} error={err.videoUrl?.message}>
            <VideoUploadField
              mode={videoMode}
              onModeChange={setVideoMode}
              value={form.watch('videoUrl')}
              onChange={(v) => form.setValue('videoUrl', v, { shouldValidate: form.formState.isSubmitted })}
              inputId={urlId}
              urlHint="رابط خارجي يبدأ بـ https:// أو مسار ملف داخل المنصة (/api/v1/files/papers/)"
            />
          </FormField>

          <FormField label="الوصف (اختياري)" htmlFor={descId} error={err.description?.message}>
            <textarea id={descId} rows={3} className="auth-input" style={{ blockSize: 'auto', paddingInlineStart: 'var(--sp-4)', resize: 'vertical' }} {...form.register('description')} />
          </FormField>

          {/* cur-grid-2 (teacher-quality.css): the 2-col field grid WITH
           * the ≤480px collapse — the old inline grid-template-columns
           * overrode the shared mobile ladder with no way back. */}
          <div className="cur-grid-2">
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

/* ── List rows (selection + edit + delete + reorder) ─────────── */

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
  const reorder = useReorderLectures();
  const [deleting, setDeleting] = useState<Lecture | null>(null);
  /* 5-B6 (A7 P2-3): the id mid-reorder — locks every move button so
   * two moves can never interleave. */
  const [movingId, setMovingId] = useState<string | null>(null);

  /* r152b (A5 P2): reordering is ONE atomic POST now — the full
   * ordered id list travels together, so a network blip mid-move can
   * never leave two lectures sharing one ordinal (the old two-PATCH
   * swap's partial failure corrupted the order with no deterministic
   * tiebreak). The list re-sorts from the refetched data — no local
   * ordering fiction; a failure surfaces as a toast and the
   * invalidation restores the server truth. The «الترتيب» numeric
   * field in the edit modal stays as the power path. */
  const move = async (lecture: Lecture, dir: -1 | 1) => {
    const index = lectures.findIndex((l) => l.id === lecture.id);
    const neighbor = lectures[index + dir];
    if (!neighbor) return;
    const next = [...lectures];
    next[index] = neighbor;
    next[index + dir] = lecture;
    setMovingId(lecture.id);
    try {
      await reorder.mutateAsync({
        offeringId: lecture.offeringId,
        ids: next.map((l) => l.id),
      });
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'تعذَّر تحديث ترتيب المحاضرات — حاول مرة أخرى.'),
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
      {lectures.map((lecture, index) => {
        const selected = lecture.id === selectedId;
        const moveLocked = movingId !== null;
        return (
          <div
            key={lecture.id}
            className="cur-lec-row"
            data-selected={selected || undefined}
          >
            {/* 5-B6 (A7 P2-3): up/down swap with the neighbor — the
                accessible keyboard alternative to drag reorder. The
                pair sits at the row's inline-start edge (the handle
                position); disabled at the list ends and while a swap
                is in flight. */}
            <div className="lec-move" role="group" aria-label={`ترتيب ${lecture.title}`}>
              <button
                type="button"
                className="btn ghost sm lec-move-btn"
                onClick={() => void move(lecture, -1)}
                disabled={index === 0 || moveLocked}
                aria-label={`انقل ${lecture.title} لأعلى القائمة`}
                title="انقل لأعلى"
              >
                <Icon icon={ChevronUp} size={12} />
              </button>
              <button
                type="button"
                className="btn ghost sm lec-move-btn"
                onClick={() => void move(lecture, 1)}
                disabled={index === lectures.length - 1 || moveLocked}
                aria-label={`انقل ${lecture.title} لأسفل القائمة`}
                title="انقل لأسفل"
              >
                <Icon icon={ChevronDown} size={12} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onSelect(lecture.id)}
              aria-pressed={selected}
              className="cur-lec-select"
            >
              <Badge color={selected ? 'brand' : undefined}>{lecture.ordinal}</Badge>
              <span className="cur-lec-main">
                <span className="text-sm cur-lec-title">
                  {lecture.title}
                </span>
                <span className="text-xs text-muted cur-lec-meta">
                  <span><Icon icon={Clock} size={11} /> {lecture.durationSec > 0 ? formatSec(lecture.durationSec) : 'مدة غير محددة'}</span>
                  {/* 5-B6 (A7 P2-4): counted nouns — «3 فصل» was raw;
                      the zero case names the reality instead of «0 فصل». */}
                  <span><Icon icon={ListVideo} size={11} /> {(lecture._count?.chapters ?? 0) > 0 ? countAr(lecture._count!.chapters, ['فصل واحد', 'فصلان', 'فصول', 'فصلاً']) : 'لا فصول'}</span>
                  <span><Icon icon={CircleHelp} size={11} /> {(lecture._count?.checkpoints ?? 0) > 0 ? countAr(lecture._count!.checkpoints, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً']) : 'لا أسئلة'}</span>
                </span>
              </span>
            </button>
            {/* The trailing action cluster — ≤640px it wraps onto its own
             * line (cur-lec-actions, teacher-quality.css) instead of
             * squeezing the title to an unusable sliver on phones. */}
            <div className="cur-lec-actions">
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
                className="btn ghost sm cur-row-danger"
                onClick={() => setDeleting(lecture)}
                aria-label={`حذف ${lecture.title}`}
              >
                <Icon icon={Trash2} size={12} />
              </button>
            </div>
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
