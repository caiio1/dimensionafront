import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SelectedDateProvider } from "@/hooks/useSelectedDate";
// Unified login page
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Avaliacoes from "./pages/Avaliacoes";
import RelatoriosMensal from "./pages/RelatoriosMensal";
import Hospitais from "./pages/Hospitais";
import Unidades from "./pages/Unidades";
import Colaboradores from "./pages/Colaboradores";
import MetodosScp from "./pages/MetodosScp";
import Cargos from "./pages/Cargos";
import Leitos from "./pages/Leitos";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import ApiDocs from "./pages/ApiDocs";
import HospitalDetails from "./pages/HospitalDetails";
import UnidadeDetails from "./pages/UnidadeDetails";
import MeuHospital from "./pages/MeuHospital";
import MinhaUnidade from "./pages/MinhaUnidade";
import IniciarAvaliacao from "./pages/IniciarAvaliacao";

import ListaDias from "./pages/ListaDias";
import PrimeiroAcesso from "./pages/PrimeiroAcesso";

// Unidades de Não-Internação
import UnidadesNaoInternacao from "./pages/UnidadesNaoInternacao";
import UnidadeNaoInternacaoDetails from "./pages/UnidadeNaoInternacaoDetails";
import SitioFuncionalDetails from "./pages/SitioFuncionalDetails";

const queryClient = new QueryClient();

// Rota protegida para ADMIN
function AdminRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || user.tipo !== "ADMIN")
    return <Navigate to="/meu-hospital" replace />;
  return children;
}

// Rota protegida para COLAB
function ColabRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user || user.tipo !== "COLAB")
    return <Navigate to="/dashboard" replace />;
  return children;
}

// Rota protegida para ambos ADMIN e COLAB
function AuthenticatedRoute({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SelectedDateProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              {/* legacy separate login routes removed - unified single /login route */}
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Rotas ADMIN */}
              <Route
                path="/dashboard"
                element={
                  <AdminRoute>
                    <Dashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/avaliacoes"
                element={
                  <AdminRoute>
                    <Avaliacoes />
                  </AdminRoute>
                }
              />
              <Route
                path="/relatorios/mensal"
                element={
                  <AdminRoute>
                    <RelatoriosMensal />
                  </AdminRoute>
                }
              />
              <Route
                path="/hospitais"
                element={
                  <AdminRoute>
                    <Hospitais />
                  </AdminRoute>
                }
              />
              <Route
                path="/hospitais/:id"
                element={
                  <AdminRoute>
                    <HospitalDetails />
                  </AdminRoute>
                }
              />

              {/* Rotas para Unidades de Não-Internação */}
              <Route
                path="/hospitais/:hospitalId/unidades-nao-internacao"
                element={
                  <AdminRoute>
                    <UnidadesNaoInternacao />
                  </AdminRoute>
                }
              />
              <Route
                path="/hospitais/:hospitalId/unidades-nao-internacao/:unidadeId"
                element={
                  <AdminRoute>
                    <UnidadeNaoInternacaoDetails />
                  </AdminRoute>
                }
              />
              <Route
                path="/hospitais/:hospitalId/unidades-nao-internacao/:unidadeId/sitios/:sitioId"
                element={
                  <AdminRoute>
                    <SitioFuncionalDetails />
                  </AdminRoute>
                }
              />

              <Route
                path="/unidades"
                element={
                  <AdminRoute>
                    <Unidades />
                  </AdminRoute>
                }
              />
              <Route
                path="/unidades/:id/leitos"
                element={
                  <AdminRoute>
                    <UnidadeDetails />
                  </AdminRoute>
                }
              />
              <Route
                path="/colaboradores"
                element={
                  <AdminRoute>
                    <Colaboradores />
                  </AdminRoute>
                }
              />
              <Route
                path="/metodos-scp"
                element={
                  <AdminRoute>
                    <MetodosScp />
                  </AdminRoute>
                }
              />
              <Route
                path="/cargos"
                element={
                  <AdminRoute>
                    <Cargos />
                  </AdminRoute>
                }
              />
              <Route
                path="/leitos"
                element={
                  <AdminRoute>
                    <Leitos />
                  </AdminRoute>
                }
              />
              <Route
                path="/qualitativo/areas"
                element={
                  <AdminRoute>
                    <Reports />
                  </AdminRoute>
                }
              />
              <Route
                path="/qualitativo/settings"
                element={
                  <AdminRoute>
                    <Settings />
                  </AdminRoute>
                }
              />
              <Route
                path="/api-docs"
                element={
                  <AdminRoute>
                    <ApiDocs />
                  </AdminRoute>
                }
              />
              <Route
                path="/qualitativo/kpis"
                element={
                  <AdminRoute>
                    <ApiDocs />
                  </AdminRoute>
                }
              />

              <Route
                path="/lista-dias/:hospitalId/:unidadeId"
                element={
                  <AuthenticatedRoute>
                    <ListaDias />
                  </AuthenticatedRoute>
                }
              />
              {/* Rotas COLAB */}
              <Route
                path="/meu-hospital"
                element={
                  <ColabRoute>
                    <MeuHospital />
                  </ColabRoute>
                }
              />
              <Route
                path="/minha-unidade/:id"
                element={
                  <AuthenticatedRoute>
                    <MinhaUnidade />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/minha-unidade/:unidadeId/leito/:leitoId/avaliar"
                element={
                  <ColabRoute>
                    <IniciarAvaliacao />
                  </ColabRoute>
                }
              />
              <Route
                path="/primeiro-acesso"
                element={
                  <ColabRoute>
                    <PrimeiroAcesso />
                  </ColabRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </SelectedDateProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
