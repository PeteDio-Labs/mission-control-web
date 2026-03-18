import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Server, AlertCircle, CheckCircle2, Cpu, HardDrive } from 'lucide-react';
import { useProxmoxStatus, useProxmoxNodes, useProxmoxResources } from '@/lib/hooks/useProxmox';
import { ResourceCard } from '@/components/dashboard/ResourceCard';

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${bytes} B`;
}

export function ProxmoxStatus() {
  const { data: statusData, isLoading: statusLoading, error: statusError } = useProxmoxStatus();
  const { data: nodesData, isLoading: nodesLoading, error: nodesError } = useProxmoxNodes();
  const { data: lxcsData, isLoading: lxcsLoading, error: lxcsError } = useProxmoxResources('lxc');
  const { data: vmsData, isLoading: vmsLoading, error: vmsError } = useProxmoxResources('vm');

  const isLoading = statusLoading || nodesLoading || lxcsLoading || vmsLoading;
  const error = statusError || nodesError || lxcsError || vmsError;

  if (error) {
    return (
      <Card className="border-destructive/50 hover:border-destructive/70 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Server className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle className="text-sm font-medium">Proxmox</CardTitle>
          </div>
          <AlertCircle className="h-5 w-5 text-destructive/60" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">Error</div>
          <p className="text-xs text-muted-foreground mt-1">Failed to load Proxmox status</p>
        </CardContent>
      </Card>
    );
  }

  const connected = statusData?.data?.connected ?? false;
  const nodes = nodesData?.data ?? [];
  const lxcs = lxcsData?.data ?? [];
  const vms = vmsData?.data ?? [];
  const allResources = [...lxcs, ...vms];
  const runningResources = allResources.filter((r) => r.status === 'running');

  return (
    <Card className="border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5 bg-gradient-to-br from-white/5 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg transition-all ${connected ? 'bg-green-500/15 ring-1 ring-green-500/30' : 'bg-gray-700/20'}`}>
            <Server className={`h-4 w-4 transition-colors ${connected ? 'text-green-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">Proxmox</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Hypervisor & containers</p>
          </div>
        </div>
        {connected && <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />}
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <Badge className="bg-green-500/20 text-green-300 shadow-sm shadow-green-500/20 border-green-500/30 font-medium text-xs">
                    Connected
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <Badge className="bg-red-500/20 text-red-300 shadow-sm shadow-red-500/20 border-red-500/30 font-medium text-xs">
                    Disconnected
                  </Badge>
                </>
              )}
            </div>

            {/* Nodes with CPU/Memory bars */}
            {nodes.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">
                  Nodes ({nodes.length})
                </p>
                <div className="space-y-2">
                  {[...nodes].sort((a, b) => a.node.localeCompare(b.node)).map((node) => {
                    const cpuPct = node.maxcpu && node.cpu !== undefined
                      ? Math.round((node.cpu / node.maxcpu) * 100)
                      : null;
                    const memPct = node.maxmem && node.mem !== undefined
                      ? Math.round((node.mem / node.maxmem) * 100)
                      : null;
                    return (
                      <div key={node.node} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{node.node}</span>
                          <Badge
                            className={
                              node.status === 'online'
                                ? 'bg-green-500/20 text-green-300 border-green-500/30 text-xs'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs'
                            }
                          >
                            {node.status ?? 'unknown'}
                          </Badge>
                        </div>
                        {cpuPct !== null && (
                          <div className="flex items-center gap-2">
                            <Cpu className="h-3 w-3 text-gray-500 shrink-0" />
                            <div className="flex-1 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                                style={{ width: `${cpuPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{cpuPct}%</span>
                          </div>
                        )}
                        {memPct !== null && node.mem !== undefined && node.maxmem !== undefined && (
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-3 w-3 text-gray-500 shrink-0" />
                            <div className="flex-1 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                                style={{ width: `${memPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-24 text-right">
                              {formatBytes(node.mem)}/{formatBytes(node.maxmem)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Running LXCs/VMs grid */}
            {allResources.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Resources ({runningResources.length}/{allResources.length} running)
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[...allResources].sort((a, b) => a.name.localeCompare(b.name)).map((resource) => (
                    <ResourceCard
                      key={resource.vmid}
                      name={resource.name}
                      id={resource.vmid}
                      status={resource.status}
                      node={resource.node}
                      cpu={resource.cpu}
                      maxcpu={resource.maxcpu}
                      mem={resource.mem}
                      maxmem={resource.maxmem}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Fallback count when no detailed data */}
            {nodes.length === 0 && allResources.length === 0 && (
              <div>
                <div className="text-3xl font-bold text-white">—</div>
                <p className="text-xs text-gray-400 mt-1">No node data available</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
