import type {
  CasalCompleto,
  CasalEnriquecido,
  InscricaoEnriquecida,
} from '../../domain/entities';
import {
  buildCadastroGeralExcel,
  buildListaAfilhados,
  buildListaDiabeticos,
  buildListaFilhos,
  buildListaGeralInscritos,
  buildListaInscritosExcel,
  buildListaOnibus,
  buildListaRestaurante,
  buildListaSeguro,
  buildListaSeguroGeral,
  buildRelacaoQuartosAfilhados,
} from '../../domain/transformers/relatorios.transformer';

export interface ExportColumn<T = Record<string, unknown>> {
  readonly key: (keyof T & string) | string;
  readonly label: string;
}

function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const FORMULA_INJECTION_REGEX = /^[=+\-@\t\r]/;

/**
 * Mitigação contra OWASP CSV / Spreadsheet Formula Injection (CWE-1236).
 * Prefixa células textuais iniciadas por =, +, -, @, Tab ou CR com apóstrofo (').
 */
export function sanitizeSpreadsheetCell(value: unknown): unknown {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  const str = String(value);
  if (FORMULA_INJECTION_REGEX.test(str)) {
    return `'${str}`;
  }
  return str;
}

export async function exportToExcel<T extends Record<string, unknown>>(
  colunas: readonly ExportColumn<T>[],
  dados: readonly T[],
  nomeBaseArquivo: string,
  abaNome = 'Relatorio'
): Promise<string> {
  const XLSX = await import('xlsx');

  const rows = dados.map((item) => {
    const row: Record<string, unknown> = {};
    for (const col of colunas) {
      const val = item[col.key as keyof T];
      row[col.label] = sanitizeSpreadsheetCell(val);
    }
    return row;
  });

  const worksheet =
    rows.length > 0
      ? XLSX.utils.json_to_sheet(rows)
      : XLSX.utils.aoa_to_sheet([colunas.map((c) => c.label)]);

  worksheet['!cols'] = colunas.map((col) => {
    let maxLen = col.label.length;
    for (const item of dados) {
      const val = item[col.key as keyof T];
      const strLen = val !== undefined && val !== null ? String(val).length : 0;
      if (strLen > maxLen) {
        maxLen = strLen;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 55) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, abaNome.slice(0, 31));

  const safeName = sanitizeFilename(nomeBaseArquivo) || 'relatorio';
  const filename = `${safeName}_${buildTimestamp()}.xlsx`;
  XLSX.writeFile(workbook, filename);
  return filename;
}

export const COLUNAS_LISTA_GERAL_INSCRITOS: readonly ExportColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome do Casal' },
  { key: 'tipo_participante', label: 'Participação' },
  { key: 'status', label: 'Status' },
];

export const COLUNAS_RESTAURANTE: readonly ExportColumn[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'dieta', label: 'Dieta Alimentar' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'telefone', label: 'Telefone' },
];

export const COLUNAS_DIABETICOS: readonly ExportColumn[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'diabético', label: 'Diabético' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'telefone', label: 'Telefone' },
];

export const COLUNAS_AFILHADOS: readonly ExportColumn[] = [
  { key: 'convidado', label: 'Convidado (Afilhado)' },
  { key: 'padrinho', label: 'Padrinho' },
];

export const COLUNAS_SEGURO: readonly ExportColumn[] = [
  { key: 'nome', label: 'Nome Completo' },
  { key: 'cpf', label: 'CPF' },
  { key: 'data_nascimento', label: 'Data de Nascimento' },
  { key: 'rg', label: 'RG' },
  { key: 'orgao_emissor', label: 'Órgão Emissor' },
  { key: 'sexo', label: 'Sexo' },
  { key: 'casal', label: 'Casal' },
];

export const COLUNAS_LISTA_INSCRITOS_EXCEL: readonly ExportColumn[] = [
  { key: 'id', label: 'ID Inscrição' },
  { key: 'casal', label: 'Casal' },
  { key: 'quarto', label: 'Quarto' },
  { key: 'padrinho', label: 'Padrinho' },
  { key: 'nome_esposo', label: 'Nome Esposo' },
  { key: 'nome_completo_esposo', label: 'Nome Completo Esposo' },
  { key: 'email_esposo', label: 'E-mail Esposo' },
  { key: 'dn_esposo', label: 'Data Nasc. Esposo' },
  { key: 'profissao_esposo', label: 'Profissão Esposo' },
  { key: 'rg_esposo', label: 'RG Esposo' },
  { key: 'orgao_emissor_esposo', label: 'Órgão Emissor Esposo' },
  { key: 'cpf_esposo', label: 'CPF Esposo' },
  { key: 'diabetico_esposo', label: 'Diabético Esposo' },
  { key: 'religiao_esposo', label: 'Religião Esposo' },
  { key: 'celular_esposo', label: 'Celular Esposo' },
  { key: 'nome_esposa', label: 'Nome Esposa' },
  { key: 'nome_completo_esposa', label: 'Nome Completo Esposa' },
  { key: 'email_esposa', label: 'E-mail Esposa' },
  { key: 'dn_esposa', label: 'Data Nasc. Esposa' },
  { key: 'profissao_esposa', label: 'Profissão Esposa' },
  { key: 'rg_esposa', label: 'RG Esposa' },
  { key: 'orgao_emissor_esposa', label: 'Órgão Emissor Esposa' },
  { key: 'cpf_esposa', label: 'CPF Esposa' },
  { key: 'diabetico_esposa', label: 'Diabético Esposa' },
  { key: 'religiao_esposa', label: 'Religião Esposa' },
  { key: 'celular_esposa', label: 'Celular Esposa' },
  { key: 'dt_casamento', label: 'Data Casamento' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'emergencia_1', label: 'Contato Emergência 1' },
  { key: 'tel_emergencia_1', label: 'Tel. Emergência 1' },
  { key: 'emergencia_2', label: 'Contato Emergência 2' },
  { key: 'tel_emergencia_2', label: 'Tel. Emergência 2' },
];

export const COLUNAS_CADASTRO_GERAL_EXCEL: readonly ExportColumn[] = [
  { key: 'casal', label: 'Casal' },
  { key: 'id_casal', label: 'ID Casal' },
  { key: 'nome_esposo', label: 'Nome Esposo' },
  { key: 'nome_completo_esposo', label: 'Nome Completo Esposo' },
  { key: 'email_esposo', label: 'E-mail Esposo' },
  { key: 'dn_esposo', label: 'Data Nasc. Esposo' },
  { key: 'profissao_esposo', label: 'Profissão Esposo' },
  { key: 'rg_esposo', label: 'RG Esposo' },
  { key: 'orgao_emissor_esposo', label: 'Órgão Emissor Esposo' },
  { key: 'cpf_esposo', label: 'CPF Esposo' },
  { key: 'diabetico_esposo', label: 'Diabético Esposo' },
  { key: 'religiao_esposo', label: 'Religião Esposo' },
  { key: 'celular_esposo', label: 'Celular Esposo' },
  { key: 'nome_esposa', label: 'Nome Esposa' },
  { key: 'nome_completo_esposa', label: 'Nome Completo Esposa' },
  { key: 'email_esposa', label: 'E-mail Esposa' },
  { key: 'dn_esposa', label: 'Data Nasc. Esposa' },
  { key: 'profissao_esposa', label: 'Profissão Esposa' },
  { key: 'rg_esposa', label: 'RG Esposa' },
  { key: 'orgao_emissor_esposa', label: 'Órgão Emissor Esposa' },
  { key: 'cpf_esposa', label: 'CPF Esposa' },
  { key: 'diabetico_esposa', label: 'Diabético Esposa' },
  { key: 'religiao_esposa', label: 'Religião Esposa' },
  { key: 'celular_esposa', label: 'Celular Esposa' },
  { key: 'dt_casamento', label: 'Data Casamento' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'bairro', label: 'Bairro' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'emergencia_1', label: 'Contato Emergência 1' },
  { key: 'tel_emergencia_1', label: 'Tel. Emergência 1' },
  { key: 'emergencia_2', label: 'Contato Emergência 2' },
  { key: 'tel_emergencia_2', label: 'Tel. Emergência 2' },
];

export const COLUNAS_FILHOS: readonly ExportColumn[] = [
  { key: 'nome', label: 'Pais (Convidado)' },
  { key: 'nome_filho', label: 'Nome do Filho(a)' },
  { key: 'data_nascimento', label: 'Data de Nascimento' },
];

export const COLUNAS_ONIBUS: readonly ExportColumn[] = [
  { key: 'nome', label: 'Nome Completo' },
  { key: 'rg', label: 'RG' },
  { key: 'orgao', label: 'Órgão Expedidor' },
  { key: 'cpf', label: 'CPF' },
];

export const COLUNAS_QUARTOS_AFILHADOS: readonly ExportColumn[] = [
  { key: 'nome', label: 'Convidado (Afilhado)' },
  { key: 'quarto', label: 'Quarto Afilhado' },
  { key: 'padrinho', label: 'Padrinho' },
  { key: 'quarto_padrinho', label: 'Quarto Padrinho' },
];

export async function exportListaGeralInscritosExcel(
  inscricoes: readonly InscricaoEnriquecida[]
): Promise<string> {
  const dados = buildListaGeralInscritos(inscricoes);
  return exportToExcel(
    COLUNAS_LISTA_GERAL_INSCRITOS,
    dados,
    'Lista_Geral_Inscritos',
    'Inscritos'
  );
}

export async function exportListaInscritosExcel(
  inscricoes: readonly InscricaoEnriquecida[]
): Promise<string> {
  const dados = buildListaInscritosExcel(inscricoes);
  return exportToExcel(
    COLUNAS_LISTA_INSCRITOS_EXCEL,
    dados,
    'Lista_Inscritos_Completa',
    'Inscritos'
  );
}

export async function exportCadastroGeralExcel(
  casais: readonly CasalCompleto[]
): Promise<string> {
  const dados = buildCadastroGeralExcel(casais);
  return exportToExcel(
    COLUNAS_CADASTRO_GERAL_EXCEL,
    dados,
    'Cadastro_Geral_Casais',
    'Cadastro Geral'
  );
}

export async function exportListaSeguroExcel(
  inscricoes: readonly InscricaoEnriquecida[]
): Promise<string> {
  const dados = buildListaSeguro(inscricoes);
  return exportToExcel(COLUNAS_SEGURO, dados, 'Lista_Seguro_Evento', 'Seguro');
}

export async function exportListaSeguroGeralExcel(
  casais: readonly CasalCompleto[]
): Promise<string> {
  const dados = buildListaSeguroGeral(casais);
  return exportToExcel(
    COLUNAS_SEGURO,
    dados,
    'Lista_Seguro_Geral',
    'Seguro Geral'
  );
}

export async function exportListaFilhosExcel(
  inscricoes: readonly InscricaoEnriquecida[]
): Promise<string> {
  const dados = buildListaFilhos(inscricoes);
  return exportToExcel(COLUNAS_FILHOS, dados, 'Lista_Filhos_Convidados', 'Filhos');
}

export async function exportListaOnibusExcel(
  inscricoes: readonly InscricaoEnriquecida[]
): Promise<string> {
  const dados = buildListaOnibus(inscricoes);
  return exportToExcel(
    COLUNAS_ONIBUS,
    dados,
    'Lista_Passageiros_Onibus',
    'Passageiros'
  );
}

export async function exportListaRestauranteExcel(
  inscricoes: readonly InscricaoEnriquecida[]
): Promise<string> {
  const dados = buildListaRestaurante(inscricoes);
  return exportToExcel(
    COLUNAS_RESTAURANTE,
    dados,
    'Lista_Dietas_Restaurante',
    'Dietas'
  );
}

export async function exportListaDiabeticosExcel(
  inscricoes: readonly InscricaoEnriquecida[]
): Promise<string> {
  const dados = buildListaDiabeticos(inscricoes);
  return exportToExcel(
    COLUNAS_DIABETICOS,
    dados,
    'Lista_Diabeticos',
    'Diabéticos'
  );
}

export async function exportListaAfilhadosExcel(
  inscricoes: readonly InscricaoEnriquecida[],
  casaisMap: ReadonlyMap<number, CasalEnriquecido>
): Promise<string> {
  const dados = buildListaAfilhados(inscricoes, casaisMap);
  return exportToExcel(COLUNAS_AFILHADOS, dados, 'Lista_Afilhados', 'Afilhados');
}

export async function exportRelacaoQuartosAfilhadosExcel(
  inscricoes: readonly InscricaoEnriquecida[]
): Promise<string> {
  const dados = buildRelacaoQuartosAfilhados(inscricoes);
  return exportToExcel(
    COLUNAS_QUARTOS_AFILHADOS,
    dados,
    'Relacao_Quartos_Afilhados',
    'Quartos Afilhados'
  );
}
