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

/** Arabic labels for the assignment-kind enum. */
export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKind, string> = {
  HOMEWORK: 'واجب',
  QUIZ: 'اختبار قصير',
  PROJECT: 'مشروع',
  EXAM: 'امتحان',
};
