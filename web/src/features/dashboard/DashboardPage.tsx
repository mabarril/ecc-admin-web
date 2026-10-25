import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  ClipboardCheck,
  UserPlus,
  ClipboardList,
  Heart,
  Loader2,
} from 'lucide-react';
import { casaisApi, eventosApi, inscricoesApi } from '../../infrastructure/api/services';
import { storageService } from '../../infrastructure/storage/storage.service';
import { enrichCasais } from '../../domain/transformers/relatorios.transformer';
import { formatDateBr } from '../../shared/utils/formatters';

export function DashboardPage(): React.ReactElement {
  const navigate = useNavigate();

  const { data: casais = [], isLoading: loadingCasais } = useQuery({
    queryKey: ['casais'],
    queryFn: () => casaisApi.listar(),
  });

  const { data: eventos = [], isLoading: loadingEventos } = useQuery({
    queryKey: ['eventos'],
    queryFn: () => eventosApi.listar(),
  });

  const eventoAtivoId =
    storageService.getEventoSelecionado() ?? eventos[0]?.id ?? null;

  const { data: inscricoesEvento = [], isLoading: loadingInscricoes } = useQuery({
    queryKey: ['inscricoes', eventoAtivoId],
    queryFn: () =>
      eventoAtivoId ? inscricoesApi.listarPorEvento(eventoAtivoId) : Promise.resolve([]),
    enabled: Boolean(eventoAtivoId),
  });

  const isLoading = loadingCasais || loadingEventos || loadingInscricoes;
  const casaisEnriquecidos = enrichCasais(casais);
  const eventoAtual = eventos.find((e) => e.id === eventoAtivoId) ?? eventos[0];

  const totalConfirmadas = inscricoesEvento.filter(
    (i) => String(i.status).toLowerCase() === 'confirmada'
  ).length;

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Visão Geral</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerencie casais, eventos e relatórios de forma ágil e centralizada.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/registro')}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Casal</span>
          </button>
        </div>
      </div>

      {/* Cartões de Estatísticas Reais da API */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex items-center justify-between hover:border-white/20 transition-all">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total de Casais
            </p>
            <h3 className="text-4xl font-extrabold text-white mt-2">
              {casais.length}
            </h3>
            <span className="text-emerald-400 text-xs font-medium flex items-center gap-1 mt-1">
              <span>Base ativa cadastrada</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex items-center justify-between hover:border-white/20 transition-all">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Eventos Cadastrados
            </p>
            <h3 className="text-4xl font-extrabold text-white mt-2">
              {eventos.length}
            </h3>
            <span className="text-purple-400 text-xs font-medium flex items-center gap-1 mt-1">
              <span>
                {eventoAtual ? `Atual: ${eventoAtual.nome}` : 'Nenhum evento selecionado'}
              </span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex items-center justify-between hover:border-white/20 transition-all">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Inscrições no Evento
            </p>
            <h3 className="text-4xl font-extrabold text-white mt-2">
              {inscricoesEvento.length}
            </h3>
            <span className="text-emerald-400 text-xs font-medium flex items-center gap-1 mt-1">
              <span>{totalConfirmadas} confirmada(s)</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Painéis Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Últimos Casais Cadastrados</h3>
              <p className="text-gray-400 text-xs mt-0.5">
                Registros reais sincronizados com a base de dados
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/lista-cadastro')}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-xs text-gray-300 transition-colors"
            >
              Ver todos
            </button>
          </div>

          <div className="space-y-3">
            {casaisEnriquecidos.slice(0, 5).map((casal) => (
              <div
                key={casal.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{casal.nome}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {casal.dados.bairro} • {casal.dados.cidade}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/registro/${casal.id}`)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2 py-1"
                >
                  Editar
                </button>
              </div>
            ))}

            {casaisEnriquecidos.length === 0 && !isLoading && (
              <p className="text-xs text-gray-400 py-8 text-center">
                Nenhum casal cadastrado até o momento.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6 flex flex-col justify-between">
          <div className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate('/lista-inscricao')}
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all text-center gap-2 group"
              >
                <ClipboardList className="text-indigo-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-gray-300">Inscrições</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/lista-cadastro')}
                className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all text-center gap-2 group"
              >
                <Users className="text-purple-400 w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-gray-300">Lista Casais</span>
              </button>
            </div>
          </div>

          <div className="p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex-1">
            <h3 className="text-lg font-bold text-white mb-4">Eventos Recentes</h3>
            <div className="space-y-3">
              {eventos.slice(0, 4).map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5"
                >
                  <div>
                    <p className="text-xs font-semibold text-gray-200">{ev.nome}</p>
                    <p className="text-[10px] text-gray-400">
                      {formatDateBr(ev.data_inicio)} a {formatDateBr(ev.data_fim)}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ID {ev.id}
                  </span>
                </div>
              ))}
              {eventos.length === 0 && !isLoading && (
                <p className="text-xs text-gray-400">Nenhum evento cadastrado.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div
          role="status"
          className="fixed inset-0 bg-[#090b11]/70 backdrop-blur-sm flex flex-col justify-center items-center z-50"
        >
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="mt-3 text-gray-300 font-semibold text-xs">
            Carregando dados do painel...
          </p>
        </div>
      )}
    </div>
  );
}
