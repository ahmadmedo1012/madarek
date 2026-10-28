import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft, Info } from 'lucide-react';
/* R321 (c1 · WP-B2) — the §B2 kit: the mono-indexed section title
 * bar, the honest mono count + the hatched empty cell. */
import { SectionBar, BarCount, EmptyCell } from '../../components/student';
import { ErrorState, Skeleton } from '../../components/primitives/States';
import { PageFrame, PageHeader, RowList, RowItem } from '../../components/patterns';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useFaculties, useCurrentInstitutionSlug } from '../../hooks/useResources';
import { formatNum } from '../../utils/numbers';

/* R305 Heron: the shared student vocabulary + this family's refinements. */
import '../../styles/r305-student.css';
import '../../styles/r305-student-supplemental.css';
/* R319 (c3-S2): the sheet system — the §B2 anatomy every converted
 * student page mounts (SectionBar/BarCount/EmptyCell + the family's
 * unlayered masthead tail precedent). */
import '../../styles/r319-student.css';
/* R321 (c1 · WP-B2): the map/live family's own harmonics — the
 * .r321m-page opt-in root + the inner-scale masthead re-seat (the
 * r321-exams.css contract); family-unique rules only. */
import '../../styles/r321-map-live.css';

/**
 * Honest campus directory.
 *
 * The previous CampusMapPage rendered 8 invented buildings with fake
 * x/y coordinates (removed in the honesty purge — a pan/zoom campus
 * map needs building data the platform does not track). The "map"
 * moment is the city-footprint band below: real faculty counts per
 * city derived from the /faculties payload, doubling as the directory
 * filter. A true interactive campus map remains a facilities-data
 * follow-up (see the note at the bottom of the page).
 *
 * R321 (c1 · WP-B2) — the page joins the sheet system: the Card walls
 * are gone (the band/contact boards are §B2 title bars + rows on the
 * page paper); the campus-city-* band ART keeps its student.css
 * anatomy verbatim — only the frame around it converted.
 */

/** Arabic counted-noun forms for the counts on this page:
 *  1 → singular, 2 → dual, 3–10 → plural, 11+ → singular accusative. */
function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${formatNum(n)} ${few}`;
  return `${formatNum(n)} ${many}`;
}

export default function CampusMapPage() {
  const facs = useFaculties(useCurrentInstitutionSlug()); // r180: caller-institution scoping
  const faculties = facs.data ?? [];
  const [city, setCity] = useState<string>('all');

  /* City footprint — real counts from the faculties payload, sorted by
     actual footprint size (the old page sorted cities by a hardcoded
     list; every value below is derived from live data). */
  const cityStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of facs.data ?? []) counts.set(f.city, (counts.get(f.city) ?? 0) + 1);
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'));
  }, [facs.data]);
  const maxCount = cityStats[0]?.count ?? 1;

  const visible = city === 'all' ? faculties : faculties.filter((f) => f.city === city);

  return (
    /* R321 (c1 · WP-B2) — the page joins the sheet system: ONE
     * .r321m-page opt-in root (the r321-exams.css contract — the
     * inner-page masthead re-seat keys off it). The shell owns the
     * frame + grain + the SHEET line; the patterns PageHeader owns
     * the one display h1 at the inner rung. */
    <div className="r321m-page">
    <PageFrame width="default">
      <PageHeader
        index="01"
        eyebrow="خدمات الجامعة"
        title="دليل الحرم الجامعيّ"
        description={
          'كلّيّات جامعة مدارك التجريبية بحسب الحرم، مع روابط لصفحاتها التفصيليّة — بيانات عرض اصطناعية.'
        }
      />

      {/* [02] the campus "map" — an honest footprint band (real counts
          per city; the bar length is proportional to the faculty
          count) that doubles as the directory filter. This band is
          the page's authored moment: the bars grow in on entrance.
          R321 B2: only the Card WALL around it retired — the band sits
          on the page paper under its own §B2 bar, its campus-city-*
          ART untouched. */}
      <section className="ml-sec" aria-labelledby="map-sec-footprint">
        <SectionBar
          index="02"
          title="انتشار الكليّات على المدن"
          id="map-sec-footprint"
          meta={
            !facs.isPending && !facs.isError && faculties.length > 0 ? (
              <BarCount
                n={faculties.length}
                srLabel={arCount(faculties.length, 'كلّيّة واحدة', 'كلّيّتان', 'كليّات', 'كلّيّة')}
              />
            ) : undefined
          }
        />
        <p className="ml-sec-note">طول كل شريط يتناسب مع عدد الكليّات المسجَّلة في المدينة — انقر مدينة لتصفية الدليل.</p>
        {facs.isPending ? (
          <div className="flex-col gap-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div className="campus-skel-row" key={i} aria-hidden>
                <Skeleton width={84} height={13} />
                <Skeleton width={`${72 - i * 14}%`} height={8} rounded="var(--r-full)" />
                <Skeleton width={26} height={13} />
              </div>
            ))}
          </div>
        ) : facs.isError ? (
          <ErrorState
            message="تعذَّر تحميل قائمة الكليّات"
            error={facs.error}
            onRetry={() => facs.refetch()}
          />
        ) : (
          <div className="campus-city-list" role="group" aria-label="تصفية الكليّات حسب المدينة">
            <button
              type="button"
              className={`campus-city-row${city === 'all' ? ' on' : ''}`}
              aria-pressed={city === 'all'}
              onClick={() => setCity('all')}
            >
              <span className="campus-city-name">جميع المدن</span>
              <span className="campus-city-track" aria-hidden>
                <span className="campus-city-fill" style={{ inlineSize: '100%' }} />
              </span>
              <span className="campus-city-count">{formatNum(faculties.length)}</span>
            </button>
            {cityStats.map((c, i) => (
              <button
                key={c.name}
                type="button"
                className={`campus-city-row${city === c.name ? ' on' : ''}`}
                aria-pressed={city === c.name}
                style={{ ['--city-i' as never]: i + 1 }}
                onClick={() => setCity(c.name)}
              >
                <span className="campus-city-name">{c.name}</span>
                <span className="campus-city-track" aria-hidden>
                  <span
                    className="campus-city-fill"
                    style={{ inlineSize: `${Math.max(8, Math.round((c.count / maxCount) * 100))}%` }}
                  />
                </span>
                <span className="campus-city-count">{formatNum(c.count)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* [03] Directory — the band above owns the error state, so this
          section only renders its honest empty state with data loaded.
          R304: the grid of link tiles became a RowList of whole-row
          links (`to` — the 44px row IS the tap target; the city and
          department count ride the meta line, never nested
          interactives). R321 B2: the SectionHeader became the §B2
          title bar (the honest filtered count as mono meta), and the
          city rides a bdi-isolated text run with hairline separators
          (the purple Badge pill retired with the Card walls). */}
      {facs.isError ? null : (
        <section className="ml-sec" aria-labelledby="map-sec-directory">
          <SectionBar
            index="03"
            title={city === 'all' ? 'جميع الكليّات' : `كلّيّات ${city}`}
            id="map-sec-directory"
            meta={
              facs.isSuccess ? (
                <BarCount
                  n={visible.length}
                  srLabel={arCount(visible.length, 'كلّيّة واحدة', 'كلّيّتان', 'كليّات', 'كلّيّة')}
                />
              ) : undefined
            }
          />
          <RowList
            loading={facs.isPending}
            aria-label="دليل الكليّات"
            empty={
              /* R321 B2 — the empty filter bucket is the sheet's
                 reserved-but-empty region: the hatched EmptyCell, same
                 honest copy. */
              <EmptyCell
                label="لا توجد كلّيّات في هذه المدينة"
                note="جرِّب اختيار مدينة أخرى من انتشار الكليّات الأعلى."
              />
            }
          >
            {visible.map((f) => (
              <RowItem
                key={f.id}
                to={`/colleges/${f.id}`}
                leading={
                  <span style={{ color: 'var(--accent)' }} aria-hidden>
                    <EmojiIcon emoji={f.iconEmoji ?? '🏛️'} size={20} />
                  </span>
                }
                title={f.name}
                meta={
                  <span className="r305s-meta-row">
                    <bdi>{f.city}</bdi>
                    <span className="r305s-meta-sep" aria-hidden />
                    {arCount(f.departments.length, 'قسم واحد', 'قسمان', 'أقسام', 'قسماً')}
                  </span>
                }
              />
            ))}
          </RowList>
        </section>
      )}

      {/* [04] Contact — the fact-tile wall became hairline rows on the
          page paper (label rung + mono LTR values); the honest
          map-in-development note keeps its campus-map-note family. */}
      <section className="ml-sec" aria-labelledby="map-sec-contact">
        <SectionBar index="04" title="معلومات التواصل" id="map-sec-contact" />
        <div className="ml-facts">
          <div className="ml-fact">
            <span className="ml-fact-label">الهاتف</span>
            <span className="ml-fact-values">
              <bdi dir="ltr" className="font-mono text-sm">+218 23 762659</bdi>
              <bdi dir="ltr" className="font-mono text-sm">+218 23 762882</bdi>
            </span>
          </div>
          <div className="ml-fact">
            <span className="ml-fact-label">البريد الإلكتروني</span>
            <span className="ml-fact-values">
              <bdi dir="ltr" className="font-mono text-sm">info@demo.madarek.ly</bdi>
              <bdi dir="ltr" className="font-mono text-sm">ico@demo.madarek.ly</bdi>
            </span>
          </div>
        </div>

        <div className="campus-map-note">
          <Icon icon={Info} size={14} style={{ flexShrink: 0, marginBlockStart: 'var(--sp-0-5)' }} />
          <span>
            خريطة الحرم التفاعليّة قيد التطوير. حاليّاً يمكنك الاطّلاع على المواقع الفعليّة عبر الموقع
            الرسميّ:{' '}
            <a href="https://demo.madarek.ly" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              demo.madarek.ly <Icon icon={ExternalLink} size={11} />
            </a>
          </span>
        </div>
      </section>

      {/* R305 Heron: a card holding one link is box noise — the
          cross-link rides the copper rail instead. */}
      <div className="r305s-next r305p-rail">
        <Link to="/student/university" className="btn primary sm">
          <Icon icon={ArrowLeft} size={13} />
          صفحة الجامعة التجريبية الكاملة
        </Link>
      </div>
    </PageFrame>
    </div>
  );
}
