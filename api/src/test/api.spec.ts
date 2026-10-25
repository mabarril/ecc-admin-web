import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp, createInMemoryDependencies } from '../presentation/app.js';

describe('ECC Admin API - Integração & Casos de Uso', () => {
  let token = '';

  const getTestApp = async () => {
    const app = await buildApp(createInMemoryDependencies());
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'admin@ecc.com.br',
        senha: 'admin123',
      },
    });
    const body = loginRes.json();
    token = body.data.token;
    return app;
  };

  beforeEach(() => {
    token = '';
  });

  it('GET /api/health deve retornar status ok', async () => {
    const app = await buildApp(createInMemoryDependencies());
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });

  it('POST /api/auth/login deve autenticar admin e GET /api/auth/verificar deve validar o JWT', async () => {
    const app = await getTestApp();
    expect(token).toBeTruthy();

    const verifyRes = await app.inject({
      method: 'GET',
      url: '/api/auth/verificar',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.json().data.usuario.email).toBe('admin@ecc.com.br');

    // Testa revogação real do JWT após POST /api/auth/logout (AppSec Hardening)
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(logoutRes.statusCode).toBe(200);

    const verifyAfterLogoutRes = await app.inject({
      method: 'GET',
      url: '/api/auth/verificar',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(verifyAfterLogoutRes.statusCode).toBe(401);
  });

  it('POST /api/casais e PUT /api/casais/:id devem criar e atualizar casal com cônjuges e filhos', async () => {
    const app = await getTestApp();

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/casais',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        casal: {
          data_casamento: '2020-10-10',
          endereco: 'SQS 105 Bloco C',
          bairro: 'Asa Sul',
          cidade: 'Brasília',
          cep: '70344-030',
        },
        pessoas: [
          {
            tipo: 'esposo',
            nome_completo: 'Marcos Paulo Oliveira',
            nome_social: 'Marcos',
            email: 'marcos@ecc.com.br',
            celular: '(61) 98888-7777',
            problema_saude: false,
            medicamento_especial: false,
            diabetico: false,
            dieta_alimentar: 'não',
            religiao: 'Católica',
          },
          {
            tipo: 'esposa',
            nome_completo: 'Juliana Oliveira',
            nome_social: 'Juliana',
            email: 'juliana@ecc.com.br',
            celular: '(61) 98888-6666',
            problema_saude: false,
            medicamento_especial: false,
            diabetico: true,
            dieta_alimentar: 'ovolactovegetariano',
            religiao: 'Católica',
          },
        ],
        filhos: [
          {
            nome_completo: 'Pedro Oliveira',
            data_nascimento: '2022-04-12',
          },
        ],
      },
    });

    expect(createRes.statusCode).toBe(201);
    const novoCasal = createRes.json();
    expect(novoCasal.id).toBe(2);
    expect(novoCasal.pessoas).toHaveLength(2);
    expect(novoCasal.filhos).toHaveLength(1);
  });

  it('POST /api/inscricoes deve inscrever casal no evento e gerar URL única', async () => {
    const app = await getTestApp();

    // Cria segundo casal
    const createCasalRes = await app.inject({
      method: 'POST',
      url: '/api/casais',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        casal: {
          endereco: 'Rua 10',
          bairro: 'Águas Claras',
          cidade: 'Brasília',
          cep: '71900-000',
        },
        pessoas: [
          {
            tipo: 'esposo',
            nome_completo: 'João Pedro',
            nome_social: 'João',
            problema_saude: false,
            medicamento_especial: false,
            diabetico: false,
            dieta_alimentar: 'não',
            religiao: 'Católica',
          },
          {
            tipo: 'esposa',
            nome_completo: 'Maria Clara',
            nome_social: 'Maria',
            problema_saude: false,
            medicamento_especial: false,
            diabetico: false,
            dieta_alimentar: 'não',
            religiao: 'Católica',
          },
        ],
        filhos: [],
      },
    });
    const casalId = createCasalRes.json().id;

    const inscRes = await app.inject({
      method: 'POST',
      url: '/api/inscricoes',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        casal_id: casalId,
        evento_id: 1,
        tipo_participante: 'convidado',
        status: 'pendente',
        padrinho_id: 1,
      },
    });

    expect(inscRes.statusCode).toBe(201);
    expect(inscRes.json().urlCompleta).toContain('http');
  });
});
