import { ServiceStatusRow } from '@/components/dashboard/ServiceStatusRow';
import { useInventory } from '@/lib/hooks/useInventory';
import { useArgoCDApplications } from '@/lib/hooks/useArgocd';
import { useEventStream } from '@/lib/hooks/useEventStream';
import { useClusterHealth } from '@/lib/hooks/usePrometheus';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Server, GitBranch, Activity, Radio, Box } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { InfraEvent } from '@/types/events';

const severityStyles: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-white/10 bg-gradient-to-br from-white/5 to-transparent">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">{label}</p>
            {loading ? (
              <Skeleton className="h-9 w-14 mt-1" />
            ) : (
              <div className={`text-4xl font-bold ${color}`}>{value}</div>
            )}
            {sub && !loading && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-lg bg-white/5 ring-1 ring-white/10`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentEventRow({ event }: { event: InfraEvent }) {
  const timestamp = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <Badge className={`text-[10px] px-1.5 py-0 shrink-0 mt-0.5 ${severityStyles[event.severity] || severityStyles.info}`}>
        {event.severity}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-200 leading-snug truncate">{event.message}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{event.source} · {timestamp}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: inventory, isLoading: invLoading } = useInventory();
  const { data: appsData, isLoading: appsLoading } = useArgoCDApplications();
  const { data: healthData, isLoading: healthLoading } = useClusterHealth();
  const { events, connected } = useEventStream();

  const hosts = inventory?.data?.hosts?.length ?? 0;
  const workloads = inventory?.data?.workloads?.length ?? 0;
  const apps = appsData?.data ?? [];
  const syncedApps = apps.filter((a) => a.syncStatus === 'Synced').length;
  const nodesReady = healthData?.data?.nodesReady ?? 0;
  const nodeCount = healthData?.data?.nodeCount ?? 0;
  const recentEvents = events.slice(0, 5);

  return (
    <article className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-blue-400" />
          Dashboard
        </h1>
      </div>

      <ServiceStatusRow />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Server}
          label="K8s Nodes"
          value={healthLoading ? '—' : `${nodesReady}/${nodeCount}`}
          sub="nodes ready"
          color="text-blue-400"
          loading={healthLoading}
        />
        <StatCard
          icon={Box}
          label="Workloads"
          value={workloads}
          sub={`across ${hosts} hosts`}
          color="text-cyan-400"
          loading={invLoading}
        />
        <StatCard
          icon={GitBranch}
          label="ArgoCD Apps"
          value={apps.length}
          sub={`${syncedApps} synced`}
          color="text-amber-400"
          loading={appsLoading}
        />
        <StatCard
          icon={Activity}
          label="Events"
          value={events.length}
          sub="in stream"
          color="text-purple-400"
        />
      </div>

      {/* Recent events */}
      <Card className="border-white/10 bg-gradient-to-br from-white/5 to-transparent">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-white">Recent Activity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? 'bg-green-500 animate-ping' : 'bg-gray-500'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-500'}`} />
              </span>
              <span className="text-[10px] text-gray-500">{connected ? 'Live' : 'Disconnected'}</span>
            </div>
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No events yet</p>
          ) : (
            <div>
              {recentEvents.map((event, i) => (
                <RecentEventRow key={event.id || i} event={event} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </article>
  );
}
