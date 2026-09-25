/**
 * Icon wrapper a11y contract (audit 15-g P1-2, wave 16-E4).
 *
 *   - default: decorative — the svg carries aria-hidden="true", so
 *     icons never surface as roleless graphics in the accessibility
 *     tree (lucide adds no role/aria of its own)
 *   - opt-out: an explicit aria-hidden={false} survives the wrapper,
 *     which is how an informative icon is declared (it must then also
 *     carry its own aria-label/title)
 *   - an explicit aria-hidden="true" stays "true" (idempotent with the
 *     default; the 18 pre-existing explicit passers are unchanged)
 *   - sizing + stroke-width defaults still pass through (chrome
 *     consistency: sizes 16/18/20/24, stroke 1.8)
 *   - EmojiIcon parity: the data-layer emoji→Lucide bridge renders
 *     through this wrapper with no aria props of its own, so it
 *     inherits the decorative default (data-driven glyphs are chrome,
 *     never information — see its docblock)
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import { Icon } from '../../src/components/Icon';
import { EmojiIcon } from '../../src/components/EmojiIcon';

const svgOf = (root: HTMLElement) => root.querySelector('svg')!;

describe('Icon — decorative by default (15-g P1-2)', () => {
  it('hides the glyph from the accessibility tree by default', () => {
    const { container } = render(<Icon icon={BookOpen} />);
    expect(svgOf(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps an explicit aria-hidden={false} opt-out (informative icons)', () => {
    const { container } = render(
      <Icon icon={BookOpen} aria-hidden={false} aria-label="مكتبة الدورة" />,
    );
    const svg = svgOf(container);
    expect(svg.getAttribute('aria-hidden')).toBe('false');
    expect(svg).toHaveAttribute('aria-label', 'مكتبة الدورة');
  });

  it('stays hidden when the call site passes aria-hidden="true" explicitly', () => {
    const { container } = render(<Icon icon={BookOpen} aria-hidden="true" />);
    expect(svgOf(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('passes the 16px default size and the 1.8 stroke through', () => {
    const { container } = render(<Icon icon={BookOpen} />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveAttribute('stroke-width', '1.8');
  });

  it('lets a call site override size and stroke width', () => {
    const { container } = render(<Icon icon={BookOpen} size={24} strokeWidth={2.2} />);
    const svg = svgOf(container);
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('stroke-width', '2.2');
  });
});

describe('EmojiIcon parity — the data-layer bridge is decorative too', () => {
  it('inherits the decorative default through the Icon wrapper', () => {
    const { container } = render(<EmojiIcon emoji="📚" />);
    expect(svgOf(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the fallback icon hidden as well (never a raw emoji glyph)', () => {
    const { container } = render(<EmojiIcon emoji="🚀-unknown" />);
    expect(svgOf(container)).toHaveAttribute('aria-hidden', 'true');
  });
});
