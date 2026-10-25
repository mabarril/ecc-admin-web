import { randomUUID } from 'node:crypto';
import {
  CasalAgregado,
  DietaAlimentar,
  Evento,
  Filho,
  Inscricao,
  Pessoa,
  Religiao,
  StatusInscricao,
  TipoParticipante,
  TipoPessoa,
  UrlUnica,
  Usuario,
} from '../../domain/entities/index.js';
import { NotFoundError } from '../../domain/errors/domain-error.js';
import {
  CreateCasalInput,
  ICasalRepository,
  IEventoRepository,
  IInscricaoRepository,
  IUrlUnicaRepository,
  IUsuarioRepository,
} from '../../domain/repositories/interfaces.js';
import { hashPassword } from '../security/password.js';

export class InMemoryDatabaseStore {
  usuarios: Usuario[] = [];
  eventos: Evento[] = [
    {
      id: 1,
      nome: 'ECC 2026 - 1ª Edição',
      data_inicio: '2026-08-01',
      data_fim: '2026-08-03',
      ativo: true,
    },
  ];
  casais: CasalAgregado[] = [
    {
      id: 1,
      data_casamento: '2015-05-16',
      endereco: 'SQN 308 Bloco A Apto 204',
      bairro: 'Asa Norte',
      cidade: 'Brasília',
      estado: 'DF',
      cep: '70747-010',
      contato_emergencia_nome1: 'Roberto Silva',
      contato_emergencia_telefone1: '(61) 99911-2233',
      contato_emergencia_nome2: 'Helena Silva',
      contato_emergencia_telefone2: '(61) 99944-5566',
      responsavel_filhos_nome: 'Vovó Helena',
      responsavel_filhos_telefone: '(61) 99944-5566',
      deleted_at: null,
      pessoas: [
        {
          id: 1,
          casal_id: 1,
          tipo: 'esposo',
          nome_completo: 'Carlos Eduardo Mendes',
          nome_social: 'Carlos',
          data_nascimento: '1988-03-14',
          profissao: 'Engenheiro de Software',
          email: 'carlos@exemplo.com.br',
          celular: '(61) 99876-5432',
          rg: '2345678',
          rg_emissor: 'SSP/DF',
          cpf: '12345678901',
          problema_saude: false,
          problema_saude_descricao: '',
          medicamento_especial: false,
          medicamento_especial_descricao: '',
          diabetico: false,
          dieta_alimentar: 'não',
          religiao: 'Católica',
        },
        {
          id: 2,
          casal_id: 1,
          tipo: 'esposa',
          nome_completo: 'Ana Paula Mendes',
          nome_social: 'Ana',
          data_nascimento: '1990-07-22',
          profissao: 'Arquiteta',
          email: 'ana@exemplo.com.br',
          celular: '(61) 99876-1122',
          rg: '3456789',
          rg_emissor: 'SSP/DF',
          cpf: '98765432100',
          problema_saude: false,
          problema_saude_descricao: '',
          medicamento_especial: false,
          medicamento_especial_descricao: '',
          diabetico: false,
          dieta_alimentar: 'vegetariano',
          religiao: 'Católica',
        },
      ],
      filhos: [
        {
          id: 1,
          casal_id: 1,
          nome_completo: 'Lucas Mendes',
          data_nascimento: '2018-10-05',
        },
      ],
    },
  ];
  inscricoes: Inscricao[] = [
    {
      id: 1,
      casal_id: 1,
      evento_id: 1,
      padrinho_id: 0,
      tipo_participante: 'encontrista',
      status: 'confirmada',
      quarto: '101',
      data_inscricao: new Date().toISOString(),
    },
  ];
  urlsUnicas: UrlUnica[] = [
    {
      id: 1,
      inscricao_id: 1,
      token: 'tok-inicial-1',
      url_completa: 'https://eccbsb.org.br/inscricao/tok-inicial-1',
      usado: false,
      created_at: new Date().toISOString(),
    },
  ];

  async ensureDefaultAdmin(): Promise<void> {
    if (this.usuarios.length === 0) {
      const senhaHash = await hashPassword('admin123');
      this.usuarios.push({
        id: 1,
        nome: 'Administrador ECC',
        email: 'admin@ecc.com.br',
        senha_hash: senhaHash,
        ultimo_login: new Date().toISOString(),
      });
    }
  }
}

export class InMemoryUsuarioRepository implements IUsuarioRepository {
  constructor(private readonly store: InMemoryDatabaseStore) {}

  async findByEmail(email: string): Promise<Usuario | null> {
    await this.store.ensureDefaultAdmin();
    return (
      this.store.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null
    );
  }

  async findById(id: number): Promise<Usuario | null> {
    await this.store.ensureDefaultAdmin();
    return this.store.usuarios.find((u) => u.id === id) ?? null;
  }

  async updateLastLogin(id: number): Promise<void> {
    const user = this.store.usuarios.find((u) => u.id === id);
    if (user) {
      user.ultimo_login = new Date().toISOString();
    }
  }

  async create(data: { nome: string; email: string; senha_hash: string }): Promise<Usuario> {
    const nextId =
      this.store.usuarios.reduce((max, u) => Math.max(max, u.id), 0) + 1;
    const novo: Usuario = {
      id: nextId,
      nome: data.nome,
      email: data.email,
      senha_hash: data.senha_hash,
      ultimo_login: new Date().toISOString(),
    };
    this.store.usuarios.push(novo);
    return novo;
  }
}

export class InMemoryCasalRepository implements ICasalRepository {
  constructor(private readonly store: InMemoryDatabaseStore) {}

  async findAll(): Promise<CasalAgregado[]> {
    return this.store.casais.filter((c) => !c.deleted_at);
  }

  async findById(id: number): Promise<CasalAgregado | null> {
    return this.store.casais.find((c) => c.id === id && !c.deleted_at) ?? null;
  }

  async create(input: CreateCasalInput): Promise<CasalAgregado> {
    const nextId =
      this.store.casais.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const novo: CasalAgregado = {
      id: nextId,
      ...input.casal,
      deleted_at: null,
      pessoas: input.pessoas.map((p, idx) => ({
        ...p,
        id: idx + 1,
        casal_id: nextId,
      })),
      filhos: (input.filhos ?? []).map((f, idx) => ({
        ...f,
        id: idx + 1,
        casal_id: nextId,
      })),
    };
    this.store.casais.push(novo);
    return novo;
  }

  async update(id: number, input: CreateCasalInput): Promise<CasalAgregado> {
    const index = this.store.casais.findIndex((c) => c.id === id && !c.deleted_at);
    if (index === -1) {
      throw new NotFoundError('Casal');
    }
    const atualizado: CasalAgregado = {
      id,
      ...input.casal,
      deleted_at: null,
      pessoas: input.pessoas.map((p, idx) => ({
        ...p,
        id: idx + 1,
        casal_id: id,
      })),
      filhos: (input.filhos ?? []).map((f, idx) => ({
        ...f,
        id: idx + 1,
        casal_id: id,
      })),
    };
    this.store.casais[index] = atualizado;
    return atualizado;
  }

  async softDelete(id: number): Promise<void> {
    const casal = this.store.casais.find((c) => c.id === id && !c.deleted_at);
    if (!casal) throw new NotFoundError('Casal');
    casal.deleted_at = new Date().toISOString();
  }
}

export class InMemoryEventoRepository implements IEventoRepository {
  constructor(private readonly store: InMemoryDatabaseStore) {}

  async findAll(): Promise<Evento[]> {
    return [...this.store.eventos].sort((a, b) => b.id - a.id);
  }

  async findById(id: number): Promise<Evento | null> {
    return this.store.eventos.find((e) => e.id === id) ?? null;
  }

  async create(data: Omit<Evento, 'id'>): Promise<Evento> {
    const nextId =
      this.store.eventos.reduce((max, e) => Math.max(max, e.id), 0) + 1;
    const novo: Evento = { id: nextId, ...data };
    this.store.eventos.push(novo);
    return novo;
  }

  async update(id: number, data: Partial<Omit<Evento, 'id'>>): Promise<Evento> {
    const evento = this.store.eventos.find((e) => e.id === id);
    if (!evento) throw new NotFoundError('Evento');
    Object.assign(evento, data);
    return evento;
  }
}

export class InMemoryInscricaoRepository implements IInscricaoRepository {
  constructor(private readonly store: InMemoryDatabaseStore) {}

  async findByEventoId(eventoId: number): Promise<Inscricao[]> {
    return this.store.inscricoes.filter((i) => i.evento_id === eventoId);
  }

  async findById(id: number): Promise<Inscricao | null> {
    return this.store.inscricoes.find((i) => i.id === id) ?? null;
  }

  async findByCasalAndEvento(casalId: number, eventoId: number): Promise<Inscricao | null> {
    return (
      this.store.inscricoes.find(
        (i) => i.casal_id === casalId && i.evento_id === eventoId,
      ) ?? null
    );
  }

  async create(data: Omit<Inscricao, 'id' | 'data_inscricao'>): Promise<Inscricao> {
    const nextId =
      this.store.inscricoes.reduce((max, i) => Math.max(max, i.id), 0) + 1;
    const nova: Inscricao = {
      id: nextId,
      ...data,
      quarto: data.quarto ?? '',
      data_inscricao: new Date().toISOString(),
    };
    this.store.inscricoes.push(nova);
    return nova;
  }

  async update(id: number, data: Partial<Omit<Inscricao, 'id'>>): Promise<Inscricao> {
    const inscricao = this.store.inscricoes.find((i) => i.id === id);
    if (!inscricao) throw new NotFoundError('Inscrição');
    Object.assign(inscricao, data);
    return inscricao;
  }

  async delete(id: number): Promise<void> {
    const idx = this.store.inscricoes.findIndex((i) => i.id === id);
    if (idx === -1) throw new NotFoundError('Inscrição');
    this.store.inscricoes.splice(idx, 1);
  }
}

export class InMemoryUrlUnicaRepository implements IUrlUnicaRepository {
  constructor(private readonly store: InMemoryDatabaseStore) {}

  async findByInscricaoId(inscricaoId: number): Promise<UrlUnica | null> {
    return this.store.urlsUnicas.find((u) => u.inscricao_id === inscricaoId) ?? null;
  }

  async findByToken(token: string): Promise<UrlUnica | null> {
    return this.store.urlsUnicas.find((u) => u.token === token) ?? null;
  }

  async upsertForInscricao(
    inscricaoId: number,
    token: string,
    urlCompleta: string,
  ): Promise<UrlUnica> {
    const existing = this.store.urlsUnicas.find((u) => u.inscricao_id === inscricaoId);
    if (existing) {
      existing.token = token;
      existing.url_completa = urlCompleta;
      return existing;
    }
    const nextId =
      this.store.urlsUnicas.reduce((max, u) => Math.max(max, u.id), 0) + 1;
    const nova: UrlUnica = {
      id: nextId,
      inscricao_id: inscricaoId,
      token,
      url_completa: urlCompleta,
      usado: false,
      created_at: new Date().toISOString(),
    };
    this.store.urlsUnicas.push(nova);
    return nova;
  }
}
