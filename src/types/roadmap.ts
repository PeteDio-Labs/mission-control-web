/**
 * Roadmap service types — mirrors the wire shape returned by /api/v1/roadmap/tasks
 * (see `apps/mission-control/mission-control-backend/src/services/roadmap/types.ts`).
 *
 * Vocabulary (see planning/MIGRATE-KANBAN-TO-MC.md glossary):
 *   - Roadmap Task = long-lived unit of work on the Master Plan (PB.10, RETRO.13)
 *   - Runtime Plan = short-lived actionable moment (alert, proposed_fix) — see types/plans.ts
 *
 * The two relate via plans.roadmap_task_id (migration 008). The RoadmapDetail
 * page renders linked plans alongside events.
 */

export type RoadmapStatus =
  | 'backlog'
  | 'in-progress'
  | 'blocked'
  | 'awaiting-user'
  | 'done';

export const ROADMAP_STATUSES: RoadmapStatus[] = [
  'backlog',
  'in-progress',
  'blocked',
  'awaiting-user',
  'done',
];

export type WSId =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'AUTH' | 'EVAL' | 'RETRO' | 'PB' | 'SEC' | 'G';

/**
 * Workstream display names. Ported from planning/master-plan-kanban-types.ts
 * to keep MC Web independent of the static kanban file (which will be
 * frozen at Phase 4 of the migration).
 */
export const WS_NAMES: Record<WSId, string> = {
  '0':    'Phase 0 — Tear down blog',
  '1':    'Phase 1 — ollama-gateway + GPU routing',
  '2':    'Phase 2 — @petedio/shared/harness library',
  '3':    'Phase 3 — Doc Steward + memory-agent decommission',
  '4':    'Phase 4 — Playbook reorg + infra-agent glob fix',
  '5':    'Phase 5a + 5 — Host rename + 4-agent consolidation',
  '6':    'Phase 6 — MC Visual Harness',
  '7':    'Phase 7 — Capacity Planner + Security Auditor',
  '8':    'Phase 8 — Tauri Desktop App',
  '9':    'Phase 9 — Blog v2 / homelab wiki + RAG',
  'AUTH': 'Authentik integration',
  'EVAL': 'promptfoo eval harness',
  'RETRO': 'Retrospective items',
  'PB':   'Pete Bot v2',
  'SEC':  'Secrets',
  'G':    'Workstream G — opportunistic LXC imports',
};

export type RoadmapEventType =
  | 'created'
  | 'status_change'
  | 'comment'
  | 'updated'
  | 'plan_linked';

export interface RoadmapTaskRow {
  id: string;
  ws: string;
  status: RoadmapStatus;
  effort: string;
  title: string;
  description: string;
  depends_on: string[];
  created_at: string;
  updated_at: string;
}

export interface RoadmapTaskEventRow {
  id: string;
  task_id: string;
  event_type: RoadmapEventType;
  from_status: RoadmapStatus | null;
  to_status: RoadmapStatus | null;
  actor: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}

/** Slim plan row shape returned in the RoadmapTaskDetail.linkedPlans field. */
export interface LinkedPlanRow {
  id: string;
  kind: string;
  status: string;
  severity: string;
  summary: string;
  created_at: string;
  closed_at: string | null;
}

export interface RoadmapTaskListResponse {
  tasks: RoadmapTaskRow[];
  limit: number;
  offset: number;
}

export interface RoadmapTaskDetailResponse {
  task: RoadmapTaskRow;
  events: RoadmapTaskEventRow[];
  linkedPlans: LinkedPlanRow[];
}
