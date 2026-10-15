/**
 * r168c — DOM nesting pin (fs-level).
 *
 * Found LIVE during the r168 workflow-integrity sweep: React's
 * validateDOMNesting warned «<bdi> cannot appear as a child of
 * <option>» while the teacher assignment flow rendered its course
 * <select>. <option> content is text-only; the bidi isolation never
 * applied anyway — the wrapper was invalid markup, not direction
 * safety. r168c strips it from both offering selects.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

describe('r168c — no <bdi> inside <option> (text-only content)', () => {
  it('both TeacherPages offering selects render plain text options', () => {
    const page = stripComments(read('src/pages/teacher/TeacherPages.tsx'));
    expect(page).not.toContain('· <bdi>{o.course.code}</bdi>');
    // And no other page reintroduces the pattern.
    const offenders = ['src/pages/teacher/TeacherPages.tsx'];
    for (const f of offenders) {
      expect(stripComments(read(f))).not.toMatch(/<option[^>]*>[^<]*<bdi/);
    }
  });
});
