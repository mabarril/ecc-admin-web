const TOKEN_KEY = 'token';
const EVENTO_KEY = 'eventoSelecionadoId';

export const storageService = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore storage quota or private mode errors
    }
  },

  clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  },

  getEventoSelecionado(): number | null {
    try {
      const raw = sessionStorage.getItem(EVENTO_KEY);
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  },

  setEventoSelecionado(id: number): void {
    try {
      sessionStorage.setItem(EVENTO_KEY, String(id));
    } catch {
      // Ignore storage errors
    }
  },

  clearEventoSelecionado(): void {
    try {
      sessionStorage.removeItem(EVENTO_KEY);
    } catch {
      // Ignore storage errors
    }
  },
} as const;
