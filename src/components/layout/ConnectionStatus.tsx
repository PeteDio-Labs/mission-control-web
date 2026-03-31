import { useEffect, useState } from 'react';
import { useHealth } from '@/lib/hooks/useInventory';

export function ConnectionStatus() {
  const { isLoading, error } = useHealth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50 animate-pulse" />
        <span className="font-medium">Connecting...</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50 animate-pulse" />
        <span className="font-medium">Connecting...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
        <span className="font-medium">Disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
      <span className="font-medium">Connected</span>
    </div>
  );
}
