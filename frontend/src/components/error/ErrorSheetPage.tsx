import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home, LogIn } from 'lucide-react';
import { Icon } from '../Icon';
import { Illustration } from '../illustrations/Illustration';
import type { MkIllustrationName } from '../illustrations/names';

/**
 * ErrorSheetPage — the routed error-sheet grammar (R320 cycle-3,
 * PAGES-GAP P2-3/4/5).
 *
 * NotFoundPage (/404) established the grammar: the full-bleed sheet
 * frame with mono corner marks, the grain film, the mk-ill scene, the
 * `ERR [nnn]` mono eyebrow over the Arabic title, the faint
 * coordinates line, and ONE primary way home plus secondary exits.
 * /500, /403 and /maintenance join the register through THIS shared
 * component — one definition per grammar rule, three thin pages on
 * top (each its own lazy chunk, like /404).
 *
 * R321 §A5 — the code reads ONCE: the visible mono eyebrow is the
 * single carrier (not aria-hidden, no sr-only twin — the R320 pair
 * put the same string in innerText twice); the coordinates line
 * carries the page's own mono WORD (SERVER FAULT, ACCESS DENIED…),
 * never the code again. R321 §A6 — the corner plus-marks are empty
 * spans; the glyph renders from CSS ::before so it never leaks into
 * innerText (aria-hidden alone does NOT remove text from innerText).
 */
export function ErrorSheetPage({
  code,
  coords,
  title,
  lead,
  illustration,
  note,
  children,
}: {
  /** e.g. 'ERR [500]' — mono, LTR, uppercase. THE one visible code. */
  code: string;
  /** The coordinates line's own mono word (e.g. 'SERVER FAULT') —
   * never the code again (§A5: show the code once). */
  coords: string;
  title: string;
  lead: string;
  illustration: MkIllustrationName;
  /** An optional honest secondary line (the maintenance story, the
   * 403 way-back). */
  note?: ReactNode;
  /** Extra action links (the primary way-home is always present). */
  children?: ReactNode;
}) {
  return (
    <main className="nf-shell">
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

        {/* §A5: ONE carrier — the visible eyebrow announces the code
            exactly once (aria-hidden removed; the sr-only twin deleted
            so innerText never repeats it). */}
        <span className="nf-eyebrow" dir="ltr">{code}</span>

        <h1 className="nf-title">{title}</h1>
        <p className="nf-sub">{lead}</p>
        {note && <p className="nf-sub">{note}</p>}

        <span className="nf-coords" aria-hidden="true" dir="ltr">
          [0,0] &middot; {coords} &middot; MADAREK
        </span>

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
