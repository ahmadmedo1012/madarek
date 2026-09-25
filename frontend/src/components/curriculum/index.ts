/**
 * Curriculum authoring shared components — the "إدارة المنهج" panel
 * used by the teacher offering page (TeacherIntelligencePage).
 */
export { CurriculumAuthoringPanel } from './CurriculumAuthoringPanel';
export { LectureFormModal, LectureAuthoringList } from './LectureAuthoring';
export { ChapterFormModal, ChapterList } from './ChapterBuilder';
export { CheckpointFormModal, CheckpointList } from './CheckpointBuilder';
export {
  formatSec,
  parseTimeToSec,
  withinDuration,
  adjustCorrectIndexOnRemove,
  LECTURE_MEDIA_URL_PATTERN,
  MAX_MEDIA_SEC,
  MAX_ORDINAL,
  MIN_CHECKPOINT_OPTIONS,
  MAX_CHECKPOINT_OPTIONS,
  CORRECT_INDEX_UNCHANGED,
  lectureFormSchema,
  chapterFormSchema,
  checkpointFormSchema,
  lectureFormToCreatePayload,
  lectureFormToPatchPayload,
} from './curriculumValidation';
