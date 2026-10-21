import { Check, X } from 'lucide-react';
import { Icon } from '../Icon';
import type { PaperStatus, ResearchPaper } from '../../hooks/useResources';
import { formatDateWithYearAr } from '../../lib/format';

/**
 * StatusPipeline — the research paper's journey rail (r199, 4B family;
 * r304 adds the WHEN: real dates under the reached steps).
 *
 * Four honest steps: رُفع (submitted) → الفحص (checked, declared
 * simulation) → التقييم (in review) → النشر (published). The rail is
 * derived ONLY from the paper's status — it never guesses, never
 * animates a fake progress number:
 *
 *   UPLOADED       s1 current
 *   SCANNING       s1 done · s2 current (pulsing — the scan is running)
 *   CHECKS_PASSED  s1 s2 done · s3 current
 *   CHECKS_FAILED  s1 done · s2 FAILED (the journey stops here — the
 *                  honest branch; nothing pretends the paper moved on)
 *   GRADED         s1 s2 s3 done · s4 current
 *   PUBLISHED      all done
 *
 * The connector segment before a step is "traveled" when the step is
 * reached (done/current/failed). A failed step keeps its red dot so
 * the student sees WHERE the journey stopped, not just that it did.
 * Dot glyphs: done → check, failed → cross icon, current/pending →
 * bare dot (the fill state carries the meaning; no icon noise).
 *
 * r304 (the visible sequence): when the caller passes the paper, each
 * reached step prints its real timestamp under the label (uploadedAt /
 * scannedAt / gradedAt / publishedAt) — the rail becomes evidence, not
 * decoration. Missing dates print nothing (no invented «—» noise on a
 * step that has not happened).
 */

type StepState = 'done' | 'current' | 'failed' | 'pending';

interface PipelineStep {
  key: string;
  label: string;
  state: StepState;
}

const STEP_KEYS = ['uploaded', 'scanned', 'review', 'published'] as const;

function stepsFor(status: PaperStatus): PipelineStep[] {
  const at = (i: number): StepState => {
    switch (status) {
      case 'UPLOADED':
        return i === 0 ? 'current' : 'pending';
      case 'SCANNING':
        if (i === 0) return 'done';
        if (i === 1) return 'current';
        return 'pending';
      case 'CHECKS_PASSED':
        if (i <= 1) return 'done';
        if (i === 2) return 'current';
        return 'pending';
      case 'CHECKS_FAILED':
        if (i === 0) return 'done';
        if (i === 1) return 'failed';
        return 'pending';
      case 'GRADED':
        return i <= 2 ? 'done' : 'current';
      case 'PUBLISHED':
        return 'done';
    }
  };
  return STEP_KEYS.map((key, i) => ({
    key,
    state: at(i),
    // Shared vocabulary with the row's status badge (STATUS_LABEL):
    // one journey, one language.
    label: key === 'uploaded' ? 'رُفع'
      : key === 'scanned' ? 'فُحص'
      : key === 'review' ? 'التقييم'
      : 'النشر',
  }));
}

/** The real instant each step was reached — 'done'/'current' steps only;
 * an absent date prints nothing rather than a fake dash. */
function stepDate(key: string, state: StepState, paper: ResearchPaper): string | null {
  if (state !== 'done' && state !== 'current') return null;
  switch (key) {
    case 'uploaded':
      return formatDateWithYearAr(paper.uploadedAt);
    case 'scanned':
      return paper.scannedAt ? formatDateWithYearAr(paper.scannedAt) : null;
    case 'review':
      return paper.gradedAt ? formatDateWithYearAr(paper.gradedAt) : null;
    case 'published':
      return paper.publishedAt ? formatDateWithYearAr(paper.publishedAt) : null;
    default:
      return null;
  }
}

export function StatusPipeline({ status, paper }: { status: PaperStatus; paper?: ResearchPaper }) {
  const steps = stepsFor(status);
  return (
    <ol className="rs-pipeline" aria-label="مسار البحث: رُفع، فُحص، التقييم، النشر">
      {steps.map((s) => {
        const glyph = s.state === 'failed' ? X : s.state === 'done' ? Check : null;
        const when = paper ? stepDate(s.key, s.state, paper) : null;
        return (
          <li
            key={s.key}
            className={[
              `is-${s.state}`,
              s.state === 'current' && status === 'SCANNING' ? 'is-pulse' : '',
            ].filter(Boolean).join(' ')}
            aria-current={s.state === 'current' ? 'step' : undefined}
          >
            <span className="rs-pipe-dot" aria-hidden="true">
              {glyph && <Icon icon={glyph} size={12} strokeWidth={2.4} />}
            </span>
            <span className="rs-pipe-label">
              {s.label}
              {s.state === 'failed' ? ' — تعذّر اجتياز الفحص' : ''}
              {when && <span className="rs-pipe-when"><bdi>{when}</bdi></span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
