import { ArgoCDStatus } from '@/components/dashboard/ArgoCDStatus';

export default function ArgoCDPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-amber-400" />
        ArgoCD
      </h1>
      <ArgoCDStatus />
    </article>
  );
}
