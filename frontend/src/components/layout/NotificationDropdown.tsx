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
 */
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, X, ChevronLeft, AlertTriangle, Info, GraduationCap, Users, Check } from 'lucide-react';
import { Icon } from '../Icon';
import { Illustration } from '../Illustration';
import { NotificationPanel } from '../overlays';
import { useNotifications, useUnreadNotifications, useMarkNotifRead, type Notification } from '../../hooks/useResources';
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

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60)        return 'الآن';
  if (seconds < 3600)      return `منذ ${Math.floor(seconds / 60)} د`;
  if (seconds < 86400)     return `منذ ${Math.floor(seconds / 3600)} س`;
  if (seconds < 7 * 86400) return `منذ ${Math.floor(seconds / 86400)} يوم`;
  // Older than a week — short Arabic date (was en-GB; audit 0-c P3).
  return new Date(iso).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' });
}

export function NotificationDropdown({ alertsPath }: { alertsPath: string }) {
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const unreadQ = useUnreadNotifications();
  const unread = unreadQ.data ?? 0;

  // Lazy-load list only when the dropdown is opened
  const listQ = useNotifications();
  const items = (listQ.data ?? []).slice(0, 6);
  const markRead = useMarkNotifRead();

  // Outside-click, Esc and anchored repositioning are provided by the
  // NotificationPanel primitive.

  const onItemClick = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    navigate(alertsPath);
  };

  const onMarkAll = () => {
    items.filter((n) => !n.readAt).forEach((n) => markRead.mutate(n.id));
  };

  return (
    <div className="notif-dropdown">
      <button
        ref={bellRef}
        type="button"
        className="topbar-notif"
        aria-label={unread > 0 ? `${unread} إشعار غير مقروء` : 'الإشعارات'}
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
        <header className="notif-panel-head">
          <h3 className="notif-panel-title">الإشعارات</h3>
          <div className="notif-panel-actions">
            {unread > 0 && (
              <button type="button" className="notif-panel-action" onClick={onMarkAll}>
                <Icon icon={Check} size={12} />
                <span>تعليم الكل كمقروء</span>
              </button>
            )}
            <button
              type="button"
              className="notif-panel-close"
              onClick={() => setOpen(false)}
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
              <p className="notif-empty-text">جاري التحميل…</p>
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
                    <span className="notif-item-time">{timeAgo(n.createdAt)}</span>
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
            onClick={() => setOpen(false)}
            className="notif-panel-viewall"
          >
            <span>عرض جميع الإشعارات</span>
            <Icon icon={ChevronLeft} size={12} />
          </Link>
        </footer>
      </NotificationPanel>
    </div>
  );
}
