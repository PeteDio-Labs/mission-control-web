import { PrometheusStatus } from '@/components/dashboard/PrometheusStatus';
import { HealthStatus } from '@/components/layout/HealthStatus';

export default function MetricsPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-purple-400" />
        Metrics
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
        <PrometheusStatus />
        <HealthStatus />
      </div>
    </article>
  );
}
