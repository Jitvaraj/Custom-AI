import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Paperclip, Mic, MicOff, ArrowUp, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { startVoiceRecognition } from '@/services/speech';

interface BottomDockProps {
  onSendMessage: (text: string, imageBase64?: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  onChipClick: (prompt: string) => void;
  showChips: boolean;
}

const CHIPS = ['Explain simpler', 'Convert to TypeScript', 'Write tests', 'Debug code', 'Refactor clean code'];

export function BottomDock({ onSendMessage, onStop, isGenerating, onChipClick, showChips }: BottomDockProps) {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognizerRef = useRef<{ stop: () => void } | null>(null);

  // Grow the box with its content, up to a limit.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [inputText]);

  const canSend = (inputText.trim().length > 0 || attachedImage !== null) && !isGenerating;

  const submit = () => {
    if (!canSend) return;
    onSendMessage(inputText.trim(), attachedImage ?? undefined);
    setInputText('');
    setAttachedImage(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isGenerating) onStop();
    else submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      reader.onloadend = () => setAttachedImage(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      reader.onloadend = () =>
        setInputText((prev) => prev + `\n\nFile Content (${file.name}):\n` + reader.result);
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const toggleVoiceInput = () => {
    if (isRecording) {
      recognizerRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const recognizer = startVoiceRecognition(
      (transcript: string) => setInputText(transcript),
      () => setIsRecording(false),
      (err: unknown) => {
        console.warn('Voice error:', err);
        setIsRecording(false);
      },
    );
    if (recognizer) {
      recognizerRef.current = recognizer;
      setIsRecording(true);
    }
  };

  return (
    <footer className="shrink-0 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-3 pt-2 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        {showChips && (
          <div className="mb-2.5 flex gap-1.5 overflow-x-auto scrollbar-none">
            {CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isGenerating}
                onClick={() => onChipClick(chip)}
                className="shrink-0 rounded-full border border-border px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,.txt,.js,.ts,.py,.json,.md"
          className="hidden"
        />

        <form
          onSubmit={handleSubmit}
          className={cn(
            'rounded-2xl border border-border-strong bg-card/90 p-2 shadow-panel backdrop-blur transition-shadow focus-within:border-primary/50 focus-within:shadow-glow',
          )}
        >
          {attachedImage && (
            <div className="mb-2 ml-1 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary p-1 pr-2">
              <img src={attachedImage} alt="Attachment" className="size-10 rounded-md object-cover" />
              <span className="text-xs text-muted-foreground">Image attached</span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                aria-label="Remove image"
                className="rounded p-0.5 text-subtle hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Listening…' : 'Message Jarvis'}
            aria-label="Message Jarvis"
            className="block max-h-[200px] w-full resize-none bg-transparent px-2.5 py-2 text-[0.95rem] text-foreground placeholder:text-subtle focus:outline-none"
          />

          <div className="flex items-center gap-1 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image or code file"
              aria-label="Attach file"
              className="grid size-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-accent hover:text-foreground"
            >
              <Paperclip className="size-4" />
            </button>
            <button
              type="button"
              onClick={toggleVoiceInput}
              title={isRecording ? 'Stop recording' : 'Voice input'}
              aria-label={isRecording ? 'Stop recording' : 'Voice input'}
              className={cn(
                'grid size-8 place-items-center rounded-lg transition-colors',
                isRecording
                  ? 'animate-pulse bg-destructive/15 text-destructive'
                  : 'text-subtle hover:bg-accent hover:text-foreground',
              )}
            >
              {isRecording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </button>
            <span className="hud-label ml-auto mr-2 hidden sm:inline">
              {isGenerating ? 'Replying…' : 'Enter to send · Shift+Enter for new line'}
            </span>
            <button
              type="submit"
              disabled={!isGenerating && !canSend}
              title={isGenerating ? 'Stop reply' : 'Send'}
              aria-label={isGenerating ? 'Stop reply' : 'Send'}
              className={cn(
                'ml-auto grid size-9 shrink-0 place-items-center rounded-xl transition-all active:scale-95 disabled:opacity-35 sm:ml-0',
                isGenerating
                  ? 'border border-border-strong bg-secondary text-foreground hover:bg-accent'
                  : 'bg-primary text-primary-foreground shadow-glow hover:bg-primary-glow',
              )}
            >
              {isGenerating ? <Square className="size-3.5 fill-current" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-[0.7rem] text-subtle">Jarvis can make mistakes. Verify important info.</p>
      </div>
    </footer>
  );
}
