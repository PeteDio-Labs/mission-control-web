import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { InfraEvent } from '@/types/events';

const MAX_EVENTS = 50;

export function useEventStream() {
  const [events, setEvents] = useState<InfraEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const addEvent = useCallback((event: InfraEvent) => {
    setEvents((prev) => {
      const next = [event, ...prev];
      return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
    });
  }, []);

  useEffect(() => {
    const es = apiClient.createEventSource('/api/v1/events/stream');
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        // Skip the initial connection message
        if (data.type === 'connected') return;
        addEvent(data as InfraEvent);
      } catch {
        // Ignore unparseable messages
      }
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [addEvent]);

  return { events, connected };
}
