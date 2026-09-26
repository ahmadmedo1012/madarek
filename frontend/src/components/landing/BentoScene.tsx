import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Calendar, ClipboardCheck, FlaskConical, Microscope, Trophy,
} from 'lucide-react';
import { Icon } from '../Icon';
import { SectionAccent } from '../motion/SectionAccent';
import '../../styles/landing-bento.css';

/**
 * BentoScene — «من المحاضرة إلى الشهادة» mosaic.
 *
 * Wave 2 (imm-3-bento) layers the coded metadata voice onto the five
 * capability tiles: a mono metric-role code series ( ن-٠١ )…( ن-٠٥ )
 * — «ن» = منظومة (platform modules), deliberately DISTINCT from the
 * journey timeline's ( م-٠١…م-٠٦ ) feature codes so the two voices
 * never collide. Each code is a decorative terminal artifact above the
 * title; the title stays the tile's accessible name.
 *
 * Composition re-grammared as an asymmetric mosaic: البحوث والمكتبة is
 * the feature tile (wide × two rows, larger description), the other
 * four stay compact. landing.css keeps owning the base anatomy (grid,
 * card, band-*, sticker, magnetic glow); this scene's own sheet
 * (landing-bento.css) layers the mosaic through the .landing-bento-
 * scene wrapper with scoped selectors — never !important, never edits
 * to the shared sheet.
 *
 * Anchors preserved: #research (megamenu + footer), #exams (journey
 * rail stage), #labs / #achievements (footer).
 */

/** One tile of the coded capability series. */
type BentoTile = {
  /** Anchor target for the megamenu / footer / journey rail (optional). */
  id?: string;
  /** Mosaic placement wiring (grid-area class from landing-bento.css). */
  area: string;
  /** Pastel band family (landing.css .band-*). */
  band: string;
  /** Sticker color family (components.css .sticker.*). */
  sticker: string;
  icon: LucideIcon;
  /** Mono module code in the metric role — decorative for AT. */
  code: string;
  title: string;
  desc: ReactNode;
};

const TILES: readonly BentoTile[] = [
  {
    id: 'research',
    area: 'bento-research',
    band: 'band-mint',
    sticker: 'mint',
    icon: Microscope,
    code: '( ن-٠١ )',
    title: 'البحوث والمكتبة',
    desc: 'فهرس بحثيّ بفحص نزاهة علمية تلقائي (انتحال + AI) ومراجعة معلَّمة على الـPDF. آلاف الكتب الأكاديمية للاستعارة الفورية.',
  },
  {
    area: 'bento-schedule',
    band: 'band-yellow',
    sticker: 'yellow',
    icon: Calendar,
    code: '( ن-٠٢ )',
    title: 'الجدول الدراسي',
    desc: 'جدول أسبوعيّ ذكيّ يجمع المحاضرات، التسليمات، الاختبارات، والاجتماعات، بمُذكِّرات تلقائية وروابط مباشرة لكل بند.',
  },
  {
    id: 'exams',
    area: 'bento-exams',
    band: 'band-sky',
    sticker: 'sky',
    icon: ClipboardCheck,
    code: '( ن-٠٣ )',
    title: 'الاختبارات الإلكترونية',
    desc: 'MCQ · صح/خطأ · إجابة قصيرة · مقالة. تصحيح تلقائي للموضوعي.',
  },
  {
    id: 'labs',
    area: 'bento-labs',
    band: 'band-rose',
    sticker: 'rose',
    icon: FlaskConical,
    code: '( ن-٠٤ )',
    title: 'المعامل الافتراضية',
    desc: (
      <>
        <bdi>Cisco Packet Tracer</bdi>، <bdi>Arduino Sim</bdi>، وتجارب <bdi>AR/VR</bdi> للتطبيق العملي.
      </>
    ),
  },
  {
    id: 'achievements',
    area: 'bento-achievements',
    band: 'band-copper',
    sticker: 'copper',
    icon: Trophy,
    code: '( ن-٠٥ )',
    title: 'الإنجازات والشارات',
    desc: 'نقاط ومستويات وشارات، لتشجيع الالتزام دون فرضه.',
  },
];

export function BentoScene(): JSX.Element {
  return (
    <section
      aria-label="من المحاضرة إلى الشهادة"
      className="marketing-container landing-bento landing-bento-scene"
    >
      <SectionAccent kind="scene-paint" as="div" className="landing-section-head">
        <h2 className="landing-section-title">
          من <em>المحاضرة</em> إلى <em>الشهادة</em>
        </h2>
      </SectionAccent>

      <ul className="landing-bento-grid" aria-label="قدرات المنصّة الدراسية">
        {TILES.map((tile) => (
          <SectionAccent
            key={tile.area}
            kind="number-tick"
            as="li"
            id={tile.id}
            className={`landing-bento-card ${tile.area} ${tile.band}`}
          >
            <span className={`sticker ${tile.sticker}`}>
              <Icon icon={tile.icon} size={28} />
            </span>
            {/* Coded metadata voice — mono metric role, quiet by design. */}
            <span className="bento-meta" aria-hidden="true">{tile.code}</span>
            <h3 className="landing-bento-title">{tile.title}</h3>
            <p className="landing-bento-desc">{tile.desc}</p>
          </SectionAccent>
        ))}
      </ul>
    </section>
  );
}
