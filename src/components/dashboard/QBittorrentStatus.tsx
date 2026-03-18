import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, AlertCircle, CheckCircle2, HardDrive } from 'lucide-react';
import { useQBittorrentStatus, useQBittorrentTorrents, useQBittorrentTransfer } from '@/lib/hooks/useQbittorrent';

const FILTERS = ['all', 'downloading', 'seeding', 'completed', 'paused'] as const;
type Filter = typeof FILTERS[number];

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1048576) return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${bytesPerSec} B/s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${bytes} B`;
}

function stateColor(state: string): string {
  switch (state) {
    case 'downloading':
    case 'forcedDL':
    case 'metaDL':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'uploading':
    case 'forcedUP':
    case 'stalledUP':
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'pausedDL':
    case 'pausedUP':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'stalledDL':
    case 'queuedDL':
    case 'queuedUP':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    case 'error':
    case 'missingFiles':
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function stateLabel(state: string): string {
  switch (state) {
    case 'forcedDL': return 'downloading';
    case 'forcedUP': return 'seeding';
    case 'stalledUP': return 'seeding';
    case 'stalledDL': return 'stalled';
    case 'pausedDL':
    case 'pausedUP': return 'paused';
    case 'queuedDL':
    case 'queuedUP': return 'queued';
    case 'metaDL': return 'metadata';
    case 'missingFiles': return 'missing';
    default: return state;
  }
}

export function QBittorrentStatus() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data: statusData, isLoading: statusLoading, error: statusError } = useQBittorrentStatus();
  const { data: torrentsData, isLoading: torrentsLoading, error: torrentsError } = useQBittorrentTorrents(
    filter === 'all' ? undefined : filter
  );
  const { data: transferData, isLoading: transferLoading, error: transferError } = useQBittorrentTransfer();

  const isLoading = statusLoading || torrentsLoading || transferLoading;
  const error = statusError || torrentsError || transferError;

  if (error) {
    return (
      <Card className="border-destructive/50 hover:border-destructive/70 transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <Download className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle className="text-sm font-medium">qBittorrent</CardTitle>
          </div>
          <AlertCircle className="h-5 w-5 text-destructive/60" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">Error</div>
          <p className="text-xs text-muted-foreground mt-1">Failed to load qBittorrent status</p>
        </CardContent>
      </Card>
    );
  }

  const connected = statusData?.data?.connected ?? false;
  const torrents = torrentsData?.data ?? [];
  const transfer = transferData?.data;
  const activeTorrents = torrents.filter((t) =>
    ['downloading', 'forcedDL', 'uploading', 'forcedUP', 'metaDL'].includes(t.state)
  );

  return (
    <Card className="border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5 bg-gradient-to-br from-white/5 to-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg transition-all ${connected ? 'bg-orange-500/15 ring-1 ring-orange-500/30' : 'bg-gray-700/20'}`}>
            <Download className={`h-4 w-4 transition-colors ${connected ? 'text-orange-400' : 'text-gray-500'}`} />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">qBittorrent</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Torrent client</p>
          </div>
        </div>
        {connected && <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />}
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <Badge className="bg-green-500/20 text-green-300 shadow-sm shadow-green-500/20 border-green-500/30 font-medium text-xs">
                    Connected
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <Badge className="bg-red-500/20 text-red-300 shadow-sm shadow-red-500/20 border-red-500/30 font-medium text-xs">
                    Disconnected
                  </Badge>
                </>
              )}
            </div>

            {/* Transfer speeds */}
            {transfer && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Download className="h-3 w-3 text-blue-400" />
                    <span className="text-xs text-gray-500">Download</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatSpeed(transfer.dl_info_speed)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Upload className="h-3 w-3 text-green-400" />
                    <span className="text-xs text-gray-500">Upload</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatSpeed(transfer.up_info_speed)}</span>
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-1 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filter === f
                      ? 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Active count */}
            <p className="text-xs text-gray-500">
              {activeTorrents.length} active / {torrents.length} total
            </p>

            {/* Torrent list */}
            {torrents.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {torrents
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((torrent) => (
                  <div key={torrent.hash} className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-white truncate" title={torrent.name}>
                        {torrent.name}
                      </span>
                      <Badge className={`${stateColor(torrent.state)} text-[10px] shrink-0`}>
                        {stateLabel(torrent.state)}
                      </Badge>
                    </div>
                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-3 w-3 text-gray-500 shrink-0" />
                      <div className="flex-1 h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-500"
                          style={{ width: `${Math.round(torrent.progress * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {Math.round(torrent.progress * 100)}%
                      </span>
                    </div>
                    {/* Speeds */}
                    {(torrent.dl_speed > 0 || torrent.up_speed > 0) && (
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        {torrent.dl_speed > 0 && (
                          <span className="flex items-center gap-1">
                            <Download className="h-2.5 w-2.5 text-blue-400" />
                            {formatSpeed(torrent.dl_speed)}
                          </span>
                        )}
                        {torrent.up_speed > 0 && (
                          <span className="flex items-center gap-1">
                            <Upload className="h-2.5 w-2.5 text-green-400" />
                            {formatSpeed(torrent.up_speed)}
                          </span>
                        )}
                        {torrent.size && (
                          <span>{formatBytes(torrent.size)}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500">No torrents found</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
