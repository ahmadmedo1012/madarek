import { useEffect, useMemo, useRef } from 'react';
import { colleges } from '../../data/colleges.config';
import { Icon } from '../Icon';
import { Compass, ArrowLeft, MapPin } from 'lucide-react';

/**
 * HorizonRail — «مدارات الأفق» the colleges pan act.
 *
 * Six real knowledge domains (the grouping above the 25 real UoZ
 * colleges, data/colleges.config.ts) as orbital stations on a horizontal
 * sky-meridian. The chapter heading rides INSIDE the rail as its first
 * (right-most, RTL) wagon and a closing CTA is its last — the rail is
 * the navigation, so it must have somewhere to arrive.
 *
 * · Desktop: the section is a pinned act (~300vh); the rail's travel is
 *   driven by the act's scroll progress (`--p` written by useActProgress
 *   on the section, consumed here via CSS calc — one transform, no JS
 *   per frame). Item stagger floors at 0.55 opacity so arriving cards
 *   read as arriving, not as failing to load.
 * · Mobile / reduced-motion / narrow: the same rail becomes a native
 *   overflow-x scroll region with snap points — every college stays
 *   reachable with a thumb, no motion required.
 * · The numbers on the cards are real: each station lists its true
 *   college count and true sample names from the registry.
 */

const DOMAINS: Array<{ key: string; label: string; color: string; note: string }> = [
  { key: 'tech', label: 'الهندسة والتقنية', color: 'gold', note: 'من البترول إلى الشبكات' },
  { key: 'health', label: 'الطب والعلوم الصحية', color: 'azure', note: 'سبع كليات علاجية' },
  { key: 'science', label: 'العلوم الأساسية', color: 'mist', note: 'من المختبر إلى الملعب' },
  { key: 'econ', label: 'الاقتصاد والإدارة', color: 'gold', note: 'حساب وإدارة ومحاسبة' },
  { key: 'arts', label: 'الآداب والتربية', color: 'azure', note: 'لغة وتربية ومجتمع' },
  { key: 'law', label: 'القانون والشريعة', color: 'mist', note: 'العدل أصالةً ومستقبلًا' },
];

function domainOf(slug: string): string {
  const f = slug.split('-')[0] ?? '';
  if (['engineering', 'it', 'oil-gas', 'natural-resources-engineering', 'natural-resources'].includes(f)) return 'tech';
  if (['medicine', 'dentistry', 'pharmacy', 'nursing', 'medical-technology', 'public-health', 'veterinary'].includes(f)) return 'health';
  if (['sciences', 'sports'].includes(f)) return 'science';
  if (['economics'].includes(f)) return 'econ';
  if (['arts', 'education'].includes(f)) return 'arts';
  return 'law';
}

export function HorizonRail({ onBrowse }: { onBrowse: () => void }) {
  const railRef = useRef<HTMLDivElement | null>(null);

  // Measure the rail's true overflow → --travel on the act element (px).
  // RTL: content overflows to the LEFT, so revealing it means translating
  // the rail to the RIGHT by (scrollWidth − viewport). Measured, never
  // assumed — a rail narrower than the viewport must travel exactly 0.
  useEffect(() => {
    const rail = railRef.current;
    const act = rail?.closest('[data-act]') as HTMLElement | null;
    if (!rail || !act) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const measure = () => {
      const desktop = window.matchMedia('(min-width: 1024px)').matches;
      if (!desktop || reduced) {
        act.style.setProperty('--travel', '0px');
        return;
      }
      const overflow = rail.scrollWidth - rail.clientWidth;
      act.style.setProperty('--travel', `${Math.max(0, overflow)}px`);
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(rail);
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const stations = useMemo(() => {
    return DOMAINS.map((d) => {
      const list = colleges.filter((c) => domainOf(c.slug) === d.key);
      return {
        ...d,
        count: list.length,
        sample: list.slice(0, 4).map((c) => c.nameAr),
        cities: Array.from(new Set(list.map((c) => c.cityAr ?? ''))).filter(Boolean).slice(0, 3),
      };
    }).filter((s) => s.count > 0);
  }, []);

  return (
    <div className="hr-act" data-act="pan">
      {/* the meridian — a faint ruled horizon the stations travel along */}
      <div className="hr-meridian" aria-hidden>
        <span className="hr-meridian-line" />
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="hr-meridian-tick" style={{ ['--i' as string]: i }} />
        ))}
      </div>

      <div className="hr-rail" dir="rtl" ref={railRef}>
        {/* first wagon: the chapter itself (earns its width in the rail) */}
        <header className="hr-head">
          <p className="ln-mono hr-eyebrow">الفصل الأول · الاكتشاف</p>
          <h2 className="hr-title">
            ستةُ مداراتٍ <em>لِمَعارفٍ</em> لا تنتهي
          </h2>
          <p className="hr-lede">
            {colleges.length} كليةً حقيقية تنتظم في ستة مدارات — اسحب الأفق
            أو مرِّر لتجتاز المدارات واحدًا واحدًا.
          </p>
        </header>

        {stations.map((s, i) => (
          <article
            key={s.key}
            className={`hr-station tone-${s.color}`}
            style={{ ['--i' as string]: i }}
          >
            <span className="hr-node" aria-hidden>
              <span className="hr-node-ring" />
              <span className="hr-node-core" />
              <span className="hr-node-sat" />
            </span>
            <span className="hr-count ln-mono">{String(s.count).padStart(2, '0')}<small>كلية</small></span>
            <h3 className="hr-name">{s.label}</h3>
            <p className="hr-note">{s.note}</p>
            <ul className="hr-sample">
              {s.sample.map((n) => (
                <li key={n}>{n}</li>
              ))}
              {s.count > s.sample.length && (
                <li className="hr-more ln-mono">+{s.count - s.sample.length}</li>
              )}
            </ul>
            <p className="hr-cities">
              <Icon icon={MapPin} size={12} />
              {s.cities.join(' · ')}
            </p>
          </article>
        ))}

        {/* last wagon: arrival — the real registry */}
        <footer className="hr-cta">
          <span className="hr-cta-orbit" aria-hidden />
          <p className="ln-mono">السجلّ الكامل</p>
          <h3 className="hr-cta-title">كلُّ الكليّات،<br />مدينتك، مقرراتك</h3>
          <button type="button" className="ln-btn-gold sm" onClick={onBrowse}>
            <Icon icon={Compass} size={15} />
            افتح السجلّ
            <Icon icon={ArrowLeft} size={14} />
          </button>
        </footer>
      </div>
    </div>
  );
}
