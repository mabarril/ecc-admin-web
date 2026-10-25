import type {
  CasalCompleto,
  CasalEnriquecido,
  Evento,
  InscricaoEnriquecida,
} from '../../domain/entities';
import {
  buildListaAfilhados,
  buildListaDiabeticos,
  buildListaFilhos,
  buildListaGeralInscritos,
  buildListaRestaurante,
  buildListaSeguro,
  buildListaSeguroGeral,
  buildRelacaoQuartosAfilhados,
} from '../../domain/transformers/relatorios.transformer';
import { casaisApi } from '../api/services';
import {
  COLUNAS_AFILHADOS,
  COLUNAS_CADASTRO_GERAL_EXCEL,
  COLUNAS_DIABETICOS,
  COLUNAS_FILHOS,
  COLUNAS_LISTA_GERAL_INSCRITOS,
  COLUNAS_LISTA_INSCRITOS_EXCEL,
  COLUNAS_ONIBUS,
  COLUNAS_QUARTOS_AFILHADOS,
  COLUNAS_RESTAURANTE,
  COLUNAS_SEGURO,
  type ExportColumn,
  exportCadastroGeralExcel,
  exportListaAfilhadosExcel,
  exportListaDiabeticosExcel,
  exportListaFilhosExcel,
  exportListaGeralInscritosExcel,
  exportListaInscritosExcel,
  exportListaOnibusExcel,
  exportListaRestauranteExcel,
  exportListaSeguroExcel,
  exportListaSeguroGeralExcel,
  exportRelacaoQuartosAfilhadosExcel,
  exportToExcel,
} from './excel.exporter';
import {
  exportFichaCasalPdf,
  exportListaOnibusPdf,
  exportRelacaoHotelPdf,
  exportRelacaoRecepcaoPdf,
  exportTablePdf,
  type HotelRow,
  type OnibusRow,
  type RecepcaoRow,
} from './pdf.exporter';

export {
  COLUNAS_AFILHADOS,
  COLUNAS_CADASTRO_GERAL_EXCEL,
  COLUNAS_DIABETICOS,
  COLUNAS_FILHOS,
  COLUNAS_LISTA_GERAL_INSCRITOS,
  COLUNAS_LISTA_INSCRITOS_EXCEL,
  COLUNAS_ONIBUS,
  COLUNAS_QUARTOS_AFILHADOS,
  COLUNAS_RESTAURANTE,
  COLUNAS_SEGURO,
  type ExportColumn,
  exportCadastroGeralExcel,
  exportFichaCasalPdf,
  exportListaAfilhadosExcel,
  exportListaDiabeticosExcel,
  exportListaFilhosExcel,
  exportListaGeralInscritosExcel,
  exportListaInscritosExcel,
  exportListaOnibusExcel,
  exportListaOnibusPdf,
  exportListaRestauranteExcel,
  exportListaSeguroExcel,
  exportListaSeguroGeralExcel,
  exportRelacaoHotelPdf,
  exportRelacaoQuartosAfilhadosExcel,
  exportRelacaoRecepcaoPdf,
  exportTablePdf,
  exportToExcel,
  type HotelRow,
  type OnibusRow,
  type RecepcaoRow,
};

export async function gerarFichaCasalPdf(
  casalOrId: number | CasalCompleto,
  evento?: Evento
): Promise<string> {
  const casal =
    typeof casalOrId === 'number'
      ? await casaisApi.buscarPorId(casalOrId)
      : casalOrId;
  return exportFichaCasalPdf(casal, evento);
}

export const relatoriosExporter = {
  // 1. Lista Geral de Inscritos
  async listaGeralInscritosPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<string> {
    const dados = buildListaGeralInscritos(inscricoes);
    return exportTablePdf(
      COLUNAS_LISTA_GERAL_INSCRITOS,
      dados,
      'Lista Geral de Inscritos',
      evento?.nome
    );
  },
  listaGeralInscritosExcel: exportListaGeralInscritosExcel,

  // 2. Lista Restaurante (Dietas Alimentares)
  async listaRestaurantePdf(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<string> {
    const dados = buildListaRestaurante(inscricoes);
    return exportTablePdf(
      COLUNAS_RESTAURANTE,
      dados,
      'Lista de Dietas Alimentares - Restaurante',
      evento?.nome
    );
  },
  listaRestauranteExcel: exportListaRestauranteExcel,

  // 3. Lista de Diabéticos
  async listaDiabeticosPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<string> {
    const dados = buildListaDiabeticos(inscricoes);
    return exportTablePdf(
      COLUNAS_DIABETICOS,
      dados,
      'Lista de Participantes Diabéticos',
      evento?.nome
    );
  },
  listaDiabeticosExcel: exportListaDiabeticosExcel,

  // 4. Lista de Afilhados e Padrinhos
  async listaAfilhadosPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    casaisMap: ReadonlyMap<number, CasalEnriquecido>,
    evento?: Evento
  ): Promise<string> {
    const dados = buildListaAfilhados(inscricoes, casaisMap);
    return exportTablePdf(
      COLUNAS_AFILHADOS,
      dados,
      'Relação de Convidados (Afilhados) e Padrinhos',
      evento?.nome
    );
  },
  listaAfilhadosExcel: exportListaAfilhadosExcel,

  // 5. Lista Seguro do Evento
  async listaSeguroPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<string> {
    const dados = buildListaSeguro(inscricoes);
    return exportTablePdf(
      COLUNAS_SEGURO,
      dados,
      'Lista para Seguro - Evento',
      evento?.nome
    );
  },
  listaSeguroExcel: exportListaSeguroExcel,

  // 6. Lista Seguro Geral (Todos os Casais Cadastrados)
  async listaSeguroGeralPdf(
    casais: readonly CasalCompleto[],
    evento?: Evento
  ): Promise<string> {
    const dados = buildListaSeguroGeral(casais);
    return exportTablePdf(
      COLUNAS_SEGURO,
      dados,
      'Lista para Seguro Geral - Cadastro Completo',
      evento?.nome
    );
  },
  listaSeguroGeralExcel: exportListaSeguroGeralExcel,

  // 7. Planilha Completa de Inscritos no Evento (Excel)
  listaInscritosExcel: exportListaInscritosExcel,

  // 8. Planilha de Cadastro Geral de Casais (Excel)
  cadastroGeralExcel: exportCadastroGeralExcel,

  // 9. Lista de Filhos dos Convidados
  async listaFilhosPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<string> {
    const dados = buildListaFilhos(inscricoes);
    return exportTablePdf(
      COLUNAS_FILHOS,
      dados,
      'Lista de Filhos dos Casais Convidados',
      evento?.nome
    );
  },
  listaFilhosExcel: exportListaFilhosExcel,

  // 10. Lista de Passageiros do Ônibus (Fretamento PDF & Excel)
  listaOnibusPdf: exportListaOnibusPdf,
  listaOnibusExcel: exportListaOnibusExcel,

  // 11. Relação de Quartos Afilhados x Padrinhos
  async relacaoQuartosAfilhadosPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<string> {
    const dados = buildRelacaoQuartosAfilhados(inscricoes);
    return exportTablePdf(
      COLUNAS_QUARTOS_AFILHADOS,
      dados,
      'Relação de Quartos - Afilhados e Padrinhos',
      evento?.nome
    );
  },
  relacaoQuartosAfilhadosExcel: exportRelacaoQuartosAfilhadosExcel,

  // 12. Relação de Hospedagem para o Hotel (PDF)
  relacaoHotelPdf: exportRelacaoHotelPdf,

  // 13. Relação para Recepção - Landscape Zebrada (PDF)
  relacaoRecepcaoPdf: exportRelacaoRecepcaoPdf,

  // Ficha Individual do Casal (PDF)
  gerarFichaCasalPdf,
  exportFichaCasalPdf,

  // Aliases diretos usados no menu de relatórios de Inscrições
  async dietaAlimentarPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<string> {
    return this.listaRestaurantePdf(inscricoes, evento);
  },
  async diabeticosPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<string> {
    return this.listaDiabeticosPdf(inscricoes, evento);
  },
  async afilhadosPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    casaisMap: ReadonlyMap<number, CasalEnriquecido>,
    evento?: Evento
  ): Promise<string> {
    return this.listaAfilhadosPdf(inscricoes, casaisMap, evento);
  },
  async quartosAfilhadosPdf(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<string> {
    return this.relacaoQuartosAfilhadosPdf(inscricoes, evento);
  },
  async listaOnibus(
    inscricoes: readonly InscricaoEnriquecida[],
    evento?: Evento
  ): Promise<void> {
    await exportListaOnibusPdf(inscricoes, evento);
    await exportListaOnibusExcel(inscricoes, evento?.nome);
  },
};
