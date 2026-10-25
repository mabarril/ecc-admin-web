import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, ProtectedRoute } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ListaCasaisPage } from '../features/casais/ListaCasaisPage';
import { FormCadastroPage } from '../features/casais/FormCadastroPage';
import { ListaInscricoesPage } from '../features/inscricoes/ListaInscricoesPage';
import { AppShell } from '../shared/ui/AppShell';
import { ToastProvider } from '../shared/ui/Toast';

const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App({
  queryClient = defaultQueryClient,
}: {
  queryClient?: QueryClient;
}): React.ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/lista-inscricao" element={<ListaInscricoesPage />} />
                  {/* Redirect legado para não quebrar links/favoritos antigos */}
                  <Route
                    path="/lista-incricao"
                    element={<Navigate to="/lista-inscricao" replace />}
                  />
                  <Route path="/lista-cadastro" element={<ListaCasaisPage />} />
                  <Route path="/registro" element={<FormCadastroPage />} />
                  <Route path="/registro/:id" element={<FormCadastroPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
