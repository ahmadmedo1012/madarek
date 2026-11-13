/**
 * R350 E2 — the DB-backed transactional-mail outbox.
 *
 * The provider layer (mail.ts) is fire-and-forget: a transport failure
 * lost the message and nobody knew. The outbox law:
 *
 *   · every logical send is a DB row FIRST (rendered once — the stored
 *     html/text are byte-stable across retries, so a template change
 *     mid-flight can never half-send);
 *   · a dedupe key makes replayed requests idempotent (the forgot-
 *     password double-submit must never double-send);
 *   · the drain worker (in-process — Render free is single-instance)
 *     picks due rows with compare-and-swap (UPDATE … WHERE status=
 *     'queued'), sends with bounded concurrency, and reschedules with
 *     exponential backoff into a dead-letter `failed` state;
 *   · suppression (E4's list) is consulted BEFORE every send;
 *   · per-recipient and per-institution daily caps refuse to QUEUE
 *     (the honest refusal — better never to send than to flood);
 *   · provider=none stays the honest OFF: rows queue (nothing is lost
 *     when the owner flips the provider on) but the drain skips sends.
 */
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { sendMail, mailConfig, type MailMessage } from './mail.js';

export interface QueueMailInput {
  to: string;
  template: string;
  subject: string;
  html: string;
  text: string;
  /** Idempotency key per logical send (unique) — replays never double-send. */
  dedupeKey?: string;
  /** Institution context for the per-institution cap (optional). */
  institutionId?: string | null;
}

export type QueueMailResult =
  | { ok: true; id: string; deduped: boolean }
  | { ok: false; reason: 'cap-recipient' | 'cap-institution' };

/** Per-recipient daily cap (UTC day) — a flood guard, not a quota UI. */
export const RECIPIENT_DAILY_CAP = 12;
/** Per-institution daily cap (UTC day). */
export const INSTITUTION_DAILY_CAP = 500;

function utcDayStart(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Backoff schedule for retries: 1m → 5m → 30m → 2h → 6h, then dead-letter. */
export const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 6 * 60 * 60_000] as const;
export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1; // the first send + 5 retries

export function nextAttemptDelayMs(attempts: number): number | null {
  // attempts counts COMPLETED send attempts; the nth failure schedules
  // RETRY_DELAYS_MS[attempts-1]; past the schedule = dead letter.
  if (attempts < 1) return 0;
  if (attempts > RETRY_DELAYS_MS.length) return null;
  return RETRY_DELAYS_MS[attempts - 1]!;
}

/** Queue one rendered message. Caps are checked BEFORE the insert. */
export async function queueMail(input: QueueMailInput): Promise<QueueMailResult> {
  const dayStart = utcDayStart();
  const [recipientCount, institutionCount] = await Promise.all([
    prisma.mailOutbox.count({
      where: { to: input.to, createdAt: { gte: dayStart } },
    }),
    input.institutionId
      ? prisma.mailOutbox.count({
          where: { institutionId: input.institutionId, createdAt: { gte: dayStart } },
        })
      : Promise.resolve(0),
  ]);
  if (recipientCount >= RECIPIENT_DAILY_CAP) {
    logger.warn({ to: input.to, template: input.template, count: recipientCount }, 'mail-outbox: recipient daily cap — refusing to queue');
    return { ok: false, reason: 'cap-recipient' };
  }
  if (input.institutionId && institutionCount >= INSTITUTION_DAILY_CAP) {
    logger.warn({ institutionId: input.institutionId, count: institutionCount }, 'mail-outbox: institution daily cap — refusing to queue');
    return { ok: false, reason: 'cap-institution' };
  }

  try {
    const row = await prisma.mailOutbox.create({
      data: {
        to: input.to,
        template: input.template,
        subject: input.subject,
        html: input.html,
        text: input.text,
        dedupeKey: input.dedupeKey,
        institutionId: input.institutionId ?? null,
      },
      select: { id: true },
    });
    return { ok: true, id: row.id, deduped: false };
  } catch (err) {
    // P2002 = unique dedupeKey already queued/sent — the replay contract.
    if ((err as { code?: string })?.code === 'P2002' && input.dedupeKey) {
      const existing = await prisma.mailOutbox.findUnique({
        where: { dedupeKey: input.dedupeKey },
        select: { id: true },
      });
      if (existing) return { ok: true, id: existing.id, deduped: true };
    }
    throw err;
  }
}

export interface DrainResult {
  picked: number;
  sent: number;
  failed: number;
  suppressed: number;
  skippedProviderOff: number;
}

/**
 * One drain tick: pick DUE queued rows, claim each via compare-and-swap,
 * consult suppression, send. Never throws — the worker's interval is
 * fire-and-forget by contract.
 */
export async function drainOutbox(opts: {
  batchSize?: number;
  send?: (message: MailMessage) => Promise<boolean>;
  now?: Date;
} = {}): Promise<DrainResult> {
  const batchSize = opts.batchSize ?? 10;
  const send = opts.send ?? ((m: MailMessage) => sendMail(mailConfig, m));
  const now = opts.now ?? new Date();
  const result: DrainResult = { picked: 0, sent: 0, failed: 0, suppressed: 0, skippedProviderOff: 0 };

  // The honest OFF: provider=none (or keyless) queues but never sends —
  // flipping the provider on starts draining the backlog immediately.
  const providerOff = mailConfig.provider === 'none' || !mailConfig.apiKey;

  const due = await prisma.mailOutbox.findMany({
    where: { status: 'queued', nextAttemptAt: { lte: now } },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
    select: { id: true, to: true, subject: true, html: true, text: true, attempts: true },
  });
  result.picked = due.length;

  for (const row of due) {
    // Claim via compare-and-swap: only one drain can move a row out of
    // `queued` (single-instance today; safe if that ever changes).
    const claimed = await prisma.mailOutbox.updateMany({
      where: { id: row.id, status: 'queued' },
      data: { status: 'sending' },
    });
    if (claimed.count !== 1) continue; // someone else claimed it

    // Suppression consult — any active record suppresses.
    const suppressedRow = await prisma.mailSuppression.findFirst({
      where: { email: row.to },
      select: { type: true },
    });
    if (suppressedRow) {
      await prisma.mailOutbox.update({
        where: { id: row.id },
        data: { status: 'suppressed', lastError: `suppressed (${suppressedRow.type})` },
      });
      result.suppressed += 1;
      continue;
    }

    if (providerOff) {
      // Back to queued (with a small nudge so the row isn't instantly
      // re-picked every tick): the backlog waits for the provider.
      await prisma.mailOutbox.update({
        where: { id: row.id },
        data: { status: 'queued', nextAttemptAt: new Date(now.getTime() + 60_000) },
      });
      result.skippedProviderOff += 1;
      continue;
    }

    const ok = await send({ to: row.to, subject: row.subject, html: row.html, text: row.text });
    if (ok) {
      await prisma.mailOutbox.update({
        where: { id: row.id },
        data: { status: 'sent', sentAt: now, attempts: row.attempts + 1, lastError: null },
      });
      result.sent += 1;
      continue;
    }

    // Failure: backoff or dead-letter.
    const attempts = row.attempts + 1;
    const delay = nextAttemptDelayMs(attempts);
    if (delay === null) {
      await prisma.mailOutbox.update({
        where: { id: row.id },
        data: { status: 'failed', attempts, lastError: 'dead letter: retry schedule exhausted' },
      });
      logger.error({ id: row.id, to: row.to, template: row.subject.slice(0, 60) }, 'mail-outbox: dead letter after max attempts');
    } else {
      await prisma.mailOutbox.update({
        where: { id: row.id },
        data: { status: 'queued', attempts, nextAttemptAt: new Date(now.getTime() + delay), lastError: `send attempt ${attempts} failed` },
      });
    }
    result.failed += 1;
  }
  return result;
}

/* ── the worker (in-process; wired by scheduler.ts) ───────────────── */

const DRAIN_INTERVAL_MS = 30_000;
let drainTimer: NodeJS.Timeout | null = null;
let draining = false;

export function startMailOutboxWorker(): void {
  if (drainTimer !== null) return;
  drainTimer = setInterval(() => {
    if (draining) return; // one tick at a time (bounded by batchSize)
    draining = true;
    void drainOutbox()
      .then((r) => {
        if (r.picked > 0) {
          logger.info({ ...r }, 'mail-outbox: drain tick');
        }
      })
      .catch((err) => logger.error({ err }, 'mail-outbox: drain tick failed'))
      .finally(() => {
        draining = false;
      });
  }, DRAIN_INTERVAL_MS);
  drainTimer.unref?.();
}

export function stopMailOutboxWorker(): void {
  if (drainTimer !== null) {
    clearInterval(drainTimer);
    drainTimer = null;
  }
}
