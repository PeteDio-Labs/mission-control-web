import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import DashboardPage from '@/pages/Dashboard';
import AlertsPage from '@/pages/Alerts';
import InventoryPage from '@/pages/Inventory';

function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
        </Routes>
      </AppShell>
    </AuthProvider>
  );
}

export default App;
