import { useJobs } from '../../hooks/useResources';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'دوام كامل',
  PART_TIME: 'دوام جزئي',
  INTERNSHIP: 'تدريب',
  FREELANCE: 'عمل حر',
  REMOTE: 'عن بُعد',
};

export default function JobsPage() {
  const { data, isPending, isError } = useJobs();
  return (
    <div className="page">
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data?.length ? (
        <EmptyState title="لا توجد فرص متاحة" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((j) => (
            <div className="exam-card" key={j.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--r)',
                    background: 'var(--surface2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {j.iconEmoji ?? '💼'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{j.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--accent)', margin: '3px 0 6px' }}>{j.company}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-teal">{j.location}</span>
                    <span className="badge badge-blue">{TYPE_LABELS[j.type]}</span>
                    {j.salary && <span className="badge badge-green">{j.salary}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--r-sm)',
                    padding: '8px 14px',
                    color: '#fff',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    alignSelf: 'center',
                  }}
                >
                  تقدّم
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
