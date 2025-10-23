'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resolveApiBaseUrl } from '@/services/apiClient';

const errorMessages: Record<string, string> = {
  oauth_failed: 'Falha na autenticação com Google',
  oauth_callback_failed: 'Erro no callback do OAuth',
  access_denied: 'Acesso negado pelo usuário',
};

const getErrorMessage = (code: string | null) => {
  if (!code) return null;
  return errorMessages[code] || 'Erro desconhecido na autenticação';
};

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const hasTokens = useMemo(() => {
    if (!searchParams) return false;
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    return Boolean(accessToken && refreshToken);
  }, [searchParams]);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (!searchParams) return;
      const errorParam = searchParams.get('error');
      const redirect = searchParams.get('redirect');
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');

      if (errorParam) {
        setError(getErrorMessage(errorParam));
        setTimeout(() => router.replace('/login' as any), 3000);
        return;
      }

      if (!accessToken || !refreshToken) {
        setError('Tokens não encontrados. Tente novamente.');
        setTimeout(() => router.replace('/login' as any), 3000);
        return;
      }

      try {
        // Save tokens in localStorage (apiClient uses 'token' and 'refreshToken')
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        console.log('✅ Tokens saved successfully');

        // Fetch user profile to verify authentication
        const baseUrl = resolveApiBaseUrl();
        const response = await fetch(`${baseUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('✅ User data fetched:', userData);
          if (userData?.user) {
            localStorage.setItem('user', JSON.stringify(userData.user));
          }
        } else {
          console.warn('⚠️ Failed to fetch user data:', await response.text());
        }

        // Redirect to dashboard
        console.log('✅ Redirecting to dashboard');
        router.replace((redirect && redirect.startsWith('/')) ? redirect : '/' as any);
      } catch (callbackError) {
        console.error('❌ OAuth callback error:', callbackError);
        setError('Erro ao processar autenticação. Tente novamente.');
        setTimeout(() => router.replace('/login' as any), 3000);
      }
    };

    handleOAuthCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
        <div className="w-full max-w-md rounded-xl border border-red-500/20 bg-neutral-900 p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-neutral-100">
            Erro na Autenticação
          </h2>
          <p className="mb-6 text-neutral-400">{error}</p>
          <p className="text-sm text-neutral-500">
            Redirecionando para o login em 3 segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <div className="mb-6 flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        </div>
        <h2 className="mb-4 text-2xl font-bold text-neutral-100">
          Processando Autenticação...
        </h2>
        <p className="text-neutral-400">
          Aguarde enquanto configuramos sua sessão.
        </p>
        {!hasTokens && (
          <p className="mt-4 text-sm text-neutral-500">
            Validando resposta do provedor OAuth.
          </p>
        )}
      </div>
    </div>
  );
}

