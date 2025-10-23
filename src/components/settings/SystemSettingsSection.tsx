import React from 'react';
import { Shield, Bug, Clock } from 'lucide-react';
import { SystemSettings } from './types';

type Props = {
  settings: SystemSettings;
  onChange: (settings: SystemSettings) => void;
  disabled?: boolean;
};

export function SystemSettingsSection({ settings, onChange, disabled }: Props) {
  const handleToggle = (key: keyof SystemSettings) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  const handleNumberChange = (key: keyof SystemSettings, value: number) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
          <Shield className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          System
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Advanced system settings and permissions
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Edit All Directories
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Allow dashboard to modify any vault file
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowEditAllDirectories}
              onChange={() => handleToggle('allowEditAllDirectories')}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 
              peer-focus:ring-zinc-300 dark:peer-focus:ring-zinc-700 rounded-full peer 
              dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white 
              after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white 
              after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 
              after:transition-all dark:border-zinc-600 peer-checked:bg-zinc-600
              peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Debug Mode
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Enable detailed console logs
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableDebugMode}
              onChange={() => handleToggle('enableDebugMode')}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 
              peer-focus:ring-zinc-300 dark:peer-focus:ring-zinc-700 rounded-full peer 
              dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white 
              after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white 
              after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 
              after:transition-all dark:border-zinc-600 peer-checked:bg-zinc-600
              peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Admin Token
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Path override token
            </p>
          </div>
          <div className="flex-1 max-w-sm">
            <input
              type="password"
              value={settings.adminApiToken}
              onChange={(e) => onChange({ ...settings, adminApiToken: e.target.value })}
              placeholder="ggai_..._admin"
              disabled={disabled}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                text-zinc-900 dark:text-zinc-100 text-sm font-mono placeholder-zinc-400 dark:placeholder-zinc-500
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                disabled:opacity-50 transition-all duration-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              TTL (minutes)
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Admin mode expiration
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="60"
              value={Math.round(settings.pathOverrideTTL / 60)}
              onChange={(e) => handleNumberChange('pathOverrideTTL', (parseInt(e.target.value) || 10) * 60)}
              disabled={disabled}
              className="w-20 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                text-zinc-900 dark:text-zinc-100 text-sm
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                disabled:opacity-50 transition-all duration-200"
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400 minutes">
              minutes
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Auto Save
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Save interval (seconds)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="10"
              max="300"
              step="10"
              value={settings.autoSaveInterval}
              onChange={(e) => handleNumberChange('autoSaveInterval', parseInt(e.target.value) || 30)}
              disabled={disabled}
              className="w-20 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                text-zinc-900 dark:text-zinc-100 text-sm
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                disabled:opacity-50 transition-all duration-200"
            />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              seconds
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              Commercial Use
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Production environments have full directory access
            </div>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            <Clock className="h-4 w-4 inline mr-1" />
            Auto-disconnect
          </div>
        </div>
      </div>

      <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Note:</strong> These restrictions are for development only. Commercial deployments will have full vault access.
        </p>
      </div>
    </div>
  );
}
