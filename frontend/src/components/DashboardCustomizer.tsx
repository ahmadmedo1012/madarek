import { useState } from 'react';
import { X, ChevronUp, ChevronDown, RotateCcw, Sliders } from 'lucide-react';
import { Icon } from './Icon';
import { useDashboardStore } from '../stores/dashboard.store';
import { useI18nStore } from '../stores/i18n.store';

const WIDGET_LABELS_AR: Record<string, string> = {
  stats: 'الإحصائيات السريعة',
  gpa: 'المعدل التراكمي',
  progress: 'التقدم الأكاديمي',
  term: 'تقدّم الفصل الدراسي',
  agenda: 'المهام القادمة',
};

const WIDGET_LABELS_EN: Record<string, string> = {
  stats: 'Quick Stats',
  gpa: 'GPA',
  progress: 'Academic Progress',
  term: 'Term Progress',
  agenda: 'Upcoming Tasks',
};

export function DashboardCustomizerTrigger({ onClick }: { onClick: () => void }) {
  const locale = useI18nStore((s) => s.locale);
  return (
    <button
      type="button"
      className="oasis-widget__btn dash-customizer-trigger"
      onClick={onClick}
      aria-label={locale === 'ar' ? 'تخصيص اللوحة' : 'Customize Dashboard'}
      title={locale === 'ar' ? 'تخصيص اللوحة' : 'Customize Dashboard'}
    >
      <Icon icon={Sliders} size={16} />
    </button>
  );
}

export function DashboardCustomizer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const locale = useI18nStore((s) => s.locale);
  const widgets = useDashboardStore((s) => s.widgets);
  const toggleWidget = useDashboardStore((s) => s.toggleWidget);
  const reorderWidgets = useDashboardStore((s) => s.reorderWidgets);
  const resetDefaults = useDashboardStore((s) => s.resetDefaults);

  const labels = locale === 'ar' ? WIDGET_LABELS_AR : WIDGET_LABELS_EN;
  const sorted = [...widgets].sort((a, b) => a.order - b.order);

  const moveUp = (id: string) => {
    const ids = sorted.map((w) => w.id);
    const idx = ids.indexOf(id);
    if (idx <= 0) return;
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    reorderWidgets(ids);
  };

  const moveDown = (id: string) => {
    const ids = sorted.map((w) => w.id);
    const idx = ids.indexOf(id);
    if (idx < 0 || idx >= ids.length - 1) return;
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    reorderWidgets(ids);
  };

  if (!open) return null;

  return (
    <div className="dash-customizer-overlay" onClick={onClose}>
      <div className="dash-customizer-modal reveal-scale revealed" onClick={(e) => e.stopPropagation()}>
        <header className="dash-customizer-header">
          <h3 className="dash-customizer-title">
            {locale === 'ar' ? 'تخصيص لوحة التحكم' : 'Customize Dashboard'}
          </h3>
          <button type="button" className="oasis-widget__btn" onClick={onClose} aria-label="Close">
            <Icon icon={X} size={16} />
          </button>
        </header>

        <div className="dash-customizer-body">
          {sorted.map((widget, idx) => (
            <div key={widget.id} className="dash-customizer-row">
              <label className="dash-customizer-label">
                <input
                  type="checkbox"
                  checked={widget.visible}
                  onChange={() => toggleWidget(widget.id)}
                  className="dash-customizer-checkbox"
                />
                <span>{labels[widget.type] ?? widget.type}</span>
              </label>
              <div className="dash-customizer-arrows">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveUp(widget.id)}
                  className="dash-customizer-arrow"
                  aria-label="Move up"
                >
                  <Icon icon={ChevronUp} size={14} />
                </button>
                <button
                  type="button"
                  disabled={idx === sorted.length - 1}
                  onClick={() => moveDown(widget.id)}
                  className="dash-customizer-arrow"
                  aria-label="Move down"
                >
                  <Icon icon={ChevronDown} size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <footer className="dash-customizer-footer">
          <button type="button" className="dash-customizer-reset" onClick={resetDefaults}>
            <Icon icon={RotateCcw} size={14} />
            {locale === 'ar' ? 'استعادة الافتراضي' : 'Reset to Defaults'}
          </button>
        </footer>
      </div>
    </div>
  );
}
