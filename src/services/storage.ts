import { ChatConversation, UserProfile, ApiKeyConfig, PluginSettings } from '@/types';

const PLUGIN_SETTINGS_KEY = 'jarvis_plugin_settings_v1';
const CONVERSATIONS_KEY = 'jarvis_conversations_v1';
const ACTIVE_CHAT_KEY = 'jarvis_active_chat_v1';
const USER_PROFILE_KEY = 'jarvis_user_profile_v1';
const API_KEYS_KEY = 'jarvis_api_keys_v1';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Jarvis User',
  email: 'user@jarvis.ai',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
};

export const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
  githubToken: '',
  githubEnabled: false,
  searchEnabled: true,
  loadedPlugins: [],
};

export const INITIAL_CONVERSATION: ChatConversation = {
  id: 'conv-sample-1',
  title: 'JavaScript Debounce Implementation',
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 3600000,
  model: 'jarvis-1.0',
  pinned: true,
  messages: []
};

export const DEFAULT_API_KEYS: Record<string, ApiKeyConfig> = {
  gemini: {
    provider: 'gemini',
    apiKey: '',
    selectedModel: 'gemini-2.5-flash',
    isValidated: true,
    validationMessage: 'Using System Google AI Studio GEMINI_API_KEY'
  },
  openai: {
    provider: 'openai',
    apiKey: '',
    selectedModel: 'gpt-4o',
    isValidated: false
  },
  anthropic: {
    provider: 'anthropic',
    apiKey: '',
    selectedModel: 'claude-3-5-sonnet-20241022',
    isValidated: false
  },
  deepseek: {
    provider: 'deepseek',
    apiKey: '',
    selectedModel: 'deepseek-chat',
    isValidated: false
  },
  groq: {
    provider: 'groq',
    apiKey: '',
    selectedModel: 'llama-3.3-70b-versatile',
    isValidated: false
  },
  openrouter: {
    provider: 'openrouter',
    apiKey: '',
    selectedModel: 'anthropic/claude-3.5-sonnet',
    isValidated: false
  },
  custom: {
    provider: 'custom',
    apiKey: '',
    endpoint: '',
    selectedModel: 'custom-model',
    isValidated: false
  }
};

export function loadConversations(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [INITIAL_CONVERSATION];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_CONVERSATION];
  } catch (e) {
    return [INITIAL_CONVERSATION];
  }
}

export function saveConversations(conversations: ChatConversation[]): void {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (e) {}
}

export function loadActiveChatId(): string {
  try {
    return localStorage.getItem(ACTIVE_CHAT_KEY) || INITIAL_CONVERSATION.id;
  } catch (e) {
    return INITIAL_CONVERSATION.id;
  }
}

export function saveActiveChatId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_CHAT_KEY, id);
  } catch (e) {}
}

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return DEFAULT_USER_PROFILE;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    return DEFAULT_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {}
}

export function loadApiKeys(): Record<string, ApiKeyConfig> {
  try {
    const raw = localStorage.getItem(API_KEYS_KEY);
    if (!raw) return DEFAULT_API_KEYS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_API_KEYS, ...parsed };
  } catch (e) {
    return DEFAULT_API_KEYS;
  }
}

export function saveApiKeys(configs: Record<string, ApiKeyConfig>): void {
  try {
    localStorage.setItem(API_KEYS_KEY, JSON.stringify(configs));
  } catch (e) {}
}

export function loadPluginSettings(): PluginSettings {
  try {
    const raw = localStorage.getItem(PLUGIN_SETTINGS_KEY);
    if (!raw) return DEFAULT_PLUGIN_SETTINGS;
    return { ...DEFAULT_PLUGIN_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_PLUGIN_SETTINGS;
  }
}

export function savePluginSettings(settings: PluginSettings): void {
  try {
    localStorage.setItem(PLUGIN_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}
}
