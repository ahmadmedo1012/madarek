import { Link } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, BookOpen, Brain, Check, Compass,
  GraduationCap, Network, ShieldCheck,
} from 'lucide-react';
import { Icon } from '../Icon';
import { RevealCssClass } from '../../hooks/useReveal';
import { SectionAccent } from '../motion/SectionAccent';

/**
 * KnowledgeJourney — the «كيف تتعلم في مدارك» act.
 *
 * Wave-1.5 extraction: behavior-identical move of the features zigzag
 * + flipped-classroom band out of LandingPage. The immersive redesign
 * (wave 2) re-grammars this into the sequential scroll-scrubbed
 * timeline (SequentialHighlight) — the learning-path narrative —
 * while preserving every feature's copy and the #flipped/#matrix
 * anchors the megamenu links to.
 */
export function KnowledgeJourney(): JSX.Element {
  return (
    <>
      {/* FEATURES — two-column zigzag of horizontal cards. */}
      <section id="features" className="marketing-container landing-features">
        <SectionAccent kind="scene-paint" as="div" className="landing-section-head">
          <h2 className="landing-section-title">
            كل ما يحتاجه <em>الجامعيّ</em> في مكان واحد
          </h2>
          <p className="landing-section-lede">
            أدوات أكاديمية متكاملة تربط الفصل الدراسي بالمحتوى الرقمي والتحليلات
            الذكية، بدون تشتيت ودون تعقيد.
          </p>
        </SectionAccent>

        <div className="landing-features-grid">
          <RevealCssClass as="article" id="matrix" className="landing-feature-card sticker-wiggle">
            <span className="sticker lg peach"><Icon icon={Compass} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">المصفوفة التعليمية</h3>
            <p className="landing-feature-desc">
              مسارات تعلُّم تتكيَّف مع مستوى تقدُّمك ونقاط قوَّتك، تكشف الفجوات وتربطها
              تلقائياً بالدقائق التي تشرحها.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={1}>
            <span className="sticker lg lavender"><Icon icon={Brain} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">المساعد الأكاديمي</h3>
            <p className="landing-feature-desc">
              «Oasis»: رفيق دراسي يفهم سياق دراستك. شروحات مخصَّصة، تلخيصات،
              واختبارات تفاعلية حسب أدائك الفعلي.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={2}>
            <span className="sticker lg sky"><Icon icon={BarChart3} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">تحليلات أكاديمية</h3>
            <p className="landing-feature-desc">
              لوحة دقيقة لتقدُّمك لحظة بلحظة: الدرجات، الحضور، المهام، والمؤشرات
              المؤسسية، بصياغة تخدم القرار.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={3}>
            <span className="sticker lg mint"><Icon icon={BookOpen} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">مكتبة وبحوث</h3>
            <p className="landing-feature-desc">
              فهرس بحثيّ وفحص للنزاهة العلمية (الانتحال + المحتوى المُولَّد آلياً)
              مع مراجعة معلَّمة من الأستاذ.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={4}>
            <span className="sticker lg yellow"><Icon icon={Network} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">منظومة موحَّدة</h3>
            <p className="landing-feature-desc">
              المحاضرات، الحضور، الدرجات، الاختبارات، البحوث، والمعامل الافتراضية،
              كلها في تجربة واحدة آمنة ومتجاوبة.
            </p>
          </RevealCssClass>
          <RevealCssClass as="article" className="landing-feature-card sticker-wiggle" delay={5}>
            <span className="sticker lg rose"><Icon icon={ShieldCheck} size={32} strokeWidth={1.8} /></span>
            <h3 className="landing-feature-title">جودة مؤسسية</h3>
            <p className="landing-feature-desc">
              مؤشرات لقطاع الجودة: تقييم الأساتذة، مراجعة الاختبارات، أداء المقررات،
              وتقارير شاملة بصياغة رسمية.
            </p>
          </RevealCssClass>
        </div>
      </section>

      {/* COLORED BAND 1 — peach: Flipped classroom */}
      <section id="flipped" className="band band-peach">
        <div className="marketing-container band-split">
          <RevealCssClass as="div">
            <span className="sticker xl peach"><Icon icon={GraduationCap} size={48} strokeWidth={1.6} /></span>
            <h2 className="band-title">
              محاضرات مسجَّلة <em>تتفاعل</em> مع الطالب
            </h2>
            <p className="band-lede">
              نقاط فحص مدمجة في كل محاضرة، حضور تلقائي عند الإكمال، وروابط مباشرة
              إلى المفاهيم في المصفوفة المعرفية. الطالب يبني فهمه بإيقاعه.
            </p>
            <div className="landing-band-cta">
              <Link to="/auth" className="btn primary lg">ابدأ الآن <Icon icon={ArrowLeft} size={14} /></Link>
            </div>
          </RevealCssClass>
          <RevealCssClass as="div" className="band-visual reveal-wipe" delay={2}>
            <div className="band-visual-row">
              <span className="band-visual-checkbox on"><Icon icon={Check} size={12} strokeWidth={3} /></span>
              <span className="band-visual-text done">مقدمة في خوارزميات الفرز</span>
              <span className="band-visual-tag mint">مكتمل</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox on"><Icon icon={Check} size={12} strokeWidth={3} /></span>
              <span className="band-visual-text done">تعقيد الزمن و<bdi>O</bdi> الكبيرة</span>
              <span className="band-visual-tag mint">مكتمل</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox" />
              <span className="band-visual-text"><bdi>Quick Sort</bdi>: التقسيم الديناميكي</span>
              <span className="band-visual-tag peach">قيد المتابعة</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox" />
              <span className="band-visual-text"><bdi>Merge Sort</bdi> والتفكير العودي</span>
              <span className="band-visual-tag">قادم</span>
            </div>
            <div className="band-visual-row">
              <span className="band-visual-checkbox" />
              <span className="band-visual-text">اختبار قصير، أسبوع 4</span>
              <span className="band-visual-tag sky">اختبار</span>
            </div>
          </RevealCssClass>
        </div>
      </section>
    </>
  );
}
