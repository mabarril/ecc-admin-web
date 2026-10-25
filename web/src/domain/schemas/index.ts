import { z } from 'zod';
import type { DietaAlimentar, Religiao } from '../entities';

export const RELIGIOES: readonly Religiao[] = [
  'Adventista do 7º Dia',
  'Evangélica',
  'Espírita',
  'Católica',
  'Outras Denominações',
  'Cristão',
  'Sem Religião',
] as const;

export const DIETAS_ALIMENTARES: readonly DietaAlimentar[] = [
  'não',
  'ovolactovegetariano',
  'vegetariano',
  'vegano',
] as const;

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'O e-mail é obrigatório.' })
    .trim()
    .min(1, 'O e-mail é obrigatório.')
    .email('Informe um endereço de e-mail válido.'),
  senha: z
    .string({ required_error: 'A senha é obrigatória.' })
    .min(1, 'A senha é obrigatória.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const pessoaSchema = z.object({
  id: z.number().optional(),
  casal_id: z.number().optional(),
  tipo: z.enum(['esposo', 'esposa'], {
    required_error: 'O tipo de cônjuge é obrigatório.',
  }),
  nome_completo: z
    .string({ required_error: 'O nome completo é obrigatório.' })
    .trim()
    .min(2, 'O nome completo deve ter pelo menos 2 caracteres.'),
  nome_social: z.string().trim().optional().default(''),
  data_nascimento: z.string().trim().optional().default(''),
  profissao: z.string().trim().optional().default(''),
  email: z
    .union([
      z.literal(''),
      z.string().trim().email('Informe um e-mail válido.'),
    ])
    .optional()
    .default(''),
  celular: z.string().trim().optional().default(''),
  rg: z.string().trim().optional().default(''),
  rg_emissor: z.string().trim().optional().default(''),
  cpf: z.string().trim().optional().default(''),
  problema_saude: z.boolean().default(false),
  problema_saude_descricao: z.string().trim().optional().default(''),
  medicamento_especial: z.boolean().default(false),
  medicamento_especial_descricao: z.string().trim().optional().default(''),
  diabetico: z.boolean().default(false),
  dieta_alimentar: z
    .enum(['não', 'ovolactovegetariano', 'vegetariano', 'vegano'])
    .default('não'),
  // Corrigido: valor padrão 'Católica' (com inicial maiúscula) consistente com RELIGIOES
  religiao: z
    .enum([
      'Adventista do 7º Dia',
      'Evangélica',
      'Espírita',
      'Católica',
      'Outras Denominações',
      'Cristão',
      'Sem Religião',
    ])
    .default('Católica'),
});

export type PessoaFormValues = z.infer<typeof pessoaSchema>;

export const filhoSchema = z.object({
  id: z.number().optional(),
  casal_id: z.number().optional(),
  nome_completo: z
    .string({ required_error: 'O nome completo do filho(a) é obrigatório.' })
    .trim()
    .min(2, 'Informe o nome completo do filho(a).'),
  data_nascimento: z.string().trim().optional().default(''),
});

export type FilhoFormValues = z.infer<typeof filhoSchema>;

export const casalDadosSchema = z.object({
  id: z.number().optional(),
  data_casamento: z.string().trim().optional().default(''),
  endereco: z
    .string({ required_error: 'O endereço é obrigatório.' })
    .trim()
    .min(2, 'O endereço é obrigatório.'),
  bairro: z
    .string({ required_error: 'O bairro é obrigatório.' })
    .trim()
    .min(2, 'O bairro é obrigatório.'),
  cidade: z
    .string({ required_error: 'A cidade é obrigatória.' })
    .trim()
    .min(2, 'A cidade é obrigatória.'),
  estado: z.string().trim().optional().default(''),
  cep: z
    .string({ required_error: 'O CEP é obrigatório.' })
    .trim()
    .min(8, 'Informe um CEP válido com 8 dígitos.'),
  contato_emergencia_nome1: z.string().trim().optional().default(''),
  contato_emergencia_telefone1: z.string().trim().optional().default(''),
  contato_emergencia_nome2: z.string().trim().optional().default(''),
  contato_emergencia_telefone2: z.string().trim().optional().default(''),
  responsavel_filhos_nome: z.string().trim().optional().default(''),
  responsavel_filhos_telefone: z.string().trim().optional().default(''),
});

export type CasalDadosFormValues = z.infer<typeof casalDadosSchema>;

export const registroCasalSchema = z.object({
  casal: casalDadosSchema,
  pessoas: z
    .tuple([pessoaSchema, pessoaSchema])
    .or(z.array(pessoaSchema).min(2, 'Informe os dados do esposo e da esposa.')),
  filhos: z.array(filhoSchema).default([]),
});

export type RegistroCasalFormValues = z.infer<typeof registroCasalSchema>;

export const novaInscricaoSchema = z
  .object({
    casal_id: z
      .number({
        required_error: 'Selecione um casal.',
        invalid_type_error: 'Selecione um casal válido.',
      })
      .int()
      .positive('Selecione um casal válido.'),
    evento_id: z
      .number({
        required_error: 'Selecione um evento.',
        invalid_type_error: 'Selecione um evento válido.',
      })
      .int()
      .positive('Selecione um evento válido.'),
    afilhado: z.boolean().default(false),
    padrinho_id: z.number().int().nonnegative().optional().default(0),
    quarto: z.string().trim().optional().default(''),
  })
  .superRefine((data, ctx) => {
    if (data.afilhado && (!data.padrinho_id || data.padrinho_id <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['padrinho_id'],
        message: 'Selecione o casal padrinho para o afilhado/convidado.',
      });
    }
  });

export type NovaInscricaoFormValues = z.infer<typeof novaInscricaoSchema>;
