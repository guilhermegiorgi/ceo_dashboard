export type BrainCloudConnectionMode = "mcp" | "rest" | "hybrid" | "auto";

export type BrainCloudSettings = {
  connectionMode: BrainCloudConnectionMode;
  mcpEnabled: boolean;
  restEnabled: boolean;
  mcpServerUrl: string;
  restApiUrl: string;
  restApiKey: string;
};

export type InterfacePreferences = {
  theme: "light" | "dark" | "auto";
  language: "pt-BR" | "en-US";
  enableSounds: boolean;
  enableAnimations: boolean;
  compactMode: boolean;
  showBetaFeatures: boolean;
};

export type SystemSettings = {
  allowEditAllDirectories: boolean;
  adminApiToken: string;
  pathOverrideTTL: number;
  autoSaveInterval: number;
  enableDebugMode: boolean;
};

export type TestStatus = {
  mode: BrainCloudConnectionMode;
  status: "idle" | "testing" | "success" | "error";
  message?: string;
} | null;

export type AIProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "perplexity"
  | "openrouter"
  | "custom";

export type ModelContext = "chat" | "insights" | "global";

export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
  costPer1kTokens: { input: number; output: number };
  trainingDataCutoff?: string;
  capabilities?: string[];
}

export type AIApiKeys = Partial<Record<AIProvider | string, string>>;

export interface ModelSelectionConfig {
  provider: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  customProviderId?: string;
}

export type ModelSelectionMap = Record<ModelContext, ModelSelectionConfig>;

export interface CustomProviderConfig {
  name: string;
  baseUrl: string;
  headers?: Record<string, string>;
  modelFormat?: "openai-compatible" | "custom";
}

export interface AIProviderConfig {
  apiKeys: AIApiKeys;
  modelSelection: ModelSelectionMap;
  customProviders?: Record<string, CustomProviderConfig>;
  fallbackProvider: AIProvider;
}
