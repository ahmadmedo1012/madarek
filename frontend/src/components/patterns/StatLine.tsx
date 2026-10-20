import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * StatLine — شريط أرقام مضغوط (عقد Agent S — r210).
 *
 * The calm replacement for KPI-card walls: one flat line of label-over-
 * value stats, no icon wells, no tiles. `tone` recolors the VALUE only
 * (labels stay muted — the hierarchy survives every theme). `to` turns
 * the stat into a full 44px+ link. Numbers arrive already formatted via
 * utils/numbers.ts (formatNum/formatInt) — this component never formats.
 */
export type StatLineItem = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'signal';
  to?: string;
};

const TONE_CLASS: Record<NonNullable<StatLineItem['tone']>, string> = {
  neutral: '',
  positive: ' positive',
  warning: ' warning',
  danger: ' danger',
  signal: ' signal',
};

export function StatLine({ items }: { items: StatLineItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="pf-statline">
      {items.map((item, i) => {
        const tone = TONE_CLASS[item.tone ?? 'neutral'];
        const body = (
          <>
            <span className="pf-stat-label">{item.label}</span>
            <span className="pf-stat-value">{item.value}</span>
            {item.hint !== undefined && <span className="pf-stat-hint">{item.hint}</span>}
          </>
        );
        return item.to !== undefined ? (
          <Link key={`${item.label}-${i}`} to={item.to} className={`pf-stat${tone}`}>
            {body}
          </Link>
        ) : (
          <div key={`${item.label}-${i}`} className={`pf-stat${tone}`}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
