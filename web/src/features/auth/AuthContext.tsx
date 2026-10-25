import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { LoginRequest, Usuario } from '../../domain/entities';
import { authApi } from '../../infrastructure/api/services';
import { onUnauthorized } from '../../infrastructure/http/api-client';
import { storageService } from '../../infrastructure/storage/storage.service';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly isInitializing: boolean;
  readonly isAuthenticated: boolean;
  readonly user: Usuario | null;
  readonly login: (credentials: LoginRequest) => Promise<void>;
  readonly logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  readonly children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [status, setStatus] = useState<AuthStatus>(() =>
    storageService.getToken() ? 'initializing' : 'unauthenticated'
  );
  const [user, setUser] = useState<Usuario | null>(null);

  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      storageService.clearToken();
      storageService.clearEventoSelecionado();
      setUser(null);
      setStatus('unauthenticated');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const token = storageService.getToken();

    if (!token) {
      setStatus('unauthenticated');
      setUser(null);
      return;
    }

    setStatus('initializing');

    authApi
      .verificar()
      .then((response) => {
        if (!isMounted) return;
        if (response?.success && response.data?.usuario) {
          setUser(response.data.usuario);
          setStatus('authenticated');
        } else {
          storageService.clearToken();
          setUser(null);
          setStatus('unauthenticated');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        storageService.clearToken();
        setUser(null);
        setStatus('unauthenticated');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    const response = await authApi.login(credentials);
    if (!response.success || !response.data?.token || !response.data?.usuario) {
      throw new Error(response.message || 'Credenciais inválidas.');
    }

    storageService.setToken(response.data.token);
    setUser(response.data.usuario);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Mesmo se o endpoint falhar, limpa a sessão local com segurança
    } finally {
      storageService.clearToken();
      storageService.clearEventoSelecionado();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isInitializing: status === 'initializing',
      isAuthenticated: status === 'authenticated',
      user,
      login,
      logout,
    }),
    [status, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider>.');
  }
  return context;
}

/**
 * Guard de rotas protegidas que aguarda `status === 'initializing'` antes de decidir
 * pelo redirecionamento, eliminando a race condition no reload (F5).
 */
export function ProtectedRoute(): React.ReactElement {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'initializing') {
    return (
      <div
        role="status"
        aria-label="Verificando sessão"
        className="flex min-h-screen items-center justify-center bg-[#090b11] text-slate-200"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium text-slate-400">
            Restaurando sua sessão...
          </span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
