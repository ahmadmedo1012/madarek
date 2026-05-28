/* ═════════════════════════════════════════════════════════════════════
   Madarek — Charts & Analytics Toolkit
   ─────────────────────────────────────────────────────────────────────
   A centralized, token-aware charting layer.

   Design choices:
   • All chart colors are read from refined-blue.css custom properties
     at runtime — so charts naturally re-tint on theme change.
   • Chart.js is registered ONCE here (replacing per-page registration).
   • Five branded Chart.js primitives + three pure-SVG primitives + two
     inline primitives (AnimatedCounter, TrendChip).
   • RTL-aware, responsive, and reduced-motion-respectful.
   • Strictly additive — existing pages keep working; new pages can
     migrate gradually.
   ═════════════════════════════════════════════════════════════════════ */
import {
  Chart as ChartJS,
  ArcElement, BarElement, CategoryScale, Filler, LinearScale,
  LineElement, PointElement, Tooltip, Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react';

ChartJS.register(
  ArcElement, BarElement, CategoryScale, Filler, LinearScale,
  LineElement, PointElement, Tooltip, Legend,
);

/* ─── Token reader ───────────────────────────────────────────────── */
export interface ChartTokens {
  primary: string;     // refined royal blue
  primaryHover: string;
  action: string;      // cyan-teal
  ai: string;          // sky
  aiDeep: string;
  success: string;
  warning: string;
  danger: string;
  gold: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  surface1: string;
  surface2: string;
  bg: string;
  font: string;
}

function readVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function readChartTokens(): ChartTokens {
  return {
    primary:      readVar('--accent',        '#1e40af'),
    primaryHover: readVar('--accent-hover',  '#2563eb'),
    action:       readVar('--action',        '#0284c7'),
    ai:           readVar('--ai',            '#38bdf8'),
    aiDeep:       readVar('--ai-deep',       '#0369a1'),
    success:      readVar('--success',       '#059669'),
    warning:      readVar('--warning',       '#b45309'),
    danger:       readVar('--danger',        '#b91c1c'),
    gold:         readVar('--gold',          '#b45309'),
    text:         readVar('--text',          '#0f172a'),
    textMuted:    readVar('--text-muted',    '#475569'),
    textSubtle:   readVar('--text-subtle',   '#64748b'),
    border:       readVar('--border-strong', 'rgba(15, 39, 80, 0.14)'),
    surface1:     readVar('--surface-1',     '#ffffff'),
    surface2:     readVar('--surface-2',     '#eef3fa'),
    bg:           readVar('--bg',            '#f5f8fc'),
    font:         readVar('--font-sans',     "'IBM Plex Sans Arabic', system-ui, sans-serif"),
  };
}

/* ─── Token hook — re-reads on theme change ───────────────────────── */
export function useChartTokens(): ChartTokens {
  const [tokens, setTokens] = useState<ChartTokens>(() => readChartTokens());

  useLayoutEffect(() => {
    setTokens(readChartTokens());
    const obs = new MutationObserver(() => setTokens(readChartTokens()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });
    return () => obs.disconnect();
  }, []);

  return tokens;
}

/* ─── Hex → rgba helper ───────────────────────────────────────────── */
function rgba(hex: string, a: number): string {
  if (hex.startsWith('rgb')) {
    return hex.replace(/rgba?\(([^)]+)\)/, (_, inner: string) => {
      const parts = inner.split(',').map((p) => p.trim()).slice(0, 3);
      return `rgba(${parts.join(', ')}, ${a})`;
    });
  }
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}


/* ─── Default option factories ────────────────────────────────────── */
export function lineOpts(t: ChartTokens, dir: 'ltr' | 'rtl' = 'rtl'): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.surface1,
        borderColor: t.border,
        borderWidth: 1,
        titleColor: t.text,
        bodyColor: t.textMuted,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        rtl: dir === 'rtl',
        textDirection: dir,
        titleFont: { family: t.font, size: 12, weight: 600 },
        bodyFont: { family: t.font, size: 12 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        reverse: dir === 'rtl',
        ticks: { color: t.textSubtle, font: { size: 11, family: t.font } },
      },
      y: {
        grid: { color: rgba(t.text, 0.06), drawTicks: false },
        border: { display: false },
        ticks: { color: t.textSubtle, font: { size: 11, family: t.font }, padding: 8 },
        beginAtZero: true,
      },
    },
    elements: {
      line: { borderJoinStyle: 'round', borderCapStyle: 'round' },
      point: { hitRadius: 16 },
    },
  };
}

export function barOpts(t: ChartTokens, dir: 'ltr' | 'rtl' = 'rtl', horizontal = false): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.surface1,
        borderColor: t.border,
        borderWidth: 1,
        titleColor: t.text,
        bodyColor: t.textMuted,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        rtl: dir === 'rtl',
        textDirection: dir,
        titleFont: { family: t.font, size: 12, weight: 600 },
        bodyFont: { family: t.font, size: 12 },
      },
    },
    scales: {
      x: {
        grid: horizontal ? { color: rgba(t.text, 0.06), drawTicks: false } : { display: false },
        border: { display: false },
        reverse: dir === 'rtl' && !horizontal,
        ticks: { color: t.textSubtle, font: { size: 11, family: t.font } },
        beginAtZero: horizontal,
      },
      y: {
        grid: horizontal ? { display: false } : { color: rgba(t.text, 0.06), drawTicks: false },
        border: { display: false },
        ticks: { color: t.textSubtle, font: { size: 11, family: t.font }, padding: 8 },
        beginAtZero: !horizontal,
      },
    },
  };
}

export function donutOpts(t: ChartTokens, dir: 'ltr' | 'rtl' = 'rtl'): ChartOptions<'doughnut'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        rtl: dir === 'rtl',
        labels: {
          color: t.textMuted,
          font: { family: t.font, size: 12 },
          padding: 14,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: t.surface1,
        borderColor: t.border,
        borderWidth: 1,
        titleColor: t.text,
        bodyColor: t.textMuted,
        padding: 10,
        cornerRadius: 8,
        rtl: dir === 'rtl',
        textDirection: dir,
        titleFont: { family: t.font, size: 12, weight: 600 },
        bodyFont: { family: t.font, size: 12 },
      },
    },
  };
}


/* ═════════════════════════════════════════════════════════════════════
   Branded Chart.js wrappers
   ═════════════════════════════════════════════════════════════════════ */

interface SparklineProps {
  data: number[];
  color?: keyof Pick<ChartTokens, 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'danger' | 'gold'>;
  height?: number;
  fill?: boolean;
  className?: string;
}

/** Tiny inline line chart — perfect for KPI trend tails. */
export function Sparkline({
  data, color = 'primary', height = 32, fill = true, className,
}: SparklineProps) {
  const t = useChartTokens();
  const stroke = t[color];
  const labels = useMemo(() => data.map(() => ''), [data]);

  return (
    <div className={`chart-sparkline ${className ?? ''}`} style={{ height, width: '100%' }}>
      <Line
        data={{
          labels,
          datasets: [{
            data,
            borderColor: stroke,
            backgroundColor: fill ? rgba(stroke, 0.18) : 'transparent',
            borderWidth: 1.75,
            fill,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 0,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false, grid: { display: false }, border: { display: false } },
            y: { display: false, grid: { display: false }, border: { display: false } },
          },
          elements: { line: { borderJoinStyle: 'round' } },
          animation: { duration: 600, easing: 'easeOutQuart' },
        }}
      />
    </div>
  );
}

interface MiniAreaProps {
  data: number[];
  labels?: string[];
  color?: keyof Pick<ChartTokens, 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'danger' | 'gold'>;
  height?: number;
}

/** Compact area chart with subtle labels — fits inside cards. */
export function MiniArea({ data, labels, color = 'primary', height = 64 }: MiniAreaProps) {
  const t = useChartTokens();
  const stroke = t[color];
  const lbls = useMemo(() => labels ?? data.map(() => ''), [labels, data]);

  return (
    <div style={{ height, width: '100%' }}>
      <Line
        data={{
          labels: lbls,
          datasets: [{
            data,
            borderColor: stroke,
            backgroundColor: rgba(stroke, 0.18),
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointBackgroundColor: stroke,
            pointBorderColor: t.surface1,
            pointBorderWidth: 1.5,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: t.surface1,
              borderColor: t.border,
              borderWidth: 1,
              titleColor: t.text,
              bodyColor: t.textMuted,
              padding: 8,
              cornerRadius: 8,
              displayColors: false,
              titleFont: { family: t.font, size: 11, weight: 600 },
              bodyFont: { family: t.font, size: 11 },
            },
          },
          scales: {
            x: { display: false, grid: { display: false }, border: { display: false } },
            y: { display: false, grid: { display: false }, border: { display: false } },
          },
          animation: { duration: 700, easing: 'easeOutQuart' },
        }}
      />
    </div>
  );
}


interface TrendAreaProps {
  data: number[];
  labels: string[];
  color?: keyof Pick<ChartTokens, 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'danger' | 'gold'>;
  height?: number;
  yLabel?: string;
  rtl?: boolean;
}

/** Full-size labeled area chart — primary trend visualization. */
export function TrendArea({
  data, labels, color = 'primary', height = 220, rtl = true,
}: TrendAreaProps) {
  const t = useChartTokens();
  const stroke = t[color];
  const opts = useMemo(() => lineOpts(t, rtl ? 'rtl' : 'ltr'), [t, rtl]);

  return (
    <div style={{ height, width: '100%' }}>
      <Line
        data={{
          labels,
          datasets: [{
            data,
            borderColor: stroke,
            backgroundColor: rgba(stroke, 0.14),
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: stroke,
            pointBorderColor: t.surface1,
            pointBorderWidth: 2,
            pointHoverBorderWidth: 2.5,
          }],
        }}
        options={{ ...opts, animation: { duration: 800, easing: 'easeOutQuart' } }}
      />
    </div>
  );
}

interface TrendBarProps {
  data: number[];
  labels: string[];
  color?: keyof Pick<ChartTokens, 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'danger' | 'gold'>;
  height?: number;
  horizontal?: boolean;
  rtl?: boolean;
}

/** Bar chart — vertical or horizontal. Auto-rounds, auto-spaces. */
export function TrendBar({
  data, labels, color = 'primary', height = 220, horizontal = false, rtl = true,
}: TrendBarProps) {
  const t = useChartTokens();
  const fill = t[color];
  const opts = useMemo(() => barOpts(t, rtl ? 'rtl' : 'ltr', horizontal), [t, rtl, horizontal]);

  return (
    <div style={{ height, width: '100%' }}>
      <Bar
        data={{
          labels,
          datasets: [{
            data,
            backgroundColor: rgba(fill, 0.85),
            hoverBackgroundColor: fill,
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.66,
            categoryPercentage: 0.74,
          }],
        }}
        options={{ ...opts, animation: { duration: 800, easing: 'easeOutQuart' } }}
      />
    </div>
  );
}

interface DistributionDonutProps {
  data: Array<{ label: string; value: number; color?: string }>;
  size?: number;
  legend?: boolean;
  rtl?: boolean;
  centerLabel?: string;
  centerSubLabel?: string;
}

/** Branded doughnut. If colors aren't provided, uses the
 *  refined-blue chart palette in order: primary→action→ai→gold→aiDeep. */
export function DistributionDonut({
  data, size = 220, legend = true, rtl = true, centerLabel, centerSubLabel,
}: DistributionDonutProps) {
  const t = useChartTokens();
  const palette = useMemo(
    () => [t.primary, t.action, t.ai, t.gold, t.aiDeep, t.success, t.warning, t.danger],
    [t],
  );
  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.label),
      datasets: [{
        data: data.map((d) => d.value),
        backgroundColor: data.map((d, i) => d.color ?? palette[i % palette.length]),
        borderColor: t.surface1,
        borderWidth: 3,
        hoverOffset: 6,
      }],
    }),
    [data, palette, t.surface1],
  );
  const opts = useMemo(() => {
    const o = donutOpts(t, rtl ? 'rtl' : 'ltr');
    if (!legend) o.plugins!.legend!.display = false;
    return o;
  }, [t, rtl, legend]);

  return (
    <div style={{ position: 'relative', height: size, width: '100%' }}>
      <Doughnut data={chartData} options={{ ...opts, animation: { animateRotate: true, animateScale: false, duration: 700, easing: 'easeOutQuart' } }} />
      {(centerLabel || centerSubLabel) && (
        <div className="chart-donut-center">
          {centerLabel && <span className="chart-donut-center-label">{centerLabel}</span>}
          {centerSubLabel && <span className="chart-donut-center-sub">{centerSubLabel}</span>}
        </div>
      )}
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════════════
   Pure-SVG primitives — zero Chart.js overhead, perfect for inline use
   ═════════════════════════════════════════════════════════════════════ */

interface RadialProgressProps {
  /** 0..100 */
  value: number;
  size?: number;
  thickness?: number;
  color?: keyof Pick<ChartTokens, 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'danger' | 'gold'>;
  label?: ReactNode;
  sublabel?: ReactNode;
  trackOpacity?: number;
  className?: string;
}

/** Radial progress ring with smooth dashoffset animation. */
export function RadialProgress({
  value, size = 132, thickness = 9, color = 'primary',
  label, sublabel, trackOpacity = 0.14, className,
}: RadialProgressProps) {
  const t = useChartTokens();
  const stroke = t[color];
  const v = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  // Animate from 0 → v on mount
  const [pct, setPct] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') { setPct(v); return; }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setPct(v); return; }
    const start = performance.now();
    const dur = 850;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setPct(v * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [v]);

  const offset = c - (pct / 100) * c;

  return (
    <div className={`radial-progress ${className ?? ''}`} style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="transparent"
          stroke={stroke}
          strokeOpacity={trackOpacity}
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="transparent"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 60ms linear' }}
        />
      </svg>
      <div className="radial-progress-center" aria-hidden>
        {label !== undefined && <span className="radial-progress-label">{label}</span>}
        {sublabel !== undefined && <span className="radial-progress-sub">{sublabel}</span>}
      </div>
    </div>
  );
}

interface HeatmapWeeksProps {
  /** Each inner array = 7 days (Sun→Sat). 0 = no activity, ≤ max. */
  weeks: number[][];
  /** Maximum value to scale against. If omitted, computed from data. */
  max?: number;
  color?: keyof Pick<ChartTokens, 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'gold'>;
  cellSize?: number;
  gap?: number;
  ariaLabel?: string;
}

const DAY_LABELS_AR = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

/** Calendar-style heatmap (e.g. 4 weeks × 7 days). */
export function HeatmapWeeks({
  weeks, max, color = 'primary', cellSize = 18, gap = 4, ariaLabel,
}: HeatmapWeeksProps) {
  const t = useChartTokens();
  const stroke = t[color];
  const computedMax = useMemo(
    () => max ?? Math.max(1, ...weeks.flat()),
    [max, weeks],
  );

  const cellStyle = (val: number): CSSProperties => {
    const intensity = Math.min(1, val / computedMax);
    return {
      width: cellSize,
      height: cellSize,
      borderRadius: 4,
      background: intensity === 0 ? rgba(t.text, 0.06) : rgba(stroke, 0.18 + intensity * 0.7),
      transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
    };
  };

  return (
    <div className="heatmap-weeks" aria-label={ariaLabel} role="img">
      <div className="heatmap-weeks-grid" style={{ gap }}>
        {DAY_LABELS_AR.map((d, i) => (
          <span key={`label-${i}`} className="heatmap-day-label">{d}</span>
        ))}
        {weeks.map((week, wi) =>
          week.map((val, di) => (
            <span
              key={`${wi}-${di}`}
              className="heatmap-cell"
              style={cellStyle(val)}
              title={`${val} نقطة نشاط`}
            />
          )),
        )}
      </div>
    </div>
  );
}


interface SparkbarProps {
  data: number[];
  color?: keyof Pick<ChartTokens, 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'danger' | 'gold'>;
  height?: number;
  gap?: number;
  rounded?: boolean;
}

/** Pure-SVG inline bar sparkline. Lighter than Chart.js for KPI strips. */
export function Sparkbar({
  data, color = 'primary', height = 36, gap = 3, rounded = true,
}: SparkbarProps) {
  const t = useChartTokens();
  const fill = t[color];
  const max = Math.max(1, ...data);

  return (
    <div className="sparkbar" style={{ height, gap }} aria-hidden>
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * height);
        return (
          <span
            key={i}
            className="sparkbar-cell"
            style={{
              height: h,
              background: rgba(fill, 0.32 + (v / max) * 0.6),
              borderRadius: rounded ? 2 : 0,
            }}
          />
        );
      })}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   Animated counter — counts up to target value on mount.
   ═════════════════════════════════════════════════════════════════════ */
interface AnimatedCounterProps {
  to: number;
  duration?: number;
  decimals?: number;
  format?: (n: number) => string;
  prefix?: string;
  suffix?: string;
  startOnView?: boolean;
}

export function AnimatedCounter({
  to, duration = 900, decimals = 0, format, prefix = '', suffix = '',
  startOnView = true,
}: AnimatedCounterProps) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') { setVal(to); return; }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setVal(to); return; }

    const begin = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      let raf = 0;
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(to * eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    };

    if (!startOnView || !('IntersectionObserver' in window) || !ref.current) {
      return begin();
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        begin();
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to, duration, startOnView]);

  const display = useMemo(() => {
    if (format) return format(val);
    const rounded = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
    // Localize to Arabic numerals if document is RTL — but only for purely
    // numeric strings, so we don't break formatted strings like "12.5%".
    if (typeof document !== 'undefined' && document.documentElement.dir === 'rtl' && /^\d+(\.\d+)?$/.test(rounded)) {
      return Number(rounded).toLocaleString('ar-LY', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    return rounded;
  }, [val, decimals, format]);

  return (
    <span ref={ref} className="animated-counter" data-counting={val < to ? 'true' : undefined}>
      {prefix}{display}{suffix}
    </span>
  );
}


/* ═════════════════════════════════════════════════════════════════════
   Trend chip — small inline up/down indicator
   ═════════════════════════════════════════════════════════════════════ */
interface TrendChipProps {
  delta: number; // signed percent or unit
  format?: (n: number) => string;
  suffix?: string;
  invert?: boolean; // for metrics where down = good (e.g. response time)
  size?: 'sm' | 'md';
}

export function TrendChip({
  delta, format, suffix = '%', invert = false, size = 'md',
}: TrendChipProps) {
  const positive = invert ? delta < 0 : delta > 0;
  const negative = invert ? delta > 0 : delta < 0;
  const tone = delta === 0 ? 'neutral' : positive ? 'positive' : 'negative';
  const display = format ? format(delta) : `${delta > 0 ? '+' : ''}${delta}${suffix}`;
  const arrow = delta === 0 ? '·' : positive ? '↑' : '↓';
  return (
    <span className={`trend-chip ${tone} ${size}`} aria-label={tone}>
      <span aria-hidden>{arrow}</span>
      <span>{display}</span>
      {/* unused suppress */}
      <span aria-hidden style={{ display: 'none' }}>{negative ? '' : ''}</span>
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   StatTrend — composite KPI: label · value · trend chip · sparkline
   ═════════════════════════════════════════════════════════════════════ */
interface StatTrendProps {
  label: ReactNode;
  value: ReactNode;
  delta?: number;
  deltaSuffix?: string;
  invertDelta?: boolean;
  data?: number[];
  color?: keyof Pick<ChartTokens, 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'danger' | 'gold'>;
  icon?: ReactNode;
  className?: string;
}

export function StatTrend({
  label, value, delta, deltaSuffix = '%', invertDelta, data, color = 'primary', icon, className,
}: StatTrendProps) {
  return (
    <div className={`stat-trend ${className ?? ''}`}>
      <div className="stat-trend-head">
        {icon && <span className="stat-trend-icon">{icon}</span>}
        <span className="stat-trend-label">{label}</span>
      </div>
      <div className="stat-trend-value-row">
        <span className="stat-trend-value">{value}</span>
        {delta !== undefined && (
          <TrendChip delta={delta} suffix={deltaSuffix} invert={invertDelta} size="sm" />
        )}
      </div>
      {data && data.length > 1 && (
        <div className="stat-trend-spark">
          <Sparkline data={data} color={color} height={28} fill />
        </div>
      )}
    </div>
  );
}
