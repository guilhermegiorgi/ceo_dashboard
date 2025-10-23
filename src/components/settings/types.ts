export type BrainCloudConnectionMode = 'mcp' | 'rest' | 'hybrid' | 'auto';

export type BrainCloudSettings = {
  connectionMode: BrainCloudConnectionMode;
  mcpEnabled: boolean;
  restEnabled: boolean;
  mcpServerUrl: string;
  restApiUrl: string;
  restApiKey: string;
};

export type InterfacePreferences = {
  theme: 'light' | 'dark' | 'auto';
  language: 'pt-BR' | 'en-US';
  enableSounds: boolean;
  enableAnimations: boolean;
  compactMode: boolean;
  showBetaFeatures: boolean;
};

export type AIApiKeys = {
  openai: string;
  anthropic: string;
  google: string;
  perplexity: string;
  openrouter: string;
};

export type SystemSettings = {
  allowEditAllDirectories: boolean;
  adminApiToken: string;
  pathOverrideTTL: number;
  autoSaveInterval: number;
  enableDebugMode: boolean;
};

export type TestStatus =
  | {
      mode: BrainCloudConnectionMode;
      status: 'idle' | 'testing' | 'success' | 'error';
      message?: string;
    }
  | null;
