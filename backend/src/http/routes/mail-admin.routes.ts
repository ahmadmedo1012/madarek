/**
 * R350 E6 — the admin «البريد» surface (ADMIN/OWNER):
 *
 *   GET  /admin/mail/status            provider config + 24h counters
 *   GET  /admin/mail/outbox            the delivery log (filters + paging)
 *   POST /admin/mail/outbox/:id/retry  requeue a failed/suppressed row
 *   POST /admin/mail/outbox/:id/cancel stop a queued row (terminal, audited)
 *   GET  /admin/mail/suppression       the suppression list
 *   DEL  /admin/mail/suppression/:id   lift a suppression (audited)
 *   POST /admin/mail/test-send         queue a real test email
 *
 * Every mutation writes AuditLog. Reads never leak mail BODIES to the
 * log surface — only to/template/subject/status/providerId/attempts.
 */
import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { paginationSchema, buildMeta } from '../../lib/pagination.js';
import { AppError } from '../../lib/errors.js';
import { mailConfig } from '../../lib/mail.js';
import { queueMail, RECIPIENT_DAILY_CAP, INSTITUTION_DAILY_CAP, RETRY_DELAYS_MS } from '../../lib/mail-outbox.js';
import { renderEmailShell } from '../../lib/mail.js';
import { mailPreviewEnabled, MAIL_TEMPLATE_SAMPLES } from './mail.routes.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole(Role.ADMIN, Role.OWNER));

/* ── schemas ─────────────────────────────────────────────────────── */

const outboxQuerySchema = paginationSchema.extend({
  status: z.enum(['queued', 'sending', 'sent', 'failed', 'suppressed']).optional(),
  template: z.string().trim().min(1).max(64).optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

const testSendSchema = z.object({
  to: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
});

const SUPPRESSION_TYPES = ['hard_bounce', 'complaint', 'unsubscribe', 'manual'] as const;

const suppressionQuerySchema = paginationSchema.extend({
  type: z.enum(SUPPRESSION_TYPES).optional(),
});

/* ── GET /admin/mail/status — the provider + 24h picture ─────────── */

router.get('/status', async (_req, res, next) => {
  try {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const [byStatus24h, outboxTotals, suppressionTotal, lastSent] = await Promise.all([
      prisma.mailOutbox.groupBy({
        by: ['status'],
        where: { createdAt: { gte: dayStart } },
        _count: { _all: true },
      }),
      prisma.mailOutbox.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.mailSuppression.count(),
      prisma.mailOutbox.findFirst({ where: { status: 'sent' }, orderBy: { sentAt: 'desc' }, select: { sentAt: true, template: true } }),
    ]);
    const pick = (rows: { status: string; _count: { _all: number } }[], s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
    res.json({
      data: {
        provider: mailConfig.provider,
        configured: mailConfig.provider !== 'none' && Boolean(mailConfig.apiKey),
        from: mailConfig.from,
        // domain verification is owner-side (the key is send-only — E1);
        // the page says so instead of pretending to check it.
        domainVerified: null,
        previewEnabled: mailPreviewEnabled(),
        caps: { recipientDaily: RECIPIENT_DAILY_CAP, institutionDaily: INSTITUTION_DAILY_CAP },
        retryScheduleMin: RETRY_DELAYS_MS.map((ms) => Math.round(ms / 60_000)),
        last24h: {
          queued: pick(byStatus24h, 'queued'),
          sending: pick(byStatus24h, 'sending'),
          sent: pick(byStatus24h, 'sent'),
          failed: pick(byStatus24h, 'failed'),
          suppressed: pick(byStatus24h, 'suppressed'),
        },
        outboxTotals: {
          queued: pick(outboxTotals, 'queued'),
          sending: pick(outboxTotals, 'sending'),
          sent: pick(outboxTotals, 'sent'),
          failed: pick(outboxTotals, 'failed'),
          suppressed: pick(outboxTotals, 'suppressed'),
        },
        suppressionTotal,
        lastSentAt: lastSent?.sentAt ?? null,
        lastSentTemplate: lastSent?.template ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/* ── GET /admin/mail/outbox — the delivery log ───────────────────── */

router.get('/outbox', validate(outboxQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, status, template, q } = req.query as unknown as {
      page: number;
      limit: number;
      status?: 'queued' | 'sending' | 'sent' | 'failed' | 'suppressed';
      template?: string;
      q?: string;
    };
    const where = {
      ...(status ? { status } : {}),
      ...(template ? { template } : {}),
      ...(q ? { OR: [{ to: { contains: q, mode: 'insensitive' as const } }, { subject: { contains: q, mode: 'insensitive' as const } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.mailOutbox.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        // NO html/text — the log never ships bodies
        select: {
          id: true, to: true, template: true, subject: true, status: true,
          attempts: true, nextAttemptAt: true, providerId: true, lastError: true,
          dedupeKey: true, sentAt: true, createdAt: true,
        },
      }),
      prisma.mailOutbox.count({ where }),
    ]);
    res.json({ data: rows, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
});

/* ── POST /admin/mail/outbox/:id/retry — requeue terminal rows ───── */

router.post('/outbox/:id/retry', async (req, res, next) => {
  try {
    const row = await prisma.mailOutbox.findUnique({ where: { id: req.params.id } });
    if (!row) throw new AppError('NOT_FOUND', 'الرسالة غير موجودة', 404);
    if (row.status !== 'failed' && row.status !== 'suppressed') {
      throw new AppError('CONFLICT', `لا يمكن إعادة محاولة رسالة حالتها ${row.status}`, 409);
    }
    const updated = await prisma.mailOutbox.update({
      where: { id: row.id },
      data: { status: 'queued', nextAttemptAt: new Date(), lastError: null },
      select: { id: true, status: true, attempts: true },
    });
    await prisma.auditLog.create({
      data: {
        action: 'MAIL_OUTBOX_RETRY',
        resourceType: 'MailOutbox',
        resourceId: row.id,
        userId: req.user!.id,
        metadata: { to: row.to, template: row.template, attempts: row.attempts, fromStatus: row.status },
      },
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/* ── POST /admin/mail/outbox/:id/cancel — stop a queued row ──────── */

router.post('/outbox/:id/cancel', async (req, res, next) => {
  try {
    const row = await prisma.mailOutbox.findUnique({ where: { id: req.params.id } });
    if (!row) throw new AppError('NOT_FOUND', 'الرسالة غير موجودة', 404);
    if (row.status !== 'queued' && row.status !== 'sending') {
      throw new AppError('CONFLICT', `لا يمكن إلغاء رسالة حالتها ${row.status}`, 409);
    }
    // Terminal + audited: `failed` with a cancelled marker is never
    // re-picked by the drain (only `queued` rows are due) and stays
    // visible in the log with its reason.
    const updated = await prisma.mailOutbox.update({
      where: { id: row.id },
      data: { status: 'failed', lastError: `cancelled by ${req.user!.id}` },
      select: { id: true, status: true, lastError: true },
    });
    await prisma.auditLog.create({
      data: {
        action: 'MAIL_OUTBOX_CANCEL',
        resourceType: 'MailOutbox',
        resourceId: row.id,
        userId: req.user!.id,
        metadata: { to: row.to, template: row.template, fromStatus: row.status },
      },
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

/* ── GET /admin/mail/suppression — the list ──────────────────────── */

router.get('/suppression', validate(suppressionQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit, type } = req.query as unknown as { page: number; limit: number; type?: (typeof SUPPRESSION_TYPES)[number] };
    const where = type ? { type } : {};
    const [rows, total] = await Promise.all([
      prisma.mailSuppression.findMany({ where, orderBy: { suppressedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.mailSuppression.count({ where }),
    ]);
    res.json({ data: rows, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
});

/* ── DELETE /admin/mail/suppression/:id — lift one (audited) ─────── */

router.delete('/suppression/:id', async (req, res, next) => {
  try {
    const row = await prisma.mailSuppression.findUnique({ where: { id: req.params.id } });
    if (!row) throw new AppError('NOT_FOUND', 'القيد غير موجود', 404);
    await prisma.mailSuppression.delete({ where: { id: row.id } });
    await prisma.auditLog.create({
      data: {
        action: 'MAIL_SUPPRESSION_REMOVE',
        resourceType: 'MailSuppression',
        resourceId: row.id,
        userId: req.user!.id,
        metadata: { email: row.email, type: row.type, reason: row.reason.slice(0, 200) },
      },
    });
    res.json({ data: { id: row.id, removed: true } });
  } catch (err) {
    next(err);
  }
});

/* ── POST /admin/mail/test-send — a REAL email through the outbox ── */

router.post('/test-send', validate(testSendSchema), async (req, res, next) => {
  try {
    const { to } = req.body as { to: string };
    const subject = 'مدارك — رسالة اختبار';
    const html = renderEmailShell({
      title: 'رسالة اختبار',
      preheader: 'هذه رسالة اختبار من لوحة البريد',
      bodyHtml: '<p style="margin:0;">أُرسلت هذه الرسالة من لوحة «البريد» للتأكد من أن قناة الإرسال تعمل. لا تتطلب أي إجراء منك.</p>',
      ctaLabel: 'الدخول إلى مدارك',
      ctaUrl: `${process.env.APP_ORIGIN ?? 'https://madarek-nine.vercel.app'}/auth/login`,
    });
    const queued = await queueMail({
      to,
      template: 'admin-test',
      subject,
      html,
      text: 'هذه رسالة اختبار من لوحة «البريد» للتأكد من أن قناة الإرسال تعمل.\n',
    });
    await prisma.auditLog.create({
      data: {
        action: 'MAIL_TEST_SEND',
        resourceType: 'MailOutbox',
        resourceId: queued.ok ? queued.id : null,
        userId: req.user!.id,
        metadata: { to, template: 'admin-test', queued: queued.ok, reason: queued.ok ? undefined : queued.reason },
      },
    });
    if (!queued.ok) {
      throw new AppError('CONFLICT', queued.reason === 'cap-recipient' ? 'حد الإرسال اليومي لهذا المستلم ممتلئ' : 'حد الإرسال اليومي للمؤسسة ممتلئ', 429);
    }
    res.json({ data: { id: queued.id, deduped: queued.deduped, to } });
  } catch (err) {
    next(err);
  }
});

/* ── GET /admin/mail/templates — the previewable registry ──────── */

router.get('/templates', (_req, res) => {
  res.json({ data: { templates: Object.keys(MAIL_TEMPLATE_SAMPLES) } });
});

export default router;
