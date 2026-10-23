import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Icon } from '../../components/Icon';
import { StarMark } from '../../components/StarMark';
import { useThemeSync } from '../../components/layout/ThemeToggle';
import {
  HERO_PHOTOS, RAIL_PHOTOS, UNIVERSITY_VIDEOS,
} from '../../data/university-media';
import { MediaFrame } from '../../components/landing/MediaFrame';
import { VideoCard } from '../../components/landing/VideoCard';
import { InkSketch } from '../../components/landing/journey/InkSketch';
import { RevealCssClass } from '../../hooks/useReveal';
// campus.css — R313 (WP-A1): the /campus guest sub-page. The landing's
// documentary media rail (الحياة الجامعية) + the video facades (مشاهد
// جامعية) moved here VERBATIM — every Commons licence, author credit
// and honesty caption moved WITH its media (the r307 media contract).
// The sheet grammar is the landing's own (paper, hairlines, mono
// indices) carried by campus.css so the landing chunk never loads.
import '../../styles/campus.css';

/**
 * /campus — «الحياة الجامعية» (R313 · WP-A1).
 *
 * The landing re-composition (D7) removed the media rail + videos from
 * the sheet (Heron's 9 sections carry no photo mosaic); the documentary
 * layer lives here as a guest sub-page — same chrome-less public
 * pattern as /colleges, same honesty contracts:
 *   · every photo is Commons-licensed (PD / CC BY / CC BY-SA) with
 *     per-image attribution on its frame (MediaFrame);
 *   · videos embed ONLY from official university channels via
 *     youtube-nocookie, click-to-load (VideoCard) — «توثيقي» is the
 *     label, and it is the truth;
 *   · a university appearing here is documentation, not endorsement —
 *     «مدارك مستقلّة» stays on the page.
 */
export function CampusLifePage() {
  useThemeSync();

  return (
    <div className="cu">
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>

      <header className="cu-header">
        <div className="cu-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            العودة إلى الصفحة الرئيسية
          </Link>
          <Link to="/" className="cu-header-brand" aria-label="مدارك — الصفحة الرئيسية">
            <StarMark size={22} />
            مدارك
          </Link>
          <span className="cu-header-index fo-mono" dir="ltr">MADAREK · CAMPUS SHEET · [C-01]</span>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="cu-main">
        {/* ── الحياة الجامعية — the documentary photography rail ── */}
        <section aria-labelledby="cu-photos-title">
          <div className="cu-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[01]</span> الحياة الجامعية</span>
            <RevealCssClass as="h1" className="cu-title" delay={1} id="cu-photos-title">
              من داخل الجامعات الليبية
            </RevealCssClass>
            <RevealCssClass as="p" className="cu-lede" delay={2}>
              صور حقيقية لحرم جامعات ليبية عامة، بتراخيص مفتوحة من ويكيميديا كومنز —
              توثيقٌ للحياة الجامعية، لا زخرفة: كل إطار يحمل اسم جامعته ونسب مصوّره.
            </RevealCssClass>
          </div>

          {/* the photo band (the landing's ex-hero media band, eager lead) */}
          <RevealCssClass as="div" className="cu-band" delay={2}>
            <MediaFrame photo={HERO_PHOTOS[0]} variant="hero-lead" eager />
            <MediaFrame photo={HERO_PHOTOS[1]} variant="hero-mid" />
            <MediaFrame photo={HERO_PHOTOS[2]} variant="hero-tall" />
          </RevealCssClass>

          {/* the rail: the panorama band leads, the mosaic carries the rest */}
          <RevealCssClass as="div" className="um-rail" delay={2}>
            <MediaFrame photo={RAIL_PHOTOS[0]} variant="panorama" />
            <div className="um-mosaic">
              <MediaFrame photo={RAIL_PHOTOS[1]} variant="large" overlay={<InkSketch />} />
              <MediaFrame photo={RAIL_PHOTOS[2]} variant="std" overlay={<InkSketch />} />
              <MediaFrame photo={RAIL_PHOTOS[3]} variant="std" overlay={<InkSketch />} />
              <MediaFrame photo={RAIL_PHOTOS[4]} variant="std" overlay={<InkSketch />} />
              <MediaFrame photo={RAIL_PHOTOS[5]} variant="std" overlay={<InkSketch />} />
            </div>
          </RevealCssClass>

          <RevealCssClass as="p" className="cu-foot" delay={3}>
            المصدر: ويكيميديا كومنز — تراخيص PD / CC BY / CC BY-SA، ونسب كل مصوّر مرفقة بإطاره.
            أعيد تحجيم الصور وقصّها للعرض. ظهور جامعة هنا توثيقٌ لحقيقتها، لا تبنّيًا ولا شراكة — مدارك مستقلّة.
          </RevealCssClass>
        </section>

        {/* ── مشاهد جامعية — the official-channel documentaries ── */}
        <section aria-labelledby="cu-videos-title">
          <div className="cu-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[02]</span> مشاهد جامعية</span>
            <RevealCssClass as="h2" className="cu-title" delay={1} id="cu-videos-title">
              الحياة الجامعية <em>بالفيديو</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="cu-lede" delay={2}>
              تسجيلات توثيقية من القنوات الرسمية للجامعات — تُحمَّل عند الطلب فقط،
              وبلا أي بايتات خارجية قبل نقرك.
            </RevealCssClass>
          </div>

          <RevealCssClass as="div" className="vd-grid" delay={2}>
            <VideoCard video={UNIVERSITY_VIDEOS[0]} variant="primary" />
            <VideoCard video={UNIVERSITY_VIDEOS[1]} variant="secondary" />
          </RevealCssClass>

          <RevealCssClass as="p" className="cu-foot" delay={3}>
            الفيديوهات من القنوات الرسمية لجامعتي مصراتة وسبها، عبر آلية التضمين المسموحة —
            والمشغّل لا يُحمَّل إلا بعد نقر «شاهد الفيديو».
          </RevealCssClass>
        </section>
      </main>
    </div>
  );
}
