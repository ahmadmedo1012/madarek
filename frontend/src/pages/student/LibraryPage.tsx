import { useState } from 'react';
import { useBooks } from '../../hooks/useResources';
import { MetricCard } from '../../components/primitives';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'prog', label: '💻 برمجة' },
  { id: 'net', label: '🌐 شبكات' },
  { id: 'db', label: '🗄️ قواعد بيانات' },
  { id: 'ai', label: '🤖 ذكاء اصطناعي' },
  { id: 'sec', label: '🔐 أمن' },
];

export default function LibraryPage() {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const { data, isPending, isError } = useBooks({ category: cat === 'all' ? undefined : cat, q });

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="topbar-search"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="🔍 ابحث في المكتبة الرقمية..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`topbar-btn ${cat === c.id ? 'on' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <MetricCard label="📚 إجمالي الكتب" value={data?.length ?? 0} color="blue" />
        <MetricCard label="📖 مستعارة منك" value="3" color="green" />
        <MetricCard label="⏰ تنتهي قريباً" value="1" color="amber" />
        <MetricCard label="🔖 محفوظة" value="12" color="purple" />
      </div>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data?.length ? (
        <EmptyState title="لا توجد كتب تطابق البحث" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
          {data.map((b) => (
            <div className="book-card" key={b.id}>
              <div
                className="book-thumb"
                style={{ background: b.themeColor ? `${b.themeColor}26` : 'rgba(79,142,247,.15)' }}
              >
                {b.iconEmoji ?? '📕'}
              </div>
              <div>
                <div className="book-title">{b.title}</div>
                <div className="book-author">{b.author}</div>
                <div className="book-tags">
                  <span className="badge badge-blue">{b.category}</span>
                  {b.availableCopies > 0 ? (
                    <span className="badge badge-green">متاح</span>
                  ) : (
                    <span className="badge badge-red">مستعار</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
