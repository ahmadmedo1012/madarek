import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  FlaskConical, Network, Cpu, Atom, Zap, Bot as BotIcon, Microscope,
  CheckCircle2, ChevronRight, ChevronLeft, Play, Award, Check,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar } from '../../components/primitives';
import { Skeleton, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useReducedMotion } from '../../components/motion/useReducedMotion';
import { useLabs, useMyLabSessions, type VirtualLab } from '../../hooks/useResources';
import { courseTint } from '../../lib/courseMeta';

interface LabExperiment {
  title: string;
  description: string;
  steps: Array<{ title: string; instructions: string; output: string }>;
}

/** Built-in experiment scripts per lab category — simulation only. */
const EXPERIMENT_LIBRARY: Record<string, LabExperiment> = {
  net: {
    title: 'إعداد شبكة LAN مع VLAN',
    description: 'تكوين راوتر وسويتش، إعداد VLANs، اختبار الاتصال بين الأجهزة.',
    steps: [
      {
        title: 'تكوين الراوتر',
        instructions: 'أدخل الأوامر التالية لتفعيل الواجهات وتعيين IP.',
        output: [
          '$ enable',
          'Router# configure terminal',
          'Router(config)# interface gigabitEthernet 0/0',
          'Router(config-if)# ip address 192.168.10.1 255.255.255.0',
          'Router(config-if)# no shutdown',
          '%LINK-3-UPDOWN: Interface GigabitEthernet0/0, changed state to up',
          '✔ تم تفعيل الواجهة بنجاح.', // allow-emoji: simulated terminal content
        ].join('\n'),
      },
      {
        title: 'إعداد السويتش',
        instructions: 'أنشئ VLAN وعيّن المنافذ.',
        output: [
          '$ Switch# configure terminal',
          'Switch(config)# vlan 10',
          'Switch(config-vlan)# name STAFF',
          'Switch(config)# interface fastEthernet 0/1',
          'Switch(config-if)# switchport mode access',
          'Switch(config-if)# switchport access vlan 10',
          '✔ تم إعداد VLAN 10 على المنفذ FastEthernet0/1.', // allow-emoji: simulated terminal content
        ].join('\n'),
      },
      {
        title: 'اختبار الاتصال',
        instructions: 'استخدم ping للتحقق من الاتصال بين الأجهزة.',
        output: [
          '$ PC1> ping 192.168.10.1',
          'Pinging 192.168.10.1 with 32 bytes of data:',
          'Reply from 192.168.10.1: bytes=32 time=2ms TTL=255',
          'Reply from 192.168.10.1: bytes=32 time=1ms TTL=255',
          'Reply from 192.168.10.1: bytes=32 time=2ms TTL=255',
          'Reply from 192.168.10.1: bytes=32 time=1ms TTL=255',
          'Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)',
          '✔ الاتصال يعمل بنجاح.', // allow-emoji: simulated terminal content
        ].join('\n'),
      },
      {
        title: 'تأكيد الإعدادات',
        instructions: 'احفظ الإعدادات إلى الذاكرة الدائمة.',
        output: [
          '$ Switch# write memory',
          'Building configuration...',
          '[OK]',
          '✔ تم حفظ الإعدادات في NVRAM.', // allow-emoji: simulated terminal content
        ].join('\n'),
      },
    ],
  },
  chem: {
    title: 'تجربة تفاعل حمض-قاعدة',
    description: 'محاكاة تفاعل HCl مع NaOH وقياس درجة الحموضة.',
    steps: [
      { title: 'تجهيز المواد', instructions: 'حضّر 50 مل من HCl تركيز 0.1M و 50 مل من NaOH.', output: '> beaker.add(\'HCl\', 50, 0.1);\n> beaker.add(\'NaOH\', 50, 0.1);\n✔ تم تحضير المواد بأمان.' }, // allow-emoji: simulated terminal content
      { title: 'القياس الابتدائي', instructions: 'اقرأ pH قبل الخلط.', output: '> ph.measure(beaker_A);\nHCl pH = 1.0\n> ph.measure(beaker_B);\nNaOH pH = 13.0' },
      { title: 'الخلط والتفاعل', instructions: 'اخلط الكميتين تدريجياً.', output: '> mix(beaker_A, beaker_B);\nReaction: HCl + NaOH → NaCl + H₂O\nTemperature rise: +5°C (exothermic)\n✔ التفاعل مكتمل.' }, // allow-emoji: simulated terminal content
      { title: 'القياس النهائي', instructions: 'اقرأ pH بعد التفاعل.', output: '> ph.measure(mix);\npH = 7.0 (متعادل)\n✔ النتيجة المتوقعة: تفاعل تعادل تام.' }, // allow-emoji: simulated terminal content
    ],
  },
  eng: {
    title: 'دائرة كهربائية بسيطة',
    description: 'بناء دائرة بقاعدة ومقاوم ومصباح، حساب التيار.',
    steps: [
      { title: 'تجميع المكونات', instructions: 'اختر بطارية 9V، مقاوم 470Ω، ومصباح LED.', output: '+ Battery: 9V\n+ Resistor: 470Ω\n+ LED: Red, Vf=2.0V\n✔ المكونات جاهزة.' }, // allow-emoji: simulated terminal content
      { title: 'حساب التيار', instructions: 'استخدم قانون أوم: I = (Vbat - Vled) / R.', output: 'I = (9 - 2) / 470\nI = 14.89 mA\n✔ ضمن النطاق الآمن للـ LED (Imax = 20 mA).' }, // allow-emoji: simulated terminal content
      { title: 'إغلاق الدائرة', instructions: 'وصّل المكونات على متوازي.', output: '> circuit.close();\nCurrent flowing: 14.9 mA\nLED brightness: 75%\n✔ المصباح يعمل.' }, // allow-emoji: simulated terminal content
      { title: 'قياس الجهد', instructions: 'استخدم الفولتميتر لقياس الجهد على المقاوم.', output: '> voltmeter.read(R1);\nVR = 7.0V\nVerification: Vbat = VR + VLED = 7 + 2 = 9V ✔' }, // allow-emoji: simulated terminal content
    ],
  },
};

const labIcon = (cat: string): LucideIcon => {
  if (cat === 'net') return Network;
  if (cat === 'chem') return Atom;
  if (cat === 'eng') return Zap;
  if (cat === 'bio') return Microscope;
  if (cat === 'robot') return BotIcon;
  if (cat === 'phys') return Cpu;
  return FlaskConical;
};

const inferCategory = (lab: VirtualLab): string => {
  const n = lab.name.toLowerCase();
  if (lab.category === 'net' || n.includes('شبك')) return 'net';
  if (lab.category === 'chem' || n.includes('كيمياء')) return 'chem';
  if (lab.category === 'eng' || n.includes('كهرب') || n.includes('دوائر')) return 'eng';
  return lab.category;
};

/** Shape-matched KPI strip skeleton (3 metric cards). */
function LabsKpiSkeleton() {
  return (
    <div className="grid-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="metric">
          <div style={{ marginBottom: 'var(--sp-3)' }}><Skeleton width={90} height={11} /></div>
          <Skeleton width={56} height={26} />
        </div>
      ))}
    </div>
  );
}

/* Typing cadence for the simulator terminal — a JS timer, not a CSS
   motion value (there is no JS-readable duration token); under
   prefers-reduced-motion the step prints instantly instead. */
const TYPE_INTERVAL_MS = 220;

export default function LabsPage() {
  const labs = useLabs();
  const labStats = useMyLabSessions();
  const [activeLab, setActiveLab] = useState<VirtualLab | null>(null);

  return (
    <div className="page">
      {!activeLab ? (
        <>
          <header className="page-header">
            <div className="page-title-block">
              <h1 className="page-title">المعامل الافتراضية</h1>
              <p className="page-subtitle">
                تجارب علمية تفاعلية بدون الحاجة لمعدات حقيقية — شغّل التجربة
                خطوة بخطوة وراقب النتائج في طرفية المحاكاة.
              </p>
            </div>
          </header>

          {labs.isPending ? <LabsKpiSkeleton /> : (
            <div className="grid-3">
              <MetricCard icon={FlaskConical} label="معامل متاحة" value={labs.data?.length ?? '—'} color="brand" />
              <MetricCard
                icon={Play}
                label="جلسات نشطة"
                value={labStats.data?.active.toLocaleString('ar-LY') ?? '—'}
                change={labStats.data ? `من أصل ${labStats.data.total} جلسة` : undefined}
                color="green"
              />
              <MetricCard
                icon={Award}
                label="تجارب مكتملة"
                value={labStats.data?.completed.toLocaleString('ar-LY') ?? '—'}
                color="gold"
              />
            </div>
          )}

          {labs.isPending ? (
            <div className="grid-3" aria-busy="true" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <div key={i} className="lib-skel-tile">
                  <Skeleton width="100%" height={96} />
                  <div style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    <Skeleton width="70%" height={15} />
                    <Skeleton width="45%" height={11} />
                  </div>
                </div>
              ))}
            </div>
          ) :
           labs.isError ? <Card><ErrorState error={labs.error} onRetry={() => labs.refetch()} /></Card> :
           !labs.data?.length ? <Card><EmptyState icon={FlaskConical} title="لا معامل متاحة" /></Card> : (
            <div className="grid-3">
              {labs.data.map((l) => {
                const cat = inferCategory(l);
                const Cmp = labIcon(cat);
                // Shared default tint: lib/courseMeta.ts (wave 9-a).
                const tint = courseTint(l.themeColor);
                const hasExperiment = !!EXPERIMENT_LIBRARY[cat];
                return (
                  <div key={l.id} className="thumb-card">
                    <div
                      className="thumb-card-image"
                      style={{ background: `color-mix(in srgb, ${tint} 10%, transparent)`, height: 96 }}
                    >
                      <span style={{ color: `color-mix(in srgb, ${tint} 70%, var(--text))` }}>
                        <Icon icon={Cmp} size={32} strokeWidth={1.6} />
                      </span>
                    </div>
                    <div className="thumb-card-body">
                      <div className="thumb-card-title">{l.name}</div>
                      <div className="thumb-card-sub">
                        <bdi>{l.platform ?? '—'}</bdi> · <bdi>{l.totalExperiments}</bdi> تجربة
                      </div>
                      <button
                        type="button"
                        className={`btn ${hasExperiment ? 'primary' : 'outline'}`}
                        style={{ marginTop: 'var(--sp-3)' }}
                        onClick={() => setActiveLab(l)}
                        disabled={!hasExperiment}
                      >
                        <Icon icon={Play} size={13} />
                        {hasExperiment ? 'ابدأ تجربة' : 'قريباً'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <LabRunner lab={activeLab} onExit={() => setActiveLab(null)} />
      )}
    </div>
  );
}

/* ─── Lab runner ────────────────────────────────────────── */
function LabRunner({ lab, onExit }: { lab: VirtualLab; onExit: () => void }) {
  const cat = inferCategory(lab);
  const exp = EXPERIMENT_LIBRARY[cat];
  const [stepIndex, setStepIndex] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const reducedMotion = useReducedMotion();

  // Animate terminal output line by line. Declared BEFORE the !exp early
  // return below — hooks must never be conditional (audit 0-d P2).
  useEffect(() => {
    const step = exp?.steps[stepIndex];
    if (!running || !step) return;
    const lines = step.output.split('\n');
    if (reducedMotion) {
      // Reduced motion: print the step instantly, no typewriter.
      setTerminalLines(lines);
      setRunning(false);
      return;
    }
    let i = 0;
    setTerminalLines([]);
    const id = setInterval(() => {
      if (i >= lines.length) {
        clearInterval(id);
        setRunning(false);
        return;
      }
      setTerminalLines((prev) => [...prev, lines[i] ?? '']);
      i += 1;
    }, TYPE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [running, stepIndex, exp, reducedMotion]);

  if (!exp) {
    return (
      <Card>
        <EmptyState icon={FlaskConical} title="هذه التجربة قيد البناء" description="سيتم إضافتها قريباً." />
      </Card>
    );
  }

  const currentStep = exp.steps[stepIndex];

  const runStep = () => {
    setTerminalLines([]);
    setRunning(true);
  };

  const nextStep = () => {
    if (stepIndex < exp.steps.length - 1) {
      setStepIndex(stepIndex + 1);
      setTerminalLines([]);
      setRunning(false);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <Card>
        <div className="state">
          <div className="state-icon state-icon-success">
            <Icon icon={CheckCircle2} size={28} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text)', marginTop: 'var(--sp-3)' }}>أحسنت!</div>
          <div className="text-sm text-muted" style={{ maxWidth: 460, marginTop: 'var(--sp-2)' }}>
            أكملت "<bdi>{exp.title}</bdi>" بنجاح.
          </div>
          <div className="lab-done-chip" style={{ marginTop: 'var(--sp-5)' }}>
            <Icon icon={Award} size={18} />
            تجربة منجزة
          </div>
          <div className="flex gap-2" style={{ marginTop: 'var(--sp-5)' }}>
            <button type="button" className="btn" onClick={onExit}>
              <Icon icon={ChevronRight} size={13} />
              العودة للمعامل
            </button>
            <button type="button" className="btn primary" onClick={() => { setDone(false); setStepIndex(0); setTerminalLines([]); }}>
              إعادة التجربة
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={onExit} style={{ alignSelf: 'flex-start' }}>
        <Icon icon={ChevronRight} size={13} />
        العودة للمعامل
      </button>

      <div
        className="lab-hero"
        style={{ '--lab-accent': lab.themeColor ?? 'var(--accent)' } as CSSProperties}
      >
        <div className="lab-hero-head">
          <Badge color="green">جلسة نشطة</Badge>
          <span className="text-xs text-subtle">{lab.name}</span>
        </div>
        <h2 className="lab-hero-title">{exp.title}</h2>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--sp-4)' }}>{exp.description}</p>
        <ProgressBar
          value={(stepIndex / exp.steps.length) * 100}
          label={<bdi>الخطوة {stepIndex + 1} من {exp.steps.length}</bdi>}
        />
      </div>

      <div className="grid-2-1">
        <Card title={`الخطوة ${stepIndex + 1} · ${currentStep?.title}`} icon={Play}>
          <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-base)', marginBottom: 'var(--sp-4)' }}>
            {currentStep?.instructions}
          </p>
          <div className="terminal">
            <div className="terminal-head">
              <div className="terminal-dots" aria-hidden>
                <span className="terminal-dot r" />
                <span className="terminal-dot y" />
                <span className="terminal-dot g" />
              </div>
              <div className="terminal-title"><bdi>{lab.platform ?? 'simulator'}</bdi></div>
            </div>
            <div className="terminal-body" role="log" aria-live="polite" aria-label="مخرجات المحاكاة">
              {terminalLines.length === 0 && !running ? (
                <div className="terminal-hint">— اضغط "تشغيل الخطوة" لتنفيذ الأوامر —</div>
              ) : (
                terminalLines.map((line, i) => (
                  <div key={i} className={`terminal-line ${
                    line.startsWith('✔') ? 'terminal-prompt' : // allow-emoji: simulated terminal content
                    line.startsWith('%') || line.startsWith('Verification') ? 'terminal-info' :
                    ''
                  }`}>
                    {line}
                    {running && i === terminalLines.length - 1 && <span className="terminal-cursor" aria-hidden />}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2" style={{ marginTop: 'var(--sp-4)' }}>
            {!running && terminalLines.length === 0 && (
              <button type="button" className="btn primary" onClick={runStep}>
                <Icon icon={Play} size={13} /> تشغيل الخطوة
              </button>
            )}
            {!running && terminalLines.length > 0 && (
              <button type="button" className="btn primary" onClick={nextStep}>
                {stepIndex < exp.steps.length - 1 ? 'الخطوة التالية' : 'إنهاء التجربة'}
                <Icon icon={ChevronLeft} size={13} />
              </button>
            )}
          </div>
        </Card>

        <Card title="الخطوات">
          <ol className="steps">
            {exp.steps.map((s, i) => (
              <li
                key={i}
                className={`step ${i === stepIndex ? 'on' : i < stepIndex ? 'done' : ''}`}
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                <div className="step-num">
                  {i < stepIndex ? <Icon icon={Check} size={14} aria-hidden /> : i + 1}
                </div>
                <div className="step-body">
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.instructions}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
