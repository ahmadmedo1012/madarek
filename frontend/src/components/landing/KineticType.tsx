import { useEffect, useRef } from 'react';

/**
 * KineticType — Arabic kinetic typography.
 *
 * Splits the headline into word spans that rise into place with a
 * music-like stagger (mask-reveal: each word starts clipped inside an
 * overflow-hidden line box and translates up with an expo-out ease).
 * Runs once when the element enters the viewport (or immediately if
 * already visible), then stays composed — text is never hidden while
 * reading. Reduced-motion / no-JS: words render fully in place.
 *
 * RTL note: words are split on spaces only — never mid-word — so Arabic
 * ligatures and diacritics are untouched. The stagger direction is
 * vertical, so RTL flow is preserved exactly.
 */
export function KineticType({
  text,
  className,
  as: Tag = 'span',
  delayMs = 0,
  stepMs = 110,
}: {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'span' | 'p' | 'div';
  delayMs?: number;
  stepMs?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const words = text.split(' ').filter(Boolean);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.querySelectorAll<HTMLElement>('.kt-w').forEach((w) => { w.style.transform = 'none'; w.style.opacity = '1'; });
      return;
    }
    const run = () => el.classList.add('kt-run');
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) { run(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [text]);

  return (
    <Tag ref={ref as never} className={`kt ${className ?? ''}`} aria-label={text}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="kt-w" aria-hidden="true"
          style={{ transitionDelay: `${delayMs + i * stepMs}ms` }}>
          {w}
        </span>
      ))}
    </Tag>
  );
}
