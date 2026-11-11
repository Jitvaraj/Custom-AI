import React, { useState } from 'react';
import { 
  X, MessageSquare, Plus, Search, Trash2, Pin, Edit3, Download, 
  Key, User, Settings, CheckCircle2, ShieldCheck, 
  ExternalLink, Eye, EyeOff, RefreshCw, AlertCircle, Code2, Sparkles, FileText, Check, Cpu
} from 'lucide-react';
import { ChatConversation, UserProfile, ApiKeyConfig, DrawerTab } from '../types';
import { verifyKeyClient } from '../services/ai';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: DrawerTab;
  onSelectTab: (tab: DrawerTab) => void;
  conversations: ChatConversation[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onTogglePinChat: (id: string) => void;
  onClearAllHistory: () => void;
  userProfile: UserProfile;
  onUpdateUserProfile: (updated: UserProfile) => void;
  apiKeys: Record<string, ApiKeyConfig>;
  onSaveApiKey: (config: ApiKeyConfig) => void;
  systemInstruction: string;
  onChangeSystemInstruction: (val: string) => void;
  selfEditEnabled: boolean;
  onToggleSelfEdit: (enabled: boolean) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onTogglePinChat,
  onClearAllHistory,
  userProfile,
  onUpdateUserProfile,
  apiKeys,
  onSaveApiKey,
  systemInstruction,
  onChangeSystemInstruction,
  selfEditEnabled,
  onToggleSelfEdit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // User Profile Edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState(userProfile.name);

  // Self-Edit Code Snippet Editor state
  const [activeCodeSnippet, setActiveCodeSnippet] = useState<string>('// App Custom Instruction Patch\nconsole.log("Jarvis Self-Coder Ready");');
  const [snippetMessage, setSnippetMessage] = useState<string>('');

  // API Key Form State
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'custom'>('gemini');
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKeys['gemini']?.apiKey || '');
  const [endpointInput, setEndpointInput] = useState(apiKeys['custom']?.endpoint || '');
  const [modelInput, setModelInput] = useState(apiKeys['gemini']?.selectedModel || 'gemini-3.8-flash');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{ valid: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  // Filter conversations
  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pinnedConversations = filteredConversations.filter(c => c.pinned);
  const regularConversations = filteredConversations.filter(c => !c.pinned);

  // Grouping by Date
  const now = Date.now();
  const todayConvs = regularConversations.filter(c => now - c.updatedAt < 86400000);
  const yesterdayConvs = regularConversations.filter(c => now - c.updatedAt >= 86400000 && now - c.updatedAt < 172800000);
  const olderConvs = regularConversations.filter(c => now - c.updatedAt >= 172800000);

  const handleStartRename = (conv: ChatConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameChat(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleSaveProfile = () => {
    if (profileNameInput.trim()) {
      onUpdateUserProfile({
        ...userProfile,
        name: profileNameInput.trim()
      });
    }
    setIsEditingProfile(false);
  };

  const handleProviderSelect = (provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'custom') => {
    setSelectedProvider(provider);
    const config = apiKeys[provider] || { provider, apiKey: '', selectedModel: '' };
    setKeyInput(config.apiKey || '');
    setEndpointInput(config.endpoint || '');
    setModelInput(config.selectedModel || 'gemini-3.8-flash');
    setVerifyStatus(null);
  };

  const handleTestKey = async () => {
    setIsVerifying(true);
    setVerifyStatus(null);
    try {
      const result = await verifyKeyClient(selectedProvider, keyInput, endpointInput);
      setVerifyStatus(result);
      if (result.valid) {
        onSaveApiKey({
          provider: selectedProvider,
          apiKey: keyInput,
          endpoint: endpointInput,
          selectedModel: modelInput,
          isValidated: true,
          validationMessage: result.message
        });
      }
    } catch (e: any) {
      setVerifyStatus({ valid: false, message: e.message || 'Verification failed.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveCurrentKey = () => {
    onSaveApiKey({
      provider: selectedProvider,
      apiKey: keyInput,
      endpoint: endpointInput,
      selectedModel: modelInput,
      isValidated: verifyStatus?.valid || false,
      validationMessage: verifyStatus?.message
    });
    setVerifyStatus({ valid: true, message: 'Key settings saved in local storage.' });
  };

  const exportChat = (conv: ChatConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(conv, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jarvis-chat-${conv.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide Drawer Content */}
      <div className="relative w-full max-w-md bg-[#070a12] border-r border-[#1c2438] h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200 z-10">
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1c2438] bg-[#0c101b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#528bff] to-[#356be6] flex items-center justify-center text-white shadow-md">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"></path>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#e6ecf5] leading-tight">Jarvis Control Center</h2>
              <p className="text-xs text-[#556075]">Conversations, Self-Edit & Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9aa5b8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1c2438] bg-[#0e1322] px-2 pt-2 gap-1 overflow-x-auto">
          <button
            onClick={() => onSelectTab('history')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[#182136] border-[#467ff5] text-[#e6ecf5]'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#467ff5]" />
            History ({conversations.length})
          </button>

          <button
            onClick={() => onSelectTab('selfedit')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'selfedit'
                ? 'bg-[#182136] border-amber-400 text-[#e6ecf5]'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
            Self-Coder
          </button>

          <button
            onClick={() => onSelectTab('profile')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-[#182136] border-[#467ff5] text-[#e6ecf5]'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'
            }`}
          >
            <User className="w-3.5 h-3.5 text-blue-400" />
            Profile
          </button>

          <button
            onClick={() => onSelectTab('apikeys')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'apikeys'
                ? 'bg-[#182136] border-[#467ff5] text-[#e6ecf5]'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            API Keys
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#182136] border-[#467ff5] text-[#e6ecf5]'
                : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-purple-400" />
            Config
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* TAB 1: CONVERSATION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onNewChat();
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#467ff5] hover:bg-[#5b8ff7] text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Conversation
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#556075]" />
                <input
                  type="text"
                  placeholder="Search chat history..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111624] border border-[#1c2438] rounded-xl pl-9 pr-3 py-2 text-xs text-[#e6ecf5] placeholder-[#556075] focus:outline-none focus:border-[#467ff5]"
                />
              </div>

              {pinnedConversations.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-[#9aa5b8] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Pin className="w-3 h-3 text-amber-400" /> Pinned Conversations
                  </h3>
                  <div className="space-y-1">
                    {pinnedConversations.map(conv => renderConvItem(conv))}
                  </div>
                </div>
              )}

              {todayConvs.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-[#556075] uppercase tracking-wider mb-2">Today</h3>
                  <div className="space-y-1">
                    {todayConvs.map(conv => renderConvItem(conv))}
                  </div>
                </div>
              )}

              {yesterdayConvs.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-[#556075] uppercase tracking-wider mb-2">Yesterday</h3>
                  <div className="space-y-1">
                    {yesterdayConvs.map(conv => renderConvItem(conv))}
                  </div>
                </div>
              )}

              {olderConvs.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold text-[#556075] uppercase tracking-wider mb-2">Older History</h3>
                  <div className="space-y-1">
                    {olderConvs.map(conv => renderConvItem(conv))}
                  </div>
                </div>
              )}

              {filteredConversations.length === 0 && (
                <div className="text-center py-8 text-[#556075] text-xs">
                  No conversations match "{searchQuery}".
                </div>
              )}

              {conversations.length > 0 && (
                <div className="pt-4 border-t border-[#1c2438]">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all conversation history? This action cannot be undone.')) {
                        onClearAllHistory();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-950/40 border border-red-900/40 text-red-400 hover:bg-red-900/40 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Chat History
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SELF-EDIT STUDIO MODE */}
          {activeTab === 'selfedit' && (
            <div className="space-y-4">
              {/* Permission Banner */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-400" />
                    Self-Edit Mode
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selfEditEnabled}
                      onChange={e => onToggleSelfEdit(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#1c2438] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  When enabled, Jarvis generates executable code patches and refactoring instructions during chat conversations.
                </p>
              </div>

              {/* Code Patch Snippet Inspector */}
              <div className="bg-[#0f1422] border border-[#1c2438] rounded-2xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#e6ecf5] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Live Code Patch Inspector
                  </span>
                  <button
                    onClick={() => {
                      onChangeSystemInstruction(systemInstruction + '\n\n' + activeCodeSnippet);
                      setSnippetMessage('Patch merged into System Instruction!');
                      setTimeout(() => setSnippetMessage(''), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#467ff5] hover:bg-[#5b8ff7] text-white font-semibold cursor-pointer text-xs flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Apply Patch
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={activeCodeSnippet}
                  onChange={e => setActiveCodeSnippet(e.target.value)}
                  className="w-full bg-[#070a12] border border-[#1c2438] rounded-xl p-3 text-xs text-green-300 font-mono focus:outline-none focus:border-[#467ff5] leading-relaxed resize-none overflow-x-auto"
                />

                {snippetMessage && (
                  <p className="text-xs text-amber-300 font-medium">{snippetMessage}</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: USER PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="bg-[#111624] border border-[#1c2438] rounded-2xl p-5 text-center space-y-3">
                <div className="relative inline-block">
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#467ff5] mx-auto shadow-lg shadow-blue-500/20"
                  />
                  <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-[#111624]" />
                </div>

                {isEditingProfile ? (
                  <div className="flex gap-2 max-w-xs mx-auto pt-1">
                    <input
                      type="text"
                      value={profileNameInput}
                      onChange={e => setProfileNameInput(e.target.value)}
                      className="bg-[#070a12] border border-[#467ff5] text-xs text-white rounded-lg px-3 py-1.5 w-full focus:outline-none"
                    />
                    <button
                      onClick={handleSaveProfile}
                      className="px-3 py-1.5 rounded-lg bg-[#467ff5] text-white text-xs font-semibold cursor-pointer shrink-0"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-1.5">
                      <h3 className="text-base font-bold text-[#e6ecf5]">{userProfile.name}</h3>
                      <button
                        onClick={() => {
                          setProfileNameInput(userProfile.name);
                          setIsEditingProfile(true);
                        }}
                        className="text-[#556075] hover:text-[#e6ecf5] cursor-pointer"
                        title="Edit name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-[#9aa5b8] mt-0.5">{userProfile.email}</p>
                  </div>
                )}
              </div>

              {/* Active User Statistics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#0f1422] border border-[#1c2438] rounded-xl p-3 text-center space-y-1">
                  <span className="text-[10px] text-[#556075] uppercase font-bold tracking-wider">Total Chats</span>
                  <p className="text-lg font-bold text-[#e6ecf5]">{conversations.length}</p>
                </div>

                <div className="bg-[#0f1422] border border-[#1c2438] rounded-xl p-3 text-center space-y-1">
                  <span className="text-[10px] text-[#556075] uppercase font-bold tracking-wider">Total Messages</span>
                  <p className="text-lg font-bold text-[#e6ecf5]">
                    {conversations.reduce((acc, c) => acc + c.messages.length, 0)}
                  </p>
                </div>
              </div>

              {/* Local Storage & Data Privacy */}
              <div className="bg-[#0f1422] border border-[#1c2438] rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#9aa5b8]">
                  <span className="font-semibold flex items-center gap-1.5 text-[#e6ecf5]">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    User Privacy & Data Security
                  </span>
                </div>
                <p className="text-[#556075]">
                  Conversations and customized API keys belong exclusively to your user profile and are stored safely in browser LocalStorage.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: API KEY SECTION */}
          {activeTab === 'apikeys' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#111624] border border-[#1c2438] rounded-xl space-y-1 text-xs">
                <span className="font-bold text-[#e6ecf5] flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  Custom API Engine Configuration
                </span>
                <p className="text-[#9aa5b8]">
                  Jarvis works with default Google AI Studio Gemini API keys OR custom keys from OpenAI, Anthropic, DeepSeek, Groq & custom REST endpoints stored safely in localStorage.
                </p>
              </div>

              {/* Provider Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'gemini', label: 'Google Gemini' },
                  { id: 'openai', label: 'OpenAI' },
                  { id: 'anthropic', label: 'Anthropic' },
                  { id: 'deepseek', label: 'DeepSeek' },
                  { id: 'groq', label: 'Groq API' },
                  { id: 'custom', label: 'Custom REST' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleProviderSelect(p.id as any)}
                    className={`py-2 px-1 rounded-lg text-xs font-medium transition-all border cursor-pointer text-center ${
                      selectedProvider === p.id
                        ? 'bg-[#182136] border-[#467ff5] text-white font-bold'
                        : 'bg-[#0e1322] border-[#1c2438] text-[#9aa5b8] hover:text-[#e6ecf5]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Key Form */}
              <div className="space-y-3 bg-[#0f1422] p-4 rounded-2xl border border-[#1c2438]">
                <div>
                  <label className="text-xs font-semibold text-[#9aa5b8] block mb-1">
                    {selectedProvider === 'gemini' ? 'Gemini API Key' : 'API Key'}
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder={selectedProvider === 'gemini' ? 'Enter Gemini API Key...' : 'sk-...'}
                      value={keyInput}
                      onChange={e => setKeyInput(e.target.value)}
                      className="w-full bg-[#111624] border border-[#1c2438] rounded-xl px-3 py-2 text-xs text-[#e6ecf5] pr-9 focus:outline-none focus:border-[#467ff5]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#556075] hover:text-[#e6ecf5] cursor-pointer"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {selectedProvider === 'custom' && (
                  <div>
                    <label className="text-xs font-semibold text-[#9aa5b8] block mb-1">
                      Custom Endpoint URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://api.openai.com/v1/chat/completions"
                      value={endpointInput}
                      onChange={e => setEndpointInput(e.target.value)}
                      className="w-full bg-[#111624] border border-[#1c2438] rounded-xl px-3 py-2 text-xs text-[#e6ecf5] focus:outline-none focus:border-[#467ff5]"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-[#9aa5b8] block mb-1">
                    Model Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="gemini-3.8-flash, gpt-4o, deepseek-r1..."
                    value={modelInput}
                    onChange={e => setModelInput(e.target.value)}
                    className="w-full bg-[#111624] border border-[#1c2438] rounded-xl px-3 py-2 text-xs text-[#e6ecf5] focus:outline-none focus:border-[#467ff5]"
                  />
                </div>

                {/* Validation Status */}
                {verifyStatus && (
                  <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    verifyStatus.valid ? 'bg-green-950/40 border-green-800/40 text-green-300' : 'bg-red-950/40 border-red-800/40 text-red-300'
                  }`}>
                    {verifyStatus.valid ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{verifyStatus.message}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleTestKey}
                    disabled={isVerifying}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#111624] border border-[#1c2438] text-xs font-semibold text-[#e6ecf5] hover:bg-[#171e30] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                    Test & Verify
                  </button>
                  <button
                    onClick={handleSaveCurrentKey}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#467ff5] hover:bg-[#5b8ff7] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Config
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-[#556075] space-y-1">
                <p>Need a free Google Gemini API Key?</p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#467ff5] hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  Get API Key from Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM CONFIG */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#e6ecf5] block mb-1">
                  Jarvis System Instructions
                </label>
                <p className="text-[11px] text-[#556075] mb-2">
                  Customize the AI persona, rules, code style guidelines, and tone.
                </p>
                <textarea
                  rows={5}
                  value={systemInstruction}
                  onChange={e => onChangeSystemInstruction(e.target.value)}
                  className="w-full bg-[#111624] border border-[#1c2438] rounded-xl p-3 text-xs text-[#e6ecf5] focus:outline-none focus:border-[#467ff5] font-mono leading-relaxed resize-none"
                />
              </div>

              <div className="p-3 bg-[#0f1422] border border-[#1c2438] rounded-xl text-xs space-y-2">
                <span className="font-semibold text-[#e6ecf5]">App Version</span>
                <p className="text-[#556075]">Jarvis AI Core v2.5 • Pure Client-Side SPA</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );

  function renderConvItem(conv: ChatConversation) {
    const isActive = conv.id === activeChatId;
    const isEditing = editingId === conv.id;

    return (
      <div
        key={conv.id}
        onClick={() => {
          onSelectChat(conv.id);
          onClose();
        }}
        className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
          isActive
            ? 'bg-[#182136] border-[#467ff5]/60 text-white shadow-md'
            : 'bg-[#0e1322] border-[#1c2438] hover:bg-[#151c2e] text-[#9aa5b8] hover:text-[#e6ecf5]'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
          <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#467ff5]' : 'text-[#556075]'}`} />
          
          {isEditing ? (
            <input
              type="text"
              value={editingTitle}
              onChange={e => setEditingTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveRename(conv.id)}
              onBlur={() => handleSaveRename(conv.id)}
              autoFocus
              onClick={e => e.stopPropagation()}
              className="bg-[#070a12] border border-[#467ff5] text-xs text-white rounded px-2 py-0.5 w-full focus:outline-none"
            />
          ) : (
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold truncate block">{conv.title}</span>
              <span className="text-[10px] text-[#556075]">{conv.messages.length} messages</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => {
              e.stopPropagation();
              onTogglePinChat(conv.id);
            }}
            className="p-1 text-[#556075] hover:text-amber-400 cursor-pointer"
            title={conv.pinned ? 'Unpin' : 'Pin'}
          >
            <Pin className={`w-3.5 h-3.5 ${conv.pinned ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={e => handleStartRename(conv, e)}
            className="p-1 text-[#556075] hover:text-white cursor-pointer"
            title="Rename"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={e => exportChat(conv, e)}
            className="p-1 text-[#556075] hover:text-blue-400 cursor-pointer"
            title="Export Chat JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={e => {
              e.stopPropagation();
              if (confirm('Delete this conversation?')) {
                onDeleteChat(conv.id);
              }
            }}
            className="p-1 text-[#556075] hover:text-red-400 cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
};
