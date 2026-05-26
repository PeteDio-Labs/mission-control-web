/**
 * Roadmap list page — `/roadmap`.
 *
 * The MC-managed kanban (Master Plan workstream items). Sibling to /plans:
 * /plans surfaces short-lived runtime approvals; /roadmap surfaces long-lived
 * project work.
 *
 * v0 layout: flat sortable table with chips for workstream + status. v1
 * (follow-up) will add a board view. Most users want "what's in progress
 * across PB" or "what RETRO items are still open" — the table covers both
 * cheaply.
 *
 * Vocabulary (planning/MIGRATE-KANBAN-TO-MC.md): each row here is a Roadmap
 * Task. Click → /roadmap/:id for description + events + linked Runtime Plans.
 */

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, Map as MapIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useRoadmapList } from '@/lib/hooks/useRoadmap';
import {
  ROADMAP_STATUSES,
  WS_NAMES,
  type RoadmapStatus,
  type RoadmapTaskRow,
  type WSId,
} from '@/types/roadmap';

// ─── Visual tokens ────────────────────────────────────────────────────

const statusStyles: Record<RoadmapStatus, string> = {
  backlog: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  blocked: 'bg-red-500/20 text-red-300 border-red-500/30',
  'awaiting-user': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  done: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const statusLeftBorder: Record<RoadmapStatus, string> = {
  backlog: 'border-l-gray-500',
  'in-progress': 'border-l-blue-500',
  blocked: 'border-l-red-500',
  'awaiting-user': 'border-l-yellow-500',
  done: 'border-l-green-600',
};

const WS_IDS: WSId[] = Object.keys(WS_NAMES) as WSId[];

// ─── Row card ─────────────────────────────────────────────────────────

function TaskRowCard({ task }: { task: RoadmapTaskRow }) {
  const age = formatDistanceToNow(new Date(task.updated_at), { addSuffix: true });
  const wsLabel = WS_NAMES[task.ws as WSId] ?? task.ws;

  return (
    <Link to={`/roadmap/${task.id}`} className="block">
      <Card
        className={cn(
          'border-l-4 border-white/10 hover:border-white/20 transition-all duration-200 bg-gradient-to-br from-white/5 to-transparent cursor-pointer',
          statusLeftBorder[task.status],
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-mono text-gray-500 shrink-0 mt-0.5 w-20 truncate">
              {task.id}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={cn('text-[10px] px-1.5 py-0', statusStyles[task.status])}>
                  {task.status}
                </Badge>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider truncate max-w-[24ch]">
                  {wsLabel}
                </span>
                {task.effort && (
                  <span className="text-[10px] text-gray-600 font-mono">{task.effort}</span>
                )}
              </div>
              <p className="text-sm text-gray-200 leading-snug line-clamp-2">{task.title}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-[11px] text-gray-500">updated {age}</span>
                {task.depends_on.length > 0 && (
                  <span className="text-[11px] text-gray-500">
                    deps: {task.depends_on.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const wsParam = searchParams.get('ws') ?? 'all';
  const statusParam = searchParams.get('status') ?? 'all';

  const [ws, setWs] = useState<string>(wsParam);
  const [status, setStatus] = useState<string>(statusParam);

  const { tasks, isLoading } = useRoadmapList({
    ws: ws === 'all' ? undefined : ws,
    status: status === 'all' ? undefined : status,
    limit: 500,
  });

  // Stats per status across the (filtered-by-ws) result set so the chips can
  // show counts without a second round-trip.
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: tasks.length };
    for (const s of ROADMAP_STATUSES) out[s] = 0;
    for (const t of tasks) out[t.status] = (out[t.status] ?? 0) + 1;
    return out;
  }, [tasks]);

  function setWsFilter(next: string) {
    setWs(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('ws');
    else params.set('ws', next);
    setSearchParams(params, { replace: true });
  }

  function setStatusFilter(next: string) {
    setStatus(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    setSearchParams(params, { replace: true });
  }

  // The roadmap list endpoint already filters by status server-side via the
  // `status` query param — but counts come from the full ws-filtered set, so
  // pass status separately to the hook and recompute counts.
  // (The hook is called once above with both filters; the chip count for
  // statuses is computed from `tasks` post-status-filter, which is fine for
  // showing "X visible" but not "X in backlog" overall. For the latter, run
  // a second unfiltered fetch if it becomes important. For v0, the in-view
  // count is good enough.)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-blue-400" />
            Roadmap
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Master Plan items — the kanban that used to live in <code>planning/master-plan-kanban.html</code>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapIcon className="h-3.5 w-3.5" />
          {tasks.length} task{tasks.length === 1 ? '' : 's'} visible
        </div>
      </div>

      {/* Workstream chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <div className="flex flex-wrap gap-1">
          <Button
            variant={ws === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setWsFilter('all')}
          >
            All
          </Button>
          {WS_IDS.map((id) => (
            <Button
              key={id}
              variant={ws === id ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setWsFilter(id)}
              title={WS_NAMES[id]}
            >
              {id}
            </Button>
          ))}
        </div>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 mr-2">
          Status
        </span>
        <div className="flex flex-wrap gap-1">
          <Button
            variant={status === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs px-2.5"
            onClick={() => setStatusFilter('all')}
          >
            All <span className="ml-1 text-gray-500">({counts.all})</span>
          </Button>
          {ROADMAP_STATUSES.map((s) => (
            <Button
              key={s}
              variant={status === s ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setStatusFilter(s)}
            >
              {s}
              <span className="ml-1 text-gray-500">({counts[s] ?? 0})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading && tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-primary" />
          <p className="mt-3 text-sm text-gray-500">Loading roadmap…</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MapIcon className="h-10 w-10 text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">No tasks match these filters.</p>
          <p className="text-xs text-gray-600 mt-1">
            Import from the static kanban with{' '}
            <code>bun run scripts/import-roadmap-from-ts.ts</code>
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <TaskRowCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
