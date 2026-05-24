/**
 * Plans list page — `/plans`.
 *
 * The primary approval surface for Pete Bot v2. Lists active plans with
 * status-chip filters, click-through to the detail page, and live updates
 * via the plan SSE stream.
 *
 * Layout mirrors `Alerts.tsx`: header + filter chips + scrollable list of
 * cards. Status colors map onto severity (info/warn/error/critical) using
 * the same palette as alerts so the two pages feel like siblings.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Clock,
  Info,
  Loader2,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePlansList, usePlanStream } from '@/lib/hooks/usePlans';
import {
  ACTIVE_STATUSES,
  type PlanRow,
  type PlanSeverity,
  type PlanStatus,
} from '@/types/plans';

// ─── Visual tokens (match the alerts/events palette) ─────────────────

const severityStyles: Record<PlanSeverity, string> = {
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  warn: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  error: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const severityBorders: Record<PlanSeverity, string> = {
  info: 'border-l-blue-500',
  warn: 'border-l-yellow-500',
  error: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

const severityIcon: Record<PlanSeverity, typeof Info> = {
  info: Info,
  warn: AlertTriangle,
  error: AlertOctagon,
  critical: AlertOctagon,
};

const statusStyles: Record<PlanStatus, string> = {
  pending: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  presented: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  clicked: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  dispatched: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  stuck: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  succeeded: 'bg-green-500/20 text-green-300 border-green-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
  dismissed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  resolved: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const statusIcon: Partial<Record<PlanStatus, typeof Clock>> = {
  in_progress: Loader2,
  dispatched: Wrench,
  succeeded: CheckCircle,
  resolved: CheckCircle,
  failed: XCircle,
};

// ─── Filter definitions ──────────────────────────────────────────────

type FilterValue = 'all' | 'active' | PlanStatus;

interface FilterDef {
  value: FilterValue;
  label: string;
  /** Comma-joined statuses to send to the API. undefined = no filter. */
  statuses?: string;
}

const FILTERS: FilterDef[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active', statuses: ACTIVE_STATUSES.join(',') },
  { value: 'pending', label: 'Pending', statuses: 'pending' },
  { value: 'presented', label: 'Presented', statuses: 'presented' },
  { value: 'clicked', label: 'Clicked', statuses: 'clicked' },
  { value: 'dispatched', label: 'Dispatched', statuses: 'dispatched' },
  { value: 'in_progress', label: 'In progress', statuses: 'in_progress' },
  { value: 'stuck', label: 'Stuck', statuses: 'stuck' },
  { value: 'succeeded', label: 'Done', statuses: 'succeeded,resolved' },
  { value: 'dismissed', label: 'Dismissed', statuses: 'dismissed' },
  { value: 'expired', label: 'Expired', statuses: 'expired' },
];

const PAGE_SIZE = 50;

// ─── Plan row card ───────────────────────────────────────────────────

function PlanRowCard({ plan }: { plan: PlanRow }) {
  const Sev = severityIcon[plan.severity];
  const StatusI = statusIcon[plan.status] ?? Clock;
  const age = formatDistanceToNow(new Date(plan.created_at), { addSuffix: true });
  const isRunning = plan.status === 'in_progress';

  // The /:id detail page uses GET /plans/:id, which loads actions too.
  // We don't have action_count on the list response yet, so we omit it — the
  // detail page is one click away. (Backend list returns plan rows only.)
  return (
    <Link to={`/plans/${plan.id}`} className="block">
      <Card
        className={cn(
          'border-l-4 border-white/10 hover:border-white/20 transition-all duration-200 bg-gradient-to-br from-white/5 to-transparent cursor-pointer',
          severityBorders[plan.severity],
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] mt-0.5">
              <Sev className="h-4 w-4 text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={cn('text-[10px] px-1.5 py-0', severityStyles[plan.severity])}>
                  {plan.severity}
                </Badge>
                <Badge className={cn('text-[10px] px-1.5 py-0 inline-flex items-center gap-1', statusStyles[plan.status])}>
                  <StatusI className={cn('h-2.5 w-2.5', isRunning && 'animate-spin')} />
                  {plan.status.replace('_', ' ')}
                </Badge>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {plan.kind.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-gray-600">via {plan.source}</span>
              </div>
              <p className="text-sm text-gray-200 leading-snug line-clamp-2">{plan.summary}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-[11px] text-gray-500">{age}</span>
                {plan.target && (
                  <span className="text-[11px] text-gray-500 font-mono truncate max-w-[40ch]">
                    target: {plan.target}
                  </span>
                )}
                <span className="text-[11px] text-gray-600 font-mono">{plan.id}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function PlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter is derived from the `status` query param if present (so the bell
  // can link to /plans?status=presented,...). Otherwise default to 'active'.
  const statusParam = searchParams.get('status') ?? undefined;
  const initialFilter: FilterValue = useMemo(() => {
    if (!statusParam) return 'active';
    const exact = FILTERS.find((f) => f.statuses === statusParam);
    if (exact) return exact.value;
    // Match the bell's exact join
    if (statusParam === ACTIVE_STATUSES.join(',')) return 'active';
    return 'all';
  }, [statusParam]);

  const [filter, setFilter] = useState<FilterValue>(initialFilter);
  const [offset, setOffset] = useState(0);

  // Reset offset when filter changes
  useEffect(() => {
    setOffset(0);
  }, [filter]);

  const def = FILTERS.find((f) => f.value === filter) ?? FILTERS[0]!;
  const { plans, isLoading, refresh } = usePlansList({
    status: def.statuses,
    limit: PAGE_SIZE,
    offset,
  });

  // Live: refresh the list whenever any plan SSE event lands.
  const { events: planEvents, connected } = usePlanStream();
  useEffect(() => {
    if (planEvents.length > 0) {
      refresh();
    }
    // Intentionally only depending on .length — full event list churns
    // every SSE tick; we just care that something changed.
  }, [planEvents.length]);

  function selectFilter(next: FilterValue) {
    setFilter(next);
    const target = FILTERS.find((f) => f.value === next);
    if (target?.statuses) {
      setSearchParams({ status: target.statuses }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-blue-400" />
            Plans
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Approval surface for Pete Bot v2 — review, approve, dismiss
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75',
                connected ? 'bg-green-500 animate-ping' : 'bg-gray-500',
              )}
            />
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full shadow-lg',
                connected ? 'bg-green-500 shadow-green-500/50' : 'bg-gray-500 shadow-gray-500/50',
              )}
            />
          </span>
          <span className="text-xs text-gray-500">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => selectFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading && plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-primary" />
          <p className="mt-3 text-sm text-gray-500">Loading plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="h-10 w-10 text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">No plans match.</p>
          <p className="text-xs text-gray-600 mt-1">New plans appear here automatically.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => (
            <PlanRowCard key={p.id} plan={p} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(plans.length === PAGE_SIZE || offset > 0) && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Previous
          </Button>
          <span className="text-xs text-gray-500">
            Showing {offset + 1}–{offset + plans.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2.5"
            disabled={plans.length < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

    </div>
  );
}
