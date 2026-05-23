/**
 * Plan service hooks — list, detail, act, plus an SSE-driven plan-event hook
 * for the bell badge and live timeline updates.
 *
 * Why a dedicated SSE hook (`usePlanStream`) and not a piggy-back on
 * `useEventStream`: the existing event stream is paged to the most recent
 * 50 events globally; plan UIs need every plan-shaped event since mount
 * (and filtered by `metadata.planId` for the detail page). The new hook
 * subscribes independently and exposes only plan events.
 */

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { apiClient, APIError } from '@/lib/api/client';
import type {
  PlanRow,
  PlanActionRow,
  PlanEventRow,
  PlanStatus,
} from '@/types/plans';
import type { InfraEvent } from '@/types/events';

// ─── REST hooks ───────────────────────────────────────────────────────

const fetcher = <T>(path: string): Promise<T> => apiClient.get<T>(path);

export interface PlanListResponse {
  plans: PlanRow[];
  limit: number;
  offset: number;
}

export interface UsePlansListOpts {
  /** Comma-separated string of statuses, or undefined for all. */
  status?: string;
  limit?: number;
  offset?: number;
}

/** List active plans. Polled every 10s as a fallback to SSE. */
export function usePlansList(opts: UsePlansListOpts = {}) {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  params.set('limit', String(opts.limit ?? 100));
  if (opts.offset) params.set('offset', String(opts.offset));

  const qs = params.toString();
  const key = `/api/v1/plans${qs ? `?${qs}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<PlanListResponse>(
    key,
    fetcher,
    { refreshInterval: 10000, revalidateOnFocus: true },
  );

  return {
    plans: data?.plans ?? [],
    limit: data?.limit ?? opts.limit ?? 100,
    offset: data?.offset ?? opts.offset ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

export interface PlanDetailResponse {
  plan: PlanRow;
  actions: PlanActionRow[];
  events: PlanEventRow[];
}

/** Single plan + actions + events. SWR key flips on planId so navigation refetches. */
export function usePlanDetail(planId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PlanDetailResponse>(
    planId ? `/api/v1/plans/${planId}` : null,
    fetcher,
    { refreshInterval: 0 },
  );
  return {
    plan: data?.plan ?? null,
    actions: data?.actions ?? [],
    events: data?.events ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// ─── Mutation: act on a plan ──────────────────────────────────────────

export type ActOnPlanResult =
  | { ok: true; action: PlanActionRow }
  | { ok: false; status: 404; reason: 'plan_not_found' | 'action_not_found' }
  | {
      ok: false;
      status: 409;
      reason: 'duplicate';
      currentStatus?: PlanStatus;
      previouslyActedBy?: string | null;
      previouslyActedAt?: string | null;
    }
  | {
      ok: false;
      status: 410;
      reason: 'plan_closed';
      currentStatus?: PlanStatus;
    }
  | { ok: false; status: number; reason: 'unknown'; message: string };

/**
 * POST /api/v1/plans/:id/actions/:actionId.
 *
 * Maps the backend's status-coded error envelope to a discriminated union
 * so the caller can render distinct messages without parsing strings.
 */
export async function actOnPlan(
  planId: string,
  actionId: string,
): Promise<ActOnPlanResult> {
  try {
    const result = await apiClient.post<{ ok: true; action: PlanActionRow }>(
      `/api/v1/plans/${planId}/actions/${actionId}`,
      {},
    );
    return result;
  } catch (err) {
    if (err instanceof APIError) {
      const body = (err.body ?? {}) as {
        error?: string;
        currentStatus?: PlanStatus;
        previouslyActedBy?: string | null;
        previouslyActedAt?: string | null;
      };
      if (err.status === 404) {
        return {
          ok: false,
          status: 404,
          reason: body.error?.includes('Action') ? 'action_not_found' : 'plan_not_found',
        };
      }
      if (err.status === 409) {
        return {
          ok: false,
          status: 409,
          reason: 'duplicate',
          currentStatus: body.currentStatus,
          previouslyActedBy: body.previouslyActedBy ?? null,
          previouslyActedAt: body.previouslyActedAt ?? null,
        };
      }
      if (err.status === 410) {
        return {
          ok: false,
          status: 410,
          reason: 'plan_closed',
          currentStatus: body.currentStatus,
        };
      }
      return {
        ok: false,
        status: err.status,
        reason: 'unknown',
        message: body.error ?? err.message,
      };
    }
    return {
      ok: false,
      status: 0,
      reason: 'unknown',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── SSE: plan-only event stream ──────────────────────────────────────

/**
 * Loose shape of plan events surfaced on /api/v1/events/stream by the
 * notifications router. The MC bell sink emits `type: 'plan.presented'`
 * with `metadata.planId` populated; future plan event types follow the
 * same shape.
 */
export interface PlanStreamEvent extends InfraEvent {
  type: string; // e.g. 'plan.presented'
  metadata?: {
    planId?: string;
    kind?: string;
    target?: string | null;
    mcUrl?: string;
    [k: string]: unknown;
  };
}

interface UsePlanStreamResult {
  /** All plan-shaped events since mount, newest first, capped at 200. */
  events: PlanStreamEvent[];
  /** EventSource connection state. */
  connected: boolean;
}

const MAX_PLAN_EVENTS = 200;

/**
 * Subscribe to /api/v1/events/stream and surface only plan-typed events
 * (anything with `type` starting `plan.`). Independent from `useEventStream`
 * so the global event widget and plan UIs don't fight for the same buffer.
 */
export function usePlanStream(): UsePlanStreamResult {
  const [events, setEvents] = useState<PlanStreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = apiClient.createEventSource('/api/v1/events/stream');
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!data || typeof data.type !== 'string') return;
        if (!data.type.startsWith('plan.')) return;
        setEvents((prev) => {
          const next = [data as PlanStreamEvent, ...prev];
          return next.length > MAX_PLAN_EVENTS ? next.slice(0, MAX_PLAN_EVENTS) : next;
        });
      } catch {
        // ignore unparseable frames
      }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects; flip connected back to true on next onopen
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, []);

  return { events, connected };
}
