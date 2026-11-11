import { ChatConversation, UserProfile, ApiKeyConfig } from '../types';

const CONVERSATIONS_KEY = 'jarvis_conversations_v1';
const ACTIVE_CHAT_KEY = 'jarvis_active_chat_v1';
const USER_PROFILE_KEY = 'jarvis_user_profile_v1';
const API_KEYS_KEY = 'jarvis_api_keys_v1';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Jarvis User',
  email: 'user@jarvis.ai',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
};

export const INITIAL_CONVERSATION: ChatConversation = {
  id: 'conv-sample-1',
  title: 'JavaScript Debounce Implementation',
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 3600000,
  model: 'jarvis-1.0',
  pinned: true,
  messages: [
    {
      id: 'm1',
      role: 'assistant',
      content: `Here's a minimal version. It delays the call until the user stops triggering it for \`wait\` ms.\n\n\`\`\`javascript\nconst debounce = (fn, wait) => {\n  let t;\n  return (...args) => {\n    clearTimeout(t);\n    t = setTimeout(\n      () => fn(...args), wait\n    );\n  };\n};\n\`\`\`\n\nUse it on inputs or resize events to avoid firing on every keystroke.`,
      timestamp: '10:42 AM'
    },
    {
      id: 'm2',
      role: 'user',
      content: 'Nice. Can you add a leading-edge option?',
      timestamp: '10:43 AM'
    },
    {
      id: 'm3',
      role: 'assistant',
      content: `Sure — pass \`{ leading: true }\` and it'll fire immediately on the first call, then ignore repeats until the wait ends.\n\n\`\`\`javascript\nconst debounce = (fn, wait, options = {}) => {\n  let t;\n  return (...args) => {\n    const callNow = options.leading && !t;\n    clearTimeout(t);\n    t = setTimeout(() => {\n      t = null;\n      if (!options.leading) fn(...args);\n    }, wait);\n    if (callNow) fn(...args);\n  };\n};\n\`\`\``,
      timestamp: '10:43 AM'
    }
  ]
};

export const DEFAULT_API_KEYS: Record<string, ApiKeyConfig> = {
  gemini: {
    provider: 'gemini',
    apiKey: '',
    selectedModel: 'gemini-3.8-flash',
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
    selectedModel: 'claude-3-5-sonnet',
    isValidated: false
  },
  deepseek: {
    provider: 'deepseek',
    apiKey: '',
    selectedModel: 'deepseek-r1',
    isValidated: false
  },
  groq: {
    provider: 'groq',
    apiKey: '',
    selectedModel: 'llama-3.3-70b',
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
    if (parsed.email && parsed.email.includes('sumitarabadjadeja')) {
      return DEFAULT_USER_PROFILE;
    }
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
