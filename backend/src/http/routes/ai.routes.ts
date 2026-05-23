import { Router } from 'express';
import { z } from 'zod';
import { AiMessageRole } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../validate.js';

const router = Router();
router.use(authMiddleware);

// AI is expensive — stricter rate limit per user.
const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
  standardHeaders: true,
  legacyHeaders: false,
});

const chatSchema = z
  .object({
    conversationId: z.string().cuid().optional(),
    message: z.string().min(1).max(4000),
  })
  .strict();

const STUB_RESPONSES = [
  'بالطبع! هذا الموضوع يعتمد على مفهوم أساسي في علوم الحاسوب. دعني أشرح لك بطريقة بسيطة...',
  'سؤال ممتاز! بناءً على أدائك في المواد السابقة، أنصحك بـ...',
  'تحليل أدائك يشير إلى أنك قوي في الجانب النظري. للتحسين، جرب هذا النهج العملي...',
  'يمكنني مساعدتك في فهم هذا المفهوم. في الواقع، يرتبط بما درسته في مادة...',
];

router.post('/chat', aiLimiter, validate(chatSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { conversationId, message } = req.body as z.infer<typeof chatSchema>;
    const conv =
      conversationId && (await prisma.aiConversation.findFirst({ where: { id: conversationId, userId } }))
        ? await prisma.aiConversation.findUnique({ where: { id: conversationId } })
        : await prisma.aiConversation.create({ data: { userId, title: message.slice(0, 60) } });

    await prisma.aiMessage.create({
      data: { conversationId: conv!.id, role: AiMessageRole.USER, content: message },
    });

    // TODO: replace with real LLM call (OpenAI/Anthropic) when API key env is provided.
    const reply = STUB_RESPONSES[Math.floor(Math.random() * STUB_RESPONSES.length)] ?? STUB_RESPONSES[0]!;
    const assistantMsg = await prisma.aiMessage.create({
      data: { conversationId: conv!.id, role: AiMessageRole.ASSISTANT, content: reply },
    });

    res.json({ data: { conversationId: conv!.id, reply: assistantMsg.content } });
  } catch (e) {
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
    if (!conv) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    const data = await prisma.aiMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

export default router;
