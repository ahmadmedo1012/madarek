import {
  BookOpen, Cog, Cpu, Database, Network, Globe, Shield,
  type LucideIcon,
} from 'lucide-react';

/**
 * Shared course metadata helpers (wave 9-a).
 *
 * The default course tint + the subject→icon heuristic were duplicated
 * across CoursesPage / CourseDetailPage / MatrixPage / LabsPage /
 * LibraryPage (audit 0-a: '#3D6BD6' default tint ×6 files; the 4-b
 * follow-up asked for this module). Behavior is identical to the local
 * copies it replaces.
 */

/**
 * Fallback tint when the API gives no `themeColor` for a course, lab or
 * book. Raw hex is deliberate: this is a data-driven accent that must
 * work inside `color-mix()` calls, not a themed surface (documented
 * exception to token discipline — see the wave-4 pages that pioneered
 * the value).
 */
export const DEFAULT_COURSE_TINT = '#3D6BD6';

/** Resolve a card/hero tint from the API's optional themeColor. */
export function courseTint(themeColor?: string | null): string {
  return themeColor ?? DEFAULT_COURSE_TINT;
}

/** Best-effort subject icon from a course code or Arabic name. */
export const courseIcon = (codeOrName: string): LucideIcon => {
  const s = codeOrName.toLowerCase();
  if (s.includes('se') || s.includes('برمج')) return Cog;
  if (s.includes('ct') || s.includes('تقنيات الحاسوب')) return Cpu;
  if (s.includes('is') || s.includes('نظم')) return Database;
  if (s.includes('net') || s.includes('شبك')) return Network;
  if (s.includes('web') || s.includes('إنترنت')) return Globe;
  if (s.includes('sec') || s.includes('أمن')) return Shield;
  return BookOpen;
};

/**
 * The assignment-kind enum shared by the dashboard agenda, the course
 * detail tables and the submission flow (wave 13-15 fold per D13 — the
 * identical label map lived as TYPE_LABELS / ASSIGNMENT_LABEL in four
 * page files; values are byte-identical to the copies they replace).
 */
export type AssignmentKind = 'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM';

/** Arabic labels for the assignment-kind enum (D17-1: اختبار, never امتحان). */
export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKind, string> = {
  HOMEWORK: 'واجب',
  QUIZ: 'اختبار قصير',
  PROJECT: 'مشروع',
  EXAM: 'اختبار',
};

/**
 * The material-format enum shared by the teacher materials table and the
 * student course-detail materials list (14-2 fold per 13-15 hand-off #2 —
 * the identical label map lived as MATERIAL_TYPE_LABEL in TeacherPages
 * and MATERIAL_LABELS in CourseDetailPage; values are byte-identical to
 * the copies they replace). Latin format codes stay Latin (proper
 * nouns); the rest get real Arabic labels (audits 0-d / 0-e).
 */
export type MaterialType = 'PDF' | 'PPT' | 'VIDEO' | 'DOC' | 'ZIP' | 'IMAGE' | 'OTHER';

/** Arabic labels for the material-format enum (Latin codes stay Latin). */
export const MATERIAL_TYPE_LABEL: Record<MaterialType, string> = {
  PDF: 'PDF',
  PPT: 'PPT',
  DOC: 'DOC',
  ZIP: 'ZIP',
  VIDEO: 'فيديو',
  IMAGE: 'صورة',
  OTHER: 'ملف',
};

/* ──────────────────────────────────────────────────────────────────
   Grade bands — the platform's ONE student-grade taxonomy (A6 P2,
   wave 22-a). Three adjacent teacher surfaces used to carry three
   private vocabularies for the same number: the grades table said
   «جيّد جدّاً» (≥75), the students table said «متفوّق» (≥80) and the
   performance distribution merged everything 60–74 into «جيّد
   ومقبول» — a teacher could not carry a chip's meaning across
   pages. One student now reads as one chip everywhere: the ladder
   keeps the grades page's thresholds (the most granular of the
   three). ResearchReview's /20 paper scale stays separate by
   design (different denominator, different surface).
   ────────────────────────────────────────────────────────────────── */

export type GradeBandKey = 'EXCELLENT' | 'VERY_GOOD' | 'GOOD' | 'PASS' | 'WEAK';

export interface GradeBand {
  key: GradeBandKey;
  /** Arabic band label — the shared vocabulary. */
  label: string;
  /** Badge color (matches the primitives' ThemeColor union). */
  color: 'green' | 'brand' | 'amber' | 'gold' | 'red';
  /** ProgressBar fill token (CSS color). */
  barColor: string;
  /** Human range for distribution labels, Latin digits inside. */
  range: string;
  /** Inclusive lower bound (out of 100). */
  min: number;
}

/** Ordered best → weak; index order is the distribution draw order. */
export const GRADE_BANDS: readonly GradeBand[] = [
  { key: 'EXCELLENT', label: 'ممتاز',     color: 'green', barColor: 'var(--success)', range: '85 فأعلى', min: 85 },
  { key: 'VERY_GOOD', label: 'جيّد جدّاً', color: 'brand', barColor: 'var(--accent)',  range: '75–84',    min: 75 },
  { key: 'GOOD',      label: 'جيّد',      color: 'amber', barColor: 'var(--warning)', range: '65–74',    min: 65 },
  { key: 'PASS',      label: 'مقبول',     color: 'gold',  barColor: 'var(--gold)',    range: '50–64',    min: 50 },
  { key: 'WEAK',      label: 'ضعيف',      color: 'red',   barColor: 'var(--danger)',  range: 'أقلّ من 50', min: 0 },
];

/**
 * Resolve a student's average grade (0–100 scale, the teacher-students
 * wire contract) to the platform's single grade band. One chip per
 * student, identical on the grades table, the students table and the
 * performance distribution.
 */
export function gradeBand(avgGrade: number): GradeBand {
  for (const band of GRADE_BANDS) {
    if (avgGrade >= band.min) return band;
  }
  return GRADE_BANDS[GRADE_BANDS.length - 1]!;
}
