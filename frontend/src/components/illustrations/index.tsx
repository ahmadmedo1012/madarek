/**
 * Inline SVG illustration components for decorative use across the platform.
 * Each uses CSS animation classes defined in world-class.css.
 */

/** Abstract wave pattern for dashboard backgrounds */
export function DashboardWaveIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`illustration-float ${className}`}
      viewBox="0 0 320 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: '100%', height: 'auto', opacity: 0.18 }}
    >
      <path
        className="illustration-draw"
        d="M0 40 C40 20, 80 60, 120 40 S200 20, 240 40 S320 60, 320 40"
        stroke="var(--primary, #6366f1)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        className="illustration-draw"
        d="M0 55 C50 35, 90 75, 140 55 S220 35, 280 55 S320 70, 320 55"
        stroke="var(--primary, #6366f1)"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ animationDelay: '0.3s' }}
      />
      <circle cx="60" cy="40" r="3" fill="var(--primary, #6366f1)" opacity="0.4" />
      <circle cx="180" cy="50" r="2.5" fill="var(--primary, #6366f1)" opacity="0.3" />
      <circle cx="280" cy="35" r="2" fill="var(--primary, #6366f1)" opacity="0.35" />
    </svg>
  );
}

/** Neural network style SVG for AI pages */
export function AiBrainIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`illustration-pulse ${className}`}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: 80, height: 80 }}
    >
      <circle cx="40" cy="40" r="28" stroke="var(--primary, #6366f1)" strokeWidth="1.5" opacity="0.2" />
      <circle cx="40" cy="40" r="18" stroke="var(--primary, #6366f1)" strokeWidth="1" opacity="0.3" />
      {/* Nodes */}
      <circle cx="40" cy="20" r="3" fill="var(--primary, #6366f1)" />
      <circle cx="25" cy="35" r="3" fill="var(--primary, #6366f1)" />
      <circle cx="55" cy="35" r="3" fill="var(--primary, #6366f1)" />
      <circle cx="30" cy="55" r="3" fill="var(--primary, #6366f1)" />
      <circle cx="50" cy="55" r="3" fill="var(--primary, #6366f1)" />
      <circle cx="40" cy="40" r="4" fill="var(--primary, #6366f1)" />
      {/* Connections */}
      <line x1="40" y1="20" x2="40" y2="40" stroke="var(--primary, #6366f1)" strokeWidth="1" opacity="0.5" />
      <line x1="25" y1="35" x2="40" y2="40" stroke="var(--primary, #6366f1)" strokeWidth="1" opacity="0.5" />
      <line x1="55" y1="35" x2="40" y2="40" stroke="var(--primary, #6366f1)" strokeWidth="1" opacity="0.5" />
      <line x1="30" y1="55" x2="40" y2="40" stroke="var(--primary, #6366f1)" strokeWidth="1" opacity="0.5" />
      <line x1="50" y1="55" x2="40" y2="40" stroke="var(--primary, #6366f1)" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

/** Animated beaker/flask SVG for labs */
export function LabBeakerIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`illustration-float ${className}`}
      viewBox="0 0 64 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: 64, height: 80 }}
    >
      {/* Flask body */}
      <path
        d="M22 10 V30 L10 65 C9 68, 11 72, 14 72 H50 C53 72, 55 68, 54 65 L42 30 V10"
        stroke="var(--primary, #6366f1)"
        strokeWidth="2"
        fill="none"
        className="illustration-draw"
      />
      {/* Top opening */}
      <line x1="20" y1="10" x2="44" y2="10" stroke="var(--primary, #6366f1)" strokeWidth="2" strokeLinecap="round" />
      {/* Liquid */}
      <path
        d="M15 55 Q25 50, 32 55 Q40 60, 49 55 V68 C49 70, 47 72, 45 72 H19 C17 72, 15 70, 15 68 Z"
        fill="var(--primary, #6366f1)"
        opacity="0.15"
      />
      {/* Bubbles */}
      <circle cx="28" cy="60" r="2" fill="var(--primary, #6366f1)" opacity="0.4" className="illustration-pulse" />
      <circle cx="36" cy="55" r="1.5" fill="var(--primary, #6366f1)" opacity="0.3" className="illustration-pulse" />
      <circle cx="32" cy="48" r="1" fill="var(--primary, #6366f1)" opacity="0.25" className="illustration-pulse" />
    </svg>
  );
}

/** Star burst SVG for gamification/achievements */
export function AchievementStarIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`illustration-pulse ${className}`}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: 64, height: 64 }}
    >
      {/* Outer glow */}
      <circle cx="32" cy="32" r="28" stroke="var(--warning, #f59e0b)" strokeWidth="1" opacity="0.2" />
      {/* Star */}
      <path
        d="M32 10 L36.5 24 L51 24 L39 32 L43 46 L32 38 L21 46 L25 32 L13 24 L27.5 24 Z"
        fill="var(--warning, #f59e0b)"
        opacity="0.2"
        stroke="var(--warning, #f59e0b)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Sparkles */}
      <circle cx="50" cy="14" r="1.5" fill="var(--warning, #f59e0b)" opacity="0.5" />
      <circle cx="14" cy="18" r="1" fill="var(--warning, #f59e0b)" opacity="0.4" />
      <circle cx="52" cy="48" r="1.2" fill="var(--warning, #f59e0b)" opacity="0.35" />
    </svg>
  );
}

/** Abstract growth/learning SVG with animated gradient paths */
export function HeroIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`illustration-gradient-shift ${className}`}
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ width: 120, height: 80 }}
    >
      {/* Growth curve */}
      <path
        className="illustration-draw"
        d="M10 70 C30 65, 40 50, 50 40 S70 20, 90 15 S110 12, 115 10"
        stroke="var(--success, #10b981)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Milestone dots */}
      <circle cx="50" cy="40" r="4" fill="var(--success, #10b981)" opacity="0.3" />
      <circle cx="50" cy="40" r="2" fill="var(--success, #10b981)" />
      <circle cx="90" cy="15" r="4" fill="var(--primary, #6366f1)" opacity="0.3" />
      <circle cx="90" cy="15" r="2" fill="var(--primary, #6366f1)" />
      {/* Background arcs */}
      <path
        d="M10 60 Q60 30, 110 25"
        stroke="var(--primary, #6366f1)"
        strokeWidth="0.8"
        opacity="0.15"
        strokeDasharray="4 4"
      />
    </svg>
  );
}
