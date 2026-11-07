import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home, LogIn } from 'lucide-react';
import { Icon } from '../Icon';
import { Illustration } from '../illustrations/Illustration';
import type { MkIllustrationName } from '../illustrations/names';
/* R341 D5 — the error sheets' own thin seat sheet: the edge390 mobile
 * inset + the primary way-home's hover channels (the .nf-* scene
 * family itself lives in patterns.css and is not touched here). */
import '../../styles/errors.css';

/**
 * ErrorSheetPage — the routed error-sheet grammar (R320 cycle-3,
 * PAGES-GAP P2-3/4/5).
 *
 * NotFoundPage (/404) established the grammar: the full-bleed sheet
 * frame with mono corner marks, the grain film, the mk-ill scene, and
 * ONE primary way home plus secondary exits. /500, /403 and
 * /maintenance join the register through THIS shared component — one
 * definition per grammar rule, three thin pages on top (each its own
 * lazy chunk, like /404).
 *
 * r324 X10 — the `ERR [nnn]` mono eyebrow and the coordinates line
 * are RETIRED: coordinates/revision codes are not content — the
 * Arabic title carries the meaning alone. R341 D5 — the pattern
 * library's quiet kicker seat (pf-eyebrow) carries the sheet's own
 * tab-title word (never a code) above the title. R321 §A6 — the
 * corner plus-marks are empty spans; the glyph renders from CSS
 * ::before so it never leaks into innerText.
 */
export function ErrorSheetPage({
  title,
  lead,
  illustration,
  note,
  kicker,
  children,
}: {
  title: string;
  lead: string;
  illustration: MkIllustrationName;
  /** The quiet eyebrow above the title — the sheet's own tab-title
   * word (Arabic, never an ERR code — the r324 X10 law). */
  kicker: string;
  /** An optional honest secondary line (the maintenance story, the
   * 403 way-back). */
  note?: ReactNode;
  /** Extra action links (the primary way-home is always present). */
  children?: ReactNode;
}) {
  return (
    <main className="nf-shell nf-sheet">
      {/* §A6: empty spans — the '+' glyph is CSS ::before content, so
          the decorative marks never leak into innerText. */}
      <div className="nf-frame" aria-hidden="true">
        <span className="nf-mark nf-mark-tl" />
        <span className="nf-mark nf-mark-tr" />
        <span className="nf-mark nf-mark-bl" />
        <span className="nf-mark nf-mark-br" />
      </div>
      <div className="auth-grain" aria-hidden="true" />

      <div className="nf-scene">
        <div className="nf-illustration">
          <Illustration name={illustration} />
        </div>

        {/* R341 D5 — the pattern library's kicker seat: the sheet's
            own tab-title word, no code chrome (r324 X10 stands). */}
        <p className="pf-eyebrow">{kicker}</p>

        <h1 className="nf-title">{title}</h1>
        <p className="nf-sub">{lead}</p>
        {note && <p className="nf-sub">{note}</p>}

        <div className="nf-actions">
          <Link to="/" className="btn primary lg">
            <Icon icon={Home} size={16} />
            العودة إلى الرئيسية
          </Link>
          {children}
          <Link to="/auth" className="btn lg">
            <Icon icon={LogIn} size={16} />
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </main>
  );
}
