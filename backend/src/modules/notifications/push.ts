/**
 * R327 C3 — the Expo push fan-out (server half), gated by PUSH_ENABLED.
 *
 * Contract (the M2.6 registration's other shoe):
 *  - fanOutPush(userIds, payload) — BEST-EFFORT delivery to every
 *    registered device of the given users. It NEVER throws into a
 *    caller whose primary write already succeeded (the degraded-twin
 *    law from fire.ts); a failure logs a warning and returns.
 *  - Runs only AFTER the notification row is committed (callers hold
 *    the ids from the transaction, then push) — a rolled-back event
 *    must never produce a phantom bell.
 *  - Dead tokens (DeviceNotRegistered) are pruned on sight — the
 *    device table stays honest without a sweeper.
 *  - With PUSH_ENABLED=false (the default) this is a no-op — the
 *    registration endpoints alone change nothing for the web client.
 */
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { logger } from '../../logger.js';
import type { NotificationPayload } from './core.js';

/** Message shape for expo-server-sdk's classic push API. */
interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: { link: string; type: string };
  sound: 'default' | null;
  channelId: string;
  badge: number;
}

export async function fanOutPush(userIds: string[], payload: NotificationPayload): Promise<void> {
  if (!env.PUSH_ENABLED || userIds.length === 0) return;
  try {
    const devices = await prisma.pushDevice.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, expoToken: true },
    });
    if (devices.length === 0) return;

    const { Expo } = await import('expo-server-sdk');
    const expo = new Expo();

    const messages: PushMessage[] = devices.map((d) => ({
      to: d.expoToken,
      // Urgent rows ring; the rest arrive silently as a badge — the
      // bell inbox stays the surface, the push is the tap on shoulder.
      title: payload.title,
      body: payload.body,
      data: { link: payload.link, type: payload.type },
      sound: payload.type === 'URGENT' ? 'default' : null,
      channelId: 'alerts',
      badge: 1,
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const deadIds: string[] = [];
    for (const chunk of chunks) {
      // Type-narrow the chunk for the classic API (it accepts our shape).
      const tickets = await expo.sendPushNotificationsAsync(chunk as never);
      tickets.forEach((ticket, i) => {
        if (ticket.status === 'error') {
          const details = ticket.details as { error?: string } | undefined;
          if (details?.error === 'DeviceNotRegistered') {
            const token = (chunk[i] as { to?: string }).to;
            const row = devices.find((d) => d.expoToken === token);
            if (row) deadIds.push(row.id);
          } else {
            logger.warn({ ticket }, 'push: ticket error (best-effort, skipped)');
          }
        }
      });
    }
    if (deadIds.length > 0) {
      await prisma.pushDevice.deleteMany({ where: { id: { in: deadIds } } });
      logger.info({ pruned: deadIds.length }, 'push: pruned dead device tokens');
    }
  } catch (e) {
    logger.warn({ err: e, recipients: userIds.length, title: payload.title }, 'push: fan-out failed (best-effort)');
  }
}
