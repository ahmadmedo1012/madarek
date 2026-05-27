import { useEffect, useState } from 'react';
import {
  FlaskConical, Network, Cpu, Atom, Zap, Bot as BotIcon, Microscope,
  CheckCircle2, ChevronLeft, X, Play, Award,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useLabs, type VirtualLab } from '../../hooks/useResources';
import { LabBeakerIllustration } from '../../components/illustrations';

interface LabExperiment {
  title: string;
  description: string;
  steps: Array<{ title: string; instructions: string; output: string }>;
}

/** Built-in experiment scripts per lab category — simulation only. */
const EXPERIMENT_LIBRARY: Record<string, LabExperiment> = {
  net: {
    title: 'إعداد شبكة LAN مع VLAN',
    description: 'تكوين راوتر و سويتش، إعداد VLANs، اختبار الاتصال بين الأجهزة.',
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
          '✔ تم تفعيل الواجهة بنجاح.',
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
          '✔ تم إعداد VLAN 10 على المنفذ FastEthernet0/1.',
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
          '✔ الاتصال يعمل بنجاح.',
        ].join('\n'),
      },
      {
        title: 'تأكيد الإعدادات',
        instructions: 'احفظ الإعدادات إلى الذاكرة الدائمة.',
        output: [
          '$ Switch# write memory',
          'Building configuration...',
          '[OK]',
          '✔ تم حفظ الإعدادات في NVRAM.',
        ].join('\n'),
      },
    ],
  },
  chem: {
    title: 'تجربة تفاعل حمض-قاعدة',
    description: 'محاكاة تفاعل HCl مع NaOH وقياس درجة الحموضة.',
    steps: [
      { title: 'تجهيز المواد', instructions: 'حضّر 50 مل من HCl تركيز 0.1M و 50 مل من NaOH.', output: '> beaker.add(\'HCl\', 50, 0.1);\n> beaker.add(\'NaOH\', 50, 0.1);\n✔ تم تحضير المواد بأمان.' },
      { title: 'القياس الابتدائي', instructions: 'اقرأ pH قبل الخلط.', output: '> ph.measure(beaker_A);\nHCl pH = 1.0\n> ph.measure(beaker_B);\nNaOH pH = 13.0' },
      { title: 'الخلط والتفاعل', instructions: 'اخلط الكميتين تدريجياً.', output: '> mix(beaker_A, beaker_B);\nReaction: HCl + NaOH → NaCl + H₂O\nTemperature rise: +5°C (exothermic)\n✔ التفاعل مكتمل.' },
      { title: 'القياس النهائي', instructions: 'اقرأ pH بعد التفاعل.', output: '> ph.measure(mix);\npH = 7.0 (متعادل)\n✔ النتيجة المتوقعة: تفاعل تعادل تام.' },
    ],
  },
  eng: {
    title: 'دائرة كهربائية بسيطة',
    description: 'بناء دائرة بقاعدة ومقاوم ومصباح، حساب التيار.',
    steps: [
      { title: 'تجميع المكونات', instructions: 'اختر بطارية 9V، مقاوم 470Ω، ومصباح LED.', output: '+ Battery: 9V\n+ Resistor: 470Ω\n+ LED: Red, Vf=2.0V\n✔ المكونات جاهزة.' },
      { title: 'حساب التيار', instructions: 'استخدم قانون أوم: I = (Vbat - Vled) / R.', output: 'I = (9 - 2) / 470\nI = 14.89 mA\n✔ ضمن النطاق الآمن للـ LED (Imax = 20 mA).' },
      { title: 'إغلاق الدائرة', instructions: 'وصّل المكونات على متوازي.', output: '> circuit.close();\nCurrent flowing: 14.9 mA\nLED brightness: 75%\n✔ المصباح يعمل.' },
      { title: 'قياس الجهد', instructions: 'استخدم الفولتميتر لقياس الجهد على المقاوم.', output: '> voltmeter.read(R1);\nVR = 7.0V\nVerification: Vbat = VR + VLED = 7 + 2 = 9V ✔' },
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

export default function LabsPage() {
  const labs = useLabs();
  const [activeLab, setActiveLab] = useState<VirtualLab | null>(null);

  return (
    <div className="page">
      {!activeLab ? (
        <>
          <div className="page-header">
            <div className="page-title-block">
              <h1 className="page-title">المعامل الافتراضية</h1>
              <p className="page-subtitle">
                تجارب علمية تفاعلية بدون الحاجة لمعدات حقيقية. أثبتت تجربة جامعة سرت
                تفوّق الطلاب الذين استخدموا هذا النوع من المعامل.
              </p>
            </div>
            <LabBeakerIllustration />
          </div>

          <div className="grid-3">
            <MetricCard icon={FlaskConical} label="معامل متاحة" value={labs.data?.length ?? '—'} color="brand" />
            <MetricCard icon={Play} label="جلسات نشطة" value="3" change="هذا الفصل" color="green" />
            <MetricCard icon={Award} label="تجارب مكتملة" value="12" color="gold" />
          </div>

          {labs.isPending ? <Card><LoadingState /></Card> :
           labs.isError ? <Card><ErrorState /></Card> :
           !labs.data?.length ? <Card><EmptyState icon={FlaskConical} title="لا معامل متاحة" /></Card> : (
            <div className="grid-3">
              {labs.data.map((l) => {
                const cat = inferCategory(l);
                const Cmp = labIcon(cat);
                const tint = l.themeColor ?? '#3D6BD6';
                const hasExperiment = !!EXPERIMENT_LIBRARY[cat];
                return (
                  <div key={l.id} className="thumb-card lab-card-enhanced">
                    <div className="thumb-card-image" style={{ background: `${tint}10`, height: 96 }}>
                      <span style={{ color: tint }}><Icon icon={Cmp} size={32} strokeWidth={1.6} /></span>
                    </div>
                    <div className="thumb-card-body">
                      <div className="thumb-card-title">{l.name}</div>
                      <div className="thumb-card-sub">
                        {l.platform ?? '—'} · {l.totalExperiments} تجربة
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
                    {hasExperiment && (
                      <div className="lab-card-overlay">
                        <button
                          type="button"
                          className="lab-card-overlay-btn"
                          onClick={() => setActiveLab(l)}
                        >
                          <Icon icon={Play} size={14} />
                          ابدأ التجربة
                        </button>
                      </div>
                    )}
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

  if (!exp) {
    return (
      <Card>
        <EmptyState icon={FlaskConical} title="هذه التجربة قيد البناء" description="سيتم إضافتها قريباً." />
      </Card>
    );
  }

  const currentStep = exp.steps[stepIndex];

  // Animate terminal output line by line.
  useEffect(() => {
    if (!running || !currentStep) return;
    const lines = currentStep.output.split('\n');
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
    }, 220);
    return () => clearInterval(id);
  }, [running, stepIndex, currentStep]);

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
          <div className="state-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)', width: 64, height: 64 }}>
            <Icon icon={CheckCircle2} size={32} />
          </div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text)', marginTop: 'var(--sp-3)' }}>تجربة منجزة!</div>
          <div className="text-sm text-muted" style={{ maxWidth: 460, marginTop: 'var(--sp-2)' }}>
            أكملت "{exp.title}" بنجاح. سيتم تسجيل النتيجة في ملفك الدراسي.
          </div>
          <div style={{
            marginTop: 'var(--sp-5)', padding: 'var(--sp-4) var(--sp-6)',
            background: 'var(--gold-soft)', borderRadius: 'var(--r-md)',
            color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: 'var(--font-mono)', fontWeight: 700,
          }}>
            <Icon icon={Award} size={18} />
            النتيجة: 92 / 100
          </div>
          <div className="flex gap-2" style={{ marginTop: 'var(--sp-5)' }}>
            <button type="button" className="btn" onClick={onExit}>
              <Icon icon={ChevronLeft} size={13} style={{ transform: 'scaleX(-1)' }} />
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
        <Icon icon={ChevronLeft} size={13} style={{ transform: 'scaleX(-1)' }} />
        العودة للمعامل
      </button>

      <div style={{
        background: `${lab.themeColor ?? '#3D6BD6'}10`,
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--sp-5)',
      }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 'var(--sp-2)' }}>
          <Badge color="green">جلسة نشطة</Badge>
          <span className="text-xs text-subtle">{lab.name}</span>
        </div>
        <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          {exp.title}
        </h2>
        <p className="text-sm text-muted" style={{ marginBottom: 'var(--sp-4)' }}>{exp.description}</p>
        <ProgressBar value={(stepIndex / exp.steps.length) * 100} label={`الخطوة ${stepIndex + 1} من ${exp.steps.length}`} />
      </div>

      <div className="grid-2-1">
        <Card title={`الخطوة ${stepIndex + 1} · ${currentStep?.title}`} icon={Play}>
          <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-base)', marginBottom: 'var(--sp-4)' }}>
            {currentStep?.instructions}
          </p>
          <div className="terminal">
            <div className="terminal-head">
              <div className="terminal-dots">
                <span className="terminal-dot r" />
                <span className="terminal-dot y" />
                <span className="terminal-dot g" />
              </div>
              <div className="terminal-title">{lab.platform ?? 'simulator'}</div>
            </div>
            <div className="terminal-body">
              {terminalLines.length === 0 && !running ? (
                <div className="terminal-info">— اضغط "تشغيل الخطوة" لتنفيذ الأوامر —</div>
              ) : (
                terminalLines.map((line, i) => (
                  <div key={i} className={`terminal-line ${
                    line.startsWith('✔') ? 'terminal-prompt' :
                    line.startsWith('%') || line.startsWith('Verification') ? 'terminal-info' :
                    ''
                  }`}>
                    {line}
                    {running && i === terminalLines.length - 1 && <span className="terminal-cursor" />}
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
          <div className="steps">
            {exp.steps.map((s, i) => (
              <div
                key={i}
                className={`step ${i === stepIndex ? 'on' : i < stepIndex ? 'done' : ''}`}
              >
                <div className="step-num">{i < stepIndex ? '✓' : i + 1}</div>
                <div className="step-body">
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.instructions.slice(0, 60)}…</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
