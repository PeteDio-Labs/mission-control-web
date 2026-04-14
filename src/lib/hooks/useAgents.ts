import useSWR from 'swr';
import { apiClient } from '@/lib/api/client';

export type AgentStatus = 'queued' | 'running' | 'waiting_approval' | 'complete' | 'failed' | 'dead-letter';

export interface GatedAction {
  actionType: string;
  description: string;
  preview?: string;
}

export interface Artifact {
  type: 'investigation-report' | 'task-list' | 'blog-draft' | 'diff' | 'log' | 'pr-url' | 'summary';
  label: string;
  content: string;
}

export interface AgentResult {
  taskId: string;
  agentName: string;
  status: 'complete' | 'failed';
  summary: string;
  artifacts: Artifact[];
  durationMs: number;
  completedAt: string;
}

export interface AgentRun {
  id: string;
  task_id: string;
  agent_name: string;
  trigger: string;
  status: AgentStatus;
  input: Record<string, unknown>;
  summary: string | null;
  current_message: string | null;
  pending_approval: GatedAction | null;
  result: AgentResult | null;
  issued_at: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

const fetcher = <T>(path: string): Promise<T> => apiClient.get<T>(path);

/** Live status panel — one row per agent name */
export function useAgents() {
  const { data, error, isLoading, mutate } = useSWR<{ agents: AgentRun[] }>(
    '/api/v1/agents',
    fetcher,
    { refreshInterval: 3000, revalidateOnFocus: true },
  );
  return { agents: data?.agents ?? [], isLoading, error, refresh: mutate };
}

/** Paginated run history */
export function useAgentHistory(opts: { limit?: number; offset?: number; agent?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  if (opts.agent) params.set('agent', opts.agent);

  const { data, error, isLoading, mutate } = useSWR<{ runs: AgentRun[]; limit: number; offset: number }>(
    `/api/v1/agents/history?${params}`,
    fetcher,
    { refreshInterval: 15000 },
  );
  return { runs: data?.runs ?? [], isLoading, error, refresh: mutate };
}

/** Queued + running tasks */
export function useAgentQueue() {
  const { data, error, isLoading, mutate } = useSWR<{ queue: AgentRun[] }>(
    '/api/v1/agents/queue',
    fetcher,
    { refreshInterval: 3000 },
  );
  return { queue: data?.queue ?? [], isLoading, error, refresh: mutate };
}

/** Single run detail — fetches result + artifacts */
export function useAgentRun(taskId: string | null) {
  const { data, error, isLoading } = useSWR<{ run: AgentRun }>(
    taskId ? `/api/v1/agents/${taskId}` : null,
    fetcher,
    { refreshInterval: 0 },
  );
  return { run: data?.run ?? null, isLoading, error };
}

/** Approve a gated action */
export async function approveAgentAction(taskId: string): Promise<void> {
  await apiClient.post(`/api/v1/agents/${taskId}/approve`, {});
}

/** Reject a gated action */
export async function rejectAgentAction(taskId: string): Promise<void> {
  await apiClient.post(`/api/v1/agents/${taskId}/reject`, {});
}

/** Trigger an agent run */
export async function triggerAgent(agentName: string, input: Record<string, unknown>): Promise<{ taskId: string }> {
  return apiClient.post(`/api/v1/agents/${agentName}/trigger`, { agentName, trigger: 'manual', input });
}
