import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Command,
  FilePlus2,
  Flame,
  Image as ImageIcon,
  LogOut,
  Menu,
  Mic,
  Settings,
  Sparkles,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  X,
} from 'lucide-react';
import { useSettingsModal } from '../contexts/SettingsModalContext';
import apiClient, { DashboardCollection } from '../services/apiClient';

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: 'Focus',
    items: [
      { label: 'Today', path: '/', icon: Flame },
      { label: 'Chat', path: '/chat', icon: Command },
    ],
  },
];

const NavigationSidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('ggai.nav.collapsed') === 'true';
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [collections, setCollections] = useState<DashboardCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const { openSettings } = useSettingsModal();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const getIsActive = useCallback(
    (targetPath: string) => {
      const [pathname, search] = targetPath.split('?');
      if (location.pathname !== pathname) return false;
      if (!search) return true;
      const targetParams = new URLSearchParams(search);
      const currentParams = new URLSearchParams(location.search);
      for (const [key, value] of targetParams) {
        if (currentParams.get(key) !== value) return false;
      }
      return true;
    },
    [location.pathname, location.search]
  );
  const activeCollectionId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('collection');
  }, [location.search]);

  useEffect(() => {
    localStorage.setItem('ggai.nav.collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    let mounted = true;
    const loadCollections = async () => {
      try {
        setCollectionsLoading(true);
        const data = await apiClient.getDashboardCollections();
        if (mounted) {
          setCollections(data);
        }
      } catch (error) {
        console.error('Failed to load dashboard collections', error);
      } finally {
        if (mounted) setCollectionsLoading(false);
      }
    };
    loadCollections();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleToggleCollapse = () => setCollapsed((prev) => !prev);

  const persistCollections = async (next: DashboardCollection[]) => {
    setCollections(next);
    try {
      await apiClient.saveDashboardCollections(next);
    } catch (error) {
      console.error('Failed to save dashboard collections', error);
    }
  };

  const handleAddCollection = async () => {
    const label = window.prompt('Nome do projeto estratégico (ex.: Fusões Agro, NK Insights)');
    if (!label) return;
    const filterInput = window.prompt('Filtro ou consulta (opcional). Use tags, notebooks ou palavras-chave para focar o contexto.', '');
    const descriptionInput = window.prompt('Descrição (opcional)', '') || '';
    const newCollection: DashboardCollection = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: label.trim(),
      filter: filterInput ? filterInput.trim() : '',
      description: descriptionInput.trim(),
      icon: 'sparkles'
    };
    await persistCollections([...collections, newCollection]);
  };

  const handleRemoveCollection = async (id: string, label: string) => {
    const confirmed = window.confirm(`Remover o projeto "${label}"? Essa ação não deleta notas, apenas o atalho.`);
    if (!confirmed) return;
    await persistCollections(collections.filter((item) => item.id !== id));
  };

  return (
    <aside
      className={`relative flex h-full flex-col border-r border-neutral-800/80 bg-neutral-950/95 backdrop-blur ${
        collapsed ? 'w-20' : 'w-72 max-w-xs'
      } transition-all duration-300`}
    >
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900">
          <Sparkles className="h-4 w-4 text-zinc-200" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-zinc-100">GG.AI Labs</p>
            <p className="text-xs text-zinc-500">CEO Dashboard</p>
          </div>
        )}
        <button
          onClick={handleToggleCollapse}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-zinc-400 transition hover:border-neutral-600 hover:text-zinc-100"
          aria-label={collapsed ? 'Expandir navegação' : 'Recolher navegação'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <p
              className={`mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wide text-zinc-500 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Menu className="h-3.5 w-3.5" />
              {!collapsed && section.label}
            </p>
            <div className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = getIsActive(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      setUserMenuOpen(false);
                    }}
                    title={collapsed ? item.label : undefined}
                    className={[
                      'group flex w-full items-center rounded-xl px-3 py-2 text-sm transition border',
                      isActive
                        ? 'border-neutral-700 bg-neutral-900 text-zinc-50 shadow-lg shadow-black/20'
                        : 'border-transparent text-zinc-400 hover:border-neutral-700 hover:bg-neutral-900/70 hover:text-zinc-100',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-9 w-9 items-center justify-center rounded-lg border transition',
                        isActive
                          ? 'border-neutral-600 bg-neutral-900 text-zinc-50'
                          : 'border-neutral-800 bg-neutral-950 text-zinc-400 group-hover:border-neutral-700',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {!collapsed && (
                      <>
                        <span className="ml-3 font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-8">
          <div
            className={`mb-2 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2 text-[11px] uppercase tracking-wide text-zinc-500`}
          >
            {!collapsed && <span>Projects</span>}
            <button
              type="button"
              onClick={handleAddCollection}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-zinc-300 transition hover:border-neutral-600 hover:text-zinc-100"
              title="Adicionar projeto estratégico"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {collectionsLoading && !collections.length ? (
            <div className={`${collapsed ? 'hidden' : 'space-y-2'}`}>
              <div className="h-9 w-full animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/50" />
              <div className="h-9 w-full animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/50" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {collections.map((collection) => {
                const isActive = activeCollectionId === collection.id;
                const badge = collection.filter ? collection.filter : collection.description;
                return (
                  <div key={collection.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams(location.search);
                        params.set('collection', collection.id);
                        navigate(`/?${params.toString()}`);
                        setUserMenuOpen(false);
                      }}
                      title={collection.label}
                      className={[
                        'flex w-full items-center rounded-xl px-3 py-2 text-sm transition border',
                        isActive
                          ? 'border-neutral-700 bg-neutral-900 text-zinc-50 shadow-lg shadow-black/20'
                          : 'border-neutral-800 bg-neutral-950 text-zinc-300 hover:border-neutral-700 hover:bg-neutral-900/70 hover:text-zinc-100',
                        collapsed ? 'justify-center' : 'justify-between gap-3',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold uppercase transition',
                          isActive ? 'border-emerald-400/60 text-emerald-200' : 'border-neutral-800 text-zinc-400 group-hover:border-neutral-700',
                        ].join(' ')}
                      >
                        {collection.label.charAt(0).toUpperCase()}
                      </span>
                      {!collapsed && (
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-zinc-100">{collection.label}</p>
                          {badge && <p className="text-[11px] text-zinc-500">{badge}</p>}
                        </div>
                      )}
                    </button>
                    {!collapsed && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveCollection(collection.id, collection.label);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-neutral-800 bg-neutral-950 p-1 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:border-neutral-600 hover:text-zinc-100"
                        title="Remover projeto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              {!collectionsLoading && !collections.length && !collapsed && (
                <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-950/60 px-3 py-3 text-xs text-zinc-500">
                  Sem projetos no momento. Use o botão “+” para criar atalhos que agrupem notas, conhecimentos ou tags recorrentes do seu Segundo Cérebro.
                </div>
              )}
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-8 space-y-3">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Quick actions</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                title="Nova nota (⌘+N)"
                onClick={() => navigate('/?action=new-note')}
                className="flex h-11 items-center justify-center rounded-xl border border-dashed border-neutral-600 bg-neutral-900 text-zinc-200 transition hover:border-neutral-500"
              >
                <FilePlus2 className="h-4 w-4" />
              </button>
              <button
                title="Capturar áudio"
                onClick={() => navigate('/?action=voice-capture')}
                className="flex h-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-900"
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                title="Importar mídia"
                onClick={() => navigate('/?action=media-import')}
                className="flex h-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-zinc-200 transition hover:border-neutral-600 hover:bg-neutral-900"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="relative border-t border-neutral-800/80 px-4 py-5" ref={menuRef}>
        <button
          onClick={() => {
            if (collapsed) {
              openSettings();
              return;
            }
            setUserMenuOpen((prev) => !prev);
          }}
          className={`flex w-full items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-left transition hover:border-neutral-600 hover:bg-neutral-900 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900">
            <UserAvatar />
          </div>
          {!collapsed && (
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-zinc-100">Guilherme Giorgi</p>
              <p className="text-xs text-zinc-500">vectal.free@gg.ai</p>
            </div>
          )}
          {!collapsed && (
            <ChevronDownIcon open={userMenuOpen} />
          )}
        </button>

        {userMenuOpen && !collapsed && (
          <div className="absolute bottom-20 left-4 right-4 z-40 space-y-1 rounded-2xl border border-neutral-800 bg-neutral-950/95 py-2 shadow-2xl shadow-black/40">
            <div className="border-b border-neutral-800 px-4 py-3 text-sm">
              <p className="font-medium text-zinc-100">gui.agro@gmail.com</p>
              <p className="text-xs text-zinc-500">GG.AI Labs • Vectal Free</p>
            </div>
            <MenuItem
              icon={<Settings className="h-4 w-4 text-zinc-300" />}
              label="Advanced Settings"
              onClick={() => {
                openSettings();
                setUserMenuOpen(false);
              }}
            />
            <MenuItem
              icon={<Sparkles className="h-4 w-4 text-emerald-300" />}
              label="Upgrade Plan"
              badge="NEW"
              onClick={() => {
                // TODO: ligar com fluxo de upgrade
                setUserMenuOpen(false);
              }}
            />
            <MenuItem
              icon={<User className="h-4 w-4 text-sky-300" />}
              label="User Context"
              onClick={() => {
                // TODO: abrir modal de contexto
                setUserMenuOpen(false);
              }}
            />
            <MenuItem
              icon={<LogOut className="h-4 w-4 text-rose-300" />}
              label="Logout"
              onClick={() => {
                localStorage.clear();
                navigate('/login', { replace: true });
              }}
            />
          </div>
        )}
      </div>
    </aside>
  );
};

const UserAvatar: React.FC = () => (
  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-500 via-slate-400 to-slate-300 text-zinc-950 text-sm font-semibold">
    GG
  </span>
);

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; badge?: string }> = ({
  icon,
  label,
  onClick,
  badge,
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-zinc-200 transition hover:bg-neutral-900"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900">
      {icon}
    </span>
    <span className="flex-1 text-left">{label}</span>
    {badge && (
      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
        {badge}
      </span>
    )}
  </button>
);

const ChevronDownIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <span
    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-950 text-zinc-400 transition ${
      open ? 'rotate-180 text-zinc-200' : ''
    }`}
  >
    <ChevronDown className="h-4 w-4" />
  </span>
);

export default NavigationSidebar;
