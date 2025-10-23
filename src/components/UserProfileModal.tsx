'use client';

import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import apiClient, { CurrentUserProfile } from '@/services/apiClient';

type UserProfileModalProps = {
  onClose: () => void;
  onOpenSettings?: () => void;
};

type SessionSnapshot = {
  device: string;
  location?: string;
  lastActivity: string;
};

type FetchState =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: null; error: null }
  | { status: 'loaded'; data: CurrentUserProfile; error: null }
  | { status: 'error'; data: null; error: string };

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  onClose,
  onOpenSettings,
}) => {
  const [profileState, setProfileState] = useState<FetchState>({
    status: 'idle',
    data: null,
    error: null,
  });
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      setProfileState({ status: 'loading', data: null, error: null });
      try {
        const user = await apiClient.getCurrentUser();
        if (!mounted) return;
        setProfileState({ status: 'loaded', data: user, error: null });
      } catch (error) {
        console.error('Failed to load user profile', error);
        if (!mounted) return;
        setProfileState({
          status: 'error',
          data: null,
          error: 'Não foi possível carregar o perfil do usuário.',
        });
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const sessionSnapshot: SessionSnapshot = useMemo(() => {
    const device =
      typeof window !== 'undefined'
        ? window.navigator.userAgent
        : 'Dispositivo não identificado';
    const lastActivity = new Date().toLocaleString();
    return {
      device,
      lastActivity,
      location: 'Detecção automática (em breve)',
    };
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiClient.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      toast.success('Sessão encerrada.');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout failed', error);
      toast.error('Não foi possível encerrar a sessão agora.');
    } finally {
      setLoggingOut(false);
    }
  };

  const profile = profileState.status === 'loaded' ? profileState.data : null;

  const initials = useMemo(() => {
    if (!profile?.name) return 'GG';
    const parts = profile.name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [profile?.name]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Perfil do usuário"
    >
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-lg font-semibold text-emerald-300">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {profile?.name ?? 'Carregando usuário...'}
              </h2>
              <p className="text-sm text-zinc-500">
                {profile?.email ?? 'Sincronizando credenciais'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-800 px-3 py-1 text-sm text-zinc-300 transition hover:border-neutral-600 hover:text-white"
          >
            Fechar
          </button>
        </header>

        {profileState.status === 'loading' && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            Carregando perfil do usuário...
          </div>
        )}

        {profileState.status === 'error' && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {profileState.error}
          </div>
        )}

        {profile && (
          <>
            <section className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Informações da conta
              </h3>
              <dl className="mt-3 grid gap-3 text-sm text-zinc-300 md:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Nome
                  </dt>
                  <dd className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    {profile.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Email
                  </dt>
                  <dd className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    {profile.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Função
                  </dt>
                  <dd className="capitalize">{profile.role ?? 'Padrão'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Status
                  </dt>
                  <dd className="capitalize">{profile.status ?? 'Ativo'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Criado em
                  </dt>
                  <dd className="flex items-center gap-2 text-xs text-zinc-400">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    {profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">
                    Último acesso
                  </dt>
                  <dd className="flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="h-3.5 w-3.5 text-zinc-500" />
                    {profile.lastLoginAt
                      ? formatRelative(profile.lastLoginAt)
                      : 'Não registrado'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                Sessão atual
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                <li className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    Dispositivo
                  </span>
                  <p className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <Smartphone className="h-3.5 w-3.5 text-zinc-500" />
                    {sessionSnapshot.device}
                  </p>
                </li>
                {sessionSnapshot.location && (
                  <li className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2">
                    <span className="text-xs uppercase tracking-wide text-zinc-500">
                      Localização
                    </span>
                    <p className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                      <Globe className="h-3.5 w-3.5 text-zinc-500" />
                      {sessionSnapshot.location}
                    </p>
                  </li>
                )}
                <li className="rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">
                    Última atividade
                  </span>
                  <p className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <Clock className="h-3.5 w-3.5 text-zinc-500" />
                    {sessionSnapshot.lastActivity}
                  </p>
                </li>
              </ul>
            </section>
          </>
        )}

        <section className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 text-sm text-zinc-200 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium text-zinc-100">
              Acesso rápido às preferências
            </p>
            <p className="text-xs text-zinc-500">
              Ajuste integrações e provedores de IA diretamente no painel de
              configurações.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings?.();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-emerald-500/50 hover:text-emerald-300"
            >
              <Settings className="h-3.5 w-3.5" />
              Abrir configurações
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-200 transition hover:border-rose-500/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              Sair
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

const formatRelative = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return date.toLocaleString();
};

export default UserProfileModal;
