import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import AppLayout from './components/layout/AppLayout';
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const EquiposPage = lazy(() => import('./pages/equipos/EquiposPage'));
const FallasPage = lazy(() => import('./pages/fallas/FallasPage'));
const MantenimientosPage = lazy(() => import('./pages/mantenimientos/MantenimientosPage'));
const UsuariosPage = lazy(() => import('./pages/usuarios/UsuariosPage'));
const ReportesPage = lazy(() => import('./pages/reportes/ReportesPage'));
const EquipoDetallePage = lazy(() => import('./pages/equipos/EquipoDetallePage'));
const PerfilPage = lazy(() => import('./pages/PerfilPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ConfiguracionPage = lazy(() => import('./pages/configuracion/ConfiguracionPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 0 },
  },
});

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-slate-500" role="status">Cargando…</div>}>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<Navigate to="/login" replace />} />

          {/* Rutas privadas */}
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="perfil" element={<PerfilPage />} />
            <Route path="equipos/:id" element={<EquipoDetallePage />} />
            <Route path="equipos" element={<EquiposPage />} />
            <Route path="fallas" element={<FallasPage />} />
            <Route path="mantenimientos" element={<MantenimientosPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
