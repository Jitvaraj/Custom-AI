import { useCallback, useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Header, MODELS } from '@/components/jarvis/Header';
import { ConversationSidebar } from '@/components/jarvis/ConversationSidebar';
import { ChatContainer } from '@/components/jarvis/ChatContainer';
import { BottomDock } from '@/components/jarvis/BottomDock';
import { ControlCenter } from '@/components/jarvis/ControlCenter';
import type { ApiKeyConfig, ApiProvider, ChatConversation, DrawerTab, Message, PluginSettings, UserProfile } from '@/types';
import {
  loadConversations,
  saveConversations,
  loadActiveChatId,
  saveActiveChatId,
  loadUserProfile,
  saveUserProfile,
  loadApiKeys,
  saveApiKeys,
  loadPluginSettings,
  savePluginSettings,
} from '@/services/storage';
import { streamChatClient } from '@/services/ai';

const DEFAULT_INSTRUCTION =
  'You are Jarvis, an advanced, intelligent, futuristic AI assistant created to help the user with code, analysis, creative problem solving, and complex tasks. Be concise, precise, friendly, and structured. When outputting code, always specify the language name.';

const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function freshConversation(model: string): ChatConversation {
  return {
    id: 'conv-' + Date.now(),
    title: 'New Conversation',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    model,
    messages: [],
  };
}

function isAbortError(err: unknown) {
  return err instanceof DOMException ? err.name === 'AbortError' : (err as any)?.name === 'AbortError';
}

export default function JarvisApp() {
  const [conversations, setConversations] = useState<ChatConversation[]>(loadConversations);
  const [activeChatId, setActiveChatId] = useState<string>(loadActiveChatId);
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile);
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyConfig>>(loadApiKeys);
  const [pluginSettings, setPluginSettings] = useState<PluginSettings>(loadPluginSettings);
  const [selectedModel, setSelectedModel] = useState<string>('jarvis-1.0');
  const [selfEditEnabled, setSelfEditEnabled] = useState<boolean>(true);
  const [systemInstruction, setSystemInstruction] = useState<string>(DEFAULT_INSTRUCTION);

  const [navOpen, setNavOpen] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [controlTab, setControlTab] = useState<DrawerTab>('apikeys');
  const [generatingChatId, setGeneratingChatId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isGenerating = generatingChatId !== null;

  // Persist to this browser. Chats are saved once a reply finishes, not on every typed chunk.
  useEffect(() => {
    if (!isGenerating) saveConversations(conversations);
  }, [conversations, isGenerating]);
  useEffect(() => saveActiveChatId(activeChatId), [activeChatId]);
  useEffect(() => saveUserProfile(userProfile), [userProfile]);
  useEffect(() => saveApiKeys(apiKeys), [apiKeys]);
  useEffect(() => savePluginSettings(pluginSettings), [pluginSettings]);

  // Stop any reply in flight if the app unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const currentChat = conversations.find((c) => c.id === activeChatId) ?? conversations[0] ?? freshConversation(selectedModel);

  const currentProvider: ApiProvider = MODELS.find((m) => m.id === selectedModel)?.provider ?? 'gemini';
  const currentKey = apiKeys[currentProvider];
  const keyReady =
    Boolean(currentKey?.apiKey?.trim()) ||
    (currentProvider === 'custom' && Boolean(currentKey?.endpoint?.trim())) ||
    (currentProvider === 'gemini' && Boolean(import.meta.env['VITE_GEMINI_API_KEY']));

  const openControlCenter = (tab: DrawerTab) => {
    setNavOpen(false);
    setControlTab(tab);
    setControlOpen(true);
  };

  const updateChat = useCallback((chatId: string, fn: (c: ChatConversation) => ChatConversation) => {
    setConversations((prev) => prev.map((c) => (c.id === chatId ? fn(c) : c)));
  }, []);

  const handleNewChat = () => {
    const conv = freshConversation(selectedModel);
    setConversations((prev) => [conv, ...prev]);
    setActiveChatId(conv.id);
    setNavOpen(false);
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
    setNavOpen(false);
  };

  const handleDeleteChat = (id: string) => {
    if (generatingChatId === id) abortRef.current?.abort();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (updated.length === 0) {
        const fresh = freshConversation(selectedModel);
        setActiveChatId(fresh.id);
        return [fresh];
      }
      if (activeChatId === id) setActiveChatId(updated[0]!.id);
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    abortRef.current?.abort();
    const fresh = freshConversation(selectedModel);
    setConversations([fresh]);
    setActiveChatId(fresh.id);
  };

  const handleRating = (msgId: string, rating: 'up' | 'down') => {
    updateChat(activeChatId, (c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === msgId ? { ...m, rating: m.rating === rating ? undefined : rating } : m)),
    }));
  };

  /** Streams an assistant reply for `history` (which ends with the user's message) into `chatId`. */
  const runReply = async (chatId: string, history: Message[], title: string) => {
    const aiId = 'msg-' + Date.now() + '-ai';
    const placeholder: Message = { id: aiId, role: 'assistant', content: '', timestamp: timeNow(), isStreaming: true };
    updateChat(chatId, (c) => ({ ...c, title, updatedAt: Date.now(), messages: [...history, placeholder] }));

    const controller = new AbortController();
    abortRef.current = controller;
    setGeneratingChatId(chatId);

    // Batch incoming chunks into one screen update per frame.
    let text = '';
    let frame = 0;
    const flush = () => {
      frame = 0;
      const snapshot = text;
      updateChat(chatId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === aiId ? { ...m, content: snapshot } : m)),
      }));
    };
    const finish = (content: string) => {
      if (frame) cancelAnimationFrame(frame);
      updateChat(chatId, (c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: c.messages.map((m) =>
          m.id === aiId ? { ...m, content, isStreaming: false, timestamp: timeNow() } : m,
        ),
      }));
    };

    try {
      const full = await streamChatClient(
        {
          messages: history,
          model: selectedModel,
          systemInstruction:
            systemInstruction +
            (selfEditEnabled
              ? '\n\n[SELF-EDIT MODE ACTIVE]: Generate clean code patches and step-by-step refactoring rules when requested.'
              : ''),
          apiKeyConfig: apiKeys[currentProvider] ?? { provider: currentProvider, apiKey: '', selectedModel },
          provider: currentProvider,
          pluginSettings,
        },
        {
          signal: controller.signal,
          onDelta: (delta) => {
            text += delta;
            if (!frame) frame = requestAnimationFrame(flush);
          },
        },
      );
      finish(text || full || 'I received your message.');
    } catch (err: any) {
      if (isAbortError(err)) {
        // Close an unfinished code block so the note doesn't land inside it.
        const openFence = (text.match(/```/g)?.length ?? 0) % 2 === 1;
        finish(text ? `${text}${openFence ? '\n```' : ''}\n\n*— stopped —*` : '*Reply stopped.*');
      } else {
        console.error('Chat error:', err);
        const msg: string = err?.message || 'Could not connect to AI service.';
        const isRateLimit = msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');
        const errorText = isRateLimit
          ? `⚠️ **Rate limit reached (429)**\n\nThe request limit was temporarily reached for this model.\n\n- Wait 15–30 seconds and press **Regenerate**.\n- Switch to **Jarvis 1.0 (Gemini 2.5 Flash)** in the engine picker.\n- Add your own key in **Control Center › Keys** for a higher quota.`
          : `⚠️ **Jarvis error (${currentProvider.toUpperCase()})**: ${msg}\n\nCheck your key in **Control Center › Keys**.`;
        finish(text ? `${text}\n\n${errorText}` : errorText);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setGeneratingChatId(null);
    }
  };

  const handleSendMessage = (userText: string, imageBase64?: string) => {
    if ((!userText.trim() && !imageBase64) || isGenerating) return;
    const userMsg: Message = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: userText,
      image: imageBase64,
      timestamp: timeNow(),
    };
    let title = currentChat.title;
    if (currentChat.messages.length === 0 || title === 'New Conversation') {
      const base = userText || 'Image';
      title = base.length > 40 ? base.slice(0, 40) + '…' : base;
    }
    // Make sure the active chat exists in the list (e.g. after a fresh fallback).
    if (!conversations.some((c) => c.id === currentChat.id)) {
      setConversations((prev) => [currentChat, ...prev]);
      setActiveChatId(currentChat.id);
    }
    void runReply(currentChat.id, [...currentChat.messages, userMsg], title);
  };

  const handleRegenerate = () => {
    if (isGenerating) return;
    const msgs = currentChat.messages;
    const lastUserIdx = msgs.map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx === -1) return;
    void runReply(currentChat.id, msgs.slice(0, lastUserIdx + 1), currentChat.title);
  };

  const sidebar = (
    <ConversationSidebar
      conversations={conversations}
      activeChatId={currentChat.id}
      generatingChatId={generatingChatId}
      onSelectChat={handleSelectChat}
      onNewChat={handleNewChat}
      onDeleteChat={handleDeleteChat}
      onRenameChat={(id, title) => updateChat(id, (c) => ({ ...c, title, updatedAt: Date.now() }))}
      onTogglePinChat={(id) => updateChat(id, (c) => ({ ...c, pinned: !c.pinned }))}
      userProfile={userProfile}
      onOpenControlCenter={openControlCenter}
    />
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 border-r border-sidebar-border lg:block">{sidebar}</aside>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-xs border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <main className="hud-grid relative flex min-w-0 flex-1 flex-col">
        <Header
          onOpenNav={() => setNavOpen(true)}
          onOpenControlCenter={openControlCenter}
          onNewChat={handleNewChat}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
          provider={currentProvider}
          keyReady={keyReady}
          title={currentChat.messages.length ? currentChat.title : ''}
        />
        <ChatContainer
          messages={currentChat.messages}
          onRegenerate={handleRegenerate}
          onRating={handleRating}
          onChipClick={handleSendMessage}
          isGenerating={generatingChatId === currentChat.id}
          userProfile={userProfile}
        />
        <BottomDock
          onSendMessage={handleSendMessage}
          onStop={() => abortRef.current?.abort()}
          isGenerating={isGenerating}
          onChipClick={handleSendMessage}
          showChips={currentChat.messages.length > 0}
        />
      </main>

      <ControlCenter
        open={controlOpen}
        onOpenChange={setControlOpen}
        activeTab={controlTab}
        onSelectTab={setControlTab}
        conversations={conversations}
        onClearAllHistory={handleClearAllHistory}
        userProfile={userProfile}
        onUpdateUserProfile={setUserProfile}
        apiKeys={apiKeys}
        onSaveApiKey={(config) => setApiKeys((prev) => ({ ...prev, [config.provider]: config }))}
        pluginSettings={pluginSettings}
        onUpdatePluginSettings={setPluginSettings}
        systemInstruction={systemInstruction}
        onChangeSystemInstruction={setSystemInstruction}
        selfEditEnabled={selfEditEnabled}
        onToggleSelfEdit={setSelfEditEnabled}
        currentProvider={currentProvider}
        onUseCustomEngine={() => setSelectedModel('custom-model')}
      />
    </div>
  );
}
