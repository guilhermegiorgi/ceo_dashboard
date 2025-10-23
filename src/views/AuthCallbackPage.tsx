/**
 * OAuth Callback Page
 *
 * Handles OAuth redirect after successful authentication.
 * Extracts tokens from URL and stores them in localStorage.
 */

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";

const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Extract tokens from URL
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");
      const errorParam = searchParams.get("error");

      if (errorParam) {
        setError(getErrorMessage(errorParam));
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      if (!accessToken || !refreshToken) {
        setError("Tokens não encontrados. Tente novamente.");
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      try {
        // Store tokens
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        // Fetch user info
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/user/me`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Falha ao buscar informações do usuário");
        }

        const userData = await response.json();
        localStorage.setItem("user", JSON.stringify(userData.user));

        // Redirect to dashboard
        navigate("/", { replace: true });
      } catch (error) {
        console.error("OAuth callback error:", error);
        setError("Erro ao processar autenticação. Tente novamente.");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  const getErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
      oauth_failed: "Falha na autenticação com Google",
      oauth_callback_failed: "Erro no callback do OAuth",
      access_denied: "Acesso negado pelo usuário",
    };

    return errorMessages[errorCode] || "Erro desconhecido na autenticação";
  };

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-red-500/20 rounded-xl p-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-neutral-100 mb-4">
            Erro na Autenticação
          </h2>
          <p className="text-neutral-400 mb-6">{error}</p>
          <p className="text-sm text-neutral-500">
            Redirecionando para o login em 3 segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
        <div className="mb-6 flex justify-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-100 mb-4">
          Processando Autenticação...
        </h2>
        <p className="text-neutral-400">
          Aguarde enquanto configuramos sua sessão.
        </p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
