import { Link } from 'react-router-dom';
import {
  ClipboardCheck, BarChart3, Target, ArrowLeft, BookMarked, RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/primitives';
import { Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useStudentResults } from '../../hooks/useResources';

/** Proper Arabic counted noun for the graded-course count. */
function gradedCoursesLabel(n: number): string {
  if (n === 1) return 'مقرّر واحد مقيَّم';
  if (n === 2) return 'مقرّرين مقيَّمين';
  if (n >= 3 && n <= 10) return `${n} مقرّرات مقيَّمة`;
  return `${n} مقرّراً مقيَّماً`;
}

/**
 * Honest landing for "exam analysis".
 *
 * The platform has /student/online-exams (real exam taking) and
 * /student/results (real grades). The original ExamsPage rendered a
 * synthetic "analysis" view of fake exam results that didn't exist
 * anywhere else in the platform. Replaced with real entry points, and
 * the cumulative-average card now surfaces the student's REAL headline
 * grade (useStudentResults) with a grade-emphasis reveal — the authored
 * moment of this page. The exam-taking result screen itself lives on
 * the online-exams pages (not this file).
 */
export default function ExamsPage() {
  const results = useStudentResults();
  const avg = results.data?.headline.avgGradePct ?? null;
  const courseCount = results.data?.headline.courseCount ?? 0;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تحليل الاختبارات</h1>
          <p className="page-subtitle">روابط مباشرة إلى الاختبارات والنتائج الفعليّة الخاصّة بك.</p>
        </div>
      </header>

      <div className="grid-3">
        <Card title="الاختبارات الإلكترونيّة" icon={ClipboardCheck}>
          <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-3) 0', lineHeight: 1.6 }}>
            الاختبارات المتاحة الآن مع تتبّع المحاولات والنتائج الفوريّة.
          </p>
          <Link to="/student/online-exams" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح الاختبارات
          </Link>
        </Card>

        <Card title="نتائجك التراكميّة" icon={BarChart3} className="exam-results-card">
          {results.isPending ? (
            <div aria-busy="true" aria-live="polite">
              <Skeleton width={96} height={40} />
              <div style={{ marginTop: 'var(--sp-2)' }}>
                <Skeleton width="80%" height={12} />
              </div>
            </div>
          ) : results.isError ? (
            // The card stays a working entry point — the failure is
            // surfaced honestly with a retry, never masked (ruling #14).
            <div role="alert">
              <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-3) 0', lineHeight: 1.6 }}>
                متوسّط درجاتك في كلّ مقرّر، أعلى وأدنى الدرجات، وآخر التقييمات.
              </p>
              <p className="text-xs" style={{ color: 'var(--danger-ink)', margin: '0 0 var(--sp-2) 0' }}>
                تعذّر تحميل متوسّطك الحاليّ.
              </p>
              <button
                type="button"
                className="btn outline sm"
                onClick={() => void results.refetch()}
              >
                <Icon icon={RefreshCw} size={13} />
                إعادة المحاولة
              </button>
            </div>
          ) : avg !== null ? (
            <>
              {/* The grade-emphasis reveal: the real cumulative average
                  lands as the visual anchor (§lists: exam-grade-in). */}
              <div className="exam-grade">
                <span className="exam-grade-value"><bdi>{avg}</bdi>%</span>
              </div>
              <p className="text-xs text-subtle" style={{ margin: 'var(--sp-2) 0 var(--sp-3) 0' }}>
                متوسّطك العام عبر {gradedCoursesLabel(courseCount)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-3) 0', lineHeight: 1.6 }}>
              لا درجات مسجَّلة بعد — سيظهر متوسّطك هنا بعد أوّل تقييم.
            </p>
          )}
          <Link to="/student/results" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح النتائج
          </Link>
        </Card>

        <Card title="المصفوفة التعليميّة" icon={Target}>
          <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-3) 0', lineHeight: 1.6 }}>
            تحليل ذكاء اصطناعيّ لنقاط القوّة والفجوات في فهمك للمفاهيم.
          </p>
          <Link to="/student/matrix" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح المصفوفة
          </Link>
        </Card>
      </div>

      <Card title="ملخّص الواجبات" icon={BookMarked}>
        <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0', lineHeight: 1.6 }}>
          تحليل أعمق للواجبات والمشاريع — متوسّط أدائك مقارنة بزملائك في الفصل،
          ومسار التحسّن عبر الفصل الدراسيّ — قيد الإعداد حالياً.
        </p>
      </Card>
    </div>
  );
}
