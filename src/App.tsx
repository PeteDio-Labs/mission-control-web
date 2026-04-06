import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/Dashboard';
import AlertsPage from '@/pages/Alerts';
import InventoryPage from '@/pages/Inventory';
import QBittorrentPage from '@/pages/QBittorrent';
import ProxmoxPage from '@/pages/Proxmox';
import ArgoCDPage from '@/pages/ArgoCD';
import MetricsPage from '@/pages/Metrics';
import EventsPage from '@/pages/Events';
import AgentsPage from '@/pages/Agents';

function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/qbittorrent" element={<QBittorrentPage />} />
          <Route path="/proxmox" element={<ProxmoxPage />} />
          <Route path="/argocd" element={<ArgoCDPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
        </Routes>
      </AppShell>
    </AuthProvider>
  );
}

export default App;
