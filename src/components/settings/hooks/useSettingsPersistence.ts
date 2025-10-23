import { useState, useEffect, useCallback } from 'react';
import type { SetStateAction } from 'react';
import {
  BrainCloudSettings,
  InterfacePreferences,
  AIApiKeys,
  SystemSettings,
  AIProviderConfig,
  ModelSelectionMap,
} from '../types';

const BRAINCLOUD_KEY = 'ggai.settings.braincloud';
const INTERFACE_KEY = 'ggai.settings.interface';
const AI_KEYS_KEY = 'ggai.settings.aikeys';
const SYSTEM_KEY = 'ggai.settings.system';
const AI_PROVIDER_KEY = 'ggai.settings.aiProvider';

export const defaultBrainCloudSettings: BrainCloudSettings = {
  connectionMode: 'auto',
  mcpEnabled: true,
  restEnabled: true,
  mcpServerUrl: 'http://localhost:3100',
  restApiUrl: 'https://obsidian-brain.cloud/api/v1',
  restApiKey: '',
};

export const defaultInterfacePreferences: InterfacePreferences = {
  theme: 'auto',
  language: 'pt-BR',
  enableSounds: true,
  enableAnimations: true,
  compactMode: false,
  showBetaFeatures: false,
};

export const defaultAIApiKeys: AIApiKeys = {
  openai: '',
  anthropic: '',
  google: '',
  perplexity: '',
  openrouter: '',
};

export const defaultSystemSettings: SystemSettings = {
  allowEditAllDirectories: false,
  adminApiToken: '',
  pathOverrideTTL: 600,
  autoSaveInterval: 30,
  enableDebugMode: false,
};

const defaultModelSelection: ModelSelectionMap = {
  chat: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
  },
  insights: {
    provider: 'anthropic',
    model: 'claude-3-haiku',
    temperature: 0.4,
    maxTokens: 1536,
  },
  global: {
    provider: 'google',
    model: 'gemini-1.5-flash',
    temperature: 0.5,
    maxTokens: 2048,
  },
};

const cloneModelSelection = (selection: ModelSelectionMap): ModelSelectionMap => ({
  chat: { ...selection.chat },
  insights: { ...selection.insights },
  global: { ...selection.global },
});

const defaultAIProviderConfig: AIProviderConfig = {
    apiKeys: { ...defaultAIApiKeys },
    modelSelection: cloneModelSelection(defaultModelSelection),
    customProviders: {},
    fallbackProvider: 'openai',
};

export function useSettingsPersistence() {
  const [brainCloudSettings, setBrainCloudSettings] = useState<BrainCloudSettings>(
    defaultBrainCloudSettings
  );
  const [interfacePreferences, setInterfacePreferences] = useState<InterfacePreferences>(
    defaultInterfacePreferences
  );
  const [aiProviderConfig, setAIProviderConfig] = useState<AIProviderConfig>(
    defaultAIProviderConfig
  );
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);

  const setAIApiKeys = useCallback(
    (value: SetStateAction<AIApiKeys>) => {
      setAIProviderConfig((prev) => {
        const current = prev.apiKeys;
        const next =
          typeof value === 'function'
            ? (value as (prevState: AIApiKeys) => AIApiKeys)(current)
            : value;
        return {
          ...prev,
          apiKeys: { ...next },
        };
      });
    },
    []
  );

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    try {
      console.log('[useSettingsPersistence] Loading settings from localStorage and server');
      
      // Load from localStorage first (immediate)
      const brainCloud = localStorage.getItem(BRAINCLOUD_KEY);
      const interface_ = localStorage.getItem(INTERFACE_KEY);
      const aiKeys = localStorage.getItem(AI_KEYS_KEY);
      const system = localStorage.getItem(SYSTEM_KEY);
      const aiProvider = localStorage.getItem(AI_PROVIDER_KEY);

      if (brainCloud) setBrainCloudSettings(JSON.parse(brainCloud));
      if (interface_) setInterfacePreferences(JSON.parse(interface_));
      if (system) setSystemSettings(JSON.parse(system));
      if (aiProvider) {
        try {
          setAIProviderConfig((prev) => ({
            ...prev,
            ...JSON.parse(aiProvider),
          }));
        } catch (error) {
          console.error('[useSettingsPersistence] Failed to parse AI provider config from localStorage:', error);
        }
      }
      if (aiKeys) {
        setAIApiKeys(JSON.parse(aiKeys));
      }

      // Try to load from server with retry logic
      let retries = 3;
      let delay = 500; // Start with 500ms delay
      
      console.log('[useSettingsPersistence] Starting server fetch...');
      while (retries > 0) {
        try {
          console.log(`[useSettingsPersistence] Fetching from /api/settings (attempt ${4 - retries}/3)`);
          const serverResponse = await fetch('/api/settings', {
            credentials: 'include',
          });
          
          console.log('[useSettingsPersistence] Server response status:', serverResponse.status);
          
          if (serverResponse.ok) {
            const serverSettings = await serverResponse.json();
            console.log('✅ [useSettingsPersistence] Settings loaded from server:', serverSettings);
            if (serverSettings.brainCloud) setBrainCloudSettings(serverSettings.brainCloud);
            if (serverSettings.interface) setInterfacePreferences(serverSettings.interface);
            if (serverSettings.aiProvider) {
              setAIProviderConfig((prev) => ({
                ...defaultAIProviderConfig,
                ...prev,
                ...serverSettings.aiProvider,
              }));
            }
            if (serverSettings.aiKeys) setAIApiKeys(serverSettings.aiKeys);
            if (serverSettings.system) setSystemSettings(serverSettings.system);
            break; // Success, exit retry loop
          } else if (serverResponse.status === 401 && retries > 1) {
            // Auth not ready yet, wait and retry
            console.log(`[useSettingsPersistence] Auth not ready, retrying in ${delay}ms... (${retries - 1} retries left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
            retries--;
          } else {
            console.warn('[useSettingsPersistence] Failed to load from server:', serverResponse.status);
            break; // Don't retry for other errors
          }
        } catch (fetchError) {
          console.error('[useSettingsPersistence] Fetch error:', fetchError);
          break; // Don't retry on network errors
        }
      }
    } catch (error) {
      console.error('[useSettingsPersistence] Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem(BRAINCLOUD_KEY, JSON.stringify(brainCloudSettings));
      localStorage.setItem(INTERFACE_KEY, JSON.stringify(interfacePreferences));
      localStorage.setItem(AI_KEYS_KEY, JSON.stringify(aiProviderConfig.apiKeys));
      localStorage.setItem(SYSTEM_KEY, JSON.stringify(systemSettings));
      localStorage.setItem(AI_PROVIDER_KEY, JSON.stringify(aiProviderConfig));

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brainCloud: brainCloudSettings,
          interface: interfacePreferences,
          aiKeys: aiProviderConfig.apiKeys,
          system: systemSettings,
          aiProvider: aiProviderConfig,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useSettingsPersistence] Server error:', response.status, errorText);
        throw new Error(`Failed to save settings: ${response.status} - ${errorText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('[useSettingsPersistence] Error saving settings:', error);
      return { success: false, error };
    }
  };

  return {
    brainCloudSettings,
    setBrainCloudSettings,
    interfacePreferences,
    setInterfacePreferences,
    aiApiKeys: aiProviderConfig.apiKeys,
    setAIApiKeys,
    aiProviderConfig,
    setAIProviderConfig,
    systemSettings,
    setSystemSettings,
    loadSettings,
    saveSettings,
  };
}
