import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, MessageSquare, Plus, Search, Trash2, Pin, Edit3, Download, 
  Key, User, Settings, CheckCircle2, ShieldCheck, 
  ExternalLink, Eye, EyeOff, RefreshCw, AlertCircle, Code2, Sparkles, FileText, Check, Cpu, Files, Plug, Upload
} from 'lucide-react';
import { ChatConversation, UserProfile, ApiKeyConfig, DrawerTab, ApiProvider, PluginSettings, Plugin } from '../types';
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
  pluginSettings: PluginSettings;
  onUpdatePluginSettings: (settings: PluginSettings) => void;
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
  pluginSettings,
  onUpdatePluginSettings,
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
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('gemini');
  const [showKey, setShowKey] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKeys['gemini']?.apiKey || '');
  const [endpointInput, setEndpointInput] = useState(apiKeys['custom']?.endpoint || '');
  const [modelInput, setModelInput] = useState(apiKeys['gemini']?.selectedModel || 'gemini-2.5-flash');
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

  const handleProviderSelect = (provider: ApiProvider) => {
    setSelectedProvider(provider);
    const config = apiKeys[provider] || { provider, apiKey: '', selectedModel: '' };
    setKeyInput(config.apiKey || '');
    setEndpointInput(config.endpoint || '');
    
    let defaultModel = config.selectedModel;
    if (!defaultModel) {
      if (provider === 'gemini') defaultModel = 'gemini-2.5-flash';
      else if (provider === 'openrouter') defaultModel = 'anthropic/claude-3.5-sonnet';
      else if (provider === 'openai') defaultModel = 'gpt-4o';
      else if (provider === 'anthropic') defaultModel = 'claude-3-5-sonnet-20241022';
      else if (provider === 'deepseek') defaultModel = 'deepseek-chat';
      else if (provider === 'groq') defaultModel = 'llama-3.3-70b-versatile';
      else defaultModel = 'custom-model';
    }
    setModelInput(defaultModel);
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

  const handleImportPlugin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const newPlugin: Plugin = {
          id: json.id || Date.now().toString(),
          name: json.name || 'Unnamed Plugin',
          description: json.description || '',
          version: json.version || '1.0.0',
          manifest: json.manifest || {},
        };
        onUpdatePluginSettings({...pluginSettings, loadedPlugins: [...pluginSettings.loadedPlugins, newPlugin]});
      } catch (err) {
        console.error('Invalid plugin JSON:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

  const renderConvItem = (conv: ChatConversation) => {
    const isActive = conv.id === activeChatId;
    const isEditing = editingId === conv.id;
    return (
      <div key={conv.id} onClick={() => { onSelectChat(conv.id); onClose(); }} className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${isActive ? 'bg-[#182136] border-[#467ff5]/60 text-white shadow-md' : 'bg-[#0e1322] border-[#1c2438] hover:bg-[#151c2e] text-[#9aa5b8] hover:text-[#e6ecf5]'}`}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
          <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#467ff5]' : 'text-[#556075]'}`} />
          
          {isEditing ? (
            <input type="text" value={editingTitle} onChange={e => setEditingTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveRename(conv.id)} onBlur={() => handleSaveRename(conv.id)} autoFocus onClick={e => e.stopPropagation()} className="bg-[#070a12] border border-[#467ff5] text-xs text-white rounded px-2 py-0.5 w-full focus:outline-none" />
          ) : (
            <div className="flex-1 min-w-0"><span className="text-xs font-semibold truncate block">{conv.title}</span><span className="text-[10px] text-[#556075]">{conv.messages.length} messages</span></div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onTogglePinChat(conv.id); }} className="p-1 text-[#556075] hover:text-amber-400 cursor-pointer" title={conv.pinned ? 'Unpin' : 'Pin'}><Pin className={`w-3.5 h-3.5 ${conv.pinned ? 'text-amber-400 fill-amber-400' : ''}`} /></button>
          <button onClick={e => handleStartRename(conv, e)} className="p-1 text-[#556075] hover:text-white cursor-pointer" title="Rename"><Edit3 className="w-3.5 h-3.5" /></button>
          <button onClick={e => exportChat(conv, e)} className="p-1 text-[#556075] hover:text-blue-400 cursor-pointer" title="Export Chat JSON"><Download className="w-3.5 h-3.5" /></button>
          <button onClick={e => { e.stopPropagation(); if (confirm('Delete this conversation?')) { onDeleteChat(conv.id); } }} className="p-1 text-[#556075] hover:text-red-400 cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <motion.div
        initial={{ x: -400 }}
        animate={{ x: 0 }}
        exit={{ x: -400 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md bg-[#070a12] border-r border-[#1c2438] h-full flex flex-col shadow-2xl z-10"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#1c2438] bg-[#0c101b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#528bff] to-[#356be6] flex items-center justify-center text-white shadow-md">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"></path></svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[#e6ecf5] leading-tight">Jarvis Control Center</h2>
              <p className="text-xs text-[#556075]">Conversations, Plugins & Settings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-[#9aa5b8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-[#1c2438] bg-[#0e1322] px-2 pt-2 gap-1 overflow-x-auto">
          <button onClick={() => onSelectTab('history')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'history' ? 'bg-[#182136] border-[#467ff5] text-[#e6ecf5]' : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'}`}><MessageSquare className="w-3.5 h-3.5 text-[#467ff5]" /> History</button>
          <button onClick={() => onSelectTab('selfedit')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'selfedit' ? 'bg-[#182136] border-amber-400 text-[#e6ecf5]' : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'}`}><Code2 className="w-3.5 h-3.5 text-amber-400" /> Self-Coder</button>
          <button onClick={() => onSelectTab('apikeys')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'apikeys' ? 'bg-[#182136] border-[#467ff5] text-[#e6ecf5]' : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'}`}><Key className="w-3.5 h-3.5 text-emerald-400" /> API Keys</button>
          <button onClick={() => onSelectTab('files')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'files' ? 'bg-[#182136] border-[#467ff5] text-[#e6ecf5]' : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'}`}><Files className="w-3.5 h-3.5 text-pink-400" /> Files</button>
          <button onClick={() => onSelectTab('plugins')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'plugins' ? 'bg-[#182136] border-[#467ff5] text-[#e6ecf5]' : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'}`}><Plug className="w-3.5 h-3.5 text-yellow-400" /> Plugins</button>
          <button onClick={() => onSelectTab('settings')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'settings' ? 'bg-[#182136] border-[#467ff5] text-[#e6ecf5]' : 'border-transparent text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5'}`}><Settings className="w-3.5 h-3.5 text-purple-400" /> Config</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {activeTab === 'history' && (
            <div className="space-y-4">
              <button onClick={() => { onNewChat(); onClose(); }} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#467ff5] hover:bg-[#5b8ff7] text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"><Plus className="w-4 h-4" /> New Conversation</button>
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#556075]" /><input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#111624] border border-[#1c2438] rounded-xl pl-9 pr-3 py-2 text-xs text-[#e6ecf5]" /></div>
              {pinnedConversations.length > 0 && <div><h3 className="text-[11px] font-bold text-[#9aa5b8] uppercase tracking-wider mb-2">Pinned</h3><div className="space-y-1">{pinnedConversations.map(conv => renderConvItem(conv))}</div></div>}
              {todayConvs.length > 0 && <div><h3 className="text-[11px] font-bold text-[#556075] uppercase tracking-wider mb-2">Today</h3><div className="space-y-1">{todayConvs.map(conv => renderConvItem(conv))}</div></div>}
              {yesterdayConvs.length > 0 && <div><h3 className="text-[11px] font-bold text-[#556075] uppercase tracking-wider mb-2">Yesterday</h3><div className="space-y-1">{yesterdayConvs.map(conv => renderConvItem(conv))}</div></div>}
              {olderConvs.length > 0 && <div><h3 className="text-[11px] font-bold text-[#556075] uppercase tracking-wider mb-2">Older</h3><div className="space-y-1">{olderConvs.map(conv => renderConvItem(conv))}</div></div>}
            </div>
          )}

          {activeTab === 'selfedit' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5"><Cpu className="w-4 h-4 text-amber-400" /> Self-Edit Mode</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={selfEditEnabled} onChange={e => onToggleSelfEdit(e.target.checked)} className="sr-only peer"/>
                    <div className="w-9 h-5 bg-[#1c2438] rounded-full peer peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>
              </div>
              <div className="bg-[#0f1422] border border-[#1c2438] rounded-2xl p-3 space-y-3">
                <textarea rows={8} value={activeCodeSnippet} onChange={e => setActiveCodeSnippet(e.target.value)} className="w-full bg-[#070a12] border border-[#1c2438] rounded-xl p-3 text-xs text-green-300 font-mono focus:outline-none" />
                <button onClick={() => { onChangeSystemInstruction(systemInstruction + '\n\n' + activeCodeSnippet); setSnippetMessage('Patch merged!'); setTimeout(() => setSnippetMessage(''), 2000); }} className="px-2.5 py-1 rounded-lg bg-[#467ff5] text-white text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Apply Patch</button>
                {snippetMessage && <p className="text-xs text-amber-300">{snippetMessage}</p>}
              </div>
            </div>
          )}

          {activeTab === 'apikeys' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#111624] border border-[#1c2438] rounded-xl space-y-1 text-xs">
                <span className="font-bold text-[#e6ecf5] flex items-center gap-1.5"><Key className="w-4 h-4 text-amber-400" /> API Configuration</span>
              </div>
              {/* Provider Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {['gemini', 'openrouter', 'openai', 'anthropic', 'deepseek', 'groq', 'custom'].map(p => (
                  <button key={p} onClick={() => handleProviderSelect(p as ApiProvider)} className={`py-2 px-1 rounded-lg text-xs font-medium transition-all border cursor-pointer text-center ${selectedProvider === p ? 'bg-[#182136] border-[#467ff5] text-white font-bold' : 'bg-[#0e1322] border-[#1c2438] text-[#9aa5b8]'}`}>{p}</button>
                ))}
              </div>
              <div className="space-y-3 bg-[#0f1422] p-4 rounded-2xl border border-[#1c2438]">
                  <input type={showKey ? 'text' : 'password'} placeholder="API Key..." value={keyInput} onChange={e => setKeyInput(e.target.value)} className="w-full bg-[#111624] border border-[#1c2438] rounded-xl px-3 py-2 text-xs text-[#e6ecf5]" />
                  <button onClick={handleTestKey} className="w-full py-2 rounded-xl bg-[#467ff5] text-white text-xs font-semibold">Save & Test</button>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="text-xs text-[#9aa5b8]">Manage files attached across conversations.</div>
              {conversations.flatMap(c => c.messages.filter(m => m.image)).map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-[#0e1322] border border-[#1c2438] rounded-lg">
                  <img src={m.image} alt="Attachment" className="w-10 h-10 object-cover rounded" />
                  <span className="text-xs text-[#e6ecf5]">Attachment from {m.timestamp}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'plugins' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#111624] border border-[#1c2438] rounded-xl text-xs text-[#9aa5b8] flex justify-between items-center">
                <p>Manage and connect external integrations and plugins.</p>
                <label className="cursor-pointer bg-[#467ff5] text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-[#5b8ff7] transition-colors">
                   <Upload className="w-3 h-3" /> Import Plugin
                   <input type="file" accept=".json" className="hidden" onChange={handleImportPlugin} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="text-[11px] text-[#556075] font-bold uppercase tracking-wider">Loaded Plugins</div>
                {pluginSettings.loadedPlugins.map(p => (
                   <div key={p.id} className="flex items-center justify-between p-3 bg-[#0e1322] border border-[#1c2438] rounded-lg">
                    <span className="text-xs text-[#e6ecf5] font-semibold">{p.name}</span>
                    <span className="text-[10px] text-[#556075]">v{p.version}</span>
                   </div>
                ))}
                <div className="text-[11px] text-[#556075] font-bold uppercase tracking-wider pt-2">Integrations</div>
                <div className="bg-[#0e1322] border border-[#1c2438] rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔍</span>
                    <span className="text-xs text-[#e6ecf5] font-semibold">Internet Search (Grounding)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={pluginSettings.searchEnabled} onChange={e => onUpdatePluginSettings({...pluginSettings, searchEnabled: e.target.checked})} className="sr-only peer"/>
                    <div className="w-9 h-5 bg-[#1c2438] rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>
                {[
                  { id: 'github', name: 'GitHub Integration', status: 'Connect', icon: '💻' },
                  { id: 'slack', name: 'Slack Notifications', status: 'Connect', icon: '💬' },
                  { id: 'notion', name: 'Notion Sync', status: 'Connect', icon: '📝' },
                ].map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-[#0e1322] border border-[#1c2438] rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{p.icon}</span>
                      <span className="text-xs text-[#e6ecf5] font-semibold">{p.name}</span>
                    </div>
                    <button className="text-[10px] px-2 py-1 rounded bg-[#1c2438] text-[#467ff5] hover:bg-[#26314d] transition-colors">
                      {p.status}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && <div className="space-y-4"><textarea rows={5} value={systemInstruction} onChange={e => onChangeSystemInstruction(e.target.value)} className="w-full bg-[#111624] border border-[#1c2438] rounded-xl p-3 text-xs text-[#e6ecf5] font-mono leading-relaxed" /></div>}
        </div>
      </motion.div>
    </div>
  );
};
