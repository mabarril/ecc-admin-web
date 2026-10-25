import type {
  CasalCompleto,
  CasalEnriquecido,
  Evento,
  Inscricao,
  InscricaoEnriquecida,
  Pessoa,
} from '../entities';
import { formatCpf, formatDateBr, formatPhone } from '../../shared/utils/formatters';

export function findConjuge(
  pessoas: readonly Pessoa[] | undefined | null,
  tipo: 'esposo' | 'esposa'
): Pessoa | undefined {
  if (!Array.isArray(pessoas)) return undefined;
  return pessoas.find((p) => p.tipo === tipo);
}

export function enrichCasais(
  casais: readonly CasalCompleto[] | undefined | null
): CasalEnriquecido[] {
  if (!Array.isArray(casais)) return [];

  return casais
    .map((casal) => {
      const esposo = findConjuge(casal.pessoas, 'esposo');
      const esposa = findConjuge(casal.pessoas, 'esposa');
      const nomeEsposo = esposo?.nome_social || esposo?.nome_completo || '';
      const nomeEsposa = esposa?.nome_social || esposa?.nome_completo || '';

      return {
        id: casal.id,
        nome: `${nomeEsposo} e ${nomeEsposa}`.trim(),
        nome_simples_esposo: nomeEsposo,
        nome_simples_esposa: nomeEsposa,
        nome_esposo: `${nomeEsposo} da ${nomeEsposa}`.trim(),
        nome_esposa: `${nomeEsposa} do ${nomeEsposo}`.trim(),
        dados: casal,
      };
    })
    .sort((a, b) => {
      const cmp = a.nome_esposo
        .toLowerCase()
        .localeCompare(b.nome_esposo.toLowerCase());
      if (cmp !== 0) return cmp;
      return a.nome_esposa
        .toLowerCase()
        .localeCompare(b.nome_esposa.toLowerCase());
    });
}

export function enrichInscricoes(
  inscricoes: readonly Inscricao[] | undefined | null,
  casaisMap: ReadonlyMap<number, CasalEnriquecido>
): InscricaoEnriquecida[] {
  if (!Array.isArray(inscricoes)) return [];

  return inscricoes.map((inscricao) => {
    const statusLower = String(inscricao.status || '').toLowerCase();
    const statusFormatado =
      statusLower === 'confirmada'
        ? 'Confirmada'
        : statusLower === 'cancelada'
          ? 'Cancelada'
          : 'Pendente';

    return {
      ...inscricao,
      quarto: inscricao.quarto ?? '',
      statusFormatado,
      casal: casaisMap.get(inscricao.casal_id),
    };
  });
}

export function buildListaGeralInscritos(
  inscricoes: readonly InscricaoEnriquecida[]
) {
  return inscricoes
    .map((item) => ({
      id: item.id,
      nome: item.casal?.nome || 'Casal não encontrado',
      tipo_participante: item.tipo_participante,
      status: item.statusFormatado,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export function buildListaRestaurante(
  inscricoes: readonly InscricaoEnriquecida[]
) {
  const rows: Array<{
    nome: string;
    dieta: string;
    tipo: string;
    telefone: string;
  }> = [];

  for (const participante of inscricoes) {
    const pessoas = participante.casal?.dados?.pessoas ?? [];
    for (const pessoa of pessoas) {
      if (pessoa.dieta_alimentar && pessoa.dieta_alimentar !== 'não') {
        const nome =
          pessoa.tipo === 'esposo'
            ? participante.casal?.nome_esposo || pessoa.nome_completo
            : participante.casal?.nome_esposa || pessoa.nome_completo;

        rows.push({
          nome,
          dieta: pessoa.dieta_alimentar,
          tipo: String(participante.tipo_participante),
          telefone: formatPhone(pessoa.celular),
        });
      }
    }
  }

  return rows.sort((a, b) => a.nome.localeCompare(b.nome));
}

export function buildListaDiabeticos(
  inscricoes: readonly InscricaoEnriquecida[]
) {
  const rows: Array<{
    nome: string;
    diabético: string;
    tipo: string;
    telefone: string;
  }> = [];

  for (const participante of inscricoes) {
    const pessoas = participante.casal?.dados?.pessoas ?? [];
    for (const pessoa of pessoas) {
      if (pessoa.diabetico === true) {
        const nome =
          pessoa.tipo === 'esposo'
            ? participante.casal?.nome_esposo || pessoa.nome_completo
            : participante.casal?.nome_esposa || pessoa.nome_completo;

        rows.push({
          nome,
          diabético: 'SIM',
          tipo: String(participante.tipo_participante),
          telefone: formatPhone(pessoa.celular),
        });
      }
    }
  }

  return rows.sort((a, b) => a.nome.localeCompare(b.nome));
}

export function buildListaAfilhados(
  inscricoes: readonly InscricaoEnriquecida[],
  casaisMap: ReadonlyMap<number, CasalEnriquecido>
) {
  return inscricoes
    .filter((i) => i.tipo_participante === 'convidado')
    .map((participante) => ({
      convidado: participante.casal?.nome || 'Não encontrado',
      padrinho: participante.padrinho_id
        ? casaisMap.get(participante.padrinho_id)?.nome || 'Não definido'
        : 'Não definido',
    }))
    .sort((a, b) => a.convidado.localeCompare(b.convidado));
}

export function buildListaSeguro(inscricoes: readonly InscricaoEnriquecida[]) {
  const rows: Array<{
    nome: string;
    cpf: string;
    data_nascimento: string;
    rg: string;
    orgao_emissor: string;
    sexo: string;
    casal: string;
  }> = [];

  for (const participante of inscricoes) {
    const pessoas = participante.casal?.dados?.pessoas ?? [];
    for (const pessoa of pessoas) {
      rows.push({
        nome: pessoa.nome_completo || '',
        cpf: formatCpf(pessoa.cpf),
        data_nascimento: formatDateBr(pessoa.data_nascimento),
        rg: pessoa.rg || '',
        orgao_emissor: pessoa.rg_emissor || '',
        sexo: pessoa.tipo === 'esposo' ? 'Masculino' : 'Feminino',
        casal:
          pessoa.tipo === 'esposo'
            ? participante.casal?.nome_esposo || ''
            : participante.casal?.nome_esposa || '',
      });
    }
  }

  return rows.sort((a, b) => a.nome.localeCompare(b.nome));
}

export function buildListaSeguroGeral(casais: readonly CasalCompleto[]) {
  const rows: Array<{
    nome: string;
    cpf: string;
    data_nascimento: string;
    rg: string;
    orgao_emissor: string;
    sexo: string;
    casal: string;
  }> = [];

  for (const participante of casais) {
    const esposo =
      findConjuge(participante.pessoas, 'esposo')?.nome_social || '';
    const esposa =
      findConjuge(participante.pessoas, 'esposa')?.nome_social || '';

    for (const pessoa of participante.pessoas ?? []) {
      rows.push({
        nome: pessoa.nome_completo || '',
        cpf: formatCpf(pessoa.cpf),
        data_nascimento: formatDateBr(pessoa.data_nascimento),
        rg: pessoa.rg || '',
        orgao_emissor: pessoa.rg_emissor || '',
        sexo: pessoa.tipo === 'esposo' ? 'Masculino' : 'Feminino',
        casal:
          pessoa.tipo === 'esposo'
            ? `${esposo} da ${esposa}`.trim()
            : `${esposa} do ${esposo}`.trim(),
      });
    }
  }

  return rows.sort((a, b) => a.nome.localeCompare(b.nome));
}

export function buildListaInscritosExcel(
  inscricoes: readonly InscricaoEnriquecida[]
) {
  return inscricoes
    .map((item) => {
      const dados = item.casal?.dados;
      const esposo = findConjuge(dados?.pessoas, 'esposo');
      const esposa = findConjuge(dados?.pessoas, 'esposa');
      const padrinhoInscricao =
        item.tipo_participante === 'convidado' && item.padrinho_id
          ? inscricoes.find((p) => p.casal_id === item.padrinho_id)?.casal?.nome
          : '';

      return {
        id: item.id,
        casal: `${esposo?.nome_social || ''} e ${esposa?.nome_social || ''}`.trim(),
        quarto: item.quarto || '',
        padrinho: padrinhoInscricao || '',
        nome_esposo: esposo?.nome_social || '',
        nome_completo_esposo: esposo?.nome_completo || '',
        email_esposo: esposo?.email || '',
        dn_esposo: formatDateBr(esposo?.data_nascimento),
        profissao_esposo: esposo?.profissao || '',
        rg_esposo: esposo?.rg || '',
        orgao_emissor_esposo: esposo?.rg_emissor || '',
        cpf_esposo: formatCpf(esposo?.cpf),
        diabetico_esposo: esposo?.diabetico ? 'SIM' : 'NÃO',
        religiao_esposo: esposo?.religiao || '',
        celular_esposo: formatPhone(esposo?.celular),
        nome_esposa: esposa?.nome_social || '',
        nome_completo_esposa: esposa?.nome_completo || '',
        email_esposa: esposa?.email || '',
        dn_esposa: formatDateBr(esposa?.data_nascimento),
        profissao_esposa: esposa?.profissao || '',
        rg_esposa: esposa?.rg || '',
        orgao_emissor_esposa: esposa?.rg_emissor || '',
        cpf_esposa: formatCpf(esposa?.cpf),
        diabetico_esposa: esposa?.diabetico ? 'SIM' : 'NÃO',
        religiao_esposa: esposa?.religiao || '',
        celular_esposa: formatPhone(esposa?.celular),
        dt_casamento: formatDateBr(dados?.data_casamento),
        endereco: dados?.endereco || '',
        bairro: dados?.bairro || '',
        cidade: dados?.cidade || '',
        emergencia_1: dados?.contato_emergencia_nome1 || '',
        tel_emergencia_1: formatPhone(dados?.contato_emergencia_telefone1),
        emergencia_2: dados?.contato_emergencia_nome2 || '',
        tel_emergencia_2: formatPhone(dados?.contato_emergencia_telefone2),
      };
    })
    .sort((a, b) => a.casal.localeCompare(b.casal));
}

export function buildCadastroGeralExcel(casais: readonly CasalCompleto[]) {
  return casais
    .map((casal) => {
      const esposo = findConjuge(casal.pessoas, 'esposo');
      const esposa = findConjuge(casal.pessoas, 'esposa');

      return {
        casal: `${esposo?.nome_social || ''} e ${esposa?.nome_social || ''}`.trim(),
        id_casal: casal.id,
        nome_esposo: esposo?.nome_social || '',
        nome_completo_esposo: esposo?.nome_completo || '',
        email_esposo: esposo?.email || '',
        dn_esposo: formatDateBr(esposo?.data_nascimento),
        profissao_esposo: esposo?.profissao || '',
        rg_esposo: esposo?.rg || '',
        orgao_emissor_esposo: esposo?.rg_emissor || '',
        cpf_esposo: formatCpf(esposo?.cpf),
        diabetico_esposo: esposo?.diabetico ? 'SIM' : 'NÃO',
        religiao_esposo: esposo?.religiao || '',
        celular_esposo: formatPhone(esposo?.celular),
        nome_esposa: esposa?.nome_social || '',
        nome_completo_esposa: esposa?.nome_completo || '',
        email_esposa: esposa?.email || '',
        dn_esposa: formatDateBr(esposa?.data_nascimento),
        profissao_esposa: esposa?.profissao || '',
        rg_esposa: esposa?.rg || '',
        orgao_emissor_esposa: esposa?.rg_emissor || '',
        cpf_esposa: formatCpf(esposa?.cpf),
        diabetico_esposa: esposa?.diabetico ? 'SIM' : 'NÃO',
        religiao_esposa: esposa?.religiao || '',
        celular_esposa: formatPhone(esposa?.celular),
        dt_casamento: formatDateBr(casal.data_casamento),
        endereco: casal.endereco || '',
        bairro: casal.bairro || '',
        cidade: casal.cidade || '',
        emergencia_1: casal.contato_emergencia_nome1 || '',
        tel_emergencia_1: formatPhone(casal.contato_emergencia_telefone1),
        emergencia_2: casal.contato_emergencia_nome2 || '',
        tel_emergencia_2: formatPhone(casal.contato_emergencia_telefone2),
      };
    })
    .sort((a, b) => a.casal.localeCompare(b.casal));
}

export function buildListaFilhos(inscricoes: readonly InscricaoEnriquecida[]) {
  const rows: Array<{
    nome: string;
    nome_filho: string;
    data_nascimento: string;
  }> = [];

  for (const item of inscricoes) {
    if (item.tipo_participante === 'convidado') {
      const filhos = item.casal?.dados?.filhos ?? [];
      for (const filho of filhos) {
        rows.push({
          nome: item.casal?.nome || '',
          nome_filho: filho.nome_completo || '',
          data_nascimento: formatDateBr(filho.data_nascimento),
        });
      }
    }
  }

  return rows.sort((a, b) => a.nome.localeCompare(b.nome));
}

export function buildListaOnibus(inscricoes: readonly InscricaoEnriquecida[]) {
  const rows: Array<{
    nome: string;
    rg: string;
    orgao: string;
    cpf: string;
  }> = [];

  for (const item of inscricoes) {
    if (item.tipo_participante === 'convidado') {
      const pessoas = item.casal?.dados?.pessoas ?? [];
      const esposo = findConjuge(pessoas, 'esposo');
      const esposa = findConjuge(pessoas, 'esposa');

      if (esposo) {
        rows.push({
          nome: esposo.nome_completo || '',
          rg: esposo.rg || '',
          orgao: esposo.rg_emissor || '',
          cpf: formatCpf(esposo.cpf),
        });
      }
      if (esposa) {
        rows.push({
          nome: esposa.nome_completo || '',
          rg: esposa.rg || '',
          orgao: esposa.rg_emissor || '',
          cpf: formatCpf(esposa.cpf),
        });
      }
    }
  }

  return rows.sort((a, b) => a.nome.localeCompare(b.nome));
}

export function buildRelacaoQuartosAfilhados(
  inscricoes: readonly InscricaoEnriquecida[]
) {
  return inscricoes
    .filter((i) => i.tipo_participante === 'convidado')
    .map((casal) => {
      const padrinhoInscricao = casal.padrinho_id
        ? inscricoes.find((p) => p.casal_id === casal.padrinho_id)
        : undefined;

      return {
        nome: casal.casal?.nome || '',
        quarto: casal.quarto || '',
        padrinho: padrinhoInscricao?.casal?.nome || '',
        quarto_padrinho: padrinhoInscricao?.quarto || '',
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export function buildRelacaoHotel(
  inscricoes: readonly InscricaoEnriquecida[]
) {
  return inscricoes
    .map((item) => {
      const pessoas = item.casal?.dados?.pessoas ?? [];
      const esposo = findConjuge(pessoas, 'esposo');
      const esposa = findConjuge(pessoas, 'esposa');

      return {
        esposo_nome: esposo?.nome_completo || '',
        esposo_rg: esposo?.rg || '',
        esposo_orgao: esposo?.rg_emissor || '',
        esposo_cpf: formatCpf(esposo?.cpf),
        esposa_nome: esposa?.nome_completo || '',
        esposa_rg: esposa?.rg || '',
        esposa_orgao: esposa?.rg_emissor || '',
        esposa_cpf: formatCpf(esposa?.cpf),
        quarto: item.quarto || '',
      };
    })
    .sort((a, b) => a.esposo_nome.localeCompare(b.esposo_nome));
}

export function buildRelacaoRecepcao(
  inscricoes: readonly InscricaoEnriquecida[]
) {
  return inscricoes
    .filter((i) => i.tipo_participante === 'convidado')
    .map((casal) => {
      const padrinho = casal.padrinho_id
        ? inscricoes.find((p) => p.casal_id === casal.padrinho_id)
        : undefined;

      const dadosCasal = casal.casal?.dados;
      const esposo = findConjuge(dadosCasal?.pessoas, 'esposo');
      const esposa = findConjuge(dadosCasal?.pessoas, 'esposa');

      const dadosPadrinho = padrinho?.casal?.dados;
      const padrinhoEsposo = findConjuge(dadosPadrinho?.pessoas, 'esposo');
      const padrinhoEsposa = findConjuge(dadosPadrinho?.pessoas, 'esposa');

      return {
        nome: casal.casal?.nome || '',
        quarto: casal.quarto || '',
        endereco: dadosCasal?.endereco || '',
        bairro: dadosCasal?.bairro || '',
        cidade: dadosCasal?.cidade || '',
        telefoneEsposo: formatPhone(esposo?.celular),
        telefoneEsposa: formatPhone(esposa?.celular),
        padrinho: padrinho?.casal?.nome || 'Não definido',
        telefonePadrinho: formatPhone(padrinhoEsposo?.celular),
        telefoneMadrinha: formatPhone(padrinhoEsposa?.celular),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export function buildFichaCasalData(casal: CasalCompleto, evento?: Evento) {
  const esposo = findConjuge(casal.pessoas, 'esposo');
  const esposa = findConjuge(casal.pessoas, 'esposa');
  const periodoEvento = evento
    ? `${formatDateBr(evento.data_inicio)} a ${formatDateBr(evento.data_fim)}`
    : 'Brasília - DF';

  return {
    tituloEvento: evento
      ? `ENCONTRO DE CASAIS COM CRISTO (ECC) - ${evento.nome} (${periodoEvento})`
      : 'ENCONTRO DE CASAIS COM CRISTO (ECC) - Brasília - DF',
    esposo: {
      nome_completo: esposo?.nome_completo || '',
      nome_social: esposo?.nome_social || '',
      data_nascimento: formatDateBr(esposo?.data_nascimento),
      profissao: esposo?.profissao || '',
      email: esposo?.email || '',
      celular: formatPhone(esposo?.celular),
      religiao: esposo?.religiao || '',
      rg: esposo?.rg || '',
      rg_emissor: esposo?.rg_emissor || '',
      cpf: formatCpf(esposo?.cpf),
    },
    esposa: {
      nome_completo: esposa?.nome_completo || '',
      nome_social: esposa?.nome_social || '',
      data_nascimento: formatDateBr(esposa?.data_nascimento),
      profissao: esposa?.profissao || '',
      email: esposa?.email || '',
      celular: formatPhone(esposa?.celular),
      religiao: esposa?.religiao || '',
      rg: esposa?.rg || '',
      rg_emissor: esposa?.rg_emissor || '',
      cpf: formatCpf(esposa?.cpf),
    },
    casal: {
      endereco: casal.endereco || '',
      bairro: casal.bairro || '',
      cidade: casal.cidade || '',
      cep: casal.cep || '',
      contato_emergencia_nome1: casal.contato_emergencia_nome1 || '',
      contato_emergencia_telefone1: formatPhone(casal.contato_emergencia_telefone1),
      contato_emergencia_nome2: casal.contato_emergencia_nome2 || '',
      contato_emergencia_telefone2: formatPhone(casal.contato_emergencia_telefone2),
    },
    filename: `Ficha_Casal_${esposo?.nome_social || 'Esposo'}_${esposa?.nome_social || 'Esposa'}.pdf`,
  };
}
