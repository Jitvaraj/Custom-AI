export class SpeechService {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;

  public static speak(text: string, onEnd?: () => void, onError?: () => void): boolean {
    if (!this.synth) return false;

    this.stop();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' Code snippet omitted for audio reading. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.lang.startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      if (onError) onError();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    return true;
  }

  public static stop() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public static isSpeaking(): boolean {
    return !!(this.synth && this.synth.speaking);
  }
}

export function startVoiceRecognition(
  onResult: (text: string) => void,
  onEnd?: () => void,
  onError?: (err: string) => void
): { stop: () => void } | null {
  if (typeof window === 'undefined') return null;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (onError) onError('Speech recognition is not supported in this browser.');
    return null;
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      onResult(transcript);
    };

    recognition.onerror = (event: any) => {
      if (onError) onError(event.error || 'Voice input error');
    };

    recognition.onend = () => {
      if (onEnd) onEnd();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  } catch (err: any) {
    if (onError) onError(err.message || 'Could not start microphone');
    return null;
  }
}
