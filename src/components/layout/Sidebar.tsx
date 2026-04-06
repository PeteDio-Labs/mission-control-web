import { Link, useLocation } from 'react-router-dom';
import { Home, Server, Bell, Download, GitBranch, Activity, Radio, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

type NavGroup = {
  label: string;
  items: { href: string; label: string; icon: React.ElementType }[];
};

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/', label: 'Dashboard', icon: Home },
      { href: '/events', label: 'Events', icon: Radio },
      { href: '/alerts', label: 'Alerts', icon: Bell },
      { href: '/agents', label: 'Agents', icon: Bot },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { href: '/proxmox', label: 'Proxmox', icon: Server },
      { href: '/argocd', label: 'ArgoCD', icon: GitBranch },
      { href: '/metrics', label: 'Metrics', icon: Activity },
    ],
  },
  {
    label: 'Resources',
    items: [
      { href: '/inventory', label: 'Inventory', icon: Server },
      { href: '/qbittorrent', label: 'qBittorrent', icon: Download },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 glass-panel border-r border-white/[0.08] overflow-y-auto">
      <nav className="flex flex-col gap-6 p-3 pt-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-white/[0.08] text-white'
                        : 'text-gray-500 hover:bg-white/[0.05] hover:text-gray-300'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-blue-400" />
                    )}
                    <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-400' : 'text-gray-500')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
