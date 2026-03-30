import { Link, useLocation } from 'react-router-dom';
import { Home, Server, Bell, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/inventory', label: 'Inventory', icon: Server },
  { href: '/qbittorrent', label: 'qBittorrent', icon: Download },
  // { href: '/tasks', label: 'Tasks', icon: ListTodo },
  // { href: '/usage', label: 'Usage', icon: BarChart3 },
  // { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 glass-panel border-r border-white/[0.08]">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                  : 'text-muted-foreground hover:bg-white/[0.06] hover:text-foreground hover:shadow-sm'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
