import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nome: varchar('nome', { length: 160 }).notNull(),
  email: varchar('email', { length: 160 }).notNull().unique(),
  senha_hash: text('senha_hash').notNull(),
  ultimo_login: timestamp('ultimo_login'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const eventos = pgTable('eventos', {
  id: serial('id').primaryKey(),
  nome: varchar('nome', { length: 160 }).notNull(),
  data_inicio: varchar('data_inicio', { length: 20 }).notNull(),
  data_fim: varchar('data_fim', { length: 20 }).notNull(),
  ativo: boolean('ativo').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const casais = pgTable('casais', {
  id: serial('id').primaryKey(),
  data_casamento: varchar('data_casamento', { length: 20 }),
  endereco: text('endereco').notNull(),
  bairro: varchar('bairro', { length: 120 }).notNull(),
  cidade: varchar('cidade', { length: 120 }).notNull(),
  estado: varchar('estado', { length: 10 }).default('DF'),
  cep: varchar('cep', { length: 20 }).notNull(),
  contato_emergencia_nome1: varchar('contato_emergencia_nome1', { length: 160 }),
  contato_emergencia_telefone1: varchar('contato_emergencia_telefone1', { length: 30 }),
  contato_emergencia_nome2: varchar('contato_emergencia_nome2', { length: 160 }),
  contato_emergencia_telefone2: varchar('contato_emergencia_telefone2', { length: 30 }),
  responsavel_filhos_nome: varchar('responsavel_filhos_nome', { length: 160 }),
  responsavel_filhos_telefone: varchar('responsavel_filhos_telefone', { length: 30 }),
  deleted_at: varchar('deleted_at', { length: 40 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const pessoas = pgTable('pessoas', {
  id: serial('id').primaryKey(),
  casal_id: integer('casal_id')
    .notNull()
    .references(() => casais.id, { onDelete: 'cascade' }),
  tipo: varchar('tipo', { length: 20 }).notNull(), // 'esposo' | 'esposa'
  nome_completo: varchar('nome_completo', { length: 180 }).notNull(),
  nome_social: varchar('nome_social', { length: 100 }),
  data_nascimento: varchar('data_nascimento', { length: 20 }),
  profissao: varchar('profissao', { length: 120 }),
  email: varchar('email', { length: 160 }),
  celular: varchar('celular', { length: 30 }),
  rg: varchar('rg', { length: 40 }),
  rg_emissor: varchar('rg_emissor', { length: 40 }),
  cpf: varchar('cpf', { length: 20 }),
  problema_saude: boolean('problema_saude').default(false).notNull(),
  problema_saude_descricao: text('problema_saude_descricao'),
  medicamento_especial: boolean('medicamento_especial').default(false).notNull(),
  medicamento_especial_descricao: text('medicamento_especial_descricao'),
  diabetico: boolean('diabetico').default(false).notNull(),
  dieta_alimentar: varchar('dieta_alimentar', { length: 40 }).default('não').notNull(),
  religiao: varchar('religiao', { length: 60 }).default('Católica').notNull(),
});

export const filhos = pgTable('filhos', {
  id: serial('id').primaryKey(),
  casal_id: integer('casal_id')
    .notNull()
    .references(() => casais.id, { onDelete: 'cascade' }),
  nome_completo: varchar('nome_completo', { length: 180 }).notNull(),
  data_nascimento: varchar('data_nascimento', { length: 20 }),
});

export const inscricoes = pgTable('inscricoes', {
  id: serial('id').primaryKey(),
  casal_id: integer('casal_id')
    .notNull()
    .references(() => casais.id, { onDelete: 'cascade' }),
  evento_id: integer('evento_id')
    .notNull()
    .references(() => eventos.id, { onDelete: 'cascade' }),
  padrinho_id: integer('padrinho_id'),
  tipo_participante: varchar('tipo_participante', { length: 30 }).notNull(),
  status: varchar('status', { length: 30 }).default('pendente').notNull(),
  quarto: varchar('quarto', { length: 40 }).default(''),
  data_inscricao: timestamp('data_inscricao').defaultNow().notNull(),
});

export const urls_unicas = pgTable('urls_unicas', {
  id: serial('id').primaryKey(),
  inscricao_id: integer('inscricao_id')
    .notNull()
    .references(() => inscricoes.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 120 }).notNull().unique(),
  url_completa: text('url_completa').notNull(),
  usado: boolean('usado').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const casaisRelations = relations(casais, ({ many }) => ({
  pessoas: many(pessoas),
  filhos: many(filhos),
  inscricoes: many(inscricoes),
}));

export const pessoasRelations = relations(pessoas, ({ one }) => ({
  casal: one(casais, {
    fields: [pessoas.casal_id],
    references: [casais.id],
  }),
}));

export const filhosRelations = relations(filhos, ({ one }) => ({
  casal: one(casais, {
    fields: [filhos.casal_id],
    references: [casais.id],
  }),
}));
