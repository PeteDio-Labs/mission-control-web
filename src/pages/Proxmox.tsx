import { ProxmoxStatus } from '@/components/dashboard/ProxmoxStatus';

export default function ProxmoxPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-green-400" />
        Proxmox
      </h1>
      <ProxmoxStatus />
    </article>
  );
}
