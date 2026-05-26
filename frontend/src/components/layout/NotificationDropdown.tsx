/**
 * NotificationDropdown
 * ──────────────────────────────────────────────────────────────
 * Bell button that opens a panel in place. The user can preview
 * recent notifications, mark all as read, jump to one, or follow
 * a 'view all' link to the full /alerts page.
 *
 * Replaces the previous behaviour where the bell button navigated
 * straight to /alerts.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, X, ChevronLeft, AlertTriangle, Info, GraduationCap, Users, Check } from 'lucide-react';
import { Icon } from '../Icon';
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
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function NotificationDropdown({ alertsPath }: { alertsPath: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const unreadQ = useUnreadNotifications();
  const unread = unreadQ.data ?? 0;

  // Lazy-load list only when the dropdown is opened
  const listQ = useNotifications();
  const items = (listQ.data ?? []).slice(0, 6);
  const markRead = useMarkNotifRead();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const onItemClick = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    navigate(alertsPath);
  };

  const onMarkAll = () => {
    items.filter((n) => !n.readAt).forEach((n) => markRead.mutate(n.id));
  };

  return (
    <div className="notif-dropdown" ref={ref}>
      <button
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

      {open && (
        <div className="notif-panel" role="dialog" aria-label="الإشعارات">
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
                <div className="notif-empty-icon"><Icon icon={Bell} size={20} /></div>
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
        </div>
      )}
    </div>
  );
}
