import { storageService } from '../storage/storage.service';

export class ApiError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifyUnauthorized(): void {
  storageService.clearToken();
  for (const listener of unauthorizedListeners) {
    listener();
  }
}

function isInternalApiUrl(url: string): boolean {
  return url.startsWith('/api/') || url === '/api';
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: unknown,
  customHeaders?: Record<string, string>
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...customHeaders,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Injeção de Authorization: Bearer <token> ESTRITAMENTE restrita a rotas '/api/*'
  if (isInternalApiUrl(url)) {
    const token = storageService.getToken();
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let parsedBody: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      parsedBody = await response.json();
    } catch {
      parsedBody = null;
    }
  } else {
    try {
      parsedBody = await response.text();
    } catch {
      parsedBody = null;
    }
  }

  if (response.status === 401 && isInternalApiUrl(url)) {
    notifyUnauthorized();
  }

  if (!response.ok) {
    const errorMessage =
      typeof parsedBody === 'object' &&
      parsedBody !== null &&
      'message' in parsedBody &&
      typeof (parsedBody as { message: unknown }).message === 'string'
        ? (parsedBody as { message: string }).message
        : `Erro na requisição HTTP (${response.status})`;

    throw new ApiError(errorMessage, response.status, parsedBody);
  }

  return parsedBody as T;
}

export const apiClient = {
  get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return request<T>('GET', url, undefined, headers);
  },
  post<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>('POST', url, body, headers);
  },
  put<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>('PUT', url, body, headers);
  },
  delete<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return request<T>('DELETE', url, undefined, headers);
  },
} as const;
