/* P2-0 (r335 split) — [2] البيان — the statement (the reference's
 * home-intro): R322 (2-c) — the measured 6+6 split transplant. The square
 * ink art cell rides inline-start (right in RTL — the reading
 * start, exactly the reference's LEFT cell mirrored); the
 * body column rides inline-end behind a 1px hairline on its
 * inline-start edge, holding ONLY the scrub-revealed manifesto
 * + one CTA (content pad 6.4/15/3.2/15rem — the 15rem side
 * gutter is the band's whole personality), closed by the
 * partner strip (the documented-universities crawl in the
 * reference's label-row + logo-track + desc anatomy). The
 * capabilities crawl and the three persona rows RETIRE from
 * the band (§6: ONE statement, no orphan text — the honest
 * disclosure lives in the pains answers + /capabilities, the
 * personas are the roles band's own).
 *
 * Presentational: the scrub driver (the --wr-p writer) stays in the
 * composer (pages/LandingPage.tsx) on the shared sheet clock — this
 * component receives the section + title refs it measures. */
import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { StatementArt } from '../StatementArt';
import { ScrubReveal } from '../journey/WordReveal';
import { RevealCssClass } from '../../../hooks/useReveal';

/* ── The statement (R322 · 2-c — the Heron home-intro transplant): the
 * manifesto the scrub-title carries. Same role/length class as the
 * reference's 127-char intro statement (≈6 scrub lines @1440), honest —
 * the four clauses name the four live capabilities (lecture · grading ·
 * mastery · research), the closing pair the honest registry claim. */
const STATEMENT_TEXT =
  'منصّة واحدة تدير الرحلة كلها: المحاضرة تُبنى وتُقاس، والواجب يُصحّح ويُعاد، ' +
  'والإتقان يُرسَم مفهومًا مفهومًا، والبحث يُفهرَس ويبقى. سجلّ واحد للقسم والكلية — يعمل اليوم، ويكبر مع كل فصل.';

/* ── The r307 media truth: distinct Libyan universities documented —
 * Benghazi, Tripoli, Omar Al-Mukhtar (photos) + Misurata, Sebha
 * (official-channel videos). Computed here, not invented: each
 * institution has verified identity evidence in manifest.json. The
 * documentary media itself lives on /campus (R313); the list feeds the
 * universities ticker below. R323 (A3 · defect 8): the numeric count
 * that rode the removed CTA metadata ledger retires with it — the
 * named crawl carries the truth without a bare stat. */
const DOCUMENTED_UNIVERSITIES = [
  'جامعة بنغازي',
  'جامعة طرابلس',
  'جامعة عمر المختار',
  'جامعة مصراتة',
  'جامعة سبها',
] as const;

interface StatementProps {
  /* the section element — the composer's scrub driver writes --wr-p on it */
  sectionRef: RefObject<HTMLElement>;
  /* the scrub title h2 — the composer's useSheetScroll seat measures it */
  titleRef: RefObject<HTMLHeadingElement>;
}

export function Statement({ sectionRef, titleRef }: StatementProps) {
  return (
    <section id="statement" className="st-section" ref={sectionRef} aria-labelledby="statement-title">
      <div className="st-grid">
        {/* the art cell — the square massing study fills the 6-col
            cell edge to edge (the reference's 1766×1766 contain
            equivalent) at EVERY breakpoint (its aspect drives the
            tablet/phone band exactly like Heron's own img). */}
        <div className="st-art-cell">
          <StatementArt />
        </div>

        {/* the body column — the manifesto cell over the partner
            strip (the reference's own two-row stack, pinned to the
            column's bottom edge). */}
        <div className="st-body-col">
          <RevealCssClass as="div" className="st-body" delay={2}>
            <span className="fo-label"><span className="fo-mono" dir="ltr">[02]</span> البيان</span>
            <h2 id="statement-title" className="st-title" ref={titleRef}>
              <ScrubReveal text={STATEMENT_TEXT} className="st-scrub" />
            </h2>
            <a href="#live" className="btn ghost st-cta">
              شاهد التحديات
              <Icon icon={ArrowLeft} size={14} aria-hidden="true" />
            </a>
          </RevealCssClass>

          {/* the partner strip — the reference's label row + logo
              track + desc. OUR figures are the documented
              universities (the same honest crawl grammar, now with
              the dashed separators between the cells); the desc
              carries the media-disclosure line. */}
          <RevealCssClass as="div" className="st-partner" delay={3}>
            <div className="st-partner-row">
              <span className="st-partner-label fo-mono" dir="ltr">UNIVERSITIES</span>
            </div>
            <div className="fo-ticker st-partner-track" aria-label="جامعات ليبية موثّقة في الوسائط">
              <div className="fo-ticker-track" aria-hidden="false">
                {DOCUMENTED_UNIVERSITIES.map((u, i) => (
                  <span key={u} className="fo-ticker-item">
                    <span className="fo-mono" dir="ltr">[U{String(i + 1).padStart(2, '0')}]</span>
                    {u}
                  </span>
                ))}
              </div>
              <div className="fo-ticker-track" aria-hidden="true">
                {DOCUMENTED_UNIVERSITIES.map((u, i) => (
                  <span key={u} className="fo-ticker-item">
                    <span className="fo-mono" dir="ltr">[U{String(i + 1).padStart(2, '0')}]</span>
                    {u}
                  </span>
                ))}
              </div>
            </div>
            <p className="st-partner-desc">
              توثيق وسائط لا شراكة — الصور والقنوات الرسمية لهذه الجامعات في
              <Link to="/campus" className="fo-text-link">صفحة الحرم الجامعي</Link>.
            </p>
          </RevealCssClass>
        </div>
      </div>
    </section>
  );
}
