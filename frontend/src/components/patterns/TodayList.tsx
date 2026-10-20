import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * TodayList — «ما ينتظرك اليوم» (عقد Agent S — r210).
 *
 * The dashboard's attention list: one flat surface of rows, each with an
 * urgency dot (now/soon/later — semantic status tokens, sr-only label),
 * optional leading slot, title (link when `to`), meta, and a trailing
 * action. Not a card grid — the row IS the interface. `emptyState` lets
 * the page pass its honest empty (defaults to nothing — the dashboard
 * composes the surrounding sections itself).
 */
export type TodayItem = {
  id: string;
  title: string;
  meta?: ReactNode;
  leading?: ReactNode;
  action?: ReactNode;
  to?: string;
  urgency?: 'now' | 'soon' | 'later';
};

const URGENCY_LABEL: Record<NonNullable<TodayItem['urgency']>, string> = {
  now: 'الآن',
  soon: 'قريبًا',
  later: 'لاحقًا',
};

export function TodayList({
  title,
  items,
  emptyState,
}: {
  title?: string;
  items: TodayItem[];
  emptyState?: ReactNode;
}) {
  return (
    <section className="pf-today" aria-label={title}>
      {title !== undefined && <h2 className="pf-today-title">{title}</h2>}
      {items.length === 0 ? (
        emptyState ?? null
      ) : (
        <ul className="pf-today-list">
          {items.map((item) => (
            <li key={item.id} className="pf-today-item">
              <span className={`pf-today-urgency ${item.urgency ?? 'later'}`} aria-hidden="true" />
              <span className="sr-only">{URGENCY_LABEL[item.urgency ?? 'later']}</span>
              {item.leading !== undefined && <span className="pf-today-leading">{item.leading}</span>}
              <span className="pf-today-body">
                {item.to !== undefined ? (
                  <Link to={item.to} className="pf-today-link">
                    {item.title}
                  </Link>
                ) : (
                  <span className="pf-today-title-text">{item.title}</span>
                )}
                {item.meta !== undefined && <span className="pf-today-meta">{item.meta}</span>}
              </span>
              {item.action !== undefined && <span className="pf-today-action">{item.action}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
