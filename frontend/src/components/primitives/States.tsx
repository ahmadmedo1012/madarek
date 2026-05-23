export function LoadingState({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="center-flex">
      <div className="spinner" aria-hidden />
      <div>{label}</div>
    </div>
  );
}

export function EmptyState({
  icon = '📭',
  title = 'لا توجد نتائج',
  hint,
}: {
  icon?: string;
  title?: string;
  hint?: string;
}) {
  return (
    <div className="center-flex">
      <div style={{ fontSize: 36 }}>{icon}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{title}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{hint}</div>}
    </div>
  );
}

export function ErrorState({ message = 'حدث خطأ غير متوقع' }: { message?: string }) {
  return (
    <div className="center-flex" role="alert">
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ color: 'var(--red)', fontSize: 13 }}>{message}</div>
    </div>
  );
}
