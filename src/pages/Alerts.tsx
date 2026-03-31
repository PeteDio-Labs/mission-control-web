import { Bell, Box, GitBranch, Server, Radio, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAlerts, type SeverityFilter, type SourceFilter } from '@/lib/hooks/useAlerts';
import { formatDistanceToNow } from 'date-fns';
import type { InfraEvent } from '@/types/events';
import { cn } from '@/lib/utils';

const severityStyles: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const severityBorders: Record<string, string> = {
  critical: 'border-l-red-500',
  warning: 'border-l-orange-500',
  info: 'border-l-blue-500',
};

const sourceIcons: Record<string, typeof Server> = {
  kubernetes: Box,
  argocd: GitBranch,
  proxmox: Server,
};

function AlertCard({ event }: { event: InfraEvent }) {
  const Icon = sourceIcons[event.source] || Radio;
  const timestamp = formatDistanceToNow(new Date(event.timestamp), {
    addSuffix: true,
  });

  return (
    <Card
      className={cn(
        'border-l-4 border-white/10 hover:border-white/20 transition-all duration-200 bg-gradient-to-br from-white/5 to-transparent',
        severityBorders[event.severity] ?? 'border-l-blue-500',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] mt-0.5">
            <Icon className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge
                className={`text-[10px] px-1.5 py-0 ${severityStyles[event.severity] || severityStyles.info}`}
              >
                {event.severity}
              </Badge>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">
                {event.source}
              </span>
              {event.type && (
                <span className="text-[10px] text-gray-600">{event.type}</span>
              )}
            </div>
            <p className="text-sm text-gray-200 leading-snug">{event.message}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] text-gray-500">{timestamp}</span>
              {event.affected_service && (
                <span className="text-[11px] text-gray-500">
                  Service: {event.affected_service}
                </span>
              )}
              {event.namespace && (
                <span className="text-[11px] text-gray-500">
                  NS: {event.namespace}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const severityFilters: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const sourceFilters: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'kubernetes', label: 'Kubernetes' },
  { value: 'argocd', label: 'ArgoCD' },
  { value: 'proxmox', label: 'Proxmox' },
];

export default function AlertsPage() {
  const {
    events,
    counts,
    connected,
    isLoading,
    severityFilter,
    setSeverityFilter,
    sourceFilter,
    setSourceFilter,
  } = useAlerts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-red-400" />
            Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {counts.total} events · {counts.critical} critical · {counts.warning} warnings
          </p>
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
                connected
                  ? 'bg-green-500 shadow-green-500/50'
                  : 'bg-gray-500 shadow-gray-500/50'
              }`}
            />
          </span>
          <span className="text-xs text-gray-500">
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-500">Severity:</span>
          <div className="flex gap-1">
            {severityFilters.map((f) => (
              <Button
                key={f.value}
                variant={severityFilter === f.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setSeverityFilter(f.value)}
              >
                {f.label}
                {f.value !== 'all' && (
                  <span className="ml-1 opacity-60">
                    {f.value === 'critical'
                      ? counts.critical
                      : f.value === 'warning'
                        ? counts.warning
                        : counts.info}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Source:</span>
          <div className="flex gap-1">
            {sourceFilters.map((f) => (
              <Button
                key={f.value}
                variant={sourceFilter === f.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setSourceFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-primary" />
          <p className="mt-3 text-sm text-gray-500">Loading alerts...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bell className="h-10 w-10 text-gray-600 mb-3" />
          <p className="text-sm text-gray-500">No alerts match your filters</p>
          <p className="text-xs text-gray-600 mt-1">
            {severityFilter !== 'all' || sourceFilter !== 'all'
              ? 'Try changing your filters'
              : 'Waiting for events...'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event, i) => (
            <AlertCard key={event.id || i} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
