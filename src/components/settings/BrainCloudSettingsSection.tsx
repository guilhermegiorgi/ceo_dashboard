import React from 'react';
import { Cloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { BrainCloudSettings, BrainCloudConnectionMode, TestStatus } from './types';

type Props = {
  settings: BrainCloudSettings;
  onChange: (settings: BrainCloudSettings) => void;
  onTestConnection: (mode: BrainCloudConnectionMode) => void;
  testStatus: TestStatus;
  testingMode: BrainCloudConnectionMode | null;
  disabled?: boolean;
};

const connectionModes = [
  { value: 'auto', label: 'Auto', description: 'Smart hybrid connection' },
  { value: 'mcp', label: 'MCP', description: 'Model Context Protocol' },
  { value: 'rest', label: 'REST', description: 'HTTP API' },
  { value: 'hybrid', label: 'Hybrid', description: 'MCP + REST' }
];

export function BrainCloudSettingsSection({
  settings,
  onChange,
  onTestConnection,
  testStatus,
  testingMode,
  disabled,
}: Props) {
  const handleFieldChange = <K extends keyof BrainCloudSettings>(
    field: K,
    value: BrainCloudSettings[K]
  ) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
          <Cloud className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          Brain Cloud
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Connection settings to sync with your Obsidian vault
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-24">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Mode
            </label>
          </div>
          <div className="flex-1">
            <select
              value={settings.connectionMode}
              onChange={(e) =>
                handleFieldChange(
                  'connectionMode',
                  e.target.value as BrainCloudConnectionMode
                )
              }
              disabled={disabled}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                text-zinc-900 dark:text-zinc-100 text-sm
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                disabled:opacity-50 transition-all duration-200"
            >
              {connectionModes.map(mode => (
                <option key={mode.value} value={mode.value}>
                  {mode.label} - {mode.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-24">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              MCP URL
            </label>
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={settings.mcpServerUrl}
              onChange={(e) => handleFieldChange('mcpServerUrl', e.target.value)}
              disabled={disabled || !settings.mcpEnabled}
              placeholder="ws://localhost:3100"
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                disabled:opacity-50 transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-24">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              REST URL
            </label>
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={settings.restApiUrl}
              onChange={(e) => handleFieldChange('restApiUrl', e.target.value)}
              disabled={disabled || !settings.restEnabled}
              placeholder="https://obsidian-brain.cloud/api/v1"
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                disabled:opacity-50 transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-24">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              API Key
            </label>
          </div>
          <div className="flex-1">
            <input
              type="password"
              value={settings.restApiKey}
              onChange={(e) => handleFieldChange('restApiKey', e.target.value)}
              disabled={disabled || !settings.restEnabled}
              placeholder="sk-obsidian-..."
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                text-zinc-900 dark:text-zinc-100 text-sm placeholder-zinc-400 dark:placeholder-zinc-500
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                disabled:opacity-50 transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-24">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Enable
            </label>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mcpEnabled ?? false}
                onChange={(e) => handleFieldChange('mcpEnabled', e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 text-zinc-600 border-zinc-300 rounded
                  focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0"
              />
              MCP
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.restEnabled ?? false}
                onChange={(e) => handleFieldChange('restEnabled', e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 text-zinc-600 border-zinc-300 rounded
                  focus:ring-2 focus:ring-zinc-500 focus:ring-offset-0"
              />
              REST
            </label>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onTestConnection('mcp')}
              disabled={disabled || !settings.mcpEnabled || testingMode === 'mcp'}
              className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg
                hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingMode === 'mcp' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing
                </div>
              ) : testStatus?.mode === 'mcp' && testStatus.status === 'success' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  MCP OK
                </div>
              ) : testStatus?.mode === 'mcp' && testStatus.status === 'error' ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  MCP Error
                </div>
              ) : (
                'Test MCP'
              )}
            </button>

            <button
              type="button"
              onClick={() => onTestConnection('rest')}
              disabled={disabled || !settings.restEnabled || testingMode === 'rest'}
              className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg
                hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingMode === 'rest' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing
                </div>
              ) : testStatus?.mode === 'rest' && testStatus.status === 'success' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  REST OK
                </div>
              ) : testStatus?.mode === 'rest' && testStatus.status === 'error' ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  REST Error
                </div>
              ) : (
                'Test REST'
              )}
            </button>
          </div>

          <div className="text-xs text-zinc-500">
            {settings.connectionMode === 'auto' ? 'Auto-detect' :
             settings.connectionMode === 'mcp' ? 'WebSocket' :
             settings.connectionMode === 'rest' ? 'HTTP' : 'Hybrid'}
          </div>
        </div>

        {testStatus && testStatus.message && (
          <div
            className={`mt-3 px-3 py-2 text-sm rounded-lg ${
              testStatus.status === 'success'
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}
          >
            {testStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}
