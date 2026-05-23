import { useMoocs } from '../../hooks/useResources';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';

export default function MoocPage() {
  const { data, isPending, isError } = useMoocs();
  return (
    <div className="page">
      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data?.length ? (
        <EmptyState title="لا توجد كورسات" />
      ) : (
        <div className="grid-3">
          {data.map((m) => (
            <div className="course-card" key={m.id}>
              <div className="course-thumb" style={{ background: 'rgba(79,142,247,.12)', fontSize: 36 }}>
                {m.iconEmoji ?? '🎓'}
              </div>
              <div className="course-body">
                <div className="course-name">{m.title}</div>
                <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 6 }}>{m.organization}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="badge badge-blue">{m.durationHours} ساعة</span>
                  <span className="badge badge-purple">{m.level}</span>
                  {m.hasCertificate && <span className="badge badge-amber">🏅 شهادة</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: 'var(--amber)', fontSize: 11 }}>★ {m.rating}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{m.enrolled.toLocaleString('ar-LY')} مسجل</span>
                </div>
                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--r-sm)',
                    padding: 7,
                    color: '#fff',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  سجّل الآن
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
