/**
 * Roadmap Task detail page — `/roadmap/:id`.
 *
 * Description + events timeline + status dropdown + comment box + linked
 * Runtime Plans tab. The history view for a Master Plan item.
 *
 * Linked plans come from /api/v1/roadmap/tasks/:id which joins plans WHERE
 * roadmap_task_id = :id. The column is added in migration 008; until then
 * linkedPlans is an empty array (the backend defensively returns []).
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Hash,
  MessageSquare,
  RefreshCw,
  Send,
  Activity,
  CheckCircle,
  Loader2,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useRoadmapDetail,
  updateRoadmapStatus,
  appendRoadmapComment,
} from '@/lib/hooks/useRoadmap';
import {
  ROADMAP_STATUSES,
  WS_NAMES,
  type RoadmapStatus,
  type RoadmapTaskEventRow,
  type RoadmapEventType,
  type WSId,
  type LinkedPlanRow,
} from '@/types/roadmap';

// ─── Visual tokens ────────────────────────────────────────────────────

const statusStyles: Record<RoadmapStatus, string> = {
  backlog: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  blocked: 'bg-red-500/20 text-red-300 border-red-500/30',
  'awaiting-user': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  done: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const eventIcon: Record<RoadmapEventType, typeof Clock> = {
  created: Hash,
  status_change: RefreshCw,
  updated: RefreshCw,
  comment: MessageSquare,
  plan_linked: LinkIcon,
};

// ─── Event row ────────────────────────────────────────────────────────

function EventRow({ event }: { event: RoadmapTaskEventRow }) {
  const Icon = eventIcon[event.event_type] ?? Clock;
  const when = format(new Date(event.created_at), 'MMM d HH:mm');
  const commentText =
    event.event_type === 'comment' && typeof event.detail?.text === 'string'
      ? (event.detail.text as string)
      : null;

  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <Icon className="h-3.5 w-3.5 text-gray-500 mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-300">{event.event_type.replace('_', ' ')}</span>
          {event.from_status && event.to_status && (
            <span className="text-[10px] text-gray-500 font-mono">
              {event.from_status} → {event.to_status}
            </span>
          )}
          {event.actor && (
            <span className="text-[10px] text-gray-500">by {event.actor}</span>
          )}
          <span className="text-[10px] text-gray-600 ml-auto">{when}</span>
        </div>
        {commentText && (
          <p className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{commentText}</p>
        )}
      </div>
    </div>
  );
}

// ─── Linked plan row ──────────────────────────────────────────────────

function LinkedPlanRowCard({ plan }: { plan: LinkedPlanRow }) {
  const age = formatDistanceToNow(new Date(plan.created_at), { addSuffix: true });
  return (
    <Link to={`/plans/${plan.id}`} className="block">
      <Card className="border-white/10 hover:border-white/20 transition-all bg-white/[0.03]">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-300 border-blue-500/30">
              {plan.status}
            </Badge>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              {plan.kind.replace('_', ' ')}
            </span>
            <span className="text-[10px] text-gray-600">{plan.severity}</span>
            <span className="text-[10px] text-gray-500 ml-auto font-mono">{plan.id}</span>
          </div>
          <p className="text-xs text-gray-300 leading-snug line-clamp-2">{plan.summary}</p>
          <p className="text-[10px] text-gray-600 mt-1">{age}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function RoadmapDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { task, events, linkedPlans, isLoading, refresh } = useRoadmapDetail(id ?? null);

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(next: RoadmapStatus) {
    if (!task || next === task.status) return;
    setStatusBusy(true);
    setError(null);
    try {
      await updateRoadmapStatus(task.id, next);
      await refresh();
    } catch (err) {
      setError(`Status update failed: ${(err as Error).message}`);
    } finally {
      setStatusBusy(false);
    }
  }

  async function handleAddComment() {
    if (!task || !commentText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await appendRoadmapComment(task.id, commentText.trim());
      setCommentText('');
      await refresh();
    } catch (err) {
      setError(`Comment failed: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading && !task) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        <p className="mt-3 text-sm text-gray-500">Loading task…</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <Link to="/roadmap" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
          <ArrowLeft className="h-3.5 w-3.5" /> back to roadmap
        </Link>
        <p className="text-sm text-gray-500">Task not found.</p>
      </div>
    );
  }

  const wsLabel = WS_NAMES[task.ws as WSId] ?? task.ws;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/roadmap" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft className="h-3.5 w-3.5" /> back to roadmap
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className="text-sm font-mono text-gray-500">{task.id}</span>
          <Badge className={cn('text-xs px-2 py-0.5', statusStyles[task.status])}>
            {task.status}
          </Badge>
          <span className="text-xs text-gray-500 uppercase tracking-wider">{wsLabel}</span>
          {task.effort && (
            <span className="text-xs text-gray-600 font-mono">effort: {task.effort}</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-white">{task.title}</h1>
      </div>

      {/* Status selector */}
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 mb-2">
            Status
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ROADMAP_STATUSES.map((s) => (
              <Button
                key={s}
                variant={task.status === s ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                disabled={statusBusy || task.status === s}
                onClick={() => handleStatusChange(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </CardContent>
      </Card>

      {/* Description */}
      {task.description && (
        <Card className="border-white/10 bg-white/[0.02]">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 mb-2">
              Description
            </p>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {task.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dependencies */}
      {task.depends_on.length > 0 && (
        <Card className="border-white/10 bg-white/[0.02]">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 mb-2">
              Depends on
            </p>
            <div className="flex flex-wrap gap-1.5">
              {task.depends_on.map((dep) => (
                <Link
                  key={dep}
                  to={`/roadmap/${dep}`}
                  className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-gray-300"
                >
                  {dep}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked plans */}
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 mb-2 flex items-center gap-1.5">
            <LinkIcon className="h-3 w-3" /> Linked Runtime Plans
          </p>
          {linkedPlans.length === 0 ? (
            <p className="text-xs text-gray-500">
              No plans linked yet. Agents that propose fixes against this task will appear here.
            </p>
          ) : (
            <div className="space-y-1.5">
              {linkedPlans.map((p) => (
                <LinkedPlanRowCard key={p.id} plan={p} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add comment */}
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 mb-2">
            Add comment
          </p>
          <textarea
            className="w-full bg-black/30 border border-white/10 rounded-md p-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-white/20 resize-y min-h-[80px]"
            placeholder="Note something for the timeline…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            disabled={submitting}
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              disabled={submitting || !commentText.trim()}
              onClick={handleAddComment}
            >
              <Send className="h-3 w-3 mr-1.5" />
              {submitting ? 'Posting…' : 'Post comment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events timeline */}
      <Card className="border-white/10 bg-white/[0.02]">
        <CardContent className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600 mb-2 flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Timeline
          </p>
          {events.length === 0 ? (
            <p className="text-xs text-gray-500">No events yet.</p>
          ) : (
            <div className="space-y-0">
              {events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer meta */}
      <div className="flex items-center gap-4 text-[11px] text-gray-600 pt-2">
        <span className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Created {format(new Date(task.created_at), 'MMM d yyyy HH:mm')}
        </span>
        <span className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Updated {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
