import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  DIETAS_ALIMENTARES,
  RELIGIOES,
  registroCasalSchema,
  type RegistroCasalFormValues,
} from '../../domain/schemas';
import { casaisApi } from '../../infrastructure/api/services';
import { fetchAddressByCep } from '../../infrastructure/http/viacep.client';
import {
  formatCep,
  formatCpf,
  formatDateBr,
  formatDateIsoToSave,
  formatPhone,
  stripNonDigits,
} from '../../shared/utils/formatters';
import { findConjuge } from '../../domain/transformers/relatorios.transformer';
import { useToast } from '../../shared/ui/Toast';

const STEPS = [
  'Esposo',
  'Esposa',
  'Dados do Casal',
  'Filhos',
  'Revisão',
] as const;

export function FormCadastroPage(): React.ReactElement {
  const { id } = useParams<{ id?: string }>();
  const casalId = id ? Number(id) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const [activeStep, setActiveStep] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(Boolean(casalId));

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegistroCasalFormValues>({
    resolver: zodResolver(registroCasalSchema),
    mode: 'onChange',
    defaultValues: {
      casal: {
        data_casamento: '',
        endereco: '',
        bairro: '',
        cidade: '',
        estado: 'DF',
        cep: '',
        contato_emergencia_nome1: '',
        contato_emergencia_telefone1: '',
        contato_emergencia_nome2: '',
        contato_emergencia_telefone2: '',
        responsavel_filhos_nome: '',
        responsavel_filhos_telefone: '',
      },
      pessoas: [
        {
          tipo: 'esposo',
          nome_completo: '',
          nome_social: '',
          data_nascimento: '',
          profissao: '',
          email: '',
          celular: '',
          rg: '',
          rg_emissor: '',
          cpf: '',
          problema_saude: false,
          problema_saude_descricao: '',
          medicamento_especial: false,
          medicamento_especial_descricao: '',
          diabetico: false,
          dieta_alimentar: 'não',
          religiao: 'Católica',
        },
        {
          tipo: 'esposa',
          nome_completo: '',
          nome_social: '',
          data_nascimento: '',
          profissao: '',
          email: '',
          celular: '',
          rg: '',
          rg_emissor: '',
          cpf: '',
          problema_saude: false,
          problema_saude_descricao: '',
          medicamento_especial: false,
          medicamento_especial_descricao: '',
          diabetico: false,
          dieta_alimentar: 'não',
          religiao: 'Católica',
        },
      ],
      filhos: [],
    },
  });

  const {
    fields: filhosFields,
    append: appendFilho,
    remove: removeFilho,
  } = useFieldArray({
    control,
    name: 'filhos',
  });

  useEffect(() => {
    if (!casalId) return;
    let mounted = true;
    setLoadingInitial(true);

    casaisApi
      .buscarPorId(casalId)
      .then((registro) => {
        if (!mounted || !registro) return;
        const esposo = findConjuge(registro.pessoas, 'esposo');
        const esposa = findConjuge(registro.pessoas, 'esposa');

        reset({
          casal: {
            data_casamento: formatDateBr(registro.data_casamento),
            endereco: registro.endereco || '',
            bairro: registro.bairro || '',
            cidade: registro.cidade || '',
            estado: registro.estado || 'DF',
            cep: formatCep(registro.cep),
            contato_emergencia_nome1: registro.contato_emergencia_nome1 || '',
            contato_emergencia_telefone1: formatPhone(
              registro.contato_emergencia_telefone1
            ),
            contato_emergencia_nome2: registro.contato_emergencia_nome2 || '',
            contato_emergencia_telefone2: formatPhone(
              registro.contato_emergencia_telefone2
            ),
            responsavel_filhos_nome: registro.responsavel_filhos_nome || '',
            responsavel_filhos_telefone: formatPhone(
              registro.responsavel_filhos_telefone
            ),
          },
          pessoas: [
            {
              tipo: 'esposo',
              nome_completo: esposo?.nome_completo || '',
              nome_social: esposo?.nome_social || '',
              data_nascimento: formatDateBr(esposo?.data_nascimento),
              profissao: esposo?.profissao || '',
              email: esposo?.email || '',
              celular: formatPhone(esposo?.celular),
              rg: esposo?.rg || '',
              rg_emissor: esposo?.rg_emissor || '',
              cpf: formatCpf(esposo?.cpf),
              problema_saude: Boolean(esposo?.problema_saude),
              problema_saude_descricao: esposo?.problema_saude_descricao || '',
              medicamento_especial: Boolean(esposo?.medicamento_especial),
              medicamento_especial_descricao:
                esposo?.medicamento_especial_descricao || '',
              diabetico: Boolean(esposo?.diabetico),
              dieta_alimentar: esposo?.dieta_alimentar || 'não',
              religiao: esposo?.religiao || 'Católica',
            },
            {
              tipo: 'esposa',
              nome_completo: esposa?.nome_completo || '',
              nome_social: esposa?.nome_social || '',
              data_nascimento: formatDateBr(esposa?.data_nascimento),
              profissao: esposa?.profissao || '',
              email: esposa?.email || '',
              celular: formatPhone(esposa?.celular),
              rg: esposa?.rg || '',
              rg_emissor: esposa?.rg_emissor || '',
              cpf: formatCpf(esposa?.cpf),
              problema_saude: Boolean(esposa?.problema_saude),
              problema_saude_descricao: esposa?.problema_saude_descricao || '',
              medicamento_especial: Boolean(esposa?.medicamento_especial),
              medicamento_especial_descricao:
                esposa?.medicamento_especial_descricao || '',
              diabetico: Boolean(esposa?.diabetico),
              dieta_alimentar: esposa?.dieta_alimentar || 'não',
              religiao: esposa?.religiao || 'Católica',
            },
          ],
          filhos: (registro.filhos ?? []).map((f) => ({
            nome_completo: f.nome_completo || '',
            data_nascimento: formatDateBr(f.data_nascimento),
          })),
        });
      })
      .catch(() => {
        notify('Erro ao carregar dados do casal.', 'error');
      })
      .finally(() => {
        if (mounted) setLoadingInitial(false);
      });

    return () => {
      mounted = false;
    };
  }, [casalId, reset, notify]);

  const handleCepBlur = async () => {
    const cepValue = watch('casal.cep');
    const digits = stripNonDigits(cepValue);
    if (digits.length !== 8) return;

    try {
      const address = await fetchAddressByCep(digits);
      if (address) {
        setValue('casal.endereco', address.endereco || '', {
          shouldValidate: true,
        });
        setValue('casal.bairro', address.bairro || '', {
          shouldValidate: true,
        });
        setValue('casal.cidade', address.cidade || '', {
          shouldValidate: true,
        });
        notify('Endereço preenchido automaticamente pelo CEP!', 'success');
      } else {
        notify('CEP não encontrado.', 'info');
      }
    } catch {
      notify('Erro ao buscar o CEP.', 'error');
    }
  };

  const handleNextStep = async () => {
    if (activeStep === 0) {
      const valid = await trigger('pessoas.0');
      if (!valid) return;
    } else if (activeStep === 1) {
      const valid = await trigger('pessoas.1');
      if (!valid) return;
    } else if (activeStep === 2) {
      const valid = await trigger('casal');
      if (!valid) return;
    } else if (activeStep === 3) {
      const valid = await trigger('filhos');
      if (!valid) return;
    }
    setActiveStep((prev) => Math.min(STEPS.length - 1, prev + 1));
  };

  const onSubmit = async (values: RegistroCasalFormValues) => {
    const payload = {
      casal: {
        ...values.casal,
        data_casamento: formatDateIsoToSave(values.casal.data_casamento),
      },
      pessoas: values.pessoas.map((p) => ({
        ...p,
        data_nascimento: formatDateIsoToSave(p.data_nascimento),
      })),
      filhos: values.filhos.map((f) => ({
        ...f,
        data_nascimento: formatDateIsoToSave(f.data_nascimento),
      })),
    };

    try {
      if (casalId) {
        await casaisApi.atualizar(casalId, payload);
        await queryClient.invalidateQueries({ queryKey: ['casais'] });
        notify('Cadastro do casal atualizado com sucesso!', 'success');
        navigate('/lista-inscricao');
      } else {
        await casaisApi.criar(payload);
        await queryClient.invalidateQueries({ queryKey: ['casais'] });
        notify('Casal registrado com sucesso!', 'success');
        navigate('/lista-inscricao');
      }
    } catch {
      notify(
        'Erro ao salvar os dados do casal. Verifique os campos e tente novamente.',
        'error'
      );
    }
  };

  const renderPessoaFields = (index: 0 | 1, titulo: string) => {
    const problemaSaude = watch(`pessoas.${index}.problema_saude`);
    const medicamentoEspecial = watch(`pessoas.${index}.medicamento_especial`);
    const pessoaErrors = errors.pessoas?.[index];

    return (
      <div className="space-y-5 p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
        <h3 className="text-lg font-bold text-white">{titulo}</h3>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">
            Nome Completo *
          </label>
          <input
            type="text"
            {...register(`pessoas.${index}.nome_completo`)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          {pessoaErrors?.nome_completo && (
            <p className="text-red-400 text-xs mt-1">
              {pessoaErrors.nome_completo.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Nome Social (Como gostaria de ser chamado)
            </label>
            <input
              type="text"
              {...register(`pessoas.${index}.nome_social`)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Data de Nascimento
            </label>
            <input
              type="text"
              placeholder="dd/mm/aaaa"
              {...register(`pessoas.${index}.data_nascimento`)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Profissão
            </label>
            <input
              type="text"
              {...register(`pessoas.${index}.profissao`)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              {...register(`pessoas.${index}.email`)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            {pessoaErrors?.email && (
              <p className="text-red-400 text-xs mt-1">
                {pessoaErrors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Celular
            </label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              {...register(`pessoas.${index}.celular`)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              RG
            </label>
            <input
              type="text"
              {...register(`pessoas.${index}.rg`)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Órgão Emissor
            </label>
            <input
              type="text"
              {...register(`pessoas.${index}.rg_emissor`)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              CPF
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              {...register(`pessoas.${index}.cpf`)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Religião *
            </label>
            <select
              {...register(`pessoas.${index}.religiao`)}
              className="w-full px-4 py-2.5 bg-[#090b11] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {RELIGIOES.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Restrição Alimentar
            </label>
            <select
              {...register(`pessoas.${index}.dieta_alimentar`)}
              className="w-full px-4 py-2.5 bg-[#090b11] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {DIETAS_ALIMENTARES.map((dieta) => (
                <option key={dieta} value={dieta}>
                  {dieta}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              {...register(`pessoas.${index}.problema_saude`)}
              className="rounded border-white/20 bg-white/5 text-indigo-500"
            />
            <span>Possui problema de saúde?</span>
          </label>

          {problemaSaude && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Descreva o problema de saúde
              </label>
              <textarea
                rows={2}
                {...register(`pessoas.${index}.problema_saude_descricao`)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
              />
            </div>
          )}

          <label className="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              {...register(`pessoas.${index}.medicamento_especial`)}
              className="rounded border-white/20 bg-white/5 text-indigo-500"
            />
            <span>Usa medicamento especial?</span>
          </label>

          {medicamentoEspecial && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Descreva o medicamento
              </label>
              <textarea
                rows={2}
                {...register(`pessoas.${index}.medicamento_especial_descricao`)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
              />
            </div>
          )}

          <label className="flex items-center gap-2.5 text-xs text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              {...register(`pessoas.${index}.diabetico`)}
              className="rounded border-white/20 bg-white/5 text-indigo-500"
            />
            <span>É diabético(a)?</span>
          </label>
        </div>
      </div>
    );
  };

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-300 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-sm">Carregando dados do casal...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-white">
            Encontro de Casais com Cristo
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {casalId ? `Editando Casal #${casalId}` : 'Formulário de registro de casal'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/lista-inscricao')}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retornar</span>
        </button>
      </div>

      {/* Stepper Header */}
      <div className="grid grid-cols-5 gap-2 p-3 bg-white/5 border border-white/10 rounded-2xl">
        {STEPS.map((label, idx) => {
          const isCurrent = idx === activeStep;
          const isCompleted = idx < activeStep;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : isCompleted
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                    : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-black/20 flex items-center justify-center text-[11px]">
                {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
              </span>
              <span className="hidden sm:inline truncate">{label}</span>
            </button>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl"
        noValidate
      >
        {activeStep === 0 && renderPessoaFields(0, 'Dados do Esposo')}
        {activeStep === 1 && renderPessoaFields(1, 'Dados da Esposa')}

        {activeStep === 2 && (
          <div className="space-y-5 p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
            <h3 className="text-lg font-bold text-white">Dados Conjugais</h3>

            <div className="max-w-xs">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Data do Casamento
              </label>
              <input
                type="text"
                placeholder="dd/mm/aaaa"
                {...register('casal.data_casamento')}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  CEP *
                </label>
                <input
                  type="text"
                  placeholder="00000-000"
                  {...register('casal.cep')}
                  onBlur={handleCepBlur}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                />
                {errors.casal?.cep && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.casal.cep.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Bairro *
                </label>
                <input
                  type="text"
                  {...register('casal.bairro')}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                />
                {errors.casal?.bairro && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.casal.bairro.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Cidade *
                </label>
                <input
                  type="text"
                  {...register('casal.cidade')}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                />
                {errors.casal?.cidade && (
                  <p className="text-red-400 text-xs mt-1">
                    {errors.casal.cidade.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Endereço *
              </label>
              <input
                type="text"
                placeholder="Rua, número, complemento"
                {...register('casal.endereco')}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
              />
              {errors.casal?.endereco && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.casal.endereco.message}
                </p>
              )}
            </div>

            <div className="pt-2 space-y-4">
              <h4 className="text-sm font-bold text-gray-200">
                Contato de Emergência
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Nome do Contato 1
                  </label>
                  <input
                    type="text"
                    {...register('casal.contato_emergencia_nome1')}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Telefone do Contato 1
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    {...register('casal.contato_emergencia_telefone1')}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Nome do Contato 2
                  </label>
                  <input
                    type="text"
                    {...register('casal.contato_emergencia_nome2')}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Telefone do Contato 2
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    {...register('casal.contato_emergencia_telefone2')}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <h4 className="text-sm font-bold text-gray-200">
                Responsável pelos Filhos durante o Evento
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    {...register('casal.responsavel_filhos_nome')}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Telefone do Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    {...register('casal.responsavel_filhos_telefone')}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-4 p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Filhos</h3>
              <button
                type="button"
                onClick={() =>
                  appendFilho({ nome_completo: '', data_nascimento: '' })
                }
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Filho</span>
              </button>
            </div>

            {filhosFields.length === 0 && (
              <p className="text-xs text-gray-400 py-4">
                Nenhum filho adicionado.
              </p>
            )}

            <div className="space-y-4">
              {filhosFields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 bg-white/[0.02] border border-white/10 border-l-4 border-l-indigo-500 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase">
                      Filho {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeFilho(index)}
                      className="text-red-400 hover:text-red-300 p-1"
                      aria-label={`Remover Filho ${index + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        {...register(`filhos.${index}.nome_completo`)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                      />
                      {errors.filhos?.[index]?.nome_completo && (
                        <p className="text-red-400 text-xs mt-1">
                          {errors.filhos[index]?.nome_completo?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Data de Nascimento
                      </label>
                      <input
                        type="text"
                        placeholder="dd/mm/aaaa"
                        {...register(`filhos.${index}.data_nascimento`)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeStep === 4 && (
          <div className="space-y-4 p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
            <h3 className="text-lg font-bold text-white">Revisão do Registro</h3>
            <p className="text-xs text-gray-400">
              Revise os principais dados do casal antes de salvar no sistema.
            </p>

            <div className="space-y-2 text-sm text-gray-200 bg-white/5 p-4 rounded-xl border border-white/10">
              <p>
                <strong>Esposo:</strong>{' '}
                {watch('pessoas.0.nome_completo') || 'Não preenchido'}
              </p>
              <p>
                <strong>Esposa:</strong>{' '}
                {watch('pessoas.1.nome_completo') || 'Não preenchido'}
              </p>
              <p>
                <strong>Endereço:</strong>{' '}
                {watch('casal.endereco') || 'Não preenchido'} (
                {watch('casal.bairro')} - {watch('casal.cidade')})
              </p>
              <p>
                <strong>Filhos:</strong> {filhosFields.length} adicionado(s).
              </p>
            </div>

            {Object.keys(errors).length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  O formulário possui campos obrigatórios pendentes em etapas
                  anteriores. Verifique os passos marcados.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Navegação entre Etapas */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-xs font-semibold text-gray-300"
          >
            Anterior
          </button>

          {activeStep < STEPS.length - 1 ? (
            <button
              key="btn-next"
              type="button"
              onClick={handleNextStep}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20"
            >
              Próximo
            </button>
          ) : (
            <button
              key="btn-submit"
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{casalId ? 'Enviar Atualização' : 'Salvar Cadastro'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
