/**
 * Plan service types — mirrors the wire shape returned by /api/v1/plans
 * (see `apps/mission-control/mission-control-backend/src/services/plans/types.ts`).
 *
 * Names + casing match the JSON the backend sends (snake_case fields from
 * Postgres rows, camelCase for nested object keys the backend constructs).
 * Keep these in sync with the backend types — they're declared independently
 * to avoid a cross-package import.
 */

export type PlanKind =
  | 'proposed_fix'
  | 'alert'
  | 'gated_action'
  | 'eval_regression'
  | 'capacity_warning';

export type PlanStatus =
  | 'pending'
  | 'presented'
  | 'clicked'
  | 'dispatched'
  | 'in_progress'
  | 'succeeded'
  | 'failed'
  | 'stuck'
  | 'resolved'
  | 'dismissed'
  | 'expired';

export type PlanSeverity = 'info' | 'warn' | 'error' | 'critical';

export type PlanSource = 'agent' | 'alertmanager' | 'user' | 'cron' | 'external';

export type ActorSource =
  | 'discord'
  | 'mc_web'
  | 'mc_desktop'
  | 'api'
  | 'system'
  | 'agent';

export type PlanButtonStyle = 'primary' | 'secondary' | 'danger' | 'link';

export interface ProposedFix {
  agent: string;
  task: string;
  input?: Record<string, unknown>;
}

export interface StuckProposal {
  label: string;
  task?: string;
  mcUrl?: string;
}

export interface PlanRow {
  id: string;
  kind: PlanKind;
  status: PlanStatus;
  severity: PlanSeverity;
  source: PlanSource;
  source_metadata: Record<string, unknown>;
  target: string | null;
  summary: string;
  proposed_fix: ProposedFix | null;
  triggered_agent_run_id: string | null;
  approved_by_mc_user_id: string | null;
  approved_via: ActorSource | null;
  result: Record<string, unknown> | null;
  error_summary: string | null;
  proposals: StuckProposal[] | null;
  expires_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanActionRow {
  plan_id: string;
  action_id: string;
  label: string;
  style: PlanButtonStyle;
  ordering: number;
  click_payload: Record<string, unknown>;
  acted_at: string | null;
  acted_by_user: string | null;
  created_at: string;
}

export type PlanEventType =
  | 'created'
  | 'presented'
  | 'clicked'
  | 'dispatched'
  | 'state_change'
  | 'agent_progress'
  | 'succeeded'
  | 'failed'
  | 'stuck'
  | 'dismissed'
  | 'expired'
  | 'resolved'
  | 'comment'
  | 'duplicate_click';

export interface PlanEventRow {
  id: string;
  plan_id: string;
  event_type: PlanEventType;
  action_id: string | null;
  actor_user_id: string | null;
  actor_source: ActorSource | null;
  from_status: PlanStatus | null;
  to_status: PlanStatus | null;
  detail: Record<string, unknown>;
  occurred_at: string;
}

// ─── Status grouping helpers ─────────────────────────────────────────

/** Statuses a user can still act on or that are still running. */
export const ACTIVE_STATUSES: PlanStatus[] = [
  'pending',
  'presented',
  'clicked',
  'dispatched',
  'in_progress',
  'stuck',
];

/** Statuses the bell badge should count (presented through stuck). */
export const BELL_STATUSES: PlanStatus[] = [
  'presented',
  'clicked',
  'dispatched',
  'in_progress',
  'stuck',
];

export function isActiveStatus(status: PlanStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}
