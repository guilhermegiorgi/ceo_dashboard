import React, { useState, useEffect, useCallback } from 'react';
import { Settings as SettingsIcon, Loader2, Save, Cloud, Key, Sliders, Palette, X } from 'lucide-react';
import { useSettingsPersistence } from './settings/hooks/useSettingsPersistence';
import { showSuccessToast, showErrorToast } from '../lib/toast';
import { BrainCloudSettingsSection } from './settings/BrainCloudSettingsSection';
import { InterfaceSettingsSection } from './settings/InterfaceSettingsSection';
import { AIApiKeysSection } from './settings/AIApiKeysSection';
import { SystemSettingsSection } from './settings/SystemSettingsSection';
import { BrainCloudConnectionMode, TestStatus } from './settings/types';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModalRefactored({ open, onClose }: Props) {
  const {
    brainCloudSettings,
    setBrainCloudSettings,
    interfacePreferences,
    setInterfacePreferences,
    aiApiKeys,
    setAIApiKeys,
    systemSettings,
    setSystemSettings,
    loadSettings,
    saveSettings,
  } = useSettingsPersistence();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingMode, setTestingMode] = useState<BrainCloudConnectionMode | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>(null);
  const [activeTab, setActiveTab] = useState<'braincloud' | 'interface' | 'ai' | 'system'>(
    'braincloud'
  );

  useEffect(() => {
    if (open) {
      setLoading(true);
      loadSettings().finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await saveSettings();
      if (result.success) {
        showSuccessToast('Configurações salvas');
        
        // If admin mode is enabled, activate it immediately
        if (systemSettings.allowEditAllDirectories && systemSettings.adminApiToken) {
          try {
            const response = await fetch('/api/admin-mode/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            
            if (response.ok) {
              const data = await response.json();
              
              // Dispatch event to show indicator
              if (data.expiresAt) {
                const event = new CustomEvent('admin-mode-activated', {
                  detail: { expiresAt: data.expiresAt },
                });
                window.dispatchEvent(event);
              }
            }
          } catch (adminError) {
            console.error('[Settings] Error activating admin mode:', adminError);
          }
        }
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showErrorToast('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = useCallback(async (mode: BrainCloudConnectionMode) => {
    setTestingMode(mode);
    setTestStatus(null);
    try {
      const response = await fetch('/api/settings/braincloud/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ braincloud: brainCloudSettings, mode }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestStatus({
          mode,
          status: 'success',
          message:
            mode === 'mcp'
              ? 'Conexão MCP estabelecida com sucesso.'
              : 'Conexão REST verificada com sucesso.',
        });
        showSuccessToast(`Conexão ${mode.toUpperCase()} ativa`);
      } else {
        const message = data.error || 'Não foi possível validar a conexão.';
        setTestStatus({
          mode,
          status: 'error',
          message,
        });
        showErrorToast(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro inesperado ao testar conexão';
      setTestStatus({
        mode,
        status: 'error',
        message,
      });
      showErrorToast(message);
    } finally {
      setTestingMode(null);
    }
  }, [brainCloudSettings]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) {
    return null;
  }

  const tabs = [
    { id: 'braincloud' as const, label: 'Brain Cloud', icon: Cloud },
    { id: 'ai' as const, label: 'API Keys', icon: Key },
    { id: 'system' as const, label: 'System', icon: Sliders },
    { id: 'interface' as const, label: 'Interface', icon: Palette },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="relative flex h-full max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Sidebar */}
        <aside className="w-48 border-r border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center gap-3 mb-8">
            <div className="rounded-lg bg-zinc-800 p-2">
              <SettingsIcon className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-lg font-semibold text-zinc-100 tracking-tight"
              >
                Settings
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure dashboard
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm border-l-2 border-zinc-400'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <form onSubmit={handleSave} className="flex-1 flex flex-col">
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-zinc-900 px-8 py-6">
              {loading ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-zinc-500" strokeWidth={1.5} />
                  <p className="text-sm text-zinc-500">Loading settings...</p>
                </div>
              ) : (
                <div className="max-w-2xl">
                  {activeTab === 'braincloud' && (
                    <BrainCloudSettingsSection
                      settings={brainCloudSettings}
                      onChange={setBrainCloudSettings}
                      onTestConnection={handleTestConnection}
                      testStatus={testStatus}
                      testingMode={testingMode}
                      disabled={saving}
                    />
                  )}

                  {activeTab === 'ai' && (
                    <AIApiKeysSection
                      apiKeys={aiApiKeys}
                      onChange={setAIApiKeys}
                      disabled={saving}
                    />
                  )}

                  {activeTab === 'system' && (
                    <SystemSettingsSection
                      settings={systemSettings}
                      onChange={setSystemSettings}
                      disabled={saving}
                    />
                  )}

                  {activeTab === 'interface' && (
                    <InterfaceSettingsSection
                      preferences={interfacePreferences}
                      onChange={setInterfacePreferences}
                      disabled={saving}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="border-t border-zinc-800 bg-zinc-950 px-8 py-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  Settings are saved locally and synchronized with the server
                </p>
                <button
                  type="submit"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" strokeWidth={2} />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </footer>
          </form>
        </main>
      </div>
    </div>
  );
}
