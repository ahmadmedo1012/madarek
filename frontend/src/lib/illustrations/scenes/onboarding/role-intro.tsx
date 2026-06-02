/**
 * Scene: onboarding-role-intro — frame 4 of the onboarding sequence.
 *
 * Family rules — see contracts/illustration-system.md.
 *
 * Composition: a single role-keyed motif on a paper card. Each role
 * gets a distinct symbolic object that reads instantly and shares the
 * platform's visual language:
 *
 *   STUDENT  — open book on a desk
 *   TEACHER  — chalkboard with a chalk-stroke
 *   ADMIN    — keychain with two keys
 *   QUALITY  — clipboard with a checkmark
 *   OWNER    — building with three windows
 *
 * The frame is symmetric — no RTL mirror needed.
 *
 * Note: the spec lists 7 roles (student, faculty, department-head,
 * dean, admin, quality, owner). Madrak's auth uses 5 roles
 * (STUDENT, TEACHER, ADMIN, QUALITY, OWNER) — TEACHER covers the
 * faculty/department-head/dean spectrum via teacherProfile.position.
 * This scene keys off the auth role; the role-accent token (set on
 * body[data-role]) handles the visual variation between
 * faculty/dean/department-head within the same TEACHER illustration.
 */
import type { ReactElement } from 'react';
import type { AppRole } from '../../../../stores/auth.store';

export interface SceneOnboardingRoleIntroProps {
  role?: AppRole;
}

export function SceneOnboardingRoleIntro({
  role = 'STUDENT',
}: SceneOnboardingRoleIntroProps): ReactElement {
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Card backdrop — common to every role */}
      <rect
        x="22"
        y="32"
        width="156"
        height="136"
        rx="14"
        ry="14"
        fill="var(--ill-paper)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
      />

      {role === 'STUDENT' && <StudentMotif />}
      {role === 'TEACHER' && <TeacherMotif />}
      {role === 'ADMIN' && <AdminMotif />}
      {role === 'QUALITY' && <QualityMotif />}
      {role === 'OWNER' && <OwnerMotif />}
    </svg>
  );
}

function StudentMotif(): ReactElement {
  return (
    <g>
      {/* Desk */}
      <rect x="48" y="138" width="104" height="6" fill="var(--ill-hue-4)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      {/* Open book */}
      <path
        d="M62 86 L 100 80 L 100 138 L 62 132 Z"
        fill="var(--ill-hue-3)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M100 80 L 138 86 L 138 132 L 100 138 Z"
        fill="var(--ill-hue-3)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Page lines */}
      <line x1="70" y1="98" x2="92" y2="95" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="70" y1="106" x2="90" y2="103" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="108" y1="95" x2="130" y2="98" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="108" y1="103" x2="128" y2="106" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function TeacherMotif(): ReactElement {
  return (
    <g>
      {/* Chalkboard frame */}
      <rect x="48" y="62" width="104" height="76" rx="4" ry="4" fill="var(--ill-hue-1)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      {/* Inside paper area */}
      <rect x="56" y="70" width="88" height="60" rx="2" ry="2" fill="var(--ill-paper)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      {/* Chalk strokes */}
      <line x1="64" y1="86" x2="100" y2="86" stroke="var(--ill-hue-2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="98" x2="120" y2="98" stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="110" x2="92" y2="110" stroke="var(--ill-hue-2)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Stand */}
      <line x1="100" y1="138" x2="100" y2="156" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="80" y1="156" x2="120" y2="156" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function AdminMotif(): ReactElement {
  return (
    <g>
      {/* Keyring */}
      <circle cx="100" cy="80" r="10" fill="none" stroke="var(--ill-stroke)" strokeWidth="2" />
      {/* Two keys hanging */}
      <g>
        <line x1="100" y1="90" x2="84" y2="118" stroke="var(--ill-stroke)" strokeWidth="2" strokeLinecap="round" />
        <rect x="74" y="118" width="22" height="10" rx="2" ry="2" fill="var(--ill-hue-1)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
        <line x1="80" y1="128" x2="80" y2="134" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="86" y1="128" x2="86" y2="138" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g>
        <line x1="100" y1="90" x2="116" y2="118" stroke="var(--ill-stroke)" strokeWidth="2" strokeLinecap="round" />
        <rect x="104" y="118" width="22" height="10" rx="2" ry="2" fill="var(--ill-hue-6)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
        <line x1="116" y1="128" x2="116" y2="138" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="122" y1="128" x2="122" y2="134" stroke="var(--ill-stroke)" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </g>
  );
}

function QualityMotif(): ReactElement {
  return (
    <g>
      {/* Clipboard */}
      <rect x="62" y="68" width="76" height="92" rx="4" ry="4" fill="var(--ill-paper)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      {/* Clip */}
      <rect x="84" y="60" width="32" height="14" rx="3" ry="3" fill="var(--ill-hue-4)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      {/* Lines */}
      <line x1="74" y1="92" x2="126" y2="92" stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="74" y1="106" x2="118" y2="106" stroke="var(--ill-hue-3)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Big checkmark */}
      <path
        d="M78 134 L 92 148 L 124 122"
        fill="none"
        stroke="var(--ill-hue-2)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function OwnerMotif(): ReactElement {
  return (
    <g>
      {/* Building base */}
      <rect x="58" y="80" width="84" height="78" fill="var(--ill-hue-1)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      {/* Roof */}
      <path
        d="M50 80 L 100 56 L 150 80 Z"
        fill="var(--ill-hue-4)"
        stroke="var(--ill-stroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Three windows */}
      <rect x="68" y="96" width="16" height="16" fill="var(--ill-paper)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      <rect x="92" y="96" width="16" height="16" fill="var(--ill-paper)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      <rect x="116" y="96" width="16" height="16" fill="var(--ill-paper)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      {/* Door */}
      <rect x="92" y="128" width="16" height="30" fill="var(--ill-hue-6)" stroke="var(--ill-stroke)" strokeWidth="1.5" />
      <circle cx="104" cy="144" r="1" fill="var(--ill-stroke)" />
    </g>
  );
}
