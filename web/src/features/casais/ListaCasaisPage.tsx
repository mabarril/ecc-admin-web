import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UserPlus,
  Search,
  Heart,
  Edit3,
  FileText,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import { casaisApi } from '../../infrastructure/api/services';
import { enrichCasais } from '../../domain/transformers/relatorios.transformer';
import { relatoriosExporter } from '../../infrastructure/exporters';
import { useToast } from '../../shared/ui/Toast';

export function ListaCasaisPage(): React.ReactElement {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'id' | 'nome'>('nome');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: casaisRaw = [], isLoading } = useQuery({
    queryKey: ['casais'],
    queryFn: () => casaisApi.listar(),
  });

  const casais = useMemo(() => enrichCasais(casaisRaw), [casaisRaw]);

  const filteredAndSorted = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? casais.filter(
          (c) =>
            c.nome.toLowerCase().includes(term) ||
            String(c.id).includes(term)
        )
      : [...casais];

    filtered.sort((a, b) => {
      const cmp =
        sortField === 'id'
          ? a.id - b.id
          : a.nome.toLowerCase().localeCompare(b.nome.toLowerCase());
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [casais, search, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const handleSort = (field: 'id' | 'nome') => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleGerarPdf = async (casalId: number) => {
    try {
      await relatoriosExporter.gerarFichaCasalPdf(casalId);
      notify('Ficha PDF gerada com sucesso!', 'success');
    } catch {
      notify('Erro ao gerar a Ficha PDF do casal.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Lista de Cadastro
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Gerencie os casais registrados no sistema. Total:{' '}
            <span className="text-white font-bold">{casais.length}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/registro')}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Casal</span>
        </button>
      </div>

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
              placeholder="Pesquisar casal (Ex: João ou Maria)..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {paginated.length > 0 ? (
          <>
            {/* Mobile Cards */}
            <div className="block md:hidden space-y-4">
              {paginated.map((casal) => (
                <div
                  key={casal.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3 hover:border-white/20 transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Heart className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span className="text-sm font-bold text-white truncate">
                        {casal.nome}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-gray-300 border border-white/10">
                      ID: {casal.id}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => navigate(`/registro/${casal.id}`)}
                      title="Editar cadastro"
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGerarPdf(casal.id)}
                      title="Visualizar PDF"
                      className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all"
                    >
                      <FileText className="w-4 h-4" />
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
                        onClick={() => handleSort('id')}
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
                    <th className="py-3 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginated.map((casal) => (
                    <tr
                      key={casal.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 text-xs text-gray-400 font-mono">
                        {casal.id}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-white">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-indigo-400" />
                          <span>{casal.nome}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/registro/${casal.id}`)}
                            title="Editar cadastro"
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleGerarPdf(casal.id)}
                            title="Visualizar PDF"
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all"
                          >
                            <FileText className="w-4 h-4" />
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
                  Página {currentPage} de {totalPages} ({filteredAndSorted.length} registros)
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
            <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-sm">
              {isLoading
                ? 'Carregando casais...'
                : search
                  ? 'Nenhum casal corresponde à pesquisa.'
                  : 'Nenhum casal cadastrado no sistema.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
