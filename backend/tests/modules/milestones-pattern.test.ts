/**
 * Backend contract test — `MILESTONE_ID_PATTERN` from
 * `backend/src/modules/milestones/router.ts`.
 *
 * Verifies the regex matches exactly the three milestone shapes
 * documented in specs/012-design-graphics-uplift/contracts/onboarding-milestone.md
 * and rejects every other input.
 */
import { describe, expect, it } from 'vitest';
import { MILESTONE_ID_PATTERN } from '../../src/modules/milestones/router';

describe('MILESTONE_ID_PATTERN', () => {
  it('accepts the two static V1 milestone IDs', () => {
    expect(MILESTONE_ID_PATTERN.test('first-assignment-complete')).toBe(true);
    expect(MILESTONE_ID_PATTERN.test('first-course-complete')).toBe(true);
  });

  it('accepts exam-window-opens with a valid window suffix', () => {
    expect(MILESTONE_ID_PATTERN.test('exam-window-opens:abc123')).toBe(true);
    expect(MILESTONE_ID_PATTERN.test('exam-window-opens:cltest_window-1_2026')).toBe(true);
    // 25-char cuid-style suffix
    expect(MILESTONE_ID_PATTERN.test('exam-window-opens:ckxabcdef0123456789abcdef')).toBe(true);
  });

  it('rejects exam-window-opens without a suffix', () => {
    expect(MILESTONE_ID_PATTERN.test('exam-window-opens:')).toBe(false);
    expect(MILESTONE_ID_PATTERN.test('exam-window-opens')).toBe(false);
  });

  it('rejects suffixes containing illegal characters', () => {
    expect(MILESTONE_ID_PATTERN.test('exam-window-opens:has space')).toBe(false);
    expect(MILESTONE_ID_PATTERN.test('exam-window-opens:has/slash')).toBe(false);
    expect(MILESTONE_ID_PATTERN.test('exam-window-opens:has?query')).toBe(false);
    expect(MILESTONE_ID_PATTERN.test('exam-window-opens:has.dot')).toBe(false);
  });

  it('rejects unknown milestone roots', () => {
    expect(MILESTONE_ID_PATTERN.test('first-something')).toBe(false);
    expect(MILESTONE_ID_PATTERN.test('milestone-x')).toBe(false);
    expect(MILESTONE_ID_PATTERN.test('graduation-day')).toBe(false);
  });

  it('rejects close-but-wrong inputs', () => {
    expect(MILESTONE_ID_PATTERN.test('First-assignment-complete')).toBe(false); // case
    expect(MILESTONE_ID_PATTERN.test('first-assignment-complete:x')).toBe(false); // suffix
    expect(MILESTONE_ID_PATTERN.test(' first-assignment-complete')).toBe(false); // leading space
    expect(MILESTONE_ID_PATTERN.test('first-assignment-complete ')).toBe(false); // trailing space
  });

  it('rejects empty / nonsense', () => {
    expect(MILESTONE_ID_PATTERN.test('')).toBe(false);
    expect(MILESTONE_ID_PATTERN.test('null')).toBe(false);
    expect(MILESTONE_ID_PATTERN.test('undefined')).toBe(false);
  });
});
