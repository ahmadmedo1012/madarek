import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * FinalCtaChapter — «نقطة البداية» the cinematic close (chapters v4).
 *
 * ~92vh of centered stillness. Behind the copy (aria-hidden) three
 * concentric gold orbit rings — 420 / 640 / 880px, 1px borders at
 * 0.18 / 0.12 / 0.08 alpha — rotate on 66–90s linear loops, each carrying
 * a single glowing gold node on its edge; the rings breathe in from
 * 0.92 → 1 when the chapter scrolls into view. In front: the mono
 * eyebrow, a two-line Cairo-900 headline whose lines unmask via
 * clip-path (inset(0 0 100% 0) → 0, 120ms apart — the second line in
 * gold), one Plex sub-line, and the CTA pair — the existing gold button
 * (`.ln-btn-gold` from landing.css, untouched) + its ghost sibling.
 *
 * · prefers-reduced-motion: rings render static (no rotation, no scale-in)
 *   and every line is visible — nothing is ever hidden in CSS.
 */

export default function FinalCtaChapter() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const rings = root.querySelector<HTMLElement>('.ln-final-rings');
      const headlineLines = Array.from(
        root.querySelectorAll<HTMLElement>('.ln-final-line'),
      );
      const rising = Array.from(
        root.querySelectorAll<HTMLElement>('.ln-final-rise'),
      );

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // the orbital system breathes in
        if (rings) {
          gsap.fromTo(
            rings,
            { scale: 0.92, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 1.4,
              ease: 'expo.out',
              scrollTrigger: { trigger: root, start: 'top 75%' },
            },
          );
        }
        // headline lines unmask — staggered 120ms, second line lands in gold
        if (headlineLines.length > 0) {
          gsap.fromTo(
            headlineLines,
            { clipPath: 'inset(0 0 100% 0)' },
            {
              clipPath: 'inset(0 0 0% 0)',
              duration: 0.9,
              ease: 'expo.out',
              stagger: 0.12,
              scrollTrigger: { trigger: root, start: 'top 72%' },
            },
          );
        }
        // supporting stack rises — eyebrow, sub, actions, meta
        if (rising.length > 0) {
          gsap.fromTo(
            rising,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: 'expo.out',
              stagger: 0.09,
              scrollTrigger: { trigger: root, start: 'top 70%' },
            },
          );
        }
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <section className="ln-final" ref={rootRef} aria-label="نقطة البداية">
      <div className="ln-final-rings" aria-hidden="true">
        <span className="ln-final-ring r1">
          <span className="ln-final-node" />
        </span>
        <span className="ln-final-ring r2">
          <span className="ln-final-node" />
        </span>
        <span className="ln-final-ring r3">
          <span className="ln-final-node" />
        </span>
      </div>

      <div className="ln-final-inner">
        <span className="ln-ch-eyebrow ln-final-rise">// نقطة البداية</span>
        <h2 className="ln-final-title">
          <span className="ln-final-line">كلُّ رحلةٍ تبدأ نقطة.</span>
          <span className="ln-final-line ln-final-line-gold">مدارك بانتظارك.</span>
        </h2>
        <p className="ln-final-sub ln-final-rise">
          انضم بإيميلك الجامعي، وابدأ أوّل درس اليوم.
        </p>
        <div className="ln-final-actions ln-final-rise">
          <Link to="/auth" className="ln-btn-gold xl">
            ابدأ الآن مجانًا
          </Link>
          <Link to="/auth" className="ln-btn-ghost xl">
            تسجيل الدخول
          </Link>
        </div>
        <p className="ln-final-meta ln-final-rise">
          مجاني لطلبة وأعضاء هيئة التدريس · جامعة الزاوية
        </p>
      </div>
    </section>
  );
}
