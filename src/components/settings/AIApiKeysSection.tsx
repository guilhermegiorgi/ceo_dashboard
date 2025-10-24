import React, { useState } from 'react';
import { AIApiKeys } from './types';

type Props = {
  apiKeys: AIApiKeys;
  onChange: (keys: AIApiKeys) => void;
  disabled?: boolean;
};

const providers = [
  { key: 'openai' as keyof AIApiKeys, label: 'OpenAI', placeholder: 'sk-', hint: 'GPT-4, GPT-3.5' },
  { key: 'anthropic' as keyof AIApiKeys, label: 'Anthropic', placeholder: 'sk-ant-', hint: 'Claude 3, Sonnet' },
  { key: 'google' as keyof AIApiKeys, label: 'Google', placeholder: 'AIza', hint: 'Gemini Pro, Ultra' },
  { key: 'perplexity' as keyof AIApiKeys, label: 'Perplexity', placeholder: 'pplx-', hint: 'pplx-70b-online' },
  { key: 'openrouter' as keyof AIApiKeys, label: 'OpenRouter', placeholder: 'sk-or-', hint: 'Multiple models' },
  { key: 'custom' as keyof AIApiKeys, label: 'Custom', placeholder: 'your-api-key', hint: 'Custom provider' }
];

export function AIApiKeysSection({ apiKeys, onChange, disabled }: Props) {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const handleChange = (provider: keyof AIApiKeys, value: string) => {
    onChange({ ...apiKeys, [provider]: value });
  };

  const togglePasswordVisibility = (provider: string) => {
    setShowPasswords(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          API Keys
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Configure API keys for AI models
        </p>
      </div>

      <div className="space-y-3">
        {providers.map((provider) => (
          <div key={provider.key} className="flex items-center gap-3">
            <div className="w-20">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {provider.label}
              </label>
            </div>
            <div className="flex-1 relative">
              <input
                type={showPasswords[provider.key] ? "text" : "password"}
                value={apiKeys[provider.key]}
                onChange={(e) => handleChange(provider.key, e.target.value)}
                placeholder={provider.placeholder}
                disabled={disabled}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg
                  text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500
                  focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent
                  disabled:opacity-50 transition-all duration-200"
              />
              {apiKeys[provider.key] && (
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility(provider.key)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  {showPasswords[provider.key] ? '👁️' : '👁️‍🗨️'}
                </button>
              )}
            </div>
            <div className="w-32">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {provider.hint}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              Get API Keys
            </h4>
            <div className="text-xs text-zinc-500 space-y-1">
              <div>OpenAI: platform.openai.com</div>
              <div>Anthropic: console.anthropic.com</div>
              <div>Google: makersuite.google.com</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 mb-2">
              Secure storage
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              ✓ Encrypted
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
