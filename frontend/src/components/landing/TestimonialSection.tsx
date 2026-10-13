/**
 * TestimonialSection (r153k / r153-D) — the landing's future slot for
 * authorized, named social proof.
 *
 * Renders NOTHING while the registry is empty (`testimonials.config.ts`
 * — the externally-blocked content, docs/16 هـ): unavailable content
 * never ships, and the page never pretends to have evidence it lacks.
 * When the registry fills, 2–3 cards land here in the 5-A1 act-6
 * «evidence with a face» slot (after the progress chapter), reusing the
 * established `.ln-stat` card skeleton + `.ln-role-quote` device +
 * `UserAvatar` — no new design language.
 */
import { TESTIMONIALS, type Testimonial } from '../../data/testimonials.config';

export function TestimonialSection() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section id="voices" className="ln-progress" aria-label="أصوات من المجتمع">
      {/* The card skeleton mirrors .ln-progress-stats; the quote device
          mirrors the roles section's .ln-role-quote. Filled only with
          consented, verbatim content (see testimonials.config.ts). */}
      <div className="ln-progress-stats">
        {TESTIMONIALS.slice(0, 3).map((t: Testimonial) => (
          <figure key={t.id} className="ln-stat">
            <blockquote className="ln-role-quote">«{t.quoteAr}»</blockquote>
            <figcaption className="ln-fact-label">
              {t.authorNameAr} — {t.roleLabelAr}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
