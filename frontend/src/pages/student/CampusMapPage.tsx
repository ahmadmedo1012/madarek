import { useState } from 'react';
import {
  MapPin, Building2, FlaskConical, Library as LibraryIcon, Coffee, Trophy,
  Cog, type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { Icon } from '../../components/Icon';

interface Building {
  id: string;
  name: string;
  type: 'academic' | 'lab' | 'library' | 'cafeteria' | 'sports';
  description: string;
  x: number; // % of canvas width
  y: number; // % of canvas height
  rooms: number;
  hours: string;
}

const TYPE_ICON: Record<Building['type'], LucideIcon> = {
  academic: Building2,
  lab: FlaskConical,
  library: LibraryIcon,
  cafeteria: Coffee,
  sports: Trophy,
};

const TYPE_LABEL: Record<Building['type'], string> = {
  academic: 'كلية',
  lab: 'معمل',
  library: 'مكتبة',
  cafeteria: 'كافتيريا',
  sports: 'منشأة رياضية',
};

const BUILDINGS: Building[] = [
  { id: 'b1', name: 'كلية تقنية المعلومات', type: 'academic', description: 'مبنى A · 3 طوابق · يضم أقسام علوم الحاسوب ونظم المعلومات.', x: 22, y: 35, rooms: 18, hours: '07:00 — 21:00' },
  { id: 'b2', name: 'كلية الهندسة', type: 'academic', description: 'مبنى B · 4 طوابق · أقسام الميكانيكية والكهربائية والمدنية.', x: 50, y: 28, rooms: 24, hours: '07:00 — 21:00' },
  { id: 'b3', name: 'كلية الطب البشري', type: 'academic', description: 'مبنى C · 5 طوابق · مع المعامل التشريحية.', x: 75, y: 35, rooms: 30, hours: '06:30 — 22:00' },
  { id: 'l1', name: 'معامل الحاسوب الافتراضية', type: 'lab', description: 'معمل 1 و 2 · شبكات و قواعد بيانات · سعة 60 جهاز.', x: 30, y: 60, rooms: 4, hours: '08:00 — 20:00' },
  { id: 'l2', name: 'معامل العلوم التطبيقية', type: 'lab', description: 'كيمياء وفيزياء وأحياء · للأقسام العلمية.', x: 65, y: 65, rooms: 8, hours: '08:00 — 18:00' },
  { id: 'lib', name: 'المكتبة المركزية', type: 'library', description: 'مكتبة الجامعة الإلكترونية والمطبوعة · قاعات قراءة.', x: 50, y: 50, rooms: 6, hours: '08:00 — 23:00' },
  { id: 'caf', name: 'الكافتيريا الرئيسية', type: 'cafeteria', description: 'وجبات سريعة ومنطقة للجلوس والدراسة.', x: 45, y: 75, rooms: 1, hours: '07:00 — 21:00' },
  { id: 'spt', name: 'الصالة الرياضية', type: 'sports', description: 'ملاعب كرة قدم وطائرة وصالة جيم.', x: 80, y: 70, rooms: 3, hours: '14:00 — 22:00' },
];

export default function CampusMapPage() {
  const [selected, setSelected] = useState<Building | null>(null);
  const [filter, setFilter] = useState<'all' | Building['type']>('all');

  const visible = filter === 'all' ? BUILDINGS : BUILDINGS.filter((b) => b.type === filter);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">خريطة الحرم الجامعي</h1>
          <p className="page-subtitle">استكشف مباني جامعة مدارك وموقع كل كلية ومعمل ومرفق.</p>
        </div>
      </div>

      <Card compact>
        <div className="filter-bar">
          {[
            { id: 'all', label: 'الكل', icon: MapPin },
            { id: 'academic', label: 'كليات', icon: Building2 },
            { id: 'lab', label: 'معامل', icon: FlaskConical },
            { id: 'library', label: 'مكتبات', icon: LibraryIcon },
            { id: 'cafeteria', label: 'كافتيريات', icon: Coffee },
            { id: 'sports', label: 'رياضية', icon: Trophy },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`pill${filter === opt.id ? ' on' : ''}`}
              onClick={() => setFilter(opt.id as typeof filter)}
            >
              <Icon icon={opt.icon} size={13} />
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid-2-1">
        <Card flush style={{ overflow: 'hidden' }}>
          <div className="map-canvas">
            <div className="map-grid" />
            {/* Decorative roads */}
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path d="M5,40 L95,40 M5,72 L95,72 M40,5 L40,95 M70,5 L70,95"
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" strokeLinecap="round" fill="none" />
            </svg>
            {visible.map((b) => {
              const Cmp = TYPE_ICON[b.type];
              const isOn = selected?.id === b.id;
              return (
                <button
                  type="button"
                  key={b.id}
                  className={`map-pin ${b.type}${isOn ? ' on' : ''}`}
                  style={{ left: `${b.x}%`, top: `${b.y}%`, border: 0, background: 'transparent', padding: 0, fontFamily: 'inherit' }}
                  onClick={() => setSelected(b)}
                >
                  <span className="map-pin-dot">
                    <Icon icon={Cmp} size={14} strokeWidth={2.2} />
                  </span>
                  {isOn && <span className="map-pin-label">{b.name}</span>}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title={selected?.name ?? 'اختر مبنى من الخريطة'} icon={selected ? TYPE_ICON[selected.type] : Cog}>
          {selected ? (
            <div className="flex-col gap-3">
              <Badge color="brand">{TYPE_LABEL[selected.type]}</Badge>
              <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-base)' }}>
                {selected.description}
              </p>
              <div style={{
                background: 'var(--surface-2)',
                padding: 'var(--sp-3)',
                borderRadius: 'var(--r-md)',
                fontSize: 'var(--fs-xs)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}>
                <div className="flex items-center justify-between">
                  <span className="text-subtle">عدد الغرف</span>
                  <span className="font-mono font-semibold">{selected.rooms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-subtle">ساعات العمل</span>
                  <span className="font-mono">{selected.hours}</span>
                </div>
              </div>
              <button type="button" className="btn outline" style={{ width: '100%' }}>
                <Icon icon={MapPin} size={13} />
                اتجاهات تفصيلية
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              تحرك بمؤشر الفأرة على الخريطة، واضغط على أي نقطة لمعرفة معلومات المبنى.
            </p>
          )}
        </Card>
      </div>

      <Card title="جميع المباني" icon={Building2}>
        <div className="grid-3">
          {BUILDINGS.map((b) => {
            const Cmp = TYPE_ICON[b.type];
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className="list-row"
                style={{ textAlign: 'right', cursor: 'pointer', border: 0, background: 'transparent' }}
              >
                <div className="metric-icon" style={{ color: 'var(--accent)' }}>
                  <Icon icon={Cmp} size={16} />
                </div>
                <div className="list-row-body">
                  <div className="list-row-title">{b.name}</div>
                  <div className="list-row-sub">{TYPE_LABEL[b.type]} · {b.rooms} غرفة</div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
