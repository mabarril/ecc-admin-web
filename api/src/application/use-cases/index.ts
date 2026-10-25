import { randomUUID } from 'node:crypto';
import {
  CasalAgregado,
  Evento,
  Inscricao,
  UrlUnica,
  Usuario,
} from '../../domain/entities/index.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../domain/errors/domain-error.js';
import {
  CreateCasalInput,
  ICasalRepository,
  IEventoRepository,
  IInscricaoRepository,
  IUrlUnicaRepository,
  IUsuarioRepository,
} from '../../domain/repositories/interfaces.js';
import {
  DUMMY_PASSWORD_HASH,
  verifyPassword,
} from '../../infrastructure/security/password.js';

export interface AppDependencies {
  usuarioRepo: IUsuarioRepository;
  casalRepo: ICasalRepository;
  eventoRepo: IEventoRepository;
  inscricaoRepo: IInscricaoRepository;
  urlUnicaRepo: IUrlUnicaRepository;
}

export class AuthUseCases {
  constructor(private readonly usuarioRepo: IUsuarioRepository) {}

  async authenticate(
    email: string,
    senha: string,
  ): Promise<Omit<Usuario, 'senha_hash'>> {
    const user = await this.usuarioRepo.findByEmail(email);
    if (!user || !user.senha_hash) {
      // Executa derivação scrypt contra hash dummy para manter tempo constante (anti-enumeração)
      await verifyPassword(senha, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedError('E-mail ou senha inválidos.');
    }

    const valid = await verifyPassword(senha, user.senha_hash);
    if (!valid) {
      throw new UnauthorizedError('E-mail ou senha inválidos.');
    }

    await this.usuarioRepo.updateLastLogin(user.id);
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      ultimo_login: new Date().toISOString(),
    };
  }

  async verifyUser(userId: number): Promise<Omit<Usuario, 'senha_hash'>> {
    const user = await this.usuarioRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuário não encontrado.');
    }
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      ultimo_login: user.ultimo_login,
    };
  }
}

export class CasalUseCases {
  constructor(private readonly casalRepo: ICasalRepository) {}

  async listar(): Promise<CasalAgregado[]> {
    return this.casalRepo.findAll();
  }

  async buscarPorId(id: number): Promise<CasalAgregado> {
    const casal = await this.casalRepo.findById(id);
    if (!casal) throw new NotFoundError('Casal');
    return casal;
  }

  async criar(input: CreateCasalInput): Promise<CasalAgregado> {
    return this.casalRepo.create(input);
  }

  async atualizar(id: number, input: CreateCasalInput): Promise<CasalAgregado> {
    return this.casalRepo.update(id, input);
  }

  async remover(id: number): Promise<void> {
    return this.casalRepo.softDelete(id);
  }
}

export class EventoUseCases {
  constructor(private readonly eventoRepo: IEventoRepository) {}

  async listar(): Promise<Evento[]> {
    return this.eventoRepo.findAll();
  }

  async buscarPorId(id: number): Promise<Evento> {
    const evento = await this.eventoRepo.findById(id);
    if (!evento) throw new NotFoundError('Evento');
    return evento;
  }

  async criar(data: Omit<Evento, 'id'>): Promise<Evento> {
    return this.eventoRepo.create(data);
  }

  async atualizar(id: number, data: Partial<Omit<Evento, 'id'>>): Promise<Evento> {
    return this.eventoRepo.update(id, data);
  }
}

export class InscricaoUseCases {
  constructor(
    private readonly inscricaoRepo: IInscricaoRepository,
    private readonly urlUnicaRepo: IUrlUnicaRepository,
    private readonly baseUrl = process.env.PUBLIC_FORM_BASE_URL ||
      'https://eccbsb.org.br/inscricao',
  ) {}

  async listarPorEvento(eventoId: number): Promise<Inscricao[]> {
    return this.inscricaoRepo.findByEventoId(eventoId);
  }

  async registrar(
    data: Omit<Inscricao, 'id' | 'data_inscricao'>,
  ): Promise<{ inscricao: Inscricao; urlCompleta: string; token: string }> {
    const existente = await this.inscricaoRepo.findByCasalAndEvento(
      data.casal_id,
      data.evento_id,
    );
    if (existente) {
      throw new ConflictError('Este casal já está inscrito neste evento.');
    }

    const inscricao = await this.inscricaoRepo.create(data);
    const token = randomUUID();
    const urlCompleta = `${this.baseUrl}/${token}`;
    await this.urlUnicaRepo.upsertForInscricao(inscricao.id, token, urlCompleta);

    return { inscricao, urlCompleta, token };
  }

  async atualizar(
    id: number,
    data: Partial<Omit<Inscricao, 'id'>>,
  ): Promise<Inscricao> {
    return this.inscricaoRepo.update(id, data);
  }

  async deletar(id: number): Promise<void> {
    return this.inscricaoRepo.delete(id);
  }

  async obterOuGerarUrlCompleta(
    inscricaoId: number,
  ): Promise<{ urlCompleta: string; token: string; inscricao_id: number }> {
    const existing = await this.urlUnicaRepo.findByInscricaoId(inscricaoId);
    if (existing) {
      return {
        urlCompleta: existing.url_completa,
        token: existing.token,
        inscricao_id: existing.inscricao_id,
      };
    }

    const inscricao = await this.inscricaoRepo.findById(inscricaoId);
    if (!inscricao) throw new NotFoundError('Inscrição');

    const token = randomUUID();
    const urlCompleta = `${this.baseUrl}/${token}`;
    const created = await this.urlUnicaRepo.upsertForInscricao(
      inscricaoId,
      token,
      urlCompleta,
    );
    return {
      urlCompleta: created.url_completa,
      token: created.token,
      inscricao_id: created.inscricao_id,
    };
  }
}
