/**
 * r315 C4-D — the EdgeTab year is COMPUTED, never hardcoded.
 *
 * The vertical tab label «منصّة مستقلّة · مدارك ٢٠٢٦» carried a baked
 * year that would keep rendering a stale ٢٠٢٦ through 2027+ (the W5
 * carried flag — text-only pass, code fix deferred to this round).
 * The fix computes the year at render; this belt pins both ends:
 *   · the RENDERED label equals «منصّة مستقلّة · مدارك <current year>»
 *     with the year independently re-derived through ICU (ar-EG
 *     numbering), so a revert to any hardcode fails the day the
 *     clock rolls past the baked year;
 *   · the label stays in the Arabic-Indic numeral family — no Latin
 *     digits may leak into the drafting-script label (the platform's
 *     formatInt latn convention never applied to this mono label).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { render } from '@testing-library/react';
import { EdgeTab } from '../../src/components/landing/chrome/EdgeTab';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

/** The expected year, re-derived on an INDEPENDENT path (ICU ar-EG) —
 * not the codepoint math the component uses, so the two cannot drift
 * together silently. */
const yearArIcu = () =>
  new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(
    new Date().getFullYear(),
  );

describe('r315 C4-D — EdgeTab year is computed (Arabic-Indic, never hardcoded)', () => {
  it('renders the honest label with the CURRENT year in Arabic-Indic digits', () => {
    const { container } = render(<EdgeTab />);
    const label = container.querySelector('.et-label');
    expect(label?.textContent).toBe(`منصّة مستقلّة · مدارك ${yearArIcu()}`);
  });

  it('the label carries zero Latin digits (the drafting-script numeral family only)', () => {
    const { container } = render(<EdgeTab />);
    const label = container.querySelector('.et-label');
    expect(label?.textContent).toBeTruthy();
    expect(label!.textContent!).not.toMatch(/[0-9]/);
  });

  it('the source no longer bakes a year literal (content-anchored pin — r315 C4-D computed the year)', () => {
    // comments are stripped first: this file's own documentation quotes
    // the old literal, and so does EdgeTab.tsx's rollover comment.
    const live = read('src/components/landing/chrome/EdgeTab.tsx')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(live).not.toContain('مدارك ٢٠٢٦'); // the retired hardcode
    expect(live).toContain('yearAr()'); // the computed seat
  });
});
