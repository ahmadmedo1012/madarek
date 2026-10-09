// ═════════════════════════════════════════════════════════════════════
// eslint.config.mjs — r134 ESLint adoption (audit R134-W1-M P1: the
// repo shipped with NO lint anywhere).
// ─────────────────────────────────────────────────────────────────────
// Scope for the initial adoption: the two source trees
// (frontend/src + backend/src) — exactly what `npm run lint` passes on
// the CLI. Test trees are deliberately OUT for now
// (TODO(r134): fold frontend/tests + backend/tests in once their
// fixture anys and setup imports are triaged); the historical audits/
// and specs/ docs are not code.
//
// Rule posture: typescript-eslint `recommended` (untyped — the four
// `typecheck` scripts already own type-level enforcement) + the two
// classic react-hooks rules. The v7 compiler-powered react-hooks rules
// (purity/immutability/…) are intentionally NOT enabled on this mature
// codebase yet — TODO(r134): adopt them rule-by-rule as warnings.
// ═════════════════════════════════════════════════════════════════════
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const SOURCE_FILES = ['frontend/src/**/*.{ts,tsx}', 'backend/src/**/*.ts'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      // Tests: out of scope for the initial adoption (see header TODO).
      'frontend/tests/**',
      'backend/tests/**',
      'backend/src/**/__tests__/**',
      // Vendored / generated assets.
      'frontend/public/**',
    ],
  },
  {
    ...js.configs.recommended,
    files: SOURCE_FILES,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: SOURCE_FILES,
  })),
  {
    files: SOURCE_FILES,
    rules: {
      // Underscore prefix = deliberately unused (Express `_next` handlers,
      // rest-destructure omissions like `{ extractedText: _omit, ...rest }`).
      // `ignoreRestSiblings` is the standard companion for that idiom.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      // warn, not error: a handful of pre-existing intentional exemptions
      // (audited effect-dep decisions) — TODO(r134): triage to zero, then
      // promote to error.
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
