// Barrel (r153c): useResources was split into domain modules under
// ./resources/. PUBLIC SURFACE FROZEN — every symbol, query key and
// invalidation moved verbatim; consumers and tests keep importing
// from '…/hooks/useResources' unchanged.
export * from './resources/teacher';
export * from './resources/student';
export * from './resources/notifications';
export * from './resources/catalog';
export * from './resources/social';
export * from './resources/admin';
export * from './resources/research';
export * from './resources/learning';
export * from './resources/submissions';
export * from './resources/exams';
export * from './resources/training';
export * from './resources/permissions';
export * from './resources/ai';
export * from './resources/live';

/**
 * Best-effort Arabic error message for inline mutation failures.
 * Canonical implementation lives in lib/format.ts since wave 9-a;
 * re-exported here so the ~15 existing import sites keep working.
 */
export { apiErrorMessage } from '../lib/format';
