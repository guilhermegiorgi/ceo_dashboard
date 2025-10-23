import React from 'react';
import { Palette } from 'lucide-react';
import { InterfacePreferences } from './types';

type Props = {
  preferences: InterfacePreferences;
  onChange: (preferences: InterfacePreferences) => void;
  disabled?: boolean;
};

const themes = [
  { value: 'auto', label: 'Auto', description: 'System default' },
  { value: 'light', label: 'Light', description: 'Bright interface' },
  { value: 'dark', label: 'Dark', description: 'Dark interface' }
];

const languages = [
  { value: 'en-US', label: 'English', description: 'Interface language' },
  { value: 'pt-BR', label: 'Português', description: 'Idioma da interface' }
];

export function InterfaceSettingsSection({ preferences, onChange, disabled }: Props) {
  const handleFieldChange = <K extends keyof InterfacePreferences>(
    field: K,
    value: InterfacePreferences[K]
  ) => {
    onChange({ ...preferences, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-2">
          <Palette className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          Interface
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Customize your dashboard experience
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Theme
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Visual appearance
            </p>
          </div>
          <div className="w-40">
            <select
              value={preferences.theme}
              onChange={(e) =>
                handleFieldChange('theme', e.target.value as InterfacePreferences['theme'])
              }
              disabled={disabled}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                text-zinc-900 dark:text-zinc-100 text-sm
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                disabled:opacity-50 transition-all duration-200"
            >
              {themes.map(theme => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Language
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Interface language
            </p>
          </div>
          <div className="w-40">
            <select
              value={preferences.language}
              onChange={(e) =>
                handleFieldChange('language', e.target.value as InterfacePreferences['language'])
              }
              disabled={disabled}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                text-zinc-900 dark:text-zinc-100 text-sm
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                disabled:opacity-50 transition-all duration-200"
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="w-48">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Sounds
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Audio feedback
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enableSounds}
              onChange={(e) => handleFieldChange('enableSounds', e.target.checked)}
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
              Animations
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Visual transitions
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enableAnimations}
              onChange={(e) => handleFieldChange('enableAnimations', e.target.checked)}
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
              Compact Mode
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Reduced spacing
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.compactMode}
              onChange={(e) => handleFieldChange('compactMode', e.target.checked)}
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
              Beta Features
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Experimental features
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.showBetaFeatures}
              onChange={(e) => handleFieldChange('showBetaFeatures', e.target.checked)}
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
      </div>

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              Sync Status
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Settings synchronized across devices
            </div>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            <Palette className="h-4 w-4 inline mr-1" />
            Personalized
          </div>
        </div>
      </div>
    </div>
  );
}
