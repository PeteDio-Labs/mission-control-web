/**
 * Roadmap hooks — list + detail + mutations against /api/v1/roadmap/tasks.
 *
 * Pattern mirrors usePlans.ts: SWR for read paths, raw apiClient for mutations.
 * No SSE — roadmap updates are sparse (human edits) so a 30s SWR refresh is
 * sufficient. Re-validate on focus so opening the tab feels fresh.
 */

import useSWR from 'swr';
import { apiClient } from '@/lib/api/client';
import type {
  RoadmapStatus,
  RoadmapTaskListResponse,
  RoadmapTaskDetailResponse,
  RoadmapTaskRow,
} from '@/types/roadmap';

const fetcher = <T>(path: string): Promise<T> => apiClient.get<T>(path);

// ─── Reads ────────────────────────────────────────────────────────────

export interface UseRoadmapListOpts {
  ws?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useRoadmapList(opts: UseRoadmapListOpts = {}) {
  const params = new URLSearchParams();
  if (opts.ws) params.set('ws', opts.ws);
  if (opts.status) params.set('status', opts.status);
  params.set('limit', String(opts.limit ?? 500));
  if (opts.offset) params.set('offset', String(opts.offset));

  const qs = params.toString();
  const key = `/api/v1/roadmap/tasks${qs ? `?${qs}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<RoadmapTaskListResponse>(
    key,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true },
  );

  return {
    tasks: data?.tasks ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useRoadmapDetail(taskId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RoadmapTaskDetailResponse>(
    taskId ? `/api/v1/roadmap/tasks/${taskId}` : null,
    fetcher,
    { refreshInterval: 0 },
  );
  return {
    task: data?.task ?? null,
    events: data?.events ?? [],
    linkedPlans: data?.linkedPlans ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// ─── Mutations ────────────────────────────────────────────────────────

export async function updateRoadmapStatus(
  taskId: string,
  toStatus: RoadmapStatus,
): Promise<RoadmapTaskRow> {
  const res = await apiClient.patch<{ task: RoadmapTaskRow }>(
    `/api/v1/roadmap/tasks/${taskId}/status`,
    { toStatus },
  );
  return res.task;
}

export async function appendRoadmapComment(
  taskId: string,
  text: string,
): Promise<void> {
  await apiClient.post(`/api/v1/roadmap/tasks/${taskId}/events`, {
    eventType: 'comment',
    detail: { text },
  });
}
