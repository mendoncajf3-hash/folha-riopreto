import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { setOnUnauthorized } from "../lib/api";
import { AppShell } from "../shared/layout/AppShell";
import { LoginPage } from "../modules/auth/LoginPage";
import { DashboardPage } from "../modules/dashboard/DashboardPage";
import { EscalasPage } from "../modules/escalas/EscalasPage";
import { AdminPage } from "../modules/admin/AdminPage";
import { ComingSoon } from "../modules/placeholder/ComingSoon";

function Protected({ children }: { children: React.ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status === "loading") {
    return <div className="grid h-full place-items-center text-slate-400">Carregando…</div>;
  }
  if (status === "anonymous") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function UnauthorizedBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    setOnUnauthorized(() => {
      useAuth.setState({ status: "anonymous", user: null });
      navigate("/login");
    });
  }, [navigate]);
  return null;
}

export function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter>
      <UnauthorizedBridge />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/escalas" element={<EscalasPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/tarefas" element={<ComingSoon title="Gestão de Tarefas" />} />
          <Route path="/leitura" element={<ComingSoon title="Planejamento de Leitura" />} />
          <Route path="/diario" element={<ComingSoon title="Diário de Bordo" />} />
          <Route path="/indicadores" element={<ComingSoon title="Indicadores" />} />
          <Route path="/documentos" element={<ComingSoon title="Documentos" />} />
          <Route path="/integracoes" element={<ComingSoon title="Integrações" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
