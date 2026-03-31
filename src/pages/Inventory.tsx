import { useReducer } from 'react';
import { FilterBar } from '@/components/inventory/FilterBar';
import { UnifiedResourcesTable } from '@/components/inventory/UnifiedResourcesTable';
import { triggerInventorySync } from '@/lib/hooks/useInventory';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface InventoryState {
  search: string;
  isSyncing: boolean;
  syncMessage: { type: 'success' | 'error'; text: string } | null;
}

type InventoryAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SYNC_START' }
  | { type: 'SYNC_SUCCESS'; payload: string }
  | { type: 'SYNC_ERROR'; payload: string }
  | { type: 'CLEAR_MESSAGE' };

const initialState: InventoryState = {
  search: '',
  isSyncing: false,
  syncMessage: null,
};

function reducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, search: action.payload };
    case 'SYNC_START':
      return { ...state, isSyncing: true, syncMessage: null };
    case 'SYNC_SUCCESS':
      return { ...state, isSyncing: false, syncMessage: { type: 'success', text: action.payload } };
    case 'SYNC_ERROR':
      return { ...state, isSyncing: false, syncMessage: { type: 'error', text: action.payload } };
    case 'CLEAR_MESSAGE':
      return { ...state, syncMessage: null };
  }
}

export default function InventoryPage() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleRefresh = async () => {
    dispatch({ type: 'SYNC_START' });
    try {
      const result = await triggerInventorySync();
      dispatch({
        type: 'SYNC_SUCCESS',
        payload: `Synced: ${result.data.hosts_count} hosts, ${result.data.workloads_count} workloads`,
      });
      setTimeout(() => dispatch({ type: 'CLEAR_MESSAGE' }), 3000);
    } catch (error) {
      dispatch({
        type: 'SYNC_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to sync inventory',
      });
      setTimeout(() => dispatch({ type: 'CLEAR_MESSAGE' }), 3000);
    }
  };

  return (
    <article className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-blue-400" />
            Inventory
          </h1>
          <p className="mt-1 text-sm text-gray-500">All infrastructure resources across Kubernetes, Proxmox, and ArgoCD.</p>
        </div>
        <Button onClick={handleRefresh} disabled={state.isSyncing} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${state.isSyncing ? 'animate-spin' : ''}`} />
          {state.isSyncing ? 'Syncing...' : 'Refresh Now'}
        </Button>
      </header>

      {state.syncMessage && (
        <aside
          role="status"
          aria-live="polite"
          className={`glass-card p-4 rounded-lg border ${
            state.syncMessage.type === 'success'
              ? 'border-green-500/30 bg-green-500/10 text-green-200'
              : 'border-red-500/30 bg-red-500/10 text-red-200'
          }`}
        >
          {state.syncMessage.text}
        </aside>
      )}

      <FilterBar search={state.search} onSearchChange={(v) => dispatch({ type: 'SET_SEARCH', payload: v })} />

      <UnifiedResourcesTable search={state.search} />
    </article>
  );
}
