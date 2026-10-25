import { apiClient } from '../http/api-client';
import type {
  CasalCompleto,
  Evento,
  Inscricao,
  LoginRequest,
  LoginResponse,
  RegistroPayload,
  Usuario,
} from '../../domain/entities';

export interface VerificarTokenResponse {
  readonly success: boolean;
  readonly message?: string;
  readonly data?: {
    readonly usuario: Usuario;
  };
}

export interface NovaInscricaoPayload {
  readonly casal_id: number;
  readonly evento_id: number;
  readonly tipo_participante: 'encontrista' | 'convidado' | 'equipe';
  readonly status?: 'pendente' | 'confirmada' | 'cancelada';
  readonly padrinho_id?: number;
  readonly quarto?: string;
}

export interface RegistrarInscricaoResponse {
  readonly success?: boolean;
  readonly message?: string;
  readonly urlCompleta?: string;
  readonly data?: {
    readonly urlCompleta?: string;
    readonly [key: number]: unknown;
  };
}

export interface GerarConvitePayload {
  readonly casal_id: number;
  readonly evento_id: number;
  readonly padrinho_id?: number;
  readonly url_inscricao?: string;
}

export interface UrlCompletaResponse {
  readonly urlCompleta: string;
}

export const authApi = {
  login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/api/auth/login', credentials);
  },

  logout(): Promise<{ readonly success?: boolean }> {
    return apiClient.post<{ readonly success?: boolean }>('/api/auth/logout', {});
  },

  verificar(): Promise<VerificarTokenResponse> {
    return apiClient.get<VerificarTokenResponse>('/api/auth/verificar');
  },
} as const;

export const casaisApi = {
  listar(): Promise<CasalCompleto[]> {
    return apiClient.get<CasalCompleto[]>('/api/casais');
  },

  buscarPorId(id: number): Promise<CasalCompleto> {
    return apiClient.get<CasalCompleto>(`/api/casais/${id}`);
  },

  criar(payload: RegistroPayload): Promise<CasalCompleto> {
    return apiClient.post<CasalCompleto>('/api/casais', payload);
  },

  atualizar(id: number, payload: RegistroPayload): Promise<CasalCompleto> {
    return apiClient.put<CasalCompleto>(`/api/casais/${id}`, payload);
  },
} as const;

export const eventosApi = {
  listar(): Promise<Evento[]> {
    return apiClient.get<Evento[]>('/api/eventos');
  },

  buscarPorId(id: number): Promise<Evento> {
    return apiClient.get<Evento>(`/api/eventos/${id}`);
  },

  criar(evento: Omit<Evento, 'id'>): Promise<Evento> {
    return apiClient.post<Evento>('/api/eventos', evento);
  },
} as const;

export const inscricoesApi = {
  listarPorEvento(eventoId: number): Promise<Inscricao[]> {
    return apiClient.get<Inscricao[]>(`/api/inscricoes/evento/${eventoId}`);
  },

  registrar(payload: NovaInscricaoPayload): Promise<RegistrarInscricaoResponse> {
    return apiClient.post<RegistrarInscricaoResponse>('/api/inscricoes', payload);
  },

  atualizar(id: number, payload: Partial<Inscricao> | RegistroPayload): Promise<Inscricao> {
    return apiClient.put<Inscricao>(`/api/inscricoes/${id}`, payload);
  },

  deletar(inscricaoId: number): Promise<{ readonly success?: boolean }> {
    return apiClient.delete<{ readonly success?: boolean }>(
      `/api/inscricoes/${inscricaoId}`
    );
  },
} as const;

export const urlsUnicasApi = {
  gerarConvite(payload: GerarConvitePayload): Promise<RegistrarInscricaoResponse> {
    return apiClient.post<RegistrarInscricaoResponse>(
      '/api/urls-unicas/gerar-convite',
      payload
    );
  },

  obterUrlPorInscricao(idInscricao: number): Promise<UrlCompletaResponse> {
    return apiClient.get<UrlCompletaResponse>(
      `/api/urls-unicas/inscricao/${idInscricao}`
    );
  },
} as const;
