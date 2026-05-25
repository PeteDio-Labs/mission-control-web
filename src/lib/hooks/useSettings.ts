/**
 * Settings hooks — SWR-backed reads + apiClient mutations for
 * /api/v1/settings (PB.12). Cache TTL on the backend is 30s, so SWR
 * refreshInterval is set to match — keeps polling traffic minimal while
 * still showing changes from out-of-band edits within ~half a minute.
 */

import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/api/client';
import type {
  NotificationSettingRow,
  SettingsListResponse,
  SettingGetResponse,
} from '@/types/settings';

const fetcher = <T>(path: string): Promise<T> => apiClient.get<T>(path);

const REFRESH_MS = 30_000;

// ─── List hook ───────────────────────────────────────────────────────

export function useSettings(prefix?: string) {
  const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
  const key = `/api/v1/settings${qs}`;

  const { data, error, isLoading, mutate } = useSWR<SettingsListResponse>(
    key,
    fetcher,
    { refreshInterval: REFRESH_MS, revalidateOnFocus: true },
  );

  return {
    settings: data?.settings ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// ─── Single-setting hook ─────────────────────────────────────────────

export function useSetting<T = unknown>(key: string | null) {
  const path = key ? `/api/v1/settings/${encodeURIComponent(key)}` : null;

  const { data, error, isLoading, mutate } = useSWR<SettingGetResponse<T>>(
    path,
    fetcher,
    { refreshInterval: REFRESH_MS, revalidateOnFocus: true },
  );

  return {
    value: (data?.setting_value ?? null) as T | null,
    isLoading,
    error,
    refresh: mutate,
  };
}

// ─── Mutation ────────────────────────────────────────────────────────

/**
 * PATCH a single setting. On success we invalidate:
 *   - the single-key SWR cache for /api/v1/settings/:key
 *   - any list-cache key that starts with /api/v1/settings (covers the
 *     unfiltered list AND every active ?prefix= variant).
 *
 * The list invalidation uses the matcher form of `mutate` so we don't have
 * to know which prefix slices are currently mounted.
 */
export async function updateSetting<T = unknown>(
  key: string,
  value: T,
  description?: string,
): Promise<SettingGetResponse<T>> {
  const result = await apiClient.patch<SettingGetResponse<T>>(
    `/api/v1/settings/${encodeURIComponent(key)}`,
    { value, description },
  );

  // Optimistic update of the single-key cache with the returned row, then
  // revalidate the list cache(s) so any rendered table reflects the change.
  await globalMutate(`/api/v1/settings/${encodeURIComponent(key)}`, result, false);
  await globalMutate(
    (k) => typeof k === 'string' && k.startsWith('/api/v1/settings'),
    undefined,
    { revalidate: true },
  );

  return result;
}

// ─── Helper: pick rows by prefix from a useSettings() result ─────────

export function pickByKey<T = unknown>(
  rows: NotificationSettingRow[],
  key: string,
): T | null {
  const row = rows.find((r) => r.setting_key === key);
  return row ? (row.setting_value as T) : null;
}
