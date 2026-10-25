export type TipoPessoa = 'esposo' | 'esposa';

export type DietaAlimentar =
  | 'não'
  | 'ovolactovegetariano'
  | 'vegetariano'
  | 'vegano';

export type Religiao =
  | 'Adventista do 7º Dia'
  | 'Católica'
  | 'Evangélica'
  | 'Espírita'
  | 'Outras Denominações'
  | 'Cristão'
  | 'Sem Religião';

export type TipoParticipante = 'encontrista' | 'convidado' | 'equipe';

export type StatusInscricao = 'pendente' | 'confirmada' | 'cancelada';

export interface Usuario {
  readonly id: number;
  readonly nome: string;
  readonly email: string;
  readonly ultimo_login?: string | Date | null;
}

export interface LoginRequest {
  readonly email: string;
  readonly senha: string;
}

export interface LoginResponse {
  readonly success: boolean;
  readonly message: string;
  readonly data?: {
    readonly token: string;
    readonly usuario: Usuario;
  };
}

export interface Pessoa {
  readonly id?: number;
  readonly casal_id?: number;
  readonly tipo: TipoPessoa;
  readonly nome_completo: string;
  readonly nome_social?: string | null;
  readonly data_nascimento?: string | null;
  readonly profissao?: string | null;
  readonly email?: string | null;
  readonly celular?: string | null;
  readonly rg?: string | null;
  readonly rg_emissor?: string | null;
  readonly cpf?: string | null;
  readonly problema_saude: boolean;
  readonly problema_saude_descricao?: string | null;
  readonly medicamento_especial: boolean;
  readonly medicamento_especial_descricao?: string | null;
  readonly diabetico: boolean;
  readonly dieta_alimentar: DietaAlimentar;
  readonly religiao: Religiao;
}

export interface Filho {
  readonly id?: number;
  readonly casal_id?: number;
  readonly nome_completo: string;
  readonly data_nascimento?: string | null;
}

export interface Casal {
  readonly id?: number;
  readonly data_casamento?: string | null;
  readonly endereco: string;
  readonly bairro: string;
  readonly cidade: string;
  readonly estado?: string | null;
  readonly cep: string;
  readonly contato_emergencia_nome1?: string | null;
  readonly contato_emergencia_telefone1?: string | null;
  readonly contato_emergencia_nome2?: string | null;
  readonly contato_emergencia_telefone2?: string | null;
  readonly responsavel_filhos_nome?: string | null;
  readonly responsavel_filhos_telefone?: string | null;
  readonly deleted_at?: string | null;
}

export interface CasalCompleto extends Casal {
  readonly id: number;
  readonly pessoas: readonly Pessoa[];
  readonly filhos: readonly Filho[];
}

export interface RegistroPayload {
  readonly casal: Casal;
  readonly pessoas: readonly Pessoa[];
  readonly filhos: readonly Filho[];
  readonly token?: string;
}

export interface CasalEnriquecido {
  readonly id: number;
  readonly nome: string;
  readonly nome_simples_esposo: string;
  readonly nome_simples_esposa: string;
  readonly nome_esposo: string;
  readonly nome_esposa: string;
  readonly dados: CasalCompleto;
}

export interface Evento {
  readonly id: number;
  readonly nome: string;
  readonly data_inicio: string;
  readonly data_fim: string;
  readonly ativo?: boolean;
}

export interface Inscricao {
  readonly id: number;
  readonly casal_id: number;
  readonly evento_id: number;
  readonly status: StatusInscricao | string;
  readonly data_inscricao: string;
  readonly tipo_participante: TipoParticipante | string;
  readonly quarto?: string | null;
  readonly padrinho_id?: number | null;
}

export interface InscricaoEnriquecida extends Inscricao {
  readonly statusFormatado: 'Confirmada' | 'Pendente' | 'Cancelada';
  readonly casal?: CasalEnriquecido;
}
