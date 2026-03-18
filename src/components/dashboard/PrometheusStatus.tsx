import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle, CheckCircle2, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import { useClusterHealth, useNodeCPU, useNodeMemory, usePVUsage } from '@/lib/hooks/usePrometheus';

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function cpuColor(pct: number): string {
  if (pct >= 90) return 'from-red-500 to-red-400';
  if (pct >= 70) return 'from-yellow-500 to-yellow-400';
  return 'from-green-500 to-green-400';
}

function pvColor(pct: number): string {
  if (pct >= 90) return 'from-red-500 to-red-400';
  if (pct >= 75) return 'from-yellow-500 to-yellow-400';
  return 'from-purple-500 to-purple-400';
}

function getNodeName(labels: Record<string, string>): string {
  return labels.instance?.replace(':9100', '') ?? labels.node ?? 'unknown';
}

function getPVName(labels: Record<string, string>): string {
  return labels.persistentvolumeclaim ?? labels.namespace ?? 'unknown';
}

export function PrometheusStatus() {
  const { data: healthData, isLoading: healthLoading, error: healthError } = useClusterHealth();
  const { data: cpuData, isLoading: cpuLoading, error: cpuError } = useNodeCPU();
  const { data: memData, isLoading: memLoading, error: memError } = useNodeMemory();
  const { data: pvData, isLoading: pvLoading, error: pvError } = usePVUsage();

  const isLoading = healthLoading || cpuLoading || memLoading || pvLoading;
  const error = healthError || cpuError || memError || pvError;

  if (error) {
    return (
      <Card className="border-destructive/50 hover:border-destructive/70 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Activity className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle className="text-sm font-medium">Cluster Metrics</CardTitle>
          </div>
          <AlertCircle className="h-5 w-5 text-destructive/60" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">Error</div>
          <p className="text-xs text-muted-foreground mt-1">Failed to load Prometheus metrics</p>
        </CardContent>
      </Card>
    );
  }

  const health = healthData?.data;
  const cpuMetrics = cpuData?.data ?? [];
  const memMetrics = memData?.data ?? [];
  const pvMetrics = pvData?.data ?? [];
  const clusterHealthy = health?.clusterHealthy ?? false;

  return (
    <Card className="border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 bg-gradient-to-br from-white/5 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg transition-all ${clusterHealthy ? 'bg-purple-500/15 ring-1 ring-purple-500/30' : 'bg-gray-700/20'}`}>
            <Activity className={`h-4 w-4 transition-colors ${clusterHealthy ? 'text-purple-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Cluster Metrics</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Prometheus</p>
          </div>
        </div>
        {clusterHealthy && <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />}
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cluster health summary */}
            {health && (
              <div className="flex items-center gap-2 flex-wrap">
                {health.apiServerUp ? (
                  <Badge className="bg-green-500/20 text-green-300 shadow-sm shadow-green-500/20 border-green-500/30 font-medium text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    API Server
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-300 shadow-sm shadow-red-500/20 border-red-500/30 font-medium text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    API Server Down
                  </Badge>
                )}
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-medium text-xs">
                  {health.nodesReady}/{health.nodeCount} Nodes
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-medium text-xs">
                  {health.podsRunning}/{health.podCount} Pods
                </Badge>
              </div>
            )}

            {/* Node CPU */}
            {cpuMetrics.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3 w-3 text-gray-400" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">CPU Usage</span>
                </div>
                {cpuMetrics.sort((a, b) => getNodeName(a.labels).localeCompare(getNodeName(b.labels))).map((metric) => {
                  const pct = Math.round(metric.value);
                  return (
                    <div key={getNodeName(metric.labels)} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 truncate" title={getNodeName(metric.labels)}>
                        {getNodeName(metric.labels)}
                      </span>
                      <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${cpuColor(pct)} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Node Memory */}
            {memMetrics.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <MemoryStick className="h-3 w-3 text-gray-400" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Memory Used</span>
                </div>
                {memMetrics.sort((a, b) => getNodeName(a.labels).localeCompare(getNodeName(b.labels))).map((metric) => (
                  <div key={getNodeName(metric.labels)} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 truncate" title={getNodeName(metric.labels)}>
                      {getNodeName(metric.labels)}
                    </span>
                    <span className="text-xs font-medium text-white">{formatBytes(metric.value)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* PV Usage */}
            {pvMetrics.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="h-3 w-3 text-gray-400" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">PV Usage</span>
                </div>
                {pvMetrics
                  .filter((m) => m.value > 0)
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 6)
                  .map((metric) => {
                    const pct = Math.round(metric.value);
                    return (
                      <div key={getPVName(metric.labels)} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-28 truncate" title={getPVName(metric.labels)}>
                          {getPVName(metric.labels)}
                        </span>
                        <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${pvColor(pct)} transition-all duration-500`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
