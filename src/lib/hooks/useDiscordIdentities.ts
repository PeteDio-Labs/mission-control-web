/**
 * Discord identity hooks — SWR-backed reads + apiClient mutations for
 * /api/v1/discord-identities (PB.12). Used by the MC Settings page so an
 * admin can link or revoke a (discord_user_id → mc_user_id) pair without
 * SQL.
 */

import useSWR, { mutate as globalMutate } from 'swr';
import { apiClient } from '@/lib/api/client';
import type {
  DiscordIdentitiesListResponse,
  DiscordIdentityRow,
  LinkDiscordIdentityInput,
} from '@/types/settings';

const fetcher = <T>(path: string): Promise<T> => apiClient.get<T>(path);

const KEY = '/api/v1/discord-identities';

export function useDiscordIdentities() {
  const { data, error, isLoading, mutate } = useSWR<DiscordIdentitiesListResponse>(
    KEY,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );

  return {
    identities: data?.identities ?? [],
    isLoading,
    error,
    refresh: mutate,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────

export async function linkIdentity(
  input: LinkDiscordIdentityInput,
): Promise<DiscordIdentityRow> {
  const result = await apiClient.post<{ identity: DiscordIdentityRow }>(KEY, input);
  await globalMutate(KEY);
  return result.identity;
}

export async function revokeIdentity(discordUserId: string): Promise<void> {
  await apiClient.delete<{ revoked: true }>(
    `${KEY}/${encodeURIComponent(discordUserId)}`,
  );
  await globalMutate(KEY);
}
