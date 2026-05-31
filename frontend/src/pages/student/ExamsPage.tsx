import { Link } from 'react-router-dom';
import {
  ClipboardCheck, BarChart3, Target, ArrowLeft, BookMarked,
} from 'lucide-react';
import { Card } from '../../components/primitives';
import { Icon } from '../../components/Icon';

/**
 * Honest landing for "exam analysis".
 *
 * The platform has /student/online-exams (real exam taking) and
 * /student/results (real grades). The original ExamsPage rendered a
 * synthetic "analysis" view of fake exam results that didn't exist
 * anywhere else in the platform. Replaced with three real entry points.
 */
export default function ExamsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تحليل الامتحانات</h1>
          <p className="page-subtitle">روابط مباشرة إلى الاختبارات والنتائج الفعليّة الخاصّة بك.</p>
        </div>
      </div>

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

        <Card title="نتائجك التراكميّة" icon={BarChart3}>
          <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-3) 0', lineHeight: 1.6 }}>
            متوسّط درجاتك في كلّ مقرّر، أعلى وأدنى الدرجات، وآخر التقييمات.
          </p>
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
          ومسار التحسّن عبر الفصل الدراسيّ — قيد التطوير.
        </p>
      </Card>
    </div>
  );
}
