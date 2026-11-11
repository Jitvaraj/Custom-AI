import React, { useState } from 'react';
import { Menu, Plus, ChevronDown, Key, Smartphone, Monitor } from 'lucide-react';
import { UserProfile, ModelOption } from '../types';

interface HeaderProps {
  onOpenDrawer: (tab?: 'history' | 'profile' | 'apikeys' | 'selfedit' | 'settings') => void;
  onNewChat: () => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  userProfile: UserProfile;
  activeKeyProvider: string;
  isPhoneFrame: boolean;
  onToggleFrame: () => void;
}

export const MODELS: ModelOption[] = [
  {
    id: 'jarvis-1.0',
    name: 'Jarvis 1.0 (Gemini 2.5 Flash)',
    provider: 'gemini',
    description: 'Fast, intelligent, high throughput for everyday code & conversation.',
    badge: 'Fast & Default'
  },
  {
    id: 'jarvis-pro',
    name: 'Jarvis Pro (Gemini 2.5 Pro)',
    provider: 'gemini',
    description: 'Advanced reasoning, deep technical analysis & complex code architecture.',
    badge: 'Pro Reasoning',
    isPaid: true
  },
  {
    id: 'jarvis-thinking',
    name: 'Jarvis Thinking (Gemini 2.5 Pro Thinking)',
    provider: 'gemini',
    description: 'Maximum reasoning depth for scientific, security & root-cause analysis.',
    badge: 'Deep Thinking',
    isPaid: true
  },
  {
    id: 'openrouter-claude',
    name: 'OpenRouter (Claude 3.5 Sonnet)',
    provider: 'openrouter',
    description: 'Access Claude 3.5 Sonnet via OpenRouter API Key.',
    badge: 'OpenRouter API'
  },
  {
    id: 'openrouter-gpt4o',
    name: 'OpenRouter (GPT-4o)',
    provider: 'openrouter',
    description: 'Access OpenAI GPT-4o via OpenRouter API Key.',
    badge: 'OpenRouter API'
  },
  {
    id: 'openrouter-deepseek',
    name: 'OpenRouter (DeepSeek R1)',
    provider: 'openrouter',
    description: 'Access DeepSeek R1 via OpenRouter API Key.',
    badge: 'OpenRouter API'
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    description: 'Multimodal intelligence directly by OpenAI.',
    badge: 'Direct API'
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Anthropic Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Premier coding and markdown synthesis.',
    badge: 'Direct API'
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    description: 'Open-weights reasoning model directly by DeepSeek.',
    badge: 'Direct API'
  },
  {
    id: 'groq-llama',
    name: 'Groq (Llama 3.3 70B)',
    provider: 'groq',
    description: 'Ultra-fast inference powered by Groq LPU.',
    badge: 'Groq API'
  },
  {
    id: 'custom-model',
    name: 'Custom REST Endpoint',
    provider: 'custom',
    description: 'Connect to your custom local or remote API endpoint.',
    badge: 'Custom URL'
  }
];

export const Header: React.FC<HeaderProps> = ({
  onOpenDrawer,
  onNewChat,
  selectedModel,
  onSelectModel,
  userProfile,
  activeKeyProvider,
  isPhoneFrame,
  onToggleFrame
}) => {
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const currentModelObj = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  return (
    <header className="relative flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#070a12]/90 backdrop-blur-md flex-shrink-0 z-30">
      {/* Left: Drawer Menu Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpenDrawer('history')}
          className="w-[38px] h-[38px] rounded-[11px] bg-[#111624] border border-[#1c2438] text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-[#171e30] flex items-center justify-center transition-all cursor-pointer"
          title="Open Conversation History & Settings"
          aria-label="Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* View Mode Toggle (Phone frame vs Widescreen) */}
        <button
          onClick={onToggleFrame}
          className="hidden sm:flex w-[38px] h-[38px] rounded-[11px] bg-[#111624] border border-[#1c2438] text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-[#171e30] items-center justify-center transition-all cursor-pointer"
          title={isPhoneFrame ? 'Switch to Full Width View' : 'Switch to Phone Mockup View'}
        >
          {isPhoneFrame ? <Monitor className="w-4 h-4 text-[#467ff5]" /> : <Smartphone className="w-4 h-4 text-[#9aa5b8]" />}
        </button>
      </div>

      {/* Middle: Model Selector Pill */}
      <div className="relative">
        <button
          onClick={() => setShowModelDropdown(!showModelDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111624] border border-[#1c2438] hover:bg-[#171e30] transition-colors cursor-pointer select-none"
        >
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#528bff] to-[#356be6] flex items-center justify-center text-white shrink-0 shadow-sm shadow-blue-500/20">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"></path>
            </svg>
          </span>
          <span className="text-[13.5px] font-semibold text-[#e6ecf5] tracking-tight max-w-[140px] sm:max-w-[180px] truncate">
            {currentModelObj.name.split(' ')[0]} {currentModelObj.name.split(' ')[1] || ''}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.6)]"></span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#9aa5b8] transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Model Dropdown Menu */}
        {showModelDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowModelDropdown(false)} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-80 bg-[#0f1422] border border-[#26314d] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-[#1c2438] mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#9aa5b8] uppercase tracking-wider">Select AI Engine</span>
                <button
                  onClick={() => {
                    setShowModelDropdown(false);
                    onOpenDrawer('selfedit');
                  }}
                  className="text-[11px] text-amber-400 hover:underline font-bold"
                >
                  ⚡ Self-Edit Mode
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
                {MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setShowModelDropdown(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex flex-col gap-1 ${
                      selectedModel === model.id
                        ? 'bg-[#182136] border border-[#467ff5]/40 text-white'
                        : 'hover:bg-[#151c2e] text-[#9aa5b8] hover:text-[#e6ecf5]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-semibold text-[#e6ecf5]">{model.name}</span>
                      {model.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          model.isPaid
                            ? 'bg-purple-950/50 border-purple-500/40 text-purple-300'
                            : 'bg-blue-950/50 border-blue-500/40 text-blue-300'
                        }`}>
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#556075] line-clamp-1">{model.description}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[#1c2438] flex items-center justify-between px-2 text-xs">
                <span className="text-[#556075]">Provider: <strong className="text-[#9aa5b8] capitalize">{activeKeyProvider}</strong></span>
                <button
                  onClick={() => {
                    setShowModelDropdown(false);
                    onOpenDrawer('apikeys');
                  }}
                  className="text-[#467ff5] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Key className="w-3 h-3" />
                  API Keys
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right: User Profile / API Key / New Chat */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* User Profile Quick Pill */}
        <button
          onClick={() => onOpenDrawer('profile')}
          className="flex items-center gap-1.5 p-1 sm:px-2 py-1 rounded-full bg-[#111624] border border-[#1c2438] hover:bg-[#171e30] transition-colors cursor-pointer"
          title="User Profile"
        >
          <img
            src={userProfile.avatar}
            alt={userProfile.name}
            className="w-6 h-6 rounded-full object-cover border border-blue-500/40"
          />
          <span className="hidden md:inline text-xs font-medium text-[#9aa5b8] max-w-[90px] truncate">
            {userProfile.name.split(' ')[0]}
          </span>
        </button>

        {/* API Key Quick Button */}
        <button
          onClick={() => onOpenDrawer('apikeys')}
          className="w-[38px] h-[38px] rounded-[11px] bg-[#111624] border border-[#1c2438] text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-[#171e30] flex items-center justify-center transition-all cursor-pointer relative"
          title="Manage API Keys & Services"
        >
          <Key className="w-4 h-4 text-[#467ff5]" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#22c55e]" />
        </button>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="w-[38px] h-[38px] rounded-[11px] bg-[#111624] border border-[#1c2438] text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-[#171e30] flex items-center justify-center transition-all cursor-pointer"
          title="Start New Chat"
          aria-label="New Chat"
        >
          <Plus className="w-4 h-4 text-[#e6ecf5]" />
        </button>
      </div>
    </header>
  );
};
