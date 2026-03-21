import { useEffect, useState } from 'react';
import useSWR, { type BareFetcher } from 'swr';
import { apiClient } from '@/lib/api/client';
import { useEventStream } from './useEventStream';
import type { InfraEvent } from '@/types/events';

interface EventsResponse {
  data: InfraEvent[];
  count: number;
}

export type SeverityFilter = 'all' | 'critical' | 'warning' | 'info';
export type SourceFilter = 'all' | 'kubernetes' | 'argocd' | 'proxmox';

export function useAlerts() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // Fetch historical events from notification-service via MC Backend proxy
  const fetcher: BareFetcher<EventsResponse | undefined> = async (path: string) => {
    return apiClient.get(path);
  };

  const { data: historicalData, isLoading } = useSWR<EventsResponse | undefined>(
    '/api/v1/events?limit=100',
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    },
  );

  // Live SSE events
  const { events: liveEvents, connected } = useEventStream();

  // Merge historical and live events, dedup by id
  const [mergedEvents, setMergedEvents] = useState<InfraEvent[]>([]);

  useEffect(() => {
    const historical = historicalData?.data ?? [];
    const seen = new Set<string>();
    const merged: InfraEvent[] = [];

    // Live events first (newest)
    for (const event of liveEvents) {
      const key = event.id || `${event.source}-${event.type}-${event.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(event);
      }
    }

    // Then historical
    for (const event of historical) {
      const key = event.id || `${event.source}-${event.type}-${event.timestamp}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(event);
      }
    }

    // Sort newest first
    merged.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    setMergedEvents(merged);
  }, [liveEvents, historicalData]);

  // Apply filters
  const filteredEvents = mergedEvents.filter((event) => {
    if (severityFilter !== 'all' && event.severity !== severityFilter) return false;
    if (sourceFilter !== 'all' && event.source !== sourceFilter) return false;
    return true;
  });

  const counts = {
    total: mergedEvents.length,
    critical: mergedEvents.filter((e) => e.severity === 'critical').length,
    warning: mergedEvents.filter((e) => e.severity === 'warning').length,
    info: mergedEvents.filter((e) => e.severity === 'info').length,
  };

  return {
    events: filteredEvents,
    counts,
    connected,
    isLoading,
    severityFilter,
    setSeverityFilter,
    sourceFilter,
    setSourceFilter,
  };
}
