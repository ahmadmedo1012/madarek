/**
 * Backend unit test — the pure reply-composition logic of
 * `backend/src/http/routes/ai.routes.ts` (audit 15-i TOP-12 + the
 * zero-coverage extractables, wave 16-B11).
 *
 * composeReply builds every AI chat reply from the student's mastery
 * rows. The decisions it makes are extracted as pure functions and
 * pinned here:
 *  · role gate — only STUDENT gets mastery-aware replies;
 *  · concept matching — the full concept name or a single >3-char
 *    word of it (plus the empty-name guard);
 *  · mastery tiers — the 0.5 / 0.8 boundaries every advice branch
 *    hangs on, and the Math.round percentage;
 *  · message capping — the 60-char conversation title and the
 *    chatSchema message bounds (1..4000, .strict);
 *  · worst-gap pick — the fallback "surface your weakest concept".
 *
 * The prisma-backed branches (mastery fetch, conversation/message
 * writes, telemetry) need a DB harness the project does not have.
 */
import { Prisma, Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  chatSchema,
  conversationTitle,
  isMasteryAwareRole,
  masteryPct,
  masteryTier,
  matchConceptInMessage,
  worstGapMastery,
} from '../../src/http/routes/ai.routes';

describe('chatSchema (.strict + message bounds — audit 15-i §5 item 10)', () => {
  it('accepts a bare message and a valid cuid conversationId', () => {
    expect(chatSchema.safeParse({ message: 'مرحبا' }).success).toBe(true);
    expect(chatSchema.safeParse({ message: 'مرحبا', conversationId: 'cku5c2q8x0000mc9q7v0example' }).success).toBe(true);
  });

  it('caps the message at 4000 characters (both boundaries pinned)', () => {
    expect(chatSchema.safeParse({ message: 'م'.repeat(4000) }).success).toBe(true);
    expect(chatSchema.safeParse({ message: 'م'.repeat(4001) }).success).toBe(false);
  });

  it('rejects empty, missing, and non-string messages', () => {
    expect(chatSchema.safeParse({ message: '' }).success).toBe(false);
    // D17-4: trim before min — whitespace-only no longer passes min(1).
    expect(chatSchema.safeParse({ message: '   ' }).success).toBe(false);
    expect(chatSchema.safeParse({}).success).toBe(false);
    expect(chatSchema.safeParse({ message: 42 }).success).toBe(false);
  });

  it('rejects malformed conversationIds and unknown keys (.strict)', () => {
    expect(chatSchema.safeParse({ message: 'مرحبا', conversationId: 'not-a-cuid' }).success).toBe(false);
    // A typo'd field must fail, not be silently dropped.
    expect(chatSchema.safeParse({ message: 'مرحبا', model: 'gpt-4' }).success).toBe(false);
  });
});

describe('isMasteryAwareRole (role gate)', () => {
  it('grants mastery-aware replies to students only', () => {
    expect(isMasteryAwareRole(Role.STUDENT)).toBe(true);
    expect(isMasteryAwareRole(Role.TEACHER)).toBe(false);
    expect(isMasteryAwareRole(Role.ADMIN)).toBe(false);
    expect(isMasteryAwareRole(Role.QUALITY)).toBe(false);
    expect(isMasteryAwareRole(Role.OWNER)).toBe(false);
  });
});

describe('matchConceptInMessage (TOP-12)', () => {
  it('matches the full concept name, case-insensitively', () => {
    expect(matchConceptInMessage('أحتاج مساعدة في المعادلات التفاضلية', 'المعادلات التفاضلية')).toBe(true);
    expect(matchConceptInMessage('Explain LINEAR ALGEBRA please', 'Linear Algebra')).toBe(true);
  });

  it('matches a single meaningful word of the concept name', () => {
    // A partial mention still tailors the reply.
    expect(matchConceptInMessage('ما هو الخطي بالضبط؟', 'الجبر الخطي')).toBe(true);
  });

  it('ignores words of 3 characters or fewer', () => {
    // 'SQL' (3 chars) never claims a match on its own…
    expect(matchConceptInMessage('I need help with SQL', 'SQL Queries')).toBe(false);
    // …while a longer word of the same concept does.
    expect(matchConceptInMessage('Tell me about queries', 'SQL Queries')).toBe(true);
  });

  it('never matches an empty concept name (the includes("") trap)', () => {
    // Pre-extraction, an empty concept name matched EVERY message via
    // message.includes(''); the extracted guard pins the fix.
    expect(matchConceptInMessage('أي رسالة', '')).toBe(false);
  });

  it('returns false when nothing matches', () => {
    expect(matchConceptInMessage('ما مواعيد الاختبار؟', 'المعادلات التفاضلية')).toBe(false);
  });
});

describe('masteryTier (TOP-12 — the 0.5 / 0.8 boundaries)', () => {
  it('splits the three advice tiers at exactly 0.5 and 0.8', () => {
    expect(masteryTier(0)).toBe('gap');
    expect(masteryTier(0.499)).toBe('gap');
    expect(masteryTier(0.5)).toBe('developing');
    expect(masteryTier(0.799)).toBe('developing');
    expect(masteryTier(0.8)).toBe('strong');
    expect(masteryTier(1)).toBe('strong');
  });

  it('coerces Prisma Decimal levels exactly like the inline code did', () => {
    expect(masteryTier(new Prisma.Decimal('0.499'))).toBe('gap');
    expect(masteryTier(new Prisma.Decimal('0.8'))).toBe('strong');
  });
});

describe('masteryPct', () => {
  it('rounds with Math.round — 0.499 renders 50% inside gap advice', () => {
    expect(masteryPct(0)).toBe(0);
    expect(masteryPct(1)).toBe(100);
    expect(masteryPct(0.5)).toBe(50);
    // Rounds up while the tier stays 'gap' — existing behavior, pinned
    // so nobody "fixes" one half of the pair without the other.
    expect(masteryPct(0.499)).toBe(50);
    expect(masteryPct(0.125)).toBe(13); // half rounds up
    expect(masteryPct(0.875)).toBe(88);
  });

  it('accepts the wire format (Prisma Decimal)', () => {
    expect(masteryPct(new Prisma.Decimal('0.47'))).toBe(47);
    expect(masteryPct(new Prisma.Decimal('1'))).toBe(100);
  });
});

describe('conversationTitle (message capping)', () => {
  it('keeps short messages intact, including the 60-char boundary', () => {
    expect(conversationTitle('سؤال قصير')).toBe('سؤال قصير');
    expect(conversationTitle('م'.repeat(60))).toBe('م'.repeat(60));
  });

  it('caps at 60 characters — 61-char and max-length messages', () => {
    expect(conversationTitle('م'.repeat(61))).toBe('م'.repeat(60));
    expect(conversationTitle('x'.repeat(4000))).toBe('x'.repeat(60));
  });
});

describe('worstGapMastery', () => {
  const row = (level: number | Prisma.Decimal, name = 'مفهوم') => ({ level, concept: { name } });

  it('picks the lowest level among gap-tier concepts only', () => {
    const rows = [row(0.7), row(0.42), row(0.31), row(0.9)];
    expect(worstGapMastery(rows)?.level).toBe(0.31);
  });

  it('treats 0.5 as the exclusive gap boundary', () => {
    expect(worstGapMastery([row(0.5), row(0.499)])?.level).toBe(0.499);
  });

  it('returns undefined when nothing is in the gap tier', () => {
    expect(worstGapMastery([])).toBeUndefined();
    expect(worstGapMastery([row(0.5), row(0.8)])).toBeUndefined();
  });

  it('sorts Prisma Decimal levels (the wire format)', () => {
    const rows = [row(new Prisma.Decimal('0.40')), row(new Prisma.Decimal('0.33'))];
    expect(Number(worstGapMastery(rows)?.level)).toBe(0.33);
  });

  it('does not mutate the input array', () => {
    const rows = [row(0.42), row(0.31)];
    worstGapMastery(rows);
    expect(rows.map((r) => r.level)).toEqual([0.42, 0.31]);
  });
});
