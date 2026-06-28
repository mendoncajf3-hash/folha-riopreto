import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AlertsPage from './pages/Alerts';
import EmployeesPage from './pages/Employees';
import VehiclesPage from './pages/Vehicles';
import RankingsPage from './pages/Rankings';
import AdminPage from './pages/Admin';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="vehicles" element={<VehiclesPage />} />
            <Route path="rankings" element={<RankingsPage />} />
            <Route path="admin" element={
              <ProtectedRoute roles={['SUPERADMIN','ADMIN']}>
                <AdminPage />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
