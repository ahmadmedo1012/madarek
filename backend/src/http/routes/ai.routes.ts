import { Router } from 'express';
import { z } from 'zod';
import { AiMessageRole, Prisma, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { resolveCallerInstitutionScope } from '../../lib/profile-scoping.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../logger.js';
import {
  getAiProvider,
  buildChatMessages,
  buildStudentSystemPrompt,
  buildGenericSystemPrompt,
  masteryContextLines,
  windowHistory,
  clipHistoryContent,
  callProviderWithRetry,
  attributedModel,
  providerLabelFromBaseUrl,
  classifyProviderFailure,
  providerFailureMessage,
  AiProviderError,
  AI_HISTORY_TURNS,
  AI_HISTORY_CHAR_CAP,
  type AiChatMessage,
  type MasteryFact,
} from '../../lib/ai.js';

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
    message: z.string().trim().min(1).max(4000),
  })
  .strict();

const GENERIC_RESPONSES = [
  'سؤال جيد! دعني أساعدك في فهم هذا الموضوع بطريقة عملية. ابدأ بمراجعة الأمثلة في محاضراتك ثم انتقل للتطبيق.',
  'جرّب تقسيم الموضوع إلى أجزاء صغيرة ودراستها يومياً لمدة 30 دقيقة، ثم اختبر فهمك بعد كل جزء.',
  'الموضوع يتطلب فهماً نظرياً وتطبيقاً عملياً. اقرأ النظرية أولاً ثم جرّب التمارين العملية في المعامل الافتراضية.',
  'أستطيع مساعدتك في إعداد خطة دراسة أسبوعية مخصصة. أخبرني عن المقرّر الذي تواجه فيه تحدياً.',
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
 * r179 (phase-5): institutionId is an EXPLICIT input — mastery rows
 * are scoped through the concept→course→institution chain so a
 * multi-institution student's reply in institution A is grounded in
 * A's concepts only (the route passes its VERIFIED context down;
 * never re-derived from an unverified claim).
 */
async function composeReply(
  userId: string,
  message: string,
  role: Role,
  institutionId: string,
): Promise<string> {
  if (!isMasteryAwareRole(role)) {
    return GENERIC_RESPONSES[Math.floor(Math.random() * GENERIC_RESPONSES.length)]!;
  }

  // Get the student's mastery state for THIS institution once.
  const masteries = await prisma.studentMastery.findMany({
    where: { studentId: userId, concept: { course: { institutionId } } },
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
 * Honest metrics note: in the default local mode the chat reply is
 * composed locally by `composeReply` (mastery-aware templates) — no
 * external LLM is called, so token counts stay at their 0 defaults
 * rather than fabricating estimates. In openai mode (P4) the model
 * tag is the REAL model string and token counts come from the
 * provider's usage block verbatim (0 when the provider omits usage).
 * Accepts either the root client or a transaction client.
 */
const AI_CHAT_MODEL = 'gap-aware-composer';
const writeAiTelemetry = async (
  client: Prisma.TransactionClient,
  data: {
    userId: string;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
    /** Which engine produced (or failed to produce) the reply. */
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
  },
): Promise<void> => {
  try {
    await client.aiTelemetry.create({
      data: {
        userId: data.userId,
        feature: 'chat',
        model: data.model ?? AI_CHAT_MODEL,
        inputTokens: data.inputTokens ?? 0,
        outputTokens: data.outputTokens ?? 0,
        latencyMs: data.latencyMs,
        success: data.success,
        errorMessage: data.errorMessage ?? null,
      },
    });
  } catch (err) {
    logger.warn({ err }, 'aiTelemetry write failed (non-blocking)');
  }
};

/* ── P4: the real-provider path's data loaders (ai.routes local) ──
 *
 * composeReply (below) keeps its own prisma query untouched — its
 * template logic and tests predate P4 and must not churn. The real
 * provider path needs a PLAIN projection of the same mastery rows
 * for the system prompt, so it gets its own loader here. Same include
 * shape, mapped to MasteryFact (no prisma types cross into lib/ai).
 *
 * r179 (phase-5): EVERY loader takes the institutionId as an EXPLICIT
 * input and scopes through the academic chain — mastery rows through
 * concept→course→institution, enrollments/offerings through
 * offering→course→institution, teaching through course→institution.
 * No prompt context ever blends two institutions; the route threads
 * its VERIFIED context down (see requireChatInstitution). */
async function loadMasteryFacts(userId: string, institutionId: string): Promise<MasteryFact[]> {
  /* r175d (the production 500 fix): the original shape mixed `select`
   * and `include` at the SAME level (`include: { concept: { select: …,
   * include: … } }`) — Prisma 5.22 rejects that at validation time
   * ("Please either use `include` or `select`, but not both"), which
   * 500'd EVERY real-provider chat turn in production (the unit suite
   * mocks prisma, so the validation never ran there; local mode never
   * executes this loader). Rewritten select-only — same projection. */
  const masteries = await prisma.studentMastery.findMany({
    // r179 (phase-5): institution-scoped — only THIS institution's
    // concepts ride the prompt.
    where: { studentId: userId, concept: { course: { institutionId } } },
    /* r176b (A6): bounded to the 25 WEAKEST facts, worst-first — the
     * unbounded read shipped every mastery row (~60 lines for a heavily
     * enrolled student) into every turn's prompt, diluting the
     * gap-first signal and inflating context (mirrors /me/gaps'
     * bounded weakest-first read). */
    orderBy: { level: 'asc' },
    take: 25,
    select: {
      level: true,
      concept: {
        select: {
          name: true,
          course: { select: { name: true } },
          chapters: { take: 1, select: { lecture: { select: { title: true } } } },
        },
      },
    },
  });
  return masteries.map((m) => ({
    conceptName: m.concept.name,
    courseName: m.concept.course.name,
    level: Number(m.level),
    lectureTitle: m.concept.chapters[0]?.lecture?.title ?? undefined,
  }));
}

/* ── r176b: the enrollment/teaching grounding loaders (A7/B4) ──
 *
 * The real-provider system prompt previously saw ONLY mastery facts —
 * the model was blind to what the student is actually enrolled in
 * (while the FE's real-LLM chips promised chapter summaries and
 * quizzes it could not ground). These bounded loaders close that gap
 * with the SAME authorization shape every other route uses: they read
 * from the authenticated userId only, they project titles/counts/
 * dates (never content), and they are strictly bounded. */

/** The student's ACTIVE enrollments in the institution as bounded
 * context lines — course name/code, term, lecture count, and the
 * nearest future assignment when one exists. Take 6: enough for a
 * full pilot term; each line is one short sentence. r179 (phase-5):
 * institution-scoped through offering→course→institution. */
async function loadEnrollmentContext(userId: string, institutionId: string): Promise<string[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: userId, status: 'active', offering: { course: { institutionId } } },
    orderBy: { enrolledAt: 'desc' },
    take: 6,
    select: {
      offering: {
        select: {
          term: true,
          course: { select: { name: true, code: true } },
          _count: { select: { lectures: true } },
          assignments: {
            where: { dueAt: { gte: new Date() } },
            orderBy: { dueAt: 'asc' },
            take: 1,
            select: { title: true, dueAt: true },
          },
        },
      },
    },
  });
  return enrollments.map((e) => {
    const o = e.offering;
    const base = `- «${o.course.name}» (${o.course.code}) — فصل ${o.term}، ${o._count.lectures} محاضرة`;
    const next = o.assignments[0];
    return next
      ? `${base}، أقرب تسليم: «${next.title}» بتاريخ ${next.dueAt.toISOString().slice(0, 10)}`
      : base;
  });
}

/** The offerings a teacher actually teaches IN the institution, as
 * bounded context lines for the generic (non-student) prompt. Take 6.
 * r179 (phase-5): institution-scoped through course→institution — a
 * multi-institution teacher's prompt carries only the offerings of
 * the institution in their verified context. */
async function loadTeachingContext(userId: string, institutionId: string): Promise<string[]> {
  const offerings = await prisma.courseOffering.findMany({
    where: { teacherId: userId, course: { institutionId } },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: {
      term: true,
      course: { select: { name: true, code: true } },
      _count: { select: { enrollments: { where: { status: 'active' } } } },
    },
  });
  return offerings.map(
    (o) => `- «${o.course.name}» (${o.course.code}) — فصل ${o.term}، ${o._count.enrollments} طالبًا مسجلًا`,
  );
}

/** The pre-resolved prompt context for one chat turn (r176b): role-
 * routed (students get mastery+enrollment lines, others their teaching
 * lines) and loaded in PARALLEL with the history read (A8) — the old
 * sequential awaits added extra Neon round trips of latency before
 * the provider call even started. r179 (phase-5): the institution
 * scope is an EXPLICIT input threaded from the route's VERIFIED
 * context. */
interface ChatContextLines {
  masteryLines: string[];
  courseLines: string[];
  teachingLines: string[];
}

async function loadChatContext(
  userId: string,
  role: Role,
  institutionId: string,
): Promise<ChatContextLines> {
  if (isMasteryAwareRole(role)) {
    const [facts, courseLines] = await Promise.all([
      loadMasteryFacts(userId, institutionId),
      loadEnrollmentContext(userId, institutionId),
    ]);
    return { masteryLines: masteryContextLines(facts), courseLines, teachingLines: [] };
  }
  return { masteryLines: [], courseLines: [], teachingLines: await loadTeachingContext(userId, institutionId) };
}

/** Boot-frozen provider resolution: null = local composer mode. */
const aiProvider = getAiProvider();

/* r179 (phase-5): the verified institution-context gate for every AI
 * surface in this router — a contextless institutional caller gets 403
 * INSTITUTION_CONTEXT_REQUIRED (fail closed: the client must POST
 * /auth/select-institution; there is NO default institution), and a
 * stale/forged claim surfaces resolveCallerInstitutionScope's 403
 * INSTITUTION_CONTEXT_INVALID. The returned id is the ONLY scope the
 * route threads into loaders, lookups and writes. */
async function requireChatInstitution(userId: string, claim: string | null): Promise<string> {
  const institutionId = await resolveCallerInstitutionScope(userId, claim);
  if (!institutionId) {
    throw new AppError(
      'INSTITUTION_CONTEXT_REQUIRED',
      'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
      403,
    );
  }
  return institutionId;
}

/** r175: the honest provider LABEL. `AI_PROVIDER=openai` is the
 * OpenAI-compatible TRANSPORT mode; the label says WHO actually
 * answers — `openrouter` for openrouter.ai, `openai` for OpenAI
 * itself, the hostname for any other compatible endpoint. This is
 * what the chat envelope's `engine` field and /ai/config's
 * `provider` field report — OpenRouter must never wear OpenAI's
 * name merely because it speaks the same protocol. */
const aiProviderLabel = aiProvider ? providerLabelFromBaseUrl(aiProvider.baseUrl) : 'local';

/** r176i: the attempted-route string. With an ordered AI_MODELS list
 * the route IS the list (joined, comma-separated — still one string
 * for the envelope/telemetry `model` fields); otherwise the
 * configured router id. Used as the attribution FALLBACK (a response
 * without a provider-reported model can never claim one fixed model
 * the list no longer promises) and as failure telemetry's honest
 * "what was attempted". Null in local mode. */
const aiRouteId = aiProvider
  ? aiProvider.models.length > 0
    ? aiProvider.models.join(',')
    : aiProvider.model
  : null;

/** The real-provider reply. NO silent fallback on failure — the owner
 * configured a real model, so an honest Arabic error + retry (the FE
 * already renders one) beats a template reply wearing an LLM badge.
 * Failure telemetry is written by the route's catch (one place).
 * r176a: the provider call rides callProviderWithRetry (ONE bounded
 * jittered retry for fast-fail transients: 429/transport/5xx — before
 * any DB write, so side-effect-free; timeouts surface immediately).
 * r176b: the prompt context arrives PRE-LOADED (loadChatContext ran
 * in parallel with the history read) — no sequential awaits here. */
async function composeReplyWithProvider(
  message: string,
  role: Role,
  history: readonly AiChatMessage[],
  context: ChatContextLines,
): Promise<{ reply: string; inputTokens: number; outputTokens: number; model: string }> {
  const system = isMasteryAwareRole(role)
    ? buildStudentSystemPrompt(context.masteryLines, context.courseLines)
    : buildGenericSystemPrompt(context.teachingLines);
  const completion = await callProviderWithRetry(
    aiProvider!,
    buildChatMessages(system, history, message),
    (obj, msg) => logger.warn(obj, msg),
  );
  return {
    reply: completion.content,
    inputTokens: completion.inputTokens,
    outputTokens: completion.outputTokens,
    /* r175 — per-RESPONSE attribution: OpenRouter's free router may
     * land on a different underlying model each response, so the
     * provider's own `model` field is the only honest per-response
     * truth. When the provider omitted it, attributedModel() falls
     * back to the configured route clearly flagged
     * `(unattributed)` — never presented as the exact model. r176i:
     * the fallback is the AI_MODELS list (joined) when one is set —
     * `openrouter/free` is no longer the attempted route. */
    model: attributedModel(completion.model, aiRouteId!),
  };
}

router.post('/chat', aiLimiter, validate(chatSchema), async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const userId = req.user!.id;
    const { conversationId, message } = req.body as z.infer<typeof chatSchema>;

    /* r179 (phase-5) minimal lead fix: the chat is institution-scoped.
     * Resolve the caller's VERIFIED institution context (re-checked
     * against the DB — the token claim alone is never trusted). No
     * context → 403 (the client must select an institution first);
     * a conversation id from ANOTHER institution is a 404, not a
     * cross-context read. */
    const chatInstitutionId = await requireChatInstitution(userId, req.user!.institutionId);

    // Single conversation lookup (previously a conditional DOUBLE lookup —
    // findFirst then findUnique on the same row). A provided id that
    // doesn't resolve to one of the caller's conversations is a 404,
    // not a silent new-conversation creation that strands the id.
    // r179: the conversation must ALSO belong to the caller's current
    // institution context.
    const conv = conversationId
      ? await prisma.aiConversation.findFirst({
          where: { id: conversationId, userId, institutionId: chatInstitutionId },
        })
      : null;
    if (conversationId && !conv) throw AppError.notFound('المحادثة غير موجودة');

    /* P4 mode switch: openai mode loads the conversation's recent
     * turns (newest-first bounded read, re-oriented chronologically —
     * the /conversations/:id/messages pattern) so the model gets real
     * context, IN PARALLEL with the role-routed prompt context
     * (r176b) — two independent reads must not serialize. Local mode
     * ignores both exactly as before. r176a: each HISTORY turn is also
     * content-clipped (AI_HISTORY_CHAR_CAP) — the turn window alone
     * can still overflow small free-model context windows; the NEW
     * user message below is never clipped. */
    let history: AiChatMessage[] = [];
    let context: ChatContextLines = { masteryLines: [], courseLines: [], teachingLines: [] };
    if (aiProvider) {
      const [rows, ctx] = await Promise.all([
        conv
          ? prisma.aiMessage.findMany({
              where: { conversationId: conv.id },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: AI_HISTORY_TURNS,
            })
          : Promise.resolve([]),
        loadChatContext(userId, req.user!.role, chatInstitutionId),
      ]);
      context = ctx;
      history = clipHistoryContent(
        windowHistory(rows, AI_HISTORY_TURNS)
          .map((row): AiChatMessage =>
            row.role === AiMessageRole.USER
              ? { role: 'user', content: row.content }
              : row.role === AiMessageRole.ASSISTANT
                ? { role: 'assistant', content: row.content }
                : { role: 'system', content: row.content },
          )
          // A stored SYSTEM row (none are written today) would collide
          // with the fresh system prompt above — drop them.
          .filter((m) => m.role !== 'system'),
        AI_HISTORY_CHAR_CAP,
      );
    }

    /* The reply engine: real provider when configured, local composer
     * otherwise. On provider failure the catch below writes failure
     * telemetry (with the attempted model) and surfaces one honest
     * Arabic error — no silent template fallback (see composeReplyWithProvider). */
    const engine = aiProvider
      ? await composeReplyWithProvider(message, req.user!.role, history, context)
      : { reply: await composeReply(userId, message, req.user!.role, chatInstitutionId), model: AI_CHAT_MODEL, inputTokens: 0, outputTokens: 0 };

    // All chat writes (conversation create + both messages + telemetry)
    // in ONE transaction — previously three separate non-transactional
    // writes that could strand an orphan user message when a later write failed.
    const { conversationId: finalId, assistantContent } = await prisma.$transaction(
      async (tx) => {
        const conversation =
          conv ??
          (await tx.aiConversation.create({
            data: { userId, institutionId: chatInstitutionId, title: conversationTitle(message) },
          }));
        await tx.aiMessage.create({
          data: { conversationId: conversation.id, role: AiMessageRole.USER, content: message },
        });
        const assistantMsg = await tx.aiMessage.create({
          // AiMessage.tokens: the provider's real output-token count in
          // openai mode; 0 in local mode (honest — nothing was counted).
          data: {
            conversationId: conversation.id,
            role: AiMessageRole.ASSISTANT,
            content: engine.reply,
            tokens: engine.outputTokens,
          },
        });
        await writeAiTelemetry(tx, {
          userId,
          latencyMs: Date.now() - startedAt,
          success: true,
          model: engine.model,
          inputTokens: engine.inputTokens,
          outputTokens: engine.outputTokens,
        });
        return { conversationId: conversation.id, assistantContent: assistantMsg.content };
      },
    );

    res.json({
      data: {
        conversationId: finalId,
        reply: assistantContent,
        /* r166d (WS-F5) — per-turn engine attribution, additive: the
         * client can tag THIS reply with the engine that produced it
         * (the boot-level /ai/config badge can flip across a redeploy
         * mid-conversation; per-turn data stays honest about each turn).
         * r175: `engine` is the honest provider LABEL (openrouter for
         * OpenRouter — not `openai` merely because the transport is
         * OpenAI-compatible), and `model` is the per-RESPONSE
         * attribution: the provider-reported model when OpenRouter's
         * free router named one, else the configured router id clearly
         * flagged (unattributed). Locally: 'local' + the composer tag —
         * never a fabricated name. */
        engine: aiProviderLabel,
        model: engine.model,
      },
    });
  } catch (e) {
    // Failure telemetry (best-effort) so /owner/ai-metrics successRate is
    // grounded in real outcomes, not just happy paths. r176a: the
    // persisted errorMessage is the CLASSIFIED kind (+HTTP status when
    // there was one) — the provider's response-body excerpt stays in the
    // server log only (logger.warn below), never in the DB where a
    // future row-surfacing route could leak provider diagnostics.
    const failureKind = classifyProviderFailure(e);
    const failureDetail = e instanceof AiProviderError && e.status ? ` (HTTP ${e.status})` : '';
    await writeAiTelemetry(prisma, {
      // authMiddleware guarantees req.user on every route in this router
      // (the handler itself already relies on req.user!.id above); the old
      // 'unknown' fallback would have violated the aiTelemetry.userId FK.
      userId: req.user!.id,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorMessage: `${failureKind}${failureDetail}`.slice(0, 200),
      // P4: a provider failure is attributed to the route that was
      // attempted (local-mode failures keep the composer tag). r176i:
      // with an AI_MODELS list the attempted route is the LIST
      // (joined), not the stale `openrouter/free` router id.
      model: aiRouteId ?? undefined,
    });
    // r176a: classified client-safe Arabic messages — a free-tier 429
    // ("wait a minute"), a timeout ("try again — the router will likely
    // pick another model"), and a rejected payload are no longer the
    // same sentence. Non-AiProviderError failures flow through
    // unchanged (the error handler's default Arabic 500).
    if (e instanceof Error && e.name === 'AiProviderError') {
      logger.warn({ err: e, kind: failureKind }, 'AI provider call failed');
      next(AppError.internal(providerFailureMessage(failureKind)));
      return;
    }
    next(e);
  }
});

/* P4: the honest-surface endpoint — the FE badge/subtitle must state
 * which engine is answering (a template composer is NOT an LLM, and
 * an LLM badge on template replies would be a lie). Returns the mode
 * + the real model string when configured; model stays null in local
 * mode so no surface can render a fake model name. r175: `provider`
 * is the honest LABEL (openrouter/openai/hostname — the configured
 * ROUTER, distinct from the per-response model the chat envelope
 * carries); `model` here is the configured route id, which for
 * `openrouter/free` honestly reads as a router, not one fixed model. */
router.get('/config', (_req, res) => {
  res.json({
    data: {
      provider: aiProviderLabel,
      /* r176i: the honest routing surface — an ordered models list is
       * itself the route (the per-response attribution in the chat
       * envelope still names whichever listed model actually answered). */
      model: aiProvider
        ? aiProvider.models.length > 0
          ? `${aiProvider.models[0]}${aiProvider.models.length > 1 ? ` +${aiProvider.models.length - 1}` : ''}`
          : aiProvider.model
        : null,
    },
  });
});

/* r179 (phase-5): the conversation family is institution-scoped —
 * list/detail/messages/delete ALL filter by the caller's VERIFIED
 * context (userId + institutionId). A conversation created in
 * institution A is invisible (and undeletable) while the token's
 * context is B: the findFirst simply does not resolve it → 404, the
 * same envelope as a nonexistent id (no cross-institution existence
 * leak). A contextless institutional caller is 403 fail-closed. */
router.get('/conversations', async (req, res, next) => {
  try {
    const institutionId = await requireChatInstitution(req.user!.id, req.user!.institutionId);
    const data = await prisma.aiConversation.findMany({
      where: { userId: req.user!.id, institutionId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

/* r179 (phase-5): the single-conversation read (the detail twin of
 * the delete route) — same ownership + institution filter. */
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const institutionId = await requireChatInstitution(req.user!.id, req.user!.institutionId);
    const conv = await prisma.aiConversation.findFirst({
      where: { id: req.params.id!, userId: req.user!.id, institutionId },
    });
    if (!conv) throw AppError.notFound('المحادثة غير موجودة');
    res.json({ data: conv });
  } catch (e) {
    next(e);
  }
});

router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const institutionId = await requireChatInstitution(req.user!.id, req.user!.institutionId);
    const conv = await prisma.aiConversation.findFirst({
      where: { id: req.params.id!, userId: req.user!.id, institutionId },
    });
    if (!conv) throw AppError.notFound('المحادثة غير موجودة');
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

/* r164g — conversation clear (the student's «حذف المحادثة»). The
 * ownership check runs FIRST via the same findFirst shape the GET
 * routes use — a bare prisma.aiConversation.delete({ where: { id } })
 * would let any authenticated user delete any conversation by guessing
 * a cuid. r179 (phase-5): the institution filter rides the same lookup —
 * a conversation of ANOTHER institution context is a 404 (not a
 * cross-context delete). The delete itself cascades the messages
 * (schema onDelete: Cascade), so one call clears the whole exchange.
 * Response mirrors the annotations delete family: { data: { ok: true } }.
 * No rate limiter: a bounded row removal, not an expensive AI call. */
router.delete('/conversations/:id', async (req, res, next) => {
  try {
    const institutionId = await requireChatInstitution(req.user!.id, req.user!.institutionId);
    const conv = await prisma.aiConversation.findFirst({
      where: { id: req.params.id!, userId: req.user!.id, institutionId },
    });
    if (!conv) throw AppError.notFound('المحادثة غير موجودة');
    await prisma.aiConversation.delete({ where: { id: conv.id } });
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

export default router;
