import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import apiClient from "../services/apiClient";

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

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for OAuth errors in URL
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      const errorMessages: Record<string, string> = {
        oauth_failed: "Falha na autenticação com Google",
        oauth_callback_failed: "Erro no callback do OAuth",
      };
      setError(errorMessages[oauthError] || "Erro na autenticação OAuth");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await apiClient.request<LoginApiResponse>(
        "/api/auth/login",
        {
          method: "POST",
          body: { email, password },
        }
      );

      const payload =
        "data" in response && response.data
          ? response.data
          : (response as LoginResponse);

      const token = payload?.token || payload?.accessToken;
      if (token) {
        localStorage.setItem("token", token);
        if (payload?.refreshToken) {
          localStorage.setItem("refreshToken", payload.refreshToken);
        }
        navigate("/");
      } else {
        const message =
          ("message" in response && response.message) ||
          ("error" in response && response.error) ||
          "Login failed: No token received";
        setError(message);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || "An unknown error occurred");
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = `${
      import.meta.env.VITE_API_BASE_URL
    }/api/auth/google`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-950 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-100 mb-2">
            CEO Dashboard
          </h1>
          <p className="text-neutral-400 text-sm">
            Faça login para acessar sua plataforma
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-300 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-neutral-100 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-300 mb-1.5"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-neutral-100 bg-neutral-800 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2.5 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-900 transition"
          >
            Entrar
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-800"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-neutral-900 text-neutral-500">
              Ou continue com
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full px-4 py-2.5 font-medium text-neutral-100 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-750 hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 transition flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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
          Não tem uma conta?{" "}
          <a href="#" className="text-blue-500 hover:text-blue-400 font-medium">
            Criar conta
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
