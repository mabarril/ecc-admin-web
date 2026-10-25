export interface ViaCepResponse {
  readonly cep: string;
  readonly logradouro: string;
  readonly complemento: string;
  readonly bairro: string;
  readonly localidade: string;
  readonly uf: string;
  readonly erro?: boolean | string;
}

export interface EnderecoViaCep {
  readonly endereco: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly estado: string;
  readonly cep: string;
}

const VIACEP_TIMEOUT_MS = 5000;

/**
 * Cliente isolado para consulta de CEP no ViaCEP.
 * - Nunca envia header Authorization (evita erro de preflight CORS e vazamento de JWT).
 * - Aplica timeout de 5s via AbortController, credentials: 'omit' e sanitização de saída.
 */
export async function fetchAddressByCep(
  rawCep: string
): Promise<EnderecoViaCep | null> {
  const digits = String(rawCep ?? '').replace(/\D/g, '');
  if (digits.length !== 8) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VIACEP_TIMEOUT_MS);

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      method: 'GET',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar ViaCEP (${response.status})`);
    }

    const data = (await response.json()) as ViaCepResponse;
    if (!data || data.erro) {
      return null;
    }

    return {
      endereco: String(data.logradouro ?? '').trim().slice(0, 200),
      bairro: String(data.bairro ?? '').trim().slice(0, 120),
      cidade: String(data.localidade ?? '').trim().slice(0, 120),
      estado: String(data.uf ?? '').trim().slice(0, 10),
      cep: digits,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
