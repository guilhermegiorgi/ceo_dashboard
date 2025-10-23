'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import apiClient, { resolveApiBaseUrl } from '@/services/apiClient';

interface LoginUser {
  id: string;
  tenantId?: string | null;
  email: string;
  name?: string | null;
  role?: string | null;
  status?: string | null;
}

interface LoginResponse {
  token?: string;
  refreshToken?: string;
  accessToken?: string;
  user?: LoginUser;
}

type LoginApiResponse =
  | (LoginResponse & {
      success?: boolean;
      message?: string;
      error?: string;
    })
  | {
      data?: LoginResponse | null;
      success?: boolean;
      message?: string;
      error?: string;
    };

const oauthErrorMessages: Record<string, string> = {
  oauth_failed: 'Falha na autenticação com Google',
  oauth_callback_failed: 'Erro no callback do OAuth',
};

const LoginPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = useMemo(() => {
    if (!searchParams) return '/';
    const target = searchParams.get('redirect');
    if (!target) return '/';
    return target.startsWith('/') ? target : `/${target}`;
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams) return;
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(oauthErrorMessages[oauthError] || 'Erro na autenticação OAuth');
    }
  }, [searchParams]);

  const persistSession = (payload?: LoginResponse | null) => {
    const token = payload?.token || payload?.accessToken;
    if (token) {
      localStorage.setItem('token', token);
    }
    if (payload?.refreshToken) {
      localStorage.setItem('refreshToken', payload.refreshToken);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await apiClient.request<LoginApiResponse>(
        '/api/auth/login',
        {
          method: 'POST',
          body: { email, password },
        }
      );

      const payload =
        'data' in response && response.data
          ? response.data
          : (response as LoginResponse);

      const token = payload?.token || payload?.accessToken;
      if (!token) {
        const message =
          ('message' in response && response.message) ||
          ('error' in response && response.error) ||
          'Login failed: No token received';
        setError(message);
        return;
      }

      persistSession(payload);
      router.replace(redirectPath as any);
    } catch (loginError) {
      const err = loginError as Error;
      setError(err.message || 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    const baseUrl = resolveApiBaseUrl();
    window.location.href = `${baseUrl}/api/auth/google`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold text-neutral-100">
            CEO Dashboard
          </h1>
          <p className="text-sm text-neutral-400">
            Faça login para acessar sua plataforma
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-neutral-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-neutral-100 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder="seu@email.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-neutral-300"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-neutral-100 outline-none transition focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-neutral-900 px-2 text-neutral-500">
              Ou continue com
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 font-medium text-neutral-100 transition hover:border-neutral-600 hover:bg-neutral-750 focus:outline-none focus:ring-2 focus:ring-neutral-500"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar com Google
        </button>

        <p className="text-center text-sm text-neutral-500">
          Não tem uma conta?{' '}
          <span className="font-medium text-blue-500 hover:text-blue-400">
            Fale com o time GG.AI
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

