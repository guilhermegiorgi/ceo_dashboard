import { useState, useEffect } from 'react';
import {
  BrainCloudSettings,
  InterfacePreferences,
  AIApiKeys,
  SystemSettings,
} from '../types';

const BRAINCLOUD_KEY = 'ggai.settings.braincloud';
const INTERFACE_KEY = 'ggai.settings.interface';
const AI_KEYS_KEY = 'ggai.settings.aikeys';
const SYSTEM_KEY = 'ggai.settings.system';

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
};

export const defaultSystemSettings: SystemSettings = {
  allowEditAllDirectories: false,
  adminApiToken: '',
  pathOverrideTTL: 600,
  autoSaveInterval: 30,
  enableDebugMode: false,
};

export function useSettingsPersistence() {
  const [brainCloudSettings, setBrainCloudSettings] = useState<BrainCloudSettings>(
    defaultBrainCloudSettings
  );
  const [interfacePreferences, setInterfacePreferences] = useState<InterfacePreferences>(
    defaultInterfacePreferences
  );
  const [aiApiKeys, setAIApiKeys] = useState<AIApiKeys>(defaultAIApiKeys);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);

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

      if (brainCloud) setBrainCloudSettings(JSON.parse(brainCloud));
      if (interface_) setInterfacePreferences(JSON.parse(interface_));
      if (aiKeys) setAIApiKeys(JSON.parse(aiKeys));
      if (system) setSystemSettings(JSON.parse(system));

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
      localStorage.setItem(AI_KEYS_KEY, JSON.stringify(aiApiKeys));
      localStorage.setItem(SYSTEM_KEY, JSON.stringify(systemSettings));

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brainCloud: brainCloudSettings,
          interface: interfacePreferences,
          aiKeys: aiApiKeys,
          system: systemSettings,
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
    aiApiKeys,
    setAIApiKeys,
    systemSettings,
    setSystemSettings,
    loadSettings,
    saveSettings,
  };
}
