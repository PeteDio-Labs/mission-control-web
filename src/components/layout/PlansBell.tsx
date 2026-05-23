/**
 * PlansBell — header bell icon showing the count of active plans.
 *
 * Data sources:
 *   - Authoritative count via GET /api/v1/plans?status=<bell statuses>&limit=1.
 *     We only need `plans.length`, so we cap the fetch at limit=100 (it's the
 *     same payload size as the list page when active count is < 100).
 *   - SWR refresh every 60s as a fallback.
 *   - SSE: any 'plan.*' event triggers an immediate revalidate. This handles
 *     both "new plan presented" (counter goes up) and "plan dispatched →
 *     succeeded" (counter goes down) without depending on event type strings
 *     we'd have to keep in sync with the backend.
 *
 * Click → /plans?status=<bell statuses>. The list page picks up the param
 * and maps it back to the "Active" chip.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import { Bell } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { usePlanStream } from '@/lib/hooks/usePlans';
import { BELL_STATUSES, type PlanRow } from '@/types/plans';
import { cn } from '@/lib/utils';

const BELL_STATUS_PARAM = BELL_STATUSES.join(',');
const BELL_PATH = `/api/v1/plans?status=${encodeURIComponent(BELL_STATUS_PARAM)}&limit=100`;

const fetcher = (path: string) => apiClient.get<{ plans: PlanRow[] }>(path);

export function PlansBell() {
  const { data, mutate } = useSWR(BELL_PATH, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });
  const { events } = usePlanStream();

  // Any plan-shaped SSE event → revalidate to pick up the new count.
  // Using events.length keeps this cheap; we don't care about the events
  // themselves, only that something changed.
  useEffect(() => {
    if (events.length > 0) {
      mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  const count = data?.plans.length ?? 0;
  const hasActive = count > 0;
  const linkTarget = `/plans?status=${encodeURIComponent(BELL_STATUS_PARAM)}`;

  return (
    <Link
      to={linkTarget}
      title={hasActive ? `${count} active plan${count === 1 ? '' : 's'}` : 'No active plans'}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
        'text-gray-400 hover:text-white hover:bg-white/[0.06]',
      )}
    >
      <Bell className="h-4 w-4" />
      {hasActive && (
        <>
          {/* Red dot indicator */}
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
          </span>
          {/* Count badge — only when more than 1, otherwise the dot is enough */}
          {count > 1 && (
            <span className="absolute -top-0.5 -right-1 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
