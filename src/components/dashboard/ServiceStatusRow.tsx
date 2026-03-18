import useSWR, { BareFetcher } from 'swr';
import { apiClient } from '@/lib/api/client';
import type { APIResponse } from '@/types/api';

interface ServiceDot {
  name: string;
  path: string;
  connectedKey: string;
}

const SERVICES: ServiceDot[] = [
  { name: 'Kubernetes', path: '/api/v1/argocd/status', connectedKey: 'connected' },
  { name: 'Proxmox', path: '/api/v1/proxmox/status', connectedKey: 'connected' },
  { name: 'ArgoCD', path: '/api/v1/argocd/status', connectedKey: 'connected' },
  { name: 'Prometheus', path: '/api/v1/prometheus/status', connectedKey: 'connected' },
  { name: 'qBittorrent', path: '/api/v1/qbittorrent/status', connectedKey: 'connected' },
];

function StatusDot({ service }: { service: ServiceDot }) {
  const fetcher: BareFetcher<APIResponse<Record<string, unknown>> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  const { data, error, isLoading } = useSWR<APIResponse<Record<string, unknown>> | undefined>(
    service.path,
    fetcher,
    { refreshInterval: 60000, dedupingInterval: 15000 }
  );

  const connected = !error && !isLoading && data?.data?.[service.connectedKey] === true;
  const loading = isLoading;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10">
      <div
        className={`h-2 w-2 rounded-full transition-colors ${
          loading ? 'bg-gray-500 animate-pulse' :
          connected ? 'bg-green-400' :
          error ? 'bg-red-400' : 'bg-yellow-400'
        }`}
      />
      <span className="text-xs text-gray-400">{service.name}</span>
    </div>
  );
}

export function ServiceStatusRow() {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mr-1">Services</span>
      {SERVICES.map((svc) => (
        <StatusDot key={svc.name} service={svc} />
      ))}
    </div>
  );
}
