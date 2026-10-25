import { describe, expect, it } from 'vitest';
import {
  formatCep,
  formatCpf,
  formatDateBr,
  formatDateIsoToSave,
  formatPhone,
} from '../shared/utils/formatters';
import {
  buildCadastroGeralExcel,
  buildFichaCasalData,
  buildListaAfilhados,
  buildListaDiabeticos,
  buildListaFilhos,
  buildListaGeralInscritos,
  buildListaInscritosExcel,
  buildListaOnibus,
  buildListaRestaurante,
  buildListaSeguro,
  buildRelacaoHotel,
  buildRelacaoQuartosAfilhados,
  buildRelacaoRecepcao,
  enrichCasais,
  enrichInscricoes,
} from '../domain/transformers/relatorios.transformer';
import {
  novaInscricaoSchema,
  pessoaSchema,
  registroCasalSchema,
} from '../domain/schemas';
import { sanitizeSpreadsheetCell } from '../infrastructure/exporters/excel.exporter';
import type { CasalCompleto, Inscricao } from '../domain/entities';

const mockCasais: CasalCompleto[] = [
  {
    id: 1,
    data_casamento: '2015-05-16',
    endereco: 'SQN 308 Bloco A',
    bairro: 'Asa Norte',
    cidade: 'Brasília',
    estado: 'DF',
    cep: '70747010',
    contato_emergencia_nome1: 'Roberto',
    contato_emergencia_telefone1: '61999112233',
    pessoas: [
      // Ordem propositalmente invertida (esposa no índice 0) para provar que não há dependência de índice fixo
      {
        tipo: 'esposa',
        nome_completo: 'Ana Paula Mendes',
        nome_social: 'Ana',
        data_nascimento: '1990-07-22',
        email: 'ana@ecc.com.br',
        celular: '61998761122',
        cpf: '98765432100',
        rg: '3456789',
        rg_emissor: 'SSP/DF',
        problema_saude: false,
        medicamento_especial: false,
        diabetico: true,
        dieta_alimentar: 'vegetariano',
        religiao: 'Católica',
      },
      {
        tipo: 'esposo',
        nome_completo: 'Carlos Eduardo Mendes',
        nome_social: 'Carlos',
        data_nascimento: '1988-03-14',
        email: 'carlos@ecc.com.br',
        celular: '61998765432',
        cpf: '12345678901',
        rg: '2345678',
        rg_emissor: 'SSP/DF',
        problema_saude: false,
        medicamento_especial: false,
        diabetico: false,
        dieta_alimentar: 'não',
        religiao: 'Católica',
      },
    ],
    filhos: [
      {
        nome_completo: 'Lucas Mendes',
        data_nascimento: '2018-10-05',
      },
    ],
  },
];

describe('Formatadores Puros (shared/utils/formatters)', () => {
  it('deve formatar datas ISO e BR corretamente', () => {
    expect(formatDateBr('2026-08-01')).toBe('01/08/2026');
    expect(formatDateIsoToSave('01/08/2026')).toBe('2026-08-01');
    expect(formatDateIsoToSave('01082026')).toBe('2026-08-01');
  });

  it('deve ser null-safe ao formatar CPF, telefone e CEP', () => {
    expect(formatCpf(null)).toBe('');
    expect(formatCpf('12345678901')).toBe('123.456.789-01');
    expect(formatPhone('61998765432')).toBe('(61) 99876-5432');
    expect(formatCep('70747010')).toBe('70747-010');
  });

  it('deve sanitizar células Excel contra Spreadsheet Formula Injection (CWE-1236)', () => {
    expect(sanitizeSpreadsheetCell('=CMD|\'/C calc\'!A0')).toBe('\'=CMD|\'/C calc\'!A0');
    expect(sanitizeSpreadsheetCell('+SUM(A1:A10)')).toBe('\'+SUM(A1:A10)');
    expect(sanitizeSpreadsheetCell('-1+1')).toBe('\'-1+1');
    expect(sanitizeSpreadsheetCell('@SUM(1,2)')).toBe('\'@SUM(1,2)');
    expect(sanitizeSpreadsheetCell('Carlos Eduardo')).toBe('Carlos Eduardo');
  });
});

describe('Schemas Zod de Domínio (domain/schemas)', () => {
  it('deve inicializar religião padrão como Católica (com C maiúsculo)', () => {
    const parsed = pessoaSchema.parse({
      tipo: 'esposo',
      nome_completo: 'João Silva',
    });
    expect(parsed.religiao).toBe('Católica');
    expect(parsed.dieta_alimentar).toBe('não');
  });

  it('deve exigir padrinho_id quando afilhado for true em novaInscricaoSchema', () => {
    const invalid = novaInscricaoSchema.safeParse({
      casal_id: 1,
      evento_id: 1,
      afilhado: true,
      padrinho_id: 0,
    });
    expect(invalid.success).toBe(false);

    const valid = novaInscricaoSchema.safeParse({
      casal_id: 1,
      evento_id: 1,
      afilhado: true,
      padrinho_id: 2,
    });
    expect(valid.success).toBe(true);
  });

  it('deve validar registro completo de casal mantendo validadores de cônjuges', () => {
    const result = registroCasalSchema.safeParse({
      casal: {
        endereco: 'Rua 1',
        bairro: 'Centro',
        cidade: 'Brasília',
        cep: '70000-000',
      },
      pessoas: [
        { tipo: 'esposo', nome_completo: 'Carlos', email: 'email-invalido' },
        { tipo: 'esposa', nome_completo: 'Ana', email: 'ana@ecc.com.br' },
      ],
      filhos: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('Transformers Puros de Relatórios (domain/transformers)', () => {
  const casaisEnriquecidos = enrichCasais(mockCasais);
  const casaisMap = new Map(casaisEnriquecidos.map((c) => [c.id, c]));

  const inscricoesRaw: Inscricao[] = [
    {
      id: 10,
      casal_id: 1,
      evento_id: 1,
      status: 'confirmada',
      data_inscricao: '2026-07-01',
      tipo_participante: 'convidado',
      quarto: '202',
      padrinho_id: 999, // Padrinho inexistente para provar null-safety em relacaoRecepcao
    },
  ];

  const inscricoesEnriquecidas = enrichInscricoes(inscricoesRaw, casaisMap);

  it('deve identificar esposo e esposa pelo campo tipo mesmo se o array vier invertido', () => {
    expect(casaisEnriquecidos[0]?.nome).toBe('Carlos e Ana');
    const ficha = buildFichaCasalData(mockCasais[0]!, {
      id: 1,
      nome: 'ECC 2026',
      data_inicio: '2026-08-01',
      data_fim: '2026-08-03',
    });
    expect(ficha.esposo.nome_completo).toBe('Carlos Eduardo Mendes');
    expect(ficha.esposa.nome_completo).toBe('Ana Paula Mendes');
    expect(ficha.tituloEvento).toContain('ECC 2026');
  });

  it('não deve lançar erro em buildRelacaoRecepcao quando o padrinho não estiver na lista', () => {
    const recepcao = buildRelacaoRecepcao(inscricoesEnriquecidas);
    expect(recepcao).toHaveLength(1);
    expect(recepcao[0]?.padrinho).toBe('Não definido');
    expect(recepcao[0]?.telefonePadrinho).toBe('');
  });

  it('deve mapear email e celular corretamente nas exportações Excel', () => {
    const excelInscritos = buildListaInscritosExcel(inscricoesEnriquecidas);
    expect(excelInscritos[0]?.email_esposo).toBe('carlos@ecc.com.br');
    expect(excelInscritos[0]?.celular_esposo).toBe('(61) 99876-5432');

    const excelGeral = buildCadastroGeralExcel(mockCasais);
    expect(excelGeral[0]?.email_esposa).toBe('ana@ecc.com.br');
  });

  it('deve gerar dados consistentes para todos os demais relatórios', () => {
    expect(buildListaGeralInscritos(inscricoesEnriquecidas)).toHaveLength(1);
    expect(buildListaRestaurante(inscricoesEnriquecidas)).toHaveLength(1);
    expect(buildListaDiabeticos(inscricoesEnriquecidas)).toHaveLength(1);
    expect(buildListaAfilhados(inscricoesEnriquecidas, casaisMap)).toHaveLength(1);
    expect(buildListaSeguro(inscricoesEnriquecidas)).toHaveLength(2);
    expect(buildListaFilhos(inscricoesEnriquecidas)).toHaveLength(1);
    expect(buildListaOnibus(inscricoesEnriquecidas)).toHaveLength(2);
    expect(buildRelacaoQuartosAfilhados(inscricoesEnriquecidas)).toHaveLength(1);
    expect(buildRelacaoHotel(inscricoesEnriquecidas)).toHaveLength(1);
  });
});
