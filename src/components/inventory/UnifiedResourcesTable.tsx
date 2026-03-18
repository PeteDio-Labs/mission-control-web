import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ResourceBadge } from './ResourceBadge';
import { useHosts, useWorkloads, useProxmoxNodes, useArgoCDApplications, useProxmoxResources } from '@/lib/hooks/useInventory';
import { formatDistanceToNow } from 'date-fns';
import type { Host, Workload } from '@/types/models';
import { Server, GitBranch } from 'lucide-react';
import { useState } from 'react';

interface UnifiedResource {
  id: string;
  name: string;
  type: 'host' | 'workload' | 'proxmox-node' | 'proxmox-vm' | 'proxmox-lxc' | 'argocd-app';
  source: 'kubernetes' | 'proxmox' | 'argocd';
  status: string;
  address?: string;
  namespace?: string;
  syncStatus?: string;
  healthStatus?: string;
  lastUpdated?: string;
}

export function UnifiedResourcesTable({
  search,
  onResourceSelect,
}: {
  search: string;
  onResourceSelect?: (resource: UnifiedResource) => void;
}) {
  const [filterType, setFilterType] = useState<string | null>(null);

  const { data: hostsData, isLoading: hostsLoading } = useHosts();
  const { data: workloadsData, isLoading: workloadsLoading } = useWorkloads();
  const { data: proxmoxNodesData, isLoading: proxmoxLoading } = useProxmoxNodes();
  const { data: proxmoxVMsData, isLoading: vmsLoading } = useProxmoxResources('vm');
  const { data: proxmoxLXCsData, isLoading: lxcsLoading } = useProxmoxResources('lxc');
  const { data: appsData, isLoading: appsLoading } = useArgoCDApplications();

  const isLoading = hostsLoading || workloadsLoading || proxmoxLoading || vmsLoading || lxcsLoading || appsLoading;

  // Combine all resources
  const resources: UnifiedResource[] = [];

  // Add K8s hosts
  const hosts = hostsData?.data || [];
  hosts.forEach((host: Host) => {
    resources.push({
      id: host.id,
      name: host.name,
      type: 'host',
      source: 'kubernetes',
      status: host.status,
      address: host.addresses?.lan,
      lastUpdated: host.last_seen_at ?? undefined,
    });
  });

  // Add workloads
  const workloads = workloadsData?.data || [];
  workloads.forEach((workload: Workload) => {
    resources.push({
      id: workload.id,
      name: workload.name,
      type: 'workload',
      source: 'kubernetes',
      status: workload.status,
      namespace: workload.namespace || undefined,
      healthStatus: workload.health_status,
      lastUpdated: workload.last_updated_at ?? undefined,
    });
  });

  // Add Proxmox nodes
  const proxmoxNodes = proxmoxNodesData?.data || [];
  proxmoxNodes.forEach((node: any) => {
    resources.push({
      id: node.node,
      name: node.node,
      type: 'proxmox-node',
      source: 'proxmox',
      status: node.status === 'online' ? 'online' : node.status === 'offline' ? 'offline' : 'unknown',
      lastUpdated: new Date().toISOString(),
    });
  });

  // Add Proxmox VMs
  const proxmoxVMs = proxmoxVMsData?.data || [];
  proxmoxVMs.forEach((vm: any) => {
    resources.push({
      id: `vm-${vm.vmid}`,
      name: vm.name || `VM ${vm.vmid}`,
      type: 'proxmox-vm',
      source: 'proxmox',
      status: vm.status === 'running' ? 'running' : vm.status === 'stopped' ? 'stopped' : 'unknown',
      lastUpdated: new Date().toISOString(),
    });
  });

  // Add Proxmox LXCs
  const proxmoxLXCs = proxmoxLXCsData?.data || [];
  proxmoxLXCs.forEach((lxc: any) => {
    resources.push({
      id: `lxc-${lxc.vmid}`,
      name: lxc.name || `LXC ${lxc.vmid}`,
      type: 'proxmox-lxc',
      source: 'proxmox',
      status: lxc.status === 'running' ? 'running' : lxc.status === 'stopped' ? 'stopped' : 'unknown',
      lastUpdated: new Date().toISOString(),
    });
  });

  // Add ArgoCD applications
  const apps = appsData?.data || [];
  apps.forEach((app: any) => {
    resources.push({
      id: app.name,
      name: app.name,
      type: 'argocd-app',
      source: 'argocd',
      status: app.syncStatus === 'Synced' ? 'running' : app.syncStatus === 'OutOfSync' ? 'pending' : 'unknown',
      namespace: app.namespace,
      syncStatus: app.syncStatus,
      healthStatus: app.healthStatus,
    });
  });

  // Filter by search and type
  const filtered = resources.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !filterType || r.source === filterType;
    return matchesSearch && matchesType;
  });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'kubernetes':
        return <Server className="h-4 w-4 text-blue-400" />;
      case 'proxmox':
        return <Server className="h-4 w-4 text-green-400" />;
      case 'argocd':
        return <GitBranch className="h-4 w-4 text-amber-400" />;
      default:
        return null;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'kubernetes':
        return 'K8s';
      case 'proxmox':
        return 'Proxmox';
      case 'argocd':
        return 'ArgoCD';
      default:
        return source;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType(null)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            filterType === null
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('kubernetes')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            filterType === 'kubernetes'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Server className="h-3.5 w-3.5" /> Kubernetes
        </button>
        <button
          onClick={() => setFilterType('proxmox')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            filterType === 'proxmox'
              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <Server className="h-3.5 w-3.5" /> Proxmox
        </button>
        <button
          onClick={() => setFilterType('argocd')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            filterType === 'argocd'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" /> ArgoCD
        </button>
      </div>

      <figure className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-12 text-center text-muted-foreground">
                  No resources found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((resource: UnifiedResource) => (
                <TableRow
                  key={resource.id}
                  className="cursor-pointer hover:bg-white/[0.05] transition-colors duration-150"
                  onClick={() => onResourceSelect?.(resource)}
                >
                  <TableCell className="font-medium text-white">{resource.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSourceIcon(resource.source)}
                      <span className="text-sm text-gray-400">{getSourceLabel(resource.source)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {resource.type === 'workload' ? 'Workload' : resource.type === 'proxmox-node' ? 'Node' : resource.type === 'proxmox-vm' ? 'VM' : resource.type === 'proxmox-lxc' ? 'LXC' : resource.type === 'argocd-app' ? 'App' : resource.type.replace('-', ' ')}
                  </TableCell>
                  <TableCell>
                    <ResourceBadge status={resource.status} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {resource.type === 'argocd-app' && resource.syncStatus ? (
                      <span>Sync: {resource.syncStatus}</span>
                    ) : resource.namespace ? (
                      <span>{resource.namespace}</span>
                    ) : resource.address ? (
                      <span className="font-mono text-xs">{resource.address}</span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-400">
                    {resource.lastUpdated
                      ? formatDistanceToNow(new Date(resource.lastUpdated), { addSuffix: true })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </figure>
    </div>
  );
}
