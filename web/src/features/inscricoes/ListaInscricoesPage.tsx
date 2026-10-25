import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  UserPlus,
  FileBarChart2,
  ChevronDown,
  Search,
  Heart,
  Link2,
  Edit3,
  FileText,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  X,
  Loader2,
} from 'lucide-react';
import {
  casaisApi,
  eventosApi,
  inscricoesApi,
  urlsUnicasApi,
} from '../../infrastructure/api/services';
import { storageService } from '../../infrastructure/storage/storage.service';
import {
  enrichCasais,
  enrichInscricoes,
} from '../../domain/transformers/relatorios.transformer';
import { formatDateBr } from '../../shared/utils/formatters';
import { relatoriosExporter } from '../../infrastructure/exporters';
import { useToast } from '../../shared/ui/Toast';
import type { CasalEnriquecido } from '../../domain/entities';

export function ListaInscricoesPage(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const [eventoSelecionado, setEventoSelecionado] = useState<number | null>(() =>
    storageService.getEventoSelecionado()
  );
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<
    'casal_id' | 'nome' | 'tipo_participante' | 'statusFormatado'
  >('nome');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [menuOpen, setMenuOpen] = useState(false);
  const [modalNovaInscricaoOpen, setModalNovaInscricaoOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const { data: casaisRaw = [] } = useQuery({
    queryKey: ['casais'],
    queryFn: () => casaisApi.listar(),
  });

  const { data: eventosRaw = [] } = useQuery({
    queryKey: ['eventos'],
    queryFn: () => eventosApi.listar(),
  });

  const eventos = useMemo(
    () => [...eventosRaw].sort((a, b) => b.id - a.id),
    [eventosRaw]
  );

  useEffect(() => {
    if (!eventoSelecionado && eventos.length > 0 && eventos[0]) {
      setEventoSelecionado(eventos[0].id);
      storageService.setEventoSelecionado(eventos[0].id);
    }
  }, [eventoSelecionado, eventos]);

  const { data: inscricoesRaw = [], isLoading: loadingInscricoes } = useQuery({
    queryKey: ['inscricoes', eventoSelecionado],
    queryFn: () =>
      eventoSelecionado
        ? inscricoesApi.listarPorEvento(eventoSelecionado)
        : Promise.resolve([]),
    enabled: Boolean(eventoSelecionado),
  });

  const listaCasais = useMemo(() => enrichCasais(casaisRaw), [casaisRaw]);
  const casaisMap = useMemo(
    () => new Map<number, CasalEnriquecido>(listaCasais.map((c) => [c.id, c])),
    [listaCasais]
  );

  const listaInscritos = useMemo(
    () => enrichInscricoes(inscricoesRaw, casaisMap),
    [inscricoesRaw, casaisMap]
  );

  const eventoAtualObj = useMemo(
    () => eventos.find((e) => e.id === eventoSelecionado),
    [eventos, eventoSelecionado]
  );

  const filteredAndSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? listaInscritos.filter((item) =>
          (item.casal?.nome || '').toLowerCase().includes(term)
        )
      : [...listaInscritos];

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'casal_id') {
        cmp = a.casal_id - b.casal_id;
      } else if (sortField === 'nome') {
        cmp = (a.casal?.nome || '')
          .toLowerCase()
          .localeCompare((b.casal?.nome || '').toLowerCase());
      } else if (sortField === 'tipo_participante') {
        cmp = String(a.tipo_participante).localeCompare(
          String(b.tipo_participante)
        );
      } else {
        cmp = a.statusFormatado.localeCompare(b.statusFormatado);
      }
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [listaInscritos, search, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const handleSort = (
    field: 'casal_id' | 'nome' | 'tipo_participante' | 'statusFormatado'
  ) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleEventoChange = (novoId: number) => {
    setEventoSelecionado(novoId);
    storageService.setEventoSelecionado(novoId);
    setPage(1);
  };

  const handleCopiarUrl = async (inscricaoId: number) => {
    try {
      const res = await urlsUnicasApi.obterUrlPorInscricao(inscricaoId);
      const url = res.urlCompleta;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      notify('URL copiada para a área de transferência!', 'success');
    } catch {
      notify('Erro ao obter URL completa de inscrição.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await inscricoesApi.deletar(deleteTargetId);
      await queryClient.invalidateQueries({
        queryKey: ['inscricoes', eventoSelecionado],
      });
      notify('Inscrição excluída com sucesso!', 'success');
    } catch {
      notify('Erro ao excluir inscrição.', 'error');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const runReport = async (fn: () => Promise<unknown>) => {
    setMenuOpen(false);
    try {
      await fn();
      notify('Relatório gerado com sucesso!', 'success');
    } catch {
      notify('Erro ao gerar o relatório solicitado.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Inscrições do Evento
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Gerencie as inscrições do evento selecionado. Total:{' '}
            <span className="text-white font-bold">{listaInscritos.length}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label
            htmlFor="select-evento"
            className="text-xs text-gray-400 font-semibold uppercase tracking-wider"
          >
            Evento:
          </label>
          <select
            id="select-evento"
            value={eventoSelecionado ?? ''}
            onChange={(e) => handleEventoChange(Number(e.target.value))}
            className="bg-[#090b11] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-w-[240px]"
          >
            <option value="" disabled>
              Selecione um Evento
            </option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nome} - {formatDateBr(ev.data_inicio)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ações Gerais */}
      <div className="flex flex-wrap items-center gap-3 relative">
        <button
          type="button"
          onClick={() => setModalNovaInscricaoOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nova Inscrição</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/registro')}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Casal</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-2"
          >
            <FileBarChart2 className="w-4 h-4" />
            <span>Gerar Relatórios</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute left-0 mt-2 w-60 z-40 bg-[#0f121e]/98 border border-white/10 rounded-2xl shadow-2xl py-2 text-xs text-gray-200 divide-y divide-white/5">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.listaGeralInscritosPdf(
                        listaInscritos,
                        eventoAtualObj
                      )
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Lista Geral (PDF)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.dietaAlimentarPdf(
                        listaInscritos,
                        eventoAtualObj
                      )
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Dieta Alimentar (PDF)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.diabeticosPdf(
                        listaInscritos,
                        eventoAtualObj
                      )
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Diabéticos (PDF)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.afilhadosPdf(
                        listaInscritos,
                        casaisMap,
                        eventoAtualObj
                      )
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Afilhados (PDF)
                </button>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.listaInscritosExcel(listaInscritos)
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Exportar Excel (Inscritos)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.listaSeguroExcel(listaInscritos)
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Lista Seguro (Excel)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.listaSeguroGeralExcel(casaisRaw)
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Lista Seguro Geral (Excel)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.listaFilhosExcel(listaInscritos)
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Lista Filhos (Excel)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.listaOnibus(
                        listaInscritos,
                        eventoAtualObj
                      )
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Lista Ônibus (PDF + Excel)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.cadastroGeralExcel(casaisRaw)
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Cadastro Geral (Excel)
                </button>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.quartosAfilhadosPdf(
                        listaInscritos,
                        eventoAtualObj
                      )
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Quartos Afilhados (PDF)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.relacaoHotelPdf(
                        listaInscritos,
                        eventoAtualObj
                      )
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Relação Hotel (PDF)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runReport(() =>
                      relatoriosExporter.relacaoRecepcaoPdf(
                        listaInscritos,
                        eventoAtualObj
                      )
                    )
                  }
                  className="w-full text-left px-4 py-2 hover:bg-white/5"
                >
                  Recepção (PDF)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela / Cards */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl p-6 space-y-6">
        <div className="flex items-center gap-3 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar inscrição (Ex: João ou Maria)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {paginated.length > 0 ? (
          <>
            {/* Mobile Cards */}
            <div className="block md:hidden space-y-4">
              {paginated.map((inscricao) => (
                <div
                  key={inscricao.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Heart className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-sm font-bold text-white truncate">
                        {inscricao.casal?.nome}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                        inscricao.statusFormatado === 'Confirmada'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {inscricao.statusFormatado}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-gray-500">
                        Tipo
                      </p>
                      <p className="text-gray-200 mt-0.5 font-medium">
                        {inscricao.tipo_participante}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-gray-500">
                        ID Casal
                      </p>
                      <p className="text-gray-200 mt-0.5 font-mono">
                        {inscricao.casal_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleCopiarUrl(inscricao.id)}
                      title="Copiar link de inscrição"
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 flex items-center justify-center"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/registro/${inscricao.casal_id}`)}
                      title="Editar cadastro"
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 flex items-center justify-center"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        runReport(() =>
                          relatoriosExporter.gerarFichaCasalPdf(
                            inscricao.casal_id,
                            eventoAtualObj
                          )
                        )
                      }
                      title="Visualizar PDF"
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 flex items-center justify-center"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(inscricao.id)}
                      title="Excluir inscrição"
                      className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSort('casal_id')}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        <span>ID</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSort('nome')}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        <span>Casal</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSort('tipo_participante')}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        <span>Tipo</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleSort('statusFormatado')}
                        className="flex items-center gap-1 hover:text-white"
                      >
                        <span>Status</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginated.map((inscricao) => (
                    <tr
                      key={inscricao.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 text-xs text-gray-400 font-mono">
                        {inscricao.casal_id}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-white">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-indigo-400" />
                          <span>{inscricao.casal?.nome}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-300">
                        <span className="px-2 py-1 bg-white/5 rounded-lg border border-white/10 font-medium">
                          {inscricao.tipo_participante}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            inscricao.statusFormatado === 'Confirmada'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {inscricao.statusFormatado}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopiarUrl(inscricao.id)}
                            title="Copiar link de inscrição"
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/registro/${inscricao.casal_id}`)
                            }
                            title="Editar cadastro"
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              runReport(() =>
                                relatoriosExporter.gerarFichaCasalPdf(
                                  inscricao.casal_id,
                                  eventoAtualObj
                                )
                              )
                            }
                            title="Visualizar PDF"
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(inscricao.id)}
                            title="Excluir inscrição"
                            className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span>Itens por página:</span>
                <select
                  aria-label="Itens por página"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[#090b11] border border-white/10 rounded-lg px-2 py-1 text-white"
                >
                  {[10, 25, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span>
                  Página {currentPage} de {totalPages} ({filteredAndSorted.length} inscrições)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-sm">
              {loadingInscricoes
                ? 'Carregando inscrições...'
                : 'Selecione um evento ou realize uma nova inscrição para visualizar os dados.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal Nova Inscrição (Assíncrono Correto sem fechar prematuramente) */}
      {modalNovaInscricaoOpen && (
        <NovaInscricaoModal
          casais={listaCasais}
          eventoId={eventoSelecionado}
          onClose={() => setModalNovaInscricaoOpen(false)}
          onSuccess={async () => {
            setModalNovaInscricaoOpen(false);
            await queryClient.invalidateQueries({
              queryKey: ['inscricoes', eventoSelecionado],
            });
            notify('Inscrição realizada com sucesso!', 'success');
          }}
        />
      )}

      {/* Modal Confirmar Exclusão */}
      {deleteTargetId !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-sm bg-[#0f121e] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Confirmar Exclusão</h3>
            <p className="text-xs text-gray-300">
              Tem certeza que deseja excluir esta inscrição?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface NovaInscricaoModalProps {
  casais: CasalEnriquecido[];
  eventoId: number | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

function NovaInscricaoModal({
  casais,
  eventoId,
  onClose,
  onSuccess,
}: NovaInscricaoModalProps): React.ReactElement {
  const { notify } = useToast();
  const [afilhado, setAfilhado] = useState(false);
  const [casalId, setCasalId] = useState<number>(0);
  const [padrinhoId, setPadrinhoId] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoId) {
      notify('Selecione um evento antes de registrar a inscrição.', 'error');
      return;
    }
    if (!casalId) {
      notify('Selecione um casal válido.', 'error');
      return;
    }
    if (afilhado && !padrinhoId) {
      notify('Selecione o casal padrinho para o afilhado.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await inscricoesApi.registrar({
        casal_id: casalId,
        evento_id: eventoId,
        tipo_participante: afilhado ? 'convidado' : 'encontrista',
        status: 'pendente',
        padrinho_id: afilhado ? padrinhoId : 0,
      });
      await onSuccess();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Erro ao inscrever casal.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-[#0f121e] border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-bold text-white">Registra Inscrição</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={afilhado}
              onChange={(e) => setAfilhado(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-indigo-500"
            />
            <span>Afilhado (Convidado)</span>
          </label>

          <div>
            <label
              htmlFor="select-casal"
              className="block text-xs font-semibold text-gray-300 mb-1.5"
            >
              Selecione Casal *
            </label>
            <select
              id="select-casal"
              value={casalId || ''}
              onChange={(e) => setCasalId(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-[#090b11] border border-white/10 rounded-xl text-xs text-white"
            >
              <option value="">Selecione um casal...</option>
              {casais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {afilhado && (
            <div>
              <label
                htmlFor="select-padrinho"
                className="block text-xs font-semibold text-gray-300 mb-1.5"
              >
                Selecione Padrinho *
              </label>
              <select
                id="select-padrinho"
                value={padrinhoId || ''}
                onChange={(e) => setPadrinhoId(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-[#090b11] border border-white/10 rounded-xl text-xs text-white"
              >
                <option value="">Selecione o padrinho...</option>
                {casais.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={submitting || !casalId}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Gerando...' : 'Adicionar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
