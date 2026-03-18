import useSWR, { BareFetcher } from 'swr';
import { apiClient } from '@/lib/api/client';
import type { APIResponse } from '@/types/api';
import type { PrometheusStatusData, HealthMetrics, MetricResult } from '@/types/prometheus';

export function usePrometheusStatus() {
  const fetcher: BareFetcher<APIResponse<PrometheusStatusData> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<PrometheusStatusData> | undefined>('/api/v1/prometheus/status', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });
}

export function useClusterHealth() {
  const fetcher: BareFetcher<APIResponse<HealthMetrics> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<HealthMetrics> | undefined>('/api/v1/prometheus/cluster/health', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });
}

export function useNodeCPU() {
  const fetcher: BareFetcher<APIResponse<MetricResult[]> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<MetricResult[]> | undefined>('/api/v1/prometheus/nodes/cpu', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });
}

export function useNodeMemory() {
  const fetcher: BareFetcher<APIResponse<MetricResult[]> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<MetricResult[]> | undefined>('/api/v1/prometheus/nodes/memory', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });
}

export function usePVUsage() {
  const fetcher: BareFetcher<APIResponse<MetricResult[]> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<MetricResult[]> | undefined>('/api/v1/prometheus/pvs', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  });
}
