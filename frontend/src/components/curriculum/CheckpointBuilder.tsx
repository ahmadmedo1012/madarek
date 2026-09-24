/**
 * Checkpoint builder — the "أسئلة التفاعل" section of the إدارة المنهج panel.
 *
 * - CheckpointFormModal: create (POST /lectures/:lectureId/checkpoints) and
 *   edit (PATCH /checkpoints/:id). The API field is `question` (NOT
 *   `prompt`) and `triggerSec` is REQUIRED. Options are 2..6 strings;
 *   correctIndex is picked via a radio per option. On EDIT the current
 *   correct answer is hidden from the wire (learning.routes.ts never
 *   exposes correctIndex on reads), so the radios start unselected and
 *   correctIndex is only sent when the teacher actively (re)picks one.
 * - CheckpointList: rows with the trigger time, question and options
 *   count, edit (Modal) and delete (ConfirmDialog).
 *
 * conceptId is intentionally NOT offered in the UI: there is no
 * teacher-facing per-course concepts read endpoint (only the student
 * matrix + admin counts), so a select would have nothing truthful to
 * list. See T5-F7 follow-ups.
 */
import { useState } from 'react';
import { useFieldArray, useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleHelp, Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../owner/ConfirmDialog';
import { Icon } from '../Icon';
import { Badge } from '../primitives';
import {
  apiErrorMessage,
  useCreateCheckpoint,
  useDeleteCheckpoint,
  useUpdateCheckpoint,
  type Lecture,
  type LectureCheckpoint,
} from '../../hooks/useResources';
import {
  CORRECT_INDEX_UNCHANGED,
  checkpointFormOptions,
  checkpointFormSchema,
  formatSec,
  parseTimeToSec,
  withinDuration,
  MAX_CHECKPOINT_OPTIONS,
  MIN_CHECKPOINT_OPTIONS,
  type CheckpointFormValues,
} from './curriculumValidation';
import {
  AuthoringModal,
  FormField,
  ModalActions,
  MutationError,
  TimeInput,
  useFieldId,
} from './AuthoringModal';

/* ── Create / edit form ───────────────────────────────────────── */

/** Per-option error text (zod issue path ["options", i, "value"]). */
function optionErrorAt(errors: FieldErrors<CheckpointFormValues>, index: number): string | undefined {
  const e = errors.options as unknown;
  if (Array.isArray(e)) {
    const item = (e as Array<{ value?: { message?: string } }>)[index];
    return item?.value?.message;
  }
  return undefined;
}

/** Array-level error text (min 2 / max 6) — RHF keeps it on options.root. */
function optionsRootError(errors: FieldErrors<CheckpointFormValues>): string | undefined {
  const e = errors.options as unknown;
  if (e && !Array.isArray(e)) {
    const obj = e as { message?: string; root?: { message?: string } };
    return obj.message ?? obj.root?.message;
  }
  return undefined;
}

export function CheckpointFormModal({
  lecture,
  existing,
  onClose,
}: {
  /** Parent lecture — needed for the duration-bound pre-check. */
  lecture: Lecture;
  existing?: LectureCheckpoint;
  onClose: () => void;
}) {
  const lectureId = lecture.id;
  const create = useCreateCheckpoint(lectureId);
  const update = useUpdateCheckpoint();
  const isEdit = Boolean(existing);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;

  const form = useForm<CheckpointFormValues>({
    resolver: zodResolver(checkpointFormSchema),
    defaultValues: {
      question: existing?.question ?? '',
      trigger: existing ? formatSec(existing.triggerSec) : '',
      options: existing?.options?.length
        ? existing.options.map((o) => ({ value: o }))
        : [{ value: '' }, { value: '' }],
      // Edit mode: the real correctIndex is never sent to the client —
      // start "unchanged" and only send what the teacher actively picks.
      correctIndex: isEdit ? CORRECT_INDEX_UNCHANGED : 0,
    },
  });
  const options = useFieldArray({ control: form.control, name: 'options' });

  const questionId = useFieldId('cp-question');
  const triggerId = useFieldId('cp-trigger');
  const optionsLabelId = useFieldId('cp-options');

  const onSubmit = form.handleSubmit(async (values) => {
    const triggerSec = parseTimeToSec(values.trigger)!;
    const flatOptions = checkpointFormOptions(values);

    if (lecture.durationSec > 0 && !withinDuration(triggerSec, lecture.durationSec)) {
      form.setError('trigger', {
        message: `موضع السؤال خارج مدة المحاضرة (${formatSec(lecture.durationSec)})`,
      });
      return;
    }
    if (!isEdit && values.correctIndex === CORRECT_INDEX_UNCHANGED) {
      form.setError('correctIndex', { message: 'حدِّد الإجابة الصحيحة قبل الحفظ' });
      return;
    }

    try {
      if (existing) {
        const optionsChanged =
          flatOptions.length !== existing.options.length ||
          flatOptions.some((o, i) => o !== existing.options[i]);
        const patch: {
          checkpointId: string;
          question?: string;
          triggerSec?: number;
          options?: string[];
          correctIndex?: number;
        } = { checkpointId: existing.id };
        if (values.question.trim() !== existing.question) patch.question = values.question.trim();
        if (triggerSec !== existing.triggerSec) patch.triggerSec = triggerSec;
        if (optionsChanged) patch.options = flatOptions;
        // Only send the answer when actively picked — otherwise the server
        // keeps the existing one (and re-validates it against new options).
        if (values.correctIndex !== CORRECT_INDEX_UNCHANGED) patch.correctIndex = values.correctIndex;
        await update.mutateAsync(patch);
      } else {
        await create.mutateAsync({
          question: values.question.trim(),
          triggerSec,
          options: flatOptions,
          correctIndex: values.correctIndex,
        });
      }
      onClose();
    } catch {
      /* surfaced inline below */
    }
  });

  const err = form.formState.errors;
  const correctIndex = form.watch('correctIndex');

  return (
    <AuthoringModal
      title={isEdit ? 'تعديل سؤال التفاعل' : 'سؤال تفاعلي جديد'}
      onClose={onClose}
      closeOnOverlayClick={!pending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <FormField label="نص السؤال" htmlFor={questionId} error={err.question?.message}>
            <textarea
              id={questionId}
              rows={3}
              className="auth-input"
              style={{ blockSize: 'auto', paddingInlineStart: 'var(--sp-4)', resize: 'vertical' }}
              placeholder="سؤال يظهر للطالب عند نقطة زمنية داخل المحاضرة"
              {...form.register('question')}
            />
          </FormField>

          <FormField
            label="موضع السؤال (يظهر عند هذه اللحظة)"
            htmlFor={triggerId}
            error={err.trigger?.message}
            hint="بصيغة دقائق:ثوانٍ مثل 08:30"
          >
            <TimeInput
              id={triggerId}
              ariaLabel="موضع السؤال"
              value={form.watch('trigger')}
              onChange={(v) => form.setValue('trigger', v, { shouldValidate: form.formState.isSubmitted })}
              onBlur={() => form.trigger('trigger')}
            />
          </FormField>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label id={optionsLabelId} className="text-sm" style={{ fontWeight: 'var(--fw-semibold, 600)' }}>
              الخيارات ({options.fields.length}/{MAX_CHECKPOINT_OPTIONS})
            </label>
            <div role="group" aria-labelledby={optionsLabelId} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {options.fields.map((field, index) => {
                const optionError = optionErrorAt(err, index);
                return (
                  <div key={field.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 14,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      className="text-xs"
                    >
                      <input
                        type="radio"
                        name="correct-option"
                        checked={correctIndex === index}
                        onChange={() => form.setValue('correctIndex', index, { shouldValidate: true })}
                        aria-label={`تعيين الخيار ${index + 1} إجابةً صحيحة`}
                      />
                      صحيحة
                    </label>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        className="auth-input"
                        aria-label={`نص الخيار ${index + 1}`}
                        placeholder={`الخيار ${index + 1}`}
                        style={optionError ? { borderColor: 'var(--danger)' } : undefined}
                        {...form.register(`options.${index}.value` as const)}
                      />
                      {optionError && (
                        <span className="auth-field-error" role="alert" style={{ display: 'block', marginTop: 4 }}>
                          {optionError}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ marginTop: 12, color: 'var(--danger)' }}
                      disabled={options.fields.length <= MIN_CHECKPOINT_OPTIONS}
                      onClick={() => options.remove(index)}
                      aria-label={`إزالة الخيار ${index + 1}`}
                      title={options.fields.length <= MIN_CHECKPOINT_OPTIONS ? 'خياران على الأقل' : undefined}
                    >
                      <Icon icon={Trash2} size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
            {(optionsRootError(err) || err.correctIndex?.message) && (
              <span className="auth-field-error" role="alert">
                {err.correctIndex?.message ?? optionsRootError(err)}
              </span>
            )}
            <div>
              <button
                type="button"
                className="btn ghost sm"
                disabled={options.fields.length >= MAX_CHECKPOINT_OPTIONS}
                onClick={() => options.append({ value: '' })}
              >
                <Icon icon={Plus} size={12} /> إضافة خيار
              </button>
            </div>
            {isEdit && (
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                الإجابة الصحيحة الحالية محفوظة ولا تظهر هنا — اختر خياراً فقط إن أردت تغييرها،
                وأعِد تحديدها إذا عدّلت قائمة الخيارات.
              </p>
            )}
          </div>

          <MutationError error={error} fallback="تعذَّر حفظ السؤال التفاعلي — تحقّق من البيانات وحاول مرة أخرى." />

          <ModalActions
            pending={pending}
            submitLabel={isEdit ? 'حفظ التعديلات' : 'إضافة السؤال'}
            onCancel={onClose}
          />
        </div>
      </form>
    </AuthoringModal>
  );
}

/* ── List rows ─────────────────────────────────────────────────── */

export function CheckpointList({
  lecture,
  checkpoints,
}: {
  lecture: Lecture;
  checkpoints: LectureCheckpoint[];
}) {
  const del = useDeleteCheckpoint();
  const [editing, setEditing] = useState<LectureCheckpoint | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<LectureCheckpoint | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      setDeleting(null);
    } catch {
      /* inline below */
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {checkpoints.length === 0 && (
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          لا توجد أسئلة تفاعلية بعد — أضِف سؤالاً يقيس فهم الطالب أثناء المشاهدة.
        </p>
      )}
      {checkpoints.map((checkpoint) => (
        <div
          key={checkpoint.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            padding: 'var(--sp-2) var(--sp-3)',
            borderRadius: 'var(--r-md)',
            border: '1px solid var(--rule)',
          }}
        >
          <Badge color="purple">
            <span dir="ltr" className="font-mono">{formatSec(checkpoint.triggerSec)}</span>
          </Badge>
          <span className="text-sm" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {checkpoint.question}
          </span>
          <span className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>
            <Icon icon={CircleHelp} size={11} /> {checkpoint.options?.length ?? 0} خيارات
          </span>
          <button type="button" className="btn ghost sm" onClick={() => setEditing(checkpoint)} aria-label={`تعديل السؤال عند ${formatSec(checkpoint.triggerSec)}`}>
            <Icon icon={Pencil} size={12} />
          </button>
          <button
            type="button"
            className="btn ghost sm"
            style={{ color: 'var(--danger)' }}
            onClick={() => setDeleting(checkpoint)}
            aria-label={`حذف السؤال عند ${formatSec(checkpoint.triggerSec)}`}
          >
            <Icon icon={Trash2} size={12} />
          </button>
        </div>
      ))}

      <div>
        <button type="button" className="btn ghost sm" onClick={() => setAdding(true)}>
          <Icon icon={Plus} size={12} /> إضافة سؤال تفاعلي
        </button>
      </div>

      {deleting && (
        <ConfirmDialog
          open
          title="حذف السؤال التفاعلي"
          message={`سيتم حذف السؤال "${deleting.question}" نهائياً.`}
          confirmLabel="حذف"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {del.isError && (
        <div className="auth-error" role="alert">
          {apiErrorMessage(del.error, 'تعذَّر حذف السؤال — حاول مرة أخرى.')}
        </div>
      )}

      {adding && <CheckpointFormModal lecture={lecture} onClose={() => setAdding(false)} />}
      {editing && <CheckpointFormModal lecture={lecture} existing={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
