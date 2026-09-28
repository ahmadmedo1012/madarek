/**
 * NotificationDropdown
 * ──────────────────────────────────────────────────────────────
 * Bell button that opens the notifications inbox. The user can
 * preview recent notifications, mark all as read, jump to one, or
 * follow a 'view all' link to the full /alerts page.
 *
 * The panel surface itself is the 012-spec NotificationPanel
 * primitive (anchored, rtl-aware, glass, --elev-3, Esc +
 * click-outside dismiss, repositioning on scroll/resize) — this
 * component only owns the data flow (unread refetch, mark-read,
 * navigation) and the inner list markup.
 *
 * Data split (11-e P1-5): the closed bell needs only the unread
 * count (the 60s one-item poll). The 50-item list query lives in
 * <NotificationPanelContent>, which NotificationPanel mounts only
 * while the panel is open — the payload fetches on first open, not
 * on every shell mount. Query cache (30s stale / 5min gc) serves
 * instant re-opens.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, X, ChevronLeft, AlertTriangle, Info, GraduationCap, Users, Check, RefreshCw } from 'lucide-react';
import { Icon } from '../Icon';
import { Illustration } from '../Illustration';
import { NotificationPanel } from '../overlays';
import { useFocusTrap } from '../overlays/useFocusTrap';
import { useNotifications, useUnreadNotifications, useMarkNotifRead, useMarkAllNotifsRead, type Notification } from '../../hooks/useResources';
import { arUnit, timeAgoAr } from '../../lib/format';
import type { LucideIcon } from 'lucide-react';

const TYPE_ICON: Record<Notification['type'], LucideIcon> = {
  URGENT:   AlertTriangle,
  ACADEMIC: GraduationCap,
  SYSTEM:   Info,
  SOCIAL:   Users,
};

const TYPE_TONE: Record<Notification['type'], string> = {
  URGENT:   'tone-danger',
  ACADEMIC: 'tone-accent',
  SYSTEM:   'tone-neutral',
  SOCIAL:   'tone-success',
};

// Relative time is the canonical lib/format helper (15-h P2-2): the
// same counted-plural wording + Math.round rounding the /alerts page
// already renders for these very rows — the old local compact twin
// («منذ 5 د», Math.floor) disagreed with it on the same data.

export function NotificationDropdown({ alertsPath }: { alertsPath: string }) {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  /* PP-X2 (audit P2-11 / PP-A4 finding 1): the panel already behaved
   * like a blocking layer (Esc, click-outside, overlay registration)
   * but never trapped Tab — a keyboard user pressing Tab walked the
   * app BEHIND the panel while it stayed open. The shared useFocusTrap
   * now rides the panel body (the children this component passes into
   * NotificationPanel's portal). Because child effects register before
   * parent effects, this trap's overlay entry sits ABOVE the panel
   * primitive's own — it owns Esc (closing + restoring focus to the
   * bell, the same contract the primitive implemented) and the Tab
   * cycle. The wrapper div is a layout-neutral flex shim (all panel
   * section styles are descendant selectors, so nothing moves). */
  const panelBodyRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap({
    open,
    containerRef: panelBodyRef,
    closeOnEscape: true,
    onClose: () => setOpen(false),
    overlayKind: 'notification-panel',
  });
  /* aria-modal="false" on the PANEL CONTAINER (the primitive's div —
     NotificationPanel owns that element, so the attribute rides from
     here): the panel is a non-modal dialog; the flag keeps AT quiet
     mode OFF while the trap contains focus. Attached when the portal
     mounts; it leaves with the panel (the portal unmounts). */
  const setPanelBody = useCallback((el: HTMLDivElement | null) => {
    panelBodyRef.current = el;
    el?.closest<HTMLElement>('.notification-panel')?.setAttribute('aria-modal', 'false');
  }, []);
  // 4-A14 P2-2: the panel survived browser-back — still open, bell
  // aria-expanded="true", hovering over the previous page. Sidebar
  // clicks closed it via outside-click, but history navigations never
  // passed through the document mousedown path. Any location change
  // (back/forward included) now dismisses it.
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  // The only data the closed bell needs: unread count (1-item poll).
  const unreadQ = useUnreadNotifications();
  const unread = unreadQ.data ?? 0;

  // Outside-click, Esc and anchored repositioning are provided by the
  // NotificationPanel primitive.

  return (
    <div className="notif-dropdown">
      <button
        ref={bellRef}
        type="button"
        className="topbar-notif"
        aria-label={unread > 0 ? arUnit(unread, 'إشعار غير مقروء', 'إشعاران غير مقروءان', 'إشعارات غير مقروءة') : 'الإشعارات'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon icon={Bell} size={16} />
        {unread > 0 && (
          <span className="topbar-notif-badge" aria-hidden>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={bellRef}
        ariaLabel="الإشعارات"
      >
        <div
          ref={setPanelBody}
          className="notif-panel-body"
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          <NotificationPanelContent
            alertsPath={alertsPath}
            unread={unread}
            onClose={() => setOpen(false)}
          />
        </div>
      </NotificationPanel>
    </div>
  );
}

/** Panel body — mounted only while the panel is open, so the
 * notifications list query fires on first open (lazy), never on
 * shell mount. See the file docblock for the data split. */
function NotificationPanelContent({
  alertsPath,
  unread,
  onClose,
}: {
  alertsPath: string;
  unread: number;
  onClose: () => void;
}) {
  const listQ = useNotifications();
  const items = (listQ.data ?? []).slice(0, 6);
  const markRead = useMarkNotifRead();
  // 15-d P1-2: one bulk POST /notifications/read-all covers EVERY
  // unread row (the per-item path below only ever reaches the 6
  // visible ones) and invalidates the notifications cache once — no
  // more ≤6 refetch storms of the 50-item list + count poll.
  const markAllRead = useMarkAllNotifsRead();
  const navigate = useNavigate();

  const onItemClick = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    onClose();
    navigate(alertsPath);
  };

  const onMarkAll = () => {
    markAllRead.mutate();
  };

  return (
    <>
    <header className="notif-panel-head">
      <h3 className="notif-panel-title">الإشعارات</h3>
      <div className="notif-panel-actions">
        {unread > 0 && (
          <button type="button" className="notif-panel-action" onClick={onMarkAll} disabled={markAllRead.isPending}>
            <Icon icon={Check} size={12} />
            <span>تعليم الكل كمقروء</span>
          </button>
        )}
        <button
          type="button"
          className="notif-panel-close"
          onClick={onClose}
          aria-label="إغلاق"
        >
          <Icon icon={X} size={14} />
        </button>
      </div>
    </header>

    <div className="notif-panel-list">
      {listQ.isPending ? (
        <div className="notif-empty">
          <div className="notif-empty-icon"><Icon icon={Bell} size={20} /></div>
          <p className="notif-empty-text">جارٍ التحميل…</p>
        </div>
      ) : listQ.isError ? (
        /* 5-C3 (A9 P1-1): an aborted / failed /notifications used to
           fall through to the empty branch — the API being DOWN told
           the user «لا توجد إشعارات», a lie about their data (the
           exact class the craft floor bans: error must never read as
           empty). Same .notif-empty shell, warning icon, honest copy
           and a retry wired to the query. */
        <div className="notif-empty" role="alert">
          <div className="notif-empty-icon"><Icon icon={AlertTriangle} size={20} /></div>
          <p className="notif-empty-text">تعذّر تحميل الإشعارات</p>
          <button type="button" className="btn ghost sm" onClick={() => void listQ.refetch()}>
            <Icon icon={RefreshCw} size={13} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="notif-empty">
          {/* Bespoke empty-notifs scene (illustration registry; audit
              0-f P2-21 — the designed scene was dead inventory while
              the panel showed a generic Lucide bell). Sizing lives in
              the wave 8-c section of components.css. */}
          <div className="notif-empty-illustration" aria-hidden>
            <Illustration name="empty-notifs" decorative />
          </div>
          <p className="notif-empty-text">لا توجد إشعارات</p>
        </div>
      ) : (
        items.map((n) => {
          const IconCmp = TYPE_ICON[n.type];
          return (
            <button
              key={n.id}
              type="button"
              className={`notif-item ${TYPE_TONE[n.type]}${n.readAt ? '' : ' unread'}`}
              onClick={() => onItemClick(n)}
            >
              <span className="notif-item-icon">
                <Icon icon={IconCmp} size={14} />
              </span>
              <span className="notif-item-body">
                <span className="notif-item-title">{n.title}</span>
                {n.body && <span className="notif-item-desc">{n.body}</span>}
                <span className="notif-item-time">{timeAgoAr(n.createdAt)}</span>
              </span>
              {!n.readAt && <span className="notif-item-dot" aria-hidden />}
            </button>
          );
        })
      )}
    </div>

    <footer className="notif-panel-foot">
      <Link
        to={alertsPath}
        onClick={onClose}
        className="notif-panel-viewall"
      >
        <span>عرض جميع الإشعارات</span>
        <Icon icon={ChevronLeft} size={12} />
      </Link>
    </footer>
    </>
  );
}
