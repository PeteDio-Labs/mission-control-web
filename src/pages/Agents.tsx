import { useState } from 'react';
import { Bot, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useAgents,
  useAgentHistory,
  approveAgentAction,
  rejectAgentAction,
  type AgentRun,
} from '@/lib/hooks/useAgents';

// ─── Status styling ───────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; icon: typeof Bot }> = {
  running:          { label: 'Running',          color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',    icon: RefreshCw },
  waiting_approval: { label: 'Needs Approval',   color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: AlertTriangle },
  complete:         { label: 'Complete',          color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle },
  failed:           { label: 'Failed',            color: 'bg-red-500/20 text-red-300 border-red-500/30',       icon: XCircle },
};

// ─── Approval Card ────────────────────────────────────────────────

function ApprovalCard({ run, onResolved }: { run: AgentRun; onResolved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const action = run.pending_approval!;

  async function handleApprove() {
    setBusy(true);
    try { await approveAgentAction(run.task_id); onResolved(); }
    finally { setBusy(false); }
  }
  async function handleReject() {
    setBusy(true);
    try { await rejectAgentAction(run.task_id); onResolved(); }
    finally { setBusy(false); }
  }

  return (
    <Card className="border border-yellow-500/40 bg-yellow-500/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-white text-sm">{run.agent_name}</span>
              <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                Needs Approval
              </Badge>
              <span className="text-xs text-gray-500 ml-auto">
                {formatDistanceToNow(new Date(run.updated_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-gray-300 mb-1">
              <span className="text-gray-500 text-xs uppercase tracking-wider mr-2">{action.actionType}</span>
              {action.description}
            </p>
            {action.preview && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {expanded ? 'Hide preview' : 'Show preview'}
                </button>
                {expanded && (
                  <pre className="mt-2 text-xs text-gray-400 bg-black/30 rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap">
                    {action.preview}
                  </pre>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={busy}
                className="bg-green-600 hover:bg-green-500 text-white h-7 px-3 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                disabled={busy}
                className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-7 px-3 text-xs"
              >
                <XCircle className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Agent Status Card ────────────────────────────────────────────

function AgentStatusCard({ run }: { run: AgentRun }) {
  const cfg = statusConfig[run.status] ?? statusConfig.failed!;
  const Icon = cfg.icon;
  return (
    <Card className="border border-white/[0.08] bg-gradient-to-br from-white/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Bot className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm truncate">{run.agent_name}</span>
              <Badge className={cn('text-[10px] px-1.5 py-0', cfg.color)}>
                <Icon className="h-2.5 w-2.5 mr-1 inline" />
                {cfg.label}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {run.summary ?? `Trigger: ${run.trigger}`}
            </p>
          </div>
          <span className="text-xs text-gray-600 shrink-0">
            {formatDistanceToNow(new Date(run.updated_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Run History Row ──────────────────────────────────────────────

function RunRow({ run }: { run: AgentRun }) {
  const cfg = statusConfig[run.status] ?? statusConfig.failed!;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', {
        'text-blue-400': run.status === 'running',
        'text-yellow-400': run.status === 'waiting_approval',
        'text-green-400': run.status === 'complete',
        'text-red-400': run.status === 'failed',
      })} />
      <span className="text-sm text-gray-300 w-36 shrink-0 truncate">{run.agent_name}</span>
      <span className="text-xs text-gray-500 w-24 shrink-0 capitalize">{run.trigger}</span>
      <span className="text-xs text-gray-400 flex-1 truncate">{run.summary ?? '—'}</span>
      {run.duration_ms && (
        <span className="text-xs text-gray-600 w-16 text-right shrink-0">
          {(run.duration_ms / 1000).toFixed(1)}s
        </span>
      )}
      <span className="text-xs text-gray-600 w-32 text-right shrink-0">
        {format(new Date(run.created_at), 'MMM d, HH:mm')}
      </span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { agents, isLoading: agentsLoading, refresh: refreshAgents } = useAgents();
  const { runs, isLoading: historyLoading, refresh: refreshHistory } = useAgentHistory({ limit: 50 });

  const pendingApprovals = agents.filter(a => a.status === 'waiting_approval');

  function handleResolved() {
    refreshAgents();
    refreshHistory();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Agent platform status, run history, and approval queue</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => { refreshAgents(); refreshHistory(); }}
          className="border-white/10 text-gray-400 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Approval Queue */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Approval Queue ({pendingApprovals.length})
          </h2>
          {pendingApprovals.map(run => (
            <ApprovalCard key={run.task_id} run={run} onResolved={handleResolved} />
          ))}
        </div>
      )}

      {/* Live Status Panel */}
      <Card className="border border-white/[0.08]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Bot className="h-4 w-4 text-blue-400" />
            Live Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {agentsLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : agents.length === 0 ? (
            <p className="text-sm text-gray-500">No agent runs yet. Trigger an agent from MC Web or wait for an infra event.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map(run => (
                <AgentStatusCard key={run.task_id} run={run} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Run History */}
      <Card className="border border-white/[0.08]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Run History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {historyLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-gray-500">No runs yet.</p>
          ) : (
            <div>
              <div className="flex items-center gap-3 pb-2 border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-gray-600 font-medium">
                <span className="w-3.5 shrink-0" />
                <span className="w-36 shrink-0">Agent</span>
                <span className="w-24 shrink-0">Trigger</span>
                <span className="flex-1">Summary</span>
                <span className="w-16 text-right shrink-0">Duration</span>
                <span className="w-32 text-right shrink-0">Started</span>
              </div>
              {runs.map(run => <RunRow key={run.task_id} run={run} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
