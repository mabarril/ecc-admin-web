import { z } from 'zod';

export const loginRequestSchema = z.object({
  email: z.string().trim().email('E-mail inválido').max(254, 'E-mail muito longo'),
  senha: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .max(128, 'Senha excede o limite de segurança (128 caracteres)'),
});

export const pessoaPayloadSchema = z.object({
  tipo: z.enum(['esposo', 'esposa']),
  nome_completo: z
    .string()
    .trim()
    .min(1, 'Nome completo é obrigatório')
    .max(180, 'Nome completo excede 180 caracteres'),
  nome_social: z.string().trim().max(100).optional().nullable(),
  data_nascimento: z.string().trim().max(20).optional().nullable(),
  profissao: z.string().trim().max(120).optional().nullable(),
  email: z
    .union([z.literal(''), z.string().trim().email('E-mail inválido').max(160)])
    .optional()
    .nullable(),
  celular: z.string().trim().max(30).optional().nullable(),
  rg: z.string().trim().max(40).optional().nullable(),
  rg_emissor: z.string().trim().max(40).optional().nullable(),
  cpf: z.string().trim().max(20).optional().nullable(),
  problema_saude: z.boolean().default(false),
  problema_saude_descricao: z.string().trim().max(1000).optional().nullable(),
  medicamento_especial: z.boolean().default(false),
  medicamento_especial_descricao: z.string().trim().max(1000).optional().nullable(),
  diabetico: z.boolean().default(false),
  dieta_alimentar: z
    .enum(['não', 'ovolactovegetariano', 'vegetariano', 'vegano'])
    .default('não'),
  religiao: z
    .enum([
      'Adventista do 7º Dia',
      'Católica',
      'Evangélica',
      'Espírita',
      'Outras Denominações',
      'Cristão',
      'Sem Religião',
    ])
    .default('Católica'),
});

export const filhoPayloadSchema = z.object({
  nome_completo: z
    .string()
    .trim()
    .min(1, 'Nome completo do filho é obrigatório')
    .max(180, 'Nome completo do filho excede 180 caracteres'),
  data_nascimento: z.string().trim().max(20).optional().nullable(),
});

export const casalDadosPayloadSchema = z.object({
  data_casamento: z.string().trim().max(20).optional().nullable(),
  endereco: z
    .string()
    .trim()
    .min(1, 'Endereço é obrigatório')
    .max(300, 'Endereço excede 300 caracteres'),
  bairro: z
    .string()
    .trim()
    .min(1, 'Bairro é obrigatório')
    .max(120, 'Bairro excede 120 caracteres'),
  cidade: z
    .string()
    .trim()
    .min(1, 'Cidade é obrigatória')
    .max(120, 'Cidade excede 120 caracteres'),
  estado: z.string().trim().max(10).optional().nullable(),
  cep: z.string().trim().min(1, 'CEP é obrigatório').max(20, 'CEP inválido'),
  contato_emergencia_nome1: z.string().trim().max(160).optional().nullable(),
  contato_emergencia_telefone1: z.string().trim().max(30).optional().nullable(),
  contato_emergencia_nome2: z.string().trim().max(160).optional().nullable(),
  contato_emergencia_telefone2: z.string().trim().max(30).optional().nullable(),
  responsavel_filhos_nome: z.string().trim().max(160).optional().nullable(),
  responsavel_filhos_telefone: z.string().trim().max(30).optional().nullable(),
});

export const registroCasalPayloadSchema = z.object({
  casal: casalDadosPayloadSchema,
  pessoas: z
    .array(pessoaPayloadSchema)
    .min(2, 'O casal deve conter esposo e esposa')
    .max(2, 'O casal deve conter exatamente 2 cônjuges'),
  filhos: z
    .array(filhoPayloadSchema)
    .max(20, 'Limite máximo de 20 filhos por registro')
    .default([]),
  token: z.string().trim().max(128).optional().nullable(),
});

export const eventoPayloadSchema = z.object({
  nome: z.string().trim().min(1, 'Nome do evento é obrigatório').max(160),
  data_inicio: z.string().trim().min(1, 'Data de início é obrigatória').max(20),
  data_fim: z.string().trim().min(1, 'Data de fim é obrigatória').max(20),
  ativo: z.boolean().default(true),
});

export const inscricaoCreatePayloadSchema = z.object({
  casal_id: z.number().int().positive('casal_id inválido'),
  evento_id: z.number().int().positive('evento_id inválido'),
  tipo_participante: z
    .enum(['encontrista', 'convidado', 'equipe'])
    .default('encontrista'),
  status: z.enum(['pendente', 'confirmada', 'cancelada']).default('pendente'),
  padrinho_id: z.number().int().nonnegative().optional().nullable(),
  quarto: z.string().trim().max(40).optional().nullable(),
});

export const inscricaoUpdatePayloadSchema = z.object({
  tipo_participante: z.enum(['encontrista', 'convidado', 'equipe']).optional(),
  status: z.enum(['pendente', 'confirmada', 'cancelada']).optional(),
  padrinho_id: z.number().int().nonnegative().optional().nullable(),
  quarto: z.string().trim().max(40).optional().nullable(),
});

export const gerarConvitePayloadSchema = z.object({
  casal_id: z.union([
    z.number().int().positive(),
    z.object({ id: z.number().int().positive() }),
  ]),
  evento_id: z.number().int().positive().optional(),
  padrinho_id: z
    .union([z.number().int().nonnegative(), z.object({ id: z.number().int().positive() })])
    .optional()
    .nullable(),
});
