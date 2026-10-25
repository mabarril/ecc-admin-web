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
  id: number;
  nome: string;
  email: string;
  senha_hash?: string;
  ultimo_login?: Date | string | null;
  created_at?: Date | string;
}

export interface Pessoa {
  id?: number;
  casal_id?: number;
  tipo: TipoPessoa;
  nome_completo: string;
  nome_social?: string | null;
  data_nascimento?: string | null;
  profissao?: string | null;
  email?: string | null;
  celular?: string | null;
  rg?: string | null;
  rg_emissor?: string | null;
  cpf?: string | null;
  problema_saude: boolean;
  problema_saude_descricao?: string | null;
  medicamento_especial: boolean;
  medicamento_especial_descricao?: string | null;
  diabetico: boolean;
  dieta_alimentar: DietaAlimentar;
  religiao: Religiao;
}

export interface Filho {
  id?: number;
  casal_id?: number;
  nome_completo: string;
  data_nascimento?: string | null;
}

export interface Casal {
  id: number;
  data_casamento?: string | null;
  endereco: string;
  bairro: string;
  cidade: string;
  estado?: string | null;
  cep: string;
  contato_emergencia_nome1?: string | null;
  contato_emergencia_telefone1?: string | null;
  contato_emergencia_nome2?: string | null;
  contato_emergencia_telefone2?: string | null;
  responsavel_filhos_nome?: string | null;
  responsavel_filhos_telefone?: string | null;
  deleted_at?: string | null;
}

export interface CasalAgregado extends Casal {
  pessoas: Pessoa[];
  filhos: Filho[];
}

export interface Evento {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
}

export interface Inscricao {
  id: number;
  casal_id: number;
  evento_id: number;
  padrinho_id?: number | null;
  tipo_participante: TipoParticipante;
  status: StatusInscricao;
  quarto?: string | null;
  data_inscricao: string;
}

export interface UrlUnica {
  id: number;
  inscricao_id: number;
  token: string;
  url_completa: string;
  usado: boolean;
  created_at: string;
}
