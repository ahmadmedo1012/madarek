import { useMemo, useState } from 'react';
import { colleges } from '../../data/colleges.config';

/**
 * CollegeConstellation — «كوكبة الكلّيّات»
 *
 * The 25 real University of Zawia colleges (data/colleges.config.ts)
 * arranged as glowing nodes on six domain orbits. Desktop gets the
 * full interactive constellation (focusable nodes with tooltips);
 * small screens get a compact domain strip + the colleges popover
 * trigger — the full sky is too dense below 768px.
 *
 * Craft notes:
 * · Nodes are real <button>s — keyboard focusable, aria-described.
 * · Orbit rings carry a slow travelling dash light (CSS), never moving
 *   the nodes themselves (targets must not chase the pointer).
 * · The system is decorative-but-informative: hovering/focusing a node
 *   reveals the real college name; the CTA opens the real popover.
 */

/** Six knowledge domains — the grouping layer above the 25 colleges. */
const DOMAINS: Array<{ key: string; label: string; ring: number; color: string }> = [
  { key: 'tech', label: 'الهندسة والتقنية', ring: 0, color: '#E9B44C' },
  { key: 'health', label: 'الطب والعلوم الصحية', ring: 1, color: '#6FA8FF' },
  { key: 'science', label: 'العلوم الأساسية', ring: 2, color: '#8E97B8' },
  { key: 'econ', label: 'الاقتصاد والإدارة', ring: 3, color: '#E9B44C' },
  { key: 'arts', label: 'الآداب والتربية', ring: 4, color: '#6FA8FF' },
  { key: 'law', label: 'القانون والشريعة', ring: 5, color: '#8E97B8' },
];

/** Map a college slug to its domain. */
function domainOf(slug: string): string {
  const f = slug.split('-')[0]!;
  if (['engineering', 'it', 'oil-gas', 'natural-resources-engineering', 'natural-resources'].includes(f)) return 'tech';
  if (['medicine', 'dentistry', 'pharmacy', 'nursing', 'medical-technology', 'public-health', 'veterinary'].includes(f)) return 'health';
  if (['sciences', 'sports'].includes(f)) return 'science';
  if (['economics'].includes(f)) return 'econ';
  if (['arts', 'education'].includes(f)) return 'arts';
  return 'law'; // law, sharia-law
}

type Node = {
  slug: string;
  name: string;
  city: string;
  domain: string;
  /** position on the SVG stage */
  x: number;
  y: number;
  ring: number;
  color: string;
};

const W = 1000;
const H = 640;

function buildConstellation(): { nodes: Node[]; rings: Array<{ cx: number; cy: number; rx: number; ry: number; rot: number }> } {
  // Domain orbit rings — layered ellipses, tilted like the hero scene.
  const rings = [
    { cx: W * 0.5, cy: H * 0.52, rx: W * 0.3, ry: H * 0.19, rot: -0.34 },
    { cx: W * 0.5, cy: H * 0.52, rx: W * 0.38, ry: H * 0.26, rot: -0.3 },
    { cx: W * 0.5, cy: H * 0.52, rx: W * 0.46, ry: H * 0.33, rot: -0.26 },
    { cx: W * 0.5, cy: H * 0.52, rx: W * 0.3, ry: H * 0.19, rot: 0.36 },
    { cx: W * 0.5, cy: H * 0.52, rx: W * 0.38, ry: H * 0.26, rot: 0.3 },
    { cx: W * 0.5, cy: H * 0.52, rx: W * 0.46, ry: H * 0.33, rot: 0.26 },
  ];

  // Assign colleges to their domain ring, spread evenly with a per-ring
  // deterministic offset so the composition stays stable between renders.
  const byDomain = new Map<string, typeof colleges>();
  for (const c of colleges) {
    const d = domainOf(c.slug);
    const arr = byDomain.get(d) ?? [];
    arr.push(c);
    byDomain.set(d, arr);
  }

  const nodes: Node[] = [];
  for (const domain of DOMAINS) {
    const list = byDomain.get(domain.key) ?? [];
    const ring = rings[domain.ring]!;
    list.forEach((c, i) => {
      const t = list.length === 1 ? 0.3 : i / list.length;
      const angle = t * Math.PI * 2 + domain.ring * 0.7;
      const px = Math.cos(angle) * ring.rx;
      const py = Math.sin(angle) * ring.ry;
      const cos = Math.cos(ring.rot);
      const sin = Math.sin(ring.rot);
      nodes.push({
        slug: c.slug,
        name: c.nameAr,
        city: c.cityAr ?? '',
        domain: domain.key,
        x: ring.cx + px * cos - py * sin,
        y: ring.cy + px * sin + py * cos,
        ring: domain.ring,
        color: domain.color,
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
        <svg viewBox={`0 0 ${W} ${H}`} className="ln-constellation-svg" role="img"
          aria-label={`كوكبة ${count} كلية على ستة مدارات معرفية`}>
          {rings.map((r, i) => (
            <ellipse
              key={i}
              className="ln-constellation-ring"
              cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry}
              transform={`rotate(${(r.rot * 180) / Math.PI} ${r.cx} ${r.cy})`}
            />
          ))}
          {/* node glows live in the DOM layer below — the SVG carries the
              orbital tracks only, so every dot reads as riding its ring */}
        </svg>
        {/* labels are DOM (crisper Arabic, better a11y than <text>) */}
        {nodes.map((n) => (
          <button
            key={n.slug}
            type="button"
            className="ln-constellation-dot"
            style={{ left: `${(n.x / W) * 100}%`, top: `${(n.y / H) * 100}%`, '--dot': n.color } as React.CSSProperties}
            aria-label={`${n.name}${n.city ? ` — ${n.city}` : ''}`}
            onMouseEnter={() => setActive(n)}
            onFocus={() => setActive(n)}
            onMouseLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            onClick={onBrowse}
          />
        ))}
        {active && (
          <span
            className="ln-constellation-tip"
            style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100}%` }}
            role="status"
          >
            <b>{active.name}</b>
            {active.city && <i>{active.city}</i>}
          </span>
        )}
      </div>

      {/* ── Mobile: compact domain strip ──────────────────────────── */}
      <ul className="ln-constellation-strip">
        {DOMAINS.map((d) => (
          <li key={d.key} className="ln-constellation-chip" style={{ '--dot': d.color } as React.CSSProperties}>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M11 5l-7 7 7 7M4 12h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
