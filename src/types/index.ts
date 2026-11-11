export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  rating?: 'up' | 'down';
  image?: string;
  isStreaming?: boolean;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  model: string;
  pinned?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

export interface ApiKeyConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'custom';
  apiKey: string;
  endpoint?: string;
  selectedModel: string;
  isValidated?: boolean;
  validationMessage?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'custom';
  description: string;
  isPaid?: boolean;
  badge?: string;
}

export type DrawerTab = 'history' | 'profile' | 'apikeys' | 'selfedit' | 'settings';
