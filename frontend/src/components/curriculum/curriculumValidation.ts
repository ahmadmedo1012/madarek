import { z } from 'zod';

/**
 * Client-side contract for the curriculum authoring API
 * (backend/src/http/routes/curriculum.routes.ts — zod strict).
 *
 * Pure functions + zod schemas with Arabic messages, shared by the
 * authoring forms (zodResolver) and the unit tests. No React here.
 *
 * Time UX: the API speaks whole seconds; teachers type "12:30" or "750".
 */
import type { Lecture, LecturePatchInput, LectureWriteInput } from '../../hooks/useResources';

/** Media URL rule mirrors CURRICULUM_MEDIA_URL_PATTERN on the server. */
export const LECTURE_MEDIA_URL_PATTERN = /^https:\/\/|^\/api\/v1\/files\/papers\//;

/** Upper bound for durationSec / startSec / endSec / triggerSec: one day. */
export const MAX_MEDIA_SEC = 86_400;

/** Lecture ordinal bounds (chapters/checkpoints get auto ordinals). */
export const MAX_ORDINAL = 500;

/** Checkpoint options bounds — model + zod .min(2).max(6). */
export const MIN_CHECKPOINT_OPTIONS = 2;
export const MAX_CHECKPOINT_OPTIONS = 6;

/** m:ss under an hour, h:mm:ss above — 615 → "10:15", 3661 → "1:01:01". */
export function formatSec(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/**
 * Teacher time input → whole seconds. Accepts plain seconds ("90"),
 * m:ss ("1:30") and h:mm:ss ("1:02:03"); lenient about zero padding
 * and about parts ≥ 60 ("1:99" = 159s — still a valid instant).
 * Returns null for anything that isn't a non-negative, well-formed time.
 */
export function parseTimeToSec(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  if (/^\d{1,9}$/.test(text)) return Number(text);
  const parts = text.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  if (!parts.every((p) => /^\d{1,7}$/.test(p))) return null;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + Number(p);
  return Number.isSafeInteger(sec) ? sec : null;
}

/** Mirror of the server's withinLectureDuration: durationSec ≤ 0 = unbounded. */
export function withinDuration(sec: number, durationSec: number): boolean {
  return durationSec <= 0 || sec <= durationSec;
}

const TIME_SYNTAX_MSG = 'أدخل الوقت بصيغة دقائق:ثوانٍ مثل 12:30 أو بالثواني مثل 750';
const TIME_RANGE_MSG = 'الوقت يتجاوز الحد الأقصى (24 ساعة)';

/** Required time field (checkpoint trigger, chapter start/end). */
const timeString = z
  .string()
  .trim()
  .min(1, 'الوقت مطلوب')
  .refine((s) => parseTimeToSec(s) !== null, TIME_SYNTAX_MSG)
  .refine((s) => (parseTimeToSec(s) ?? 0) <= MAX_MEDIA_SEC, TIME_RANGE_MSG);

/** Optional time field — empty string means "غير محدد / لا تغيير". */
const optionalTimeString = z
  .string()
  .trim()
  .refine((s) => s === '' || parseTimeToSec(s) !== null, TIME_SYNTAX_MSG)
  .refine((s) => s === '' || (parseTimeToSec(s) ?? 0) <= MAX_MEDIA_SEC, TIME_RANGE_MSG);

/** Optional ordinal — 0..500, empty = auto-append server-side. */
const optionalOrdinal = z
  .string()
  .trim()
  .refine(
    (s) => s === '' || (/^\d{1,3}$/.test(s) && Number(s) <= MAX_ORDINAL),
    'الترتيب رقم بين 0 و500',
  );

/* ── Lecture form ─────────────────────────────────────────────── */

export const lectureFormSchema = z.object({
  title: z.string().trim().min(1, 'عنوان المحاضرة مطلوب').max(200, 'العنوان طويل — الحد 200 حرف'),
  description: z.string().max(4000, 'الوصف طويل — الحد 4000 حرف'),
  videoUrl: z
    .string()
    .trim()
    .min(1, 'رابط الفيديو مطلوب')
    .max(500, 'الرابط طويل — الحد 500 حرف')
    .refine(
      (s) => LECTURE_MEDIA_URL_PATTERN.test(s),
      'يجب أن يبدأ الرابط بـ https:// أو أن يكون مسار ملف داخل المنصة (/api/v1/files/papers/)',
    ),
  duration: optionalTimeString.refine(
    (s) => s === '' || (parseTimeToSec(s) ?? 0) >= 1,
    'المدة يجب أن تكون ثانية واحدة على الأقل',
  ),
  ordinal: optionalOrdinal,
});
export type LectureFormValues = z.infer<typeof lectureFormSchema>;

/**
 * Lecture form values → create payload (undefined = let the server default).
 * `durationSec` of 0 stays undefined: the model treats 0 as "unset".
 */
export function lectureFormToCreatePayload(values: LectureFormValues): LectureWriteInput {
  return {
    title: values.title.trim(),
    description: values.description.trim() || undefined,
    videoUrl: values.videoUrl.trim(),
    durationSec: values.duration.trim() ? (parseTimeToSec(values.duration) ?? undefined) : undefined,
    ordinal: values.ordinal.trim() ? Number(values.ordinal) : undefined,
  };
}

/**
 * Lecture edit → PATCH body. Only fields that actually changed travel —
 * an omitted field keeps its DB value (the server schema is .partial()).
 * A deliberately cleared description is sent as '' (blank), not omitted.
 */
export function lectureFormToPatchPayload(
  values: LectureFormValues,
  existing: Pick<Lecture, 'id' | 'title' | 'description' | 'videoUrl' | 'durationSec' | 'ordinal'>,
): LecturePatchInput {
  const patch: LecturePatchInput = { lectureId: existing.id };
  if (values.title.trim() !== existing.title) patch.title = values.title.trim();
  if (values.videoUrl.trim() !== existing.videoUrl) patch.videoUrl = values.videoUrl.trim();
  if (values.description.trim() !== (existing.description ?? '')) {
    patch.description = values.description.trim();
  }
  const durationSec = values.duration.trim() ? parseTimeToSec(values.duration) : null;
  if (durationSec !== null && durationSec !== existing.durationSec) {
    patch.durationSec = durationSec;
  }
  if (values.ordinal.trim() && Number(values.ordinal) !== existing.ordinal) {
    patch.ordinal = Number(values.ordinal);
  }
  return patch;
}

/* ── Chapter form ─────────────────────────────────────────────── */

export const chapterFormSchema = z
  .object({
    title: z.string().trim().min(1, 'عنوان الفصل مطلوب').max(200, 'العنوان طويل — الحد 200 حرف'),
    start: timeString,
    end: timeString,
  })
  .refine(
    (v) => (parseTimeToSec(v.end) ?? -1) > (parseTimeToSec(v.start) ?? -2),
    { message: 'نهاية الفصل يجب أن تكون بعد بدايته', path: ['end'] },
  );
export type ChapterFormValues = z.infer<typeof chapterFormSchema>;

/* ── Checkpoint form ──────────────────────────────────────────── */

/**
 * correctIndex = -1 means "بدون تغيير" in edit mode: the read API never
 * exposes the correct answer (it is hidden from the wire), so the edit
 * form starts with no radio selected and only sends correctIndex when
 * the teacher actively picks one.
 */
export const CORRECT_INDEX_UNCHANGED = -1;

export const checkpointFormSchema = z
  .object({
    question: z.string().trim().min(1, 'نص السؤال مطلوب').max(1000, 'السؤال طويل — الحد 1000 حرف'),
    trigger: timeString,
    /** Object rows ({value}) — react-hook-form useFieldArray works with
     *  arrays of objects; the API payload is flattened on submit. */
    options: z
      .array(
        z.object({
          value: z.string().trim().min(1, 'نص الخيار مطلوب').max(300, 'الخيار طويل — الحد 300 حرف'),
        }),
      )
      .min(MIN_CHECKPOINT_OPTIONS, 'خياران على الأقل')
      .max(MAX_CHECKPOINT_OPTIONS, 'ستة خيارات كحد أقصى'),
    correctIndex: z
      .number()
      .int()
      .min(CORRECT_INDEX_UNCHANGED)
      .max(MAX_CHECKPOINT_OPTIONS - 1),
  })
  .refine(
    (v) => v.correctIndex === CORRECT_INDEX_UNCHANGED || v.correctIndex < v.options.length,
    { message: 'الإجابة الصحيحة يجب أن تكون أحد الخيارات المعروضة', path: ['correctIndex'] },
  );
export type CheckpointFormValues = z.infer<typeof checkpointFormSchema>;

/**
 * New correctIndex after the option at `removedIndex` is deleted:
 *   - removed BEFORE the marked answer → shift the mark down so it keeps
 *     pointing at the same option,
 *   - removed IS the marked answer → reset to CORRECT_INDEX_UNCHANGED:
 *     nothing stays marked and submit gates force a conscious re-pick
 *     (create mode via the «حدِّد الإجابة الصحيحة» guard; edit mode via
 *     the server re-validating the saved answer against the new options),
 *   - removed AFTER the marked answer → the mark stays put.
 * Pure so the shift/reset rule is unit-testable (audit 11-f P1-7: the
 * old behavior silently re-pointed the answer at whatever option shifted
 * into the deleted slot and persisted the wrong correctIndex).
 */
export function adjustCorrectIndexOnRemove(correctIndex: number, removedIndex: number): number {
  if (correctIndex === CORRECT_INDEX_UNCHANGED) return CORRECT_INDEX_UNCHANGED;
  if (removedIndex === correctIndex) return CORRECT_INDEX_UNCHANGED;
  if (removedIndex < correctIndex) return correctIndex - 1;
  return correctIndex;
}

/** Form options rows → the flat string[] the API expects. */
export function checkpointFormOptions(values: CheckpointFormValues): string[] {
  return values.options.map((o) => o.value.trim());
}
