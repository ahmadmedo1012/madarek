import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import { colleges } from '../../data/colleges.config';
import { Icon } from '../Icon';

/**
 * CollegeConstellation — «كوكبة الكلّيّات» (Orbit Ink edition)
 *
 * The 25 real University of Zawia colleges (data/colleges.config.ts)
 * as a strict geometric orrery: six concentric, perfectly circular
 * domain rings in a square viewBox, every dot sitting exactly ON its
 * ring at an evenly computed angle. Desktop gets the full interactive
 * constellation (focusable nodes with tooltips); small screens get a
 * compact domain strip + the colleges popover trigger — the full sky
 * is too dense below 768px.
 *
 * Geometry discipline (round 3 · VLM craft pass — "Swiss, not clip-art"):
 * · Square 720×720 viewBox mounted in a square, aspect-locked layer —
 *   the rings can never render as anything but perfect circles:
 *   concentric, centered, radii on a single 36-unit module (66…246).
 * · Dots are pure trigonometry: ring radius + equal angular steps +
 *   one fixed phase per ring (RING_PHASE, tuned so no two rings share
 *   a ray). Zero jitter, zero scatter — identical on every render.
 * · Idle dots are one uniform cream at 0.5 alpha — a quiet, regular
 *   field. Lime is reserved for the single hovered/focused node (one
 *   pop); violet is retired from the sky entirely (it survives only
 *   as a legend color in the mobile domain strip).
 * · Rings stay static 1px hairlines at 0.09 alpha, finely dashed to
 *   read as an astro-chart track, `animation: none` so no CSS layer
 *   can ever restart a crawl.
 * · Nodes are real <button>s — keyboard focusable, aria-labelled,
 *   each carrying a guaranteed 44×44 hit area (inline, independent of
 *   any CSS dot resizing).
 * · Zero scroll/resize listeners, zero continuous animation, zero
 *   per-dot stagger or float — Swiss stillness. The entrance is the
 *   single group reveal LandingPage already wraps around this block.
 */

/** Hover pop — var()-chained to the Orbit Ink lime token with hex fallback. */
const DOT_LIME = 'var(--ln-lime, #DFEDB2)';
/** Idle paint — flat cream at half alpha (0.5, down from the old solid fills). */
const DOT_IDLE = 'rgba(245,243,231,0.5)';
/** Legend-only colors — used by the mobile domain strip, never in the sky. */
const DOT_VIOLET = 'var(--ln-violet, #7A6BF2)';
const DOT_CREAM = 'var(--ln-cream, #F5F3E7)';

/** Six knowledge domains — the grouping layer above the 25 colleges. */
const DOMAINS: Array<{ key: string; label: string; ring: number; color: string }> = [
  { key: 'tech', label: 'الهندسة والتقنية', ring: 0, color: DOT_LIME },
  { key: 'health', label: 'الطب والعلوم الصحية', ring: 1, color: DOT_VIOLET },
  { key: 'science', label: 'العلوم الأساسية', ring: 2, color: DOT_CREAM },
  { key: 'econ', label: 'الاقتصاد والإدارة', ring: 3, color: DOT_LIME },
  { key: 'arts', label: 'الآداب والتربية', ring: 4, color: DOT_VIOLET },
  { key: 'law', label: 'القانون والشريعة', ring: 5, color: DOT_CREAM },
];

/**
 * Faculty keys per domain, matched as full `<facultyKey>-…` slug
 * prefixes (the config scheme is `<facultyKey>-<cityKey>`). Matching
 * only the first hyphen segment silently misfiled five colleges —
 * oil-gas, natural-resources-engineering, natural-resources,
 * medical-technology and public-health all fell through to the
 * default ring and sat on the wrong orbit.
 */
const DOMAIN_KEYS: Array<[domain: string, keys: string[]]> = [
  ['tech', ['it', 'engineering', 'oil-gas', 'natural-resources-engineering', 'natural-resources']],
  ['health', ['medicine', 'dentistry', 'pharmacy', 'nursing', 'medical-technology', 'public-health', 'veterinary']],
  ['science', ['sciences', 'sports']],
  ['econ', ['economics']],
  ['arts', ['arts', 'education']],
  ['law', ['law', 'sharia-law']],
];

/** Map a college slug to its domain. */
function domainOf(slug: string): string {
  for (const [domain, keys] of DOMAIN_KEYS) {
    if (keys.some((k) => slug.startsWith(`${k}-`))) return domain;
  }
  return 'law';
}

type Node = {
  slug: string;
  name: string;
  city: string;
  domain: string;
  /** position on the square SVG stage, in viewBox units */
  x: number;
  y: number;
  ring: number;
};

/** Square stage side — a square viewBox is what keeps every ring a perfect circle. */
const SIZE = 720;
/** Shared center of all six rings. */
const CENTER = SIZE / 2;
/** Ring radii on a single 36-unit module: 66, 102, 138, 174, 210, 246. */
const RING_BASE = 66;
const RING_STEP = 36;
/**
 * Per-ring phase in degrees — the one global angular offset each ring
 * carries so its dots never stack radially on another ring's dots.
 * Hand-tuned once: with ring counts 5/7/3/2/6/2 these six phases keep
 * all 25 dots on distinct rays (closest pair 2.1° apart, on radii far
 * enough apart to read as separate).
 */
const RING_PHASE = [90, 0, 30, 60, 15, 105] as const;

/**
 * Static orbit ring treatment — 1px cream hairline at 0.09 alpha,
 * dashed to read as an astro-chart track, `animation: none` so the
 * retired dash crawl can never come back through CSS. Inline style
 * beats the stylesheet, keeping this scene still whatever the CSS
 * layer does.
 */
const RING_STYLE = {
  fill: 'none',
  stroke: 'rgba(245,243,231,0.09)',
  strokeWidth: 1,
  strokeDasharray: '2 7',
  animation: 'none',
} as const;

/**
 * The square drawing layer. The stage frame keeps its wide 1000/640
 * aspect (landing.css), so the sky itself is mounted as a centered
 * square: full stage height, 1/1 aspect ratio, horizontally centered.
 * The square viewBox then maps 1:1 onto it — rings stay perfectly
 * circular at any stage size, and DOM dot percentages land exactly on
 * the ring paths.
 */
const ORRERY_STYLE: CSSProperties = {
  position: 'absolute',
  insetBlock: 0,
  left: '50%',
  aspectRatio: '1 / 1',
  translate: '-50%',
};

/** Idle dot geometry — a 6×6px pin (3px radius), overriding the 13px CSS dot. */
const DOT_SIZE: CSSProperties = { inlineSize: 6, blockSize: 6 };

/** Guaranteed ≥44px touch target around each dot (mobile spec §4.3). */
const HIT_STYLE: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  inlineSize: 44,
  blockSize: 44,
  transform: 'translate(-50%, -50%)',
  borderRadius: '50%',
};

function buildConstellation(): { nodes: Node[]; rings: number[] } {
  // Six concentric circles on one radial module — ring i carries domain i.
  const rings = DOMAINS.map((_, i) => RING_BASE + i * RING_STEP);

  // Assign colleges to their domain ring.
  const byDomain = new Map<string, typeof colleges>();
  for (const c of colleges) {
    const d = domainOf(c.slug);
    const arr = byDomain.get(d) ?? [];
    arr.push(c);
    byDomain.set(d, arr);
  }

  // Even angular steps around each ring, rotated by the ring's fixed
  // phase. No jitter, no randomness — the composition is stable.
  const nodes: Node[] = [];
  for (const domain of DOMAINS) {
    const list = byDomain.get(domain.key) ?? [];
    const radius = rings[domain.ring]!;
    const phase = (RING_PHASE[domain.ring]! * Math.PI) / 180;
    list.forEach((c, i) => {
      const angle = phase + (i / list.length) * Math.PI * 2;
      nodes.push({
        slug: c.slug,
        name: c.nameAr,
        city: c.cityAr ?? '',
        domain: domain.key,
        x: CENTER + Math.cos(angle) * radius,
        y: CENTER + Math.sin(angle) * radius,
        ring: domain.ring,
      });
    });
  }
  return { nodes, rings };
}

export function CollegeConstellation({ onBrowse }: { onBrowse: () => void }) {
  const [active, setActive] = useState<Node | null>(null);
  const { nodes, rings } = useMemo(buildConstellation, []);
  const count = colleges.length;

  return (
    <div className="ln-constellation" data-count={count}>
      {/* ── Desktop: the full sky ─────────────────────────────────── */}
      <div className="ln-constellation-stage" aria-hidden={active ? undefined : 'true'}>
        <div className="ln-constellation-orrery" style={ORRERY_STYLE}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid meet" className="ln-constellation-svg" role="img" aria-label={`كوكبة ${count} كلية على ستة مدارات معرفية`}>{/* allow-emoji: bespoke scene SVG — six concentric orbit rings, not a Lucide icon slot */}
            {rings.map((r) => (
              <circle
                key={r}
                className="ln-constellation-ring"
                cx={CENTER}
                cy={CENTER}
                r={r}
                style={RING_STYLE}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {/* the college dots live in the DOM layer below — real
                buttons on the same square grid, so each one rides
                exactly on its ring path */}
          </svg>
          {/* labels are DOM (crisper Arabic, better a11y than <text>) */}
          {nodes.map((n) => (
            <button
              key={n.slug}
              type="button"
              className="ln-constellation-dot"
              style={
                {
                  left: `${(n.x / SIZE) * 100}%`,
                  top: `${(n.y / SIZE) * 100}%`,
                  '--dot': active?.slug === n.slug ? DOT_LIME : DOT_IDLE,
                  ...DOT_SIZE,
                } as CSSProperties
              }
              aria-label={`${n.name}${n.city ? ` — ${n.city}` : ''}`}
              onMouseEnter={() => setActive(n)}
              onFocus={() => setActive(n)}
              onMouseLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              onClick={onBrowse}
            >
              <span aria-hidden style={HIT_STYLE} />
            </button>
          ))}
          {active && (
            <span
              className="ln-constellation-tip"
              style={{ left: `${(active.x / SIZE) * 100}%`, top: `${(active.y / SIZE) * 100}%` }}
              role="status"
            >
              <b>{active.name}</b>
              {active.city && <i>{active.city}</i>}
            </span>
          )}
        </div>
      </div>

      {/* ── Mobile: compact domain strip ──────────────────────────── */}
      <ul className="ln-constellation-strip">
        {DOMAINS.map((d) => (
          <li key={d.key} className="ln-constellation-chip" style={{ '--dot': d.color } as CSSProperties}>
            <span className="ln-constellation-chip-dot" aria-hidden />
            <span className="ln-constellation-chip-label">{d.label}</span>
            <span className="ln-constellation-chip-count">
              {nodes.filter((n) => n.domain === d.key).length}
            </span>
          </li>
        ))}
      </ul>

      <div className="ln-constellation-cta">
        <span className="ln-mono">{String(count).padStart(2, '0')} كلية · جامعة الزاوية</span>
        <button type="button" className="ln-constellation-browse" onClick={onBrowse}>
          تصفّح الكلّيّات
          <Icon icon={ArrowLeft} size={14} />
        </button>
      </div>
    </div>
  );
}
