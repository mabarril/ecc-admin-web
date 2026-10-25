import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  CasalAgregado,
  DietaAlimentar,
  Evento,
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
import { Database } from '../db/client.js';
import {
  casais,
  eventos,
  filhos,
  inscricoes,
  pessoas,
  urls_unicas,
  usuarios,
} from '../db/schema.js';

export class DrizzleUsuarioRepository implements IUsuarioRepository {
  constructor(private readonly db: Database) {}

  async findByEmail(email: string): Promise<Usuario | null> {
    const rows = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);
    return rows[0] ?? null;
  }

  async findById(id: number): Promise<Usuario | null> {
    const rows = await this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db
      .update(usuarios)
      .set({ ultimo_login: new Date() })
      .where(eq(usuarios.id, id));
  }

  async create(data: { nome: string; email: string; senha_hash: string }): Promise<Usuario> {
    const [created] = await this.db.insert(usuarios).values(data).returning();
    if (!created) throw new Error('Falha ao criar usuário.');
    return created;
  }
}

export class DrizzleCasalRepository implements ICasalRepository {
  constructor(private readonly db: Database) {}

  private mapPessoa(row: typeof pessoas.$inferSelect): Pessoa {
    return {
      id: row.id,
      casal_id: row.casal_id,
      tipo: row.tipo as TipoPessoa,
      nome_completo: row.nome_completo,
      nome_social: row.nome_social,
      data_nascimento: row.data_nascimento,
      profissao: row.profissao,
      email: row.email,
      celular: row.celular,
      rg: row.rg,
      rg_emissor: row.rg_emissor,
      cpf: row.cpf,
      problema_saude: row.problema_saude,
      problema_saude_descricao: row.problema_saude_descricao,
      medicamento_especial: row.medicamento_especial,
      medicamento_especial_descricao: row.medicamento_especial_descricao,
      diabetico: row.diabetico,
      dieta_alimentar: row.dieta_alimentar as DietaAlimentar,
      religiao: row.religiao as Religiao,
    };
  }

  async findAll(): Promise<CasalAgregado[]> {
    const rows = await this.db.query.casais.findMany({
      where: isNull(casais.deleted_at),
      with: {
        pessoas: true,
        filhos: true,
      },
    });
    return rows.map((r) => ({
      ...r,
      pessoas: r.pessoas.map((p) => this.mapPessoa(p)),
      filhos: r.filhos,
    }));
  }

  async findById(id: number): Promise<CasalAgregado | null> {
    const row = await this.db.query.casais.findFirst({
      where: and(eq(casais.id, id), isNull(casais.deleted_at)),
      with: {
        pessoas: true,
        filhos: true,
      },
    });
    if (!row) return null;
    return {
      ...row,
      pessoas: row.pessoas.map((p) => this.mapPessoa(p)),
      filhos: row.filhos,
    };
  }

  async create(input: CreateCasalInput): Promise<CasalAgregado> {
    return this.db.transaction(async (tx) => {
      const [novoCasal] = await tx
        .insert(casais)
        .values({
          data_casamento: input.casal.data_casamento ?? null,
          endereco: input.casal.endereco,
          bairro: input.casal.bairro,
          cidade: input.casal.cidade,
          estado: input.casal.estado ?? 'DF',
          cep: input.casal.cep,
          contato_emergencia_nome1: input.casal.contato_emergencia_nome1 ?? null,
          contato_emergencia_telefone1: input.casal.contato_emergencia_telefone1 ?? null,
          contato_emergencia_nome2: input.casal.contato_emergencia_nome2 ?? null,
          contato_emergencia_telefone2: input.casal.contato_emergencia_telefone2 ?? null,
          responsavel_filhos_nome: input.casal.responsavel_filhos_nome ?? null,
          responsavel_filhos_telefone: input.casal.responsavel_filhos_telefone ?? null,
        })
        .returning();

      if (!novoCasal) throw new Error('Falha ao criar casal.');

      const insertedPessoas =
        input.pessoas.length > 0
          ? await tx
              .insert(pessoas)
              .values(
                input.pessoas.map((p) => ({
                  casal_id: novoCasal.id,
                  tipo: p.tipo,
                  nome_completo: p.nome_completo,
                  nome_social: p.nome_social ?? null,
                  data_nascimento: p.data_nascimento ?? null,
                  profissao: p.profissao ?? null,
                  email: p.email ?? null,
                  celular: p.celular ?? null,
                  rg: p.rg ?? null,
                  rg_emissor: p.rg_emissor ?? null,
                  cpf: p.cpf ?? null,
                  problema_saude: Boolean(p.problema_saude),
                  problema_saude_descricao: p.problema_saude_descricao ?? null,
                  medicamento_especial: Boolean(p.medicamento_especial),
                  medicamento_especial_descricao: p.medicamento_especial_descricao ?? null,
                  diabetico: Boolean(p.diabetico),
                  dieta_alimentar: p.dieta_alimentar ?? 'não',
                  religiao: p.religiao ?? 'Católica',
                })),
              )
              .returning()
          : [];

      const insertedFilhos =
        input.filhos && input.filhos.length > 0
          ? await tx
              .insert(filhos)
              .values(
                input.filhos.map((f) => ({
                  casal_id: novoCasal.id,
                  nome_completo: f.nome_completo,
                  data_nascimento: f.data_nascimento ?? null,
                })),
              )
              .returning()
          : [];

      return {
        ...novoCasal,
        pessoas: insertedPessoas.map((p) => this.mapPessoa(p)),
        filhos: insertedFilhos,
      };
    });
  }

  async update(id: number, input: CreateCasalInput): Promise<CasalAgregado> {
    return this.db.transaction(async (tx) => {
      const [atualizado] = await tx
        .update(casais)
        .set({
          data_casamento: input.casal.data_casamento ?? null,
          endereco: input.casal.endereco,
          bairro: input.casal.bairro,
          cidade: input.casal.cidade,
          estado: input.casal.estado ?? 'DF',
          cep: input.casal.cep,
          contato_emergencia_nome1: input.casal.contato_emergencia_nome1 ?? null,
          contato_emergencia_telefone1: input.casal.contato_emergencia_telefone1 ?? null,
          contato_emergencia_nome2: input.casal.contato_emergencia_nome2 ?? null,
          contato_emergencia_telefone2: input.casal.contato_emergencia_telefone2 ?? null,
          responsavel_filhos_nome: input.casal.responsavel_filhos_nome ?? null,
          responsavel_filhos_telefone: input.casal.responsavel_filhos_telefone ?? null,
        })
        .where(and(eq(casais.id, id), isNull(casais.deleted_at)))
        .returning();

      if (!atualizado) throw new NotFoundError('Casal');

      await tx.delete(pessoas).where(eq(pessoas.casal_id, id));
      await tx.delete(filhos).where(eq(filhos.casal_id, id));

      const insertedPessoas =
        input.pessoas.length > 0
          ? await tx
              .insert(pessoas)
              .values(
                input.pessoas.map((p) => ({
                  casal_id: id,
                  tipo: p.tipo,
                  nome_completo: p.nome_completo,
                  nome_social: p.nome_social ?? null,
                  data_nascimento: p.data_nascimento ?? null,
                  profissao: p.profissao ?? null,
                  email: p.email ?? null,
                  celular: p.celular ?? null,
                  rg: p.rg ?? null,
                  rg_emissor: p.rg_emissor ?? null,
                  cpf: p.cpf ?? null,
                  problema_saude: Boolean(p.problema_saude),
                  problema_saude_descricao: p.problema_saude_descricao ?? null,
                  medicamento_especial: Boolean(p.medicamento_especial),
                  medicamento_especial_descricao: p.medicamento_especial_descricao ?? null,
                  diabetico: Boolean(p.diabetico),
                  dieta_alimentar: p.dieta_alimentar ?? 'não',
                  religiao: p.religiao ?? 'Católica',
                })),
              )
              .returning()
          : [];

      const insertedFilhos =
        input.filhos && input.filhos.length > 0
          ? await tx
              .insert(filhos)
              .values(
                input.filhos.map((f) => ({
                  casal_id: id,
                  nome_completo: f.nome_completo,
                  data_nascimento: f.data_nascimento ?? null,
                })),
              )
              .returning()
          : [];

      return {
        ...atualizado,
        pessoas: insertedPessoas.map((p) => this.mapPessoa(p)),
        filhos: insertedFilhos,
      };
    });
  }

  async softDelete(id: number): Promise<void> {
    const [deleted] = await this.db
      .update(casais)
      .set({ deleted_at: new Date().toISOString() })
      .where(and(eq(casais.id, id), isNull(casais.deleted_at)))
      .returning();
    if (!deleted) throw new NotFoundError('Casal');
  }
}

export class DrizzleEventoRepository implements IEventoRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<Evento[]> {
    return this.db.select().from(eventos).orderBy(desc(eventos.id));
  }

  async findById(id: number): Promise<Evento | null> {
    const [row] = await this.db
      .select()
      .from(eventos)
      .where(eq(eventos.id, id))
      .limit(1);
    return row ?? null;
  }

  async create(data: Omit<Evento, 'id'>): Promise<Evento> {
    const [created] = await this.db.insert(eventos).values(data).returning();
    if (!created) throw new Error('Falha ao criar evento.');
    return created;
  }

  async update(id: number, data: Partial<Omit<Evento, 'id'>>): Promise<Evento> {
    const [updated] = await this.db
      .update(eventos)
      .set(data)
      .where(eq(eventos.id, id))
      .returning();
    if (!updated) throw new NotFoundError('Evento');
    return updated;
  }
}

export class DrizzleInscricaoRepository implements IInscricaoRepository {
  constructor(private readonly db: Database) {}

  private mapInscricao(row: typeof inscricoes.$inferSelect): Inscricao {
    return {
      id: row.id,
      casal_id: row.casal_id,
      evento_id: row.evento_id,
      padrinho_id: row.padrinho_id,
      tipo_participante: row.tipo_participante as TipoParticipante,
      status: row.status as StatusInscricao,
      quarto: row.quarto ?? '',
      data_inscricao: row.data_inscricao.toISOString(),
    };
  }

  async findByEventoId(eventoId: number): Promise<Inscricao[]> {
    const rows = await this.db
      .select()
      .from(inscricoes)
      .where(eq(inscricoes.evento_id, eventoId));
    return rows.map((r) => this.mapInscricao(r));
  }

  async findById(id: number): Promise<Inscricao | null> {
    const [row] = await this.db
      .select()
      .from(inscricoes)
      .where(eq(inscricoes.id, id))
      .limit(1);
    return row ? this.mapInscricao(row) : null;
  }

  async findByCasalAndEvento(casalId: number, eventoId: number): Promise<Inscricao | null> {
    const [row] = await this.db
      .select()
      .from(inscricoes)
      .where(and(eq(inscricoes.casal_id, casalId), eq(inscricoes.evento_id, eventoId)))
      .limit(1);
    return row ? this.mapInscricao(row) : null;
  }

  async create(data: Omit<Inscricao, 'id' | 'data_inscricao'>): Promise<Inscricao> {
    const [created] = await this.db
      .insert(inscricoes)
      .values({
        casal_id: data.casal_id,
        evento_id: data.evento_id,
        padrinho_id: data.padrinho_id ?? 0,
        tipo_participante: data.tipo_participante,
        status: data.status ?? 'pendente',
        quarto: data.quarto ?? '',
      })
      .returning();
    if (!created) throw new Error('Falha ao criar inscrição.');
    return this.mapInscricao(created);
  }

  async update(id: number, data: Partial<Omit<Inscricao, 'id'>>): Promise<Inscricao> {
    const [updated] = await this.db
      .update(inscricoes)
      .set({
        ...(data.status ? { status: data.status } : {}),
        ...(data.tipo_participante ? { tipo_participante: data.tipo_participante } : {}),
        ...(data.quarto !== undefined ? { quarto: data.quarto } : {}),
        ...(data.padrinho_id !== undefined ? { padrinho_id: data.padrinho_id } : {}),
      })
      .where(eq(inscricoes.id, id))
      .returning();
    if (!updated) throw new NotFoundError('Inscrição');
    return this.mapInscricao(updated);
  }

  async delete(id: number): Promise<void> {
    const [deleted] = await this.db
      .delete(inscricoes)
      .where(eq(inscricoes.id, id))
      .returning();
    if (!deleted) throw new NotFoundError('Inscrição');
  }
}

export class DrizzleUrlUnicaRepository implements IUrlUnicaRepository {
  constructor(private readonly db: Database) {}

  private mapUrl(row: typeof urls_unicas.$inferSelect): UrlUnica {
    return {
      id: row.id,
      inscricao_id: row.inscricao_id,
      token: row.token,
      url_completa: row.url_completa,
      usado: row.usado,
      created_at: row.created_at.toISOString(),
    };
  }

  async findByInscricaoId(inscricaoId: number): Promise<UrlUnica | null> {
    const [row] = await this.db
      .select()
      .from(urls_unicas)
      .where(eq(urls_unicas.inscricao_id, inscricaoId))
      .limit(1);
    return row ? this.mapUrl(row) : null;
  }

  async findByToken(token: string): Promise<UrlUnica | null> {
    const [row] = await this.db
      .select()
      .from(urls_unicas)
      .where(eq(urls_unicas.token, token))
      .limit(1);
    return row ? this.mapUrl(row) : null;
  }

  async upsertForInscricao(
    inscricaoId: number,
    token: string,
    urlCompleta: string,
  ): Promise<UrlUnica> {
    const existing = await this.findByInscricaoId(inscricaoId);
    if (existing) {
      const [updated] = await this.db
        .update(urls_unicas)
        .set({ token, url_completa: urlCompleta })
        .where(eq(urls_unicas.id, existing.id))
        .returning();
      if (!updated) throw new Error('Falha ao atualizar URL única.');
      return this.mapUrl(updated);
    }

    const [created] = await this.db
      .insert(urls_unicas)
      .values({
        inscricao_id: inscricaoId,
        token,
        url_completa: urlCompleta,
      })
      .returning();
    if (!created) throw new Error('Falha ao criar URL única.');
    return this.mapUrl(created);
  }
}
