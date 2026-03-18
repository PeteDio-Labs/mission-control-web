import useSWR, { BareFetcher } from 'swr';
import { apiClient } from '@/lib/api/client';
import type { Host, Workload } from '@/types/models';
import type { APIResponse, HealthResponse, LivenessResponse, InventoryResponse, SyncResponse } from '@/types/api';

export function useHealth() {
  const fetcher: BareFetcher<unknown> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR('/health/ready', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useInventory() {
  const fetcher: BareFetcher<APIResponse<InventoryResponse> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<InventoryResponse> | undefined>('/api/v1/inventory', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useHosts() {
  const fetcher: BareFetcher<APIResponse<Host[]> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<Host[]> | undefined>('/api/v1/inventory/hosts', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useWorkloads() {
  const fetcher: BareFetcher<APIResponse<Workload[]> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<Workload[]> | undefined>('/api/v1/inventory/workloads', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useHostById(id: string | null) {
  const fetcher: BareFetcher<APIResponse<Host> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<Host> | undefined>(id ? `/api/v1/inventory/hosts/${id}` : null, fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useWorkloadById(id: string | null) {
  const fetcher: BareFetcher<APIResponse<Workload> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<Workload> | undefined>(id ? `/api/v1/inventory/workloads/${id}` : null, fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useFullHealth() {
  const fetcher: BareFetcher<HealthResponse | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<HealthResponse | undefined>('/health', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useLiveness() {
  const fetcher: BareFetcher<LivenessResponse | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<LivenessResponse | undefined>('/health/live', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useProxmoxNodes() {
  const fetcher: BareFetcher<APIResponse<any[]> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<any[]> | undefined>('/api/v1/proxmox/nodes', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useProxmoxResources(type?: 'node' | 'vm' | 'lxc' | 'storage') {
  const fetcher: BareFetcher<APIResponse<any[]> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  const query = type ? `?type=${type}` : '';
  return useSWR<APIResponse<any[]> | undefined>(`/api/v1/proxmox/resources${query}`, fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useArgoCDApplications() {
  const fetcher: BareFetcher<APIResponse<any[]> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<any[]> | undefined>('/api/v1/argocd/applications', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export async function triggerInventorySync() {
  try {
    const response = await apiClient.post<APIResponse<SyncResponse>>('/api/v1/inventory/refresh', {
      forceSync: true,
    });
    return response;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to sync inventory');
  }
}
