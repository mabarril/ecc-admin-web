import { randomUUID } from 'node:crypto';
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  AppDependencies,
  AuthUseCases,
  CasalUseCases,
  EventoUseCases,
  InscricaoUseCases,
} from '../application/use-cases/index.js';
import {
  eventoPayloadSchema,
  gerarConvitePayloadSchema,
  inscricaoCreatePayloadSchema,
  inscricaoUpdatePayloadSchema,
  loginRequestSchema,
  registroCasalPayloadSchema,
} from '../application/schemas/api.schemas.js';
import { DomainError, UnauthorizedError } from '../domain/errors/domain-error.js';
import {
  InMemoryCasalRepository,
  InMemoryDatabaseStore,
  InMemoryEventoRepository,
  InMemoryInscricaoRepository,
  InMemoryUrlUnicaRepository,
  InMemoryUsuarioRepository,
} from '../infrastructure/repositories/in-memory-repositories.js';

export function createInMemoryDependencies(): AppDependencies {
  const store = new InMemoryDatabaseStore();
  return {
    usuarioRepo: new InMemoryUsuarioRepository(store),
    casalRepo: new InMemoryCasalRepository(store),
    eventoRepo: new InMemoryEventoRepository(store),
    inscricaoRepo: new InMemoryInscricaoRepository(store),
    urlUnicaRepo: new InMemoryUrlUnicaRepository(store),
  };
}

export async function buildApp(
  customDeps?: AppDependencies,
): Promise<FastifyInstance> {
  const deps = customDeps ?? createInMemoryDependencies();
  const isProd = process.env.NODE_ENV === 'production';

  const jwtSecret =
    process.env.JWT_SECRET ||
    (isProd ? '' : 'ecc-dev-only-jwt-secret-key-2026-min-32-chars');

  if (isProd && jwtSecret.length < 32) {
    throw new Error(
      'FATAL [AppSec]: JWT_SECRET deve ser definido com no mínimo 32 caracteres em produção.',
    );
  }

  // Denylist de tokens revogados via logout (jti -> timestamp de expiração)
  const revokedTokens = new Map<string, number>();

  const app = Fastify({
    trustProxy: true,
    bodyLimit: 1024 * 1024, // 1 MiB max body size contra DoS
    logger:
      process.env.NODE_ENV !== 'test'
        ? {
            redact: [
              'req.headers.authorization',
              'body.senha',
              'body.pessoas[*].cpf',
              'body.pessoas[*].rg',
              'body.pessoas[*].problema_saude_descricao',
              'body.pessoas[*].medicamento_especial_descricao',
            ],
          }
        : false,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  });

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : ['http://localhost', 'http://localhost:80', 'http://localhost:4200', 'http://localhost:5173'];

  await app.register(cors, {
    origin: isProd ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  await app.register(jwt, {
    secret: jwtSecret,
    sign: {
      algorithm: 'HS256',
      expiresIn: '8h',
    },
    verify: {
      algorithms: ['HS256'],
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'ECC Admin API',
        description:
          'API RESTful do Painel Administrativo ECC (Encontro de Casais com Cristo - Brasília/DF)',
        version: '2.0.0',
      },
    },
    transform: jsonSchemaTransform,
  });

  // Expor Swagger UI apenas fora de produção ou mediante flag explícita
  if (!isProd || process.env.ENABLE_SWAGGER_DOCS === 'true') {
    await app.register(swaggerUi, {
      routePrefix: '/api/docs',
    });
  }

  const authUseCases = new AuthUseCases(deps.usuarioRepo);
  const casalUseCases = new CasalUseCases(deps.casalRepo);
  const eventoUseCases = new EventoUseCases(deps.eventoRepo);
  const inscricaoUseCases = new InscricaoUseCases(
    deps.inscricaoRepo,
    deps.urlUnicaRepo,
  );

  const authenticateHook = async (
    request: FastifyRequest,
    _reply: FastifyReply,
  ) => {
    try {
      await request.jwtVerify();
      const payload = request.user as { jti?: string };
      if (payload?.jti && revokedTokens.has(payload.jti)) {
        throw new UnauthorizedError('Sessão encerrada.');
      }
    } catch {
      throw new UnauthorizedError('Sessão expirada ou não autorizada.');
    }
  };

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof DomainError) {
      return reply.status(error.statusCode).send({
        success: false,
        code: error.code,
        message: error.message,
      });
    }

    const errMessage = error instanceof Error ? error.message : '';

    if ((error as { statusCode?: number }).statusCode === 429) {
      return reply.status(429).send({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
      });
    }

    if ((error as { validation?: unknown }).validation) {
      return reply.status(400).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: errMessage || 'Dados de entrada inválidos.',
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: isProd
        ? 'Erro interno no servidor.'
        : errMessage || 'Erro interno no servidor.',
    });
  });

  // Healthcheck
  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'ecc-api',
    timestamp: new Date().toISOString(),
  }));

  // Auth Routes (Rate Limit estrito contra Brute Force: máx 10 tentativas/min por IP)
  app.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['Auth'],
        body: loginRequestSchema,
      },
    },
    async (request) => {
      const { email, senha } = request.body;
      const usuario = await authUseCases.authenticate(email, senha);
      const token = app.jwt.sign({
        sub: String(usuario.id),
        jti: randomUUID(),
        email: usuario.email,
        nome: usuario.nome,
      });
      return {
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          token,
          usuario,
        },
      };
    },
  );

  app.post('/api/auth/logout', async (request) => {
    try {
      await request.jwtVerify();
      const payload = request.user as { jti?: string; exp?: number };
      if (payload?.jti) {
        revokedTokens.set(
          payload.jti,
          payload.exp ? payload.exp * 1000 : Date.now() + 8 * 3600_000,
        );
      }
    } catch {
      // Logout idempotente mesmo se o token já estiver expirado
    }
    return {
      success: true,
      message: 'Logout realizado com sucesso',
    };
  });

  app.get(
    '/api/auth/verificar',
    {
      preHandler: [authenticateHook],
    },
    async (request) => {
      const payload = request.user as { sub?: string };
      const userId = Number(payload?.sub || 0);
      const usuario = await authUseCases.verifyUser(userId);
      return {
        success: true,
        data: { usuario },
      };
    },
  );

  // Casais Routes
  app.get(
    '/api/casais',
    { preHandler: [authenticateHook] },
    async () => casalUseCases.listar(),
  );

  app.get(
    '/api/casais/:id',
    {
      preHandler: [authenticateHook],
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
      },
    },
    async (request) => casalUseCases.buscarPorId(request.params.id),
  );

  app.post(
    '/api/casais',
    {
      preHandler: [authenticateHook],
      schema: {
        body: registroCasalPayloadSchema,
      },
    },
    async (request, reply) => {
      const created = await casalUseCases.criar({
        casal: request.body.casal,
        pessoas: request.body.pessoas,
        filhos: request.body.filhos,
      });
      return reply.status(201).send(created);
    },
  );

  app.put(
    '/api/casais/:id',
    {
      preHandler: [authenticateHook],
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: registroCasalPayloadSchema,
      },
    },
    async (request) =>
      casalUseCases.atualizar(request.params.id, {
        casal: request.body.casal,
        pessoas: request.body.pessoas,
        filhos: request.body.filhos,
      }),
  );

  app.delete(
    '/api/casais/:id',
    {
      preHandler: [authenticateHook],
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
      },
    },
    async (request) => {
      await casalUseCases.remover(request.params.id);
      return { success: true };
    },
  );

  // Eventos Routes
  app.get(
    '/api/eventos',
    { preHandler: [authenticateHook] },
    async () => eventoUseCases.listar(),
  );

  app.get(
    '/api/eventos/:id',
    {
      preHandler: [authenticateHook],
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
      },
    },
    async (request) => eventoUseCases.buscarPorId(request.params.id),
  );

  app.post(
    '/api/eventos',
    {
      preHandler: [authenticateHook],
      schema: {
        body: eventoPayloadSchema,
      },
    },
    async (request, reply) => {
      const created = await eventoUseCases.criar(request.body);
      return reply.status(201).send(created);
    },
  );

  app.put(
    '/api/eventos/:id',
    {
      preHandler: [authenticateHook],
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: eventoPayloadSchema.partial(),
      },
    },
    async (request) => eventoUseCases.atualizar(request.params.id, request.body),
  );

  // Inscrições Routes
  app.get(
    '/api/inscricoes/evento/:eventoId',
    {
      preHandler: [authenticateHook],
      schema: {
        params: z.object({ eventoId: z.coerce.number().int().positive() }),
      },
    },
    async (request) =>
      inscricaoUseCases.listarPorEvento(request.params.eventoId),
  );

  app.post(
    '/api/inscricoes',
    {
      preHandler: [authenticateHook],
      schema: {
        body: inscricaoCreatePayloadSchema,
      },
    },
    async (request, reply) => {
      const { inscricao, urlCompleta, token } = await inscricaoUseCases.registrar({
        casal_id: request.body.casal_id,
        evento_id: request.body.evento_id,
        tipo_participante: request.body.tipo_participante,
        status: request.body.status,
        padrinho_id: request.body.padrinho_id ?? 0,
        quarto: request.body.quarto ?? '',
      });
      return reply.status(201).send({
        success: true,
        data: {
          0: inscricao,
          inscricao,
          urlCompleta,
          token,
        },
        urlCompleta,
      });
    },
  );

  app.put(
    '/api/inscricoes/:id',
    {
      preHandler: [authenticateHook],
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: inscricaoUpdatePayloadSchema,
      },
    },
    async (request) =>
      inscricaoUseCases.atualizar(request.params.id, request.body),
  );

  app.delete(
    '/api/inscricoes/:id',
    {
      preHandler: [authenticateHook],
      schema: {
        params: z.object({ id: z.coerce.number().int().positive() }),
      },
    },
    async (request) => {
      await inscricaoUseCases.deletar(request.params.id);
      return { success: true };
    },
  );

  // URLs Únicas Routes
  app.get(
    '/api/urls-unicas/inscricao/:id_inscricao',
    {
      preHandler: [authenticateHook],
      schema: {
        params: z.object({ id_inscricao: z.coerce.number().int().positive() }),
      },
    },
    async (request) =>
      inscricaoUseCases.obterOuGerarUrlCompleta(request.params.id_inscricao),
  );

  app.post(
    '/api/urls-unicas/gerar-convite',
    {
      preHandler: [authenticateHook],
      schema: {
        body: gerarConvitePayloadSchema,
      },
    },
    async (request) => {
      const casalId =
        typeof request.body.casal_id === 'object'
          ? request.body.casal_id.id
          : request.body.casal_id;
      const eventoId = request.body.evento_id ?? 1;
      const list = await inscricaoUseCases.listarPorEvento(eventoId);
      const found = list.find((i) => i.casal_id === casalId);

      if (found) {
        const urlData = await inscricaoUseCases.obterOuGerarUrlCompleta(found.id);
        return {
          success: true,
          data: {
            0: urlData,
            urlCompleta: urlData.urlCompleta,
            token: urlData.token,
          },
          urlCompleta: urlData.urlCompleta,
        };
      }

      const padrinhoId =
        request.body.padrinho_id && typeof request.body.padrinho_id === 'object'
          ? request.body.padrinho_id.id
          : (request.body.padrinho_id ?? 0);

      const { inscricao, urlCompleta, token } = await inscricaoUseCases.registrar({
        casal_id: casalId,
        evento_id: eventoId,
        tipo_participante: padrinhoId ? 'convidado' : 'encontrista',
        status: 'pendente',
        padrinho_id: padrinhoId,
        quarto: '',
      });

      return {
        success: true,
        data: {
          0: inscricao,
          urlCompleta,
          token,
        },
        urlCompleta,
      };
    },
  );

  return app;
}
