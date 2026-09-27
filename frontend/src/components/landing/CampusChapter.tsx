import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CountUp } from '../CountUp';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * CampusChapter — «الأرض» الحرم الجامعي (chapters v4).
 *
 * The chapter escapes the card trap: one full-bleed photographic panel
 * (86vh) of the real campus entrance, scroll-scrubbed with a ±8% parallax
 * (gsap yPercent -8 → 8, scrub), grounded back into the void by a
 * bottom-anchored gradient veil. The editorial caption lives at the
 * TOP inline-start corner — eyebrow, Cairo headline, one Plex line.
 * Under the photo (never overlapping it) sits a single hairline facts
 * band: four gold Cairo-900 numerals with mist Plex labels.
 *
 * · Uses the SAME art-directed photo asset the landing already ships
 *   (`/main_photo.webp` + 750w variant + jpg fallback — identical srcSet
 *   to the previous campus section).
 * · CountUp animates 25 / 4 / 3 on enter (its props are a plain string);
 *   the year 1988 stays plain — counting a year up from 0 reads as data,
 *   not heritage (and ar-LY formats 1988 as "1.988").
 * · prefers-reduced-motion: no parallax, no reveals — the photo and all
 *   copy simply sit in their final positions.
 */

interface Fact {
  readonly value: string;
  readonly label: string;
  /** plain = render statically (years must not count up) */
  readonly plain?: boolean;
}

/** University truth — the four anchors of the institution. */
const FACTS: readonly Fact[] = [
  { value: '25', label: 'كلّية' },
  { value: '4', label: 'مدن' },
  { value: '1988', label: 'التأسيس', plain: true },
  { value: '3', label: 'عضويات دولية' },
];

export default function CampusChapter() {
  const rootRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const panel = panelRef.current;
      const photo = photoRef.current;
      if (!root || !panel || !photo) return;

      const captionLines = Array.from(
        root.querySelectorAll<HTMLElement>('.ln-campus-caption [data-reveal]'),
      );
      const facts = Array.from(
        root.querySelectorAll<HTMLElement>('.ln-campus-fact'),
      );
      const factsBand = root.querySelector<HTMLElement>('.ln-campus-facts');

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // scroll-scrub parallax — the photo drifts against the panel
        gsap.fromTo(
          photo,
          { yPercent: -8 },
          {
            yPercent: 8,
            ease: 'none',
            scrollTrigger: {
              trigger: panel,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
        // editorial caption — staggered rise
        if (captionLines.length > 0) {
          gsap.fromTo(
            captionLines,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: 'expo.out',
              stagger: 0.09,
              scrollTrigger: { trigger: panel, start: 'top 72%' },
            },
          );
        }
        // facts band — its own trigger, it sits below the fold
        if (facts.length > 0 && factsBand) {
          gsap.fromTo(
            facts,
            { y: 20, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              ease: 'expo.out',
              stagger: 0.08,
              scrollTrigger: { trigger: factsBand, start: 'top 88%' },
            },
          );
        }
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section id="campus" className="ln-campus" ref={rootRef} aria-label="جامعة الزاوية">
      <figure className="ln-campus-panel" ref={panelRef}>
        <div className="ln-campus-media">
          <picture>
            <source
              type="image/webp"
              srcSet="/main_photo-750.webp 750w, /main_photo.webp 1377w"
            />
            <img
              ref={photoRef}
              src="/main_photo.jpg"
              alt="جامعة الزاوية — المدخل الرئيسي"
              className="ln-campus-photo"
              width={1377}
              height={768}
              sizes="100vw"
              loading="lazy"
              decoding="async"
            />
          </picture>
        </div>
        {/* functional veil: grounds the photo into the void (bottom) +
            keeps the top-anchored caption legible on bright sky */}
        <span className="ln-campus-veil" aria-hidden="true" />
        <figcaption className="ln-campus-caption">
          <span className="ln-ch-eyebrow" data-reveal>
            // الأرض — الحرم الجامعي
          </span>
          <h3 className="ln-campus-title" data-reveal>
            من قاعات الزاوية… إلى مدارك
          </h3>
          <p className="ln-campus-line" data-reveal>
            حرم جامعي حقيقيّ، بمدن أربع، يفتح أبوابه رقميًا لكل طالب.
          </p>
        </figcaption>
      </figure>

      <div className="ln-campus-facts">
        {FACTS.map((fact) => (
          <div className="ln-campus-fact" key={fact.label}>
            <span className="ln-campus-fact-num">
              {fact.plain ? fact.value : <CountUp value={fact.value} />}
            </span>
            <span className="ln-campus-fact-label">{fact.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
