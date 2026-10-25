import {
  Casal,
  CasalAgregado,
  Evento,
  Filho,
  Inscricao,
  Pessoa,
  UrlUnica,
  Usuario,
} from '../entities/index.js';

export interface CreateCasalInput {
  casal: Omit<Casal, 'id' | 'deleted_at'>;
  pessoas: Pessoa[];
  filhos: Filho[];
}

export interface IUsuarioRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  findById(id: number): Promise<Usuario | null>;
  updateLastLogin(id: number): Promise<void>;
  create(data: { nome: string; email: string; senha_hash: string }): Promise<Usuario>;
}

export interface ICasalRepository {
  findAll(): Promise<CasalAgregado[]>;
  findById(id: number): Promise<CasalAgregado | null>;
  create(input: CreateCasalInput): Promise<CasalAgregado>;
  update(id: number, input: CreateCasalInput): Promise<CasalAgregado>;
  softDelete(id: number): Promise<void>;
}

export interface IEventoRepository {
  findAll(): Promise<Evento[]>;
  findById(id: number): Promise<Evento | null>;
  create(data: Omit<Evento, 'id'>): Promise<Evento>;
  update(id: number, data: Partial<Omit<Evento, 'id'>>): Promise<Evento>;
}

export interface IInscricaoRepository {
  findByEventoId(eventoId: number): Promise<Inscricao[]>;
  findById(id: number): Promise<Inscricao | null>;
  findByCasalAndEvento(casalId: number, eventoId: number): Promise<Inscricao | null>;
  create(data: Omit<Inscricao, 'id' | 'data_inscricao'>): Promise<Inscricao>;
  update(id: number, data: Partial<Omit<Inscricao, 'id'>>): Promise<Inscricao>;
  delete(id: number): Promise<void>;
}

export interface IUrlUnicaRepository {
  findByInscricaoId(inscricaoId: number): Promise<UrlUnica | null>;
  findByToken(token: string): Promise<UrlUnica | null>;
  upsertForInscricao(inscricaoId: number, token: string, urlCompleta: string): Promise<UrlUnica>;
}
