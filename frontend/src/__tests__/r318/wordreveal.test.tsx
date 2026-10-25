/**
 * R318 §A1 — WordReveal real word spaces.
 *
 * Defect (foreman probe, head 55afbae): the `.wr` wrappers rendered
 * sibling `.wr-w` inline-block masks with NO whitespace between them —
 * visually glued («هذامسطحلطابق…») AND textContent glued, destroying
 * copy, search and screen-reading.
 *
 * The §A1 contract, pinned here for BOTH variants (WordReveal — the
 * IO-belt reveal — and ScrubReveal — the scroll-scrub reveal):
 *   (a) the wrapper's textContent normalized-equals the source string
 *       INCLUDING the inter-word spaces;
 *   (b) every `.wr-w` mask is aria-hidden="true" (AT reads the
 *       wrapper's aria-label, never the split words twice);
 *   (c) the wrapper carries aria-label={text} (one clean string);
 *   (d) the mask count === the source word count — words split on
 *       spaces ONLY, never below word level (Arabic joining intact).
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ScrubReveal, WordReveal } from '../../components/landing/journey/WordReveal';

const SAMPLE = 'هذا مسطح لطابق تعلم واحد في مدارك.';

/** collapse runs of whitespace + trim — the "normalized equals" helper */
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** the shared §A1 contract — run against both variants */
function expectWordSpaces(container: HTMLElement, text: string) {
  const words = text.split(' ');
  const wrapper = container.querySelector<HTMLElement>('.wr');
  const masks = container.querySelectorAll<HTMLElement>('.wr-w');

  // (d) word count === source word count (never split below word level)
  expect(masks.length).toBe(words.length);

  // (b) every mask is aria-hidden — AT reads the wrapper label, not the words
  masks.forEach((m) => expect(m.getAttribute('aria-hidden')).toBe('true'));

  // (c) the wrapper carries the full string as its aria-label
  expect(wrapper).not.toBeNull();
  expect(wrapper!.getAttribute('aria-label')).toBe(text);

  // (a) textContent normalized-equals the source INCLUDING spaces…
  expect(norm(wrapper!.textContent ?? '')).toBe(norm(text));
  // …and the emitted joinery is exactly one real ' ' text node between
  // consecutive masks (raw textContent is the source string verbatim)
  expect(wrapper!.textContent).toBe(text);
  const spaceNodes = Array.from(wrapper!.childNodes).filter(
    (n) => n.nodeType === Node.TEXT_NODE && n.textContent === ' ',
  );
  expect(spaceNodes.length).toBe(words.length - 1);

  // each mask carries its own whole word (mask/stagger integrity intact)
  masks.forEach((m, i) => expect(m.textContent).toBe(words[i]));
}

describe('R318 §A1 — WordReveal real word spaces', () => {
  it('WordReveal: spaces survive rendering between the word masks', () => {
    const { container } = render(<WordReveal text={SAMPLE} />);
    expectWordSpaces(container, SAMPLE);
  });

  it('ScrubReveal: spaces survive rendering between the word masks', () => {
    const { container } = render(<ScrubReveal text={SAMPLE} />);
    expectWordSpaces(container, SAMPLE);
  });

  it('a single-word string emits no space node (no trailing gap)', () => {
    const single = 'مدارك';
    const { container } = render(<WordReveal text={single} />);
    const wrapper = container.querySelector<HTMLElement>('.wr')!;
    expect(wrapper.textContent).toBe(single);
    expect(wrapper.querySelectorAll('.wr-w').length).toBe(1);
    expect(
      Array.from(wrapper.childNodes).some((n) => n.nodeType === Node.TEXT_NODE),
    ).toBe(false);
  });
});
