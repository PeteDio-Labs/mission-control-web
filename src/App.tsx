import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/Dashboard';
import AlertsPage from '@/pages/Alerts';
import InventoryPage from '@/pages/Inventory';
import ProxmoxPage from '@/pages/Proxmox';
import ArgoCDPage from '@/pages/ArgoCD';
import MetricsPage from '@/pages/Metrics';
import EventsPage from '@/pages/Events';
import AgentsPage from '@/pages/Agents';
import PlansPage from '@/pages/Plans';
import PlanDetailPage from '@/pages/PlanDetail';
import RoadmapPage from '@/pages/Roadmap';
import RoadmapDetailPage from '@/pages/RoadmapDetail';
import SettingsPage from '@/pages/Settings';

function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/:id" element={<PlanDetailPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/roadmap/:id" element={<RoadmapDetailPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/proxmox" element={<ProxmoxPage />} />
          <Route path="/argocd" element={<ArgoCDPage />} />
          <Route path="/metrics" element={<MetricsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </AuthProvider>
  );
}

export default App;
