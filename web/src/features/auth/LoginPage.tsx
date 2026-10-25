import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '../../domain/schemas';
import { useAuth } from './AuthContext';

export function LoginPage(): React.ReactElement {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [hidePassword, setHidePassword] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      senha: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage('');
    try {
      await login(values);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Erro ao realizar login. Verifique suas credenciais.'
      );
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#090b11] relative overflow-hidden font-sans px-4">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

      <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/30 mb-4">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Administração ECC</h2>
          <p className="text-gray-400 text-sm mt-1">Faça login para acessar o sistema</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2"
            >
              Email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                {...register('email')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
              <Mail className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="senha"
                type={hidePassword ? 'password' : 'text'}
                autoComplete="current-password"
                placeholder="Sua senha"
                {...register('senha')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setHidePassword((prev) => !prev)}
                aria-label={hidePassword ? 'Mostrar senha' : 'Ocultar senha'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {hidePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.senha && (
              <p className="text-red-400 text-xs mt-1">{errors.senha.message}</p>
            )}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Entrando...' : 'Entrar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
