import { memo, useEffect, useRef, useState, type MouseEvent } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  ArrowDown,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, UserProfile } from "@/types";
import { renderMarkdown } from "@/services/markdown";
import { SpeechService } from "@/services/speech";
import {
  codeFileName,
  dataUrlToBlob,
  fileStamp,
  imageExtension,
  saveFile,
  textBlob,
} from "@/services/download";
import { ArcMark } from "./ArcMark";

interface ChatContainerProps {
  messages: Message[];
  onRegenerate: () => void;
  onRating: (msgId: string, rating: "up" | "down") => void;
  onChipClick: (prompt: string) => void;
  isGenerating: boolean;
  userProfile: UserProfile;
}

const SUGGESTIONS = [
  {
    tag: "Code",
    title: "Write & refactor",
    prompt: "Write a TypeScript debounce utility function with leading and trailing options.",
  },
  {
    tag: "Debug",
    title: "Debug & analyze",
    prompt: "Explain how to set up multi-provider API keys in Express and React.",
  },
  {
    tag: "Data",
    title: "API & database",
    prompt: "Generate a PostgreSQL schema and Drizzle ORM config for user authentication.",
  },
  {
    tag: "Secure",
    title: "System security",
    prompt: "Review best practices for securing API keys in server-side node environments.",
  },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function ChatContainer({
  messages,
  onRegenerate,
  onRating,
  onChipClick,
  isGenerating,
  userProfile,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Follow the reply as it types, unless the user scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => () => SpeechService.stop(), []);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    stickToBottom.current = nearBottom;
    setShowJump(!nearBottom);
  };

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const copyText = (msgId: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 1600);
    });
  };

  const toggleSpeak = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      SpeechService.stop();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msgId);
      SpeechService.speak(
        text,
        () => setSpeakingMsgId(null),
        () => setSpeakingMsgId(null),
      );
    }
  };

  // Copy / Download buttons inside rendered code blocks.
  const handleMarkdownClick = (e: MouseEvent<HTMLDivElement>) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-code]');
    if (!btn) return;
    const code = decodeURIComponent(btn.dataset['code'] || '');
    if (btn.dataset['action'] === 'download') {
      const name = codeFileName(btn.dataset['lang'], 1);
      saveFile(textBlob(code, name), name);
      flashLabel(btn, 'Saved', 'Download');
      return;
    }
    navigator.clipboard?.writeText(code).then(() => flashLabel(btn, 'Copied', 'Copy'));
  };

  const downloadReply = (msg: Message) => {
    const name = `jarvis-reply-${fileStamp()}.md`;
    saveFile(textBlob(msg.content, name), name);
  };

  const downloadImage = (dataUrl: string) => {
    saveFile(dataUrlToBlob(dataUrl), `jarvis-image-${fileStamp()}.${imageExtension(dataUrl)}`);
  };

  if (messages.length === 0) {
    const firstName = userProfile.name === "Jarvis User" ? "" : userProfile.name.split(" ")[0];
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-8 scrollbar-thin">
        <div className="m-auto flex w-full flex-col items-center">
          <ArcMark className="size-20 sm:size-28" />
          <p className="hud-label mt-8">Systems online</p>
          <h1 className="mt-2 text-center font-display text-3xl font-semibold sm:text-4xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-3 max-w-md text-center text-sm text-muted-foreground">
            Ask about code, architecture, APIs or anything else. Replies type out live as they
            arrive.
          </p>
          <div className="mt-9 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => onChipClick(s.prompt)}
                className="group rounded-xl border border-border bg-card/60 p-4 text-left backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.65rem] text-primary">0{i + 1}</span>
                  <span className="hud-label">{s.tag}</span>
                </div>
                <div className="mt-3 font-display text-sm font-semibold text-foreground">
                  {s.title}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-subtle group-hover:text-muted-foreground">
                  {s.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const lastAssistantIdx = messages.map((m) => m.role).lastIndexOf("assistant");

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin"
      >
        <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6">
          {messages.map((msg, index) => {
            if (msg.role === "user") {
              return (
                <div
                  key={msg.id}
                  className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-bubble px-4 py-2.5 text-[0.95rem] leading-relaxed text-bubble-foreground">
                    {msg.image && (
                      <div className="group/img relative mb-2">
                        <img
                          src={msg.image}
                          alt="Attachment"
                          className="max-h-56 rounded-lg border border-border object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => downloadImage(msg.image!)}
                          aria-label="Download image"
                          title="Download image"
                          className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-lg bg-background/80 text-foreground backdrop-blur transition-opacity hover:text-primary sm:opacity-0 sm:group-hover/img:opacity-100 sm:focus:opacity-100"
                        >
                          <Download className="size-4" />
                        </button>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            }

            const streaming = Boolean(msg.isStreaming);
            const waiting = streaming && !msg.content;
            return (
              <article key={msg.id} className="group flex gap-3.5 animate-in fade-in duration-200">
                <ArcMark className="mt-0.5 size-7" active={streaming} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="font-display text-xs font-semibold tracking-[0.16em] text-foreground">
                      JARVIS
                    </span>
                    <span className="hud-label">
                      {streaming ? (waiting ? "Thinking" : "Typing") : msg.timestamp}
                    </span>
                  </div>

                  {waiting ? (
                    <div className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground">
                      <span className="scan-bars" aria-hidden>
                        <span />
                        <span />
                        <span />
                        <span />
                      </span>
                      Processing your request…
                    </div>
                  ) : (
                    <AssistantMarkdown
                      content={msg.content}
                      streaming={streaming}
                      onClick={handleMarkdownClick}
                    />
                  )}

                  {!streaming && (
                    <div className="mt-3 flex items-center gap-1 text-subtle opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <ToolbarButton label="Copy" onClick={() => copyText(msg.id, msg.content)}>
                        {copiedMsgId === msg.id ? <Check className="text-success" /> : <Copy />}
                      </ToolbarButton>
                      <ToolbarButton label="Download reply" onClick={() => downloadReply(msg)}>
                        <Download />
                      </ToolbarButton>
                      {index === lastAssistantIdx && (
                        <ToolbarButton
                          label="Regenerate"
                          onClick={onRegenerate}
                          disabled={isGenerating}
                        >
                          <RotateCcw />
                        </ToolbarButton>
                      )}
                      <ToolbarButton
                        label="Good response"
                        active={msg.rating === "up"}
                        onClick={() => onRating(msg.id, "up")}
                      >
                        <ThumbsUp />
                      </ToolbarButton>
                      <ToolbarButton
                        label="Bad response"
                        active={msg.rating === "down"}
                        onClick={() => onRating(msg.id, "down")}
                      >
                        <ThumbsDown />
                      </ToolbarButton>
                      <ToolbarButton
                        label={speakingMsgId === msg.id ? "Stop reading" : "Read aloud"}
                        active={speakingMsgId === msg.id}
                        onClick={() => toggleSpeak(msg.id, msg.content)}
                      >
                        {speakingMsgId === msg.id ? <VolumeX /> : <Volume2 />}
                      </ToolbarButton>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {showJump && (
        <button
          type="button"
          onClick={jumpToBottom}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border-strong bg-popover px-3 py-1.5 text-xs text-muted-foreground shadow-panel hover:text-foreground"
        >
          <ArrowDown className="size-3.5" /> {isGenerating ? "Follow reply" : "Latest"}
        </button>
      )}
    </div>
  );
}

function flashLabel(btn: HTMLButtonElement, flash: string, original: string) {
  btn.textContent = flash;
  setTimeout(() => (btn.textContent = original), 1500);
}

const AssistantMarkdown = memo(function AssistantMarkdown({
  content,
  streaming,
  onClick,
}: {
  content: string;
  streaming: boolean;
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="jarvis-md"
      data-streaming={streaming}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
});

function ToolbarButton({
  label,
  onClick,
  children,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-7 place-items-center rounded-md transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40 [&_svg]:size-3.5",
        active && "text-primary",
      )}
    >
      {children}
    </button>
  );
}
