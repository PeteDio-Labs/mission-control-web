import { useReducer } from 'react';
import { Download } from 'lucide-react';
import { QBittorrentStatus } from '@/components/dashboard/QBittorrentStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { addTorrent } from '@/lib/hooks/useQbittorrent';
import { cn } from '@/lib/utils';

type Category = 'tv-sonarr' | 'radarr';

interface FormState {
  magnetUrl: string;
  category: Category;
  isSubmitting: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
}

type FormAction =
  | { type: 'SET_MAGNET'; payload: string }
  | { type: 'SET_CATEGORY'; payload: Category }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'CLEAR_MESSAGE' };

const initialState: FormState = {
  magnetUrl: '',
  category: 'tv-sonarr',
  isSubmitting: false,
  message: null,
};

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_MAGNET':
      return { ...state, magnetUrl: action.payload };
    case 'SET_CATEGORY':
      return { ...state, category: action.payload };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, message: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, magnetUrl: '', message: { type: 'success', text: 'Torrent added successfully.' } };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, message: { type: 'error', text: action.payload } };
    case 'CLEAR_MESSAGE':
      return { ...state, message: null };
  }
}

export default function QBittorrentPage() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.magnetUrl.startsWith('magnet:')) {
      dispatch({ type: 'SUBMIT_ERROR', payload: 'Please enter a valid magnet link.' });
      return;
    }
    dispatch({ type: 'SUBMIT_START' });
    try {
      await addTorrent(state.magnetUrl, state.category);
      dispatch({ type: 'SUBMIT_SUCCESS' });
      setTimeout(() => dispatch({ type: 'CLEAR_MESSAGE' }), 4000);
    } catch (error) {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to add torrent.',
      });
      setTimeout(() => dispatch({ type: 'CLEAR_MESSAGE' }), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">qBittorrent</h1>
        <p className="text-sm text-muted-foreground">Torrent client status and magnet link submission.</p>
      </div>

      <QBittorrentStatus />

      <Card className="border-white/10 bg-gradient-to-br from-white/5 to-transparent">
        <CardHeader className="border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-500/15 ring-1 ring-orange-500/30">
              <Download className="h-4 w-4 text-orange-400" />
            </div>
            <CardTitle className="text-sm font-semibold">Add Torrent</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="magnet-url" className="text-xs font-medium text-muted-foreground">
                Magnet Link
              </label>
              <Input
                id="magnet-url"
                type="text"
                placeholder="magnet:?xt=urn:btih:..."
                value={state.magnetUrl}
                onChange={(e) => dispatch({ type: 'SET_MAGNET', payload: e.target.value })}
                disabled={state.isSubmitting}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="category" className="text-xs font-medium text-muted-foreground">
                Category
              </label>
              <select
                id="category"
                value={state.category}
                onChange={(e) => dispatch({ type: 'SET_CATEGORY', payload: e.target.value as Category })}
                disabled={state.isSubmitting}
                className="flex h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 transition-all duration-200"
              >
                <option value="tv-sonarr">tv-sonarr</option>
                <option value="radarr">radarr</option>
              </select>
            </div>

            {state.message && (
              <div
                role="status"
                aria-live="polite"
                className={cn(
                  'rounded-lg border p-3 text-sm',
                  state.message.type === 'success'
                    ? 'border-green-500/30 bg-green-500/10 text-green-200'
                    : 'border-red-500/30 bg-red-500/10 text-red-200'
                )}
              >
                {state.message.text}
              </div>
            )}

            <Button type="submit" disabled={state.isSubmitting} className="w-full">
              {state.isSubmitting ? 'Adding...' : 'Add Torrent'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
