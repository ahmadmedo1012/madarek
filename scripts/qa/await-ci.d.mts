/**
 * Types for scripts/qa/await-ci.mjs (the R357 L1 supersede-aware CI
 * gate). Sibling-declaration convention per scripts/db-ops-lib.d.mts.
 */
export type CiRunRecord = {
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  id?: number;
};

export type Decision = {
  action: 'pass' | 'superseded' | 'wait' | 'fail';
  note: string;
};

export declare function decide(input?: {
  runs?: CiRunRecord[];
  mainTip?: string | null;
  sha?: string;
  event?: string;
  ref?: string;
}): Decision;
