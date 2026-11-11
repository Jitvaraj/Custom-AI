import React, { useRef, useState } from 'react';
import { Plus, Mic, Send, Image as ImageIcon, X, MicOff, Code2, Sparkles, TestTube } from 'lucide-react';
import { startVoiceRecognition } from '../services/speech';

interface BottomDockProps {
  onSendMessage: (text: string, imageBase64?: string) => void;
  isGenerating: boolean;
  onChipClick: (prompt: string) => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  onSendMessage,
  isGenerating,
  onChipClick,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceRecogniserRef = useRef<{ stop: () => void } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || isGenerating) return;

    onSendMessage(inputText.trim(), attachedImage || undefined);
    setInputText('');
    setAttachedImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If it's code/text file, append text to input
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputText(prev => prev + `\n\nFile Content (${file.name}):\n` + reader.result);
      };
      reader.readAsText(file);
    }
    // reset input
    e.target.value = '';
  };

  const toggleVoiceInput = () => {
    if (isRecording) {
      if (voiceRecogniserRef.current) {
        voiceRecogniserRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const recognizer = startVoiceRecognition(
        (transcript: string) => {
          setInputText(transcript);
        },
        () => setIsRecording(false),
        (err: any) => {
          console.warn('Voice error:', err);
          setIsRecording(false);
        }
      );
      if (recognizer) {
        voiceRecogniserRef.current = recognizer;
        setIsRecording(true);
      }
    }
  };

  return (
    <footer className="p-3 sm:px-4 sm:pb-3 bg-gradient-to-t from-[#070a12] via-[#070a12]/95 to-transparent flex-shrink-0">
      
      {/* Attached Image Thumbnail */}
      {attachedImage && (
        <div className="mb-2 flex items-center gap-2 p-1.5 bg-[#111624] border border-[#1c2438] rounded-xl max-w-xs animate-in fade-in">
          <img src={attachedImage} alt="Attachment" className="w-10 h-10 object-cover rounded-lg border border-white/10" />
          <span className="text-xs text-[#9aa5b8] truncate flex-1">Image Attachment</span>
          <button
            onClick={() => setAttachedImage(null)}
            className="p-1 text-[#556075] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2.5 scrollbar-none select-none">
        {[
          { label: 'Explain simpler', icon: <Sparkles className="w-3 h-3 text-[#467ff5]" /> },
          { label: 'Convert to TypeScript', icon: <Code2 className="w-3 h-3 text-[#467ff5]" /> },
          { label: 'Write tests', icon: <TestTube className="w-3 h-3 text-[#467ff5]" /> },
          { label: 'Debug code', icon: <Sparkles className="w-3 h-3 text-[#467ff5]" /> },
          { label: 'Refactor clean code', icon: <Code2 className="w-3 h-3 text-[#467ff5]" /> },
        ].map((chip, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChipClick(chip.label)}
            className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full bg-[#111624] border border-[#1c2438] text-[#b4bfd1] hover:text-[#e6ecf5] hover:bg-[#171e30] hover:border-[#26314d] text-xs font-medium transition-all cursor-pointer shadow-sm shrink-0"
          >
            <span className="flex items-center">{chip.icon}</span>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,.txt,.js,.ts,.py,.json,.md"
        className="hidden"
      />

      {/* Composer Input Pill */}
      <form 
        onSubmit={handleSubmit}
        className="flex items-center gap-2 bg-[#111624] border border-[#1c2438] focus-within:border-[#26314d] rounded-full p-1.5 pl-3 transition-colors shadow-lg"
      >
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-7 h-7 rounded-full text-[#9aa5b8] hover:text-[#e6ecf5] hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title="Add image or code file"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder={isRecording ? 'Listening...' : 'Message Jarvis...'}
          disabled={isGenerating}
          className="flex-1 bg-transparent border-none outline-none text-[#e6ecf5] text-sm placeholder-[#556075] min-w-0"
        />

        {/* Voice Input Mic */}
        <button
          type="button"
          onClick={toggleVoiceInput}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
            isRecording
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
              : 'text-[#556075] hover:text-[#9aa5b8]'
          }`}
          title={isRecording ? 'Stop Recording' : 'Voice Input'}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={(!inputText.trim() && !attachedImage) || isGenerating}
          className="w-8 h-8 rounded-full bg-[#467ff5] hover:bg-[#5b8ff7] disabled:opacity-40 text-white flex items-center justify-center cursor-pointer shrink-0 transition-all active:scale-95 shadow-md shadow-blue-500/20"
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <p className="text-center text-[10.5px] text-[#556075] mt-2">
        Jarvis can make mistakes. Verify important info.
      </p>
    </footer>
  );
};
