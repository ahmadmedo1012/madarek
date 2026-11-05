'use strict';
// T-22 Track B: circular-dependency ratchet (baseline in scripts/deadcode/baseline.json).
// Run from repo root: depcruise frontend/src --config scripts/deadcode/.dependency-cruiser.cjs
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Ratchet gate: circular dependencies may only decrease (scripts/deadcode/baseline.json).',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'frontend/tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
