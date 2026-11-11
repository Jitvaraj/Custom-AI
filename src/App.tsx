import React, { useEffect, useState } from 'react';
import { Header, MODELS } from './components/Header';
import { SidebarDrawer } from './components/SidebarDrawer';
import { ChatContainer } from './components/ChatContainer';
import { BottomDock } from './components/BottomDock';

import { ChatConversation, UserProfile, ApiKeyConfig, DrawerTab, Message, ApiProvider, PluginSettings } from './types';
import { 
  loadConversations, saveConversations, 
  loadActiveChatId, saveActiveChatId,
  loadUserProfile, saveUserProfile,
  loadApiKeys, saveApiKeys,
  loadPluginSettings, savePluginSettings
} from './services/storage';
import { sendChatClient } from './services/ai';

export default function App() {
  // State Initialization
  const [conversations, setConversations] = useState<ChatConversation[]>(loadConversations);
  const [activeChatId, setActiveChatId] = useState<string>(loadActiveChatId);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyConfig>>(loadApiKeys);
  const [pluginSettings, setPluginSettings] = useState<PluginSettings>(loadPluginSettings);
  const [selectedModel, setSelectedModel] = useState<string>('jarvis-1.0');
  const [selfEditEnabled, setSelfEditEnabled] = useState<boolean>(true);

  const [systemInstruction, setSystemInstruction] = useState<string>(
    'You are Jarvis, an advanced, intelligent, futuristic AI assistant created to help the user with code, analysis, creative problem solving, and complex tasks. Be concise, precise, friendly, and structured. When outputting code, always specify the language name.'
  );

  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('history');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Sync state to LocalStorage
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveActiveChatId(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    saveUserProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    saveApiKeys(apiKeys);
  }, [apiKeys]);

  useEffect(() => {
    savePluginSettings(pluginSettings);
  }, [pluginSettings]);

  // Current active conversation
  const currentChat = conversations.find(c => c.id === activeChatId) || conversations[0] || {
    id: 'conv-' + Date.now(),
    title: 'New Conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model: selectedModel,
    messages: []
  };

  // Dynamically resolve provider for selected model
  const currentModelObj = MODELS.find(m => m.id === selectedModel);
  const currentProvider: ApiProvider = currentModelObj?.provider || 'gemini';
  const currentKeyConfig = apiKeys[currentProvider];
  const hasCustomKey = Boolean(currentKeyConfig?.apiKey?.trim());
  
  const activeProvider = `${currentProvider.toUpperCase()} ${
    hasCustomKey ? '(Custom Key)' : (currentProvider === 'gemini' ? '(System Key)' : '(Key Required)')
  }`;

  const handleOpenDrawer = (tab: DrawerTab = 'history') => {
    setDrawerTab(tab);
    setIsDrawerOpen(true);
  };

  const handleNewChat = () => {
    const newConv: ChatConversation = {
      id: 'conv-' + Date.now(),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      messages: []
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveChatId(newConv.id);
  };

  const handleDeleteChat = (id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (updated.length === 0) {
        const fresh: ChatConversation = {
          id: 'conv-' + Date.now(),
          title: 'New Conversation',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model: selectedModel,
          messages: []
        };
        setActiveChatId(fresh.id);
        return [fresh];
      }
      if (activeChatId === id) {
        setActiveChatId(updated[0].id);
      }
      return updated;
    });
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c));
  };

  const handleTogglePinChat = (id: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  };

  const handleClearAllHistory = () => {
    const fresh: ChatConversation = {
      id: 'conv-' + Date.now(),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: selectedModel,
      messages: []
    };
    setConversations([fresh]);
    setActiveChatId(fresh.id);
  };

  const handleSaveApiKey = (config: ApiKeyConfig) => {
    setApiKeys(prev => ({ ...prev, [config.provider]: config }));
  };

  const handleUpdatePluginSettings = (settings: PluginSettings) => {
    setPluginSettings(settings);
  };

  const handleRating = (msgId: string, rating: 'up' | 'down') => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeChatId) return conv;
      return {
        ...conv,
        messages: conv.messages.map(m => m.id === msgId ? { ...m, rating: m.rating === rating ? undefined : rating } : m)
      };
    }));
  };

  const handleSendMessage = async (userText: string, imageBase64?: string) => {
    if (!userText.trim() && !imageBase64) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: userText,
      image: imageBase64,
      timestamp: timeStr
    };

    // Auto-update conversation title on first user message if title is default
    let updatedTitle = currentChat.title;
    if (currentChat.messages.length === 0 || currentChat.title === 'New Conversation') {
      updatedTitle = userText.length > 32 ? userText.slice(0, 32) + '...' : userText;
    }

    const updatedMessages = [...currentChat.messages, userMsg];

    // Optimistically update conversation
    setConversations(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          title: updatedTitle,
          updatedAt: Date.now(),
          messages: updatedMessages
        };
      }
      return c;
    }));

    setIsGenerating(true);

    try {
      // Dynamic Provider lookup
      const activeKeyConfig = apiKeys[currentProvider] || {
        provider: currentProvider,
        apiKey: '',
        selectedModel: selectedModel
      };

      const responseText = await sendChatClient({
        messages: updatedMessages,
        model: selectedModel,
        systemInstruction: systemInstruction + (selfEditEnabled ? '\n\n[SELF-EDIT MODE ACTIVE]: Generate clean code patches and step-by-step refactoring rules when requested.' : ''),
        apiKeyConfig: activeKeyConfig,
        provider: currentProvider,
        pluginSettings: pluginSettings 
      });

      const aiMsg: Message = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant',
        content: responseText || 'I received your message.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            updatedAt: Date.now(),
            messages: [...updatedMessages, aiMsg]
          };
        }
        return c;
      }));

    } catch (err: any) {
      console.error('Chat error:', err);
      const isRateLimit = err.message?.includes('429') || err.message?.includes('Quota') || err.message?.includes('RESOURCE_EXHAUSTED');
      
      const errorText = isRateLimit
        ? `⚠️ **Free Tier Rate Limit Reached (429)**\n\nThe free tier request limit was temporarily reached for this model.\n\n**Solutions:**\n- Wait 15-30 seconds and click **Regenerate**.\n- Switch model engine to **Jarvis 1.0 (Gemini 2.5 Flash)** in the top bar.\n- Add your OpenRouter or Gemini API key in **Control Center > API Keys** for unlimited high-speed quota.`
        : `⚠️ **Jarvis Error (${currentProvider.toUpperCase()})**: ${err.message || 'Could not connect to AI service.'}\n\nPlease check your key in **Control Center > API Keys** tab.`;

      const errorMsg: Message = {
        id: 'msg-err-' + Date.now(),
        role: 'assistant',
        content: errorText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => prev.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            updatedAt: Date.now(),
            messages: [...updatedMessages, errorMsg]
          };
        }
        return c;
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (currentChat.messages.length === 0 || isGenerating) return;
    const lastUserIdx = [...currentChat.messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;

    const actualIdx = currentChat.messages.length - 1 - lastUserIdx;
    const userMsg = currentChat.messages[actualIdx];

    // Trim messages up to last user message
    const trimmed = currentChat.messages.slice(0, actualIdx + 1);

    setConversations(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: trimmed } : c));
    handleSendMessage(userMsg.content, userMsg.image);
  };

  return (
    <div className="bg-[#04060a] text-[#e6ecf5] font-sans min-h-screen flex items-center justify-center antialiased">
      
      {/* Outer Phone Frame or Fullscreen Canvas Container */}
      <div 
        className={`w-full flex flex-col overflow-hidden relative shadow-2xl transition-all duration-300 ${
          isPhoneFrame
            ? 'max-w-[479px] h-[820px] max-h-screen border border-[#1c2438] bg-gradient-to-b from-[#0d1324] via-[#070a12] to-[#070a12] sm:rounded-3xl'
            : 'max-w-7xl h-screen border-x border-[#1c2438] bg-[#070a12]'
        }`}
      >
        {/* Top Header */}
        <Header
          onOpenDrawer={handleOpenDrawer}
          onNewChat={handleNewChat}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          userProfile={userProfile}
          activeKeyProvider={activeProvider}
          isPhoneFrame={isPhoneFrame}
          onToggleFrame={() => setIsPhoneFrame(!isPhoneFrame)}
        />

        {/* Conversation Chat Stream */}
        <ChatContainer
          messages={currentChat.messages}
          onRegenerate={handleRegenerate}
          onRating={handleRating}
          onChipClick={(promptText) => handleSendMessage(promptText)}
          isGenerating={isGenerating}
        />

        {/* Bottom Input Dock */}
        <BottomDock
          onSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          onChipClick={(promptText) => handleSendMessage(promptText)}
        />

        {/* Sidebar Drawer */}
        <SidebarDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          activeTab={drawerTab}
          onSelectTab={setDrawerTab}
          conversations={conversations}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onTogglePinChat={handleTogglePinChat}
          onClearAllHistory={handleClearAllHistory}
          userProfile={userProfile}
          onUpdateUserProfile={setUserProfile}
          apiKeys={apiKeys}
          onSaveApiKey={handleSaveApiKey}
          pluginSettings={pluginSettings}
          onUpdatePluginSettings={handleUpdatePluginSettings}
          systemInstruction={systemInstruction}
          onChangeSystemInstruction={setSystemInstruction}
          selfEditEnabled={selfEditEnabled}
          onToggleSelfEdit={setSelfEditEnabled}
        />
      </div>
    </div>
  );
}
