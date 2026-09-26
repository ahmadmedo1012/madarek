import {
  Calendar, ClipboardCheck, FlaskConical, Microscope, Trophy,
} from 'lucide-react';
import { Icon } from '../Icon';
import { SectionAccent } from '../motion/SectionAccent';

/**
 * BentoScene — «من المحاضرة إلى الشهادة» mosaic.
 *
 * Wave-1.5 extraction: behavior-identical move of the bento grid out
 * of LandingPage. Wave 2 layers the coded metadata voice —
 * ( م-٠١ )-style module codes in the mono metric role — onto these
 * cards and refreshes the composition, keeping the #research/#exams/
 * #labs/#achievements anchors.
 */
export function BentoScene(): JSX.Element {
  return (
    <section className="marketing-container landing-bento">
      <SectionAccent kind="scene-paint" as="div" className="landing-section-head">
        <h2 className="landing-section-title">
          من <em>المحاضرة</em> إلى <em>الشهادة</em>
        </h2>
      </SectionAccent>

      <div className="landing-bento-grid">
        <SectionAccent kind="number-tick" as="div" id="research" className="landing-bento-card span-3 band-mint">
          <span className="sticker mint"><Icon icon={Microscope} size={28} /></span>
          <h3 className="landing-bento-title">البحوث والمكتبة</h3>
          <p className="landing-bento-desc">
            فهرس بحثيّ بفحص نزاهة علمية تلقائي (انتحال + AI) ومراجعة معلَّمة على
            الـPDF. آلاف الكتب الأكاديمية للاستعارة الفورية.
          </p>
        </SectionAccent>
        <SectionAccent kind="number-tick" as="div" className="landing-bento-card span-3 band-yellow">
          <span className="sticker yellow"><Icon icon={Calendar} size={28} /></span>
          <h3 className="landing-bento-title">الجدول الدراسي</h3>
          <p className="landing-bento-desc">
            جدول أسبوعيّ ذكيّ يجمع المحاضرات، التسليمات، الاختبارات، والاجتماعات،
            بمُذكِّرات تلقائية وروابط مباشرة لكل بند.
          </p>
        </SectionAccent>
        <SectionAccent kind="number-tick" as="div" id="exams" className="landing-bento-card span-2 band-sky">
          <span className="sticker sky"><Icon icon={ClipboardCheck} size={28} /></span>
          <h3 className="landing-bento-title">الاختبارات الإلكترونية</h3>
          <p className="landing-bento-desc">
            MCQ · صح/خطأ · إجابة قصيرة · مقالة. تصحيح تلقائي للموضوعي.
          </p>
        </SectionAccent>
        <SectionAccent kind="number-tick" as="div" id="labs" className="landing-bento-card span-2 band-rose">
          <span className="sticker rose"><Icon icon={FlaskConical} size={28} /></span>
          <h3 className="landing-bento-title">المعامل الافتراضية</h3>
          <p className="landing-bento-desc">
            <bdi>Cisco Packet Tracer</bdi>، <bdi>Arduino Sim</bdi>، وتجارب <bdi>AR/VR</bdi> للتطبيق العملي.
          </p>
        </SectionAccent>
        <SectionAccent kind="number-tick" as="div" id="achievements" className="landing-bento-card span-2 band-copper">
          <span className="sticker copper"><Icon icon={Trophy} size={28} /></span>
          <h3 className="landing-bento-title">الإنجازات والشارات</h3>
          <p className="landing-bento-desc">
            نقاط ومستويات وشارات، لتشجيع الالتزام دون فرضه.
          </p>
        </SectionAccent>
      </div>
    </section>
  );
}
