import { useEventStream } from '@/lib/hooks/useEventStream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio, GitBranch, Server, Box } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { InfraEvent } from '@/types/events';

const severityStyles: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const sourceIcons: Record<string, typeof Server> = {
  kubernetes: Box,
  argocd: GitBranch,
  proxmox: Server,
};

function EventRow({ event }: { event: InfraEvent }) {
  const Icon = sourceIcons[event.source] || Radio;
  const timestamp = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });

  return (
    <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.06]">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] mt-0.5">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge className={`text-[10px] px-1.5 py-0 ${severityStyles[event.severity] || severityStyles.info}`}>
            {event.severity}
          </Badge>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{event.source}</span>
        </div>
        <p className="text-sm text-gray-200 leading-snug">{event.message}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{timestamp}</p>
      </div>
    </div>
  );
}

export function EventFeed() {
  const { events, connected } = useEventStream();

  return (
    <Card className="border-white/10 hover:border-white/20 transition-all duration-300 bg-gradient-to-br from-white/5 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2.5">
          <Radio className="h-4 w-4 text-gray-400" />
          <CardTitle className="text-sm font-medium">Live Events</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connected ? 'bg-green-500 animate-ping' : 'bg-gray-500'
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full shadow-lg ${
                connected ? 'bg-green-500 shadow-green-500/50' : 'bg-gray-500 shadow-gray-500/50'
              }`}
            />
          </span>
          <span className="text-[10px] text-gray-500">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Radio className="h-8 w-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No events yet</p>
            <p className="text-xs text-gray-600">Waiting for activity...</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {events.slice(0, 20).map((event, i) => (
              <EventRow key={event.id || i} event={event} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
