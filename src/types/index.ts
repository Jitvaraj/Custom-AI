export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  rating?: 'up' | 'down' | undefined;
  image?: string | undefined;
  isStreaming?: boolean | undefined;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  model: string;
  pinned?: boolean | undefined;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

export type ApiProvider = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'openrouter' | 'custom';

export interface ApiKeyConfig {
  provider: ApiProvider;
  apiKey: string;
  endpoint?: string | undefined;
  selectedModel: string;
  isValidated?: boolean | undefined;
  validationMessage?: string | undefined;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: ApiProvider;
  description: string;
  isPaid?: boolean | undefined;
  badge?: string | undefined;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  manifest: any;
}

export interface PluginSettings {
  githubToken: string;
  githubEnabled: boolean;
  searchEnabled: boolean;
  loadedPlugins: Plugin[];
}

export type DrawerTab = 'history' | 'profile' | 'apikeys' | 'selfedit' | 'settings' | 'files' | 'plugins' | 'terminal';
