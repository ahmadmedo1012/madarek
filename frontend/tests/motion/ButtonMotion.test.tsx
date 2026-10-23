import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../src/components/primitives/Form';

/**
 * r305-A2 · lane 2-b — Button control microinteractions.
 *
 * CSS behavior (transforms, slides, sweeps) is verified by the QA agent
 * in a real browser; this suite pins the DOM contracts the CSS hangs
 * off of:
 *   · default Button markup carries the ROLL by default (R313 WP-D
 *     override: the Heron dual-label roll is the default grammar —
 *     plain-text labels wrap, so data-motion-label + the duplicate
 *     row render; the accessible name stays a single copy)
 *   · rich (non-text) children skip the roll — markup unchanged
 *   · labelMotion={false} opts a text button out
 *   · labelMotion: ONE accessible name (aria-hidden dup respected by
 *     the name computation) + data-motion-label hook
 *   · iconRight: decorative aria-hidden container + duplicate, name
 *     stays the label text alone, data-motion-icon hook
 *   · loading branch precedence: spinner path, no motion wrapper
 */

describe('Button (R313 D4 default) — the roll is the default grammar', () => {
  it('wraps a plain-text label in the roll structure by default', () => {
    const { container } = render(<Button>حفظ التغييرات</Button>);
    const btn = screen.getByRole('button', { name: 'حفظ التغييرات' });
    expect(btn.className).toBe('btn');
    // R313 override: default ON — the wrapper + hook render for text labels.
    expect(btn).toHaveAttribute('data-motion-label', 'true');
    expect(container.querySelector('.btn-motion-label .btn-motion-label-track')).not.toBeNull();
    const dup = container.querySelector('.btn-motion-label-dup');
    expect(dup).not.toBeNull();
    expect(dup).toHaveAttribute('aria-hidden', 'true');
    expect(dup?.textContent).toBe('حفظ التغييرات');
    // The accessible name is still ONE copy (getByRole throws on dupes).
    expect(screen.getAllByRole('button', { name: 'حفظ التغييرات' })).toHaveLength(1);
  });

  it('skips the roll for rich children (icons/JSX render exactly once)', () => {
    const { container } = render(
      <Button>
        <ArrowLeft size={16} aria-hidden="true" />
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('data-motion-label')).toBe(false);
    expect(container.querySelector('.btn-motion-label')).toBeNull();
    expect(btn.querySelectorAll('svg')).toHaveLength(1);
  });

  it('opts out with labelMotion={false}', () => {
    const { container } = render(<Button labelMotion={false}>حفظ</Button>);
    const btn = screen.getByRole('button', { name: 'حفظ' });
    expect(btn.hasAttribute('data-motion-label')).toBe(false);
    expect(container.querySelector('.btn-motion-label')).toBeNull();
  });
});

describe('Button labelMotion — duplicate-label slide structure', () => {
  it('keeps the accessible name a SINGLE copy of the label', () => {
    render(<Button labelMotion>ابدأ رحلتك التعليمية اليوم</Button>);
    // getByRole throws on multiple matches: the aria-hidden dup row
    // must not join the accessible-name computation.
    expect(screen.getAllByRole('button', { name: 'ابدأ رحلتك التعليمية اليوم' })).toHaveLength(1);
    // Both copies exist in the DOM (live row + duplicate row)…
    expect(screen.queryAllByText('ابدأ رحلتك التعليمية اليوم')).toHaveLength(2);
    // …and only the duplicate is aria-hidden.
    const dups = containerDupCount('ابدأ رحلتك التعليمية اليوم');
    expect(dups.hidden).toBe(1);
    expect(dups.visible).toBe(1);
  });

  it('exposes the slide structure classes and the data-motion-label hook', () => {
    const { container } = render(<Button labelMotion>حفظ</Button>);
    const btn = screen.getByRole('button', { name: 'حفظ' });
    expect(btn).toHaveAttribute('data-motion-label', 'true');
    expect(container.querySelector('.btn-motion-label .btn-motion-label-track')).not.toBeNull();
    const dup = container.querySelector('.btn-motion-label-dup');
    expect(dup).not.toBeNull();
    expect(dup).toHaveAttribute('aria-hidden', 'true');
    expect(dup?.textContent).toBe('حفظ');
  });

  it('keeps the leading icon OUTSIDE the motion label wrapper', () => {
    render(
      <Button labelMotion leadingIcon={<ArrowLeft size={16} aria-hidden="true" />}>
        رجوع
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'رجوع' });
    const label = btn.querySelector('.btn-motion-label');
    expect(label).not.toBeNull();
    // The leading icon is a direct child of the button, before the label.
    expect(btn.firstElementChild?.tagName).toBe('svg');
    expect(label?.querySelector('svg')).toBeNull();
  });

  it('long Arabic label survives in both rows (no truncation in markup)', () => {
    const long = 'ابدأ رحلتك التعليمية اليوم مع مدارك خطوة بخطوة نحو التفوق';
    render(<Button labelMotion>{long}</Button>);
    const dups = containerDupCount(long);
    expect(dups.visible).toBe(1);
    expect(dups.hidden).toBe(1);
  });
});

describe('Button iconRight — decorative trailing arrow', () => {
  it('renders the swap window, keeps the name label-only, dup aria-hidden', () => {
    const { container } = render(
      <Button iconRight={<ArrowLeft size={16} />}>التالي</Button>,
    );
    const btn = screen.getByRole('button', { name: 'التالي' });
    expect(btn).toHaveAttribute('data-motion-icon', 'true');
    const win = container.querySelector('.btn-motion-icon');
    expect(win).not.toBeNull();
    // The whole window is decorative: hidden from the a11y tree, so the
    // accessible name comes from the label text alone (asserted above —
    // getByRole would have thrown if the icons leaked into the name).
    expect(win).toHaveAttribute('aria-hidden', 'true');
    // Repo is RTL-first: ArrowLeft is the forward arrow. Two svgs render
    // (live + duplicate) and the duplicate is the aria-hidden wrapper's
    // last child.
    const svgs = win?.querySelectorAll('svg');
    expect(svgs).toHaveLength(2);
    expect(win?.querySelector('.btn-motion-icon-dup')).not.toBeNull();
  });

  it('renders after the labelMotion span when both props are set', () => {
    render(
      <Button labelMotion iconRight={<ArrowLeft size={16} />}>
        أرسل
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'أرسل' });
    expect(btn).toHaveAttribute('data-motion-label', 'true');
    expect(btn).toHaveAttribute('data-motion-icon', 'true');
    const children = Array.from(btn.children).map((el) => el.className);
    expect(children).toEqual(['btn-motion-label', 'btn-motion-icon']);
  });
});

describe('Button loading × labelMotion — spinner path wins', () => {
  it('renders the spinner markup with no motion wrapper while busy', () => {
    const { container } = render(<Button labelMotion loading>حفظ التغييرات</Button>);
    const btn = screen.getByRole('button', { name: 'حفظ التغييرات' });
    expect(btn.querySelector('.motion-spinner')).not.toBeNull();
    expect(container.querySelector('.btn-motion-label')).toBeNull();
    expect(btn.querySelector('.visually-hidden')?.textContent).toBe('حفظ التغييرات');
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('restores the motion wrapper when the request settles', () => {
    const { rerender, container } = render(
      <Button labelMotion loading>
        إرسال
      </Button>,
    );
    rerender(<Button labelMotion loading={false}>إرسال</Button>);
    expect(container.querySelector('.motion-spinner')).toBeNull();
    expect(container.querySelector('.btn-motion-label')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'إرسال' })).not.toBeDisabled();
  });
});

/** Count copies of `text` split by their aria-hidden visibility. */
function containerDupCount(text: string): { visible: number; hidden: number } {
  const nodes = screen.queryAllByText(text);
  let visible = 0;
  let hidden = 0;
  for (const node of nodes) {
    // Walk up: a node inside an aria-hidden subtree is hidden.
    let el: HTMLElement | null = node as HTMLElement;
    let isHidden = false;
    while (el) {
      if (el.getAttribute('aria-hidden') === 'true') {
        isHidden = true;
        break;
      }
      el = el.parentElement;
    }
    if (isHidden) hidden += 1;
    else visible += 1;
  }
  return { visible, hidden };
}
