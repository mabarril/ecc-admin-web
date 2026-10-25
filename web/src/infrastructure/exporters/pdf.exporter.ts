import type {
  CasalCompleto,
  Evento,
  InscricaoEnriquecida,
} from '../../domain/entities';
import {
  buildFichaCasalData,
  buildListaOnibus,
  buildRelacaoHotel,
  buildRelacaoRecepcao,
} from '../../domain/transformers/relatorios.transformer';
import { formatDateBr } from '../../shared/utils/formatters';
import type { ExportColumn } from './excel.exporter';

export type OnibusRow = ReturnType<typeof buildListaOnibus>[number];
export type HotelRow = ReturnType<typeof buildRelacaoHotel>[number];
export type RecepcaoRow = ReturnType<typeof buildRelacaoRecepcao>[number];

function sanitizePdfFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isInscricaoArray(
  dados: readonly unknown[]
): dados is readonly InscricaoEnriquecida[] {
  if (dados.length === 0) return false;
  const first = dados[0];
  return (
    typeof first === 'object' &&
    first !== null &&
    ('casal_id' in first || 'tipo_participante' in first)
  );
}

export async function exportTablePdf<T extends Record<string, unknown>>(
  colunas: readonly ExportColumn<T>[],
  dados: readonly T[],
  titulo: string,
  eventoNome?: string
): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({
    orientation: colunas.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('ECC - Encontro de Casais com Cristo', 14, 14);

  doc.setFontSize(11);
  doc.text(titulo, 14, 21);

  let startY = 26;
  if (eventoNome) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Evento: ${eventoNome}`, 14, 26);
    startY = 31;
  }

  const head = [colunas.map((col) => col.label)];
  const body = dados.map((item) =>
    colunas.map((col) => {
      const value = item[col.key as keyof T];
      return value === undefined || value === null ? '' : String(value);
    })
  );

  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  const filename = `${sanitizePdfFilename(titulo) || 'Relatorio'}.pdf`;
  doc.save(filename);
  return filename;
}

export async function exportListaOnibusPdf(
  dados: readonly OnibusRow[] | readonly InscricaoEnriquecida[],
  evento?: Evento
): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const rows: readonly OnibusRow[] = isInscricaoArray(dados)
    ? buildListaOnibus(dados)
    : (dados as readonly OnibusRow[]);

  const dataInicio = evento?.data_inicio
    ? formatDateBr(evento.data_inicio)
    : 'A definir';
  const dataFim = evento?.data_fim
    ? formatDateBr(evento.data_fim)
    : 'A definir';
  const nomeEvento = evento?.nome || 'Encontro de Casais com Cristo';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('LISTA DE PASSAGEIROS - ÔNIBUS (CONVIDADOS)', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Evento: ${nomeEvento}`, 14, 22);
  doc.text(`Data de Ida: ${dataInicio}   |   Data de Retorno: ${dataFim}`, 14, 28);
  doc.text(`Total de Passageiros: ${rows.length}`, 14, 34);

  autoTable(doc, {
    startY: 39,
    head: [['#', 'Nome Completo', 'RG', 'Órgão Expedidor', 'CPF']],
    body: rows.map((row, index) => [
      String(index + 1),
      row.nome || '',
      row.rg || '',
      row.orgao || '',
      row.cpf || '',
    ]),
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  const filename = 'Lista_Passageiros_Onibus.pdf';
  doc.save(filename);
  return filename;
}

export async function exportRelacaoHotelPdf(
  dados: readonly HotelRow[] | readonly InscricaoEnriquecida[],
  evento?: Evento
): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const rows: readonly HotelRow[] = isInscricaoArray(dados)
    ? buildRelacaoHotel(dados)
    : (dados as readonly HotelRow[]);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const nomeEvento = evento?.nome || 'Encontro de Casais com Cristo';
  const periodo =
    evento?.data_inicio && evento?.data_fim
      ? `${formatDateBr(evento.data_inicio)} a ${formatDateBr(evento.data_fim)}`
      : '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RELAÇÃO DE HOSPEDAGEM - HOTEL', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    periodo ? `Evento: ${nomeEvento} (${periodo})` : `Evento: ${nomeEvento}`,
    14,
    20
  );

  autoTable(doc, {
    startY: 25,
    head: [
      [
        '#',
        'Quarto',
        'Nome Esposo',
        'RG Esposo',
        'Órgão',
        'CPF Esposo',
        'Nome Esposa',
        'RG Esposa',
        'Órgão',
        'CPF Esposa',
      ],
    ],
    body: rows.map((row, idx) => [
      String(idx + 1),
      row.quarto || '-',
      row.esposo_nome || '',
      row.esposo_rg || '',
      row.esposo_orgao || '',
      row.esposo_cpf || '',
      row.esposa_nome || '',
      row.esposa_rg || '',
      row.esposa_orgao || '',
      row.esposa_cpf || '',
    ]),
    theme: 'grid',
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const filename = 'Relacao_Hotel.pdf';
  doc.save(filename);
  return filename;
}

export async function exportRelacaoRecepcaoPdf(
  dados: readonly RecepcaoRow[] | readonly InscricaoEnriquecida[],
  evento?: Evento
): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const rows: readonly RecepcaoRow[] = isInscricaoArray(dados)
    ? buildRelacaoRecepcao(dados)
    : (dados as readonly RecepcaoRow[]);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const nomeEvento = evento?.nome || 'Encontro de Casais com Cristo';
  const periodo =
    evento?.data_inicio && evento?.data_fim
      ? `${formatDateBr(evento.data_inicio)} a ${formatDateBr(evento.data_fim)}`
      : '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RELAÇÃO DE RECEPÇÃO - CONVIDADOS E PADRINHOS', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    periodo ? `Evento: ${nomeEvento} (${periodo})` : `Evento: ${nomeEvento}`,
    14,
    20
  );

  autoTable(doc, {
    startY: 25,
    head: [
      [
        'Casal Convidado',
        'Quarto',
        'Endereço',
        'Bairro / Cidade',
        'Tel. Esposo',
        'Tel. Esposa',
        'Padrinho',
        'Tel. Padrinho',
        'Tel. Madrinha',
      ],
    ],
    body: rows.map((row) => [
      row?.nome || '',
      row?.quarto || '-',
      row?.endereco || '',
      [row?.bairro, row?.cidade].filter(Boolean).join(' - '),
      row?.telefoneEsposo || '',
      row?.telefoneEsposa || '',
      row?.padrinho || 'Não definido',
      row?.telefonePadrinho || '',
      row?.telefoneMadrinha || '',
    ]),
    theme: 'striped',
    pageBreak: 'auto',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
  });

  const filename = 'Relacao_Recepcao.pdf';
  doc.save(filename);
  return filename;
}

export async function exportFichaCasalPdf(
  casal: CasalCompleto,
  evento?: Evento
): Promise<string> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const ficha = buildFichaCasalData(casal, evento);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(ficha.tituloEvento, 14, 15);

  doc.setFontSize(10);
  doc.text('FICHA CADASTRAL DO CASAL', 14, 22);

  autoTable(doc, {
    startY: 26,
    head: [['Dados do Esposo', 'Informação']],
    body: [
      ['Nome Completo', ficha.esposo.nome_completo],
      ['Como gosta de ser chamado', ficha.esposo.nome_social],
      ['Data de Nascimento', ficha.esposo.data_nascimento],
      ['Profissão', ficha.esposo.profissao],
      ['E-mail', ficha.esposo.email],
      ['Celular', ficha.esposo.celular],
      ['Religião', ficha.esposo.religiao],
      ['RG / Órgão Emissor', `${ficha.esposo.rg} ${ficha.esposo.rg_emissor}`.trim()],
      ['CPF', ficha.esposo.cpf],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 65 },
    },
  });

  const afterEsposoY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? 105;

  autoTable(doc, {
    startY: afterEsposoY + 6,
    head: [['Dados da Esposa', 'Informação']],
    body: [
      ['Nome Completo', ficha.esposa.nome_completo],
      ['Como gosta de ser chamada', ficha.esposa.nome_social],
      ['Data de Nascimento', ficha.esposa.data_nascimento],
      ['Profissão', ficha.esposa.profissao],
      ['E-mail', ficha.esposa.email],
      ['Celular', ficha.esposa.celular],
      ['Religião', ficha.esposa.religiao],
      ['RG / Órgão Emissor', `${ficha.esposa.rg} ${ficha.esposa.rg_emissor}`.trim()],
      ['CPF', ficha.esposa.cpf],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 65 },
    },
  });

  const afterEsposaY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? 185;

  autoTable(doc, {
    startY: afterEsposaY + 6,
    head: [['Endereço e Contatos de Emergência', 'Informação']],
    body: [
      ['Endereço', ficha.casal.endereco],
      ['Bairro', ficha.casal.bairro],
      ['Cidade', ficha.casal.cidade],
      ['CEP', ficha.casal.cep],
      [
        'Contato de Emergência 1',
        `${ficha.casal.contato_emergencia_nome1} ${ficha.casal.contato_emergencia_telefone1}`.trim(),
      ],
      [
        'Contato de Emergência 2',
        `${ficha.casal.contato_emergencia_nome2} ${ficha.casal.contato_emergencia_telefone2}`.trim(),
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 65 },
    },
  });

  doc.save(ficha.filename);
  return ficha.filename;
}
