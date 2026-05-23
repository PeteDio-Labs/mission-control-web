/**
 * Plan detail page — `/plans/:id`.
 *
 * Shows everything about a single plan: header, action buttons, proposed_fix
 * details, and a live event timeline. Subscribes to the plan SSE stream and
 * appends events matching this plan's id; refetches the plan when a state
 * change comes through.
 *
 * Optimistic updates: clicking an action button immediately disables it and
 * shows a toast on the result. On 200 we trigger a refresh so the timeline
 * + status pick up the new `clicked` event. On 409 we surface who acted
 * first; on 410 we surface "already closed".
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
  Send,
  PlayCircle,
  Ban,
  CircleSlash,
  Wrench,
  RefreshCw,
  MessageSquare,
  Hash,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  usePlanDetail,
  usePlanStream,
  actOnPlan,
  type ActOnPlanResult,
} from '@/lib/hooks/usePlans';
import type {
  PlanActionRow,
  PlanButtonStyle,
  PlanEventRow,
  PlanEventType,
  PlanSeverity,
  PlanStatus,
} from '@/types/plans';

// ─── Visual tokens (kept aligned with Plans.tsx) ─────────────────────

const severityStyles: Record<PlanSeverity, string> = {
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  warn: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  error: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
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

const eventIcon: Record<PlanEventType, typeof Clock> = {
  created: Hash,
  presented: Send,
  clicked: PlayCircle,
  dispatched: Wrench,
  state_change: RefreshCw,
  agent_progress: Loader2,
  succeeded: CheckCircle,
  failed: XCircle,
  stuck: AlertTriangle,
  dismissed: Ban,
  expired: CircleSlash,
  resolved: CheckCircle,
  comment: MessageSquare,
  duplicate_click: AlertTriangle,
};

const eventColor: Record<PlanEventType, string> = {
  created: 'text-gray-400',
  presented: 'text-blue-400',
  clicked: 'text-indigo-400',
  dispatched: 'text-cyan-400',
  state_change: 'text-gray-400',
  agent_progress: 'text-blue-400',
  succeeded: 'text-green-400',
  failed: 'text-red-400',
  stuck: 'text-yellow-400',
  dismissed: 'text-gray-500',
  expired: 'text-gray-500',
  resolved: 'text-green-400',
  comment: 'text-gray-400',
  duplicate_click: 'text-yellow-400',
};

// Button-style mapping for plan actions. `style` on the backend is one of
// 'primary' | 'secondary' | 'danger' | 'link' — translate to our existing
// shadcn Button variants.
const actionVariant: Record<PlanButtonStyle, 'default' | 'outline' | 'destructive' | 'link'> = {
  primary: 'default',
  secondary: 'outline',
  danger: 'destructive',
  link: 'link',
};

// ─── Toast ────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  tone: 'success' | 'error' | 'warn';
  message: string;
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'px-4 py-2.5 rounded-lg shadow-2xl text-sm border backdrop-blur-xl animate-in slide-in-from-bottom-2',
            t.tone === 'success' && 'bg-green-500/15 border-green-500/30 text-green-200',
            t.tone === 'error' && 'bg-red-500/15 border-red-500/30 text-red-200',
            t.tone === 'warn' && 'bg-yellow-500/15 border-yellow-500/30 text-yellow-200',
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  function push(tone: Toast['tone'], message: string) {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }

  return { toasts, push };
}

// ─── Action buttons ──────────────────────────────────────────────────

function ActionBar({
  planId,
  actions,
  onActed,
  onResult,
  disabled,
}: {
  planId: string;
  actions: PlanActionRow[];
  onActed: () => void;
  onResult: (r: ActOnPlanResult, action: PlanActionRow) => void;
  disabled: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const sorted = [...actions].sort((a, b) => a.ordering - b.ordering);

  async function click(action: PlanActionRow) {
    setBusyId(action.action_id);
    try {
      const result = await actOnPlan(planId, action.action_id);
      onResult(result, action);
      if (result.ok) {
        onActed();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map((a) => {
        const acted = !!a.acted_at;
        const variant = actionVariant[a.style] ?? 'default';
        const isBusy = busyId === a.action_id;
        return (
          <Button
            key={a.action_id}
            variant={variant}
            size="sm"
            disabled={acted || disabled || isBusy}
            onClick={() => click(a)}
            className={cn(acted && 'opacity-60')}
            title={
              acted
                ? `Already acted by ${a.acted_by_user ?? 'someone'} at ${a.acted_at}`
                : undefined
            }
          >
            {isBusy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {acted && <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
            {a.label}
          </Button>
        );
      })}
    </div>
  );
}

// ─── Proposed fix block ──────────────────────────────────────────────

function ProposedFixCard({ fix }: { fix: NonNullable<ReturnType<typeof usePlanDetail>['plan']>['proposed_fix'] }) {
  const [expanded, setExpanded] = useState(false);
  if (!fix) return null;

  return (
    <Card className="border border-white/[0.08]">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider text-gray-600">Proposed fix</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{fix.agent}</Badge>
        </div>
        <p className="text-sm text-gray-200">{fix.task}</p>
        {fix.input && Object.keys(fix.input).length > 0 && (
          <div>
            <button
              onClick={() => setExpanded((x) => !x)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Hide input' : 'Show input'}
            </button>
            {expanded && (
              <pre className="mt-2 text-xs text-gray-400 bg-black/30 rounded p-2 overflow-auto max-h-60 whitespace-pre-wrap font-mono leading-relaxed">
                {JSON.stringify(fix.input, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Event timeline ──────────────────────────────────────────────────

function TimelineRow({ event }: { event: PlanEventRow }) {
  const Icon = eventIcon[event.event_type] ?? Clock;
  const color = eventColor[event.event_type] ?? 'text-gray-400';
  const when = format(new Date(event.occurred_at), 'MMM d, HH:mm:ss');

  // Pull the most relevant detail to surface inline. The backend writes a
  // freeform `detail` JSONB; common keys we render specially are message,
  // step, error, currentStatus.
  const detail = event.detail ?? {};
  const inlineDetail =
    (typeof detail.message === 'string' && detail.message) ||
    (typeof detail.step === 'string' && detail.step) ||
    (typeof detail.error === 'string' && detail.error) ||
    null;

  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', color, event.event_type === 'agent_progress' && 'animate-spin')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-300">{event.event_type.replace(/_/g, ' ')}</span>
          {event.from_status && event.to_status && (
            <span className="text-[10px] text-gray-600">
              {event.from_status} → {event.to_status}
            </span>
          )}
          {event.actor_user_id && (
            <span className="text-[10px] text-gray-500">by {event.actor_user_id}</span>
          )}
          {event.actor_source && (
            <span className="text-[10px] text-gray-600">via {event.actor_source}</span>
          )}
        </div>
        {inlineDetail && (
          <p className="text-xs text-gray-400 mt-0.5 break-words">{inlineDetail}</p>
        )}
      </div>
      <span className="text-[10px] text-gray-600 shrink-0 whitespace-nowrap">{when}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const planId = id ?? null;
  const { plan, actions, events, isLoading, error, refresh } = usePlanDetail(planId);
  const { events: streamEvents } = usePlanStream();
  const { toasts, push } = useToasts();
  const timelineEndRef = useRef<HTMLDivElement | null>(null);

  // Merge live events for this plan into the timeline. Backend writes the
  // canonical event row when the SSE fires, so a refetch picks it up; we
  // also append the SSE-emitted event eagerly so the UI feels instant.
  const liveForThisPlan = useMemo(() => {
    if (!planId) return [];
    return streamEvents.filter((e) => e.metadata?.planId === planId);
  }, [streamEvents, planId]);

  // Trigger refresh whenever a relevant SSE event arrives.
  useEffect(() => {
    if (liveForThisPlan.length > 0) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveForThisPlan.length]);

  // Auto-scroll the timeline when new events land.
  const eventsLen = events.length;
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [eventsLen]);

  if (!planId) {
    return (
      <article className="space-y-4">
        <p className="text-sm text-red-400">Missing plan id.</p>
      </article>
    );
  }

  if (error) {
    return (
      <article className="space-y-4">
        <BackLink />
        <Card className="border border-red-500/30">
          <CardContent className="p-4 text-sm text-red-300">
            Failed to load plan: {error instanceof Error ? error.message : String(error)}
          </CardContent>
        </Card>
      </article>
    );
  }

  if (isLoading && !plan) {
    return (
      <article className="space-y-4">
        <BackLink />
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading plan...
        </div>
      </article>
    );
  }

  if (!plan) {
    return (
      <article className="space-y-4">
        <BackLink />
        <p className="text-sm text-gray-500">Plan not found.</p>
      </article>
    );
  }

  const Sev = severityIcon[plan.severity];
  const ordered = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );
  const isClosed = ['succeeded', 'failed', 'dismissed', 'expired', 'resolved'].includes(plan.status);

  function handleResult(result: ActOnPlanResult, action: PlanActionRow) {
    if (result.ok) {
      push('success', `Action "${action.label}" recorded.`);
    } else if (result.reason === 'duplicate') {
      const who = result.previouslyActedBy ?? 'someone';
      push('warn', `Already acted by ${who}.`);
      refresh();
    } else if (result.reason === 'plan_closed') {
      push('warn', `Plan already closed (${result.currentStatus ?? 'closed'}).`);
      refresh();
    } else if (result.reason === 'plan_not_found' || result.reason === 'action_not_found') {
      push('error', 'Not found — refreshing...');
      refresh();
    } else if (result.reason === 'unknown') {
      push('error', `Failed: ${result.message}`);
    } else {
      push('error', 'Action failed.');
    }
  }

  return (
    <article className="space-y-6 max-w-5xl">
      <BackLink />

      {/* Header card */}
      <Card className="border border-white/[0.08] bg-gradient-to-br from-white/5 to-transparent">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] mt-0.5">
              <Sev className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge className={cn('text-[10px] px-1.5 py-0', severityStyles[plan.severity])}>
                  {plan.severity}
                </Badge>
                <Badge className={cn('text-[10px] px-1.5 py-0', statusStyles[plan.status])}>
                  {plan.status.replace('_', ' ')}
                </Badge>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                  {plan.kind.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-gray-600">source: {plan.source}</span>
              </div>
              <h1 className="text-lg font-semibold text-white leading-tight">{plan.summary}</h1>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {plan.target && (
                  <span className="text-xs text-gray-500 font-mono">target: {plan.target}</span>
                )}
                <span className="text-xs text-gray-600 font-mono">{plan.id}</span>
                <span className="text-xs text-gray-500">
                  created {formatDistanceToNow(new Date(plan.created_at), { addSuffix: true })}
                </span>
                {plan.expires_at && !isClosed && (
                  <span className="text-xs text-gray-500">
                    expires {formatDistanceToNow(new Date(plan.expires_at), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action bar */}
          {actions.length > 0 && (
            <ActionBar
              planId={plan.id}
              actions={actions}
              onActed={() => refresh()}
              onResult={handleResult}
              disabled={isClosed}
            />
          )}

          {/* Error summary if failed */}
          {plan.error_summary && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded p-2.5 font-mono whitespace-pre-wrap">
              {plan.error_summary}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column layout: timeline + sidebar */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-600">Event timeline</p>
          <Card className="border border-white/[0.08]">
            <CardContent className="p-4">
              {ordered.length === 0 ? (
                <p className="text-sm text-gray-500">No events recorded yet.</p>
              ) : (
                <div>
                  {ordered.map((e) => (
                    <TimelineRow key={e.id} event={e} />
                  ))}
                  <div ref={timelineEndRef} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-600">Proposed fix</p>
          {plan.proposed_fix ? (
            <ProposedFixCard fix={plan.proposed_fix} />
          ) : (
            <Card className="border border-white/[0.08]">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">No proposed fix attached.</p>
              </CardContent>
            </Card>
          )}

          {plan.proposals && plan.proposals.length > 0 && (
            <>
              <p className="text-[10px] uppercase tracking-wider text-gray-600 pt-2">Stuck proposals</p>
              <Card className="border border-yellow-500/20">
                <CardContent className="p-4 space-y-2">
                  {plan.proposals.map((p, i) => (
                    <div key={i} className="text-sm text-gray-300">
                      <p>{p.label}</p>
                      {p.task && <p className="text-xs text-gray-500 font-mono">{p.task}</p>}
                      {p.mcUrl && (
                        <a
                          href={p.mcUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          Open ↗
                        </a>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </article>
  );
}

function BackLink() {
  return (
    <Link
      to="/plans"
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to plans
    </Link>
  );
}
