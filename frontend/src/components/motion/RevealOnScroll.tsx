import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * RevealOnScroll — IntersectionObserver-based entrance animation.
 * Adds `.in-view` class when element enters viewport, triggering
 * CSS transitions (see polish.css `.reveal-up`, `.stagger-grid`).
 *
 * Usage:
 *   <RevealOnScroll delay={0}>
 *     <div className="reveal-up">Content</div>
 *   </RevealOnScroll>
 *
 *   <RevealOnScroll stagger>
 *     <div className="stagger-grid"><Card />...<Card /></div>
 *   </RevealOnScroll>
 */
export function RevealOnScroll({
  children,
  delay = 0,
  threshold = 0.15,
  rootMargin = '0px 0px -50px 0px',
  stagger = false,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  threshold?: number;
  rootMargin?: string;
  stagger?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setTimeout(() => setInView(true), delay);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
