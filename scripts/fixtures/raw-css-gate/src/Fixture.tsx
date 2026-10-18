import type { CSSProperties } from 'react';

/* r186 fixture — the clean TSX baseline for the raw-css gate's
   TSX inline-spacing axis. Every value here is legal: a ladder
   token, zero, a relative unit, calc()/clamp() on tokens, or a
   documented allow. The mutations in test-raw-css-gate.sh break
   each guarantee in turn. */

const clean: CSSProperties = {
  padding: 'var(--sp-4)',
  margin: 'var(--sp-2) var(--sp-3)',
  gap: 'var(--sp-2)',
  rowGap: 0, // zero — no rung needed, bare number included
  columnGap: '0px', // zero with unit — still zero
  marginTop: '50%', // relative unit — outside the px ladder contract
  marginBottom: 'calc(-1 * var(--sp-1))',
  marginBlockStart: 'clamp(var(--sp-2), 4vw, var(--sp-4))',
  paddingInlineStart: 'var(--sp-1-5)',
};

/* prose containing «padding: 5px» inside a string is NEVER a
   finding — the walk is quote-aware. */
const prose = 'the doc says padding: 5px is legacy';
const template = `prose margin: 4px stays prose`;

/* JSX comments are skipped whole — documentation prose quoting
   a declaration never becomes one */
export function CommentProse() {
  return (
    <div>
      {/* the migration note says gap: 9px stayed here — it is
         prose, not a declaration */}
      <span />
    </div>
  );
}

/* a property access before a ternary colon is never a style prop */
const obj = { margin: 'not-a-number' };
const pick = true ? obj.margin : 'fallback';

/* a type member terminates at ';' — it never swallows its
   neighbours (the mutation below proves the terminator bites) */
interface Member {
  gap: number;
  padding: string;
}

export function Fixture() {
  return (
    <div style={clean}>
      <span style={{ display: 'inline-flex', gap: 'var(--sp-2)' }} />
      {/* the reasoned marker on the line above exempts a real
          optical literal — same grammar as the CSS axis */}
      {/* spacing-gate: allow — optical baseline nudge under descenders */}
      <span style={{ marginTop: '3px' }} />
    </div>
  );
}
