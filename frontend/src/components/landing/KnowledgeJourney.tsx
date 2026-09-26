import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Compass, GraduationCap } from 'lucide-react';
import { Icon } from '../Icon';
import { RevealCssClass } from '../../hooks/useReveal';
import { MaskReveal, SequentialHighlight, type SequentialItem } from '../motion';
import '../../styles/landing-journey.css';

/**
 * KnowledgeJourney — «رحلة معرفة تتوسّع» (immersive wave 2, scene 4).
 *
 * The wave-1.5 features zigzag is re-grammared as ONE authored
 * sequential act: a scroll-scrubbed learning-path timeline
 * (SequentialHighlight) whose stages light up progressively —
 * knowledge accumulating, never a lone cursor — the campaign's
 * signature mid-page moment. The six stage descriptions are the old
 * feature cards' copy, verbatim (they are real product truths); the
 * flipped-classroom band below stays byte-identical as the concrete
 * demo of the journey's first stage.
 *
 * Anchor contract (megamenu + footer targets; ids are page-wide
 * unique and owned by this scene):
 *   #features — the scene section (also the mobile-menu «المميزات»)
 *   #matrix   — stage م-٠١ on the timeline rail
 *   #ai       — stage م-٠٢, one stage down the rail
 *   #flipped  — the flipped-classroom band
 * SequentialHighlight stamps its own <li> ids with a useId prefix, so
 * the stable targets render as zero-size rail spans inside
 * .journey-track, positioned per stage in landing-journey.css.
 * (#research stays in BentoScene — deliberately NOT created here.)
 */
const JOURNEY_STEPS: SequentialItem[] = [
  {
    id: 'matrix',
    code: '( م-٠١ )',
    title: 'المصفوفة التعليمية',
    description:
      'مسارات تعلُّم تتكيَّف مع مستوى تقدُّمك ونقاط قوَّتك، تكشف الفجوات وتربطها تلقائياً بالدقائق التي تشرحها.',
  },
  {
    id: 'ai',
    code: '( م-٠٢ )',
    title: 'المساعد الأكاديمي',
    description:
      '«Oasis»: رفيق دراسي يفهم سياق دراستك. شروحات مخصَّصة، تلخيصات، واختبارات تفاعلية حسب أدائك الفعلي.',
  },
  {
    id: 'analytics',
    code: '( م-٠٣ )',
    title: 'تحليلات أكاديمية',
    description:
      'لوحة دقيقة لتقدُّمك لحظة بلحظة: الدرجات، الحضور، المهام، والمؤشرات المؤسسية، بصياغة تخدم القرار.',
  },
  {
    id: 'research',
    code: '( م-٠٤ )',
    title: 'مكتبة وبحوث',
    description:
      'فهرس بحثيّ وفحص للنزاهة العلمية (الانتحال + المحتوى المُولَّد آلياً) مع مراجعة معلَّمة من الأستاذ.',
  },
  {
    id: 'unified',
    code: '( م-٠٥ )',
    title: 'منظومة موحَّدة',
    description:
      'المحاضرات، الحضور، الدرجات، الاختبارات، البحوث، والمعامل الافتراضية، كلها في تجربة واحدة آمنة ومتجاوبة.',
  },
  {
    id: 'quality',
    code: '( م-٠٦ )',
    title: 'جودة مؤسسية',
    description:
      'مؤشرات لقطاع الجودة: تقييم الأساتذة، مراجعة الاختبارات، أداء المقررات، وتقارير شاملة بصياغة رسمية.',
  },
];

export function KnowledgeJourney(): JSX.Element {
  return (
    <>
      {/* THE LEARNING-PATH TIMELINE — one section, one scrubbed gesture. */}
      <section
        id="features"
        className="marketing-container journey-scene"
        aria-labelledby="journey-title"
      >
        <div className="journey-head">
          <div className="journey-head-copy">
            <RevealCssClass as="p" className="journey-meta">
              ( ر-٠١ · مسار التعلّم )
            </RevealCssClass>
            {/*
              The display title keeps its <em> accent word AND its
              word-mask reveal: MaskReveal only masks plain-string
              children, so the three words ride three single-word
              masks sequenced at one --motion-stagger-step apart (60ms,
              120ms) — the same cascade one MaskReveal staggers
              internally, never a per-character split (Arabic ruling).
            */}
            <h2 id="journey-title" className="journey-title">
              <MaskReveal as="span">رحلة</MaskReveal>{' '}
              <em>
                <MaskReveal as="span" delay={60}>معرفة</MaskReveal>
              </em>{' '}
              <MaskReveal as="span" delay={120}>تتوسّع</MaskReveal>
            </h2>
            <RevealCssClass as="p" className="journey-lede" delay={1}>
              من أوّل محاضرة تفتحها حتى إتقان المقرّر، ترافقك مدارك في
              كلّ مرحلة من مسار تعلُّمك.
            </RevealCssClass>
          </div>
          {/* The scene's single icon moment — house taste: fewer icons,
              more type. Copper = the rail/node family of the timeline. */}
          <RevealCssClass
            as="span"
            className="sticker lg copper journey-sticker"
            delay={2}
          >
            <Icon icon={Compass} size={32} strokeWidth={1.8} />
          </RevealCssClass>
        </div>

        <div className="journey-track">
          <SequentialHighlight
            className="journey-timeline"
            items={JOURNEY_STEPS}
            label="مراحل رحلة التعلُّم"
          />
          {/* Stable megamenu targets on the rail — SequentialHighlight
              owns the <li> ids (useId-prefixed), so #matrix/#ai live
              here and are pinned to their stages' heights in CSS. */}
          <span id="matrix" className="journey-anchor" />
          <span id="ai" className="journey-anchor journey-anchor--step-2" />
        </div>
      </section>

      {/* COLORED BAND 1 — peach: Flipped classroom (stage-one demo,
          markup untouched from wave 1.5; this scene only owns its
          below-fold rendering cost in landing-journey.css). */}
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
