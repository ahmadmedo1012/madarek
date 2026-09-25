/**
 * Curriculum authoring shared components — the "إدارة المنهج" panel
 * used by the teacher offering page (TeacherIntelligencePage).
 *
 * 16-E8 (15-f FE-12): the barrel previously re-exported the whole
 * authoring surface (modals, lists, validation helpers). Only
 * CurriculumAuthoringPanel is imported from outside this directory —
 * the modals/lists are consumed inside it, and tests import
 * curriculumValidation / CurriculumAuthoringPanel directly — so the
 * barrel is trimmed to the one consumed export.
 */
export { CurriculumAuthoringPanel } from './CurriculumAuthoringPanel';
