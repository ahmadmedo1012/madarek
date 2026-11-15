/**
 * The Expo push fan-out (server half) — r326 C3, extended by R353 N.
 *
 * Contract (the M2.6 registration's other shoe):
 *  - fanOutPush(userIds, payload) — BEST-EFFORT delivery to every
 *    registered device of the given users. It NEVER throws into a
 *    caller whose primary write already succeeded (the degraded-twin
 *    law from fire.ts); a failure logs a warning and returns.
 *  - Runs only AFTER the notification row is committed (callers hold
 *    the ids from the transaction, then push) — a rolled-back event
 *    must never produce a phantom bell.
 *  - Dead tokens (DeviceNotRegistered) are pruned on sight from BOTH
 *    the send tickets and the delivery receipts — the device table
 *    stays honest without a sweeper.
 *
 * R353 N additions:
 *  - PUSH_ENABLED now defaults TRUE (env.ts) — the mobile push lane
 *    needs no dashboard trip to breathe.
 *  - Per-user push preferences + quiet hours: one batched
 *    NotificationPreference read drops muted recipients BEFORE the
 *    send (pushEnabled=false, or the current UTC hour inside
 *    [quietStart, quietEnd) — isQuietHour in core.ts handles the
 *    wrap-around). The bell inbox row the caller already wrote is
 *    never affected: this mutes the tap on the shoulder, not the
 *    record. A failed preference read fails CLOSED (the outer catch
 *    aborts the fan-out) — a DB hiccup must not blast pushes at users
 *    who asked for silence.
 *  - Receipts: the send answers with tickets, but the DELIVERY verdict
 *    (where FCM/APNs actually report DeviceNotRegistered) lands in the
 *    receipts. We fetch them once, chunked, right after the sends —
 *    fast verdicts prune immediately; slow ones (Expo warns receipts
 *    can lag) are simply missed by this best-effort pass and caught by
 *    the next event's attempt. Never throws, never blocks pruning.
 */
import { prisma } from '../../db.js';
import { env } from '../../env.js';
import { logger } from '../../logger.js';
import { isQuietHour, type NotificationPayload } from './core.js';

/** Message shape for expo-server-sdk's classic push API. */
interface PushMessage {
  to: string;
  title: string;
  subtitle: string;
  body: string;
  data: { link: string; type: string };
  sound: 'default' | null;
  channelId: string;
  badge: number;
  priority: 'default' | 'high';
  /** Android collapse key / iOS apns-collapse-id (see the comment at the builder). */
  collapseId: string;
}

/** The structural slice of the Expo client the receipt pass needs —
 * kept interface-only so the unit tests can stub it without the SDK. */
interface ReceiptReader {
  chunkPushNotificationReceiptIds(ids: string[]): string[][];
  getPushNotificationReceiptsAsync(
    ids: string[],
  ): Promise<Record<string, { status: 'ok' | 'error'; message?: string; details?: { error?: string } }>>;
}

/** Users whose (category) preference mutes THIS send — absent row = ON
 *  (the E3 absent-row law); a lone quiet-hours end is not a window. */
async function mutedByPreference(userIds: string[], category: string): Promise<Set<string>> {
  const muted = new Set<string>();
  // ONE batched read for the whole audience (R353 N's query budget).
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds }, category },
    select: { userId: true, pushEnabled: true, quietStart: true, quietEnd: true },
  });
  if (prefs.length === 0) return muted;
  const hour = new Date().getUTCHours();
  for (const p of prefs) {
    if (!p.pushEnabled) muted.add(p.userId);
    else if (p.quietStart !== null && p.quietEnd !== null && isQuietHour(hour, p.quietStart, p.quietEnd)) {
      muted.add(p.userId);
    }
  }
  if (muted.size > 0) {
    logger.info({ muted: muted.size, category, hour }, 'push: recipients muted (push off or quiet hours)');
  }
  return muted;
}

/** The delivery-receipt pass (R353 N): fetch the receipts for the ok
 *  tickets (chunked), prune DeviceNotRegistered, log the rest. A quiet
 *  skip is a DROP for that event's push, not a deferral — the inbox
 *  row already exists and the next event retries the token anyway. */
async function processReceipts(
  expo: ReceiptReader,
  receiptToDevice: Map<string, string>,
  deadIds: Set<string>,
): Promise<void> {
  if (receiptToDevice.size === 0) return;
  try {
    const ids = [...receiptToDevice.keys()];
    for (const chunk of expo.chunkPushNotificationReceiptIds(ids)) {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [id, receipt] of Object.entries(receipts)) {
        if (receipt.status !== 'error') continue;
        const deviceId = receiptToDevice.get(id);
        if (receipt.details?.error === 'DeviceNotRegistered' && deviceId) {
          deadIds.add(deviceId);
        } else {
          logger.warn({ receiptId: id, receipt }, 'push: receipt error (best-effort, logged)');
        }
      }
    }
  } catch (e) {
    // Best-effort inside a best-effort: a receipts failure never
    // throws, and never undoes the ticket-stage pruning below it.
    logger.warn({ err: e, receipts: receiptToDevice.size }, 'push: receipt pass failed (best-effort)');
  }
}

export async function fanOutPush(userIds: string[], payload: NotificationPayload): Promise<void> {
  if (!env.PUSH_ENABLED || userIds.length === 0) return;
  try {
    const devices = await prisma.pushDevice.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, userId: true, expoToken: true },
    });
    if (devices.length === 0) return;

    // R353 N — the mute pass (push off / quiet hours). The inbox row is
    // the caller's business; this only trims the push audience.
    const muted = await mutedByPreference(userIds, payload.type);
    const sendable = muted.size === 0 ? devices : devices.filter((d) => !muted.has(d.userId));
    if (sendable.length === 0) {
      logger.info({ recipients: devices.length, category: payload.type }, 'push: every recipient muted — send skipped');
      return;
    }

    const { Expo } = await import('expo-server-sdk');
    const expo = new Expo();

    const messages: PushMessage[] = sendable.map((d) => ({
      to: d.expoToken,
      // Urgent rows ring; the rest arrive silently as a badge — the
      // bell inbox stays the surface, the push is the tap on shoulder.
      title: payload.title,
      // R353 N — collapse/dedupe, honestly: expo-server-sdk's
      // ExpoPushMessage has NO `collapseKey` (that is raw FCM's field
      // name) — but it DOES carry `collapseId` (expo-server-sdk@8.0.0
      // typings, node_modules/expo-server-sdk/build/ExpoClient.d.ts),
      // which Expo maps onto Android's collapse key and iOS's
      // apns-collapse-id. category+link as the id: repeated events for
      // the same surface collapse on-device to the latest one. The
      // `subtitle` rides the payload type (visual grouping next to the
      // channelId) and `data.link` stays the stable deep-link target.
      subtitle: payload.type,
      collapseId: `${payload.type}:${payload.link}`,
      body: payload.body,
      data: { link: payload.link, type: payload.type },
      sound: payload.type === 'URGENT' ? 'default' : null,
      priority: payload.type === 'URGENT' ? 'high' : 'default',
      channelId: 'alerts',
      badge: 1,
      // `_contentAvailable` is deliberately NOT set: every message here
      // is a visible notification (title+body+badge), not a silent
      // background update — the deprecated underscore spelling belongs
      // to that path, and visible delivery already updates the badge.
    }));

    const chunks = expo.chunkPushNotifications(messages);
    const deadIds = new Set<string>();
    // receipt id → device id (ok tickets only — errors have no receipt).
    const receiptToDevice = new Map<string, string>();
    for (const chunk of chunks) {
      // Type-narrow the chunk for the classic API (it accepts our shape).
      const tickets = await expo.sendPushNotificationsAsync(chunk as never);
      tickets.forEach((ticket, i) => {
        const token = (chunk[i] as { to?: string }).to;
        const row = sendable.find((d) => d.expoToken === token);
        if (ticket.status === 'ok') {
          if (row) receiptToDevice.set(ticket.id, row.id);
          return;
        }
        const details = ticket.details as { error?: string } | undefined;
        if (details?.error === 'DeviceNotRegistered') {
          if (row) deadIds.add(row.id);
        } else {
          logger.warn({ ticket }, 'push: ticket error (best-effort, skipped)');
        }
      });
    }

    // R353 N — the delivery verdicts (DeviceNotRegistered usually
    // surfaces HERE for FCM, not at ticket time).
    await processReceipts(expo, receiptToDevice, deadIds);

    if (deadIds.size > 0) {
      await prisma.pushDevice.deleteMany({ where: { id: { in: [...deadIds] } } });
      logger.info({ pruned: deadIds.size }, 'push: pruned dead device tokens');
    }
  } catch (e) {
    logger.warn({ err: e, recipients: userIds.length, title: payload.title }, 'push: fan-out failed (best-effort)');
  }
}
