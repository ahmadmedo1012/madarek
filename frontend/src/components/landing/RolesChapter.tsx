import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * RolesChapter — «لمن هذه المنصّة» (chapters v4).
 *
 * Four hairline-separated rows, each a diptych: a GIANT stroked numeral
 * (Cairo 900, transparent fill, gold hairline stroke) against editorial
 * content (Cairo 800 role name + Plex description). Even rows mirror the
 * composition — numeral on the inline-end — so the ledger breathes instead
 * of stacking. The role quote stays hidden until the row is hovered or
 * focused, expanding via the grid-template-rows 0fr → 1fr trick + opacity
 * (400ms) — height animation with zero JS.
 *
 * · Rows are focusable (`tabIndex={0}`) so keyboard visitors get the quote
 *   too; the quote is decorative (kept in DOM — screen readers always have
 *   it, no aria-expanded bookkeeping needed).
 * · Scroll reveal (gsap + ScrollTrigger, scoped): header lines rise first,
 *   then the four rows stagger in 120ms apart (y:32 + opacity, expo-out).
 * · prefers-reduced-motion: gsap.matchMedia keeps everything visible —
 *   nothing is ever hidden in CSS, so no animation ⇒ final state.
 */

interface Role {
  /** giant stroked numeral — 01…04 */
  readonly n: string;
  readonly name: string;
  readonly desc: string;
  readonly quote: string;
}

/** Exact chapter copy — one platform, four constituencies. */
const ROLES: readonly Role[] = [
  {
    n: '01',
    name: 'الطالب',
    desc: 'تعلّم بإيقاعك: محاضرات تفاعلية، مصفوفة تتكيّف معك، وإنجاز يُرى.',
    quote: 'المحتوى قريب مني أكثر من أي وقت.',
  },
  {
    n: '02',
    name: 'الأستاذ',
    desc: 'ابنِ مقرّرك بنقاط فحص، وتابع فهم كل طالب لحظة بلحظة.',
    quote: 'أرى من توقّف وأين، قبل الامتحان لا بعده.',
  },
  {
    n: '03',
    name: 'الإدارة',
    desc: 'لوحات حقيقية: حضور، أداء، ومخاطر مبكرة لكل مقرّر.',
    quote: 'قرارات مبنية على بيانات، لا انطباعات.',
  },
  {
    n: '04',
    name: 'الجودة',
    desc: 'اعتماد يوثّق نفسه: تتبّع مستمر وتقارير جاهزة للتفتيش.',
    quote: 'كل ملف جاهز قبل أن يُطلب.',
  },
];

export default function RolesChapter() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const headLines = Array.from(
        root.querySelectorAll<HTMLElement>('.ln-roles-head [data-reveal]'),
      );
      const rows = Array.from(
        root.querySelectorAll<HTMLElement>('.ln-roles-row'),
      );

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (headLines.length > 0) {
          gsap.fromTo(
            headLines,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              ease: 'expo.out',
              stagger: 0.09,
              scrollTrigger: { trigger: root, start: 'top 75%' },
            },
          );
        }
        if (rows.length > 0) {
          gsap.fromTo(
            rows,
            { y: 32, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.85,
              ease: 'expo.out',
              stagger: 0.12,
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
    <section id="roles" className="ln-chapter ln-roles" aria-label="لمن هذه المنصّة">
      <header className="ln-roles-head">
        <span className="ln-ch-eyebrow" data-reveal>
          // الفصل الرابع — لمن هذه المنصّة
        </span>
        <h2 className="ln-roles-title" data-reveal>
          منصّة واحدة… أربعة أهلها
        </h2>
      </header>

      <ul className="ln-roles-list">
        {ROLES.map((role) => (
          <li className="ln-roles-row" tabIndex={0} key={role.n}>
            <span className="ln-roles-num" aria-hidden="true">
              {role.n}
            </span>
            <div className="ln-roles-body">
              <h3 className="ln-roles-name">{role.name}</h3>
              <p className="ln-roles-desc">{role.desc}</p>
              <div className="ln-roles-quote">
                <div className="ln-roles-quote-clip">
                  <p className="ln-roles-quote-text">«{role.quote}»</p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
