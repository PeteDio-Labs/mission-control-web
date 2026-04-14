import { useState } from 'react';
import { Bot, CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Play, Loader2, FileText, List, FileCode, GitCommit, ScrollText, Link, AlignLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  useAgents,
  useAgentHistory,
  useAgentQueue,
  useAgentRun,
  approveAgentAction,
  rejectAgentAction,
  triggerAgent,
  type AgentRun,
  type Artifact,
} from '@/lib/hooks/useAgents';

// ─── Constants ────────────────────────────────────────────────────

const AGENTS = [
  { name: 'ops-investigator', description: 'Investigates infra alerts and pod failures',       defaultInput: { mode: 'full-check' } },
  { name: 'blog-agent',       description: 'Generates blog content from infra events',          defaultInput: { contentType: 'how-to' } },
  { name: 'pm-agent',         description: 'Manages project tasks and planning documents',      defaultInput: { mode: 'board-status' } },
  { name: 'knowledge-janitor',description: 'Audits knowledge/ for stale docs',                  defaultInput: { scope: 'audit' } },
  { name: 'workstation-agent',description: 'Executes shell, file, git, kubectl ops on LXC 113', defaultInput: { mode: 'health-check', gated: false } },
  { name: 'infra-agent',      description: 'Runs Ansible playbooks and checks Proxmox capacity',defaultInput: { mode: 'health-check', gated: false } },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Bot }> = {
  queued:           { label: 'Queued',         color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',       icon: Clock },
  running:          { label: 'Running',         color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',       icon: RefreshCw },
  waiting_approval: { label: 'Needs Approval',  color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: AlertTriangle },
  complete:         { label: 'Complete',         color: 'bg-green-500/20 text-green-300 border-green-500/30',    icon: CheckCircle },
  failed:           { label: 'Failed',           color: 'bg-red-500/20 text-red-300 border-red-500/30',          icon: XCircle },
  'dead-letter':    { label: 'Dead Letter',      color: 'bg-red-900/20 text-red-400 border-red-900/30',          icon: XCircle },
};

const artifactIcon: Record<Artifact['type'], typeof FileText> = {
  'investigation-report': FileText,
  'task-list':            List,
  'blog-draft':           AlignLeft,
  'diff':                 GitCommit,
  'log':                  ScrollText,
  'pr-url':               Link,
  'summary':              FileCode,
};

// ─── Artifact Viewer ──────────────────────────────────────────────

function ArtifactViewer({ artifact }: { artifact: Artifact }) {
  const [expanded, setExpanded] = useState(true);
  const Icon = artifactIcon[artifact.type] ?? FileText;

  return (
    <div className="border border-white/[0.08] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.05] text-left"
      >
        <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        <span className="text-xs font-medium text-gray-300 flex-1 truncate">{artifact.label}</span>
        <Badge className="text-[10px] px-1.5 py-0 bg-white/[0.05] text-gray-500 border-white/[0.08] shrink-0">
          {artifact.type}
        </Badge>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-gray-600 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-600 shrink-0" />
        )}
      </button>
      {expanded && (
        <pre className="px-3 py-2.5 text-xs text-gray-400 bg-black/20 overflow-auto max-h-80 whitespace-pre-wrap break-words font-mono leading-relaxed">
          {artifact.content || '(empty)'}
        </pre>
      )}
    </div>
  );
}

// ─── Run Detail Modal ─────────────────────────────────────────────

function RunDetailModal({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { run, isLoading } = useAgentRun(taskId);
  const cfg = run ? (statusConfig[run.status] ?? statusConfig.failed!) : null;
  const Icon = cfg?.icon ?? Bot;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-[#0f1117] border border-white/[0.12] rounded-xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.08] shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
            <Bot className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-semibold text-sm truncate">{run?.agent_name ?? '...'}</h2>
              {cfg && (
                <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', cfg.color)}>
                  <Icon className="h-2.5 w-2.5 mr-1 inline" />
                  {cfg.label}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-600 font-mono truncate">{taskId}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 shrink-0 text-lg leading-none">×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading run details...
            </div>
          )}

          {run && (
            <>
              {/* Meta row */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                <span>Trigger: <span className="text-gray-400 capitalize">{run.trigger}</span></span>
                {run.duration_ms && (
                  <span>Duration: <span className="text-gray-400">{(run.duration_ms / 1000).toFixed(1)}s</span></span>
                )}
                {run.completed_at && (
                  <span>Completed: <span className="text-gray-400">{format(new Date(run.completed_at), 'MMM d, HH:mm:ss')}</span></span>
                )}
              </div>

              {/* Summary */}
              {run.summary && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Summary</p>
                  <p className="text-sm text-gray-300">{run.summary}</p>
                </div>
              )}

              {/* Artifacts */}
              {run.result?.artifacts && run.result.artifacts.length > 0 ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-2">
                    Artifacts ({run.result.artifacts.length})
                  </p>
                  <div className="space-y-2">
                    {run.result.artifacts.map((artifact, i) => (
                      <ArtifactViewer key={i} artifact={artifact} />
                    ))}
                  </div>
                </div>
              ) : run.status === 'complete' || run.status === 'failed' ? (
                <p className="text-xs text-gray-600">No artifacts recorded for this run.</p>
              ) : null}

              {/* Input */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Input</p>
                <pre className="text-xs text-gray-500 bg-black/20 rounded-lg p-3 overflow-auto max-h-32 font-mono">
                  {JSON.stringify(run.input, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Trigger Modal ────────────────────────────────────────────────

function TriggerModal({
  agentName,
  defaultInput,
  onClose,
  onTriggered,
}: {
  agentName: string;
  defaultInput: Record<string, unknown>;
  onClose: () => void;
  onTriggered: () => void;
}) {
  const [inputJson, setInputJson] = useState(JSON.stringify(defaultInput, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  async function handleTrigger() {
    setError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(inputJson);
    } catch {
      setError('Invalid JSON');
      return;
    }
    setBusy(true);
    try {
      const result = await triggerAgent(agentName, parsed);
      setTaskId(result.taskId);
      onTriggered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trigger failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0f1117] border border-white/[0.12] rounded-xl shadow-2xl p-6 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Bot className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">{agentName}</h2>
            <p className="text-xs text-gray-500">Trigger a manual run</p>
          </div>
        </div>

        {taskId ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              Dispatched successfully
            </div>
            <p className="text-xs text-gray-500 font-mono break-all">taskId: {taskId}</p>
            <Button className="w-full mt-2" size="sm" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Input payload (JSON)</label>
              <textarea
                className="w-full h-36 bg-black/30 border border-white/[0.08] rounded-lg p-3 text-xs font-mono text-gray-300 resize-none focus:outline-none focus:border-blue-500/40"
                value={inputJson}
                onChange={e => setInputJson(e.target.value)}
                spellCheck={false}
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleTrigger}
                disabled={busy}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                {busy ? 'Dispatching...' : 'Trigger'}
              </Button>
              <Button size="sm" variant="outline" onClick={onClose} className="border-white/10 text-gray-400 hover:text-white">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Agent Trigger Card ───────────────────────────────────────────

function AgentTriggerCard({ agent, onTrigger }: { agent: typeof AGENTS[number]; onTrigger: (name: string) => void }) {
  return (
    <Card className="border border-white/[0.08] bg-gradient-to-br from-white/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Bot className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{agent.name}</p>
            <p className="text-xs text-gray-500 truncate">{agent.description}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTrigger(agent.name)}
            className="shrink-0 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 h-7 px-2.5 text-xs"
          >
            <Play className="h-3 w-3 mr-1" />
            Run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
              <Button size="sm" onClick={handleApprove} disabled={busy} className="bg-green-600 hover:bg-green-500 text-white h-7 px-3 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={handleReject} disabled={busy} className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-7 px-3 text-xs">
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

function AgentStatusCard({ run, onClick }: { run: AgentRun; onClick: () => void }) {
  const cfg = statusConfig[run.status] ?? statusConfig.failed!;
  const Icon = cfg.icon;
  const isRunning = run.status === 'running';
  const isComplete = run.status === 'complete' || run.status === 'failed';
  const liveMsg = run.current_message;
  const displayMsg = run.summary ?? (liveMsg ? null : `Trigger: ${run.trigger}`);

  return (
    <Card
      onClick={isComplete ? onClick : undefined}
      className={cn(
        'border bg-gradient-to-br from-white/5 to-transparent',
        isRunning ? 'border-blue-500/20' : 'border-white/[0.08]',
        isComplete && 'cursor-pointer hover:border-white/20 hover:bg-white/[0.04] transition-colors',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
            <Bot className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm truncate">{run.agent_name}</span>
              <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', cfg.color)}>
                <Icon className={cn('h-2.5 w-2.5 mr-1 inline', isRunning && 'animate-spin')} />
                {cfg.label}
              </Badge>
            </div>
            {isRunning && liveMsg && (
              <p className="text-xs text-blue-300/80 mt-1.5 font-mono truncate">{liveMsg}</p>
            )}
            {displayMsg && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{displayMsg}</p>
            )}
            {isComplete && (
              <p className="text-[10px] text-gray-700 mt-1">Click to view artifacts</p>
            )}
          </div>
          <span className="text-xs text-gray-600 shrink-0 mt-0.5">
            {formatDistanceToNow(new Date(run.updated_at), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Run History Row ──────────────────────────────────────────────

function RunRow({ run, onClick }: { run: AgentRun; onClick: () => void }) {
  const cfg = statusConfig[run.status] ?? statusConfig.failed!;
  const Icon = cfg.icon;
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0 cursor-pointer hover:bg-white/[0.02] rounded px-1 -mx-1 transition-colors"
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', {
        'text-gray-400':   run.status === 'queued',
        'text-blue-400':   run.status === 'running',
        'text-yellow-400': run.status === 'waiting_approval',
        'text-green-400':  run.status === 'complete',
        'text-red-400':    run.status === 'failed' || run.status === 'dead-letter',
      })} />
      <span className="text-sm text-gray-300 w-36 shrink-0 truncate">{run.agent_name}</span>
      <span className="text-xs text-gray-500 w-24 shrink-0 capitalize">{run.trigger}</span>
      <span className="text-xs text-gray-400 flex-1 truncate">{run.summary ?? '—'}</span>
      {run.duration_ms && (
        <span className="text-xs text-gray-600 w-16 text-right shrink-0">{(run.duration_ms / 1000).toFixed(1)}s</span>
      )}
      <span className="text-xs text-gray-600 w-32 text-right shrink-0">
        {format(new Date(run.created_at), 'MMM d, HH:mm')}
      </span>
    </div>
  );
}

// ─── Queue Row ────────────────────────────────────────────────────

function QueueRow({ run }: { run: AgentRun }) {
  const cfg = statusConfig[run.status] ?? statusConfig.queued!;
  const Icon = cfg.icon;
  const isRunning = run.status === 'running';
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <Icon className={cn('h-3.5 w-3.5 shrink-0', isRunning ? 'text-blue-400 animate-spin' : 'text-gray-500')} />
      <span className="text-sm text-gray-300 w-36 shrink-0 truncate">{run.agent_name}</span>
      <Badge className={cn('text-[10px] px-1.5 py-0 shrink-0', cfg.color)}>{cfg.label}</Badge>
      <span className="text-xs text-gray-500 w-24 shrink-0 capitalize">{run.trigger}</span>
      {isRunning && run.current_message ? (
        <span className="text-xs text-blue-300/80 flex-1 font-mono truncate">{run.current_message}</span>
      ) : (
        <span className="text-xs text-gray-600 flex-1 truncate font-mono">{run.task_id}</span>
      )}
      <span className="text-xs text-gray-600 w-32 text-right shrink-0">
        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
      </span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { agents, isLoading: agentsLoading, refresh: refreshAgents } = useAgents();
  const { runs, isLoading: historyLoading, refresh: refreshHistory } = useAgentHistory({ limit: 50 });
  const { queue, isLoading: queueLoading, refresh: refreshQueue } = useAgentQueue();
  const [triggerTarget, setTriggerTarget] = useState<string | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const pendingApprovals = agents.filter(a => a.status === 'waiting_approval');
  const triggerAgentDef = AGENTS.find(a => a.name === triggerTarget);

  function refreshAll() { refreshAgents(); refreshHistory(); refreshQueue(); }
  function handleResolved() { refreshAll(); }
  function handleTriggered() { setTimeout(refreshAll, 1000); }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Agent platform status, run history, and approval queue</p>
        </div>
        <Button size="sm" variant="outline" onClick={refreshAll} className="border-white/10 text-gray-400 hover:text-white">
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

      {/* Tabs */}
      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Live Status</TabsTrigger>
          <TabsTrigger value="queue">
            Queue
            {queue.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-500/30 text-blue-300 text-[10px]">
                {queue.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="trigger">Trigger</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Live Status */}
        <TabsContent value="status">
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
                <p className="text-sm text-gray-500">No agent runs yet. Use the Trigger tab to dispatch an agent.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {agents.map(run => (
                    <AgentStatusCard
                      key={run.task_id}
                      run={run}
                      onClick={() => setDetailTaskId(run.task_id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queue */}
        <TabsContent value="queue">
          <Card className="border border-white/[0.08]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                Task Queue
                {queue.length > 0 && (
                  <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-300 border-blue-500/30">
                    {queue.length} active
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {queueLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : queue.length === 0 ? (
                <p className="text-sm text-gray-500">Queue is empty.</p>
              ) : (
                <div>
                  <div className="flex items-center gap-3 pb-2 border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-gray-600 font-medium">
                    <span className="w-3.5 shrink-0" />
                    <span className="w-36 shrink-0">Agent</span>
                    <span className="w-20 shrink-0">Status</span>
                    <span className="w-24 shrink-0">Trigger</span>
                    <span className="flex-1">Progress / Task ID</span>
                    <span className="w-32 text-right shrink-0">Queued</span>
                  </div>
                  {queue.map(run => <QueueRow key={run.task_id} run={run} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trigger */}
        <TabsContent value="trigger">
          <Card className="border border-white/[0.08]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Play className="h-4 w-4 text-blue-400" />
                Trigger Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {AGENTS.map(agent => (
                  <AgentTriggerCard key={agent.name} agent={agent} onTrigger={setTriggerTarget} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
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
                  {runs.map(run => (
                    <RunRow
                      key={run.task_id}
                      run={run}
                      onClick={() => setDetailTaskId(run.task_id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Trigger Modal */}
      {triggerTarget && triggerAgentDef && (
        <TriggerModal
          agentName={triggerTarget}
          defaultInput={triggerAgentDef.defaultInput}
          onClose={() => setTriggerTarget(null)}
          onTriggered={handleTriggered}
        />
      )}

      {/* Run Detail Modal */}
      {detailTaskId && (
        <RunDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
        />
      )}
    </div>
  );
}
