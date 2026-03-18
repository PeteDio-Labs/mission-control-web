import { InventorySummary } from '@/components/dashboard/InventorySummary';
import { ProxmoxStatus } from '@/components/dashboard/ProxmoxStatus';
import { ArgoCDStatus } from '@/components/dashboard/ArgoCDStatus';
import { HealthStatus } from '@/components/layout/HealthStatus';
import { EventFeed } from '@/components/dashboard/EventFeed';
import { QBittorrentStatus } from '@/components/dashboard/QBittorrentStatus';
import { PrometheusStatus } from '@/components/dashboard/PrometheusStatus';
import { ServiceStatusRow } from '@/components/dashboard/ServiceStatusRow';

export default function DashboardPage() {
  return (
    <article className="space-y-6">
      {/* Top section: Overview */}
      <section>
        <h1 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-blue-400" />
          Dashboard
        </h1>

        <ServiceStatusRow />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2">
            <InventorySummary />
          </div>
          <div className="lg:col-span-1">
            <HealthStatus />
          </div>
        </div>
      </section>

      {/* Middle section: Infrastructure */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-gray-500 to-transparent" />
            Infrastructure
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ProxmoxStatus />
          <ArgoCDStatus />
          <PrometheusStatus />
        </div>
      </section>

      {/* Services section: qBittorrent + Events */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-gray-500 to-transparent" />
            Services & Activity
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <QBittorrentStatus />
          <EventFeed />
        </div>
      </section>
    </article>
  );
}
