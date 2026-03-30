import useSWR, { BareFetcher } from 'swr';
import { apiClient } from '@/lib/api/client';
import type { APIResponse } from '@/types/api';
import type { QBittorrentStatusData, TorrentInfo, TransferInfo } from '@/types/qbittorrent';

export function useQBittorrentStatus() {
  const fetcher: BareFetcher<APIResponse<QBittorrentStatusData> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<QBittorrentStatusData> | undefined>('/api/v1/qbittorrent/status', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useQBittorrentTorrents(filter?: string) {
  const path = filter
    ? `/api/v1/qbittorrent/torrents?filter=${filter}`
    : '/api/v1/qbittorrent/torrents';

  const fetcher: BareFetcher<APIResponse<TorrentInfo[]> | undefined> = async (p: string) => {
    return apiClient.get(p);
  };
  return useSWR<APIResponse<TorrentInfo[]> | undefined>(path, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export function useQBittorrentTransfer() {
  const fetcher: BareFetcher<APIResponse<TransferInfo> | undefined> = async (path: string) => {
    return apiClient.get(path);
  };
  return useSWR<APIResponse<TransferInfo> | undefined>('/api/v1/qbittorrent/transfer', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });
}

export async function addTorrent(
  magnetUrl: string,
  category: 'tv-sonarr' | 'radarr'
): Promise<void> {
  await apiClient.post('/api/v1/qbittorrent/torrents', { magnetUrl, category });
}
