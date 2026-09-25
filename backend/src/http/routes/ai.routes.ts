import { Router } from 'express';
import { z } from 'zod';
import { AiMessageRole, Prisma, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../logger.js';

const router = Router();
router.use(authMiddleware);

// AI is expensive — stricter rate limit per user (shared factory defaults:
// 20 req / 60 s, keyed per-user; see middleware/rateLimit.ts).
const aiLimiter = createRouteLimiter();

/** Chat request envelope — .strict (a typo'd field must fail, not be
 *  silently dropped). Exported for DB-free schema edge tests
 *  (tests/modules/ai-logic.test.ts, audit 15-i §5 item 10). */
export const chatSchema = z
  .object({
    conversationId: z.string().cuid().optional(),
    message: z.string().min(1).max(4000),
  })
  .strict();

const GENERIC_RESPONSES = [
  'سؤال جيد! دعني أساعدك في فهم هذا الموضوع بطريقة عملية. ابدأ بمراجعة الأمثلة في محاضراتك ثم انتقل للتطبيق.',
  'بناءً على أدائك في المواد المسجَّلة، أنصحك بتقسيم الموضوع إلى أجزاء صغيرة ودراستها يومياً لمدة 30 دقيقة.',
  'الموضوع يتطلب فهماً نظرياً وتطبيقاً عملياً. اقرأ النظرية أولاً ثم جرّب التمارين العملية في المعامل الافتراضية.',
  'أستطيع مساعدتك في إعداد خطة دراسة أسبوعية مخصصة. أخبرني عن المادة التي تواجه فيها تحدياً.',
];

const STUDY_TIPS = [
  'نصيحة: راجع نقاط التفاعل في المحاضرة المسجَّلة قبل الانتقال للمحاضرة التالية.',
  'نصيحة: حلّ ثلاثة أسئلة من الاختبارات السابقة بعد كل درس لتعزيز الاستيعاب.',
  'نصيحة: اشرح المفهوم لزميل لك — التعليم أفضل طريقة للتعلم.',
];

// ─── Pure reply-composition logic (tests/modules/ai-logic.test.ts) ──

/** Mastery levels arrive as Prisma Decimal on the wire; tests pass
 *  plain numbers. Both coerce through Number() exactly like the
 *  original inline branches did. */
export type MasteryLevel = number | Prisma.Decimal;

/**
 * Role gate: only STUDENT gets mastery-aware replies — students are
 * the only role with mastery rows, so every other role gets a generic
 * response instead of an empty-data reply.
 */
export function isMasteryAwareRole(role: Role): boolean {
  return role === Role.STUDENT;
}

/**
 * Does the user's message mention this concept? Matches on the full
 * concept name, or on any single word of it longer than 3 characters
 * (short words must never claim a match). An empty concept name never
 * matches — `includes('')` is true for every string, so the
 * pre-extraction code would have let an unnamed concept claim ANY
 * message (latent, now guarded).
 */
export function matchConceptInMessage(message: string, conceptName: string): boolean {
  const name = conceptName.toLowerCase();
  if (name.length === 0) return false;
  const lower = message.toLowerCase();
  if (lower.includes(name)) return true;
  return name.split(/\s+/).filter((w) => w.length > 3).some((w) => lower.includes(w));
}

/** The three advice tiers every reply branch hangs on. */
export type MasteryTier = 'gap' | 'developing' | 'strong';

/** Mastery tier thresholds: < 0.5 gap, < 0.8 developing, else strong. */
export function masteryTier(level: MasteryLevel): MasteryTier {
  const n = Number(level);
  if (n < 0.5) return 'gap';
  if (n < 0.8) return 'developing';
  return 'strong';
}

/** Display percentage — Math.round, so 0.499 renders as 50% while its
 *  tier is still 'gap' (existing behavior, pinned by tests). */
export function masteryPct(level: MasteryLevel): number {
  return Math.round(Number(level) * 100);
}

/** Conversation title cap — the conversations list shows the opening
 *  message truncated to 60 characters. */
export function conversationTitle(message: string): string {
  return message.slice(0, 60);
}

/**
 * Fallback "surface your worst gap" pick: the concept furthest below
 * the gap threshold (lowest level first — most urgent first).
 * Non-mutating (filter copies before sort); undefined when nothing is
 * in the gap tier. Single-sources the 0.5 boundary through masteryTier.
 */
export function worstGapMastery<T extends { level: MasteryLevel }>(
  masteries: readonly T[],
): T | undefined {
  return masteries
    .filter((m) => masteryTier(m.level) === 'gap')
    .sort((a, b) => Number(a.level) - Number(b.level))[0];
}

/**
 * Gap-aware response composer.
 * Tries to find a concept the user mentions in the message and craft
 * a tailored response using their actual mastery data.
 */
async function composeReply(userId: string, message: string, role: Role): Promise<string> {
  if (!isMasteryAwareRole(role)) {
    return GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)]!;
  }

  // Get the student's full mastery state once.
  const masteries = await prisma.studentMastery.findMany({
    where: { studentId: userId },
    include: {
      concept: {
        include: {
          course: { select: { name: true } },
          chapters: { take: 1, include: { lecture: { select: { id: true, title: true } } } },
        },
      },
    },
  });

  // Try to match a concept name in the message.
  const matched = masteries.find((m) => matchConceptInMessage(message, m.concept.name));

  if (matched) {
    const pct = masteryPct(matched.level);
    const tier = masteryTier(matched.level);
    const lec = matched.concept.chapters[0]?.lecture;
    const courseName = matched.concept.course.name;
    const tip = STUDY_TIPS[Math.floor(Math.random() * STUDY_TIPS.length)]!;

    if (tier === 'gap') {
      return [
        `لاحظت من بياناتك أنك بحاجة لتعزيز فهمك في «${matched.concept.name}» — إتقانك الحالي ${pct}% في مقرّر ${courseName}.`,
        '',
        `الفكرة الأساسية: هذا المفهوم يعتمد على ثلاث ركائز يجب إتقانها بترتيب. ابدأ بالأساس النظري ثم الانتقال إلى التطبيق العملي.`,
        '',
        lec ? `🎯 توصية: راجع محاضرة «${lec.title}» — مدتها قصيرة وتحتوي على أمثلة عملية.` : '',
        '',
        tip,
      ].filter(Boolean).join('\n');
    }
    if (tier === 'developing') {
      return [
        `بالنسبة لـ «${matched.concept.name}»، أنت تتقن ${pct}% منه في مقرّر ${courseName} — أداء جيد لكن يمكن تطويره.`,
        '',
        `لتعميق فهمك: حاول الإجابة على 3 أسئلة من اختبارات سنوات سابقة، وراجع نقاط التفاعل التي أخطأت فيها.`,
        '',
        tip,
      ].join('\n');
    }
    return [
      `أحسنت! إتقانك لـ «${matched.concept.name}» ممتاز (${pct}%) في مقرّر ${courseName}.`,
      '',
      `للحفاظ على هذا المستوى: حاول مساعدة زملائك في فهم هذا المفهوم — التعليم يعزّز إتقانك أنت أيضاً.`,
    ].join('\n');
  }

  // No specific concept mentioned — try to surface the worst gap.
  const worstGap = worstGapMastery(masteries);

  if (worstGap) {
    const pct = masteryPct(worstGap.level);
    return [
      'سأساعدك بكل تأكيد. لكن قبل ذلك:',
      '',
      `لاحظت أن لديك فجوة في «${worstGap.concept.name}» — إتقانك ${pct}% فقط. أنصح بالتركيز عليها أولاً قبل الانتقال لمواضيع جديدة.`,
      '',
      'عُد إليّ بسؤال محدّد عن هذا المفهوم وسأساعدك خطوة بخطوة.',
    ].join('\n');
  }

  return GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)]!;
}

/**
 * AI telemetry writer — the writer side of /owner/ai-metrics.
 * BEST-EFFORT: a telemetry failure must never fail the chat request.
 *
 * Honest metrics note: the chat reply is composed locally by
 * `composeReply` (mastery-aware templates) — no external LLM is called,
 * so there are no real token counts. We record the real latency and
 * model tag; token fields stay at their 0 defaults rather than
 * fabricating estimates. Accepts either the root client or a
 * transaction client.
 */
const AI_CHAT_MODEL = 'gap-aware-composer';
const writeAiTelemetry = async (
  client: Prisma.TransactionClient,
  data: { userId: string; latencyMs: number; success: boolean; errorMessage?: string },
): Promise<void> => {
  try {
    await client.aiTelemetry.create({
      data: {
        userId: data.userId,
        feature: 'chat',
        model: AI_CHAT_MODEL,
        latencyMs: data.latencyMs,
        success: data.success,
        errorMessage: data.errorMessage ?? null,
      },
    });
  } catch (err) {
    logger.warn({ err }, 'aiTelemetry write failed (non-blocking)');
  }
};

router.post('/chat', aiLimiter, validate(chatSchema), async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const userId = req.user!.id;
    const { conversationId, message } = req.body as z.infer<typeof chatSchema>;

    // Single conversation lookup (previously a conditional DOUBLE lookup —
    // findFirst then findUnique on the same row). A provided id that
    // doesn't resolve to one of the caller's conversations is a 404,
    // not a silent new-conversation creation that strands the id.
    const conv = conversationId
      ? await prisma.aiConversation.findFirst({ where: { id: conversationId, userId } })
      : null;
    if (conversationId && !conv) throw AppError.notFound('Conversation not found');

    const reply = await composeReply(userId, message, req.user!.role);

    // All chat writes (conversation create + both messages + telemetry)
    // in ONE transaction — previously three separate non-transactional
    // writes that could strand an orphan user message when a later write failed.
    const { conversationId: finalId, assistantContent } = await prisma.$transaction(
      async (tx) => {
        const conversation =
          conv ?? (await tx.aiConversation.create({ data: { userId, title: conversationTitle(message) } }));
        await tx.aiMessage.create({
          data: { conversationId: conversation.id, role: AiMessageRole.USER, content: message },
        });
        const assistantMsg = await tx.aiMessage.create({
          data: { conversationId: conversation.id, role: AiMessageRole.ASSISTANT, content: reply },
        });
        await writeAiTelemetry(tx, {
          userId,
          latencyMs: Date.now() - startedAt,
          success: true,
        });
        return { conversationId: conversation.id, assistantContent: assistantMsg.content };
      },
    );

    res.json({ data: { conversationId: finalId, reply: assistantContent } });
  } catch (e) {
    // Failure telemetry (best-effort) so /owner/ai-metrics successRate is
    // grounded in real outcomes, not just happy paths.
    await writeAiTelemetry(prisma, {
      // authMiddleware guarantees req.user on every route in this router
      // (the handler itself already relies on req.user!.id above); the old
      // 'unknown' fallback would have violated the aiTelemetry.userId FK.
      userId: req.user!.id,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: e instanceof Error ? e.message.slice(0, 200) : 'unknown error',
    });
    next(e);
  }
});

router.get('/conversations', async (req, res, next) => {
  try {
    const data = await prisma.aiConversation.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const conv = await prisma.aiConversation.findFirst({
      where: { id: req.params.id!, userId: req.user!.id },
    });
    if (!conv) throw AppError.notFound('Conversation not found');
    // Bounded read: fetch the newest window then restore chronological
    // order — a plain asc+take would silently cut the NEWEST turns of a
    // long conversation. cuids are time-ordered, so the id tiebreaker
    // keeps same-millisecond turns (user+assistant pair) stable.
    const rows = await prisma.aiMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
    const data = rows.reverse();
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

export default router;
