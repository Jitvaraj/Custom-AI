import React, { useEffect, useRef, useState } from 'react';
import { 
  Copy, RotateCcw, ThumbsUp, ThumbsDown, Volume2, VolumeX, 
  Check, Sparkles, Bot, Code, Terminal, Zap, Shield, Image as ImageIcon
} from 'lucide-react';
import { Message } from '../types';
import { renderMarkdown } from '../services/markdown';
import { SpeechService } from '../services/speech';

interface ChatContainerProps {
  messages: Message[];
  onRegenerate: () => void;
  onRating: (msgId: string, rating: 'up' | 'down') => void;
  onChipClick: (prompt: string) => void;
  isGenerating: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  onRegenerate,
  onRating,
  onChipClick,
  isGenerating
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  // Clean speech when unmounting
  useEffect(() => {
    return () => {
      SpeechService.stop();
    };
  }, []);

  const handleCopyText = (msgId: string, text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedMsgId(msgId);
        setTimeout(() => setCopiedMsgId(null), 1800);
      });
    }
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      SpeechService.stop();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msgId);
      SpeechService.speak(
        text,
        () => setSpeakingMsgId(null),
        () => setSpeakingMsgId(null)
      );
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 overflow-y-auto">
        {/* Animated Jarvis Core Halo */}
        <div className="relative group">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600 opacity-75 blur-lg group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-[#0b0f1a] border border-[#26314d] flex items-center justify-center shadow-2xl">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-[#467ff5]">
              <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"></path>
            </svg>
          </div>
        </div>

        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-bold text-[#e6ecf5] tracking-tight">
            Jarvis Intelligence Platform
          </h2>
          <p className="text-xs text-[#9aa5b8] leading-relaxed">
            Your high-performance AI assistant for coding, system architecture, API design, and creative problem solving.
          </p>
        </div>

        {/* Feature Suggestion Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg text-left pt-2">
          {[
            {
              icon: <Code className="w-4 h-4 text-blue-400" />,
              title: 'Write & Refactor Code',
              prompt: 'Write a TypeScript debounce utility function with leading and trailing options.'
            },
            {
              icon: <Terminal className="w-4 h-4 text-purple-400" />,
              title: 'Debug & Analyze',
              prompt: 'Explain how to set up multi-provider API keys in Express and React.'
            },
            {
              icon: <Zap className="w-4 h-4 text-amber-400" />,
              title: 'API & Database',
              prompt: 'Generate a PostgreSQL schema and Drizzle ORM config for user authentication.'
            },
            {
              icon: <Shield className="w-4 h-4 text-green-400" />,
              title: 'System Security',
              prompt: 'Review best practices for securing API keys in server-side node environments.'
            }
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => onChipClick(item.prompt)}
              className="p-3.5 rounded-xl bg-[#0e1322] border border-[#1c2438] hover:border-[#467ff5] hover:bg-[#151c2e] transition-all cursor-pointer group text-left flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="text-xs font-semibold text-[#e6ecf5] group-hover:text-blue-400 transition-colors">
                  {item.title}
                </span>
              </div>
              <p className="text-[11px] text-[#556075] line-clamp-2 leading-relaxed">
                "{item.prompt}"
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main 
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-5 space-y-6 scrollbar-thin scrollbar-thumb-[#1e273d] scrollbar-track-transparent"
    >
      {messages.map((msg, index) => {
        const isAI = msg.role === 'assistant';

        if (!isAI) {
          // User Message Row
          return (
            <div key={msg.id || index} className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="bg-[#182136] border border-[#24304d] text-[#e6ecf5] text-[14.5px] leading-[1.45] px-4 py-2.5 rounded-[18px] rounded-br-[4px] max-w-[85%] shadow-sm">
                {msg.image && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-xs">
                    <img src={msg.image} alt="User attachment" className="w-full object-cover max-h-48" />
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <span className="text-[9.5px] text-[#556075] mt-1 block text-right">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        }

        // AI Message Row
        const htmlContent = renderMarkdown(msg.content);

        return (
          <div key={msg.id || index} className="flex items-start gap-3 animate-in fade-in duration-150">
            {/* AI Avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#528bff] to-[#356be6] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-blue-500/20">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"></path>
              </svg>
            </div>

            {/* AI Content */}
            <div className="flex-1 min-w-0 text-[14.5px] leading-[1.55] text-[#e6ecf5] space-y-2">
              <div 
                className="prose prose-invert max-w-none prose-p:my-1.5 prose-[#e6ecf5] text-[#e6ecf5]"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />

              {/* Action Toolbar */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={() => handleCopyText(msg.id, msg.content)}
                  className="text-[#556075] hover:text-[#e6ecf5] transition-colors cursor-pointer flex items-center gap-1 text-xs"
                  title="Copy response"
                >
                  {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {index === messages.length - 1 && (
                  <button
                    onClick={onRegenerate}
                    disabled={isGenerating}
                    className="text-[#556075] hover:text-[#e6ecf5] transition-colors cursor-pointer disabled:opacity-40"
                    title="Regenerate response"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-[#467ff5]' : ''}`} />
                  </button>
                )}

                <button
                  onClick={() => onRating(msg.id, 'up')}
                  className={`transition-colors cursor-pointer ${
                    msg.rating === 'up' ? 'text-[#467ff5]' : 'text-[#556075] hover:text-[#e6ecf5]'
                  }`}
                  title="Good response"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onRating(msg.id, 'down')}
                  className={`transition-colors cursor-pointer ${
                    msg.rating === 'down' ? 'text-red-400' : 'text-[#556075] hover:text-[#e6ecf5]'
                  }`}
                  title="Bad response"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleToggleSpeak(msg.id, msg.content)}
                  className={`transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                    speakingMsgId === msg.id ? 'text-[#467ff5] animate-pulse font-semibold' : 'text-[#556075] hover:text-[#e6ecf5]'
                  }`}
                  title="Read aloud"
                >
                  {speakingMsgId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  {speakingMsgId === msg.id && <span className="text-[10px]">Reading...</span>}
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Streaming / Generation Loading Indicator */}
      {isGenerating && (
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#528bff] to-[#356be6] flex items-center justify-center text-white shrink-0 mt-0.5 animate-pulse">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"></path>
            </svg>
          </div>
          <div className="flex items-center gap-1.5 py-2 px-3 rounded-full bg-[#111624] border border-[#1c2438]">
            <span className="w-2 h-2 rounded-full bg-[#467ff5] animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-[#467ff5] animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-[#467ff5] animate-bounce [animation-delay:0.4s]" />
            <span className="text-xs text-[#9aa5b8] font-medium ml-1">Jarvis thinking...</span>
          </div>
        </div>
      )}
    </main>
  );
};
